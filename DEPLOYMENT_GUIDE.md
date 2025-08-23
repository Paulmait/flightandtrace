# 🚀 FlightTrace Deployment Guide - Vercel + Supabase

## Prerequisites Completed ✅
- Vercel CLI installed
- Project structure configured
- API endpoints created as Vercel Functions
- Supabase client library installed
- Database schema prepared

## Step 1: Create Supabase Project

1. **Go to [Supabase Dashboard](https://app.supabase.com)**
2. Click "New Project"
3. Enter project details:
   - Name: `flighttrace`
   - Database Password: (save this securely!)
   - Region: Choose closest to your users

4. **Wait for project to provision** (~2 minutes)

5. **Get your API keys:**
   - Go to Settings → API
   - Copy:
     - `Project URL` (starts with https://)
     - `anon public` key
     - `service_role` key (keep secret!)

## Step 2: Initialize Database

1. **Go to SQL Editor in Supabase Dashboard**
2. Click "New Query"
3. **Copy and paste** the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" to create all tables

## Step 3: Update Environment Variables

1. **Create `.env.local` file** (copy from `.env.production`):
```bash
cp .env.production .env.local
```

2. **Update with your Supabase credentials:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.YOUR-PROJECT-ID.supabase.co:5432/postgres
```

## Step 4: Deploy to Vercel

1. **Login to Vercel:**
```bash
vercel login
```

2. **Deploy the project:**
```bash
vercel --prod
```

3. **Follow the prompts:**
   - Set up and deploy: `Y`
   - Which scope: (select your account)
   - Link to existing project: `N`
   - Project name: `flighttrace`
   - Directory: `./`
   - Override settings: `N`

## Step 5: Configure Vercel Environment Variables

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. Select your `flighttrace` project
3. Go to **Settings → Environment Variables**
4. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL = [your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your-anon-key]
SUPABASE_SERVICE_KEY = [your-service-key]
DATABASE_URL = [your-database-url]
FUEL_ESTIMATES_ENABLED = true
API_RATE_LIMIT = 100
```

5. Click "Save" for each variable

## Step 6: Test Your Deployment

1. **Test health endpoint:**
```bash
curl https://flighttrace.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "flighttrace-api",
  "version": "2.0.0"
}
```

2. **Test fuel estimation:**
```bash
curl "https://flighttrace.vercel.app/api/fuel/estimate?flightId=TEST123&aircraftType=B738"
```

## Step 7: Enable Real-time Features

In Supabase Dashboard:
1. Go to **Database → Replication**
2. Enable replication for:
   - `flights` table
   - `flight_positions` table
   - `fuel_estimates` table

## Step 8: Set Up Custom Domain (Optional)

1. In Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `flighttrace.com`)
3. Follow DNS configuration instructions

## Step 9: Monitor Your App

### Vercel Dashboard shows:
- Deployment status
- Function logs
- Analytics
- Error tracking

### Supabase Dashboard shows:
- Database metrics
- API usage
- Real-time connections
- Storage usage

## Quick Commands Reference

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View logs
vercel logs

# Set environment variable
vercel env add VARIABLE_NAME

# Link local project to Vercel
vercel link

# Pull environment variables locally
vercel env pull
```

## Troubleshooting

### Issue: API returns 500 error
- Check Vercel Functions logs
- Verify environment variables are set
- Check Supabase connection

### Issue: Database connection fails
- Verify DATABASE_URL is correct
- Check Supabase project is running
- Ensure tables are created

### Issue: Real-time updates not working
- Enable replication in Supabase
- Check WebSocket connections
- Verify anon key is correct

## Production Checklist

- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Vercel deployment successful
- [ ] Health endpoint responding
- [ ] Fuel API working
- [ ] Real-time enabled
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up

## Support Links

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [FlightTrace Issues](https://github.com/your-username/flighttrace/issues)

## 🎉 Congratulations!

Your FlightTrace app is now live! Visit your deployment at:
- Preview: `https://flighttrace.vercel.app`
- Production: `https://your-custom-domain.com` (if configured)

## Next Steps

1. **Test all features** thoroughly
2. **Set up monitoring** (Sentry, LogRocket)
3. **Configure backups** in Supabase
4. **Enable authentication** for users
5. **Launch marketing** campaign!

---

**Need help?** Open an issue or contact support@flighttrace.com