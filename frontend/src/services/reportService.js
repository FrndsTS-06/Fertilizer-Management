/**
 * Report Service for Fertilizer Shop Management
 * Integrates with backend /api/reports and /api/dashboard endpoints
 */
import apiClient, { apiStatus } from './apiClient';

export const reportService = {
  // GET /api/reports/dashboard (or /api/dashboard)
  async getDashboardSummary() {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/dashboard');
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },

  // GET /api/reports/sales
  async getSalesReport(params = {}) {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/sales', params);
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },

  // GET /api/reports/purchases
  async getPurchasesReport(params = {}) {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/purchases', params);
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },

  // GET /api/reports/low-stock
  async getLowStockReport() {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/low-stock');
        return res?.data || [];
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return [];
  },

  // GET /api/reports/inventory-valuation
  async getInventoryValuationReport() {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/inventory-valuation');
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },

  // GET /api/reports/customer-dues
  async getCustomerDuesReport(params = {}) {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/customer-dues', params);
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },

  // GET /api/reports/supplier-dues
  async getSupplierDuesReport(params = {}) {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/supplier-dues', params);
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },

  // GET /api/reports/gst-summary
  async getGstSummaryReport(params = {}) {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/gst-summary', params);
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },

  // GET /api/reports/payments
  async getPaymentsReport(params = {}) {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/payments', params);
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },

  // GET /api/reports/product-performance
  async getProductPerformanceReport(params = {}) {
    if (!apiStatus.isOffline()) {
      try {
        const res = await apiClient.get('/reports/product-performance', params);
        return res?.data || null;
      } catch {
        apiStatus.setOffline(true);
      }
    }
    return null;
  },
};

export default reportService;

