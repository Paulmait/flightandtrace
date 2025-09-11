import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// Rate limiting configurations
export const publicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for public endpoints
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please upgrade to Pro for higher limits.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

export const authenticatedRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // 100 requests per minute for authenticated users
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.user?.subscription === 'enterprise'
});

export const premiumRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 500, // 500 requests per minute for premium users
  keyGenerator: (req) => req.user?.id || req.ip
});

// JWT Authentication middleware
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Allow public access with rate limiting
  if (!token) {
    req.user = null;
    req.rateLimit = publicRateLimit;
    return next();
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
    req.user = user;
    
    // Apply rate limit based on subscription tier
    if (user.subscription === 'premium' || user.subscription === 'enterprise') {
      req.rateLimit = premiumRateLimit;
    } else {
      req.rateLimit = authenticatedRateLimit;
    }
    
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Require authentication (no public access)
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Require specific subscription tier
export function requireSubscription(tier) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const tierHierarchy = {
      'free': 0,
      'basic': 1,
      'pro': 2,
      'enterprise': 3
    };

    const userTier = tierHierarchy[req.user.subscription] || 0;
    const requiredTier = tierHierarchy[tier] || 0;

    if (userTier < requiredTier) {
      return res.status(403).json({
        success: false,
        error: `This feature requires ${tier} subscription or higher`,
        upgradeUrl: '/pricing'
      });
    }

    next();
  };
}

// API Key authentication for server-to-server
export function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  // In production, validate against database
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  req.apiKeyAuth = true;
  next();
}

// CORS configuration
export function configureCors(req, res, next) {
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000'];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

// Security headers
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://api.stripe.com https://opensky-network.org https://api.openweathermap.org wss://*.supabase.co; " +
      "frame-src https://js.stripe.com; " +
      "font-src 'self' data:;"
    );
  }
  
  next();
}

export default {
  authenticateToken,
  requireAuth,
  requireSubscription,
  authenticateApiKey,
  configureCors,
  securityHeaders,
  publicRateLimit,
  authenticatedRateLimit,
  premiumRateLimit
};