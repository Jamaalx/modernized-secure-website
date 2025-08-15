// src/middleware/auth.js - Authentication and authorization middleware - 2025 Modernized
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { validate, schemas } from '../utils/validation.js';
import db from '../config/database.js';

/**
 * Authenticate JWT token middleware
 * Enhanced with better error handling and security logging
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      logger.security('Authentication attempt without token', {
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate token payload structure
    if (!decoded.userId || !decoded.role) {
      throw new Error('Invalid token payload');
    }
    
    // Get user from database (ensure user still exists and is active)
    const user = await db.findOne('users', 
      { id: decoded.userId }, 
      'id, email, role, is_active, account_locked_until, last_login, failed_login_attempts'
    );
    
    if (!user) {
      logger.security('Authentication attempt with non-existent user', {
        userId: decoded.userId,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.is_active) {
      logger.security('Authentication attempt with deactivated account', {
        userId: user.id,
        email: user.email,
        ip: getClientIP(req)
      });
      
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Check if account is locked
    if (user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
      logger.security('Authentication attempt with locked account', {
        userId: user.id,
        email: user.email,
        lockedUntil: user.account_locked_until,
        ip: getClientIP(req)
      });
      
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.account_locked_until
      });
    }
    
    // Check for suspicious activity (multiple failed attempts)
    if (user.failed_login_attempts >= 3) {
      logger.security('Authentication with account having multiple failed attempts', {
        userId: user.id,
        email: user.email,
        failedAttempts: user.failed_login_attempts,
        ip: getClientIP(req)
      });
    }
    
    // Add user to request object (remove sensitive fields)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active
    };
    
    // Log successful authentication for audit trail
    await logUserActivity(req, user, 'AUTH_SUCCESS');
    
    // Update last activity timestamp
    await db.update('users', 
      { last_activity: new Date() }, 
      { id: user.id }
    );
    
    next();
  } catch (error) {
    let errorCode = 'AUTH_ERROR';
    let statusCode = 500;
    let message = 'Authentication failed';
    
    if (error.name === 'JsonWebTokenError') {
      errorCode = 'INVALID_TOKEN';
      statusCode = 403;
      message = 'Invalid token';
    } else if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      statusCode = 403;
      message = 'Token expired';
    } else if (error.name === 'NotBeforeError') {
      errorCode = 'TOKEN_NOT_ACTIVE';
      statusCode = 403;
      message = 'Token not active';
    }
    
    logger.security('Authentication failed', {
      error: error.message,
      errorCode,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path
    });
    
    return res.status(statusCode).json({
      success: false,
      message,
      code: errorCode
    });
  }
};

/**
 * Authorize user roles middleware factory
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
export const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.security('Authorization attempt without authentication', {
        ip: getClientIP(req),
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.security('Authorization failed - insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        ip: getClientIP(req),
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Check document access permission middleware
 */
export const authorizeDocumentAccess = async (req, res, next) => {
  try {
    const documentId = req.params.id || req.body.documentId;
    const userId = req.user.id;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID required',
        code: 'DOCUMENT_ID_REQUIRED'
      });
    }
    
    // Validate document ID format
    try {
      validate({ id: documentId }, schemas.id);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID format',
        code: 'INVALID_DOCUMENT_ID'
      });
    }
    
    // Admin can access all documents
    if (req.user.role === 'ADMIN') {
      logger.audit('Admin document access', {
        userId,
        documentId,
        ip: getClientIP(req)
      });
      return next();
    }
    
    // Check if user has permission to access this document
    const permission = await db.query(`
      SELECT dp.*, d.title, d.category 
      FROM document_permissions dp
      JOIN documents d ON d.id = dp.document_id
      WHERE dp.document_id = $1 AND dp.user_id = $2 AND dp.revoked_at IS NULL
    `, [documentId, userId]);
    
    if (permission.rows.length === 0) {
      logger.security('Unauthorized document access attempt', {
        userId,
        documentId,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent']
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied to this document',
        code: 'DOCUMENT_ACCESS_DENIED'
      });
    }
    
    // Add permission info to request
    req.documentPermission = permission.rows[0];
    
    logger.audit('Document access granted', {
      userId,
      documentId,
      documentTitle: permission.rows[0].title,
      documentCategory: permission.rows[0].category,
      permissionType: permission.rows[0].permission_type,
      ip: getClientIP(req)
    });
    
    next();
  } catch (error) {
    logger.error('Document authorization error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      documentId: req.params.id || req.body.documentId
    });
    
    return res.status(500).json({
      success: false,
      message: 'Authorization failed',
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

/**
 * Log user activity for audit trail
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 * @param {string} actionType - Type of action
 */
export const logUserActivity = async (req, user, actionType = null) => {
  try {
    // Don't log health checks and other non-important endpoints
    const skipPaths = ['/health', '/ready', '/live'];
    if (skipPaths.some(path => req.path.includes(path))) {
      return;
    }
    
    const activity = {
      user_id: user.id,
      action_type: actionType || `${req.method} ${req.path}`,
      resource_type: getResourceType(req.path),
      resource_id: getResourceId(req),
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'],
      details: JSON.stringify({
        referer: req.headers['referer'],
        query: req.query,
        params: req.params,
        timestamp: new Date().toISOString()
      }),
      success: true,
      created_at: new Date()
    };
    
    await db.insert('activity_logs', activity);
    
    logger.audit('User activity logged', {
      userId: user.id,
      action: activity.action_type,
      resource: activity.resource_type,
      ip: activity.ip_address
    });
  } catch (error) {
    // Don't fail the request if logging fails
    logger.error('Activity logging error', {
      error: error.message,
      userId: user?.id,
      path: req.path
    });
  }
};

/**
 * Helper functions
 */
const getResourceType = (path) => {
  if (path.includes('/documents')) return 'document';
  if (path.includes('/users')) return 'user';
  if (path.includes('/admin')) return 'admin';
  if (path.includes('/auth')) return 'auth';
  return 'other';
};

const getResourceId = (req) => {
  return req.params.id || req.body.id || req.query.id || null;
};

export const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.connection?.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

/**
 * Generate JWT token with enhanced security
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @param {Object} options - Additional options
 * @returns {string} JWT token
 */
export const generateToken = (userId, role, options = {}) => {
  const payload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    jti: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  const tokenOptions = {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'secure-docs-backend',
    audience: 'secure-docs-frontend',
    algorithm: 'HS256'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (userId) => {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    jti: `refresh-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'secure-docs-backend',
    audience: 'secure-docs-frontend'
  });
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} Decoded token
 * @throws {Error} If token is invalid
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    logger.security('Invalid refresh token verification attempt', {
      error: error.message
    });
    throw new Error('Invalid refresh token');
  }
};

/**
 * Middleware to validate request parameters
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      req.params = validate(req.params, schema);
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

export default {
  authenticateToken,
  authorizeRole,
  authorizeDocumentAccess,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  logUserActivity,
  getClientIP,
  validateParams
};

