// Modern aircraft icons similar to FlightRadar24
export const createAircraftIcon = (heading = 0, color = '#FFB800', size = 'medium') => {
  const sizes = {
    small: { width: 20, height: 20, strokeWidth: 1.5 },
    medium: { width: 28, height: 28, strokeWidth: 2 },
    large: { width: 36, height: 36, strokeWidth: 2.5 },
    heavy: { width: 42, height: 42, strokeWidth: 3 }
  };

  const { width, height, strokeWidth } = sizes[size] || sizes.medium;

  // Modern, sleek aircraft SVG design inspired by FlightRadar24
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading - 90}deg); filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));">
      <!-- Aircraft Body -->
      <path d="M 20 8 L 20 32 L 18 34 L 18 36 L 22 36 L 22 34 L 20 32" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="${strokeWidth}" 
            stroke-linejoin="round"/>
      
      <!-- Wings -->
      <path d="M 8 20 L 32 20 L 34 22 L 32 24 L 8 24 L 6 22 L 8 20" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="${strokeWidth}" 
            stroke-linejoin="round"/>
      
      <!-- Tail -->
      <path d="M 16 30 L 24 30 L 22 34 L 18 34 L 16 30" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="${strokeWidth}" 
            stroke-linejoin="round"/>
      
      <!-- Cockpit -->
      <ellipse cx="20" cy="12" rx="3" ry="4" 
               fill="#2c3e50" 
               stroke="#ffffff" 
               stroke-width="${strokeWidth * 0.75}"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// High-performance aircraft icon with better graphics
export const createModernAircraftIcon = (flight) => {
  const heading = flight.true_track || flight.heading || 0;
  const altitude = flight.altitude || flight.geo_altitude || 0;
  
  // Determine aircraft size based on type
  let size = 'medium';
  let color = '#FFB800'; // Default yellow
  
  if (flight.aircraft_type) {
    const type = flight.aircraft_type.toUpperCase();
    
    // Wide-body aircraft (large)
    if (type.includes('A380') || type.includes('B747') || type.includes('A350') || type.includes('B777')) {
      size = 'heavy';
      color = '#FF6B6B'; // Red for heavy aircraft
    }
    // Medium wide-body
    else if (type.includes('A330') || type.includes('A340') || type.includes('B767') || type.includes('B787')) {
      size = 'large';
      color = '#4ECDC4'; // Teal for large aircraft
    }
    // Narrow-body aircraft
    else if (type.includes('A320') || type.includes('A321') || type.includes('B737') || type.includes('B757')) {
      size = 'medium';
      color = '#FFB800'; // Yellow for medium aircraft
    }
    // Regional jets and turboprops
    else if (type.includes('E') || type.includes('CRJ') || type.includes('ATR') || type.includes('DH')) {
      size = 'small';
      color = '#95E77E'; // Green for small aircraft
    }
  }
  
  // Altitude-based color adjustment (make it slightly darker when higher)
  if (altitude > 30000) {
    // Darken color slightly for high altitude
    color = adjustColorBrightness(color, -20);
  } else if (altitude < 5000) {
    // Brighten color for low altitude (landing/takeoff)
    color = adjustColorBrightness(color, 20);
  }
  
  return createAircraftIcon(heading, color, size);
};

// Helper function to adjust color brightness
function adjustColorBrightness(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

// Create a ground vehicle icon (for airport vehicles)
export const createGroundVehicleIcon = () => {
  const svg = `
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="10" height="6" fill="#666666" stroke="#ffffff" stroke-width="1" rx="1"/>
      <circle cx="5" cy="12" r="1.5" fill="#333333"/>
      <circle cx="11" cy="12" r="1.5" fill="#333333"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Create helicopter icon
export const createHelicopterIcon = (heading = 0) => {
  const svg = `
    <svg width="30" height="30" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading - 90}deg); filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));">
      <!-- Main Rotor -->
      <line x1="5" y1="20" x2="35" y2="20" stroke="#333333" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
      <line x1="20" y1="5" x2="20" y2="35" stroke="#333333" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
      
      <!-- Body -->
      <ellipse cx="20" cy="22" rx="8" ry="10" fill="#4A90E2" stroke="#ffffff" stroke-width="2"/>
      
      <!-- Cockpit -->
      <ellipse cx="20" cy="18" rx="5" ry="6" fill="#2c3e50" stroke="#ffffff" stroke-width="1.5"/>
      
      <!-- Tail -->
      <rect x="18" y="28" width="4" height="8" fill="#4A90E2" stroke="#ffffff" stroke-width="1.5"/>
      
      <!-- Tail Rotor -->
      <circle cx="20" cy="34" r="3" fill="none" stroke="#333333" stroke-width="1" opacity="0.3"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};