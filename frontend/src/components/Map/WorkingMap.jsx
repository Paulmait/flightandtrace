import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const WorkingMap = ({ flights = [], center = [0, 40], zoom = 3 }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [mapError, setMapError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map only once
  useEffect(() => {
    if (map.current) return;

    // Try multiple tile providers in order of preference
    const tileProviders = [
      {
        name: 'Stadia Maps (Alidade Smooth)',
        style: {
          version: 8,
          sources: {
            'stadia-alidade': {
              type: 'raster',
              tiles: [
                'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              maxzoom: 20
            }
          },
          layers: [
            {
              id: 'stadia-base',
              type: 'raster',
              source: 'stadia-alidade',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        }
      },
      {
        name: 'Carto Light',
        style: {
          version: 8,
          sources: {
            'carto-light': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
              maxzoom: 20
            }
          },
          layers: [
            {
              id: 'carto-base',
              type: 'raster',
              source: 'carto-light',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        }
      },
      {
        name: 'OpenStreetMap',
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              maxzoom: 19
            }
          },
          layers: [
            {
              id: 'osm-base',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        }
      }
    ];

    let mapInitialized = false;
    let currentProviderIndex = 0;

    function tryInitMap() {
      if (currentProviderIndex >= tileProviders.length) {
        setMapError('Unable to load map tiles from any provider');
        console.error('All tile providers failed');
        return;
      }

      const provider = tileProviders[currentProviderIndex];
      console.log(`Trying map provider: ${provider.name}`);

      try {
        // Clean up previous attempt if exists
        if (map.current) {
          map.current.remove();
          map.current = null;
        }

        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: provider.style,
          center: center,
          zoom: zoom,
          maxZoom: 18,
          minZoom: 2,
          attributionControl: true,
          failIfMajorPerformanceCaveat: false // Allow software rendering if needed
        });

        map.current.on('load', () => {
          console.log(`Map loaded successfully with ${provider.name}`);
          mapInitialized = true;
          setMapError(null);
          setMapLoaded(true);
          
          // Add controls
          map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
          map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
          
          // Test if tiles are actually loading
          setTimeout(() => {
            const sources = map.current.getStyle().sources;
            console.log('Map sources loaded:', Object.keys(sources));
          }, 1000);
        });

        map.current.on('error', (e) => {
          console.error(`Map error with ${provider.name}:`, e);
          if (!mapInitialized) {
            // Try next provider
            currentProviderIndex++;
            setTimeout(tryInitMap, 100);
          }
        });

        // Also add a timeout to try next provider if map doesn't load
        setTimeout(() => {
          if (!mapInitialized && currentProviderIndex === tileProviders.indexOf(provider)) {
            console.log(`Timeout loading ${provider.name}, trying next...`);
            currentProviderIndex++;
            tryInitMap();
          }
        }, 5000);

      } catch (error) {
        console.error(`Failed to initialize map with ${provider.name}:`, error);
        currentProviderIndex++;
        setTimeout(tryInitMap, 100);
      }
    }

    // Start trying providers
    tryInitMap();

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle center/zoom changes without re-initializing
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    // Only fly to new location if it's significantly different
    const currentCenter = map.current.getCenter();
    const distance = Math.sqrt(
      Math.pow(currentCenter.lng - center[0], 2) + 
      Math.pow(currentCenter.lat - center[1], 2)
    );
    
    if (distance > 1) { // Only move if more than 1 degree difference
      map.current.flyTo({
        center: center,
        zoom: zoom,
        duration: 1500
      });
    }
  }, [center, zoom, mapLoaded]);

  // Update markers when flights change
  useEffect(() => {
    if (!map.current) return;

    const updateMarkers = () => {
      // Remove existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];

      // Add new markers
      flights.forEach(flight => {
        if (flight.position && flight.position.latitude && flight.position.longitude) {
          try {
            // Create custom marker element
            const el = document.createElement('div');
            el.style.width = '10px';
            el.style.height = '10px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = flight.onGround ? '#e74c3c' : '#3498db';
            el.style.border = '2px solid white';
            el.style.cursor = 'pointer';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([flight.position.longitude, flight.position.latitude])
              .setPopup(
                new maplibregl.Popup({ offset: 15 })
                  .setHTML(`
                    <div style="padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <strong style="font-size: 14px; color: #2c3e50;">
                        ✈️ ${flight.callsign || flight.icao24 || 'Unknown'}
                      </strong>
                      <hr style="margin: 8px 0; border: none; border-top: 1px solid #ecf0f1;">
                      <div style="font-size: 12px; color: #34495e; line-height: 1.6;">
                        <div>📏 <strong>Alt:</strong> ${Math.round(flight.position.altitude || 0).toLocaleString()} ft</div>
                        <div>💨 <strong>Speed:</strong> ${Math.round(flight.position.groundSpeed || 0)} kts</div>
                        <div>🧭 <strong>Heading:</strong> ${Math.round(flight.position.heading || 0)}°</div>
                        <div>📍 <strong>Status:</strong> ${flight.onGround ? '🛬 Landed' : '✈️ Airborne'}</div>
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

      console.log(`Updated ${markers.current.length} aircraft markers`);
    };

    if (map.current.loaded()) {
      updateMarkers();
    } else {
      map.current.on('load', updateMarkers);
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
      height: '100%',
      backgroundColor: '#f0f0f0' // Light gray background while loading
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
      
      {/* Status overlay */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#2c3e50',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div>✈️ Aircraft: {flights.length}</div>
        {mapError && <div style={{ color: '#e74c3c', marginTop: '4px' }}>⚠️ {mapError}</div>}
      </div>

      {/* Loading indicator */}
      {!map.current && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          zIndex: 2
        }}>
          <div style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '10px' }}>
            Loading Map...
          </div>
          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
            Connecting to tile servers
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingMap;