const paymentService = require('../services/payment.service');

/**
 * Payment Controller
 * HTTP request & response handler for customer collection receipts, invoice allocations,
 * on-account deposits, payment reversals, and wholesale supplier disbursements.
 */
class PaymentController {
  /**
   * GET /api/payments
   * List customer payment receipts with date filtering and pagination
   */
  async listPayments(req, res, next) {
    try {
      const result = await paymentService.listCustomerPayments(req.query);
      return res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/summary
   * Aggregated collection metrics and payment mode breakdowns
   */
  async getPaymentSummary(req, res, next) {
    try {
      const summary = await paymentService.getPaymentSummary(req.query);
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/:id
   * Retrieve single customer payment receipt with invoice & customer references
   */
  async getPaymentById(req, res, next) {
    try {
      const payment = await paymentService.getCustomerPayment(req.params.id);
      return res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments
   * Record customer payment (direct invoice, multi-invoice, auto-allocation, or on-account deposit)
   */
  async recordPayment(req, res, next) {
    try {
      const result = await paymentService.recordPayment(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/sales/:id/payments
   * Record invoice-allocated payment directly against an invoice
   */
  async recordInvoicePayment(req, res, next) {
    try {
      const result = await paymentService.recordInvoicePayment(req.params.id, req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Invoice payment recorded successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/:id/reverse
   * Auditable reversal of an erroneous or bounced payment receipt (Admin only)
   */
  async reversePayment(req, res, next) {
    try {
      const result = await paymentService.reversePayment(req.params.id, req.body.reason, req.user);
      return res.status(200).json({
        success: true,
        message: 'Payment reversed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/suppliers
   * List wholesale supplier disbursements
   */
  async listSupplierPayments(req, res, next) {
    try {
      const result = await paymentService.listSupplierPayments(req.query);
      return res.status(200).json({
        success: true,
        data: result.supplierPayments,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/suppliers/:id
   * Retrieve single wholesale supplier payment voucher
   */
  async getSupplierPaymentById(req, res, next) {
    try {
      const payment = await paymentService.getSupplierPayment(req.params.id);
      return res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/suppliers
   * Record wholesale supplier payment disbursement
   */
  async recordSupplierPayment(req, res, next) {
    try {
      const result = await paymentService.recordSupplierPayment(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Supplier payment recorded successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();
