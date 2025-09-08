import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createAircraftLayer, updateAircraftLayer } from './layers/aircraftLayer';
import { createTrailLayer, updateTrailLayer } from './layers/trailLayer';
import { createEstimatedSegmentLayer } from './layers/estimatedSegmentLayer';
import './FlightMap.css';

const FlightMap = ({ flights, selectedFlight, onFlightSelect, showEstimatedSegments, center, zoom }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=' + (process.env.REACT_APP_MAPTILER_KEY || 'YOUR_MAPTILER_KEY'),
      center: center || [-74.006, 40.7128],
      zoom: zoom || 5,
      pitch: 0,
      bearing: 0,
      antialias: true
    });

    map.current.on('load', () => {
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');
      
      createAircraftLayer(map.current);
      createTrailLayer(map.current);
      createEstimatedSegmentLayer(map.current);
      
      setMapLoaded(true);

      map.current.on('click', 'aircraft-layer', (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          if (onFlightSelect) {
            onFlightSelect(feature.properties.flightId);
          }
        }
      });

      map.current.on('mouseenter', 'aircraft-layer', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'aircraft-layer', () => {
        map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onFlightSelect, center, zoom]);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    updateAircraftLayer(map.current, flights);
    updateTrailLayer(map.current, flights, selectedFlight);
    
    if (showEstimatedSegments) {
      map.current.setLayoutProperty('estimated-segments', 'visibility', 'visible');
    } else {
      map.current.setLayoutProperty('estimated-segments', 'visibility', 'none');
    }
  }, [flights, selectedFlight, showEstimatedSegments, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !map.current || !selectedFlight) return;

    const flight = flights.find(f => f.id === selectedFlight);
    if (flight && flight.position) {
      map.current.flyTo({
        center: [flight.position.longitude, flight.position.latitude],
        zoom: 10,
        duration: 1500
      });
    }
  }, [selectedFlight, flights, mapLoaded]);

  return (
    <div className="flight-map-container">
      <div ref={mapContainer} className="flight-map" />
    </div>
  );
};

export default FlightMap;