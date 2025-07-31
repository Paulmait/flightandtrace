"""
WebSocket manager for real-time flight tracking
"""

from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Set, List, Optional
import json
import asyncio
from datetime import datetime
import logging
from src.core.auth import verify_token
from src.db.database import get_connection
from collections import defaultdict

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Track active connections by user
        self.active_connections: Dict[int, List[WebSocket]] = defaultdict(list)
        
        # Track flight subscriptions
        self.flight_subscriptions: Dict[str, Set[int]] = defaultdict(set)
        
        # Track family group connections
        self.family_connections: Dict[int, Set[int]] = defaultdict(set)
        
        # Connection metadata
        self.connection_info: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int, metadata: Dict):
        """Accept new WebSocket connection"""
        await websocket.accept()
        
        # Store connection
        self.active_connections[user_id].append(websocket)
        self.connection_info[websocket] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
            "device": metadata.get("device", "unknown"),
            "subscriptions": set()
        }
        
        # Load user's family members
        await self._load_family_connections(user_id)
        
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection_established",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id
        })
        
        logger.info(f"WebSocket connected for user {user_id}")
    
    async def disconnect(self, websocket: WebSocket):
        """Handle WebSocket disconnection"""
        if websocket in self.connection_info:
            info = self.connection_info[websocket]
            user_id = info["user_id"]
            
            # Remove from active connections
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            
            # Remove from flight subscriptions
            for flight in info["subscriptions"]:
                self.flight_subscriptions[flight].discard(user_id)
                if not self.flight_subscriptions[flight]:
                    del self.flight_subscriptions[flight]
            
            # Clean up metadata
            del self.connection_info[websocket]
            
            logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def subscribe_to_flight(self, user_id: int, tail_number: str):
        """Subscribe user to flight updates"""
        self.flight_subscriptions[tail_number].add(user_id)
        
        # Update connection metadata
        for websocket in self.active_connections.get(user_id, []):
            if websocket in self.connection_info:
                self.connection_info[websocket]["subscriptions"].add(tail_number)
        
        # Send confirmation
        await self.send_to_user(user_id, {
            "type": "subscription_confirmed",
            "tail_number": tail_number,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def unsubscribe_from_flight(self, user_id: int, tail_number: str):
        """Unsubscribe user from flight updates"""
        self.flight_subscriptions[tail_number].discard(user_id)
        
        # Update connection metadata
        for websocket in self.active_connections.get(user_id, []):
            if websocket in self.connection_info:
                self.connection_info[websocket]["subscriptions"].discard(tail_number)
    
    async def broadcast_flight_update(self, tail_number: str, update_data: Dict):
        """Broadcast flight update to all subscribers"""
        subscribers = self.flight_subscriptions.get(tail_number, set())
        
        # Include family members who are tracking this flight
        all_subscribers = set(subscribers)
        for user_id in subscribers:
            family_members = self.family_connections.get(user_id, set())
            all_subscribers.update(family_members)
        
        # Send to all subscribers
        tasks = []
        for user_id in all_subscribers:
            tasks.append(self.send_to_user(user_id, {
                "type": "flight_update",
                "tail_number": tail_number,
                "data": update_data,
                "timestamp": datetime.utcnow().isoformat()
            }))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def send_to_user(self, user_id: int, message: Dict):
        """Send message to specific user"""
        connections = self.active_connections.get(user_id, [])
        
        if connections:
            # Send to all user's devices
            tasks = []
            for connection in connections[:]:  # Copy list to avoid modification during iteration
                try:
                    tasks.append(connection.send_json(message))
                except:
                    # Connection might be closed
                    await self.disconnect(connection)
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
    
    async def send_to_family(self, user_id: int, message: Dict):
        """Send message to user's family group"""
        family_members = self.family_connections.get(user_id, set())
        
        tasks = []
        for member_id in family_members:
            tasks.append(self.send_to_user(member_id, message))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_to_all(self, message: Dict):
        """Broadcast message to all connected users"""
        tasks = []
        for user_id in self.active_connections:
            tasks.append(self.send_to_user(user_id, message))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _load_family_connections(self, user_id: int):
        """Load family group connections from database"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Get family members
            cursor.execute("""
                SELECT member_id FROM family_members 
                WHERE family_id IN (
                    SELECT family_id FROM family_members WHERE member_id = ?
                ) AND member_id != ?
            """, (user_id, user_id))
            
            family_members = {row[0] for row in cursor.fetchall()}
            self.family_connections[user_id] = family_members
            
        finally:
            conn.close()
    
    def get_connection_stats(self) -> Dict:
        """Get connection statistics"""
        total_connections = sum(len(conns) for conns in self.active_connections.values())
        total_subscriptions = sum(len(subs) for subs in self.flight_subscriptions.values())
        
        return {
            "total_users_connected": len(self.active_connections),
            "total_connections": total_connections,
            "total_flight_subscriptions": len(self.flight_subscriptions),
            "total_subscription_count": total_subscriptions,
            "users_by_device": self._get_device_stats()
        }
    
    def _get_device_stats(self) -> Dict[str, int]:
        """Get statistics by device type"""
        device_counts = defaultdict(int)
        for info in self.connection_info.values():
            device_counts[info.get("device", "unknown")] += 1
        return dict(device_counts)

# Global connection manager instance
manager = ConnectionManager()

# WebSocket endpoint
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    device: Optional[str] = "unknown"
):
    """WebSocket endpoint for real-time updates"""
    try:
        # Verify token
        payload = verify_token(token)
        user_id = int(payload.get("sub"))
        
        # Connect
        await manager.connect(websocket, user_id, {"device": device})
        
        try:
            while True:
                # Receive messages from client
                data = await websocket.receive_json()
                
                # Handle different message types
                if data["type"] == "subscribe":
                    tail_number = data.get("tail_number")
                    if tail_number:
                        await manager.subscribe_to_flight(user_id, tail_number)
                
                elif data["type"] == "unsubscribe":
                    tail_number = data.get("tail_number")
                    if tail_number:
                        await manager.unsubscribe_from_flight(user_id, tail_number)
                
                elif data["type"] == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                elif data["type"] == "family_alert":
                    await manager.send_to_family(user_id, {
                        "type": "family_notification",
                        "from": user_id,
                        "message": data.get("message"),
                        "timestamp": datetime.utcnow().isoformat()
                    })
        
        except WebSocketDisconnect:
            await manager.disconnect(websocket)
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
            await manager.disconnect(websocket)
    
    except Exception as e:
        logger.error(f"WebSocket authentication error: {str(e)}")
        await websocket.close(code=1008, reason="Authentication failed")

# Background task to send flight updates
async def flight_update_broadcaster():
    """Background task to broadcast flight updates"""
    while True:
        try:
            # Get latest flight updates from data source
            conn = get_connection()
            cursor = conn.cursor()
            
            # Get flights with active subscribers
            tracked_flights = list(manager.flight_subscriptions.keys())
            
            if tracked_flights:
                placeholders = ','.join('?' * len(tracked_flights))
                cursor.execute(f"""
                    SELECT DISTINCT fs.tail_number, fs.status, fs.latitude, 
                           fs.longitude, fs.altitude, fs.speed, fs.heading,
                           fs.departure_airport, fs.arrival_airport, 
                           fs.estimated_arrival
                    FROM flight_states fs
                    WHERE fs.tail_number IN ({placeholders})
                    AND fs.timestamp >= datetime('now', '-5 minutes')
                    ORDER BY fs.timestamp DESC
                """, tracked_flights)
                
                updates = cursor.fetchall()
                
                # Broadcast updates
                for update in updates:
                    tail_number = update[0]
                    flight_data = {
                        "status": update[1],
                        "position": {
                            "lat": update[2],
                            "lng": update[3],
                            "altitude": update[4],
                            "speed": update[5],
                            "heading": update[6]
                        },
                        "route": {
                            "departure": update[7],
                            "arrival": update[8],
                            "eta": update[9]
                        }
                    }
                    
                    await manager.broadcast_flight_update(tail_number, flight_data)
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error in flight update broadcaster: {str(e)}")
        
        # Update every 5 seconds (real-time!)
        await asyncio.sleep(5)