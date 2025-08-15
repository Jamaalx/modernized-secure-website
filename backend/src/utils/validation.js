// src/utils/validation.js - Environment and input validation utilities
import Joi from 'joi';
import { logger } from './logger.js';

// Environment variables schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .port()
    .default(3001),
  
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .description('PostgreSQL database connection string'),
  
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT signing secret (minimum 32 characters)'),
  
  JWT_EXPIRES_IN: Joi.string()
    .default('24h')
    .description('JWT token expiration time'),
  
  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:3000')
    .description('Frontend application URL for CORS'),
  
  BCRYPT_ROUNDS: Joi.number()
    .integer()
    .min(10)
    .max(15)
    .default(12)
    .description('Bcrypt hashing rounds'),
  
  UPLOAD_MAX_SIZE: Joi.number()
    .integer()
    .min(1024 * 1024) // 1MB minimum
    .max(100 * 1024 * 1024) // 100MB maximum
    .default(10 * 1024 * 1024) // 10MB default
    .description('Maximum file upload size in bytes'),
  
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(60000) // 1 minute minimum
    .default(15 * 60 * 1000) // 15 minutes default
    .description('Rate limiting window in milliseconds'),
  
  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .description('Maximum requests per rate limit window'),
  
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .description('Logging level'),
  
  CORS_ORIGINS: Joi.string()
    .description('Comma-separated list of allowed CORS origins'),
  
  SESSION_SECRET: Joi.string()
    .min(32)
    .description('Session secret for cookie signing'),
  
  REDIS_URL: Joi.string()
    .uri()
    .description('Redis connection string for session storage'),
  
  SMTP_HOST: Joi.string()
    .hostname()
    .description('SMTP server hostname'),
  
  SMTP_PORT: Joi.number()
    .port()
    .description('SMTP server port'),
  
  SMTP_USER: Joi.string()
    .email()
    .description('SMTP username'),
  
  SMTP_PASS: Joi.string()
    .description('SMTP password'),
  
  AWS_ACCESS_KEY_ID: Joi.string()
    .description('AWS access key for S3 storage'),
  
  AWS_SECRET_ACCESS_KEY: Joi.string()
    .description('AWS secret key for S3 storage'),
  
  AWS_REGION: Joi.string()
    .description('AWS region for S3 storage'),
  
  AWS_S3_BUCKET: Joi.string()
    .description('AWS S3 bucket name for file storage')
}).unknown(true); // Allow other environment variables

/**
 * Validate environment variables
 * @throws {Error} If validation fails
 */
export const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false
  });
  
  if (error) {
    const errorMessage = error.details
      .map(detail => `${detail.path.join('.')}: ${detail.message}`)
      .join('\n');
    
    logger.error('Environment validation failed:', { error: errorMessage });
    throw new Error(`Environment validation failed:\n${errorMessage}`);
  }
  
  // Update process.env with validated and default values
  Object.assign(process.env, value);
  
  logger.info('Environment validation successful');
  return value;
};

/**
 * Common validation schemas
 */
export const schemas = {
  // User registration
  userRegistration: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .max(255)
      .description('User email address'),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .description('Password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
    
    firstName: Joi.string()
      .min(1)
      .max(50)
      .required()
      .description('User first name'),
    
    lastName: Joi.string()
      .min(1)
      .max(50)
      .required()
      .description('User last name'),
    
    role: Joi.string()
      .valid('USER', 'ADMIN')
      .default('USER')
      .description('User role')
  }),
  
  // User login
  userLogin: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .max(255),
    
    password: Joi.string()
      .required()
      .max(128)
  }),
  
  // Document upload
  documentUpload: Joi.object({
    title: Joi.string()
      .min(1)
      .max(255)
      .required()
      .description('Document title'),
    
    description: Joi.string()
      .max(1000)
      .allow('')
      .description('Document description'),
    
    category: Joi.string()
      .valid('GENERAL', 'CONFIDENTIAL', 'RESTRICTED', 'PUBLIC')
      .default('GENERAL')
      .description('Document security category'),
    
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(10)
      .default([])
      .description('Document tags')
  }),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .description('Page number'),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .description('Items per page'),
    
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'title', 'category')
      .default('createdAt')
      .description('Sort field'),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .description('Sort order')
  }),
  
  // ID parameter
  id: Joi.string()
    .uuid()
    .required()
    .description('UUID identifier')
};

/**
 * Validate request data against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Joi schema
 * @param {Object} options - Validation options
 * @returns {Object} Validated data
 * @throws {Error} If validation fails
 */
export const validate = (data, schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  };
  
  const { error, value } = schema.validate(data, { ...defaultOptions, ...options });
  
  if (error) {
    const errorMessage = error.details
      .map(detail => detail.message)
      .join(', ');
    
    const validationError = new Error(`Validation failed: ${errorMessage}`);
    validationError.status = 400;
    validationError.details = error.details;
    
    throw validationError;
  }
  
  return value;
};

/**
 * Middleware factory for request validation
 * @param {Object} schema - Joi schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
export const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      req[property] = validate(req[property], schema);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate file upload
 * @param {Object} file - Multer file object
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export const validateFileUpload = (file) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024; // 10MB
  
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} is not allowed`);
  }
  
  if (file.size > maxSize) {
    throw new Error(`File size ${file.size} exceeds maximum allowed size ${maxSize}`);
  }
  
  // Check for suspicious file names
  if (/[<>:"/\\|?*]/.test(file.originalname)) {
    throw new Error('File name contains invalid characters');
  }
  
  return true;
};

export default {
  validateEnv,
  schemas,
  validate,
  validateRequest,
  sanitizeString,
  validateFileUpload
};

