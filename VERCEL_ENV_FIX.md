# 🚨 CRITICAL: Environment Variables NOT Loading!

## The Problem
Your environment variables are added in Vercel but NOT reaching the API functions. The debug endpoint shows 0 out of 14 variables are detected.

## How to Fix This NOW

### Step 1: Check Environment Variable Scope

1. Go to: https://vercel.com/paul-maitlands-projects-ba42f0ad/flight-tracker-project/settings/environment-variables

2. For EACH variable, make sure you have selected ALL environments:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

3. If any show only "Production", click "Edit" and check all three boxes

### Step 2: Force Full Rebuild

After checking all variables have all environments selected:

1. Go to Deployments tab
2. Click on latest deployment
3. Click ⋮ (three dots)
4. Click "Redeploy"
5. **IMPORTANT**: UNCHECK "Use existing Build Cache"
6. Click "Redeploy"

This forces a complete rebuild with fresh environment variables.

### Step 3: Alternative - Manual Redeploy via CLI

If Step 2 doesn't work, try from command line:

```bash
# In your project directory
npx vercel env pull .env.local
```

This will show you which variables Vercel has. If the file is empty or missing your variables, that's the problem.

### Step 4: If Variables Still Don't Load

Try re-adding one variable as a test:

1. Delete OPENSKY_USERNAME from Vercel
2. Re-add it with value
3. Make sure all 3 environments are checked
4. Redeploy without cache

### Common Issues & Solutions

**Issue: Variables only set for Production**
- Solution: Edit each variable and check Preview + Development boxes

**Issue: Variables were added after deployment**  
- Solution: Must redeploy without cache after adding variables

**Issue: Variable names have typos**
- Solution: Check exact spelling (case-sensitive)

**Issue: Project linked to wrong Vercel project**
- Solution: Check `.vercel/project.json` has correct projectId

## Quick Test After Fix

```bash
# Test debug endpoint
curl https://flight-tracker-project.vercel.app/api/debug

# Should show "configured": 14 (or at least more than 0)
```

## What Variables Should Be Set

Critical (must have):
- OPENSKY_USERNAME
- OPENSKY_PASSWORD
- JWT_SECRET
- SESSION_SECRET
- INTERNAL_API_KEY

Important:
- OPENWEATHER_API_KEY
- FLIGHTTRACE_STRIPE_SECRET_KEY
- FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY

## If Nothing Works

As a last resort, you can hardcode a test to verify the API works:

1. Temporarily set in code (ONLY for testing):
```javascript
// In api/flights.js - REMOVE AFTER TESTING
const username = process.env.OPENSKY_USERNAME || 'your_actual_username';
const password = process.env.OPENSKY_PASSWORD || 'your_actual_password';
```

2. Deploy and test
3. If it works, the issue is definitely environment variables
4. REMOVE the hardcoded values immediately

---

**The issue is 100% that environment variables aren't reaching your functions. Follow the steps above to fix it.**