const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { validateLogin } = require('../validators');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials and issue signed JWT token
 * @access  Public (Rate-limited)
 */
router.post(
  '/login',
  loginRateLimiter,
  validate(validateLogin),
  (req, res, next) => authController.login(req, res, next)
);

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve profile of currently authenticated user
 * @access  Protected (Requires valid JWT)
 */
router.get(
  '/me',
  authenticate,
  (req, res, next) => authController.getMe(req, res, next)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Client session termination confirmation
 * @access  Protected (Requires valid JWT)
 */
router.post(
  '/logout',
  authenticate,
  (req, res) => authController.logout(req, res)
);

/**
 * Role-Based Diagnostic Endpoints
 */
router.get(
  '/admin-only',
  authenticate,
  authorize('ADMIN'),
  (req, res) => authController.adminAccessCheck(req, res)
);

router.get(
  '/staff-only',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res) => authController.staffAccessCheck(req, res)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset or change authenticated user's password
 * @access  Protected
 */
router.post(
  '/reset-password',
  authenticate,
  (req, res, next) => authController.changePassword(req, res, next)
);

/**
 * @route   GET /api/auth/store-info
 * @desc    Get store profile (name, GSTIN, contact)
 * @access  Public / Protected
 */
router.get(
  '/store-info',
  (req, res, next) => authController.getStoreInfo(req, res, next)
);

/**
 * @route   PUT /api/auth/store-info
 * @desc    Update store profile (name, GSTIN, contact)
 * @access  Protected
 */
router.put(
  '/store-info',
  authenticate,
  (req, res, next) => authController.updateStoreInfo(req, res, next)
);

/**
 * @route   POST /api/auth/clear-store-data
 * @desc    Clear store profile details
 * @access  Protected
 */
router.post(
  '/clear-store-data',
  authenticate,
  (req, res, next) => authController.clearStoreData(req, res, next)
);

module.exports = router;
