// OpenSky Network authentication helper
export async function fetchWithAuth(url) {
  // Check if we have OpenSky credentials
  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;
  
  const options = {
    headers: {}
  };
  
  // Add basic auth if credentials are available
  if (username && password) {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    options.headers['Authorization'] = `Basic ${auth}`;
  }
  
  // Add timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  options.signal = controller.signal;
  
  try {
    const response = await fetch(url, options);
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export default { fetchWithAuth };
