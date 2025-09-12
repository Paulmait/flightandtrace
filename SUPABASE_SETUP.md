# Supabase Setup for Flight and Trace

## Environment Variables to Add to Vercel

Based on your Supabase project, add these to Vercel:

1. **SUPABASE_URL**
   - Get from: Supabase Dashboard → Settings → API → Project URL
   - Example: `https://qygkzrvshunvxobxlois.supabase.co`

2. **SUPABASE_ANON_KEY**
   - Get from: Supabase Dashboard → Settings → API → anon public
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **SUPABASE_SERVICE_KEY**
   - Get from: Supabase Dashboard → Settings → API → service_role
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **DATABASE_URL** (Optional - for direct database access)
   - Your connection string: `postgresql://postgres.qygkzrvshunvxobxlois:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with your actual database password

## Database Tables Created

The following tables will be automatically created:

1. **flight_history** - Stores historical flight data
   - icao24, callsign, registration, aircraft_type
   - origin, destination, position, altitude, speed, heading
   - Indexed for fast queries

2. **user_saved_flights** - User's saved/favorite flights
   - Links user_id to flight_id
   - Includes notes and saved timestamp

3. **flight_alerts** - User alert preferences
   - Alert criteria stored as JSON
   - Active/inactive status

## Testing the Connection

After adding the environment variables and redeploying, test at:
```
https://flightandtrace.com/api/health
```

Look for:
```json
"supabase": {
  "enabled": true,
  "hasServiceKey": true
}
```

## Usage in the App

The app will automatically:
1. Store flight positions every 30 seconds
2. Keep 30 days of historical data
3. Allow users to save favorite flights
4. Enable flight alerts and notifications