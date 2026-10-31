const config = require('../config');
const { sendError } = require('../utils/response');

/**
 * In-memory sliding-window store for rate limiting
 * Maps key -> array of attempt timestamps (ms)
 */
const attemptsMap = new Map();

// Periodic cleanup of stale attempts every 10 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = config.rateLimit.loginWindowMs;
  for (const [key, timestamps] of attemptsMap.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < windowMs);
    if (validTimestamps.length === 0) {
      attemptsMap.delete(key);
    } else {
      attemptsMap.set(key, validTimestamps);
    }
  }
}, 10 * 60 * 1000).unref(); // .unref() ensures timer doesn't hold open test runs

/**
 * Rate limiting middleware for authentication endpoints
 */
const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const key = `login:${ip}`;
  const now = Date.now();
  const windowMs = config.rateLimit.loginWindowMs;
  const maxAttempts = config.rateLimit.loginMaxAttempts;

  let timestamps = attemptsMap.get(key) || [];
  // Filter out timestamps outside the active window
  timestamps = timestamps.filter(t => now - t < windowMs);

  if (timestamps.length >= maxAttempts) {
    const oldest = timestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    res.setHeader('Retry-After', retryAfterSec);

    return sendError(res, {
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
      message: `Too many login attempts from this address. Please try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
    });
  }

  // Record this attempt
  timestamps.push(now);
  attemptsMap.set(key, timestamps);

  next();
};

/**
 * Reset rate limit counter for a specific IP (e.g., after successful login or in tests)
 * @param {string} ip
 */
const resetRateLimit = (ip) => {
  attemptsMap.delete(`login:${ip}`);
};

module.exports = {
  loginRateLimiter,
  resetRateLimit,
};
