const express = require('express');
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateCreateProduct, validateUpdateProduct } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    List products with search, category/status filters, pagination, and sorting
 * @access  Public / Staff / Admin
 */
router.get('/', (req, res, next) => productController.listProducts(req, res, next));

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by UUID or SKU code
 * @access  Public / Staff / Admin
 */
router.get('/:id', (req, res, next) => productController.getProductById(req, res, next));

/**
 * @route   POST /api/products
 * @desc    Create new product with initial stock linked to inventory movements
 * @access  Protected (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(validateCreateProduct),
  (req, res, next) => productController.createProduct(req, res, next)
);

/**
 * @route   PATCH /api/products/:id
 * @desc    Update non-stock product attributes
 * @access  Protected (Admin only)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(validateUpdateProduct),
  (req, res, next) => productController.updateProduct(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(validateUpdateProduct),
  (req, res, next) => productController.updateProduct(req, res, next)
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Archive / Soft-delete product (preserves historical references)
 * @access  Protected (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => productController.archiveProduct(req, res, next)
);

/**
 * @route   POST /api/products/:id/archive
 * @desc    Explicit archive endpoint
 * @access  Protected (Admin only)
 */
router.post(
  '/:id/archive',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => productController.archiveProduct(req, res, next)
);

/**
 * @route   POST /api/products/:id/restore
 * @desc    Restore archived product
 * @access  Protected (Admin only)
 */
router.post(
  '/:id/restore',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => productController.restoreProduct(req, res, next)
);

module.exports = router;
