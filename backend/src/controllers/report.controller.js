const reportService = require('../services/report.service');

/**
 * Report Controller
 * Handles HTTP requests for analytics, dashboard KPI summaries, and financial reports.
 */
class ReportController {
  /**
   * GET /api/reports/dashboard (or /api/dashboard/summary)
   */
  async getDashboardSummary(req, res, next) {
    try {
      const data = await reportService.getDashboardSummary(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/sales
   */
  async getSalesReport(req, res, next) {
    try {
      const result = await reportService.getSalesReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        period: result.period,
        summary: result.summary,
        statusBreakdown: result.statusBreakdown,
        methodBreakdown: result.methodBreakdown,
        dailyTrends: result.dailyTrends,
        data: result.invoices,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/purchases
   */
  async getPurchaseReport(req, res, next) {
    try {
      const result = await reportService.getPurchaseReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        period: result.period,
        summary: result.summary,
        statusBreakdown: result.statusBreakdown,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/low-stock
   */
  async getLowStockReport(req, res, next) {
    try {
      const result = await reportService.getLowStockReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        summary: result.summary,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/inventory-valuation
   */
  async getInventoryValuationReport(req, res, next) {
    try {
      const result = await reportService.getInventoryValuationReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        summary: result.summary,
        categoryBreakdown: result.categoryBreakdown,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/customer-dues
   */
  async getCustomerDuesReport(req, res, next) {
    try {
      const result = await reportService.getCustomerDuesReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        summary: result.summary,
        agingSummary: result.agingSummary,
        data: result.customers,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/supplier-dues
   */
  async getSupplierDuesReport(req, res, next) {
    try {
      const result = await reportService.getSupplierDuesReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        summary: result.summary,
        data: result.suppliers,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/gst-summary
   */
  async getGstSummaryReport(req, res, next) {
    try {
      const data = await reportService.getGstSummaryReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/payments-summary
   */
  async getPaymentsSummaryReport(req, res, next) {
    try {
      const data = await reportService.getPaymentsSummaryReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/product-sales
   */
  async getProductSalesReport(req, res, next) {
    try {
      const result = await reportService.getProductSalesReport(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        period: result.period,
        summary: result.summary,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reports/history
   */
  async getTransactionHistory(req, res, next) {
    try {
      const result = await reportService.getTransactionHistory(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        period: result.period,
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();
