const config = require('../config');

// Keys whose values must always be sanitized in logs
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'refreshtoken',
  'access_token',
  'secret',
  'authorization',
  'cookie',
  'creditcard',
  'cvv',
  'api_key',
  'apikey',
  'jwt',
]);

/**
 * Recursively sanitize objects and arrays to prevent leaking sensitive credentials
 * @param {any} data
 * @returns {any}
 */
const sanitize = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // If it resembles an Authorization header Bearer token
    if (data.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitize(value);
      }
    }
    return sanitizedObj;
  }

  return data;
};

/**
 * Lightweight application logger with timestamp and level tags
 */
const logger = {
  info: (message, meta = null) => {
    if (config.isTest) return;
    const metaStr = meta ? ` ${JSON.stringify(sanitize(meta))}` : '';
    console.log(`[INFO] [${new Date().toISOString()}] ${message}${metaStr}`);
  },

  warn: (message, meta = null) => {
    if (config.isTest) return;
    const metaStr = meta ? ` ${JSON.stringify(sanitize(meta))}` : '';
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}${metaStr}`);
  },

  error: (message, error = null) => {
    if (config.isTest) return;
    let errDetails = '';
    if (error) {
      if (error instanceof Error) {
        errDetails = ` | ${error.message}${config.isDevelopment ? `\n${error.stack}` : ''}`;
      } else {
        errDetails = ` | ${JSON.stringify(sanitize(error))}`;
      }
    }
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}${errDetails}`);
  },

  sanitize,
};

module.exports = logger;
