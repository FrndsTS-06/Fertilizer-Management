const customerService = require('../services/customer.service');
const { sendSuccess } = require('../utils/response');

/**
 * Customer HTTP Controller
 * Handles farmer account endpoints, Khata balances, and transaction history.
 */
class CustomerController {
  /**
   * GET /api/customers
   * List customers with search, dues filter, village filter, summary metrics, and pagination
   */
  async listCustomers(req, res, next) {
    try {
      const { customers, summary, pagination } = await customerService.listCustomers(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: customers,
        summary,
        pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/customers/:id
   * Get single customer by UUID or customer_code (e.g. CUST001)
   */
  async getCustomerById(req, res, next) {
    try {
      const customer = await customerService.getCustomer(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/customers
   * Register a new customer
   */
  async createCustomer(req, res, next) {
    try {
      const customer = await customerService.createCustomer(req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Customer registered successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/customers/:id or PUT /api/customers/:id
   * Update customer profile
   */
  async updateCustomer(req, res, next) {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.body);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Customer details updated',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/customers/:id or POST /api/customers/:id/archive
   * Archive / Soft-delete customer (Admin only)
   */
  async archiveCustomer(req, res, next) {
    try {
      const result = await customerService.archiveCustomer(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result.customer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/customers/:id/restore
   * Restore archived customer (Admin only)
   */
  async restoreCustomer(req, res, next) {
    try {
      const result = await customerService.restoreCustomer(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result.customer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/customers/:id/balance
   * Retrieve single source of truth balance metrics and unpaid invoices
   */
  async getCustomerBalance(req, res, next) {
    try {
      const balance = await customerService.getCustomerBalance(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/customers/:id/sales
   * Retrieve invoice/sales history for this customer
   */
  async getCustomerSales(req, res, next) {
    try {
      const sales = await customerService.getCustomerSales(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        data: sales,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/customers/:id/payments
   * Retrieve payment receipts history for this customer
   */
  async getCustomerPayments(req, res, next) {
    try {
      const payments = await customerService.getCustomerPayments(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/customers/:id/ledger
   * Retrieve unified chronological transaction statement
   */
  async getCustomerLedger(req, res, next) {
    try {
      const ledger = await customerService.getCustomerLedger(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        data: ledger,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerController();
