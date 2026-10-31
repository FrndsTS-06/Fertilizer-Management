const BaseRepository = require('./base.repository');

/**
 * Supplier Repository
 * Data-access layer for wholesale suppliers and fertilizer distributors.
 */
class SupplierRepository extends BaseRepository {
  /**
   * Format supplier database row
   * @param {object} row
   * @returns {object|null}
   */
  formatSupplier(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      contactPerson: row.contact_person,
      contact_person: row.contact_person,
      phone: row.phone,
      email: row.email,
      address: row.address,
      gstin: row.gstin,
      isActive: Boolean(row.is_active),
      is_active: Boolean(row.is_active),
      totalPurchases: row.total_purchases !== undefined ? Number(row.total_purchases) : 0,
      total_purchases: row.total_purchases !== undefined ? Number(row.total_purchases) : 0,
      purchaseCount: row.purchase_count !== undefined ? Number(row.purchase_count) : 0,
      purchase_count: row.purchase_count !== undefined ? Number(row.purchase_count) : 0,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Build filter condition for suppliers
   * @private
   */
  _buildFilterQuery({ search, isActive }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (isActive !== null && isActive !== undefined && isActive !== 'all') {
      conditions.push(`s.is_active = $${idx++}`);
      params.push(Boolean(isActive));
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(s.name) LIKE $${idx} OR
        LOWER(COALESCE(s.contact_person, '')) LIKE $${idx} OR
        LOWER(COALESCE(s.phone, '')) LIKE $${idx} OR
        LOWER(COALESCE(s.email, '')) LIKE $${idx} OR
        LOWER(COALESCE(s.gstin, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, nextIdx: idx };
  }

  /**
   * Find paginated suppliers with purchase order aggregations
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async findAll({
    search = '',
    isActive = true,
    page = 1,
    limit = 50,
    sortBy = 'name',
    sortOrder = 'ASC',
  } = {}) {
    const { whereClause, params, nextIdx } = this._buildFilterQuery({ search, isActive });

    const allowedSortColumns = {
      name: 's.name',
      created_at: 's.created_at',
      id: 's.id',
    };
    const orderCol = allowedSortColumns[sortBy.toLowerCase()] || 's.name';
    const orderDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    let currentIdx = nextIdx;
    params.push(limit);
    const limitIdx = currentIdx++;
    params.push(offset);
    const offsetIdx = currentIdx++;

    const sql = `
      SELECT 
        s.id,
        s.name,
        s.contact_person,
        s.phone,
        s.email,
        s.address,
        s.gstin,
        s.is_active,
        s.created_at,
        s.updated_at,
        COALESCE(COUNT(p.id), 0)::INTEGER AS purchase_count,
        COALESCE(SUM(p.total_amount), 0.00)::NUMERIC(12, 2) AS total_purchases
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id = s.id
      ${whereClause}
      GROUP BY s.id, s.name, s.contact_person, s.phone, s.email, s.address, s.gstin, s.is_active, s.created_at, s.updated_at
      ORDER BY ${orderCol} ${orderDir}, s.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => this.formatSupplier(r));
  }

  /**
   * Count total suppliers matching filter
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countAll({ search = '', isActive = true } = {}) {
    const { whereClause, params } = this._buildFilterQuery({ search, isActive });
    const sql = `SELECT COUNT(*)::INTEGER AS count FROM suppliers s ${whereClause};`;
    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Find supplier by UUID or exact Name
   * @param {string} idOrName
   * @returns {Promise<object|null>}
   */
  async findById(idOrName) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);
    const sql = `
      SELECT 
        s.id,
        s.name,
        s.contact_person,
        s.phone,
        s.email,
        s.address,
        s.gstin,
        s.is_active,
        s.created_at,
        s.updated_at,
        COALESCE(COUNT(p.id), 0)::INTEGER AS purchase_count,
        COALESCE(SUM(p.total_amount), 0.00)::NUMERIC(12, 2) AS total_purchases
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id = s.id
      WHERE ${isUUID ? 's.id = $1' : 'LOWER(s.name) = LOWER($1)'}
      GROUP BY s.id, s.name, s.contact_person, s.phone, s.email, s.address, s.gstin, s.is_active, s.created_at, s.updated_at;
    `;
    const row = await this.findOne(sql, [idOrName]);
    return this.formatSupplier(row);
  }

  /**
   * Find supplier by exact name (case-insensitive)
   * @param {string} name
   * @returns {Promise<object|null>}
   */
  async findByName(name) {
    return this.findOne(
      `SELECT id, name, contact_person, phone, email, address, gstin, is_active, created_at, updated_at
       FROM suppliers
       WHERE LOWER(name) = LOWER($1);`,
      [name.trim()]
    );
  }

  /**
   * Create a new supplier
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create({
    name,
    contact_person = null,
    phone = null,
    email = null,
    address = null,
    gstin = null,
  }) {
    const sql = `
      INSERT INTO suppliers (name, contact_person, phone, email, address, gstin, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *;
    `;
    const params = [
      name.trim(),
      contact_person ? contact_person.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      address ? address.trim() : null,
      gstin ? gstin.trim().toUpperCase() : null,
    ];
    const row = await this.findOne(sql, params);
    return this.formatSupplier(row);
  }

  /**
   * Update supplier attributes
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object|null>}
   */
  async update(id, updates) {
    const allowedFields = {
      name: 'name',
      contactPerson: 'contact_person',
      contact_person: 'contact_person',
      phone: 'phone',
      email: 'email',
      address: 'address',
      gstin: 'gstin',
      isActive: 'is_active',
      is_active: 'is_active',
    };

    const setClauses = [];
    const params = [id];
    let idx = 2;

    for (const [key, col] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined && !setClauses.some((c) => c.startsWith(`${col} =`))) {
        setClauses.push(`${col} = $${idx++}`);
        const val = updates[key];
        if (col === 'name') {
          params.push(String(val).trim());
        } else if (col === 'gstin') {
          params.push(val ? String(val).trim().toUpperCase() : null);
        } else if (col === 'is_active') {
          params.push(Boolean(val));
        } else {
          params.push(val ? String(val).trim() : null);
        }
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE suppliers
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id;
    `;

    const res = await this.findOne(sql, params);
    if (!res) return null;
    return this.findById(id);
  }

  /**
   * Archive / Soft-delete supplier
   * Preserves historical purchases and supplier disbursements
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async archive(id) {
    const sql = `
      UPDATE suppliers
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;
    const res = await this.findOne(sql, [id]);
    if (!res) return null;
    return this.findById(id);
  }

  /**
   * Restore archived supplier
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async restore(id) {
    const sql = `
      UPDATE suppliers
      SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;
    const res = await this.findOne(sql, [id]);
    if (!res) return null;
    return this.findById(id);
  }

  /**
   * Retrieve purchases associated with a supplier
   * @param {string} supplierId
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async getPurchases(supplierId, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT 
        p.id,
        p.purchase_invoice_no AS "purchaseInvoiceNo",
        p.supplier_id AS "supplierId",
        p.total_amount AS "totalAmount",
        p.paid_amount AS "paidAmount",
        p.due_amount AS "dueAmount",
        p.lifecycle_status AS "lifecycleStatus",
        p.payment_status AS "paymentStatus",
        p.notes,
        p.purchase_date AS "purchaseDate",
        p.created_at AS "createdAt"
      FROM purchases p
      WHERE p.supplier_id = $1
      ORDER BY p.purchase_date DESC, p.id DESC
      LIMIT $2 OFFSET $3;
    `;
    return this.findMany(sql, [supplierId, limit, offset]);
  }
}

module.exports = new SupplierRepository();
