#!/bin/bash

# CRITICAL SECURITY SCRIPT: Remove sensitive files from Git history
# WARNING: This will rewrite Git history. Make a backup first!

echo "🔒 Git History Security Cleanup Script"
echo "======================================"
echo ""
echo "⚠️  WARNING: This script will rewrite Git history!"
echo "⚠️  Make sure you have a backup of your repository!"
echo ""
read -p "Have you created a backup? (yes/no): " backup_confirm

if [ "$backup_confirm" != "yes" ]; then
    echo "❌ Please create a backup first:"
    echo "   git clone --mirror . ../flight-tracker-backup"
    exit 1
fi

echo ""
echo "📋 Files to remove from history:"
echo "  - frontend/.env"
echo "  - backend/.env"
echo "  - All .env files"
echo "  - Firebase service account files"
echo ""
read -p "Continue with cleanup? (yes/no): " continue_confirm

if [ "$continue_confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "🧹 Starting cleanup..."

# Remove .env files from Git tracking
echo "→ Removing .env files from tracking..."
git rm --cached frontend/.env 2>/dev/null || true
git rm --cached backend/.env 2>/dev/null || true
git rm --cached .env 2>/dev/null || true
git rm --cached .env.* 2>/dev/null || true

# Add .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo "→ Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Environment files - NEVER COMMIT
.env
.env.*
!.env.example
*.env

# Sensitive files
firebaseServiceAccount.json
serviceAccountKey.json
**/config/secrets.js
**/config/keys.js

# Dependencies
node_modules/
**/node_modules/

# Logs
*.log
logs/

# Build
build/
dist/
.next/
out/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Firebase
.firebase/
firebase-debug.log

# Vercel
.vercel/
EOF
fi

echo "→ Committing .gitignore..."
git add .gitignore
git commit -m "Add .gitignore to prevent committing sensitive files" 2>/dev/null || true

echo ""
echo "🔧 Removing sensitive files from Git history..."
echo "This may take a while for large repositories..."

# Use git filter-branch to remove files from history
# Note: git filter-repo is preferred if available
if command -v git-filter-repo &> /dev/null; then
    echo "→ Using git-filter-repo (recommended)..."
    git filter-repo --path frontend/.env --invert-paths --force
    git filter-repo --path backend/.env --invert-paths --force
    git filter-repo --path .env --invert-paths --force
    git filter-repo --path firebaseServiceAccount.json --invert-paths --force
else
    echo "→ Using git filter-branch (slower)..."
    git filter-branch --force --index-filter \
        'git rm --cached --ignore-unmatch frontend/.env backend/.env .env .env.* firebaseServiceAccount.json' \
        --prune-empty --tag-name-filter cat -- --all
fi

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "📌 IMPORTANT NEXT STEPS:"
echo "1. Force push to remote (will break other clones):"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "2. Rotate ALL exposed credentials immediately:"
echo "   - Firebase API keys"
echo "   - OpenSky credentials"
echo "   - Stripe API keys"
echo "   - OpenWeather API key"
echo "   - Any other exposed keys"
echo ""
echo "3. Tell all team members to re-clone the repository:"
echo "   git clone https://github.com/yourusername/flight-tracker-project"
echo ""
echo "4. Set up environment variables properly:"
echo "   - Use Vercel environment variables for production"
echo "   - Create .env.local for local development"
echo "   - Never commit .env files again"
echo ""
echo "5. Consider using git-secrets to prevent future leaks:"
echo "   https://github.com/awslabs/git-secrets"
echo ""
echo "🔒 Security cleanup complete!"