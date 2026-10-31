/**
 * Service layer for Customer Management, Invoices & Khata Payments
 * Powered by centralized apiClient with live backend REST API integration.
 * Communicates directly with PostgreSQL via /api/customers, /api/sales, and /api/payments.
 */
import apiClient from './apiClient';

export const customerService = {
  /**
   * GET /api/customers
   * Retrieve real customer records joined with v_customer_balances
   */
  async getCustomers({ search = '', duesOnly = 'all', village = 'All', dateFilter = 'all', sortBy = 'latest_activity', sortOrder = 'DESC', page = 1, limit = 50 } = {}) {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (duesOnly) params.duesOnly = duesOnly;
    if (village && village !== 'All') params.village = village;
    if (dateFilter && dateFilter !== 'all') params.dateFilter = dateFilter;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const res = await apiClient.get('/customers', params);
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    return {
      data: list,
      summary: res?.summary || null,
      pagination: res?.pagination || null,
    };
  },

  /**
   * GET /api/customers/:id
   * Retrieve single customer by UUID or customer_code
   */
  async getCustomerById(id) {
    if (!id) return null;
    const res = await apiClient.get(`/customers/${id}`);
    return res?.data || res || null;
  },

  /**
   * POST /api/customers
   * Register a new customer in PostgreSQL database
   */
  async createCustomer(customerData) {
    const res = await apiClient.post('/customers', customerData);
    return res?.data || res;
  },

  /**
   * PATCH /api/customers/:id
   * Update customer profile in PostgreSQL database
   */
  async updateCustomer(id, customerData) {
    const res = await apiClient.patch(`/customers/${id}`, customerData);
    return res?.data || res;
  },

  /**
   * DELETE /api/customers/:id
   * Archive / Delete customer record from PostgreSQL database
   */
  async deleteCustomer(id) {
    const res = await apiClient.delete(`/customers/${id}`);
    return res?.data || res;
  },

  /**
   * GET /api/customers/:id/sales
   * Retrieve all sales invoices for this customer
   */
  async getCustomerSales(id) {
    if (!id) return [];
    const res = await apiClient.get(`/customers/${id}/sales`);
    return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  },

  /**
   * GET /api/customers/:id/payments
   * Retrieve all payments/receipts recorded for this customer
   */
  async getCustomerPayments(id) {
    if (!id) return [];
    const res = await apiClient.get(`/customers/${id}/payments`);
    return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  },

  /**
   * GET /api/customers/:id/balance
   * Single source of truth Khata balance and unpaid invoices breakdown
   */
  async getCustomerBalance(id) {
    if (!id) return null;
    const res = await apiClient.get(`/customers/${id}/balance`);
    return res?.data || res || null;
  },

  /**
   * POST /api/sales/:id/payments
   * Record payment against a specific invoice
   */
  async recordInvoicePayment(saleId, { amount, method = 'CASH', reference = '', notes = '' }) {
    const res = await apiClient.post(`/sales/${saleId}/payments`, {
      amount: Number(amount),
      paymentMethod: method,
      method: method,
      referenceNo: reference,
      reference: reference,
      notes,
    });
    return res?.data || res;
  },

  /**
   * GET /api/sales
   * List all sales from backend database
   */
  async getAllSales(params = null) {
    const res = await apiClient.get('/sales', params);
    return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  },

  /**
   * GET /api/payments
   * List all payment receipts from backend database
   */
  async getAllPayments(params = null) {
    const res = await apiClient.get('/payments', params);
    return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  },
};
