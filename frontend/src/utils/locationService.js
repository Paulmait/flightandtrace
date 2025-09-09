// Location service to determine user's position and appropriate flight area

// Get user location using browser geolocation API
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'geolocation'
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
};

// Get location from IP address using free IP geolocation service
export const getLocationFromIP = async () => {
  try {
    // Using ipapi.co free tier (no API key needed for basic usage)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country_name,
        source: 'ip'
      };
    }
    throw new Error('Invalid IP location data');
  } catch (error) {
    console.error('IP geolocation failed:', error);
    throw error;
  }
};

// Calculate bounding box around a point
export const calculateBoundingBox = (latitude, longitude, radiusKm = 500) => {
  // Rough approximation: 1 degree latitude = 111km
  // 1 degree longitude = 111km * cos(latitude)
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));
  
  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLon: longitude - lonDelta,
    maxLon: longitude + lonDelta
  };
};

// Get optimal location with fallbacks
export const getOptimalLocation = async () => {
  // Try browser geolocation first
  try {
    const geoLocation = await getUserLocation();
    console.log('Using browser geolocation:', geoLocation);
    return geoLocation;
  } catch (geoError) {
    console.log('Geolocation failed, trying IP location...');
    
    // Fallback to IP geolocation
    try {
      const ipLocation = await getLocationFromIP();
      console.log('Using IP geolocation:', ipLocation);
      return ipLocation;
    } catch (ipError) {
      console.log('IP location failed, using default location');
      
      // Final fallback to Europe center
      return {
        latitude: 50,
        longitude: 10,
        source: 'default',
        city: 'Europe',
        country: 'Default'
      };
    }
  }
};

// Get region-specific defaults
export const getRegionDefaults = (latitude, longitude) => {
  // North America
  if (latitude >= 25 && latitude <= 70 && longitude >= -170 && longitude <= -50) {
    return { zoom: 4, radius: 800 };
  }
  // Europe
  if (latitude >= 35 && latitude <= 70 && longitude >= -10 && longitude <= 40) {
    return { zoom: 5, radius: 600 };
  }
  // Asia
  if (latitude >= -10 && latitude <= 70 && longitude >= 40 && longitude <= 150) {
    return { zoom: 4, radius: 1000 };
  }
  // Australia/Oceania
  if (latitude >= -50 && latitude <= -10 && longitude >= 110 && longitude <= 180) {
    return { zoom: 4, radius: 800 };
  }
  // South America
  if (latitude >= -60 && latitude <= 15 && longitude >= -90 && longitude <= -30) {
    return { zoom: 4, radius: 800 };
  }
  // Africa
  if (latitude >= -35 && latitude <= 35 && longitude >= -20 && longitude <= 50) {
    return { zoom: 4, radius: 800 };
  }
  
  // Default
  return { zoom: 5, radius: 600 };
};