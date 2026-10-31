const { pool, query } = require('../config/db');

/**
 * Base Repository
 * Centralizes SQL execution, single/multiple row extraction, and database transactions.
 */
class BaseRepository {
  constructor() {
    this.pool = pool;
    this.query = query;
  }

  /**
   * Execute a query and return a single row or null
   * @param {string} text - SQL query
   * @param {Array} params - Parameter array
   * @returns {Promise<object|null>}
   */
  async findOne(text, params = []) {
    const res = await this.query(text, params);
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  /**
   * Execute a query and return all matching rows
   * @param {string} text - SQL query
   * @param {Array} params - Parameter array
   * @returns {Promise<Array<object>>}
   */
  async findMany(text, params = []) {
    const res = await this.query(text, params);
    return res.rows;
  }

  /**
   * Execute multiple operations within an atomic database transaction
   * @template T
   * @param {(clientQuery: (text: string, params?: Array) => Promise<any>) => Promise<T>} callback
   * @returns {Promise<T>}
   */
  async withTransaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const clientQuery = (text, params = []) => client.query(text, params);
      const result = await callback(clientQuery);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = BaseRepository;
