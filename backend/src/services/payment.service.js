const paymentRepository = require('../repositories/payment.repository');
const customerRepository = require('../repositories/customer.repository');
const saleRepository = require('../repositories/sale.repository');
const purchaseRepository = require('../repositories/purchase.repository');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/appError');
const validators = require('../validators');

/**
 * Payment Service
 * Business logic layer for customer cash collections, invoice allocations,
 * on-account deposits, FIFO multi-bill settlements, auditable reversals, and supplier AP disbursements.
 */
class PaymentService {
  /**
   * List customer payment receipts with date filtering and pagination
   * @param {object} query
   * @returns {Promise<{ payments: Array<object>, summary: object, pagination: object }>}
   */
  async listCustomerPayments(query = {}) {
    const {
      customerId,
      customer_id,
      saleId,
      sale_id,
      paymentMethod,
      payment_method,
      allocationStatus,
      allocation_status,
      startDate,
      start_date,
      endDate,
      end_date,
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'payment_date',
      sortOrder = 'DESC',
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const filterOptions = {
      customerId: customerId || customer_id || null,
      saleId: saleId || sale_id || null,
      paymentMethod: paymentMethod || payment_method || null,
      allocationStatus: allocationStatus || allocation_status || null,
      startDate: startDate || start_date || null,
      endDate: endDate || end_date || null,
      search,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder,
    };

    const [payments, total, summary] = await Promise.all([
      paymentRepository.findAll(filterOptions),
      paymentRepository.countAll(filterOptions),
      paymentRepository.getSummary(filterOptions),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      payments,
      summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Get single payment receipt by UUID or receipt_number
   * @param {string} idOrReceiptNo
   * @returns {Promise<object>}
   */
  async getCustomerPayment(idOrReceiptNo) {
    if (!idOrReceiptNo || !idOrReceiptNo.trim()) {
      throw new BadRequestError('Receipt number or payment identifier is required');
    }

    const payment = await paymentRepository.findById(idOrReceiptNo.trim());
    if (!payment) {
      throw new NotFoundError(`Payment receipt '${idOrReceiptNo}' not found`);
    }

    return payment;
  }

  /**
   * Get collection summary metrics
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getPaymentSummary(query = {}) {
    return paymentRepository.getSummary({
      customerId: query.customerId || query.customer_id || null,
      saleId: query.saleId || query.sale_id || null,
      paymentMethod: query.paymentMethod || query.payment_method || null,
      startDate: query.startDate || query.start_date || null,
      endDate: query.endDate || query.end_date || null,
      search: query.search || '',
    });
  }

  /**
   * Record customer payment (direct invoice, multi-invoice, auto-allocation, or on-account)
   * @param {object} data
   * @param {object|null} userContext
   * @returns {Promise<object>}
   */
  async recordPayment(data = {}, userContext = null) {
    const {
      customerId,
      customer_id,
      saleId,
      sale_id,
      invoiceNumber,
      invoice_number,
      amount,
      paymentMethod,
      payment_method,
      method,
      referenceNo,
      reference_no,
      reference,
      notes,
      paymentDate,
      payment_date,
      receiptNumber,
      receipt_number,
      autoAllocate,
      auto_allocate,
      allocations,
    } = data;

    let targetCustomerId = customerId || customer_id || null;
    const targetSaleId = saleId || sale_id || invoiceNumber || invoice_number || null;

    // If customerId omitted but saleId provided, resolve customer from sale
    if (!targetCustomerId && targetSaleId) {
      const sale = await saleRepository.findById(targetSaleId);
      if (!sale) {
        throw new NotFoundError(`Sales invoice '${targetSaleId}' not found`);
      }
      if (!sale.customerId) {
        throw new BadRequestError(`Cannot record subsequent payments for walk-in counter invoice #${sale.invoiceNumber}`);
      }
      targetCustomerId = sale.customerId;
    }

    if (!targetCustomerId) {
      throw new BadRequestError('Customer identifier (customerId) is required to record a payment');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestError('Payment amount must be a positive number greater than 0');
    }
    const decParts = String(amount).trim().split('.');
    if (decParts.length > 2 || (decParts[1] && decParts[1].length > 2)) {
      throw new BadRequestError('Payment amount cannot have more than 2 decimal places');
    }
    const cleanAmount = Number(numAmount.toFixed(2));

    let finalMethod = paymentMethod || payment_method || method || 'CASH';
    const validMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];
    let normalizedMethod = String(finalMethod).trim().toUpperCase();
    if (normalizedMethod === 'CARD') normalizedMethod = 'BANK_TRANSFER';
    else if (normalizedMethod === 'CREDIT (KHATA)') normalizedMethod = 'CASH';
    else if (normalizedMethod.includes('UPI') || normalizedMethod.includes('QR')) normalizedMethod = 'UPI';
    else if (normalizedMethod.includes('BANK')) normalizedMethod = 'BANK_TRANSFER';
    else if (!validMethods.includes(normalizedMethod)) normalizedMethod = 'CASH';

    return paymentRepository.recordCustomerPayment(
      {
        customerId: targetCustomerId,
        saleId: targetSaleId,
        amount: cleanAmount,
        paymentMethod: normalizedMethod,
        referenceNo: referenceNo || reference_no || reference || null,
        notes: notes || null,
        paymentDate: paymentDate || payment_date || null,
        receiptNumber: receiptNumber || receipt_number || null,
        autoAllocate: Boolean(autoAllocate || auto_allocate),
        allocations: Array.isArray(allocations) ? allocations : null,
      },
      userContext
    );
  }

  /**
   * Direct payment against an invoice (e.g. POST /api/sales/:id/payments)
   * @param {string} saleId
   * @param {object} data
   * @param {object|null} userContext
   * @returns {Promise<object>}
   */
  async recordInvoicePayment(saleId, data = {}, userContext = null) {
    if (!saleId || !saleId.trim()) {
      throw new BadRequestError('Invoice identifier is required');
    }

    return this.recordPayment(
      {
        ...data,
        saleId: saleId.trim(),
      },
      userContext
    );
  }

  /**
   * Reverse an erroneous payment receipt with auditable justification
   * @param {string} paymentId
   * @param {string} reason
   * @param {object|null} userContext
   * @returns {Promise<object>}
   */
  async reversePayment(paymentId, reason, userContext = null) {
    if (!paymentId || !paymentId.trim()) {
      throw new BadRequestError('Payment identifier is required');
    }

    if (!userContext || userContext.role !== 'ADMIN') {
      throw new ForbiddenError('Only Store Administrators (ADMIN) are authorized to reverse payment receipts');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      throw new BadRequestError('A valid reason (minimum 3 characters) is required for payment reversal');
    }

    return paymentRepository.reverseCustomerPayment(paymentId.trim(), reason.trim(), userContext);
  }

  /**
   * List wholesale supplier disbursements
   * @param {object} query
   * @returns {Promise<{ supplierPayments: Array<object>, pagination: object }>}
   */
  async listSupplierPayments(query = {}) {
    const {
      supplierId,
      supplier_id,
      purchaseId,
      purchase_id,
      paymentMethod,
      payment_method,
      startDate,
      start_date,
      endDate,
      end_date,
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'payment_date',
      sortOrder = 'DESC',
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const filterOptions = {
      supplierId: supplierId || supplier_id || null,
      purchaseId: purchaseId || purchase_id || null,
      paymentMethod: paymentMethod || payment_method || null,
      startDate: startDate || start_date || null,
      endDate: endDate || end_date || null,
      search,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder,
    };

    const [supplierPayments, total] = await Promise.all([
      paymentRepository.findAllSupplierPayments(filterOptions),
      paymentRepository.countAllSupplierPayments(filterOptions),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      supplierPayments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Get single wholesale supplier payment by ID or payment_number
   * @param {string} idOrNumber
   * @returns {Promise<object>}
   */
  async getSupplierPayment(idOrNumber) {
    if (!idOrNumber || !idOrNumber.trim()) {
      throw new BadRequestError('Supplier payment identifier is required');
    }

    const payment = await paymentRepository.findSupplierPaymentById(idOrNumber.trim());
    if (!payment) {
      throw new NotFoundError(`Supplier payment voucher '${idOrNumber}' not found`);
    }

    return payment;
  }

  /**
   * Record wholesale supplier payment disbursement
   * @param {object} data
   * @param {object|null} userContext
   * @returns {Promise<object>}
   */
  async recordSupplierPayment(data = {}, userContext = null) {
    const {
      supplierId,
      supplier_id,
      purchaseId,
      purchase_id,
      amount,
      paymentMethod,
      payment_method,
      referenceNo,
      reference_no,
      notes,
      paymentDate,
    } = data;

    const targetSupplierId = supplierId || supplier_id;
    const targetPurchaseId = purchaseId || purchase_id;

    if (!targetSupplierId && !targetPurchaseId) {
      throw new BadRequestError('Either supplierId or purchaseId is required to record a supplier disbursement');
    }

    return paymentRepository.recordSupplierDisbursement(
      {
        supplierId: targetSupplierId,
        purchaseId: targetPurchaseId,
        amount: Number(amount),
        paymentMethod: paymentMethod || payment_method || 'BANK_TRANSFER',
        referenceNo: referenceNo || reference_no || null,
        notes: notes || null,
        paymentDate: paymentDate || null,
      },
      userContext
    );
  }
}

module.exports = new PaymentService();
