# ✅ FILES TO DELETE - CONFIRMED

## 🔴 DELETE THESE FILES NOW:

### 1. Environment File (NOT NEEDED)
```bash
.env.production    # ✓ EXISTS - DELETE THIS
```
**Reason:** Production environment variables should be in Vercel Dashboard, not in a file.

### 2. Duplicate Subscription File
```bash
backend/subscription.py    # ✓ EXISTS - DELETE THIS
```
**Reason:** Old version. The correct version is `api/subscription.py` (25KB vs 1.7KB).

### 3. Mobile App Setup (Not needed for web)
```bash
EXPO_SETUP.md    # ✓ EXISTS - DELETE THIS (optional)
```
**Reason:** Only needed if building React Native mobile app.

## ✅ COMMANDS TO DELETE THEM:

### Windows (Command Prompt):
```cmd
del .env.production
del backend\subscription.py
del EXPO_SETUP.md
```

### Windows (PowerShell) or Git Bash:
```bash
rm .env.production
rm backend/subscription.py
rm EXPO_SETUP.md
```

## 📝 FILES THAT DON'T EXIST (Already gone):
These were mentioned in guides but don't exist:
- ❌ DOMAIN_SETUP_GUIDE.md (doesn't exist)
- ❌ GODADDY_DNS_SETUP.md (doesn't exist)
- ❌ DEPLOYMENT.md (doesn't exist)
- ❌ DEPLOYMENT_GUIDE.md (doesn't exist)

## ✅ FILES TO KEEP:
- ✅ DEPLOY_TO_VERCEL.md (keep - useful guide)
- ✅ DEPLOYMENT_SECURITY.md (keep - security reference)
- ✅ .env.example (keep - template for others)
- ✅ api/subscription.py (keep - correct version)

## 🎯 FINAL CONFIRMATION:

**DELETE these 3 files:**
1. `.env.production` - Use Vercel Dashboard instead
2. `backend/subscription.py` - Duplicate of api/subscription.py
3. `EXPO_SETUP.md` - Only for mobile app (optional)

**After deletion, you'll have:**
- ✅ Clean codebase
- ✅ No confusion about which files to use
- ✅ No risk of committing production keys
- ✅ Single source of truth for each function

## 🚀 DELETE COMMAND (All at once):

### Windows:
```cmd
del .env.production backend\subscription.py EXPO_SETUP.md
```

### Linux/Mac/Git Bash:
```bash
rm .env.production backend/subscription.py EXPO_SETUP.md
```

## ⚠️ IMPORTANT REMINDER:
After deleting `.env.production`, make sure your production API keys are in:
**Vercel Dashboard → Settings → Environment Variables**

That's the ONLY place production keys should be!