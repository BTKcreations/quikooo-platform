/**
 * QUIKOOO Backend Security Hardening Module
 * 
 * Provides:
 * 1. Rate Limiting Configuration & In-Memory Sliding Window Guard
 * 2. Helmet Security Headers Policy
 * 3. Cross-Origin Resource Sharing (CORS) Whitelist Rules
 * 4. Secrets Redaction & Sensitive Parameter Sanitization Guard
 */

const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'token',
  'jwt_secret',
  'secret',
  'authorization',
  'otp',
  'razorpay_secret',
  'card_number',
  'cvv',
  'api_key',
];

/**
 * 1. CORS Allowed Origins Whitelist
 * Includes local Vite ports 3000-3004 for all 5 portals and production domains.
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000', // customer-web
  'http://localhost:3001', // merchant-studio
  'http://localhost:3002', // driver-fleet
  'http://localhost:3003', // agent-app
  'http://localhost:3004', // admin-console
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3004',
  'https://quikooo.com',
  'https://admin.quikooo.com',
  'https://merchant.quikooo.com',
  'https://agent.quikooo.com',
  'https://quikooo.bstk.in',
  'https://merchant.quikooo.bstk.in',
  'https://driver.quikooo.bstk.in',
  'https://agent.quikooo.bstk.in',
  'https://admin.quikooo.bstk.in',
  'https://api.quikooo.bstk.in',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server) or whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} is not in authorized list`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Zone-Id', 'X-Idempotency-Key'],
  maxAge: 86400, // 24 hours pre-flight caching
};

/**
 * 2. Helmet Strict Security Headers Configuration
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'http://localhost:*'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' }, // Prevent clickjacking
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true, // Prevent MIME type sniffing
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
};

/**
 * 3. In-Memory Sliding Window Rate Limiter
 * Provides DDoS and brute-force protection without requiring Redis in basic environments.
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, maxRequests = 100, message = 'Too many requests' } = {}) {
  const requestHistory = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = requestHistory.get(ip) || [];
    // Remove expired entries outside the sliding window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        windowMs,
        limit: maxRequests,
      });
    }

    timestamps.push(now);
    requestHistory.set(ip, timestamps);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - timestamps.length));

    next();
  };
}

/**
 * 4. Secrets Redaction & Parameter Masking Utility
 * Prevents API keys, JWT secrets, passwords, and OTPs from leaking in logs or error bodies.
 */
function redactSecrets(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s));
    if (isSensitive) {
      sanitized[key] = '[REDACTED_SECRET]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSecrets(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Express middleware to prevent accidental secret leakage in JSON responses
 */
function sanitizeResponseMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object') {
      const sanitizedBody = redactSecrets(body);
      return originalJson(sanitizedBody);
    }
    return originalJson(body);
  };
  next();
}

/**
 * Startup Security Audit & Env Checker
 */
function auditEnvironmentSecurity() {
  const warnings = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'quikooo-secret-key-change-in-prod') {
    warnings.push('JWT_SECRET is using default development secret. Change in production!');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    warnings.push('DATABASE_URL is required in production environment.');
  }
  return {
    isSecure: warnings.length === 0,
    warnings,
  };
}

module.exports = {
  ALLOWED_ORIGINS,
  corsOptions,
  helmetOptions,
  createRateLimiter,
  redactSecrets,
  sanitizeResponseMiddleware,
  auditEnvironmentSecurity,
};
