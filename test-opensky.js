// Test OpenSky API authentication
const username = 'guampaul@gmail.com-api-client';
const password = '4NqUCZ'; // This appears to be partial - you mentioned "partial"

async function testOpenSkyAPI() {
  try {
    console.log('Testing OpenSky API authentication...\n');
    
    // Test with authentication
    const url = 'https://opensky-network.org/api/states/all?lamin=45&lomin=-10&lamax=55&lomax=5';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Authentication successful!');
      console.log(`Found ${data.states ? data.states.length : 0} flights`);
      
      // Show first flight as example
      if (data.states && data.states.length > 0) {
        const flight = data.states[0];
        console.log('\nExample flight:');
        console.log('- ICAO24:', flight[0]);
        console.log('- Callsign:', flight[1]);
        console.log('- Position:', `${flight[6]}°N, ${flight[5]}°E`);
      }
    } else {
      console.log('\n❌ Authentication failed');
      console.log('Status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testOpenSkyAPI();