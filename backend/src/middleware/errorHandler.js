const config = require('../config');
const logger = require('../utils/logger');
const { sendError } = require('../utils/response');
const { AppError } = require('../utils/appError');

/**
 * Centralized Error-Handling Middleware
 * Catches all errors forwarded via next(err) and guarantees a consistent, safe JSON response.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;

  // Handle specific PostgreSQL database error codes safely
  if (err.code === '23505') {
    // Unique violation
    statusCode = 409;
    code = 'UNIQUE_VIOLATION';
    message = 'A record with this identifier already exists.';
  } else if (err.code === '23503') {
    // Foreign key violation
    statusCode = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = 'Referenced entity does not exist or cannot be deleted.';
  } else if (err.code === '23514') {
    // Check constraint violation
    statusCode = 400;
    code = 'CONSTRAINT_VIOLATION';
    message = 'Data failed business rule check constraint.';
  } else if (err.name === 'SyntaxError' && err.status === 400) {
    // Malformed JSON request body
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON payload provided.';
  }

  // Log error with appropriate severity
  if (statusCode >= 500) {
    logger.error(`[Unhandled Exception] ${req.method} ${req.originalUrl}:`, err);
    if (config.isProduction) {
      message = 'Internal Server Error. Please contact support.';
    }
  } else {
    logger.warn(`[Client Error ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`, details);
  }

  // Send standardized response
  return sendError(res, {
    statusCode,
    message,
    code,
    details,
    stack: config.isDevelopment ? err.stack : undefined,
  });
};

module.exports = errorHandler;
