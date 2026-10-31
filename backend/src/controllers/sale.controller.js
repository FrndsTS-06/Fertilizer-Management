const saleService = require('../services/sale.service');

/**
 * Sale Controller
 * HTTP request & response handler for POS sales billing, invoice lookups, and reporting feeds.
 */
class SaleController {
  /**
   * GET /api/sales
   * List sales with date filters, status, customer filters, and pagination
   */
  async listSales(req, res, next) {
    try {
      const result = await saleService.listSales(req.query);
      return res.status(200).json({
        success: true,
        data: result.sales,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/sales/summary
   * Aggregated financial metrics and transaction volume totals
   */
  async getSaleSummary(req, res, next) {
    try {
      const summary = await saleService.getSummary(req.query);
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/sales/:id
   * Retrieve print-ready invoice details with items, customer details, and payment receipts
   */
  async getSaleById(req, res, next) {
    try {
      const sale = await saleService.getSale(req.params.id);
      return res.status(200).json({
        success: true,
        data: sale,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/sales
   * Create POS sale, verify stock, deduct inventory, and record payments atomically
   */
  async createSale(req, res, next) {
    try {
      const createdSale = await saleService.createSale(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Sale invoice created successfully',
        data: createdSale,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/sales/receipts/clear-all
   * Clear customer receipts (sales invoices and payment receipts) and restore inventory
   */
  async clearCustomerReceipts(req, res, next) {
    try {
      const options = {
        customerId: req.body?.customerId || req.query?.customerId || null,
        clearType: req.body?.clearType || req.query?.clearType || 'CUSTOMER',
        restoreStock: req.body?.restoreStock !== false && req.query?.restoreStock !== 'false',
      };
      const result = await saleService.clearCustomerReceipts(options);
      return res.status(200).json({
        success: true,
        message: 'Customer receipts cleared successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SaleController();
