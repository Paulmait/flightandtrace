# ✈️ ADS-B Exchange API Setup Guide

## What is ADS-B Exchange?
ADS-B Exchange is a community-driven flight tracking data source that provides real-time aircraft position data. It's an excellent backup to OpenSky Network and provides additional coverage.

## Step-by-Step Setup (via RapidAPI)

### 1. Create RapidAPI Account

1. **Go to:** https://rapidapi.com/auth/sign-up
2. **Sign up** with email, Google, or GitHub
3. **Verify** your email if required

### 2. Subscribe to ADS-B Exchange API

1. **Go to:** https://rapidapi.com/adsbexchange/api/adsbexchange-com1
2. **Click:** "Subscribe to Test" button
3. **Choose Plan:**
   - **Basic (FREE)** - 10,000 requests/month
   - **Pro ($10/month)** - 100,000 requests/month
   - **Ultra ($25/month)** - 500,000 requests/month
   
   **Start with Basic (FREE) plan** - it's perfect for testing and light usage

4. **Click:** "Subscribe" on the Basic plan

### 3. Get Your API Key

1. **After subscribing**, you'll see a section called "Header Parameters"
2. **Look for:** `X-RapidAPI-Key`
3. **Copy the API key** - it looks like:
   ```
   a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

### 4. Test Your API Key (Optional)

On the RapidAPI page, there's a "Test Endpoint" section:

1. **Select:** "Code Snippets" tab
2. **Choose:** "cURL" or your preferred language
3. **Click:** "Test Endpoint"
4. **Check:** You should see flight data in the response

### 5. Add API Key to Vercel

1. **Go to:** https://vercel.com/paul-maitlands-projects-ba42f0ad/flighttrace/settings/environment-variables
2. **Click:** "Add New"
3. **Add this variable:**
   ```
   Name: ADSB_EXCHANGE_API_KEY
   Value: [paste your API key here]
   ```
4. **Select all environments:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. **Click:** "Save"

### 6. Redeploy Your Application

1. **Go to:** Vercel Dashboard > Deployments
2. **Click:** Three dots on latest deployment
3. **Select:** "Redeploy"
4. **Wait:** 2-3 minutes for deployment

### 7. Verify It's Working

1. **Check Health Endpoint:**
   ```
   https://flightandtrace.com/api/health
   ```
   Look for `adsb.enabled: true` in the response

2. **Monitor in Dashboard:**
   - Go to RapidAPI Dashboard
   - Check "Analytics" to see API usage

## What ADS-B Exchange Provides

**Data Coverage:**
- ✅ **Global Coverage** - Worldwide flight data
- ✅ **Military Aircraft** - Some military flights not on OpenSky
- ✅ **General Aviation** - Small aircraft, helicopters
- ✅ **Real-time Updates** - 1-2 second latency
- ✅ **Historical Tracks** - Past position data
- ✅ **Aircraft Details** - Registration, type, operator

**API Endpoints Available:**
- `/v2/lat/{lat}/lon/{lon}/dist/{distance}` - Area search (what we use)
- `/v2/hex/{icao24}` - Specific aircraft
- `/v2/callsign/{callsign}` - By flight number
- `/v2/registration/{reg}` - By registration

## Understanding Rate Limits

**Basic Plan (FREE):**
- 10,000 requests/month
- ~333 requests/day
- ~14 requests/hour

**How Flight and Trace Uses It:**
- Primary source: OpenSky Network (anonymous/free)
- ADS-B Exchange: Backup when OpenSky fails
- Estimated usage: 2,000-3,000 requests/month
- **You should be fine with the free tier!**

## Cost-Benefit Analysis

| Plan | Cost | Requests | Good For |
|------|------|----------|----------|
| Basic | FREE | 10K/month | Testing, backup data source |
| Pro | $10/mo | 100K/month | Primary data source for small app |
| Ultra | $25/mo | 500K/month | High-traffic production app |

**Recommendation:** Start with FREE, upgrade only if you exceed limits.

## Advanced Configuration (Optional)

To optimize ADS-B Exchange usage, you can:

1. **Enable Caching** - Already implemented in your app
2. **Set Priority** - Use OpenSky first, ADS-B as fallback
3. **Geographic Filtering** - Only query specific regions
4. **Time-based Rules** - Use during peak hours only

## Troubleshooting

**API Key Not Working?**
- Check if you're subscribed to the API
- Verify key is correctly copied (no spaces)
- Ensure environment variable is added to Vercel
- Check RapidAPI dashboard for any account issues

**Rate Limit Exceeded?**
- Check RapidAPI Analytics for usage
- Implement better caching
- Consider upgrading plan
- Reduce query frequency

**No Data Returned?**
- Verify the area has flight coverage
- Check if filters are too restrictive
- Test with larger radius
- Confirm API endpoint is correct

## Alternative Data Sources

If you need more data sources:

1. **FlightAware** - Premium, expensive but comprehensive
2. **Flightradar24** - No official API
3. **OpenSky Network** - Already integrated (primary source)
4. **FlightStats** - Good for airline schedules
5. **Aviation Edge** - Affordable alternative

## Support

- **RapidAPI Support:** https://rapidapi.com/support
- **ADS-B Exchange:** https://www.adsbexchange.com/
- **Community Forum:** https://www.adsbexchange.com/forum/

## Next Steps

After setup:
1. **Monitor Usage** - Check RapidAPI dashboard weekly
2. **Optimize Queries** - Use caching effectively
3. **Set Alerts** - Get notified before hitting limits
4. **Consider Contributing** - Feed data to ADS-B Exchange for credits

---

**Pro Tip:** ADS-B Exchange has the best coverage for military and general aviation aircraft. It's particularly strong in areas where OpenSky has gaps!