const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  validateRecordPayment,
  validateReversePayment,
  validateSupplierPayment,
} = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/payments/summary
 * @desc    Get aggregate collection metrics and payment mode breakdowns
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/summary',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => paymentController.getPaymentSummary(req, res, next)
);

/**
 * @route   GET /api/payments/suppliers
 * @desc    List wholesale supplier payment disbursements
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/suppliers',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => paymentController.listSupplierPayments(req, res, next)
);

/**
 * @route   GET /api/payments/suppliers/:id
 * @desc    Get wholesale supplier payment disbursement voucher
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/suppliers/:id',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => paymentController.getSupplierPaymentById(req, res, next)
);

/**
 * @route   POST /api/payments/suppliers
 * @desc    Record wholesale supplier payment disbursement
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/suppliers',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateSupplierPayment),
  (req, res, next) => paymentController.recordSupplierPayment(req, res, next)
);

/**
 * @route   GET /api/payments
 * @desc    List customer payment receipts with date filtering and pagination
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => paymentController.listPayments(req, res, next)
);

/**
 * @route   GET /api/payments/:id
 * @desc    Retrieve single customer payment receipt with invoice & customer references
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => paymentController.getPaymentById(req, res, next)
);

/**
 * @route   POST /api/payments
 * @desc    Record customer payment (direct invoice, multi-invoice, auto-allocation, or on-account)
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateRecordPayment),
  (req, res, next) => paymentController.recordPayment(req, res, next)
);

/**
 * @route   POST /api/payments/:id/reverse
 * @desc    Auditable reversal of an erroneous or bounced payment receipt (Admin only)
 * @access  Protected (Admin only)
 */
router.post(
  '/:id/reverse',
  authenticate,
  authorize('ADMIN'),
  validate(validateReversePayment),
  (req, res, next) => paymentController.reversePayment(req, res, next)
);

module.exports = router;
