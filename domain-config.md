# Domain Configuration for Flight and Trace

## Production Domains

### Primary Domain
- **Main**: `flightandtrace.com`
- **SSL**: Required (Let's Encrypt or CloudFlare)
- **CDN**: CloudFlare recommended

### Subdomains
- **API**: `api.flightandtrace.com` 
- **Blog**: `blog.flightandtrace.com`
- **Help/Docs**: `help.flightandtrace.com`
- **Status**: `status.flightandtrace.com`

## DNS Configuration

### Required DNS Records
```
A     @                    192.0.2.1    (Primary server IP)
A     www                  192.0.2.1    (WWW redirect)
CNAME api                  api-server.flightandtrace.com
CNAME blog                 blog-platform.flightandtrace.com
CNAME help                 help-platform.flightandtrace.com
CNAME status               status-platform.flightandtrace.com
MX    @                    mail.flightandtrace.com (Priority: 10)
TXT   @                    "v=spf1 include:_spf.google.com ~all"
```

### CNAME for Deployment Platforms
```
# Netlify
CNAME www                  peaceful-site-123456.netlify.app

# Vercel  
CNAME www                  flight-and-trace.vercel.app

# AWS CloudFront
CNAME www                  d123456abcdef.cloudfront.net
```

## SSL/TLS Configuration

### Certificate Requirements
- **Wildcard Certificate**: `*.flightandtrace.com`
- **SAN Certificate**: Include all subdomains
- **Auto-renewal**: Configure Let's Encrypt or CloudFlare

### Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

## Redirect Rules

### Domain Variations
- `www.flightandtrace.com` → `flightandtrace.com` (301)
- `flight-and-trace.com` → `flightandtrace.com` (301)
- `flighttrace.com` → `flightandtrace.com` (301)
- `flight-trace.com` → `flightandtrace.com` (301)

### Legacy URLs  
- `/flighttrace/*` → `/flightandtrace/*` (301)
- `/flight-trace/*` → `/flight-and-trace/*` (301)

See `frontend/public/_redirects` for complete redirect configuration.

## Environment-Specific Domains

### Staging
- **Main**: `staging.flightandtrace.com`
- **API**: `api-staging.flightandtrace.com`

### Development
- **Main**: `dev.flightandtrace.com`
- **API**: `api-dev.flightandtrace.com`
- **Local**: `localhost:3000`

## Monitoring & Analytics

### Domain Monitoring
- **Uptime**: UptimeRobot or Pingdom
- **SSL**: SSL Labs monitoring
- **DNS**: DNS monitoring for propagation

### Analytics Configuration
```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>

<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){...})(window,document,'script','dataLayer','GTM-ID');</script>
```

## CDN Configuration

### CloudFlare Settings
- **Caching**: Full page caching for static assets
- **Compression**: Brotli + Gzip
- **Minification**: HTML, CSS, JS
- **Security**: Bot fight mode, DDoS protection

### Cache Rules
```
# Static Assets (1 year)
*.js, *.css, *.png, *.jpg, *.ico, *.woff2
Cache-Control: public, max-age=31536000

# HTML (1 hour)  
*.html
Cache-Control: public, max-age=3600

# API responses (5 minutes)
/api/*
Cache-Control: public, max-age=300
```

## Deployment Configuration

### Netlify
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  REACT_APP_API_URL = "https://api.flightandtrace.com"
```

### Vercel
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## Security Configuration

### CORS Policy
```javascript
// Express.js CORS configuration
app.use(cors({
  origin: [
    'https://flightandtrace.com',
    'https://www.flightandtrace.com',
    'https://staging.flightandtrace.com'
  ],
  credentials: true
}));
```

### Rate Limiting
```javascript
// API rate limiting by domain
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

## Maintenance

### Regular Tasks
1. **SSL Certificate Renewal**: Monthly check
2. **DNS Propagation**: After any DNS changes
3. **Redirect Testing**: Monthly validation
4. **Performance Monitoring**: Weekly reports
5. **Security Scanning**: Weekly SSL/security audits

### Emergency Procedures
1. **Domain Hijacking**: DNS lock, registrar contact
2. **SSL Expiration**: Emergency certificate issuance  
3. **CDN Issues**: Origin server fallback
4. **DDoS Attacks**: CloudFlare DDoS protection activation

---

**Last Updated**: September 8, 2025  
**Next Review**: October 8, 2025