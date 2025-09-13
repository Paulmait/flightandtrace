import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapEnhancements.css';
import { createModernAircraftIcon, createHelicopterIcon } from '../../utils/aircraftIcons';

const FinalMap = ({ flights = [], center = [-2, 51], zoom = 5, onMapReady, onFlightClick }) => {
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
        minZoom: 2,
        pitch: 0,
        bearing: 0,
        antialias: true,
        refreshExpiredTiles: true,
        maxBounds: [[-180, -85], [180, 85]],
        renderWorldCopies: true,
        trackResize: true,
        crossSourceCollisions: false,
        collectResourceTiming: false,
        fadeDuration: 300,
        optimizeForTerrain: true
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
            // Create modern aircraft icon
            const el = document.createElement('img');
            el.className = 'aircraft-marker';
            
            // Use helicopter icon if detected, otherwise use aircraft
            const isHelicopter = flight.aircraft_type && 
              (flight.aircraft_type.includes('H') || 
               flight.aircraft_type.includes('EC') || 
               flight.aircraft_type.includes('AS'));
            
            if (isHelicopter) {
              el.src = createHelicopterIcon(flight.position?.heading || flight.true_track || 0);
            } else {
              el.src = createModernAircraftIcon({
                ...flight,
                true_track: flight.position?.heading || flight.true_track || 0,
                altitude: flight.position?.altitude || flight.altitude || 0,
                aircraft_type: flight.aircraft_type || 'A320'
              });
            }
            
            el.style.width = 'auto';
            el.style.height = 'auto';
            el.style.cursor = 'pointer';
            el.style.transition = 'transform 0.5s ease';
            el.style.pointerEvents = 'auto';
            el.style.userSelect = 'none';
            el.style.webkitUserSelect = 'none';
            el.style.filter = flight.onGround ? 'brightness(0.7)' : 'none';
            el.title = flight.callsign || flight.icao24 || 'Aircraft';
            
            // Create modern popup content like FlightRadar24
            const aircraftType = flight.aircraft_type || 'N/A';
            
            const popupHTML = `
              <div style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 220px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px; margin: -8px -8px 8px -8px; border-radius: 8px 8px 0 0;">
                  <div style="font-size: 16px; font-weight: bold; margin-bottom: 2px;">
                    ${flight.callsign || 'Unknown Flight'}
                  </div>
                  <div style="font-size: 11px; opacity: 0.9;">
                    ${aircraftType} · ${flight.icao24.toUpperCase()}
                  </div>
                </div>
                
                <div style="padding: 0 10px; font-size: 12px;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                      <div style="color: #6c757d; font-size: 10px; margin-bottom: 2px;">ALTITUDE</div>
                      <div style="font-weight: bold; color: #2c3e50; font-size: 14px;">
                        ${Math.round(flight.position.altitude || 0).toLocaleString()}
                      </div>
                      <div style="color: #6c757d; font-size: 10px;">feet</div>
                    </div>
                    <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                      <div style="color: #6c757d; font-size: 10px; margin-bottom: 2px;">SPEED</div>
                      <div style="font-weight: bold; color: #2c3e50; font-size: 14px;">
                        ${Math.round(flight.position.groundSpeed || 0)}
                      </div>
                      <div style="color: #6c757d; font-size: 10px;">knots</div>
                    </div>
                  </div>
                  
                  <div style="border-top: 1px solid #e9ecef; padding-top: 8px; margin-top: 8px;">
                    <div style="display: flex; justify-content: space-between; margin: 6px 0;">
                      <span style="color: #6c757d;">Heading:</span>
                      <strong style="color: #2c3e50;">${Math.round(flight.position.heading || 0)}°</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 6px 0;">
                      <span style="color: #6c757d;">Vertical:</span>
                      <strong style="color: ${(flight.position.verticalRate || 0) > 0 ? '#28a745' : (flight.position.verticalRate || 0) < 0 ? '#dc3545' : '#6c757d'};">
                        ${(flight.position.verticalRate || 0) > 0 ? '↑' : (flight.position.verticalRate || 0) < 0 ? '↓' : '→'} 
                        ${Math.abs(Math.round(flight.position.verticalRate || 0))} fpm
                      </strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 6px 0;">
                      <span style="color: #6c757d;">Track:</span>
                      <strong style="color: #2c3e50;">${flight.origin || 'N/A'} → ${flight.destination || 'N/A'}</strong>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 10px; padding: 6px; background: ${flight.onGround ? '#fff3cd' : '#d4edda'}; border-radius: 6px; color: ${flight.onGround ? '#856404' : '#155724'};">
                    <strong>${flight.onGround ? '🛬 On Ground' : '✈️ In Flight'}</strong>
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
            
            // Add click event to show popup and trigger flight details
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              marker.togglePopup();
              if (onFlightClick) {
                onFlightClick(flight);
              }
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
  }, [flights]); // eslint-disable-line react-hooks/exhaustive-deps

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