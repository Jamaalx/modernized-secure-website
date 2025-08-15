// src/server.js - Main Express server - 2025 Modernized
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import compression from 'compression';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoSanitize from 'express-mongo-sanitize';

// Import routes
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';

// Import middleware
import { authenticateToken, authorizeRole } from './middleware/auth.js';
import { auditLogger } from './middleware/audit.js';
import { securityMonitor } from './middleware/security.js';

// Import utilities
import { logger } from './utils/logger.js';
import { validateEnv } from './utils/validation.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate environment variables
validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

// Request logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting with progressive delays
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.round(15 * 60)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.round(15 * 60)
    });
  }
});

// Speed limiter for additional protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes at full speed
  delayMs: 500 // slow down subsequent requests by 500ms per request
});

app.use(limiter);
app.use(speedLimiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: Math.round(15 * 60)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Enhanced CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware with enhanced security
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 20
}));

// Sanitize user input
app.use(mongoSanitize({
  replaceWith: '_'
}));

// Security monitoring middleware
app.use(securityMonitor);

// Audit logging middleware (track all requests)
app.use(auditLogger);

// Health check endpoint with detailed information
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    pid: process.pid
  };
  
  res.json(healthCheck);
});

// Readiness probe for Kubernetes
app.get('/ready', (req, res) => {
  // Add database connectivity check here if needed
  res.status(200).json({ status: 'ready' });
});

// Liveness probe for Kubernetes
app.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// API Routes with enhanced security
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/documents', authenticateToken, documentRoutes);
app.use('/api/admin', authenticateToken, authorizeRole(['ADMIN']), adminRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Serve uploaded files (secure endpoint)
app.use('/api/files', authenticateToken, express.static(join(__dirname, '../uploads'), {
  index: false,
  dotfiles: 'deny',
  maxAge: 0, // No caching for sensitive files
  setHeaders: (res, filePath) => {
    // Enhanced security headers for file serving
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Download-Options': 'noopen',
      'Content-Security-Policy': "default-src 'none'"
    });
  }
}));

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  const errorLog = {
    id: errorId,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
    body: req.body,
    query: req.query,
    params: req.params
  };
  
  // Log error with appropriate level
  if (err.status >= 500) {
    logger.error('Server Error', errorLog);
  } else {
    logger.warn('Client Error', errorLog);
  }
  
  // Don't expose internal errors in production
  const message = NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  const response = {
    success: false,
    message,
    errorId
  };
  
  if (NODE_ENV !== 'production') {
    response.stack = err.stack;
    response.details = errorLog;
  }
  
  res.status(err.status || 500).json(response);
});

// Enhanced 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
  
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections, cleanup resources
    // Add cleanup logic here
    
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Secure Documents Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${NODE_ENV}`);
  logger.info(`🔒 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  logger.info(`📊 Process ID: ${process.pid}`);
  logger.info(`🔧 Node.js version: ${process.version}`);
});

export default app;

