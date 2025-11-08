const { Pool } = require('pg');
const logger = require('./logger');

// PostgreSQL Connection Pool Configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'agri_supply_chain',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Pool Error Handler
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test Database Connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful:', result.rows[0].now);
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error.message);
    throw error;
  }
};

// Generic Query Function with Error Handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error:', { text, error: error.message });
    throw error;
  }
};

// Transaction Helper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Graceful Shutdown
const closePool = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed successfully');
  } catch (error) {
    logger.error('Error closing database pool:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool
};
