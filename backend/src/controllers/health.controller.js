const healthService = require('../services/health.service');

/**
 * Health & Diagnostic Controller
 * Handles HTTP requests and responses for system health and diagnostics.
 */
class HealthController {
  /**
   * GET /api/health
   * Lightweight health check verifying Express is running (no DB access)
   */
  getHealth(req, res) {
    const status = healthService.getApiStatus();
    return res.status(200).json({
      success: true,
      message: status.message,
    });
  }

  /**
   * GET /api/health/db
   * Safe database diagnostic check verifying PostgreSQL connectivity and pool metrics
   */
  async getDatabaseHealth(req, res, next) {
    try {
      const result = await healthService.getDatabaseStatus();
      const statusCode = result.success ? 200 : 503;
      return res.status(statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
