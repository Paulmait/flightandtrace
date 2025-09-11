# 🚀 MANUAL DEPLOYMENT INSTRUCTIONS

## Your Vercel is Stuck on Old Code!

**Current Issue**: Vercel shows commit `dd0ac5f` from 3 days ago
**Latest Code**: We're on commit `c52bd49` with ALL features

## ✅ Quick Fix Steps:

### 1. Go to Vercel Dashboard
👉 https://vercel.com/dashboard

### 2. Find Your Project
Look for: `flightandtrace` or `flight-tracker-project`

### 3. Force New Deployment

#### Method A: Redeploy Button
1. Click on "Deployments" tab
2. Find the deployment showing "dd0ac5f"
3. Click the 3 dots menu (...)
4. Click "Redeploy"
5. Select "Use different commit"
6. Choose the latest: `master` branch

#### Method B: Create New Deployment
1. Click "Create Deployment" button (top right)
2. Select branch: `master`
3. Deploy

### 4. If Still Not Working - Git Integration Issue

Go to: **Settings → Git**

Check if you see:
- ✅ "Connected to GitHub"
- ✅ Repository: `Paulmait/flightandtrace`
- ✅ Branch: `master`

If NOT connected:
1. Click "Connect to GitHub"
2. Authorize Vercel
3. Select repository: `Paulmait/flightandtrace`
4. Import

### 5. Alternative: Deploy from Command Line

Run these commands in your project folder:

```bash
# Login to Vercel
npx vercel login

# Deploy to production
npx vercel --prod

# Follow the prompts:
# - Set up and deploy: Y
# - Which scope: (select your account)
# - Link to existing project: Y
# - Project name: flightandtrace
```

## 🔍 How to Verify It Worked:

After deployment, check:

1. **Deployments tab should show:**
   - Latest commit: `c52bd49` (not dd0ac5f)
   - Status: Ready ✅

2. **Test the API:**
   ```
   https://[your-project].vercel.app/api/test
   ```
   Should return: `{"success": true, "message": "✅ API is working correctly!"}`

## 📝 Don't Forget Environment Variables!

After new deployment, add these in Settings → Environment Variables:

```
OPENSKY_USERNAME = your_username
OPENSKY_PASSWORD = your_password
JWT_SECRET = sKJ8n4Hs9Kd82nJs8Hd7nJs9Kdm3Hs8Jdn4Ksm9Hdn3Js8Kdm4Hsn9Jdk3Msn8
```

## 🎯 Expected Result:

Once properly deployed, you'll have:
- ✅ All 10+ new commits deployed
- ✅ API endpoints working (/api/flights, /api/airports, etc.)
- ✅ 3D view, alerts, historical playback - all features
- ✅ Security fixes applied
- ✅ Production-ready application

## ⚠️ Common Issues:

**"GitHub integration not working"**
- Disconnect and reconnect GitHub in Vercel Settings

**"Build failed"**
- Check build logs for errors
- Usually missing environment variables

**"404 on API routes"**
- API files might not be in `/api` folder
- Check file structure is correct

---

Your code is ready and working! Just need to get Vercel to deploy the latest version!