// src/config/database.js - PostgreSQL connection setup - 2025 Modernized
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

/**
 * Database configuration with enhanced security and monitoring
 */
const createDbConfig = () => {
  // Support both DATABASE_URL and individual connection parameters
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
      createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200
    };
  }
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'secure_docs',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
    createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200
  };
};

// Create connection pool
const pool = new Pool(createDbConfig());

// Enhanced connection monitoring
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

/**
 * Test database connection with retry logic
 */
const testConnection = async () => {
  try {
    connectionAttempts++;
    const client = await pool.connect();
    
    // Test query to ensure database is responsive
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('✅ Database connected successfully', {
      attempt: connectionAttempts,
      poolStats: getPoolStats()
    });
    
    connectionAttempts = 0; // Reset on successful connection
    return true;
  } catch (error) {
    logger.error(`❌ Database connection failed (attempt ${connectionAttempts}/${maxConnectionAttempts})`, {
      error: error.message,
      code: error.code,
      attempt: connectionAttempts
    });
    
    if (connectionAttempts >= maxConnectionAttempts) {
      logger.error('Max database connection attempts reached. Exiting...');
      process.exit(1);
    }
    
    // Exponential backoff retry
    const delay = Math.min(1000 * Math.pow(2, connectionAttempts - 1), 30000);
    logger.info(`Retrying database connection in ${delay}ms...`);
    
    setTimeout(testConnection, delay);
    return false;
  }
};

// Pool event handlers for monitoring
pool.on('connect', (client) => {
  logger.debug('New database client connected', {
    processId: client.processID,
    poolStats: getPoolStats()
  });
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool', {
    processId: client.processID,
    poolStats: getPoolStats()
  });
});

pool.on('remove', (client) => {
  logger.debug('Client removed from pool', {
    processId: client.processID,
    poolStats: getPoolStats()
  });
});

pool.on('error', (err, client) => {
  logger.error('Unexpected database pool error', {
    error: err.message,
    processId: client?.processID,
    poolStats: getPoolStats()
  });
});

/**
 * Enhanced query execution with monitoring and security
 */
const query = async (text, params = []) => {
  const start = Date.now();
  const queryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Log query start for debugging
    logger.debug('Query started', {
      queryId,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      paramCount: params.length
    });
    
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log query completion
    const logLevel = duration > 1000 ? 'warn' : 'debug';
    logger[logLevel]('Query completed', {
      queryId,
      duration: `${duration}ms`,
      rowCount: res.rowCount,
      command: res.command
    });
    
    // Performance monitoring
    if (duration > 5000) {
      logger.warn('Slow query detected', {
        queryId,
        duration: `${duration}ms`,
        text: text.substring(0, 200),
        poolStats: getPoolStats()
      });
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('Database query error', {
      queryId,
      duration: `${duration}ms`,
      text: text.substring(0, 100),
      paramCount: params.length,
      error: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    
    // Enhance error with query context
    error.queryId = queryId;
    error.duration = duration;
    throw error;
  }
};

/**
 * Enhanced transaction wrapper with monitoring
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const start = Date.now();
  
  try {
    logger.debug('Transaction started', { transactionId });
    
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    const duration = Date.now() - start;
    logger.debug('Transaction committed', {
      transactionId,
      duration: `${duration}ms`
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    try {
      await client.query('ROLLBACK');
      logger.warn('Transaction rolled back', {
        transactionId,
        duration: `${duration}ms`,
        error: error.message
      });
    } catch (rollbackError) {
      logger.error('Transaction rollback failed', {
        transactionId,
        originalError: error.message,
        rollbackError: rollbackError.message
      });
    }
    
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get pool statistics
 */
const getPoolStats = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount,
  maxCount: pool.options.max,
  minCount: pool.options.min
});

/**
 * Enhanced database operations with validation and security
 */
const db = {
  // Basic query execution
  query,
  
  // Transaction wrapper
  transaction,
  
  // Get single row with enhanced error handling
  async findOne(table, conditions = {}, columns = '*') {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name is required and must be a string');
    }
    
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.length > 0 
      ? `WHERE ${keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')}`
      : '';
    
    // Sanitize column names to prevent SQL injection
    const sanitizedColumns = typeof columns === 'string' 
      ? columns.replace(/[^a-zA-Z0-9_,\s*]/g, '')
      : '*';
    
    const queryText = `SELECT ${sanitizedColumns} FROM ${table} ${whereClause} LIMIT 1`;
    const result = await query(queryText, values);
    return result.rows[0] || null;
  },
  
  // Get multiple rows with pagination support
  async findMany(table, conditions = {}, options = {}) {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name is required and must be a string');
    }
    
    const {
      columns = '*',
      orderBy = '',
      limit = '',
      offset = '',
      distinct = false
    } = options;
    
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.length > 0 
      ? `WHERE ${keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')}`
      : '';
    
    const sanitizedColumns = typeof columns === 'string' 
      ? columns.replace(/[^a-zA-Z0-9_,\s*]/g, '')
      : '*';
    
    const distinctClause = distinct ? 'DISTINCT' : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const offsetClause = offset ? `OFFSET ${offset}` : '';
    
    const queryText = `
      SELECT ${distinctClause} ${sanitizedColumns} 
      FROM ${table} 
      ${whereClause} 
      ${orderClause} 
      ${limitClause} 
      ${offsetClause}
    `.replace(/\s+/g, ' ').trim();
    
    const result = await query(queryText, values);
    return result.rows;
  },
  
  // Insert record with conflict handling
  async insert(table, data, options = {}) {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name is required and must be a string');
    }
    
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('Data is required and must be a non-empty object');
    }
    
    const { onConflict = '', returning = '*' } = options;
    
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    
    const conflictClause = onConflict ? `ON CONFLICT ${onConflict}` : '';
    
    const queryText = `
      INSERT INTO ${table} (${keys.join(', ')}) 
      VALUES (${placeholders}) 
      ${conflictClause}
      RETURNING ${returning}
    `;
    
    const result = await query(queryText, values);
    return result.rows[0];
  },
  
  // Update record with optimistic locking support
  async update(table, data, conditions, options = {}) {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name is required and must be a string');
    }
    
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('Data is required and must be a non-empty object');
    }
    
    if (!conditions || typeof conditions !== 'object' || Object.keys(conditions).length === 0) {
      throw new Error('Conditions are required and must be a non-empty object');
    }
    
    const { returning = '*' } = options;
    
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const conditionKeys = Object.keys(conditions);
    const conditionValues = Object.values(conditions);
    
    const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const whereClause = conditionKeys.map((key, i) => `${key} = $${i + 1 + dataKeys.length}`).join(' AND ');
    
    const queryText = `
      UPDATE ${table} 
      SET ${setClause}, updated_at = NOW()
      WHERE ${whereClause} 
      RETURNING ${returning}
    `;
    
    const result = await query(queryText, [...dataValues, ...conditionValues]);
    return result.rows[0];
  },
  
  // Soft delete with audit trail
  async softDelete(table, conditions, options = {}) {
    const { deletedBy = null, returning = '*' } = options;
    
    const updateData = {
      deleted_at: new Date(),
      is_deleted: true
    };
    
    if (deletedBy) {
      updateData.deleted_by = deletedBy;
    }
    
    return this.update(table, updateData, conditions, { returning });
  },
  
  // Hard delete record
  async delete(table, conditions, options = {}) {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name is required and must be a string');
    }
    
    if (!conditions || typeof conditions !== 'object' || Object.keys(conditions).length === 0) {
      throw new Error('Conditions are required and must be a non-empty object');
    }
    
    const { returning = '*' } = options;
    
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    
    const queryText = `DELETE FROM ${table} WHERE ${whereClause} RETURNING ${returning}`;
    const result = await query(queryText, values);
    return result.rows[0];
  },
  
  // Count records
  async count(table, conditions = {}) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.length > 0 
      ? `WHERE ${keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')}`
      : '';
    
    const queryText = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const result = await query(queryText, values);
    return parseInt(result.rows[0].count);
  },
  
  // Check if record exists
  async exists(table, conditions) {
    const count = await this.count(table, conditions);
    return count > 0;
  },
  
  // Get connection pool stats
  getStats: getPoolStats,
  
  // Health check
  async healthCheck() {
    try {
      const result = await query('SELECT NOW() as timestamp, version() as version');
      return {
        status: 'healthy',
        timestamp: result.rows[0].timestamp,
        version: result.rows[0].version,
        poolStats: getPoolStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        poolStats: getPoolStats()
      };
    }
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async () => {
  logger.info('Closing database connections...');
  try {
    await pool.end();
    logger.info('Database connections closed successfully');
  } catch (error) {
    logger.error('Error closing database connections', { error: error.message });
  }
};

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Initialize connection test
testConnection();

export { pool, query, transaction, getPoolStats };
export default db;

