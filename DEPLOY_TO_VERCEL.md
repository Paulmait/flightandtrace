# Deploying FlightTrace to Vercel with Custom Domain (flightandtrace.com)

## 1. Prerequisites
- Vercel account (https://vercel.com)
- Access to your domain registrar (where you manage DNS for flightandtrace.com)
- GitHub/GitLab/Bitbucket repo connected to Vercel (or manual upload)

## 2. Connect Your Project to Vercel
1. Go to https://vercel.com/new
2. Import your `flighttrace` repository (or upload manually)
3. Set the following environment variables in Vercel Dashboard (Settings > Environment Variables):
   - `EXPO_PUBLIC_API_URL=https://flightandtrace.com/api`
   - Any other secrets (Stripe, Sentry, etc.)
4. For a Next.js/React/Expo web app, Vercel will auto-detect and build.

## 3. Add Your Custom Domain
1. In your Vercel project dashboard, go to **Settings > Domains**
2. Click **Add** and enter `flightandtrace.com`
3. Vercel will show DNS records to add at your registrar:

### Example DNS Records
| Type | Name                | Value (example)                |
|------|---------------------|-------------------------------|
| A    | @                   | 76.76.21.21                   |
| CNAME| www                 | cname.vercel-dns.com.          |

- **A Record**: Points root domain to Vercel
- **CNAME**: Points www to Vercel

> **Note:** Use the exact values Vercel provides in your dashboard—they may differ.

## 4. Update DNS at Your Registrar
- Log in to your domain registrar (e.g., Namecheap, GoDaddy, Google Domains)
- Find DNS management for `flightandtrace.com`
- Add or update the A and CNAME records as shown above
- Remove any old conflicting A/CNAME records
- Save changes

## 5. Verify and Go Live
- In Vercel, click **Verify** after DNS changes
- Wait for DNS propagation (can take up to 30 minutes)
- Once verified, your site will be live at https://flightandtrace.com
- Vercel will auto-provision SSL (HTTPS)

## 6. Post-Launch Checklist
- [ ] Test all routes at https://flightandtrace.com
- [ ] Confirm analytics, export, and admin dashboard work
- [ ] Check SSL (lock icon in browser)
- [ ] Update any API URLs in backend/frontend to use your domain
- [ ] Set up Vercel Analytics/Monitoring if desired

## 7. Troubleshooting
- If DNS fails to verify, double-check for typos and remove old records
- Use https://dnschecker.org to check propagation
- Vercel support: https://vercel.com/support

---
**You are now ready to launch FlightTrace on Vercel with your custom domain!**
