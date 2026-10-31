const inventoryRepository = require('../repositories/inventory.repository');
const productRepository = require('../repositories/product.repository');
const { BadRequestError, NotFoundError } = require('../utils/appError');
const validators = require('../validators');

/**
 * Inventory Service
 * Coordinates inventory transactions, concurrency control, valuation reporting,
 * low-stock alerts, and double-entry reconciliation between physical stock and movement ledgers.
 */
class InventoryService {
  /**
   * Get warehouse aggregate inventory summary
   * @returns {Promise<object>}
   */
  async getSummary() {
    return inventoryRepository.getSummary();
  }

  /**
   * Get stock movement audit history with rich filters
   * @param {object} query
   * @returns {Promise<{ movements: Array<object>, pagination: object }>}
   */
  async getMovements(query = {}) {
    const {
      productId,
      product_id,
      productCode,
      type,
      movementType,
      action,
      actionType,
      startDate,
      start_date,
      endDate,
      end_date,
      search,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const targetProduct = productId || product_id || productCode || null;
    const targetType = type || movementType || null;
    const targetAction = action || actionType || null;
    const targetStart = startDate || start_date || null;
    const targetEnd = endDate || end_date || null;

    const [movements, total] = await Promise.all([
      inventoryRepository.getMovements({
        productId: targetProduct,
        type: targetType,
        action: targetAction,
        startDate: targetStart,
        endDate: targetEnd,
        search,
        limit: limitNum,
        offset,
        sortBy,
        sortOrder,
      }),
      inventoryRepository.countMovements({
        productId: targetProduct,
        type: targetType,
        action: targetAction,
        startDate: targetStart,
        endDate: targetEnd,
        search,
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Adjust product stock level (ADD, REDUCE, CORRECT)
   * Mandatory audit reason and user authentication required
   * 
   * @param {object|null} user - Authenticated user context
   * @param {object} data - Adjustment parameters
   * @returns {Promise<{ message: string, product: object, movement: object }>}
   */
  async adjustStock(user, data) {
    const {
      productId,
      product_id,
      productCode,
      productName,
      operation = 'ADD',
      quantity,
      reason,
      reference,
      referenceNo,
      type,
      costPrice,
      unitCost,
    } = data;

    const targetProduct = productId || product_id || productCode || productName;
    if (!targetProduct || typeof targetProduct !== 'string' || !targetProduct.trim()) {
      throw new BadRequestError('Product identifier (productId, productCode, or productName) is required');
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new BadRequestError('Stock adjustment reason is mandatory and cannot be empty');
    }

    const op = String(operation || 'ADD').trim().toUpperCase();
    if (!['ADD', 'REDUCE', 'CORRECT'].includes(op)) {
      throw new BadRequestError("Invalid operation. Operation must be one of: 'ADD', 'REDUCE', 'CORRECT'");
    }

    if (quantity === undefined || quantity === null || quantity === '') {
      throw new BadRequestError('Quantity is required');
    }

    const numQty = Number(quantity);
    if (isNaN(numQty)) {
      throw new BadRequestError('Quantity must be a valid number');
    }

    if (op === 'CORRECT') {
      if (numQty < 0) {
        throw new BadRequestError('Target stock level cannot be negative');
      }
    } else {
      if (numQty <= 0) {
        throw new BadRequestError('Adjustment quantity must be a positive number greater than 0');
      }
    }

    const newCp = costPrice !== undefined ? costPrice : unitCost;
    if (newCp !== undefined && newCp !== null && newCp !== '') {
      const numCp = Number(newCp);
      if (isNaN(numCp) || numCp < 0) {
        throw new BadRequestError('Cost price must be a non-negative number');
      }
    }

    const ref = reference || referenceNo || null;

    const userContext = user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.fullName || user.full_name || user.email,
        }
      : null;

    const result = await inventoryRepository.adjustStock({
      productId: targetProduct.trim(),
      operation: op,
      quantity: numQty,
      reason: reason.trim(),
      referenceNo: ref,
      customType: type || null,
      newCostPrice: newCp !== undefined && newCp !== null ? Number(newCp) : null,
      userContext,
    });

    return {
      message: `Stock successfully adjusted for ${result.product.name} (${result.product.code})`,
      product: result.product,
      movement: result.movement,
    };
  }

  /**
   * Record stock inward movement (stock addition / purchase receiving)
   * 
   * @param {object|null} user
   * @param {object} data
   * @returns {Promise<{ message: string, product: object, movement: object }>}
   */
  async recordInward(user, data) {
    const { productId, product_id, productCode, quantity, reason, reference, referenceNo, costPrice, unitCost } = data;

    const targetProduct = productId || product_id || productCode;
    if (!targetProduct || typeof targetProduct !== 'string' || !targetProduct.trim()) {
      throw new BadRequestError('Product identifier is required');
    }

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      throw new BadRequestError('Inward quantity must be a positive number greater than 0');
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new BadRequestError('Stock inward reason is mandatory');
    }

    const ref = reference || referenceNo;
    if (!ref || typeof ref !== 'string' || !ref.trim()) {
      throw new BadRequestError('Source reference (e.g. invoice or PO number) is required for inward stock traceability');
    }

    return this.adjustStock(user, {
      productId: targetProduct,
      operation: 'ADD',
      quantity: Number(quantity),
      reason: reason.trim(),
      referenceNo: ref.trim(),
      type: 'PURCHASE',
      costPrice,
      unitCost,
    });
  }

  /**
   * Record stock outward movement (stock dispatch / retail issue / write-off)
   * 
   * @param {object|null} user
   * @param {object} data
   * @returns {Promise<{ message: string, product: object, movement: object }>}
   */
  async recordOutward(user, data) {
    const { productId, product_id, productCode, quantity, reason, reference, referenceNo, movementType } = data;

    const targetProduct = productId || product_id || productCode;
    if (!targetProduct || typeof targetProduct !== 'string' || !targetProduct.trim()) {
      throw new BadRequestError('Product identifier is required');
    }

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      throw new BadRequestError('Outward quantity must be a positive number greater than 0');
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new BadRequestError('Stock outward reason is mandatory');
    }

    const ref = reference || referenceNo || null;

    return this.adjustStock(user, {
      productId: targetProduct,
      operation: 'REDUCE',
      quantity: Number(quantity),
      reason: reason.trim(),
      referenceNo: ref,
      type: movementType || 'ADJUSTMENT',
    });
  }

  /**
   * Query products currently at or below minimum threshold
   * @param {object} query
   * @returns {Promise<{ products: Array<object>, summary: object, pagination: object }>}
   */
  async getLowStock(query = {}) {
    const { threshold, categoryId, category, status = 'all', page = 1, limit = 50, sortBy = 'deficit', sortOrder = 'DESC' } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const targetCategory = categoryId || category || null;

    const [products, total] = await Promise.all([
      inventoryRepository.getLowStock({
        threshold,
        categoryId: targetCategory,
        status,
        limit: limitNum,
        offset,
        sortBy,
        sortOrder,
      }),
      inventoryRepository.countLowStock({
        threshold,
        categoryId: targetCategory,
        status,
      }),
    ]);

    const outOfStockCount = products.filter((p) => Number(p.stock) <= 0).length;
    const lowStockCount = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minThreshold)).length;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      summary: {
        totalAlerts: total,
        outOfStockCount,
        lowStockCount,
      },
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Inventory stock valuation based on approved costing method (v_inventory_valuation)
   * @param {object} query
   * @returns {Promise<{ summary: object, products: Array<object>, pagination: object }>}
   */
  async getValuation(query = {}) {
    const { categoryId, category, search, page = 1, limit = 50, sortBy = 'total_cost_valuation', sortOrder = 'DESC' } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const targetCategory = categoryId || category || null;

    const result = await inventoryRepository.getValuation({
      categoryId: targetCategory,
      search,
      limit: limitNum,
      offset,
      sortBy,
      sortOrder,
    });

    const totalPages = Math.ceil(result.total / limitNum) || 1;

    return {
      summary: result.summary,
      products: result.products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Inventory double-entry reconciliation between physical stock and movement ledger
   * @param {object} query
   * @returns {Promise<{ summary: object, products: Array<object>, pagination: object }>}
   */
  async getReconciliation(query = {}) {
    const { productId, product_id, productCode, status = 'all', page = 1, limit = 50 } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const targetProduct = productId || product_id || productCode || null;

    const result = await inventoryRepository.getReconciliation({
      productId: targetProduct,
      status,
      limit: limitNum,
      offset,
    });

    const totalPages = Math.ceil(result.total / limitNum) || 1;

    return {
      summary: result.summary,
      products: result.products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }
}

module.exports = new InventoryService();
