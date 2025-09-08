export const createEstimatedSegmentLayer = (map) => {
  map.addSource('estimated-segments-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  map.addLayer({
    id: 'estimated-segments',
    type: 'line',
    source: 'estimated-segments-source',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
      'visibility': 'visible'
    },
    paint: {
      'line-color': '#FFA500',
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 2,
        10, 3,
        15, 4
      ],
      'line-dasharray': [2, 2],
      'line-opacity': 0.6
    }
  });

  map.addLayer({
    id: 'estimated-segments-labels',
    type: 'symbol',
    source: 'estimated-segments-source',
    layout: {
      'text-field': 'ESTIMATED',
      'text-font': ['Open Sans Regular'],
      'text-size': 10,
      'symbol-placement': 'line-center',
      'text-rotation-alignment': 'map',
      'text-pitch-alignment': 'viewport',
      'visibility': 'visible'
    },
    paint: {
      'text-color': '#FFA500',
      'text-halo-color': 'rgba(255, 255, 255, 0.9)',
      'text-halo-width': 1.5
    },
    filter: ['==', ['get', 'showLabel'], true]
  });
};

export const updateEstimatedSegments = (map, flights) => {
  const features = [];

  flights.forEach(flight => {
    const estimatedSegments = identifyEstimatedSegments(flight.positions);
    
    estimatedSegments.forEach((segment, index) => {
      if (segment.positions.length >= 2) {
        const lineFeature = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: segment.positions.map(pos => [pos.longitude, pos.latitude])
          },
          properties: {
            flightId: flight.id,
            segmentType: 'estimated',
            confidence: segment.confidence,
            showLabel: index === 0
          }
        };
        features.push(lineFeature);

        const arcFeature = createGreatCircleArc(
          segment.positions[0],
          segment.positions[segment.positions.length - 1]
        );
        if (arcFeature) {
          features.push(arcFeature);
        }
      }
    });
  });

  const source = map.getSource('estimated-segments-source');
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features
    });
  }
};

const identifyEstimatedSegments = (positions) => {
  const segments = [];
  let currentSegment = null;

  positions.forEach((pos, index) => {
    if (index === 0) return;

    const prevPos = positions[index - 1];
    const timeDiff = new Date(pos.timestamp) - new Date(prevPos.timestamp);
    const distance = calculateDistance(prevPos, pos);
    const expectedMaxDistance = (prevPos.speed || 500) * (timeDiff / 3600000) * 1.5;

    if (timeDiff > 300000 || distance > expectedMaxDistance) {
      if (!currentSegment) {
        currentSegment = {
          positions: [prevPos],
          confidence: calculateConfidence(timeDiff, distance, expectedMaxDistance)
        };
      }
      currentSegment.positions.push(pos);
    } else if (currentSegment) {
      segments.push(currentSegment);
      currentSegment = null;
    }
  });

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
};

const createGreatCircleArc = (startPos, endPos) => {
  const numPoints = 50;
  const coordinates = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const lat = startPos.latitude + (endPos.latitude - startPos.latitude) * f;
    const lon = startPos.longitude + (endPos.longitude - startPos.longitude) * f;
    
    const altitude = interpolateAltitude(startPos.altitude, endPos.altitude, f);
    coordinates.push([lon, lat]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates
    },
    properties: {
      segmentType: 'great-circle',
      showLabel: false
    }
  };
};

const interpolateAltitude = (startAlt, endAlt, fraction) => {
  if (startAlt === null || endAlt === null) return null;
  return startAlt + (endAlt - startAlt) * fraction;
};

const calculateConfidence = (timeDiff, distance, expectedMaxDistance) => {
  const timeConfidence = Math.max(0, 1 - (timeDiff / 3600000));
  const distanceConfidence = Math.max(0, 1 - (distance / expectedMaxDistance));
  return (timeConfidence + distanceConfidence) / 2;
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