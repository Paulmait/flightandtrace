import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const FinalMap = ({ flights = [], center = [-2, 51], zoom = 5 }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (map.current) return; // Initialize only once

    // Use Stamen Toner-Lite tiles (very reliable, no API key)
    const style = {
      version: 8,
      sources: {
        'stamen': {
          type: 'raster',
          tiles: [
            'https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>',
          maxzoom: 20
        }
      },
      layers: [
        {
          id: 'base',
          type: 'raster',
          source: 'stamen',
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
  }, []); // Only run once

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
            // Create marker element
            const el = document.createElement('div');
            el.style.width = '8px';
            el.style.height = '8px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = flight.onGround ? '#e74c3c' : '#3498db';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
            el.style.cursor = 'pointer';
            
            // Create popup content
            const popupHTML = `
              <div style="padding: 8px; font-size: 12px; line-height: 1.4;">
                <strong style="font-size: 13px;">${flight.callsign || flight.icao24 || 'Aircraft'}</strong>
                <hr style="margin: 4px 0; border: none; border-top: 1px solid #ddd;">
                <div>Alt: ${Math.round(flight.position.altitude || 0).toLocaleString()} ft</div>
                <div>Speed: ${Math.round(flight.position.groundSpeed || 0)} kts</div>
                <div>Status: ${flight.onGround ? 'On Ground' : 'In Flight'}</div>
              </div>
            `;

            // Add marker
            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([flight.position.longitude, flight.position.latitude])
              .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(popupHTML))
              .addTo(map.current);

            markers.current.push(marker);
          } catch (err) {
            console.warn(`Failed to add marker ${index}:`, err.message);
          }
        }
      });

      console.log(`Updated ${markers.current.length} markers`);
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