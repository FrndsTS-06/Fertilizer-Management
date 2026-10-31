const BaseRepository = require('./base.repository');

/**
 * Health & Diagnostic Repository
 * Manages low-level read-only database queries for health verification.
 */
class HealthRepository extends BaseRepository {
  /**
   * Execute read-only ping query on PostgreSQL
   * @returns {Promise<{ db_name: string, db_user: string, db_version: string, server_time: Date }>}
   */
  async pingDatabase() {
    return this.findOne(
      'SELECT current_database() AS db_name, current_user AS db_user, version() AS db_version, NOW() AS server_time;'
    );
  }

  /**
   * Return current state of the database connection pool
   * @returns {{ totalCount: number, idleCount: number, waitingCount: number }}
   */
  getPoolMetrics() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

module.exports = new HealthRepository();
