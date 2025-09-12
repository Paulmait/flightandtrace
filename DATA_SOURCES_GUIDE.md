# 🌐 Complete Data Sources Setup Guide for Flight and Trace

## 1. FlightAware API (Premium Flight Data)

### What is FlightAware?
FlightAware provides the most comprehensive commercial flight data, including schedules, delays, and historical information. Used by airlines and airports worldwide.

### Setup Process:

#### Step 1: Create FlightAware Account
1. **Go to:** https://flightaware.com/commercial/flightxml/
2. **Click:** "Sign Up for FlightXML"
3. **Fill out:** Business information form
4. **Select:** "Developer/Hobbyist" for account type
5. **Submit** and wait for approval (usually 1-2 business days)

#### Step 2: Choose Your Plan
```
FlightXML Plans:
- Starter: $0 (limited to 500 queries/month)
- Silver: $100/month (10,000 queries)
- Gold: $500/month (100,000 queries)
- Platinum: Custom pricing
```

**Recommendation:** Start with Starter (free) for testing

#### Step 3: Get API Credentials
1. **Login to:** https://flightaware.com/account/
2. **Navigate to:** "FlightXML 3" section
3. **Find your:**
   - Username (your email)
   - API Key (looks like: abc123def456...)

#### Step 4: Add to Vercel
```
FLIGHTAWARE_USERNAME=your_email@example.com
FLIGHTAWARE_API_KEY=your_api_key_here
```

### API Endpoints You Can Use:
- `FlightInfoStatus` - Current flight status
- `AirportDelays` - Real-time airport delays
- `RoutesBetweenAirports` - All flights between airports
- `HistoricalTrack` - Past flight paths
- `AircraftType` - Aircraft details

---

## 2. Aircraft Photos Database

### Option A: Planespotters.net API (Recommended)

#### What is Planespotters?
Community-driven aircraft photo database with 500,000+ high-quality photos.

#### Setup:
1. **Go to:** https://www.planespotters.net/contact/
2. **Request:** API access via contact form
3. **Mention:** Non-commercial use for flight tracker
4. **Wait:** 3-5 days for approval
5. **Receive:** API documentation and key

#### Add to Vercel:
```
PLANESPOTTERS_API_KEY=your_key_here
```

#### Usage:
```javascript
// Get aircraft photo by registration
GET https://api.planespotters.net/pub/photos/reg/{registration}

// Get by ICAO24
GET https://api.planespotters.net/pub/photos/hex/{icao24}
```

### Option B: JetPhotos API

#### Setup:
1. **Go to:** https://www.jetphotos.com/api
2. **Register:** Create developer account
3. **Get:** API key immediately
4. **Free tier:** 1,000 requests/day

#### Add to Vercel:
```
JETPHOTOS_API_KEY=your_key_here
```

### Option C: Aviation Stack (Paid but Comprehensive)

#### Setup:
1. **Go to:** https://aviationstack.com/
2. **Sign up:** Free account
3. **Plans:**
   - Free: 100 requests/month
   - Basic: $49/month for 10,000 requests
   - Professional: $149/month for 100,000 requests

#### Features:
- Aircraft photos
- Aircraft specifications
- Manufacturer details
- Historical data

#### Add to Vercel:
```
AVIATIONSTACK_API_KEY=your_key_here
```

---

## 3. Historical Data Storage Solutions

### Option A: Supabase (Recommended - Free Tier)

#### What is Supabase?
Open-source Firebase alternative with PostgreSQL database, perfect for storing flight history.

#### Setup:
1. **Go to:** https://supabase.com/
2. **Click:** "Start your project"
3. **Sign up:** with GitHub or email
4. **Create project:**
   - Project name: `flight-and-trace`
   - Database password: (generate strong password)
   - Region: Choose closest to you
   - Plan: Free (500MB storage, 2GB transfer)

5. **Get credentials:**
   - Go to Settings → API
   - Copy: `URL` and `anon public key`

#### Add to Vercel:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs... (from Settings → API → service_role)
```

#### Database Schema:
```sql
-- Create flight history table
CREATE TABLE flight_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  icao24 VARCHAR(10),
  callsign VARCHAR(20),
  registration VARCHAR(20),
  aircraft_type VARCHAR(50),
  origin VARCHAR(10),
  destination VARCHAR(10),
  position JSONB,
  altitude FLOAT,
  speed FLOAT,
  heading FLOAT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX idx_flight_history_icao24 ON flight_history(icao24);
CREATE INDEX idx_flight_history_timestamp ON flight_history(timestamp);
CREATE INDEX idx_flight_history_callsign ON flight_history(callsign);
```

### Option B: MongoDB Atlas (Free 512MB)

#### Setup:
1. **Go to:** https://www.mongodb.com/cloud/atlas/register
2. **Create account** and verify email
3. **Create cluster:**
   - Choose: Shared (Free)
   - Provider: AWS/Google Cloud/Azure
   - Region: Closest to you

4. **Get connection string:**
   - Database → Connect → Connect your application
   - Copy connection string

#### Add to Vercel:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flightandtrace
```

### Option C: PostgreSQL on Railway (Free $5 credit/month)

#### Setup:
1. **Go to:** https://railway.app/
2. **Sign up** with GitHub
3. **New Project** → Deploy PostgreSQL
4. **Get credentials** from Variables tab

#### Add to Vercel:
```
DATABASE_URL=postgresql://user:pass@host:5432/railway
```

---

## 4. Additional Premium Data Sources

### AeroDataBox (Flight Schedules & Airport Data)

#### Setup:
1. **Go to:** https://rapidapi.com/aedbx-aedbx/api/aerodatabox
2. **Subscribe:** Basic plan (Free - 300 requests/month)
3. **Get:** RapidAPI key

#### Features:
- Flight schedules
- Airport information
- Aircraft details
- Route statistics

#### Add to Vercel:
```
AERODATABOX_API_KEY=your_rapidapi_key
```

### OpenWeatherMap (Weather Overlays)

#### Setup:
1. **Go to:** https://openweathermap.org/api
2. **Sign up** for free account
3. **Get:** API key from dashboard
4. **Free tier:** 1,000 calls/day

#### Add to Vercel:
```
OPENWEATHER_API_KEY=your_key_here
```

### Aviation Edge (Real-time Flight Data)

#### Setup:
1. **Go to:** https://aviation-edge.com/
2. **Register** for account
3. **Plans:**
   - Free: 100 requests/month
   - Starter: $29/month
   - Developer: $199/month

#### Add to Vercel:
```
AVIATION_EDGE_KEY=your_key_here
```

---

## 5. Free Data Sources (No API Key Required)

### Public APIs You Can Use:

#### 1. **VATSIM Network** (Virtual ATC)
```
GET https://data.vatsim.net/v3/vatsim-data.json
```
- Real-time flight simulation data
- No authentication required
- Good for testing

#### 2. **ICAO Aircraft Type Designators**
```
GET https://www4.icao.int/doc8643/External/AircraftTypes
```
- Aircraft specifications
- Public database

#### 3. **OurAirports Database**
```
Download: https://ourairports.com/data/
```
- Complete airport database
- Free CSV downloads
- 74,000+ airports

---

## Cost Optimization Strategy

### Recommended Setup for Production:

| Service | Provider | Plan | Cost/Month | Purpose |
|---------|----------|------|------------|---------|
| Primary Flight Data | OpenSky | Free | $0 | Real-time tracking |
| Backup Flight Data | ADS-B Exchange | Basic | $0 | Redundancy |
| Historical Storage | Supabase | Free | $0 | 500MB storage |
| Aircraft Photos | Planespotters | Community | $0 | Photo database |
| Weather | OpenWeatherMap | Free | $0 | Weather overlays |
| **TOTAL** | | | **$0** | Full functionality |

### When to Upgrade:

1. **> 10,000 users/month** → Upgrade Supabase ($25/month)
2. **> 10,000 API calls/day** → Add FlightAware Silver ($100/month)
3. **Need airline schedules** → Add AeroDataBox ($10/month)
4. **Want premium photos** → Aviation Stack ($49/month)

---

## Implementation Priority

### Phase 1 (Now - Free):
1. ✅ OpenSky Network (already done)
2. ✅ Add ADS-B Exchange (guide provided)
3. ⏳ Setup Supabase for history
4. ⏳ Add Planespotters photos

### Phase 2 (Growth - $25/month):
1. Upgrade Supabase storage
2. Add OpenWeatherMap premium
3. Add AeroDataBox schedules

### Phase 3 (Scale - $200/month):
1. FlightAware Silver
2. Aviation Stack photos
3. Multiple region databases

---

## Quick Start Commands

### Test All APIs:
```bash
# Test FlightAware
curl -u "username:apikey" "https://flightxml.flightaware.com/json/FlightXML3/FindFlight?origin=KLAX&destination=KJFK"

# Test Supabase
curl "https://your-project.supabase.co/rest/v1/flight_history" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"

# Test AeroDataBox
curl "https://aerodatabox.p.rapidapi.com/flights/number/AA100" \
  -H "X-RapidAPI-Key: your-key"
```

---

## Support Links

- **FlightAware Support:** support@flightaware.com
- **Supabase Discord:** https://discord.supabase.com
- **Planespotters Forum:** https://www.planespotters.net/forum
- **MongoDB Community:** https://www.mongodb.com/community/forums

---

**Remember:** Start with free tiers, validate your app's growth, then scale up data sources as needed!