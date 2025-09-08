export const createTrailLayer = (map) => {
  map.addSource('trail-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  map.addLayer({
    id: 'trail-layer-shadow',
    type: 'line',
    source: 'trail-source',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': 'rgba(0, 0, 0, 0.2)',
      'line-width': 5,
      'line-blur': 3,
      'line-translate': [1, 1]
    },
    filter: ['==', ['get', 'type'], 'trail']
  });

  map.addLayer({
    id: 'trail-layer',
    type: 'line',
    source: 'trail-source',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': [
        'case',
        ['==', ['get', 'selected'], true], '#FF6B6B',
        '#4ECDC4'
      ],
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 2,
        10, 3,
        15, 4
      ],
      'line-opacity': [
        'case',
        ['==', ['get', 'segmentType'], 'observed'], 1.0,
        ['==', ['get', 'segmentType'], 'interpolated'], 0.7,
        0.4
      ]
    },
    filter: ['==', ['get', 'type'], 'trail']
  });

  map.addLayer({
    id: 'trail-points',
    type: 'circle',
    source: 'trail-source',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 1,
        10, 2,
        15, 3
      ],
      'circle-color': [
        'case',
        ['==', ['get', 'selected'], true], '#FF6B6B',
        '#4ECDC4'
      ],
      'circle-opacity': 0.8,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-opacity': 0.9
    },
    filter: ['==', ['get', 'type'], 'point']
  });
};

export const updateTrailLayer = (map, flights, selectedFlightId) => {
  const features = [];
  
  flights.forEach(flight => {
    // Handle both data structures: flight.positions array or flight.position object
    const positions = flight.positions || (flight.position ? [flight.position] : []);
    if (positions.length < 2) return;
    
    const isSelected = flight.id === selectedFlightId;
    const segments = createTrailSegments(positions);
    
    segments.forEach(segment => {
      if (segment.positions.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: segment.positions.map(pos => [pos.longitude, pos.latitude])
          },
          properties: {
            type: 'trail',
            flightId: flight.id,
            selected: isSelected,
            segmentType: segment.type
          }
        });
      }
    });

    if (isSelected) {
      positions.forEach((pos, index) => {
        if (index % 5 === 0 || index === 0 || index === positions.length - 1) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [pos.longitude, pos.latitude]
            },
            properties: {
              type: 'point',
              flightId: flight.id,
              selected: isSelected,
              timestamp: pos.timestamp,
              altitude: pos.altitude,
              speed: pos.groundSpeed || pos.speed
            }
          });
        }
      });
    }
  });

  const source = map.getSource('trail-source');
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features
    });
  }
};

const createTrailSegments = (positions) => {
  const segments = [];
  let currentSegment = {
    type: 'observed',
    positions: []
  };

  positions.forEach((pos, index) => {
    if (index > 0) {
      const prevPos = positions[index - 1];
      const timeDiff = new Date(pos.timestamp) - new Date(prevPos.timestamp);
      const distance = calculateDistance(prevPos, pos);
      
      if (timeDiff > 300000 || distance > 100) {
        if (currentSegment.positions.length > 0) {
          segments.push(currentSegment);
        }
        currentSegment = {
          type: timeDiff > 300000 ? 'estimated' : 'observed',
          positions: [pos]
        };
      } else {
        currentSegment.positions.push(pos);
      }
    } else {
      currentSegment.positions.push(pos);
    }
  });

  if (currentSegment.positions.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
};

const calculateDistance = (pos1, pos2) => {
  const R = 6371;
  const dLat = toRad(pos2.latitude - pos1.latitude);
  const dLon = toRad(pos2.longitude - pos1.longitude);
  const lat1 = toRad(pos1.latitude);
  const lat2 = toRad(pos2.latitude);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);