// src/middleware/enhanced-security.js - Enhanced Security Middleware - 2025
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

/**
 * Enhanced security headers middleware using Helmet
 */
export const enhancedSecurityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some React features
        "'unsafe-eval'", // Required for development, remove in production
        "https://cdn.jsdelivr.net",
        "https://unpkg.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",
        process.env.FRONTEND_URL || "http://localhost:3000"
      ],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
    reportOnly: false,
    reportUri: process.env.CSP_REPORT_URI
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Permissions Policy
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      accelerometer: [],
      gyroscope: [],
      fullscreen: ['self'],
      displayCapture: []
    }
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Set to true if needed

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: 'cross-origin'
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Expect-CT header
  expectCt: {
    maxAge: 86400,
    enforce: process.env.NODE_ENV === 'production'
  }
});

/**
 * Enhanced rate limiting middleware
 */
export const createEnhancedRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000) || 900
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ready' || req.path === '/live';
    },
    keyGenerator: (req) => {
      // Use IP address and user ID if available for more granular limiting
      return req.user ? `${req.ip}-${req.user.id}` : req.ip;
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Enhanced input validation middleware
 */
export const enhancedValidateInput = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Input validation failed', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        errors: errors.array(),
        body: req.body
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }

    next();
  };
};

/**
 * Enhanced security monitoring middleware
 */
export const enhancedSecurityMonitoring = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant request information
  logger.info('Request received', {
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userId: req.user?.id,
    sessionId: req.sessionID
  });

  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript protocol
    /data:/i,  // Data protocol
    /vbscript:/i,  // VBScript protocol
    /onload=/i,  // Event handlers
    /onerror=/i,  // Event handlers
    /eval\(/i,  // Code execution
    /expression\(/i,  // CSS expression
    /import\(/i,  // Dynamic imports
    /require\(/i  // Node.js require
  ];

  const requestData = JSON.stringify({
    path: req.path,
    query: req.query,
    body: req.body,
    headers: req.headers
  });

  const suspiciousActivity = suspiciousPatterns.some(pattern => 
    pattern.test(requestData)
  );

  if (suspiciousActivity) {
    logger.warn('Suspicious request detected', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      requestData: requestData.substring(0, 1000) // Limit log size
    });
  }

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Response sent', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      success: data?.success !== false
    });

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Enhanced CORS configuration
 */
export const enhancedCorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : [process.env.FRONTEND_URL || 'http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin blocked', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page'
  ],
  maxAge: 86400 // 24 hours
};

/**
 * Enhanced request size limiting middleware
 */
export const enhancedRequestSizeLimit = (req, res, next) => {
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024; // 10MB default
  const contentLength = parseInt(req.get('Content-Length') || '0');
  
  if (contentLength > maxSize) {
    logger.warn('Request size limit exceeded', {
      ip: req.ip,
      path: req.path,
      contentLength,
      maxSize
    });
    
    return res.status(413).json({
      success: false,
      message: 'Request entity too large',
      maxSize
    });
  }
  
  next();
};

/**
 * Enhanced security headers for API responses
 */
export const enhancedApiSecurityHeaders = (req, res, next) => {
  // Prevent caching of sensitive data
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  
  // Additional security headers for API
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  next();
};

export default {
  enhancedSecurityHeaders,
  createEnhancedRateLimit,
  enhancedValidateInput,
  enhancedSecurityMonitoring,
  enhancedCorsOptions,
  enhancedRequestSizeLimit,
  enhancedApiSecurityHeaders
};

