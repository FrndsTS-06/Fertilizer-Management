const reportRepository = require('../repositories/report.repository');
const { resolveDateRange } = require('../utils/dateBoundary');

/**
 * Report Service
 * Coordinates analytics requests, resolves date boundaries and period presets,
 * and delegates database aggregations to the repository.
 */
class ReportService {
  /**
   * 1. Dashboard Executive Summary
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getDashboardSummary(query = {}) {
    const { startDate, endDate, periodName } = resolveDateRange({
      period: query.period || 'all-time',
      startDate: query.startDate || query.start_date,
      endDate: query.endDate || query.end_date,
    });

    const limitRecent = Math.min(20, Math.max(1, parseInt(query.limitRecent || query.limit_recent, 10) || 5));

    const result = await reportRepository.getDashboardSummary({
      startDate,
      endDate,
      limitRecent,
    });

    result.period.periodName = periodName;
    return result;
  }

  /**
   * 2. Sales Totals & Period Breakdown
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getSalesReport(query = {}) {
    const { startDate, endDate, periodName } = resolveDateRange({
      period: query.period,
      startDate: query.startDate || query.start_date,
      endDate: query.endDate || query.end_date,
    });

    const result = await reportRepository.getSalesReport({
      startDate,
      endDate,
      customerId: query.customerId || query.customer_id || null,
      paymentMethod: query.paymentMethod || query.payment_method || 'ALL',
      paymentStatus: query.paymentStatus || query.payment_status || 'ALL',
      page: query.page,
      limit: query.limit,
    });

    result.period = {
      startDate,
      endDate,
      periodName,
    };
    return result;
  }

  /**
   * 3. Purchases & Accounts Payable Totals Report
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getPurchaseReport(query = {}) {
    const { startDate, endDate, periodName } = resolveDateRange({
      period: query.period,
      startDate: query.startDate || query.start_date,
      endDate: query.endDate || query.end_date,
    });

    const result = await reportRepository.getPurchaseReport({
      startDate,
      endDate,
      supplierId: query.supplierId || query.supplier_id || null,
      paymentStatus: query.paymentStatus || query.payment_status || 'ALL',
      lifecycleStatus: query.lifecycleStatus || query.lifecycle_status || 'ALL',
      page: query.page,
      limit: query.limit,
    });

    result.period = {
      startDate,
      endDate,
      periodName,
    };
    return result;
  }

  /**
   * 4. Low-Stock Products & Immediate Reorder Warnings
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getLowStockReport(query = {}) {
    return reportRepository.getLowStockReport({
      categoryId: query.categoryId || query.category_id || query.category || null,
      status: query.status || 'ALL',
      search: query.search || '',
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * 5. Inventory Stock Valuation & Profit Margin Report
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getInventoryValuationReport(query = {}) {
    return reportRepository.getInventoryValuationReport({
      categoryId: query.categoryId || query.category_id || null,
      brand: query.brand || null,
      stockStatus: query.stockStatus || query.stock_status || query.status || null,
      search: query.search || '',
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * 6. Customer Outstanding Balances & Aging (Farmer Khata Dues)
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getCustomerDuesReport(query = {}) {
    return reportRepository.getCustomerDuesReport({
      balanceStatus: query.balanceStatus || query.balance_status || query.status || 'HAS_DUES',
      village: query.village || null,
      search: query.search || '',
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * 7. Supplier Outstanding Balances (Accounts Payable) Report
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getSupplierDuesReport(query = {}) {
    return reportRepository.getSupplierDuesReport({
      search: query.search || '',
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * 8. GST / Tax Summary Report
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getGstSummaryReport(query = {}) {
    const { startDate, endDate, periodName } = resolveDateRange({
      period: query.period,
      startDate: query.startDate || query.start_date,
      endDate: query.endDate || query.end_date,
    });

    const result = await reportRepository.getGstSummaryReport({
      startDate,
      endDate,
    });

    result.period.periodName = periodName;
    return result;
  }

  /**
   * 9. Payment Collection & Cash-Flow Summary Report
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getPaymentsSummaryReport(query = {}) {
    const { startDate, endDate, periodName } = resolveDateRange({
      period: query.period,
      startDate: query.startDate || query.start_date,
      endDate: query.endDate || query.end_date,
    });

    const result = await reportRepository.getPaymentsSummaryReport({
      startDate,
      endDate,
    });

    result.period.periodName = periodName;
    return result;
  }

  /**
   * 10. Product-Level Sales & Inventory Summary Report
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getProductSalesReport(query = {}) {
    const { startDate, endDate, periodName } = resolveDateRange({
      period: query.period,
      startDate: query.startDate || query.start_date,
      endDate: query.endDate || query.end_date,
    });

    const result = await reportRepository.getProductSalesReport({
      startDate,
      endDate,
      categoryId: query.categoryId || query.category_id || null,
      sortBy: query.sortBy || query.sort_by || 'revenue',
      sortOrder: query.sortOrder || query.sort_order || 'DESC',
      page: query.page,
      limit: query.limit,
    });

    result.period.periodName = periodName;
    return result;
  }

  /**
   * 11. Transaction History (Unified Sales, Purchases, and Collections Ledger)
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getTransactionHistory(query = {}) {
    const { startDate, endDate, periodName } = resolveDateRange({
      period: query.period,
      startDate: query.startDate || query.start_date,
      endDate: query.endDate || query.end_date,
    });

    const result = await reportRepository.getTransactionHistory({
      type: query.type || 'ALL',
      startDate,
      endDate,
      page: query.page,
      limit: query.limit,
    });

    result.period = {
      startDate,
      endDate,
      periodName,
    };
    return result;
  }
}

module.exports = new ReportService();
