const productService = require('../services/product.service');
const { sendSuccess } = require('../utils/response');

/**
 * Product HTTP Controller
 * Handles HTTP requests, parameter extraction, and standardized responses for products.
 */
class ProductController {
  /**
   * GET /api/products
   * List products with search, category/status filters, pagination, and sorting
   */
  async listProducts(req, res, next) {
    try {
      const { products, pagination } = await productService.listProducts(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: products,
        pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/products/:id
   * Get single product detail by UUID or SKU code
   */
  async getProductById(req, res, next) {
    try {
      const product = await productService.getProduct(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/products
   * Create new product with initial stock inward (Admin only)
   */
  async createProduct(req, res, next) {
    try {
      const product = await productService.createProduct(req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Product created successfully with approved initial stock audit',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/products/:id or PUT /api/products/:id
   * Update non-stock product attributes (Admin only)
   */
  async updateProduct(req, res, next) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/products/:id or POST /api/products/:id/archive
   * Archive / Soft-delete product, preserving historical transactions (Admin only)
   */
  async archiveProduct(req, res, next) {
    try {
      const result = await productService.archiveProduct(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result.product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/products/:id/restore
   * Restore an archived product (Admin only)
   */
  async restoreProduct(req, res, next) {
    try {
      const result = await productService.restoreProduct(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result.product,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
