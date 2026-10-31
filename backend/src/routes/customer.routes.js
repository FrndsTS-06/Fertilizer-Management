const express = require('express');
const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateCreateCustomer, validateUpdateCustomer, validateRecordPayment } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/customers
 * @desc    List all customers with dues/village filters, dashboard summary, and pagination
 * @access  Public / Staff / Admin
 */
router.get('/', (req, res, next) => customerController.listCustomers(req, res, next));

/**
 * @route   GET /api/customers/:id
 * @desc    Get single customer profile with live Khata balance
 * @access  Public / Staff / Admin
 */
router.get('/:id', (req, res, next) => customerController.getCustomerById(req, res, next));

/**
 * @route   POST /api/customers
 * @desc    Register a new customer account
 * @access  Protected (Staff or Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateCreateCustomer),
  (req, res, next) => customerController.createCustomer(req, res, next)
);

/**
 * @route   PATCH /api/customers/:id
 * @desc    Update customer profile details
 * @access  Protected (Staff or Admin)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateUpdateCustomer),
  (req, res, next) => customerController.updateCustomer(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateUpdateCustomer),
  (req, res, next) => customerController.updateCustomer(req, res, next)
);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Archive / Soft-delete customer (preserves historical invoices and payments)
 * @access  Protected (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => customerController.archiveCustomer(req, res, next)
);

/**
 * @route   POST /api/customers/:id/archive
 * @desc    Explicit archive endpoint
 * @access  Protected (Admin / Staff)
 */
router.post(
  '/:id/archive',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => customerController.archiveCustomer(req, res, next)
);

/**
 * @route   POST /api/customers/:id/restore
 * @desc    Restore archived customer
 * @access  Protected (Admin only)
 */
router.post(
  '/:id/restore',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => customerController.restoreCustomer(req, res, next)
);

/**
 * @route   GET /api/customers/:id/balance
 * @desc    Retrieve verified customer balance and unpaid invoice breakdown
 * @access  Public / Staff / Admin
 */
router.get('/:id/balance', (req, res, next) => customerController.getCustomerBalance(req, res, next));

/**
 * @route   GET /api/customers/:id/sales
 * @desc    Retrieve customer sales invoices with line items
 * @access  Public / Staff / Admin
 */
router.get('/:id/sales', (req, res, next) => customerController.getCustomerSales(req, res, next));

/**
 * @route   GET /api/customers/:id/payments
 * @desc    Retrieve customer payment receipts
 * @access  Public / Staff / Admin
 */
router.get('/:id/payments', (req, res, next) => customerController.getCustomerPayments(req, res, next));

/**
 * @route   POST /api/customers/:id/payments
 * @desc    Record payment for this customer (allocated, auto-allocated, or on-account)
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/:id/payments',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => {
    req.body.customerId = req.params.id;
    next();
  },
  validate(validateRecordPayment),
  (req, res, next) => {
    const paymentController = require('../controllers/payment.controller');
    return paymentController.recordPayment(req, res, next);
  }
);

/**
 * @route   GET /api/customers/:id/ledger
 * @desc    Retrieve unified chronological transaction ledger statement
 * @access  Public / Staff / Admin
 */
router.get('/:id/ledger', (req, res, next) => customerController.getCustomerLedger(req, res, next));

module.exports = router;

