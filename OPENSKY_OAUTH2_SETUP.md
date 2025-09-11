# OpenSky OAuth2 Setup Guide

## ⚠️ Important: Basic Auth is Being Deprecated

OpenSky Network is moving away from basic authentication. You should migrate to OAuth2 Client Credentials Flow immediately.

## Step 1: Create API Client in OpenSky

1. Log in to your OpenSky account
2. Go to your Account page
3. Find the "API Clients" section
4. Click "Create New API Client"
5. Save your `client_id` and `client_secret` (you won't see the secret again!)

## Step 2: Add OAuth2 Credentials to Vercel

Add these new environment variables to your Vercel project:

```bash
OPENSKY_CLIENT_ID=your_client_id_here
OPENSKY_CLIENT_SECRET=your_client_secret_here
```

### To add in Vercel:
1. Go to: https://vercel.com/paul-maitlands-projects-ba42f0ad/flighttrace/settings/environment-variables
2. Add `OPENSKY_CLIENT_ID` with your client ID
3. Add `OPENSKY_CLIENT_SECRET` with your client secret
4. Make sure to select all environments (Production, Preview, Development)
5. Redeploy your application

## Step 3: Remove Old Credentials (Security)

Since your old credentials were exposed in Git history, you should:

1. **Delete the old credentials from Vercel:**
   - Remove `OPENSKY_USERNAME`
   - Remove `OPENSKY_PASSWORD`

2. **Change your OpenSky password** (just to be safe)

## How It Works

The new OAuth2 implementation (`api/lib/opensky-auth.js`):

1. **Automatic Token Management**: Requests a token using client credentials
2. **Token Caching**: Caches tokens for 25 minutes (they expire at 30)
3. **Automatic Refresh**: Gets a new token when the old one expires
4. **Fallback to Anonymous**: If OAuth2 fails, falls back to anonymous access

## Benefits of OAuth2

- ✅ **More Secure**: No passwords in environment variables
- ✅ **Higher Rate Limits**: Better than anonymous access
- ✅ **Future Proof**: Basic auth will be deprecated soon
- ✅ **Automatic Token Refresh**: No manual intervention needed

## Testing

After adding the OAuth2 credentials and redeploying:

```bash
# Check if OAuth2 is working
curl https://flightandtrace.com/api/debug

# Should show OPENSKY_CLIENT_ID as configured

# Test flights API
curl "https://flightandtrace.com/api/flights?lat=51.5074&lon=-0.1278&radius=100"

# Should show "note": "Using OAuth2 authentication"
```

## Fallback Behavior

If OAuth2 credentials are not configured or fail:
- The API automatically falls back to anonymous access
- You'll still get flight data, but with lower rate limits
- The response will show: `"note": "Using anonymous access"`

## Troubleshooting

1. **Token request fails**: Check client_id and client_secret are correct
2. **401 Unauthorized**: Token might be expired, it will auto-refresh on next request
3. **No flights showing**: Check if OpenSky API is up at https://opensky-network.org/api/states/all

## Links

- OpenSky OAuth2 Docs: https://openskynetwork.github.io/opensky-api/rest.html
- OpenSky Account Page: https://opensky-network.org/my-account
- API Status: https://opensky-network.org/api-status