/**
 * Report Service for Fertilizer Shop Management
 * Integrates with backend /api/reports and /api/dashboard endpoints
 */
import apiClient from './apiClient';

export const reportService = {
  // GET /api/reports/dashboard (or /api/dashboard)
  async getDashboardSummary() {
    try {
      const res = await apiClient.get('/reports/dashboard');
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getDashboardSummary error:', e.message);
      return null;
    }
  },

  // GET /api/reports/sales
  async getSalesReport(params = {}) {
    try {
      const res = await apiClient.get('/reports/sales', params);
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getSalesReport error:', e.message);
      return null;
    }
  },

  // GET /api/reports/purchases
  async getPurchasesReport(params = {}) {
    try {
      const res = await apiClient.get('/reports/purchases', params);
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getPurchasesReport error:', e.message);
      return null;
    }
  },

  // GET /api/reports/low-stock
  async getLowStockReport() {
    try {
      const res = await apiClient.get('/reports/low-stock');
      return res?.data || [];
    } catch (e) {
      console.warn('reportService.getLowStockReport error:', e.message);
      return [];
    }
  },

  // GET /api/reports/inventory-valuation
  async getInventoryValuationReport() {
    try {
      const res = await apiClient.get('/reports/inventory-valuation');
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getInventoryValuationReport error:', e.message);
      return null;
    }
  },

  // GET /api/reports/customer-dues
  async getCustomerDuesReport(params = {}) {
    try {
      const res = await apiClient.get('/reports/customer-dues', params);
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getCustomerDuesReport error:', e.message);
      return null;
    }
  },

  // GET /api/reports/supplier-dues
  async getSupplierDuesReport(params = {}) {
    try {
      const res = await apiClient.get('/reports/supplier-dues', params);
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getSupplierDuesReport error:', e.message);
      return null;
    }
  },

  // GET /api/reports/gst-summary
  async getGstSummaryReport(params = {}) {
    try {
      const res = await apiClient.get('/reports/gst-summary', params);
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getGstSummaryReport error:', e.message);
      return null;
    }
  },

  // GET /api/reports/payments
  async getPaymentsReport(params = {}) {
    try {
      const res = await apiClient.get('/reports/payments', params);
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getPaymentsReport error:', e.message);
      return null;
    }
  },

  // GET /api/reports/product-performance
  async getProductPerformanceReport(params = {}) {
    try {
      const res = await apiClient.get('/reports/product-performance', params);
      return res?.data || null;
    } catch (e) {
      console.warn('reportService.getProductPerformanceReport error:', e.message);
      return null;
    }
  },
};

export default reportService;

