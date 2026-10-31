const BaseRepository = require('./base.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/appError');

/**
 * Inventory Repository
 * High-concurrency data-access layer for physical inventory audits, stock adjustments,
 * row-level lock concurrency controls, low-stock threshold queries, and double-entry reconciliations.
 */
class InventoryRepository extends BaseRepository {
  /**
   * Format stock movement database row with dual camelCase & snake_case support
   * @param {object} row
   * @returns {object|null}
   */
  formatMovement(row) {
    if (!row) return null;
    return {
      id: row.id,
      productId: row.product_id,
      product_id: row.product_id,
      productCode: row.product_code,
      product_code: row.product_code,
      productName: row.product_name,
      product_name: row.product_name,
      movementType: row.movement_type,
      movement_type: row.movement_type,
      type: row.movement_type,
      actionType: row.action_type,
      action_type: row.action_type,
      action: row.action_type,
      changeQty: Number(row.change_qty),
      change_qty: Number(row.change_qty),
      previousStock: Number(row.previous_stock),
      previous_stock: Number(row.previous_stock),
      newStock: Number(row.new_stock),
      new_stock: Number(row.new_stock),
      unit: row.unit,
      reason: row.reason,
      referenceNo: row.reference_no,
      reference_no: row.reference_no,
      reference: row.reference_no,
      createdAt: row.created_at,
      created_at: row.created_at,
    };
  }

  /**
   * Format product database row
   * @param {object} row
   * @returns {object|null}
   */
  formatProduct(row) {
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      categoryId: row.category_id,
      category_id: row.category_id,
      categoryName: row.category_name,
      category_name: row.category_name,
      brand: row.brand,
      packageType: row.package_type,
      package_type: row.package_type,
      packageSize: row.package_size,
      package_size: row.package_size,
      unit: row.unit,
      costPrice: Number(row.cost_price || 0),
      cost_price: Number(row.cost_price || 0),
      price: Number(row.price || 0),
      sellingPrice: Number(row.price || 0),
      selling_price: Number(row.price || 0),
      stock: Number(row.stock || 0),
      minThreshold: Number(row.min_threshold || 10),
      min_threshold: Number(row.min_threshold || 10),
      status: row.status,
      isActive: Boolean(row.is_active),
      is_active: Boolean(row.is_active),
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Insert a stock movement record within an ongoing transaction or pool client
   * @param {(text: string, params: Array) => Promise<any>} clientQuery
   * @param {object} movement
   * @returns {Promise<object>}
   */
  async recordMovement(clientQuery, movement) {
    const sql = `
      INSERT INTO stock_movements (
        product_id,
        product_code,
        product_name,
        movement_type,
        action_type,
        change_qty,
        previous_stock,
        new_stock,
        unit,
        reason,
        reference_no
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const params = [
      movement.productId,
      movement.productCode,
      movement.productName,
      movement.movementType,
      movement.actionType,
      movement.changeQty,
      movement.previousStock,
      movement.newStock,
      movement.unit,
      movement.reason,
      movement.referenceNo,
    ];

    const res = await clientQuery(sql, params);
    return this.formatMovement(res.rows[0]);
  }

  /**
   * Check if a movement with the same reference number and action type already exists for a product
   * Used to prevent duplicate movements from retries or double clicks
   * 
   * @param {(text: string, params: Array) => Promise<any>} clientQuery
   * @param {object} options
   * @returns {Promise<object|null>}
   */
  async findDuplicateMovement(clientQuery, { productId, referenceNo, actionType }) {
    if (!referenceNo || !referenceNo.trim()) return null;
    const sql = `
      SELECT id, reference_no, action_type, movement_type, change_qty, created_at
      FROM stock_movements
      WHERE product_id = $1 
        AND LOWER(TRIM(reference_no)) = LOWER(TRIM($2))
        AND action_type = $3
      LIMIT 1;
    `;
    const res = await clientQuery(sql, [productId, referenceNo.trim(), actionType]);
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  /**
   * Adjust product physical stock level within an atomic database transaction
   * Uses SELECT ... FOR UPDATE to acquire an exclusive row lock on the product row,
   * completely preventing overselling or race conditions under high concurrent POS load.
   * 
   * @param {object} params
   * @returns {Promise<{ product: object, movement: object }>}
   */
  async adjustStock({
    productId,
    operation = 'ADD',
    quantity,
    reason,
    referenceNo,
    customType = null,
    newCostPrice = null,
    userContext = null,
  }) {
    return this.withTransaction(async (clientQuery) => {
      // 1. Lock the product row exclusively for update
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      const lockSql = `
        SELECT 
          p.id, p.code, p.name, p.category_id, c.name AS category_name,
          p.brand, p.package_type, p.package_size, p.unit,
          p.cost_price, p.price, p.stock, p.min_threshold,
          p.status, p.is_active, p.created_at, p.updated_at
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE (${isUUID ? 'p.id = $1' : 'LOWER(p.code) = LOWER($1) OR LOWER(p.name) = LOWER($1)'})
        FOR UPDATE;
      `;

      const lockRes = await clientQuery(lockSql, [productId.trim()]);
      if (lockRes.rows.length === 0) {
        throw new NotFoundError(`Product '${productId}' not found`);
      }

      const product = lockRes.rows[0];
      if (!product.is_active) {
        throw new BadRequestError(`Cannot adjust stock for archived/inactive product '${product.name}' (${product.code})`);
      }

      const prevStock = Number(product.stock);
      const qty = Math.abs(Number(quantity));
      let newStock = prevStock;
      let changeQty = 0;
      let actionType = 'ADDED';
      let movementType = customType || 'ADJUSTMENT';

      const op = operation.toUpperCase();

      if (op === 'ADD') {
        newStock = prevStock + qty;
        changeQty = qty;
        actionType = 'ADDED';
        movementType = customType || 'ADJUSTMENT';
      } else if (op === 'REDUCE') {
        // Enforce non-negative stock invariant
        if (prevStock < qty) {
          throw new BadRequestError(
            `Insufficient stock for product '${product.name}' (${product.code}). Current available stock is ${prevStock} ${product.unit}, but attempted reduction is ${qty} ${product.unit}. Negative stock is not permitted.`
          );
        }
        newStock = prevStock - qty;
        changeQty = -qty;
        actionType = 'UPDATE';
        movementType = customType || 'ADJUSTMENT';
      } else if (op === 'CORRECT') {
        const targetStock = Number(quantity);
        if (targetStock < 0) {
          throw new BadRequestError('Corrected target stock level cannot be negative');
        }
        newStock = targetStock;
        changeQty = targetStock - prevStock;
        actionType = 'UPDATE';
        movementType = 'ADJUSTMENT';
      } else {
        throw new BadRequestError("Invalid operation. Must be 'ADD', 'REDUCE', or 'CORRECT'");
      }

      // Generate reference number if not supplied
      const effectiveRef = referenceNo && referenceNo.trim()
        ? referenceNo.trim()
        : `ADJ-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

      // 2. Prevent duplicate movements from client retries
      const duplicate = await this.findDuplicateMovement(clientQuery, {
        productId: product.id,
        referenceNo: effectiveRef,
        actionType,
      });

      if (duplicate) {
        throw new ConflictError(
          `Duplicate stock movement detected: Reference '${effectiveRef}' with action '${actionType}' has already been processed for product '${product.name}' (${product.code}) on ${duplicate.created_at}.`
        );
      }

      // Construct reason with user attribution if provided
      let finalReason = reason.trim();
      if (userContext && (userContext.fullName || userContext.email)) {
        const attribution = userContext.fullName || userContext.email;
        if (!finalReason.includes(attribution)) {
          finalReason = `${finalReason} [Auth: ${attribution}]`;
        }
      }

      // 3. Update products table
      const updateSql = `
        UPDATE products
        SET stock = $1,
            cost_price = CASE WHEN $2::NUMERIC IS NOT NULL AND $2::NUMERIC > 0 THEN $2::NUMERIC ELSE cost_price END,
            price = CASE WHEN $2::NUMERIC IS NOT NULL AND $2::NUMERIC > 0 AND price < $2::NUMERIC THEN ROUND($2::NUMERIC * 1.10, 2) ELSE price END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING 
          id, code, name, category_id, $4 AS category_name, brand,
          package_type, package_size, unit, cost_price, price,
          stock, min_threshold, status, is_active, updated_at;
      `;

      const updateRes = await clientQuery(updateSql, [
        Number(newStock.toFixed(3)),
        newCostPrice !== null && newCostPrice !== undefined ? Number(newCostPrice) : null,
        product.id,
        product.category_name,
      ]);

      const updatedProduct = this.formatProduct(updateRes.rows[0]);

      // 4. Insert immutable stock_movements audit record
      const movementRow = await this.recordMovement(clientQuery, {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        movementType,
        actionType,
        changeQty: Number(changeQty.toFixed(3)),
        previousStock: Number(prevStock.toFixed(3)),
        newStock: Number(newStock.toFixed(3)),
        unit: product.unit,
        reason: finalReason,
        referenceNo: effectiveRef,
      });

      return {
        product: updatedProduct,
        movement: movementRow,
      };
    });
  }

  /**
   * Get warehouse inventory summary
   * @returns {Promise<object>}
   */
  async getSummary() {
    const sql = `
      SELECT
        COUNT(*)::INTEGER AS total_products,
        COALESCE(SUM(stock), 0)::NUMERIC(12, 3) AS total_available_stock,
        COUNT(*) FILTER (WHERE status = 'Low Stock')::INTEGER AS low_stock_count,
        COUNT(*) FILTER (WHERE status = 'Out of Stock')::INTEGER AS out_of_stock_count,
        COUNT(*) FILTER (WHERE status = 'In Stock')::INTEGER AS in_stock_count
      FROM products
      WHERE is_active = TRUE;
    `;
    const res = await this.findOne(sql);
    return {
      totalProducts: Number(res?.total_products || 0),
      totalAvailableStock: Number(res?.total_available_stock || 0),
      lowStockCount: Number(res?.low_stock_count || 0),
      outOfStockCount: Number(res?.out_of_stock_count || 0),
      inStockCount: Number(res?.in_stock_count || 0),
    };
  }

  /**
   * Build WHERE clauses for stock movements
   * @private
   */
  _buildMovementFilterQuery({ productId, type, action, startDate, endDate, search }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (productId && productId !== 'All') {
      conditions.push(`(m.product_id::TEXT = $${idx} OR LOWER(m.product_code) = LOWER($${idx}) OR LOWER(m.product_name) LIKE LOWER($${idx + 1}))`);
      params.push(productId.trim());
      params.push(`%${productId.trim()}%`);
      idx += 2;
    }

    if (type && type !== 'All') {
      conditions.push(`m.movement_type = $${idx++}`);
      params.push(type.toUpperCase());
    }

    if (action && action !== 'All') {
      conditions.push(`m.action_type = $${idx++}`);
      params.push(action.toUpperCase());
    }

    if (startDate) {
      conditions.push(`m.created_at >= $${idx++}`);
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      // Include end of the specified day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(`m.created_at <= $${idx++}`);
      params.push(end.toISOString());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(m.product_code) LIKE $${idx} OR
        LOWER(m.product_name) LIKE $${idx} OR
        LOWER(m.reference_no) LIKE $${idx} OR
        LOWER(m.reason) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, nextIdx: idx };
  }

  /**
   * Retrieve stock movements history with rich filters and pagination
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async getMovements({
    productId = null,
    type = null,
    action = null,
    startDate = null,
    endDate = null,
    search = null,
    limit = 50,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = {}) {
    const { whereClause, params, nextIdx } = this._buildMovementFilterQuery({
      productId,
      type,
      action,
      startDate,
      endDate,
      search,
    });

    const allowedSort = {
      created_at: 'm.created_at',
      date: 'm.created_at',
      change_qty: 'm.change_qty',
      new_stock: 'm.new_stock',
      product_name: 'm.product_name',
      product_code: 'm.product_code',
      id: 'm.id',
    };

    const orderCol = allowedSort[sortBy.toLowerCase()] || 'm.created_at';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let currentIdx = nextIdx;
    params.push(limit);
    const limitIdx = currentIdx++;
    params.push(offset);
    const offsetIdx = currentIdx++;

    const sql = `
      SELECT 
        m.id,
        m.product_id,
        m.product_code,
        m.product_name,
        m.movement_type,
        m.action_type,
        m.change_qty,
        m.previous_stock,
        m.new_stock,
        m.unit,
        m.reason,
        m.reference_no,
        m.created_at
      FROM stock_movements m
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}, m.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => this.formatMovement(r));
  }

  /**
   * Count total movements matching query filters
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countMovements({
    productId = null,
    type = null,
    action = null,
    startDate = null,
    endDate = null,
    search = null,
  } = {}) {
    const { whereClause, params } = this._buildMovementFilterQuery({
      productId,
      type,
      action,
      startDate,
      endDate,
      search,
    });

    const sql = `SELECT COUNT(*)::INTEGER AS count FROM stock_movements m ${whereClause};`;
    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Retrieve low-stock products based on configured or custom threshold
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async getLowStock({
    threshold = null,
    categoryId = null,
    status = 'all',
    limit = 50,
    offset = 0,
    sortBy = 'deficit',
    sortOrder = 'DESC',
  } = {}) {
    const conditions = ['p.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (threshold !== null && threshold !== undefined && threshold !== '') {
      conditions.push(`p.stock <= $${idx++}`);
      params.push(Number(threshold));
    } else {
      conditions.push(`p.stock <= p.min_threshold`);
    }

    if (categoryId && categoryId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      if (isUUID) {
        conditions.push(`p.category_id = $${idx++}`);
        params.push(categoryId);
      } else {
        conditions.push(`LOWER(c.name) = LOWER($${idx++})`);
        params.push(categoryId.trim());
      }
    }

    if (status && status !== 'all') {
      if (status.toLowerCase() === 'out-of-stock' || status === 'Out of Stock') {
        conditions.push(`p.stock <= 0.000`);
      } else if (status.toLowerCase() === 'low-stock' || status === 'Low Stock') {
        conditions.push(`p.stock > 0.000 AND p.stock <= p.min_threshold`);
      }
    }

    const allowedSort = {
      deficit: 'deficit',
      stock: 'p.stock',
      name: 'p.name',
      code: 'p.code',
      threshold: 'p.min_threshold',
    };

    const orderCol = allowedSort[sortBy.toLowerCase()] || 'deficit';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    params.push(limit);
    const limitIdx = idx++;
    params.push(offset);
    const offsetIdx = idx++;

    const sql = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.category_id,
        c.name AS category_name,
        p.brand,
        p.unit,
        p.stock,
        p.min_threshold,
        p.cost_price,
        p.price,
        p.status,
        ROUND(GREATEST(0.000, p.min_threshold - p.stock), 3) AS deficit
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderCol} ${orderDir}, p.code ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => ({
      ...this.formatProduct(r),
      deficit: Number(r.deficit),
    }));
  }

  /**
   * Count low-stock products matching filters
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countLowStock({ threshold = null, categoryId = null, status = 'all' } = {}) {
    const conditions = ['p.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (threshold !== null && threshold !== undefined && threshold !== '') {
      conditions.push(`p.stock <= $${idx++}`);
      params.push(Number(threshold));
    } else {
      conditions.push(`p.stock <= p.min_threshold`);
    }

    if (categoryId && categoryId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      if (isUUID) {
        conditions.push(`p.category_id = $${idx++}`);
        params.push(categoryId);
      } else {
        conditions.push(`LOWER(c.name) = LOWER($${idx++})`);
        params.push(categoryId.trim());
      }
    }

    if (status && status !== 'all') {
      if (status.toLowerCase() === 'out-of-stock' || status === 'Out of Stock') {
        conditions.push(`p.stock <= 0.000`);
      } else if (status.toLowerCase() === 'low-stock' || status === 'Low Stock') {
        conditions.push(`p.stock > 0.000 AND p.stock <= p.min_threshold`);
      }
    }

    const sql = `
      SELECT COUNT(*)::INTEGER AS count
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE ${conditions.join(' AND ')};
    `;

    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Retrieve inventory stock valuation using approved costing view (v_inventory_valuation)
   * @param {object} options
   * @returns {Promise<{ summary: object, products: Array<object>, total: number }>}
   */
  async getValuation({
    categoryId = null,
    search = '',
    limit = 50,
    offset = 0,
    sortBy = 'total_cost_valuation',
    sortOrder = 'DESC',
  } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (categoryId && categoryId !== 'All') {
      conditions.push(`LOWER(v.category_name) = LOWER($${idx++})`);
      params.push(categoryId.trim());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(v.product_code) LIKE $${idx} OR
        LOWER(v.product_name) LIKE $${idx} OR
        LOWER(v.brand) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Summary calculation across all matching inventory
    const summarySql = `
      SELECT 
        COUNT(*)::INTEGER AS total_products,
        COALESCE(SUM(v.stock), 0.000)::NUMERIC(12, 3) AS total_stock_units,
        COALESCE(SUM(v.total_cost_valuation), 0.00)::NUMERIC(12, 2) AS total_cost_valuation,
        COALESCE(SUM(v.total_retail_valuation), 0.00)::NUMERIC(12, 2) AS total_retail_valuation,
        COALESCE(SUM(v.potential_profit), 0.00)::NUMERIC(12, 2) AS potential_profit
      FROM v_inventory_valuation v
      ${whereClause};
    `;

    const allowedSort = {
      total_cost_valuation: 'v.total_cost_valuation',
      total_retail_valuation: 'v.total_retail_valuation',
      potential_profit: 'v.potential_profit',
      stock: 'v.stock',
      name: 'v.product_name',
      code: 'v.product_code',
    };

    const orderCol = allowedSort[sortBy.toLowerCase()] || 'v.total_cost_valuation';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const filterParams = [...params];

    let currentIdx = idx;
    params.push(limit);
    const limitIdx = currentIdx++;
    params.push(offset);
    const offsetIdx = currentIdx++;

    const listSql = `
      SELECT 
        v.product_id,
        v.product_code,
        v.product_name,
        v.category_name,
        v.brand,
        v.package_type,
        v.package_size,
        v.unit,
        v.stock,
        v.cost_price,
        v.selling_price,
        v.total_cost_valuation,
        v.total_retail_valuation,
        v.potential_profit,
        v.stock_status,
        CASE 
          WHEN v.total_retail_valuation > 0 THEN ROUND((v.potential_profit / v.total_retail_valuation) * 100, 2)
          ELSE 0.00
        END AS margin_percentage
      FROM v_inventory_valuation v
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}, v.product_code ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const [summaryRow, products] = await Promise.all([
      this.findOne(summarySql, filterParams),
      this.findMany(listSql, params),
    ]);

    const totalCost = Number(summaryRow?.total_cost_valuation || 0);
    const totalRetail = Number(summaryRow?.total_retail_valuation || 0);
    const potentialProfit = Number(summaryRow?.potential_profit || 0);
    const overallMargin = totalRetail > 0 ? Number(((potentialProfit / totalRetail) * 100).toFixed(2)) : 0;

    return {
      summary: {
        totalProducts: Number(summaryRow?.total_products || 0),
        totalStockUnits: Number(summaryRow?.total_stock_units || 0),
        totalCostValuation: totalCost,
        totalRetailValuation: totalRetail,
        potentialProfit,
        overallMarginPercentage: overallMargin,
        valuationMethod: 'COST_PRICE_FIFO_EQUIVALENT',
      },
      products: products.map((p) => ({
        productId: p.product_id,
        product_id: p.product_id,
        productCode: p.product_code,
        product_code: p.product_code,
        productName: p.product_name,
        product_name: p.product_name,
        categoryName: p.category_name,
        category_name: p.category_name,
        brand: p.brand,
        packageType: p.package_type,
        packageSize: p.package_size,
        unit: p.unit,
        stock: Number(p.stock),
        costPrice: Number(p.cost_price),
        cost_price: Number(p.cost_price),
        sellingPrice: Number(p.selling_price),
        selling_price: Number(p.selling_price),
        totalCostValuation: Number(p.total_cost_valuation),
        total_cost_valuation: Number(p.total_cost_valuation),
        totalRetailValuation: Number(p.total_retail_valuation),
        total_retail_valuation: Number(p.total_retail_valuation),
        potentialProfit: Number(p.potential_profit),
        potential_profit: Number(p.potential_profit),
        marginPercentage: Number(p.margin_percentage),
        margin_percentage: Number(p.margin_percentage),
        stockStatus: p.stock_status,
        stock_status: p.stock_status,
      })),
      total: Number(summaryRow?.total_products || 0),
    };
  }

  /**
   * Double-entry physical reconciliation query
   * Compares active warehouse physical stock against mathematical sum of movement ledger entries
   * 
   * @param {object} options
   * @returns {Promise<{ summary: object, products: Array<object>, total: number }>}
   */
  async getReconciliation({ productId = null, status = 'all', limit = 50, offset = 0 } = {}) {
    const conditions = ['p.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (productId && productId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      if (isUUID) {
        conditions.push(`p.id = $${idx++}`);
        params.push(productId.trim());
      } else {
        conditions.push(`(LOWER(p.code) = LOWER($${idx}) OR LOWER(p.name) LIKE LOWER($${idx + 1}))`);
        params.push(productId.trim());
        params.push(`%${productId.trim()}%`);
        idx += 2;
      }
    }

    const havingClause = [];
    if (status && status !== 'all') {
      if (status.toUpperCase() === 'DISCREPANCY') {
        havingClause.push(`ROUND(p.stock - COALESCE(SUM(m.change_qty), 0.000), 3) <> 0.000`);
      } else if (status.toUpperCase() === 'RECONCILED') {
        havingClause.push(`ROUND(p.stock - COALESCE(SUM(m.change_qty), 0.000), 3) = 0.000`);
      }
    }

    const having = havingClause.length > 0 ? `HAVING ${havingClause.join(' AND ')}` : '';

    const summarySql = `
      WITH product_audit AS (
        SELECT 
          p.id,
          p.stock,
          COALESCE(SUM(m.change_qty), 0.000) AS movements_sum,
          ROUND(p.stock - COALESCE(SUM(m.change_qty), 0.000), 3) AS discrepancy
        FROM products p
        LEFT JOIN stock_movements m ON m.product_id = p.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY p.id, p.stock
      )
      SELECT 
        COUNT(*)::INTEGER AS total_audited,
        COUNT(*) FILTER (WHERE discrepancy = 0.000)::INTEGER AS reconciled_count,
        COUNT(*) FILTER (WHERE discrepancy <> 0.000)::INTEGER AS discrepancy_count
      FROM product_audit;
    `;

    const filterParams = [...params];

    params.push(limit);
    const limitIdx = idx++;
    params.push(offset);
    const offsetIdx = idx++;

    const listSql = `
      SELECT 
        p.id AS product_id,
        p.code AS product_code,
        p.name AS product_name,
        p.unit,
        p.stock AS current_physical_stock,
        COALESCE(SUM(m.change_qty), 0.000)::NUMERIC(12, 3) AS movement_ledger_sum,
        ROUND(p.stock - COALESCE(SUM(m.change_qty), 0.000), 3)::NUMERIC(12, 3) AS discrepancy,
        COUNT(m.id)::INTEGER AS movement_count,
        CASE 
          WHEN ROUND(p.stock - COALESCE(SUM(m.change_qty), 0.000), 3) = 0.000 THEN 'RECONCILED'
          ELSE 'DISCREPANCY'
        END AS status
      FROM products p
      LEFT JOIN stock_movements m ON m.product_id = p.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id, p.code, p.name, p.unit, p.stock
      ${having}
      ORDER BY ABS(ROUND(p.stock - COALESCE(SUM(m.change_qty), 0.000), 3)) DESC, p.code ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const [summaryRow, products] = await Promise.all([
      this.findOne(summarySql, filterParams),
      this.findMany(listSql, params),
    ]);

    const totalAudited = Number(summaryRow?.total_audited || 0);
    const reconciledCount = Number(summaryRow?.reconciled_count || 0);
    const discrepancyCount = Number(summaryRow?.discrepancy_count || 0);

    return {
      summary: {
        totalAudited,
        reconciledCount,
        discrepancyCount,
        systemStatus: discrepancyCount === 0 ? 'BALANCED' : 'DISCREPANCIES_DETECTED',
        auditTimestamp: new Date().toISOString(),
      },
      products: products.map((r) => ({
        productId: r.product_id,
        product_id: r.product_id,
        productCode: r.product_code,
        product_code: r.product_code,
        productName: r.product_name,
        product_name: r.product_name,
        unit: r.unit,
        currentPhysicalStock: Number(r.current_physical_stock),
        current_physical_stock: Number(r.current_physical_stock),
        movementLedgerSum: Number(r.movement_ledger_sum),
        movement_ledger_sum: Number(r.movement_ledger_sum),
        discrepancy: Number(r.discrepancy),
        movementCount: r.movement_count,
        movement_count: r.movement_count,
        status: r.status,
      })),
      total: totalAudited,
    };
  }
}

module.exports = new InventoryRepository();
