import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const SimpleMap = ({ flights = [], center = [0, 40], zoom = 3 }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return;

    // Simple OSM style
    const style = {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm'
        }
      ]
    };

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: style,
        center: center,
        zoom: zoom
      });

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        
        // Add navigation controls
        map.current.addControl(new maplibregl.NavigationControl());
        
        // Add flight markers
        flights.forEach(flight => {
          if (flight.position && flight.position.latitude && flight.position.longitude) {
            new maplibregl.Marker({
              color: flight.onGround ? '#ff6b6b' : '#4ecdc4'
            })
              .setLngLat([flight.position.longitude, flight.position.latitude])
              .setPopup(
                new maplibregl.Popup({ offset: 25 })
                  .setHTML(`
                    <div>
                      <strong>${flight.callsign || flight.icao24}</strong><br/>
                      Alt: ${Math.round(flight.position.altitude)} ft<br/>
                      Speed: ${Math.round(flight.position.groundSpeed)} kts
                    </div>
                  `)
              )
              .addTo(map.current);
          }
        });
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update markers when flights change
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;

    // Remove existing markers
    const markers = document.getElementsByClassName('maplibregl-marker');
    while(markers[0]) {
      markers[0].parentNode.removeChild(markers[0]);
    }

    // Add new markers
    flights.forEach(flight => {
      if (flight.position && flight.position.latitude && flight.position.longitude) {
        new maplibregl.Marker({
          color: flight.onGround ? '#ff6b6b' : '#4ecdc4'
        })
          .setLngLat([flight.position.longitude, flight.position.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 })
              .setHTML(`
                <div>
                  <strong>${flight.callsign || flight.icao24}</strong><br/>
                  Alt: ${Math.round(flight.position.altitude)} ft<br/>
                  Speed: ${Math.round(flight.position.groundSpeed)} kts
                </div>
              `)
          )
          .addTo(map.current);
      }
    });
  }, [flights]);

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
      <div 
        ref={mapContainer} 
        style={{ 
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: '100%'
        }} 
      />
    </div>
  );
};

export default SimpleMap;