const inventoryService = require('../services/inventory.service');
const { sendSuccess } = require('../utils/response');
const { BadRequestError, NotFoundError } = require('../utils/appError');
const validators = require('../validators');

/**
 * Inventory HTTP Controller
 * Handles incoming REST requests for inventory metrics, stock adjustments,
 * audit movements, valuations, and double-entry reconciliations.
 */
class InventoryController {
  /**
   * GET /api/inventory/summary
   * Aggregate warehouse metrics
   */
  async getSummary(req, res, next) {
    try {
      const summary = await inventoryService.getSummary();
      return sendSuccess(res, {
        statusCode: 200,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/inventory/movements
   * Audit ledger history of stock movements
   */
  async getMovements(req, res, next) {
    try {
      const result = await inventoryService.getMovements(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: result.movements,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/inventory/adjustments
   * Adjust stock levels with mandatory reason (ADD, REDUCE, CORRECT)
   */
  async createAdjustment(req, res, next) {
    try {
      const validationErrors = validators.validateStockAdjustment(req);
      if (validationErrors.length > 0) {
        throw new BadRequestError(validationErrors[0], validationErrors);
      }

      const result = await inventoryService.adjustStock(req.user, req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: result.message,
        data: {
          product: result.product,
          movement: result.movement,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/inventory/inward
   * Inward stock receiving with mandatory supplier/order reference
   */
  async recordInward(req, res, next) {
    try {
      const validationErrors = validators.validateStockInward(req);
      if (validationErrors.length > 0) {
        throw new BadRequestError(validationErrors[0], validationErrors);
      }

      const result = await inventoryService.recordInward(req.user, req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: result.message,
        data: {
          product: result.product,
          movement: result.movement,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/inventory/outward
   * Outward stock dispatch with reason and reference
   */
  async recordOutward(req, res, next) {
    try {
      const validationErrors = validators.validateStockOutward(req);
      if (validationErrors.length > 0) {
        throw new BadRequestError(validationErrors[0], validationErrors);
      }

      const result = await inventoryService.recordOutward(req.user, req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: result.message,
        data: {
          product: result.product,
          movement: result.movement,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/inventory/low-stock
   * Query products at or below minimum threshold
   */
  async getLowStock(req, res, next) {
    try {
      const result = await inventoryService.getLowStock(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: result.products,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/inventory/valuation
   * Real-time stock valuation based on approved cost price model
   */
  async getValuation(req, res, next) {
    try {
      const result = await inventoryService.getValuation(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: result.products,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/inventory/reconciliation
   * Physical warehouse stock vs movement audit ledger reconciliation
   */
  async getReconciliation(req, res, next) {
    try {
      const result = await inventoryService.getReconciliation(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: result.products,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/inventory/reconciliation/:productId
   * Single product stock audit reconciliation
   */
  async getProductReconciliation(req, res, next) {
    try {
      const { productId } = req.params;
      const result = await inventoryService.getReconciliation({ productId });
      if (!result.products || result.products.length === 0) {
        throw new NotFoundError(`Product '${productId}' not found in audit register`);
      }
      return sendSuccess(res, {
        statusCode: 200,
        data: result.products[0],
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventoryController();
