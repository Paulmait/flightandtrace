# 🎯 GoDaddy DNS Setup for flightandtrace.com

## Your Domain: **flightandtrace.com**
## Your Vercel App: **https://flighttrace.vercel.app**

---

## 📋 **EXACT DNS Records to Add in GoDaddy**

### Step 1: Login to GoDaddy
1. Go to: https://dcc.godaddy.com/domains/
2. Find **flightandtrace.com**
3. Click **"DNS"** or **"Manage DNS"**

### Step 2: DELETE These Records First
⚠️ **IMPORTANT**: Remove these if they exist:
- Any A record with Name "@" pointing to GoDaddy parking IPs (like 34.102.136.180)
- Any CNAME record for "www" pointing to parkingpage.godaddy.com
- Any forwarding rules

### Step 3: ADD These New Records

#### **Record 1: Root Domain A Record**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600 seconds (or select "10 minutes" / "1 Hour")
```

#### **Record 2: WWW CNAME Record**
```
Type: CNAME  
Name: www
Value: cname.vercel-dns.com
TTL: 600 seconds (or select "10 minutes" / "1 Hour")
```

#### **Record 3: (Optional) App Subdomain**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: 600 seconds (or select "10 minutes" / "1 Hour")
```

---

## 🖱️ **Step-by-Step in GoDaddy Interface**

### Adding A Record:
1. Click **"ADD"** button
2. Select **Type: "A"**
3. In **"Name"** field: Enter **@** (just the @ symbol)
4. In **"Value"** field: Enter **76.76.21.21**
5. Set **TTL** to **600 seconds** or **1 Hour**
6. Click **"Save"**

### Adding CNAME for WWW:
1. Click **"ADD"** button
2. Select **Type: "CNAME"**
3. In **"Name"** field: Enter **www**
4. In **"Points to"** field: Enter **cname.vercel-dns.com**
5. Set **TTL** to **600 seconds** or **1 Hour**
6. Click **"Save"**

---

## ✅ **After DNS Setup - Verify in Vercel**

1. Go to: https://vercel.com/paul-maitlands-projects-ba42f0ad/flighttrace/settings/domains
2. You should see **flightandtrace.com** with status checking
3. Wait 5-15 minutes for verification
4. Status will change to ✅ **"Valid Configuration"**
5. SSL certificate will auto-provision

---

## 🌐 **Your URLs After Setup**

Once DNS propagates (5-30 minutes), your app will be available at:

✅ **https://flightandtrace.com** - Main URL  
✅ **https://www.flightandtrace.com** - WWW version  
✅ **https://app.flightandtrace.com** - App subdomain (if you added it)

---

## 🔍 **Check DNS Propagation**

Use these tools to verify your DNS changes:
1. https://dnschecker.org/#A/flightandtrace.com
2. https://www.whatsmydns.net/#A/flightandtrace.com

Look for **76.76.21.21** showing up globally

---

## ⚡ **Quick Copy-Paste Summary**

**In GoDaddy DNS Management:**

1. **DELETE** all existing A records for @
2. **ADD** these:
   - A Record: @ → 76.76.21.21
   - CNAME: www → cname.vercel-dns.com

---

## 🚨 **Troubleshooting**

### If site doesn't load after 30 minutes:
1. **Check GoDaddy DNS** - Ensure records are exactly as above
2. **Clear browser cache** - Or try incognito mode
3. **Check Vercel Dashboard** - Look for domain verification status
4. **DNS Propagation** - Some ISPs take up to 4 hours

### Common Issues:
- **"Parking page still showing"** → You didn't delete the old A records
- **"Invalid configuration in Vercel"** → DNS records aren't correct
- **"SSL error"** → Wait 10 more minutes for auto-provisioning

---

## 📞 **Support Links**

- **GoDaddy DNS Help**: https://www.godaddy.com/help/add-an-a-record-19238
- **Vercel Domain Help**: https://vercel.com/docs/concepts/projects/domains
- **Your Vercel Dashboard**: https://vercel.com/paul-maitlands-projects-ba42f0ad/flighttrace

---

## ✨ **Expected Result**

After DNS propagation:
- ✅ Your app loads at https://flightandtrace.com
- ✅ Automatic SSL certificate (green padlock)
- ✅ Global CDN distribution
- ✅ Instant deployments on git push

**Typical wait time**: 10-30 minutes
**Maximum wait time**: 4 hours (rare)