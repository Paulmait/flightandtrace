# 🚀 FlightTrace API Setup Guide

## Quick Start - Where to Add API Keys

### 1️⃣ **Vercel Dashboard (Production)**
Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Add these keys:

```bash
# Critical APIs (Required for Launch)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG...
GA_MEASUREMENT_ID=G-...

# Optional (But Recommended)
OPENWEATHER_API_KEY=...
OPENSKY_USERNAME=...  # For more API calls
OPENSKY_PASSWORD=...  # For authenticated access
```

### 2️⃣ **Local Development (.env.local)**
Create `.env.local` file in root directory:

```bash
# Copy from .env.example and fill in your keys
cp .env.example .env.local
# Edit .env.local with your actual API keys
```

---

## 📍 API Integration Locations

### 1. **Stripe (Payment Processing)**

**Where it's used:**
- `/api/subscription.py` - Subscription management
- Lines 13-14: API key configuration
- Lines 95-180: Subscription creation
- Lines 182-260: Cancellation handling

**Setup Steps:**
1. Create account at https://stripe.com
2. Get API keys from Dashboard → Developers → API keys
3. Create products and prices in Stripe Dashboard
4. Add webhook endpoint: `https://flightandtrace.com/api/subscription/webhooks/stripe`
5. Add keys to Vercel environment variables

---

### 2. **OpenSky Network (Flight Data)**

**Where it's used:**
- `/api/flights_live.py` - Real-time flight tracking
- Lines 14-16: API configuration
- Lines 38-90: Fetching live flights
- Lines 92-150: Processing flight data

**Setup Steps:**
1. Optional: Create account at https://opensky-network.org/
2. Works without authentication (100 requests/day)
3. With authentication: 4000 requests/day
4. No API key needed for basic use!

**Integration in code:**
```python
# Already implemented in /api/flights_live.py
url = "https://opensky-network.org/api/states/all"
response = requests.get(url)  # No auth needed!
```

---

### 3. **SendGrid (Email Service)**

**Where it's used:**
- `/api/email_service.py` - Email notifications
- Lines 11-13: API configuration
- Lines 98-150: Sending emails
- Lines 16-95: Email templates

**Setup Steps:**
1. Create account at https://sendgrid.com
2. Verify your domain (flightandtrace.com)
3. Create API key: Settings → API Keys → Create
4. Add sender: Settings → Sender Authentication
5. Add key to Vercel: `SENDGRID_API_KEY=SG...`

**Alternative: Resend.com (Simpler)**
```bash
# If you prefer Resend (easier setup)
RESEND_API_KEY=re_...
# Update email_service.py to use Resend API
```

---

### 4. **OpenWeatherMap (Weather Data)**

**Where it's used:**
- `/api/weather.py` - Weather overlays
- Lines 12-13: API configuration
- Lines 20-80: Getting weather data
- Lines 120-140: Weather map tiles

**Setup Steps:**
1. Create account at https://openweathermap.org/
2. Get API key from account dashboard
3. Free tier: 1000 calls/day
4. Add to Vercel: `OPENWEATHER_API_KEY=...`

**Usage in frontend:**
```javascript
// Add weather layer to map
L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`)
```

---

### 5. **Google Analytics 4**

**Where it's added:**
- `/public/index.html` - Add to `<head>`
- `/public/live.html` - Add to `<head>`
- `/public/track.html` - Add to `<head>`
- `/public/analytics.html` - Setup guide

**Setup Steps:**
1. Create GA4 property at https://analytics.google.com
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to each HTML file's `<head>`:

```html
<!-- Add this to <head> of each HTML file -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-YOUR_ID');
</script>
```

---

## 📁 File Structure - Where Everything Lives

```
flighttrace/
├── .env.example          # Template for environment variables
├── .env.local           # Your local API keys (git ignored)
├── vercel.json          # Routes configuration ✅ Updated
├── api/
│   ├── flights_live.py  # OpenSky Network integration ✅
│   ├── subscription.py  # Stripe integration ✅
│   ├── email_service.py # SendGrid integration ✅
│   ├── weather.py       # OpenWeatherMap integration ✅
│   └── requirements.txt # Python packages ✅
└── public/
    ├── index.html       # Add GA4 code here
    ├── live.html        # Add GA4 code here
    └── track.html       # Add GA4 code here
```

---

## 🔧 Testing Your APIs

### Test OpenSky (Flight Data):
```bash
curl https://flightandtrace.com/api/flights-live/live
```

### Test Weather:
```bash
curl "https://flightandtrace.com/api/weather/current?lat=40&lon=-73"
```

### Test Email:
```bash
curl -X POST https://flightandtrace.com/api/email/test
```

### Test Subscription:
```bash
curl -X POST https://flightandtrace.com/api/subscription/status \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test"}'
```

---

## ⚡ Quick Deploy Commands

```bash
# 1. Test locally
vercel dev

# 2. Deploy to preview
vercel

# 3. Deploy to production
vercel --prod

# 4. Check logs
vercel logs --follow
```

---

## 🎯 Priority Order for Setup

### Day 1 (Critical):
1. **Stripe** - Can't take payments without it
2. **SendGrid** - Need emails for user management
3. **Google Analytics** - Start collecting data immediately

### Day 2 (Important):
4. **OpenWeatherMap** - Enhanced user experience
5. **OpenSky Auth** - More API calls if needed

### Post-Launch (Nice to have):
6. **Sentry** - Error tracking
7. **Cloudflare** - CDN and protection
8. **OneSignal** - Push notifications

---

## 🔒 Security Notes

1. **Never commit API keys to git**
   - Use `.env.local` locally
   - Use Vercel environment variables for production

2. **Rotate keys regularly**
   - Stripe: Every 90 days
   - SendGrid: Every 60 days
   - Others: Every 6 months

3. **Use test keys for development**
   - Stripe: `pk_test_...` and `sk_test_...`
   - SendGrid: Use sandbox mode

4. **Monitor usage**
   - Set up alerts for unusual API usage
   - Use Stripe's fraud protection
   - Monitor email bounce rates

---

## 💡 Pro Tips

1. **Start with free tiers:**
   - OpenSky: No auth needed (100 calls/day)
   - SendGrid: 100 emails/day free
   - OpenWeatherMap: 1000 calls/day free
   - Google Analytics: Always free

2. **Use caching:**
   - Flight data: 10-second cache (already implemented)
   - Weather: 5-minute cache (already implemented)
   - This reduces API calls significantly

3. **Test with sample data first:**
   - All APIs have fallback sample data
   - You can launch without real APIs for testing

4. **Monitor your limits:**
   - OpenSky: 100/day (anonymous) or 4000/day (auth)
   - SendGrid: Based on your plan
   - OpenWeatherMap: 1000/day (free tier)

---

## ✅ Launch Checklist

- [ ] Stripe account created
- [ ] Stripe API keys added to Vercel
- [ ] Stripe products/prices created
- [ ] SendGrid account created
- [ ] SendGrid API key added to Vercel
- [ ] Domain verified in SendGrid
- [ ] Google Analytics property created
- [ ] GA4 code added to all HTML files
- [ ] OpenWeatherMap key (optional)
- [ ] Test all APIs working
- [ ] Deploy to production

---

## 🆘 Need Help?

1. **Stripe Issues:**
   - Check webhook signatures
   - Verify price IDs match
   - Test with Stripe CLI locally

2. **Email Not Sending:**
   - Verify domain in SendGrid
   - Check spam folder
   - Use SendGrid activity feed

3. **No Flight Data:**
   - OpenSky might be down (rare)
   - Falls back to sample data automatically
   - Consider ADS-B Exchange as backup

4. **Weather Not Working:**
   - API key might be invalid
   - Free tier limit reached
   - Use sample data as fallback

---

You're ready to integrate these APIs and launch! 🚀