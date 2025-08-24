# 🌐 FlightTrace Domain Setup Guide - GoDaddy to Vercel

## Your Current Deployment
✅ **Production URL**: https://flighttrace-c5c4jsqz3-paul-maitlands-projects-ba42f0ad.vercel.app

## Step 1: Add Custom Domain to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/paul-maitlands-projects-ba42f0ad/flighttrace
   - Click on "Settings" tab
   - Select "Domains" from left sidebar

2. **Add Your Domain**
   - Click "Add Domain"
   - Enter your domain (e.g., `flighttrace.com` or `app.flighttrace.com`)
   - Click "Add"

3. **Vercel will show you DNS records to add** - Save these!

## Step 2: Configure GoDaddy DNS

### For Root Domain (flighttrace.com)

1. **Login to GoDaddy**
   - Go to: https://dcc.godaddy.com/domains/
   - Find your domain
   - Click "DNS" or "Manage DNS"

2. **Add/Update A Records**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 600 (or 1 hour)
   ```

3. **Add CNAME for www**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 600 (or 1 hour)
   ```

### For Subdomain (app.flighttrace.com)

1. **Add CNAME Record**
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   TTL: 600 (or 1 hour)
   ```

## Step 3: Remove Conflicting Records

**IMPORTANT**: In GoDaddy DNS settings, remove or update:
- Any existing A records for @ that don't point to Vercel
- Any CNAME records for www or your subdomain
- GoDaddy's default parking page records

## Step 4: Verify in Vercel

1. **Return to Vercel Dashboard**
2. Your domain should show "Valid Configuration" ✅
3. SSL certificate will auto-provision (may take 10-20 minutes)

## Step 5: DNS Propagation

DNS changes take time to propagate:
- **Typical**: 5-30 minutes
- **Maximum**: Up to 48 hours (rare)

Check propagation status:
- https://www.whatsmydns.net/
- Enter your domain
- Look for green checkmarks globally

## Quick Copy-Paste for GoDaddy

### Option A: Root Domain Setup
```
DELETE all existing A records for @
ADD A record: @ → 76.76.21.21
ADD CNAME: www → cname.vercel-dns.com
```

### Option B: Subdomain Setup (Recommended)
```
ADD CNAME: app → cname.vercel-dns.com
```

## Troubleshooting

### "Invalid Configuration" in Vercel?
- Double-check DNS records in GoDaddy
- Ensure no conflicting records exist
- Wait 10-15 minutes and refresh

### SSL Certificate Not Working?
- Vercel auto-provisions Let's Encrypt certificates
- Can take up to 20 minutes after domain verification
- Check: Settings → Domains → Should show "SSL: Enabled"

### Site Not Loading?
1. Clear browser cache
2. Try incognito/private browsing
3. Check DNS propagation: https://dnschecker.org
4. Verify records in GoDaddy match exactly

## Recommended Configuration

For production, we recommend:
```
flighttrace.com → Marketing/landing page
app.flighttrace.com → Your React Native Web app (this deployment)
api.flighttrace.com → API endpoints
```

## GoDaddy DNS Management Direct Links

1. **Login**: https://sso.godaddy.com
2. **My Products**: https://account.godaddy.com/products
3. **DNS Management**: Click "DNS" next to your domain

## Command to Add Domain via CLI

```bash
vercel domains add flighttrace.com
```

## Expected Final Result

✅ https://flighttrace.com → Your app
✅ https://www.flighttrace.com → Your app
✅ https://app.flighttrace.com → Your app (if using subdomain)
✅ Automatic SSL certificates
✅ Global CDN distribution
✅ Instant deployments on git push

## Support

- **Vercel Support**: https://vercel.com/support
- **GoDaddy Support**: https://www.godaddy.com/help
- **DNS Checker**: https://mxtoolbox.com/dnscheck.aspx

---

**Note**: After setup, your site will be available at your custom domain instead of the Vercel URL!