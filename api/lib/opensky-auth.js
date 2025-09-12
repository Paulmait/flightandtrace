// OpenSky OAuth2 Client Credentials Flow
let tokenCache = {
  token: null,
  expiresAt: null
};

export async function getOpenSkyToken() {
  // Check if we have a valid cached token
  if (tokenCache.token && tokenCache.expiresAt && new Date() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  // If OAuth2 credentials are not available, return null (will use anonymous access)
  if (!clientId || !clientSecret) {
    console.log('OpenSky OAuth2 credentials not configured, using anonymous access');
    return null;
  }

  try {
    // Request new token
    const tokenUrl = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      console.error('Failed to obtain OpenSky token:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Cache the token (expires in 30 minutes, we'll refresh at 25 minutes to be safe)
    tokenCache.token = data.access_token;
    tokenCache.expiresAt = new Date(Date.now() + 25 * 60 * 1000);
    
    console.log('OpenSky OAuth2 token obtained successfully');
    return data.access_token;
  } catch (error) {
    console.error('Error obtaining OpenSky token:', error);
    return null;
  }
}

export async function fetchWithAuth(url) {
  const token = await getOpenSkyToken();
  
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, { 
      headers,
      signal: AbortSignal.timeout(8000) // 8 second timeout
    });
    
    // If auth fails, try without auth (anonymous access)
    if (response.status === 401 && token) {
      console.log('OpenSky auth failed, falling back to anonymous access');
      tokenCache.token = null; // Clear invalid token
      return await fetch(url, { signal: AbortSignal.timeout(8000) });
    }
    
    return response;
  } catch (error) {
    console.error('OpenSky API request failed:', error);
    // Try anonymous access as fallback
    try {
      return await fetch(url, { signal: AbortSignal.timeout(8000) });
    } catch (fallbackError) {
      console.error('Anonymous access also failed:', fallbackError);
      throw fallbackError;
    }
  }
}