# 🚀 Production Deployment Guide

## Prerequisites Checklist

### ✅ Security Requirements
- [ ] All sensitive files removed from Git history
- [ ] All API keys and credentials rotated
- [ ] Environment variables configured in Vercel
- [ ] .gitignore properly configured
- [ ] No console.log statements in production code

### ✅ Services Setup
- [ ] Vercel account with Pro plan (recommended)
- [ ] Redis instance (Upstash or Redis Cloud)
- [ ] Supabase project created
- [ ] Stripe account with products configured
- [ ] OpenSky Network API credentials
- [ ] OpenWeatherMap API key
- [ ] SendGrid account for emails
- [ ] Sentry account for error tracking

## Step 1: Environment Configuration

### 1.1 Create Production Environment File
```bash
cp .env.example .env.production.local
```

### 1.2 Configure Vercel Environment Variables

Go to your Vercel project settings and add these environment variables:

#### Critical Variables (Required)
```
OPENSKY_USERNAME=your_actual_username
OPENSKY_PASSWORD=your_actual_password
OPENWEATHER_API_KEY=your_actual_key
JWT_SECRET=generate_64_char_random_string
REDIS_URL=redis://your-redis-url
```

#### Database & Auth
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

#### Payment Processing
```
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

#### Monitoring
```
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Step 2: Database Setup

### 2.1 Initialize Supabase Database
```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  subscription TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create flight_alerts table
CREATE TABLE flight_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  icao24 TEXT,
  alert_type TEXT,
  conditions JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create saved_flights table
CREATE TABLE saved_flights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  icao24 TEXT NOT NULL,
  flight_data JSONB,
  saved_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_alerts_user ON flight_alerts(user_id);
CREATE INDEX idx_saved_user ON saved_flights(user_id);
```

### 2.2 Enable Row Level Security
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_flights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own alerts" ON flight_alerts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own saved flights" ON saved_flights
  FOR ALL USING (auth.uid() = user_id);
```

## Step 3: Redis Cache Setup

### 3.1 Using Upstash (Recommended for Vercel)
1. Create account at https://upstash.com
2. Create Redis database
3. Copy connection string
4. Add to Vercel environment variables

### 3.2 Configure Cache Settings
```
REDIS_URL=redis://default:your_password@your-endpoint.upstash.io:port
CACHE_TTL_FLIGHTS=30
CACHE_TTL_WEATHER=300
CACHE_TTL_STATIC=3600
```

## Step 4: Stripe Configuration

### 4.1 Create Products in Stripe Dashboard

1. **Basic Plan** ($9.99/month)
   - 3 regions tracking
   - 20-second updates
   - Flight history

2. **Pro Plan** ($19.99/month)
   - 5 regions tracking
   - 10-second updates
   - Flight alerts
   - Data export

3. **Enterprise Plan** ($49.99/month)
   - 10 regions tracking
   - 5-second updates
   - API access
   - Priority support

### 4.2 Configure Webhooks
```
Endpoint URL: https://yourdomain.com/api/webhook/stripe
Events to listen:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
```

## Step 5: Build and Deploy

### 5.1 Install Dependencies
```bash
# Root directory
npm install

# Frontend
cd frontend
npm install

# Backend (if separate)
cd ../backend
npm install
```

### 5.2 Run Production Build Locally
```bash
# Test production build
cd frontend
npm run build

# Test with production environment
NODE_ENV=production npm start
```

### 5.3 Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Or connect GitHub repo for automatic deployments
```

## Step 6: Post-Deployment Configuration

### 6.1 Configure Custom Domain
1. Go to Vercel project settings
2. Add your domain (e.g., flightandtrace.com)
3. Configure DNS records as instructed
4. Enable HTTPS (automatic)

### 6.2 Set up Monitoring

#### Sentry Configuration
```javascript
// frontend/src/index.js
import * as Sentry from "@sentry/react";

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Sentry.BrowserTracing(),
    ],
    tracesSampleRate: 0.1,
  });
}
```

#### Google Analytics
```javascript
// frontend/public/index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 6.3 Enable Vercel Analytics
1. Go to project settings
2. Enable Web Analytics
3. Enable Speed Insights

## Step 7: Performance Optimization

### 7.1 Enable Caching Headers
Already configured in `vercel.json`

### 7.2 Image Optimization
```javascript
// Use Vercel Image Optimization
import Image from 'next/image';

<Image
  src="/aircraft.png"
  alt="Aircraft"
  width={500}
  height={300}
  loading="lazy"
/>
```

### 7.3 Enable Compression
```javascript
// vercel.json
{
  "functions": {
    "api/*.js": {
      "maxDuration": 10,
      "memory": 512
    }
  },
  "regions": ["iad1"], // Deploy close to your users
  "buildCommand": "npm run build:prod"
}
```

## Step 8: Testing Production

### 8.1 Functional Testing
- [ ] Flight data loads correctly
- [ ] Map displays and updates
- [ ] Authentication works
- [ ] Payment processing works
- [ ] WebSocket connections work
- [ ] Rate limiting works
- [ ] Caching works

### 8.2 Performance Testing
```bash
# Use Lighthouse
npm install -g lighthouse
lighthouse https://yourdomain.com --view

# Load testing
npm install -g artillery
artillery quick -d 60 -r 10 https://yourdomain.com/api/flights
```

### 8.3 Security Testing
```bash
# Security headers check
curl -I https://yourdomain.com

# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html
```

## Step 9: Monitoring & Maintenance

### 9.1 Set up Alerts
- Uptime monitoring (UptimeRobot, Pingdom)
- Error rate alerts in Sentry
- API quota alerts for OpenSky
- Payment failure alerts from Stripe

### 9.2 Regular Maintenance Tasks
- Weekly: Review error logs
- Monthly: Audit API usage and costs
- Monthly: Review and rotate API keys
- Quarterly: Security audit
- Quarterly: Performance review

## Step 10: Scaling Considerations

### When to Scale
- > 10,000 daily active users
- > 100 requests per second
- API rate limits being hit regularly
- Response times > 2 seconds

### Scaling Options
1. **Vercel Pro/Enterprise** - Higher limits
2. **Multiple Redis instances** - Regional caching
3. **CDN** - CloudFlare for static assets
4. **Database replication** - Read replicas
5. **Load balancing** - Multiple API endpoints

## Troubleshooting

### Common Issues

#### 1. API Rate Limiting
```javascript
// Add exponential backoff
const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
};
```

#### 2. WebSocket Connection Issues
```javascript
// Add reconnection logic
socket.on('disconnect', () => {
  setTimeout(() => {
    socket.connect();
  }, 5000);
});
```

#### 3. Cache Invalidation
```bash
# Clear Redis cache
redis-cli FLUSHDB

# Or programmatically
await cacheManager.clearPattern('flights:*');
```

## Launch Checklist

### Pre-Launch (1 week before)
- [ ] All environment variables set
- [ ] Database migrations complete
- [ ] Stripe products configured
- [ ] Domain DNS configured
- [ ] SSL certificate active
- [ ] Monitoring tools connected
- [ ] Load testing completed
- [ ] Security audit passed

### Launch Day
- [ ] Deploy to production
- [ ] Verify all services connected
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Announce launch

### Post-Launch (First week)
- [ ] Monitor user feedback
- [ ] Track conversion rates
- [ ] Review error logs daily
- [ ] Optimize based on metrics
- [ ] Address critical bugs immediately

## Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Upstash Support**: support@upstash.com
- **Stripe Support**: https://support.stripe.com
- **OpenSky Network**: https://opensky-network.org/contact

---

## Quick Deploy Commands

```bash
# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Rollback if needed
vercel rollback

# Set environment variable
vercel env add VARIABLE_NAME
```

## Estimated Costs (Monthly)

- **Vercel Pro**: $20
- **Upstash Redis**: $10 (pay as you go)
- **Supabase**: $25 (Pro plan)
- **SendGrid**: $15 (Essentials)
- **Domain**: $15/year
- **Total**: ~$70/month + API usage

---

**Last Updated**: ${new Date().toISOString()}
**Version**: 1.0.0
**Status**: READY FOR DEPLOYMENT