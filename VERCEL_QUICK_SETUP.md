# ⚡ QUICK VERCEL SETUP - DO THIS NOW!

## 🔴 IMMEDIATE ACTIONS (5 minutes)

### 1. Go to Vercel Dashboard
👉 https://vercel.com/dashboard

### 2. Click on your project: `flightandtrace`

### 3. Go to: Settings → Environment Variables

### 4. Add These Variables NOW:

#### Copy & Paste These Exactly:

```
Variable: OPENSKY_USERNAME
Value: [your OpenSky username - get free account at https://opensky-network.org/register]
```

```
Variable: OPENSKY_PASSWORD  
Value: [your OpenSky password]
```

```
Variable: JWT_SECRET
Value: sKJ8n4Hs9Kd82nJs8Hd7nJs9Kdm3Hs8Jdn4Ksm9Hdn3Js8Kdm4Hsn9Jdk3Msn8
```

```
Variable: SESSION_SECRET
Value: pLm9Ks8Hdn3Js9Kdm4Hsn8Jdk3Msn9Hdk4Jsn8Kdm3Hsn9Jdk4Msn8Hdk3Jsn9
```

```
Variable: INTERNAL_API_KEY
Value: xKs8Hdn3Js9Kdm4Hsn8Jdk3Msn9Hdk4
```

### 5. After Adding Variables:
1. Click "Save" for each variable
2. Go to "Deployments" tab
3. Click on latest deployment
4. Click "..." menu → "Redeploy"
5. Click "Redeploy" button

### 6. Test Your Deployment (after 2 minutes):

Open these URLs in your browser:

1. **Test API**: https://flightandtrace.vercel.app/api/test
   - Should show: `{"success": true, "message": "✅ API is working correctly!"}`

2. **Flight Data**: https://flightandtrace.vercel.app/api/flights
   - Should show: Flight data JSON

3. **Main App**: https://flightandtrace.vercel.app
   - Should show: Map with flights

## ✅ If Working, You'll See:
- API test returns success ✓
- Flights API returns data ✓
- Map shows aircraft ✓

## ❌ If Not Working:

### Check Build Logs:
1. Go to Deployments tab
2. Click on latest deployment
3. Check for ❌ red errors
4. Common issues:
   - Missing dependencies
   - Build errors
   - Function errors

### Quick Fix:
```bash
# From your local terminal:
git add .
git commit -m "Force rebuild"
git push origin master
```

## 🎯 Optional But Recommended:

### Add Redis for Caching (Free):
1. Go to: https://upstash.com
2. Create free account
3. Create Redis database
4. Copy `REDIS_URL` to Vercel

### Add Weather (Free):
1. Go to: https://openweathermap.org/api
2. Create free account
3. Get API key
4. Add as `OPENWEATHER_API_KEY` in Vercel

## 📱 Your Live URLs:

- **Main App**: https://flightandtrace.vercel.app
- **API Test**: https://flightandtrace.vercel.app/api/test
- **Flights**: https://flightandtrace.vercel.app/api/flights
- **Airports**: https://flightandtrace.vercel.app/api/airports?code=KJFK
- **Aircraft**: https://flightandtrace.vercel.app/api/aircraft-database?icao24=4b1805

## 🧪 Test Everything:

Run this command to test all APIs:
```bash
node test-backend.js https://flightandtrace.vercel.app
```

---

**That's it! Your app should be live in 5 minutes!** 🚀