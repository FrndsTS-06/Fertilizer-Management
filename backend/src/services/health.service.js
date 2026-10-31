const healthRepository = require('../repositories/health.repository');
const config = require('../config');

/**
 * Health & Diagnostic Service
 * Encapsulates system health checks and status determination.
 */
class HealthService {
  /**
   * Return basic API runtime status (no database query)
   * @returns {{ status: string, message: string, timestamp: string, environment: string }}
   */
  getApiStatus() {
    return {
      status: 'ok',
      message: 'Fertilizer Management API is running',
      environment: config.env,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Determine full database connectivity and diagnostic health
   * @returns {Promise<{ success: boolean, database: object }>}
   */
  async getDatabaseStatus() {
    try {
      const row = await healthRepository.pingDatabase();
      if (!row) {
        return {
          success: false,
          database: {
            status: 'disconnected',
            error: 'No database response received',
          },
        };
      }

      const poolMetrics = healthRepository.getPoolMetrics();

      return {
        success: true,
        database: {
          status: 'connected',
          name: row.db_name,
          user: row.db_user,
          version: row.db_version.split(' on ')[0], // Extracts clean version string (e.g. "PostgreSQL 18.6")
          serverTime: row.server_time,
          pool: poolMetrics,
        },
      };
    } catch (error) {
      return {
        success: false,
        database: {
          status: 'disconnected',
          error: 'Database connection failed. Please check server logs and configuration.',
        },
      };
    }
  }
}

module.exports = new HealthService();
