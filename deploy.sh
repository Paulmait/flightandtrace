#!/bin/bash

echo "🚀 Deploying Flight Tracker to Vercel"
echo "===================================="
echo ""

# Check if we're on the right branch
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"

# Check latest commit
LATEST_COMMIT=$(git rev-parse --short HEAD)
echo "Latest commit: $LATEST_COMMIT"
echo ""

# Show what will be deployed
echo "📦 Features being deployed:"
echo "✅ Live flight tracking"
echo "✅ 3D view (Cesium.js)"
echo "✅ Historical playback"
echo "✅ Flight alerts"
echo "✅ Aircraft database"
echo "✅ Airport information"
echo "✅ WebSocket real-time updates"
echo "✅ Redis caching"
echo "✅ Security fixes"
echo ""

# Deploy to Vercel
echo "🔧 Starting deployment..."
echo ""
echo "Running: npx vercel --prod"
echo ""

npx vercel --prod

echo ""
echo "===================================="
echo "✅ Deployment command executed!"
echo ""
echo "📝 Next steps:"
echo "1. Check deployment status in Vercel dashboard"
echo "2. Add environment variables if not set:"
echo "   - OPENSKY_USERNAME"
echo "   - OPENSKY_PASSWORD"
echo "   - JWT_SECRET"
echo ""
echo "3. Test your API:"
echo "   curl https://[your-project].vercel.app/api/test"
echo ""
echo "===================================="