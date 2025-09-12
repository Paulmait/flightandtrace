import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const SimpleMapFixed = ({ flights = [], center = [0, 40], zoom = 3 }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (map.current) return;

    // Use Carto basemap (free, no API key required, very reliable)
    const style = {
      version: 8,
      sources: {
        'carto-light': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxzoom: 20
        }
      },
      layers: [
        {
          id: 'carto-base-layer',
          type: 'raster',
          source: 'carto-light',
          minzoom: 0,
          maxzoom: 22
        }
      ],
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
    };

    try {
      // Initialize map
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: style,
        center: center,
        zoom: zoom,
        maxZoom: 18,
        minZoom: 2,
        attributionControl: true
      });

      // Add navigation controls
      map.current.on('load', () => {
        console.log('Map loaded successfully with Carto tiles');
        
        // Add controls
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
        
        // Add attribution control
        map.current.addControl(new maplibregl.AttributionControl({
          compact: true
        }));
      });

      // Error handling
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        // Try to continue even with errors
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
    }

    return () => {
      // Cleanup markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      
      // Cleanup map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update markers when flights change
  useEffect(() => {
    if (!map.current) return;

    // Wait for map to be loaded
    if (!map.current.loaded()) {
      map.current.on('load', () => {
        updateMarkers();
      });
    } else {
      updateMarkers();
    }

    function updateMarkers() {
      // Remove existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];

      // Add new markers for each flight
      flights.forEach(flight => {
        if (flight.position && flight.position.latitude && flight.position.longitude) {
          try {
            // Create custom marker element
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.backgroundColor = flight.onGround ? '#ff6b6b' : '#4ecdc4';
            el.style.width = '12px';
            el.style.height = '12px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid white';
            el.style.cursor = 'pointer';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

            // Create marker
            const marker = new maplibregl.Marker({
              element: el,
              anchor: 'center'
            })
              .setLngLat([flight.position.longitude, flight.position.latitude])
              .setPopup(
                new maplibregl.Popup({ 
                  offset: 15,
                  closeButton: true,
                  closeOnClick: false,
                  maxWidth: '250px'
                })
                  .setHTML(`
                    <div style="padding: 8px;">
                      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">
                        ${flight.callsign || flight.icao24 || 'Unknown'}
                      </h3>
                      <div style="font-size: 12px; line-height: 1.4;">
                        <div><strong>Altitude:</strong> ${Math.round(flight.position.altitude || 0).toLocaleString()} ft</div>
                        <div><strong>Speed:</strong> ${Math.round(flight.position.groundSpeed || 0)} kts</div>
                        <div><strong>Heading:</strong> ${Math.round(flight.position.heading || 0)}°</div>
                        <div><strong>Status:</strong> ${flight.onGround ? 'On Ground' : 'In Flight'}</div>
                        ${flight.origin ? `<div><strong>Origin:</strong> ${flight.origin}</div>` : ''}
                      </div>
                    </div>
                  `)
              )
              .addTo(map.current);

            markers.current.push(marker);
          } catch (err) {
            console.error('Error adding marker:', err);
          }
        }
      });

      console.log(`Added ${markers.current.length} aircraft markers`);
    }
  }, [flights]);

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      right: 0, 
      bottom: 0, 
      left: 0,
      width: '100%',
      height: '100%'
    }}>
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
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#666',
        zIndex: 1
      }}>
        Aircraft: {flights.length}
      </div>
    </div>
  );
};

export default SimpleMapFixed;