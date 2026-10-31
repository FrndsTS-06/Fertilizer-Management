const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  validateStockAdjustment,
  validateStockInward,
  validateStockOutward,
} = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/inventory/summary
 * @desc    Get aggregate warehouse inventory metrics
 * @access  Public / Staff / Admin
 */
router.get('/summary', (req, res, next) => inventoryController.getSummary(req, res, next));

/**
 * @route   GET /api/inventory/movements
 * @desc    Get stock movements audit history with product and date filters
 * @access  Public / Staff / Admin
 */
router.get('/movements', (req, res, next) => inventoryController.getMovements(req, res, next));

/**
 * @route   GET /api/inventory/low-stock
 * @desc    Query products currently at or below configured thresholds
 * @access  Public / Staff / Admin
 */
router.get('/low-stock', (req, res, next) => inventoryController.getLowStock(req, res, next));

/**
 * @route   GET /api/inventory/valuation
 * @desc    Calculate real-time stock valuation based on approved cost price method
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/valuation',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => inventoryController.getValuation(req, res, next)
);

/**
 * @route   GET /api/inventory/reconciliation
 * @desc    Double-entry physical stock vs movement ledger reconciliation report
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/reconciliation',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => inventoryController.getReconciliation(req, res, next)
);

/**
 * @route   GET /api/inventory/reconciliation/:productId
 * @desc    Single product stock audit reconciliation status
 * @access  Protected (Staff / Admin)
 */
router.get(
  '/reconciliation/:productId',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  (req, res, next) => inventoryController.getProductReconciliation(req, res, next)
);

/**
 * @route   POST /api/inventory/adjustments
 * @desc    Execute stock adjustment (ADD, REDUCE, CORRECT) with mandatory audit reason
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/adjustments',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateStockAdjustment),
  (req, res, next) => inventoryController.createAdjustment(req, res, next)
);

/**
 * @route   POST /api/inventory/inward
 * @desc    Record stock inward receiving with mandatory purchase/supplier reference
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/inward',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateStockInward),
  (req, res, next) => inventoryController.recordInward(req, res, next)
);

/**
 * @route   POST /api/inventory/outward
 * @desc    Record stock outward dispatch with source reference
 * @access  Protected (Staff / Admin)
 */
router.post(
  '/outward',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(validateStockOutward),
  (req, res, next) => inventoryController.recordOutward(req, res, next)
);

module.exports = router;
