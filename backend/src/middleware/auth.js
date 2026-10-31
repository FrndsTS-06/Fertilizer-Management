const authService = require('../services/auth.service');
const { UnauthorizedError, ForbiddenError } = require('../utils/appError');

/**
 * Authentication Middleware
 * Validates the JWT Bearer token from the Authorization header and attaches the user profile to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim().length === 0) {
      throw new UnauthorizedError('Authentication token is missing');
    }

    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Authorization Middleware
 * Enforces that req.user possesses at least one of the required roles.
 * 
 * @param {...string} allowedRoles - e.g. 'ADMIN', 'STAFF'
 * @returns {import('express').RequestHandler}
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Access requires one of: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
