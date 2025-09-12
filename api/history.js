import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if Supabase is configured
  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      success: false,
      message: 'Supabase not configured',
      data: []
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'POST') {
      // Store flight history
      const { flights } = req.body;
      
      if (!flights || !Array.isArray(flights)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid flight data'
        });
      }

      const records = flights.map(flight => ({
        icao24: flight.icao24,
        callsign: flight.callsign,
        position: {
          latitude: flight.position?.latitude,
          longitude: flight.position?.longitude
        },
        altitude: flight.position?.altitude,
        speed: flight.position?.groundSpeed,
        heading: flight.position?.heading,
        timestamp: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('flight_history')
        .insert(records);

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(200).json({
          success: false,
          error: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: `Stored ${records.length} flight records`
      });
    }

    // GET method - retrieve flight history
    const { icao24, limit = 100 } = req.query;
    
    let query = supabase
      .from('flight_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (icao24) {
      query = query.eq('icao24', icao24);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(200).json({
        success: false,
        error: error.message,
        data: []
      });
    }

    res.status(200).json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });

  } catch (error) {
    console.error('History API error:', error);
    res.status(200).json({
      success: false,
      error: error.message,
      data: []
    });
  }
}