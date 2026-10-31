/**
 * Standardized HTTP Response Formatters
 */

/**
 * Format and send a successful HTTP response
 * @param {import('express').Response} res - Express response object
 * @param {object} options
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {string} [options.message] - Optional human-readable message
 * @param {any} [options.data] - Main payload data
 * @param {object} [options.meta] - Optional pagination or metadata
 */
const sendSuccess = (res, { statusCode = 200, message = null, data = null, meta = null, pagination = null, summary = null } = {}) => {
  const payload = { success: true };
  if (message !== null) payload.message = message;
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  if (pagination !== null) payload.pagination = pagination;
  if (summary !== null) payload.summary = summary;
  return res.status(statusCode).json(payload);
};

/**
 * Format and send a standardized HTTP error response
 * @param {import('express').Response} res - Express response object
 * @param {object} options
 * @param {number} [options.statusCode=500] - HTTP status code
 * @param {string} [options.message='Internal Server Error'] - Error message
 * @param {string} [options.code='INTERNAL_ERROR'] - Machine-readable error code
 * @param {any} [options.details] - Detailed validation or contextual error items
 * @param {string} [options.stack] - Stack trace (development only)
 */
const sendError = (res, {
  statusCode = 500,
  message = 'Internal Server Error',
  code = 'INTERNAL_ERROR',
  details = null,
  stack = null,
} = {}) => {
  const payload = {
    success: false,
    message, // Preserves top-level message for contract compatibility
    error: {
      code,
      message,
      ...(details !== null && { details }),
    },
    ...(stack && { stack }),
  };
  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError,
};
