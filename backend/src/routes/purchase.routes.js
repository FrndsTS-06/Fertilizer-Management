const express = require('express');
const purchaseController = require('../controllers/purchase.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  validateCreatePurchase,
  validateSupplierPayment,
} = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/purchases/summary
 * @desc    Get aggregate accounts payable & purchase summary metrics
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/summary',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => purchaseController.getSummary(req, res, next)
);

/**
 * @route   GET /api/purchases
 * @desc    List purchases with multi-field filters, sorting, and pagination
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => purchaseController.listPurchases(req, res, next)
);

/**
 * @route   GET /api/purchases/:id
 * @desc    Get single purchase order detail with line items and disbursements
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => purchaseController.getPurchaseById(req, res, next)
);

/**
 * @route   POST /api/purchases
 * @desc    Create purchase inward order with line items, atomically increasing stock
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateCreatePurchase),
  (req, res, next) => purchaseController.createPurchase(req, res, next)
);

/**
 * @route   POST /api/purchases/:id/payments
 * @desc    Record an accounts payable disbursement toward a purchase invoice
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/:id/payments',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateSupplierPayment),
  (req, res, next) => purchaseController.recordPayment(req, res, next)
);

/**
 * @route   GET /api/purchases/:id/payments
 * @desc    List all payments disbursed toward a purchase invoice
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/:id/payments',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => purchaseController.getPurchasePayments(req, res, next)
);

module.exports = router;
