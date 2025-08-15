// src/utils/logger.js - Production-ready logging with Winston
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (stack) {
    log += `\n${stack}`;
  }
  
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

// Create logs directory if it doesn't exist
const logsDir = join(__dirname, '../../logs');

// Configure transports based on environment
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat
    ),
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  })
);

// File transports (production and development)
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: join(logsDir, 'combined.log'),
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Audit log file for security events
  transports.push(
    new winston.transports.File({
      filename: join(logsDir, 'audit.log'),
      level: 'info',
      format: combine(
        timestamp(),
        json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  );
} else {
  // Development file logging
  transports.push(
    new winston.transports.File({
      filename: join(logsDir, 'development.log'),
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 2
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: 'secure-docs-backend',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '2.0.0'
  },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: join(logsDir, 'exceptions.log'),
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  );
  
  logger.rejections.handle(
    new winston.transports.File({
      filename: join(logsDir, 'rejections.log'),
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  );
}

// Add custom methods for specific log types
logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, type: 'security' });
};

logger.audit = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'audit' });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'performance' });
};

// Create a stream object for Morgan HTTP request logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim(), { type: 'http' });
  }
};

export { logger };
export default logger;

