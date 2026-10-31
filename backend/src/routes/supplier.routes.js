const express = require('express');
const supplierController = require('../controllers/supplier.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateCreateSupplier, validateUpdateSupplier } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/suppliers
 * @desc    List all suppliers with search, active status filter, and pagination
 * @access  Public / Staff / Admin
 */
router.get('/', (req, res, next) => supplierController.listSuppliers(req, res, next));

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get single supplier detail by UUID or Name
 * @access  Public / Staff / Admin
 */
router.get('/:id', (req, res, next) => supplierController.getSupplierById(req, res, next));

/**
 * @route   POST /api/suppliers
 * @desc    Create new wholesale supplier
 * @access  Protected (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(validateCreateSupplier),
  (req, res, next) => supplierController.createSupplier(req, res, next)
);

/**
 * @route   PATCH /api/suppliers/:id
 * @desc    Update supplier attributes
 * @access  Protected (Admin only)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(validateUpdateSupplier),
  (req, res, next) => supplierController.updateSupplier(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(validateUpdateSupplier),
  (req, res, next) => supplierController.updateSupplier(req, res, next)
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Archive / Soft-delete supplier (preserves historical purchase records)
 * @access  Protected (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => supplierController.archiveSupplier(req, res, next)
);

/**
 * @route   POST /api/suppliers/:id/archive
 * @desc    Explicit archive endpoint
 * @access  Protected (Admin only)
 */
router.post(
  '/:id/archive',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => supplierController.archiveSupplier(req, res, next)
);

/**
 * @route   POST /api/suppliers/:id/restore
 * @desc    Restore archived supplier
 * @access  Protected (Admin only)
 */
router.post(
  '/:id/restore',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => supplierController.restoreSupplier(req, res, next)
);

/**
 * @route   GET /api/suppliers/:id/purchases
 * @desc    List purchase orders for this supplier
 * @access  Public / Staff / Admin
 */
router.get('/:id/purchases', (req, res, next) => supplierController.getSupplierPurchases(req, res, next));

module.exports = router;
