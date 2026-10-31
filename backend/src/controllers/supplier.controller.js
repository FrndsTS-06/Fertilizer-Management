const supplierService = require('../services/supplier.service');
const { sendSuccess } = require('../utils/response');

/**
 * Supplier HTTP Controller
 * Manages HTTP requests and responses for wholesale suppliers and distributors.
 */
class SupplierController {
  /**
   * GET /api/suppliers
   * List suppliers with search, active status filter, and pagination
   */
  async listSuppliers(req, res, next) {
    try {
      const { suppliers, pagination } = await supplierService.listSuppliers(req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: suppliers,
        pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/suppliers/:id
   * Get single supplier detail by UUID or Name
   */
  async getSupplierById(req, res, next) {
    try {
      const supplier = await supplierService.getSupplier(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/suppliers
   * Create a new wholesale supplier (Admin only)
   */
  async createSupplier(req, res, next) {
    try {
      const supplier = await supplierService.createSupplier(req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Supplier created successfully',
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/suppliers/:id or PUT /api/suppliers/:id
   * Update supplier attributes (Admin only)
   */
  async updateSupplier(req, res, next) {
    try {
      const supplier = await supplierService.updateSupplier(req.params.id, req.body);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Supplier updated successfully',
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/suppliers/:id or POST /api/suppliers/:id/archive
   * Archive / Soft-delete supplier (Admin only)
   */
  async archiveSupplier(req, res, next) {
    try {
      const result = await supplierService.archiveSupplier(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result.supplier,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/suppliers/:id/restore
   * Restore archived supplier (Admin only)
   */
  async restoreSupplier(req, res, next) {
    try {
      const result = await supplierService.restoreSupplier(req.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result.supplier,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/suppliers/:id/purchases
   * List purchase orders associated with this supplier
   */
  async getSupplierPurchases(req, res, next) {
    try {
      const purchases = await supplierService.getSupplierPurchases(req.params.id, req.query);
      return sendSuccess(res, {
        statusCode: 200,
        data: purchases,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SupplierController();
