const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateCreateCategory, validateUpdateCategory } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    List all categories (supports ?search=&is_active=)
 * @access  Public / Staff / Admin
 */
router.get('/', (req, res, next) => categoryController.getAllCategories(req, res, next));

/**
 * @route   GET /api/categories/:id
 * @desc    Get category detail by ID
 * @access  Public / Staff / Admin
 */
router.get('/:id', (req, res, next) => categoryController.getCategoryById(req, res, next));

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Protected (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(validateCreateCategory),
  (req, res, next) => categoryController.createCategory(req, res, next)
);

/**
 * @route   PATCH /api/categories/:id
 * @desc    Update category attributes
 * @access  Protected (Admin only)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(validateUpdateCategory),
  (req, res, next) => categoryController.updateCategory(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(validateUpdateCategory),
  (req, res, next) => categoryController.updateCategory(req, res, next)
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Archive / Delete category
 * @access  Protected (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => categoryController.deleteCategory(req, res, next)
);

module.exports = router;
