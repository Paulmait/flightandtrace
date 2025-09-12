# Performance Optimization Strategy for Flight & Trace

## 🎯 Current Performance Issues
- **API Response Lag**: 3-10 seconds when fetching global flight data
- **Region Switching Delay**: Noticeable lag when changing regions
- **Data Freshness**: Re-fetching all data every 30 seconds causes periodic lag

## 💡 Expert Recommendations (Best Price/Performance)

### 1. **Vercel Edge Functions + KV Storage** (RECOMMENDED) ✅
**Cost**: $0-20/month
**Implementation**: Easiest

```javascript
// api/flights-cached.js
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get('bbox') || 'global';
  
  // Try cache first (1 minute TTL)
  const cached = await kv.get(`flights:${bbox}`);
  if (cached) return Response.json(cached);
  
  // Fetch fresh data
  const data = await fetchFlightsFromOpenSky(bbox);
  
  // Cache for 60 seconds
  await kv.set(`flights:${bbox}`, data, { ex: 60 });
  
  return Response.json(data);
}
```

**Benefits**:
- Near-instant response from cache
- Automatic edge deployment (closer to users)
- Built into Vercel (no extra setup)
- Free tier includes 30k requests/month

### 2. **Cloudflare Workers + KV** (Alternative)
**Cost**: $0-5/month
**Performance**: Excellent

```javascript
// Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const cache = caches.default
  const cacheKey = new Request(request.url, request)
  
  // Check cache
  let response = await cache.match(cacheKey)
  if (response) return response
  
  // Fetch and cache
  response = await fetch('https://opensky-network.org/api/states/all')
  response = new Response(response.body, response)
  response.headers.append('Cache-Control', 'max-age=60')
  
  event.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}
```

### 3. **Supabase Realtime** (For Live Updates)
**Cost**: $0-25/month
**Best For**: Eliminating polling

```javascript
// Supabase setup for real-time flight updates
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// Store flights in Supabase
CREATE TABLE flights (
  id TEXT PRIMARY KEY,
  icao24 TEXT,
  callsign TEXT,
  position JSONB,
  last_update TIMESTAMP,
  region TEXT
);

// Real-time subscription in React
useEffect(() => {
  const subscription = supabase
    .channel('flights')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'flights' },
      (payload) => {
        updateFlights(payload.new)
      }
    )
    .subscribe()
    
  return () => subscription.unsubscribe()
}, [])
```

### 4. **Redis Cloud** (Professional Solution)
**Cost**: $0-10/month (free tier available)
**Performance**: Best

```javascript
// Using Upstash Redis (Serverless Redis)
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

// Cache with automatic expiry
await redis.setex(`flights:${region}`, 60, JSON.stringify(flightData))
const cached = await redis.get(`flights:${region}`)
```

## 🚀 Immediate Quick Wins (No Cost)

### 1. **Browser LocalStorage Caching**
```javascript
// Cache in browser
const cacheFlights = (region, data) => {
  localStorage.setItem(`flights_${region}`, JSON.stringify({
    data,
    timestamp: Date.now()
  }))
}

const getCachedFlights = (region) => {
  const cached = localStorage.getItem(`flights_${region}`)
  if (!cached) return null
  
  const { data, timestamp } = JSON.parse(cached)
  // Use cache if less than 1 minute old
  if (Date.now() - timestamp < 60000) {
    return data
  }
  return null
}
```

### 2. **Implement SWR or React Query**
```javascript
// Using SWR for intelligent caching
import useSWR from 'swr'

function useFlights(region) {
  const { data, error } = useSWR(
    `/api/flights?bbox=${region}`,
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Prevent duplicate requests
      fallbackData: getCachedFlights(region) // Use localStorage
    }
  )
  
  return { flights: data, error }
}
```

### 3. **Optimize API Calls**
```javascript
// Debounce map movements
const debouncedFetchFlights = useMemo(
  () => debounce(fetchFlights, 1000),
  [fetchFlights]
)

// Only fetch when map stops moving
map.on('moveend', debouncedFetchFlights)
```

## 📊 Recommended Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│ Vercel Edge  │────▶│  OpenSky    │
│   (SWR)     │◀────│   + KV Cache │◀────│     API     │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│ LocalStorage│     │   Supabase   │
│   Cache     │     │  (Optional)  │
└─────────────┘     └──────────────┘
```

## 💰 Cost Comparison

| Solution | Monthly Cost | Setup Time | Performance | Best For |
|----------|-------------|------------|-------------|----------|
| Vercel KV | $0-20 | 30 min | Excellent | Current setup |
| Cloudflare | $0-5 | 1 hour | Excellent | Global edge |
| Upstash Redis | $0-10 | 45 min | Best | High traffic |
| Supabase | $0-25 | 2 hours | Good | Real-time |
| LocalStorage | $0 | 15 min | Good | Quick fix |

## 🎯 Recommended Implementation Plan

### Phase 1: Immediate (Today)
1. Add LocalStorage caching
2. Implement debouncing for map movements
3. Use SWR or React Query

### Phase 2: This Week
1. Set up Vercel KV Storage
2. Create edge function for caching
3. Implement 60-second cache TTL

### Phase 3: Future (Optional)
1. Add Supabase for flight history
2. Implement WebSocket for real-time updates
3. Add predictive pre-fetching

## 📈 Expected Performance Improvements

- **Initial Load**: 5-10s → 1-2s (80% improvement)
- **Region Switch**: 3-5s → <500ms (90% improvement)
- **Map Pan/Zoom**: 2-3s → <200ms (95% improvement)
- **Cache Hit Rate**: 0% → 70-80%
- **API Calls**: Reduced by 60-70%

## 🔧 Implementation Example

```javascript
// api/flights-optimized.js
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Deploy close to users
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get('bbox') || 'global';
  const cacheKey = `flights:${bbox}`;
  
  try {
    // 1. Check cache first
    const cached = await kv.get(cacheKey);
    if (cached) {
      return Response.json({
        ...cached,
        cached: true,
        cacheAge: Date.now() - cached.timestamp
      });
    }
    
    // 2. Fetch from OpenSky
    const response = await fetch(`https://opensky-network.org/api/states/all`);
    const data = await response.json();
    
    // 3. Process and filter
    const flights = processFlights(data, bbox);
    
    // 4. Cache for 60 seconds
    const result = {
      flights,
      timestamp: Date.now(),
      count: flights.length
    };
    
    await kv.set(cacheKey, result, { ex: 60 });
    
    return Response.json({
      ...result,
      cached: false
    });
    
  } catch (error) {
    // 5. Fallback to cached data if available
    const stale = await kv.get(cacheKey);
    if (stale) {
      return Response.json({
        ...stale,
        cached: true,
        stale: true
      });
    }
    
    throw error;
  }
}
```

## ✅ Next Steps

1. **Fix UI overlap** ✓ (Already done)
2. **Add Vercel KV Storage** (Recommended first step)
3. **Implement browser caching**
4. **Add SWR for intelligent data fetching**
5. **Monitor performance with Vercel Analytics**

---

**Expert Opinion**: Start with Vercel KV Storage - it's free to start, integrates perfectly with your current setup, and will eliminate 90% of your lag issues. You don't need a new Supabase instance unless you want to store flight history or user data.