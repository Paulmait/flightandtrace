import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const FinalMap = ({ flights = [], center = [-2, 51], zoom = 5, onMapReady }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (map.current) return; // Initialize only once

    // Use multiple tile providers for redundancy
    const style = {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
          maxzoom: 19
        }
      },
      layers: [
        {
          id: 'base',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: style,
        center: center,
        zoom: zoom,
        maxZoom: 18,
        minZoom: 2
      });

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        
        // Add navigation controls
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        // Add scale
        map.current.addControl(new maplibregl.ScaleControl({
          maxWidth: 200,
          unit: 'metric'
        }), 'bottom-left');
        
        // Call onMapReady callback if provided
        if (onMapReady) {
          onMapReady(map.current);
        }
      });

      // Handle errors gracefully
      map.current.on('error', (e) => {
        console.warn('Map error (continuing):', e.error.message);
      });

    } catch (error) {
      console.error('Map initialization error:', error);
    }

    // Cleanup
    return () => {
      markers.current.forEach(m => m.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once
  
  // Update map center and zoom when props change
  useEffect(() => {
    if (map.current && map.current.loaded()) {
      // Update center if significantly different
      const currentCenter = map.current.getCenter();
      const distance = Math.sqrt(
        Math.pow(currentCenter.lng - center[0], 2) + 
        Math.pow(currentCenter.lat - center[1], 2)
      );
      
      if (distance > 0.1) { // Only move if difference is significant
        map.current.flyTo({
          center: center,
          zoom: zoom,
          duration: 1500
        });
      } else if (Math.abs(map.current.getZoom() - zoom) > 0.5) {
        // Just update zoom if center is close
        map.current.setZoom(zoom);
      }
    }
  }, [center, zoom]);

  // Update markers when flights change
  useEffect(() => {
    if (!map.current) return;

    // Wait for map to load
    const updateMarkers = () => {
      // Clear existing markers
      markers.current.forEach(m => m.remove());
      markers.current = [];

      // Add new markers
      flights.forEach((flight, index) => {
        if (flight.position && flight.position.latitude && flight.position.longitude) {
          try {
            // Create marker element with airplane icon
            const el = document.createElement('div');
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.cursor = 'pointer';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = '16px';
            el.style.transform = `rotate(${flight.position.heading || 0}deg)`;
            el.style.transition = 'transform 0.3s ease';
            el.innerHTML = flight.onGround ? '🛬' : '✈️';
            el.title = flight.callsign || flight.icao24 || 'Aircraft';
            
            // Create detailed popup content
            const popupHTML = `
              <div style="padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 200px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 20px; margin-right: 8px;">${flight.onGround ? '🛬' : '✈️'}</span>
                  <div>
                    <strong style="font-size: 14px; color: #2c3e50;">${flight.callsign || 'Unknown'}</strong>
                    <div style="font-size: 11px; color: #7f8c8d;">${flight.icao24}</div>
                  </div>
                </div>
                <hr style="margin: 8px 0; border: none; border-top: 1px solid #ecf0f1;">
                <div style="font-size: 12px; line-height: 1.6;">
                  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                    <span style="color: #7f8c8d;">Altitude:</span>
                    <strong>${Math.round(flight.position.altitude || 0).toLocaleString()} ft</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                    <span style="color: #7f8c8d;">Speed:</span>
                    <strong>${Math.round(flight.position.groundSpeed || 0)} kts</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                    <span style="color: #7f8c8d;">Heading:</span>
                    <strong>${Math.round(flight.position.heading || 0)}°</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                    <span style="color: #7f8c8d;">V/Rate:</span>
                    <strong>${Math.round(flight.position.verticalRate || 0)} fpm</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                    <span style="color: #7f8c8d;">Origin:</span>
                    <strong>${flight.origin || 'Unknown'}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                    <span style="color: #7f8c8d;">Status:</span>
                    <strong style="color: ${flight.onGround ? '#e74c3c' : '#27ae60'};">
                      ${flight.onGround ? 'On Ground' : 'In Flight'}
                    </strong>
                  </div>
                </div>
              </div>
            `;

            // Create popup
            const popup = new maplibregl.Popup({ 
              offset: 15,
              closeButton: true,
              closeOnClick: false,
              maxWidth: '250px'
            }).setHTML(popupHTML);
            
            // Add marker with popup
            const marker = new maplibregl.Marker({ 
              element: el,
              anchor: 'center'
            })
              .setLngLat([flight.position.longitude, flight.position.latitude])
              .setPopup(popup)
              .addTo(map.current);
            
            // Add click event to show popup
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              marker.togglePopup();
            });

            markers.current.push(marker);
          } catch (err) {
            console.warn(`Failed to add marker ${index}:`, err.message);
          }
        }
      });

    };

    if (map.current.loaded()) {
      updateMarkers();
    } else {
      map.current.once('load', updateMarkers);
    }
  }, [flights]);

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%'
    }}>
      <div 
        ref={mapContainer} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%'
        }} 
      />
    </div>
  );
};

export default FinalMap;