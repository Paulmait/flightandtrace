# 🚀 Production Launch Checklist

## Phase 1: Minimum Viable Product (1-2 days)
- [ ] Get MapTiler API key (free tier)
- [ ] Get OpenSky Network credentials (free)
- [ ] Set up Supabase project (free tier)
- [ ] Add all environment variables to Vercel
- [ ] Deploy backend API functions
- [ ] Test live flight data loading
- [ ] Add basic error handling

## Phase 2: Enhanced UX (3-5 days)
- [ ] Implement flight search
- [ ] Add flight details panel
- [ ] Create loading states
- [ ] Mobile responsive fixes
- [ ] Add flight filters
- [ ] Implement auto-refresh (30 seconds)

## Phase 3: Production Ready (1 week)
- [ ] Custom domain setup
- [ ] Analytics integration
- [ ] Error tracking (Sentry)
- [ ] Performance optimization
- [ ] Legal pages (Privacy, Terms)
- [ ] Social sharing meta tags

## Required Services & Costs

### Free Tier Options
- **Vercel Hosting**: Free (Hobby)
- **MapTiler**: Free (100k tiles/month)
- **OpenSky Network**: Free (limited requests)
- **Supabase**: Free (50k MAU)
- **Total**: $0/month

### Professional Setup
- **Vercel Pro**: $20/month
- **MapTiler**: $25/month
- **ADS-B Exchange**: $10/month
- **Supabase Pro**: $25/month
- **Domain**: $12/year
- **Total**: ~$80/month

## Environment Variables Template

```env
# Add these to Vercel Dashboard → Settings → Environment Variables

# Map Provider (Choose one)
REACT_APP_MAPTILER_KEY=get_from_maptiler.com
# OR
REACT_APP_MAPBOX_TOKEN=get_from_mapbox.com

# Flight Data (At least one required)
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
# OR
ADSB_EXCHANGE_API_KEY=get_from_rapidapi.com

# Database & Auth (Required for full features)
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# Backend API (If separate deployment)
REACT_APP_API_URL=https://your-api.vercel.app/api

# Optional but Recommended
REACT_APP_GOOGLE_ANALYTICS_ID=G-XXXXXX
REACT_APP_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

## Quick Setup Commands

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link to your project
vercel link

# 3. Add environment variables
vercel env add REACT_APP_MAPTILER_KEY

# 4. Deploy
vercel --prod
```

## API Setup Instructions

### MapTiler
1. Go to https://www.maptiler.com/
2. Sign up for free account
3. Go to Account → Keys
4. Copy your default key
5. Add to Vercel as REACT_APP_MAPTILER_KEY

### OpenSky Network
1. Go to https://opensky-network.org/register
2. Create free account
3. Verify email
4. Use username/password in env vars

### Supabase
1. Go to https://supabase.com/
2. Create new project
3. Go to Settings → API
4. Copy URL and anon key
5. Add both to Vercel env vars

## Testing Production Features

After adding environment variables:

1. **Test Map Tiles**: Map should show detailed streets
2. **Test Flight Data**: Real flights should appear
3. **Test Authentication**: Login/signup should work
4. **Test Search**: Flight search should return results
5. **Test Mobile**: Check responsive design

## Support & Documentation

- **Vercel Docs**: https://vercel.com/docs
- **MapLibre GL**: https://maplibre.org/maplibre-gl-js-docs/
- **OpenSky API**: https://openskynetwork.github.io/opensky-api/
- **Supabase Docs**: https://supabase.com/docs

## Contact for Help

If you need assistance with setup:
- Open issue on GitHub
- Check Vercel deployment logs
- Review browser console for errors

---

Ready to launch! 🚀 Start with Phase 1 and you'll have a working flight tracker in 1-2 days.