# 🔍 Sentry Setup Guide for Flight and Trace

## What is Sentry?
Sentry is an error tracking and performance monitoring platform that helps you identify and fix crashes in real-time. It's essential for production applications.

## Step-by-Step Setup

### 1. Create a Free Sentry Account

1. **Go to:** https://sentry.io/signup/
2. **Sign up** with your email or GitHub account
3. **Verify** your email address

### 2. Create Your First Project

1. **After login**, you'll see "Create Project"
2. **Select Platform:** Choose **React** (for frontend)
3. **Set Alert Frequency:** Choose "Alert me on every new issue"
4. **Project Name:** Enter `flight-and-trace`
5. **Team:** Select your default team or create new
6. **Click:** "Create Project"

### 3. Get Your DSN (Data Source Name)

After creating the project, you'll see a setup page with code snippets.

1. **Look for the DSN** - it looks like this:
   ```
   https://1234567890abcdef@o123456.ingest.sentry.io/1234567
   ```

2. **Copy the entire DSN URL**

### 4. Add DSN to Vercel

1. **Go to:** https://vercel.com/paul-maitlands-projects-ba42f0ad/flighttrace/settings/environment-variables
2. **Click:** "Add New"
3. **Add this variable:**
   ```
   Name: REACT_APP_SENTRY_DSN
   Value: [paste your DSN here]
   ```
4. **Select all environments:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. **Click:** "Save"

### 5. Configure Sentry Settings (Optional but Recommended)

1. **Go to Project Settings** in Sentry dashboard
2. **Configure these settings:**

   **Performance:**
   - Enable Performance Monitoring
   - Set sample rate to 10% for production

   **Alerts:**
   - Set up alert rules for:
     - Error rate spike
     - New issues
     - Performance degradation

   **Integrations:**
   - Connect GitHub (for better stack traces)
   - Add Slack/Email notifications

### 6. Verify Installation

After redeploying your app:

1. **Go to Sentry Dashboard**
2. **Check "Issues" tab** - you should see any errors
3. **Check "Performance" tab** - you should see transactions
4. **Test by triggering an error** (optional):
   - Add `?test=error` to your URL
   - This will trigger a test error

## What Sentry Will Track

Once configured, Sentry will automatically track:

- ✅ **JavaScript Errors** - Uncaught exceptions, promise rejections
- ✅ **API Errors** - Failed network requests
- ✅ **Performance Issues** - Slow page loads, API calls
- ✅ **User Sessions** - Crash-free rate
- ✅ **Release Tracking** - Which version has issues
- ✅ **User Context** - Which users are affected

## Pricing

**Free Tier Includes:**
- 5,000 errors/month
- 10,000 performance events
- 1 team member
- 30-day data retention

This is MORE than enough for starting out. You can upgrade later if needed.

## Best Practices

1. **Don't log sensitive data** - The app is already configured to filter out passwords, API keys
2. **Use environment-specific DSNs** - Different projects for staging/production
3. **Set up alerts** - Get notified of critical errors immediately
4. **Review weekly** - Check for recurring issues

## Troubleshooting

**Sentry not receiving events?**
- Check if DSN is correctly added to Vercel
- Ensure you redeployed after adding the environment variable
- Check browser console for Sentry initialization messages

**Too many events?**
- Adjust `tracesSampleRate` in `/frontend/src/utils/sentry.js`
- Add more items to `ignoreErrors` array

## Next Steps

After setup:
1. **Test in production** - Sentry works best with real user data
2. **Set up source maps** - For better error stack traces
3. **Configure user feedback** - Let users report issues
4. **Add custom breadcrumbs** - Track user actions before errors

## Support

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Discord:** https://discord.gg/sentry
- **Status Page:** https://status.sentry.io/

---

**Remember:** Sentry is your "black box recorder" for production. It's the first place to look when users report issues!