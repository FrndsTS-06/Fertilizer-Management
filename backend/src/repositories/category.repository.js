const BaseRepository = require('./base.repository');

/**
 * Category Repository
 * Data-access layer for product categories.
 */
class CategoryRepository extends BaseRepository {
  /**
   * Retrieve all categories with optional search and active status filter
   * Includes product count per category
   * 
   * @param {object} options
   * @param {string} [options.search]
   * @param {boolean} [options.isActive]
   * @param {string} [options.sortBy]
   * @param {string} [options.sortOrder]
   * @returns {Promise<Array<object>>}
   */
  async findAll({ search = '', isActive = true, sortBy = 'name', sortOrder = 'ASC' } = {}) {
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (isActive !== null && isActive !== undefined) {
      conditions.push(`c.is_active = $${paramIdx++}`);
      params.push(Boolean(isActive));
    }

    if (search && search.trim()) {
      conditions.push(`(LOWER(c.name) LIKE $${paramIdx} OR LOWER(COALESCE(c.description, '')) LIKE $${paramIdx})`);
      params.push(`%${search.trim().toLowerCase()}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortColumns = {
      name: 'c.name',
      created_at: 'c.created_at',
      id: 'c.id',
    };
    const orderCol = allowedSortColumns[sortBy.toLowerCase()] || 'c.name';
    const orderDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.is_active,
        c.created_at,
        COUNT(p.id) FILTER (WHERE p.is_active = TRUE)::INTEGER AS active_product_count,
        COUNT(p.id)::INTEGER AS total_product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name, c.description, c.is_active, c.created_at
      ORDER BY ${orderCol} ${orderDir}, c.id ASC;
    `;

    return this.findMany(sql, params);
  }

  /**
   * Find category by UUID
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.is_active,
        c.created_at,
        COUNT(p.id) FILTER (WHERE p.is_active = TRUE)::INTEGER AS active_product_count,
        COUNT(p.id)::INTEGER AS total_product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.description, c.is_active, c.created_at;
    `;
    return this.findOne(sql, [id]);
  }

  /**
   * Find category by name (case-insensitive)
   * @param {string} name
   * @returns {Promise<object|null>}
   */
  async findByName(name) {
    return this.findOne(
      `SELECT id, name, description, is_active, created_at
       FROM categories
       WHERE LOWER(name) = LOWER($1);`,
      [name.trim()]
    );
  }

  /**
   * Create a new category
   * @param {object} data
   * @param {string} data.name
   * @param {string} [data.description]
   * @returns {Promise<object>}
   */
  async create({ name, description = null }) {
    return this.findOne(
      `INSERT INTO categories (name, description, is_active)
       VALUES ($1, $2, TRUE)
       RETURNING id, name, description, is_active, created_at;`,
      [name.trim(), description ? description.trim() : null]
    );
  }

  /**
   * Update category details
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object|null>}
   */
  async update(id, { name, description, is_active }) {
    const setClauses = [];
    const params = [id];
    let paramIdx = 2;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      params.push(name.trim());
    }

    if (description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      params.push(description ? description.trim() : null);
    }

    if (is_active !== undefined) {
      setClauses.push(`is_active = $${paramIdx++}`);
      params.push(Boolean(is_active));
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    const sql = `
      UPDATE categories
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, name, description, is_active, created_at;
    `;

    return this.findOne(sql, params);
  }

  /**
   * Soft-delete / Archive category
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async archive(id) {
    return this.findOne(
      `UPDATE categories
       SET is_active = FALSE
       WHERE id = $1
       RETURNING id, name, description, is_active, created_at;`,
      [id]
    );
  }

  /**
   * Count products referencing a category
   * @param {string} categoryId
   * @returns {Promise<number>}
   */
  async countReferencedProducts(categoryId) {
    const res = await this.findOne(
      `SELECT COUNT(*)::INTEGER AS count
       FROM products
       WHERE category_id = $1;`,
      [categoryId]
    );
    return res ? res.count : 0;
  }
}

module.exports = new CategoryRepository();
