const categoryService = require('../services/category.service');
const { sendSuccess } = require('../utils/response');

/**
 * Category HTTP Controller
 */
class CategoryController {
  /**
   * GET /api/categories
   * Retrieve all categories (supports ?search=&is_active=)
   */
  async getAllCategories(req, res, next) {
    try {
      const categories = await categoryService.getAllCategories(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/categories/:id
   * Retrieve single category detail
   */
  async getCategoryById(req, res, next) {
    try {
      const category = await categoryService.getCategoryById(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/categories
   * Create new category (Admin only)
   */
  async createCategory(req, res, next) {
    try {
      const category = await categoryService.createCategory(req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/categories/:id or PUT /api/categories/:id
   * Update category (Admin only)
   */
  async updateCategory(req, res, next) {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.body);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Category updated successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/categories/:id
   * Archive / Delete category (Admin only)
   */
  async deleteCategory(req, res, next) {
    try {
      const result = await categoryService.deleteCategory(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result.category,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
