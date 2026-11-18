const path = require('path');
const dotenv = require('dotenv');

// Ensure environment variables are loaded from backend/.env, root .env, and cwd
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

let dbFromUrl = {};
if (process.env.DATABASE_URL) {
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    dbFromUrl = {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 5432,
      database: parsed.pathname.replace(/^\//, '').split('?')[0],
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
    };
  } catch (e) {
    // Malformed URL; fallback to individual variables
  }
}

/**
 * Centralized Application Configuration
 * Aggregates all environment variables with validation and sensible defaults.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
  },

  cors: {
    allowedOrigins: (process.env.FRONTEND_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000')
      .split(',')
      .map(origin => origin.trim()),
  },

  db: {
    host: dbFromUrl.host || process.env.DB_HOST || 'localhost',
    port: dbFromUrl.port || parseInt(process.env.DB_PORT, 10) || 5432,
    database: dbFromUrl.database || process.env.DB_NAME || 'fertilizer_management',
    user: dbFromUrl.user || process.env.DB_USER || 'postgres',
    password: dbFromUrl.password !== undefined ? dbFromUrl.password : (process.env.DB_PASSWORD || ''),
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10) || 5000,
  },

  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
      ? (() => { throw new Error('CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable must be set in production mode.'); })()
      : 'dev-super-secret-jwt-key-2026-fertilizer-mgmt'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  rateLimit: {
    loginMaxAttempts: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5,
    loginWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
  },
};

module.exports = config;
