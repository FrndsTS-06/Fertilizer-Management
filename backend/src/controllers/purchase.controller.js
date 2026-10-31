const purchaseService = require('../services/purchase.service');
const { sendSuccess } = require('../utils/response');
const { BadRequestError } = require('../utils/appError');
const validators = require('../validators');

/**
 * Purchase HTTP Controller
 * Handles purchase order intake, line items, supplier invoices, and accounts payable disbursements.
 */
class PurchaseController {
  /**
   * GET /api/purchases
   * List purchases with filters, pagination, and AP metrics summary
   */
  async listPurchases(req, res, next) {
    try {
      const result = await purchaseService.listPurchases(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: result.purchases,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/purchases/summary
   * Aggregate accounts payable and purchase summary
   */
  async getSummary(req, res, next) {
    try {
      const summary = await purchaseService.getSummary();
      return sendSuccess(res, {
        statusCode: 200,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/purchases/:id
   * Get single purchase order with line items and payment disbursements
   */
  async getPurchaseById(req, res, next) {
    try {
      const { id } = req.params;
      const purchase = await purchaseService.getPurchase(id);
      return sendSuccess(res, {
        statusCode: 200,
        data: purchase,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/purchases
   * Create a purchase order, line items, and stock inward movement in a single atomic transaction
   */
  async createPurchase(req, res, next) {
    try {
      const result = await purchaseService.createPurchase(req.user, req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: `Purchase invoice #${result.purchaseInvoiceNo} created successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/purchases/:id/payments
   * Record a disbursement towards a purchase invoice
   */
  async recordPayment(req, res, next) {
    try {
      const { id } = req.params;
      const result = await purchaseService.recordPayment(req.user, id, req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: result.message,
        data: {
          purchase: result.purchase,
          payment: result.payment,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/purchases/:id/payments
   * List all payment disbursements made towards a purchase invoice
   */
  async getPurchasePayments(req, res, next) {
    try {
      const { id } = req.params;
      const payments = await purchaseService.getPurchasePayments(id);
      return sendSuccess(res, {
        statusCode: 200,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PurchaseController();
