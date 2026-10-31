const logger = require('../utils/logger');

/**
 * HTTP Request Logging Middleware
 * Intercepts requests and logs method, route, status code, latency, and sanitized payloads.
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, query, body } = req;
    const statusCode = res.statusCode;

    const meta = {
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
    };

    if (query && Object.keys(query).length > 0) {
      meta.query = logger.sanitize(query);
    }

    if (body && Object.keys(body).length > 0 && ['POST', 'PUT', 'PATCH'].includes(method)) {
      meta.body = logger.sanitize(body);
    }

    const logLine = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    if (statusCode >= 500) {
      logger.error(logLine, meta);
    } else if (statusCode >= 400) {
      logger.warn(logLine, meta);
    } else {
      logger.info(logLine, meta);
    }
  });

  next();
};

module.exports = requestLogger;
