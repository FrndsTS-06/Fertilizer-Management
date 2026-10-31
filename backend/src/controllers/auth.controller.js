const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

/**
 * Authentication Controller
 * Handles HTTP requests and responses for login, session status, and user profile retrieval.
 */
class AuthController {
  /**
   * POST /api/auth/login
   * Authenticate user credentials and return signed JWT token
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await authService.login(email, password, clientIp);

      return sendSuccess(res, {
        statusCode: 200,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Retrieve profile of currently authenticated user
   */
  async getMe(req, res, next) {
    try {
      return sendSuccess(res, {
        statusCode: 200,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Client-side session termination instruction
   */
  logout(req, res) {
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Logged out successfully',
    });
  }

  /**
   * Diagnostic test endpoints for role verification
   */
  adminAccessCheck(req, res) {
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin authorization verified',
      data: {
        accessibleBy: 'ADMIN',
        currentUser: req.user.email,
        role: req.user.role,
      },
    });
  }

  staffAccessCheck(req, res) {
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Staff authorization verified',
      data: {
        accessibleBy: 'ADMIN, STAFF',
        currentUser: req.user.email,
        role: req.user.role,
      },
    });
  }

  /**
   * POST /api/auth/reset-password
   * Reset / Change authenticated user's password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/store-info
   * Retrieve store configuration (Shop name, GSTIN, Email, etc.)
   */
  async getStoreInfo(req, res, next) {
    try {
      const info = await authService.getStoreInfo();
      return sendSuccess(res, {
        statusCode: 200,
        data: info,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/auth/store-info
   * Update store configuration (Shop name, GSTIN, Email)
   */
  async updateStoreInfo(req, res, next) {
    try {
      const { storeName, gstin, email } = req.body;
      const result = await authService.updateStoreInfo({
        storeName,
        gstin,
        email,
        userId: req.user?.id,
      });
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Store profile details updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/clear-store-data
   * Clear store profile details
   */
  async clearStoreData(req, res, next) {
    try {
      const result = await authService.clearStoreData();
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
