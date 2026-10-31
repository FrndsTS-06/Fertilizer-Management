const BaseRepository = require('./base.repository');
const inventoryRepository = require('./inventory.repository');

/**
 * Product Repository
 * Data-access layer for products, SKU codes, pricing, and packaging specifications.
 */
class ProductRepository extends BaseRepository {
  /**
   * Format database row into standardized product object with both snake_case and camelCase support
   * @param {object} row
   * @returns {object}
   */
  formatProduct(row) {
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      categoryId: row.category_id,
      category_id: row.category_id,
      category: row.category_name || row.category || '',
      categoryName: row.category_name || row.category || '',
      brand: row.brand,
      packageType: row.package_type,
      package_type: row.package_type,
      packageSize: row.package_size,
      package_size: row.package_size,
      unit: row.unit,
      costPrice: Number(row.cost_price),
      cost_price: Number(row.cost_price),
      price: Number(row.price),
      stock: Number(row.stock),
      minThreshold: Number(row.min_threshold),
      min_threshold: Number(row.min_threshold),
      photo: row.photo,
      description: row.description,
      status: row.status,
      isActive: Boolean(row.is_active),
      is_active: Boolean(row.is_active),
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Build WHERE clause and params for filtering products
   * @private
   */
  _buildFilterQuery({ search, category, status, isActive }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    // Filter by active / archived status
    if (isActive !== null && isActive !== undefined && isActive !== 'all') {
      conditions.push(`p.is_active = $${idx++}`);
      params.push(Boolean(isActive));
    }

    // Filter by search query (name, code, brand, description)
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(p.name) LIKE $${idx} OR
        LOWER(p.code) LIKE $${idx} OR
        LOWER(p.brand) LIKE $${idx} OR
        LOWER(c.name) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    // Filter by category (UUID or name)
    if (category && category !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      if (isUUID) {
        conditions.push(`p.category_id = $${idx++}`);
        params.push(category);
      } else {
        conditions.push(`LOWER(c.name) = LOWER($${idx++})`);
        params.push(category.trim());
      }
    }

    // Filter by generated stock status
    if (status && status !== 'All') {
      conditions.push(`p.status = $${idx++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, nextIdx: idx };
  }

  /**
   * Find paginated products matching filters
   * 
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async findAll({
    search = '',
    category = 'All',
    status = 'All',
    isActive = true,
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = {}) {
    const { whereClause, params, nextIdx } = this._buildFilterQuery({
      search,
      category,
      status,
      isActive,
    });

    const allowedSortColumns = {
      created_at: 'p.created_at',
      name: 'p.name',
      code: 'p.code',
      price: 'p.price',
      stock: 'p.stock',
      brand: 'p.brand',
      category: 'c.name',
    };
    const orderCol = allowedSortColumns[sortBy.toLowerCase()] || 'p.created_at';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    let currentIdx = nextIdx;
    params.push(limit);
    const limitIdx = currentIdx++;
    params.push(offset);
    const offsetIdx = currentIdx++;

    const sql = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.category_id,
        c.name AS category_name,
        p.brand,
        p.package_type,
        p.package_size,
        p.unit,
        p.cost_price,
        p.price,
        p.stock,
        p.min_threshold,
        p.photo,
        p.description,
        p.status,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}, p.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => this.formatProduct(r));
  }

  /**
   * Count total products matching filters
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countAll({ search = '', category = 'All', status = 'All', isActive = true } = {}) {
    const { whereClause, params } = this._buildFilterQuery({
      search,
      category,
      status,
      isActive,
    });

    const sql = `
      SELECT COUNT(*)::INTEGER AS count
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ${whereClause};
    `;

    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Find product by UUID or SKU code
   * @param {string} idOrCode
   * @returns {Promise<object|null>}
   */
  async findById(idOrCode) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const sql = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.category_id,
        c.name AS category_name,
        p.brand,
        p.package_type,
        p.package_size,
        p.unit,
        p.cost_price,
        p.price,
        p.stock,
        p.min_threshold,
        p.photo,
        p.description,
        p.status,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE ${isUUID ? 'p.id = $1' : 'LOWER(p.code) = LOWER($1)'};
    `;

    const row = await this.findOne(sql, [idOrCode]);
    return this.formatProduct(row);
  }

  /**
   * Find product by exact code
   * @param {string} code
   * @returns {Promise<object|null>}
   */
  async findByCode(code) {
    const sql = `
      SELECT p.id, p.code, p.name, p.category_id, c.name AS category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE LOWER(p.code) = LOWER($1);
    `;
    return this.findOne(sql, [code.trim()]);
  }

  /**
   * Generate next sequential SKU code (e.g. PRD009, PRD010)
   * @returns {Promise<string>}
   */
  async generateNextCode() {
    const sql = `
      SELECT code
      FROM products
      WHERE code ~ '^PRD[0-9]+$'
      ORDER BY NULLIF(regexp_replace(code, '\\D', '', 'g'), '')::INTEGER DESC
      LIMIT 1;
    `;
    const res = await this.findOne(sql);
    let nextNum = 1;
    if (res && res.code) {
      const match = res.code.match(/PRD(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `PRD${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Create a product and record initial opening stock in stock_movements via transaction
   * 
   * @param {object} productData
   * @param {number} initialStock
   * @returns {Promise<object>}
   */
  async createWithInitialStock(productData, initialStock = 0) {
    return this.withTransaction(async (clientQuery) => {
      const insertSql = `
        INSERT INTO products (
          code,
          name,
          category_id,
          brand,
          package_type,
          package_size,
          unit,
          cost_price,
          price,
          stock,
          min_threshold,
          photo,
          description,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
        RETURNING *;
      `;

      const insertParams = [
        productData.code,
        productData.name,
        productData.categoryId,
        productData.brand || 'Standard',
        productData.packageType || 'Bags',
        productData.packageSize || '50kgs',
        productData.unit,
        productData.costPrice,
        productData.price,
        initialStock,
        productData.minThreshold !== undefined ? productData.minThreshold : 10,
        productData.photo || null,
        productData.description || null,
      ];

      const res = await clientQuery(insertSql, insertParams);
      const createdRow = res.rows[0];

      // If initial stock was provided (> 0), record opening stock movement audit entry
      if (initialStock > 0) {
        await inventoryRepository.recordMovement(clientQuery, {
          productId: createdRow.id,
          productCode: createdRow.code,
          productName: createdRow.name,
          movementType: 'OPENING_STOCK',
          actionType: 'ADDED',
          changeQty: initialStock,
          previousStock: 0.000,
          newStock: initialStock,
          unit: createdRow.unit,
          reason: 'Initial Product Stock Inward',
          referenceNo: `INIT-${createdRow.code}`,
        });
      }

      // Fetch newly created product joined with category name
      const fetchSql = `
        SELECT 
          p.id, p.code, p.name, p.category_id, c.name AS category_name,
          p.brand, p.package_type, p.package_size, p.unit,
          p.cost_price, p.price, p.stock, p.min_threshold,
          p.photo, p.description, p.status, p.is_active,
          p.created_at, p.updated_at
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1;
      `;
      const fullRes = await clientQuery(fetchSql, [createdRow.id]);
      return this.formatProduct(fullRes.rows[0]);
    });
  }

  /**
   * Update non-stock product attributes
   * Guaranteed: Does NOT touch stock column!
   * 
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object|null>}
   */
  async update(id, updates) {
    const allowedFields = {
      name: 'name',
      categoryId: 'category_id',
      brand: 'brand',
      packageType: 'package_type',
      packageSize: 'package_size',
      unit: 'unit',
      costPrice: 'cost_price',
      price: 'price',
      minThreshold: 'min_threshold',
      photo: 'photo',
      description: 'description',
      isActive: 'is_active',
    };

    const setClauses = [];
    const params = [id];
    let idx = 2;

    for (const [key, col] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined) {
        setClauses.push(`${col} = $${idx++}`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE products
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id;
    `;

    const res = await this.findOne(sql, params);
    if (!res) return null;

    return this.findById(id);
  }

  /**
   * Archive / Soft-delete product
   * Preserves historical transaction and movement logs
   * 
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async archive(id) {
    const sql = `
      UPDATE products
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;
    const res = await this.findOne(sql, [id]);
    if (!res) return null;
    return this.findById(id);
  }

  /**
   * Restore an archived product
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async restore(id) {
    const sql = `
      UPDATE products
      SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;
    const res = await this.findOne(sql, [id]);
    if (!res) return null;
    return this.findById(id);
  }

  /**
   * Check if product has historical transactions (stock movements, purchases, sales)
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async hasHistoricalTransactions(id) {
    const sql = `
      SELECT (
        EXISTS (SELECT 1 FROM stock_movements WHERE product_id = $1) OR
        EXISTS (SELECT 1 FROM sale_items WHERE product_id = $1) OR
        EXISTS (SELECT 1 FROM purchase_items WHERE product_id = $1)
      ) AS has_records;
    `;
    const res = await this.findOne(sql, [id]);
    return Boolean(res?.has_records);
  }
}

module.exports = new ProductRepository();
