export const createAircraftLayer = (map) => {
  const aircraftIcon = createAircraftIcon();
  
  map.addImage('aircraft-icon', aircraftIcon, { sdf: true });

  map.addSource('aircraft-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  map.addLayer({
    id: 'aircraft-layer',
    type: 'symbol',
    source: 'aircraft-source',
    layout: {
      'icon-image': 'aircraft-icon',
      'icon-size': 0.8,
      'icon-rotate': ['get', 'heading'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'text-field': ['get', 'callsign'],
      'text-font': ['Open Sans Regular'],
      'text-size': 10,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-optional': true
    },
    paint: {
      'icon-color': [
        'case',
        ['==', ['get', 'selected'], true], '#FF6B6B',
        ['==', ['get', 'onGround'], true], '#95A5A6',
        '#4ECDC4'
      ],
      'text-color': '#2C3E50',
      'text-halo-color': 'rgba(255, 255, 255, 0.9)',
      'text-halo-width': 1.5
    }
  });
};

export const updateAircraftLayer = (map, flights) => {
  const features = flights.map(flight => {
    // Handle both data structures: flight.positions array or flight.position object
    const position = flight.position || (flight.positions && flight.positions[flight.positions.length - 1]);
    if (!position) return null;

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [position.longitude, position.latitude]
      },
      properties: {
        flightId: flight.id,
        callsign: flight.callsign || flight.registration || 'Unknown',
        heading: position.heading || 0,
        altitude: position.altitude || 0,
        speed: position.groundSpeed || position.speed || 0,
        onGround: position.onGround || position.altitude < 1000,
        selected: false
      }
    };
  }).filter(Boolean);

  const source = map.getSource('aircraft-source');
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features
    });
  }
};

const createAircraftIcon = () => {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 2);

  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-4, -6);
  ctx.lineTo(-4, -2);
  ctx.lineTo(-12, -10);
  ctx.lineTo(-12, -6);
  ctx.lineTo(-6, -2);
  ctx.lineTo(-6, 2);
  ctx.lineTo(-12, 6);
  ctx.lineTo(-12, 10);
  ctx.lineTo(-4, 2);
  ctx.lineTo(-4, 6);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();

  return {
    width: size,
    height: size,
    data: new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer)
  };
};