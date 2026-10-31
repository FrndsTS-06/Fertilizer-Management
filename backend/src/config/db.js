const { Pool } = require('pg');
const config = require('./index');

/**
 * PostgreSQL Connection Pool Configuration
 * Utilizes centralized configuration with defensive defaults.
 */
const poolConfig = {
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: config.db.max,
  min: config.db.min,
  idleTimeoutMillis: config.db.idleTimeoutMillis,
  connectionTimeoutMillis: config.db.connectionTimeoutMillis,
};

// Create reusable connection pool
const pool = new Pool(poolConfig);

// Pool event listeners for diagnostic monitoring
pool.on('error', (err) => {
  // Prevent idle client errors from terminating the Node process unexpectedly
  console.error('[PostgreSQL Pool Error] Unexpected error on idle client:', err.message);
});

/**
 * Execute a parameterized query against the connection pool
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.isDevelopment) {
      console.log(`[SQL Query] duration=${duration}ms rows=${res.rowCount}`);
    }
    return res;
  } catch (error) {
    // Sanitize error before logging to prevent credential exposure
    console.error(`[SQL Error] Query failed: ${error.message}`);
    throw error;
  }
};

/**
 * Test database connectivity with a safe, read-only query
 * @returns {Promise<{ success: boolean, database?: object, error?: string }>}
 */
const checkConnection = async () => {
  try {
    const result = await query(
      'SELECT current_database() AS db_name, current_user AS db_user, version() AS db_version, NOW() AS server_time;'
    );
    const row = result.rows[0];

    return {
      success: true,
      database: {
        status: 'connected',
        name: row.db_name,
        user: row.db_user,
        version: row.db_version.split(' on ')[0], // e.g. "PostgreSQL 18.6"
        serverTime: row.server_time,
        pool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      database: {
        status: 'disconnected',
        error: 'Database connection failed. Please check server logs and configuration.',
      },
    };
  }
};

/**
 * Gracefully close all pool connections
 * @returns {Promise<void>}
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log('[PostgreSQL Pool] Connection pool closed successfully.');
  } catch (err) {
    console.error('[PostgreSQL Pool] Error closing pool:', err.message);
  }
};

// CLI diagnostic runner if executed directly: `node src/config/db.js`
if (require.main === module) {
  (async () => {
    console.log('--- Testing PostgreSQL Database Connectivity ---');
    console.log(`Target: ${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);
    const check = await checkConnection();
    if (check.success) {
      console.log('✅ Connection Successful!');
      console.log('Details:', JSON.stringify(check.database, null, 2));
    } else {
      console.error('❌ Connection Failed!');
      console.error('Error:', check.database.error);
    }
    await closePool();
    process.exit(check.success ? 0 : 1);
  })();
}

module.exports = {
  pool,
  query,
  checkConnection,
  closePool,
};
