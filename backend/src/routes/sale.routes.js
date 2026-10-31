const express = require('express');
const saleController = require('../controllers/sale.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateCreateSale, validateRecordPayment } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/sales/summary
 * @desc    Get aggregate sales metrics and revenue breakdown
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/summary',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => saleController.getSaleSummary(req, res, next)
);

/**
 * @route   GET /api/sales
 * @desc    List sales invoices with date filtering, status, and pagination
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => saleController.listSales(req, res, next)
);

/**
 * @route   DELETE /api/sales/receipts/clear-all
 * @desc    Clear customer receipts (sales invoices and payment receipts) and restore inventory
 * @access  Protected (Staff / Admin)
 */
router.delete(
  '/receipts/clear-all',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => saleController.clearCustomerReceipts(req, res, next)
);

router.post(
  '/receipts/clear-all',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => saleController.clearCustomerReceipts(req, res, next)
);

/**
 * @route   GET /api/sales/:id
 * @desc    Retrieve print-ready sales invoice by UUID or invoice number
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => saleController.getSaleById(req, res, next)
);

/**
 * @route   POST /api/sales
 * @desc    Create POS retail sale, deduct inventory, and record payments atomically
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateCreateSale),
  (req, res, next) => saleController.createSale(req, res, next)
);

/**
 * @route   POST /api/sales/:id/payments
 * @desc    Record invoice payment against a credit invoice
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/:id/payments',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateRecordPayment),
  (req, res, next) => {
    const paymentController = require('../controllers/payment.controller');
    return paymentController.recordInvoicePayment(req, res, next);
  }
);

/**
 * @route   GET /api/sales/:id/payments
 * @desc    List payment receipts allocated to this sales invoice
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/:id/payments',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => {
    req.query.saleId = req.params.id;
    const paymentController = require('../controllers/payment.controller');
    return paymentController.listPayments(req, res, next);
  }
);

module.exports = router;

