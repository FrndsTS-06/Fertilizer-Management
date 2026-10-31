const purchaseRepository = require('../repositories/purchase.repository');
const supplierRepository = require('../repositories/supplier.repository');
const productRepository = require('../repositories/product.repository');
const { BadRequestError, NotFoundError } = require('../utils/appError');

/**
 * Purchase Business Service
 * Encapsulates supplier purchase order creation, line items validation,
 * inventory stock inward coordination, and accounts payable disbursements.
 */
class PurchaseService {
  /**
   * List purchases with search, status filters, and pagination
   * @param {object} query
   * @returns {Promise<{ purchases: Array<object>, summary: object, pagination: object }>}
   */
  async listPurchases(query = {}) {
    const {
      supplierId,
      supplier_id,
      lifecycleStatus,
      lifecycle_status,
      paymentStatus,
      payment_status,
      startDate,
      start_date,
      endDate,
      end_date,
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'purchase_date',
      sortOrder = 'DESC',
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const targetSupplier = supplierId || supplier_id || null;
    const targetLifecycle = lifecycleStatus || lifecycle_status || null;
    const targetPayment = paymentStatus || payment_status || null;
    const targetStart = startDate || start_date || null;
    const targetEnd = endDate || end_date || null;

    const [purchases, total, summary] = await Promise.all([
      purchaseRepository.findAll({
        supplierId: targetSupplier,
        lifecycleStatus: targetLifecycle,
        paymentStatus: targetPayment,
        startDate: targetStart,
        endDate: targetEnd,
        search,
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder,
      }),
      purchaseRepository.countAll({
        supplierId: targetSupplier,
        lifecycleStatus: targetLifecycle,
        paymentStatus: targetPayment,
        startDate: targetStart,
        endDate: targetEnd,
        search,
      }),
      purchaseRepository.getSummary(),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      purchases,
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
   * Get single purchase order by UUID or invoice number
   * @param {string} idOrInvoiceNo
   * @returns {Promise<object>}
   */
  async getPurchase(idOrInvoiceNo) {
    if (!idOrInvoiceNo || !String(idOrInvoiceNo).trim()) {
      throw new BadRequestError('Purchase identifier is required');
    }

    const purchase = await purchaseRepository.findById(idOrInvoiceNo.trim());
    if (!purchase) {
      throw new NotFoundError(`Purchase order '${idOrInvoiceNo}' not found`);
    }

    return purchase;
  }

  /**
   * Get aggregate purchase and accounts payable metrics
   * @returns {Promise<object>}
   */
  async getSummary() {
    return purchaseRepository.getSummary();
  }

  /**
   * Create a purchase inward order with line items, atomically increasing warehouse stock
   * 
   * @param {object|null} user - Current authenticated user
   * @param {object} data - Purchase request payload
   * @returns {Promise<object>}
   */
  async createPurchase(user, data) {
    const {
      supplierId,
      supplier_id,
      supplierName,
      supplier,
      purchaseInvoiceNo,
      purchase_invoice_no,
      invoiceNumber,
      invoice_number,
      items,
      lineItems,
      line_items,
      totalAmount,
      total_amount,
      paidAmount,
      paid_amount,
      lifecycleStatus,
      lifecycle_status,
      paymentStatus,
      payment_status,
      paymentMethod,
      payment_method,
      notes,
      purchaseDate,
      purchase_date,
    } = data;

    // 1. Resolve Supplier
    let resolvedSupplierId = supplierId || supplier_id;
    if (!resolvedSupplierId && (supplierName || supplier)) {
      const name = (supplierName || supplier).trim();
      const s = await supplierRepository.findByName(name);
      if (!s) {
        throw new NotFoundError(`Supplier with name '${name}' not found`);
      }
      resolvedSupplierId = s.id;
    }

    if (!resolvedSupplierId) {
      throw new BadRequestError('Supplier identifier (supplierId or supplierName) is required');
    }

    // 2. Resolve Purchase Invoice Number
    let finalInvoiceNo = purchaseInvoiceNo || purchase_invoice_no || invoiceNumber || invoice_number;
    if (!finalInvoiceNo || !String(finalInvoiceNo).trim()) {
      finalInvoiceNo = await purchaseRepository.generateNextInvoiceNo();
    } else {
      finalInvoiceNo = String(finalInvoiceNo).trim().toUpperCase();
    }

    // 3. Validate Line Items
    const rawItems = items || lineItems || line_items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BadRequestError('Purchase order must contain at least one line item');
    }

    const validatedItems = [];
    let calculatedTotal = 0;

    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const prodId = item.productId || item.product_id || item.productCode || item.code || item.id;
      if (!prodId || !String(prodId).trim()) {
        throw new BadRequestError(`Item at position ${idx + 1} is missing a product identifier`);
      }

      const qty = Number(item.quantity !== undefined ? item.quantity : item.qty);
      if (isNaN(qty) || qty <= 0) {
        throw new BadRequestError(
          `Item at position ${idx + 1} has invalid quantity (${item.quantity}). Quantity must be greater than 0`
        );
      }

      const rawUnitCost = item.unitCost !== undefined ? item.unitCost : (item.unit_cost !== undefined ? item.unit_cost : (item.costPrice !== undefined ? item.costPrice : item.price));
      const unitCost = Number(rawUnitCost);
      if (isNaN(unitCost) || unitCost < 0) {
        throw new BadRequestError(
          `Item at position ${idx + 1} has invalid unit cost (${rawUnitCost}). Unit cost must be a non-negative number`
        );
      }

      const subtotal = Number((qty * unitCost).toFixed(2));
      calculatedTotal += subtotal;

      validatedItems.push({
        productId: String(prodId).trim(),
        quantity: Number(qty.toFixed(3)),
        unitCost: Number(unitCost.toFixed(2)),
        subtotal,
        unit: item.unit ? String(item.unit).trim() : 'Bags',
      });
    }

    calculatedTotal = Number(calculatedTotal.toFixed(2));

    // 4. Validate Total Amount
    let finalTotal = calculatedTotal;
    const rawTotal = totalAmount !== undefined ? totalAmount : total_amount;
    if (rawTotal !== undefined && rawTotal !== null && rawTotal !== '') {
      const providedTotal = Number(rawTotal);
      if (isNaN(providedTotal) || providedTotal < 0) {
        throw new BadRequestError('Total amount must be a non-negative number');
      }
      if (Math.abs(providedTotal - calculatedTotal) > 0.05) {
        throw new BadRequestError(
          `Total amount mismatch: provided ₹${providedTotal}, but calculated sum of line items is ₹${calculatedTotal}`
        );
      }
      finalTotal = providedTotal;
    }

    // 5. Calculate Paid Amount & Due Amount
    let finalPaid = 0;
    const rawPaid = paidAmount !== undefined ? paidAmount : paid_amount;
    const rawPaymentStatus = paymentStatus || payment_status;

    if (rawPaid !== undefined && rawPaid !== null && rawPaid !== '') {
      const numPaid = Number(rawPaid);
      if (isNaN(numPaid) || numPaid < 0) {
        throw new BadRequestError('Paid amount must be a non-negative number');
      }
      if (numPaid > finalTotal) {
        throw new BadRequestError(
          `Paid amount (₹${numPaid}) cannot exceed total purchase amount (₹${finalTotal})`
        );
      }
      finalPaid = numPaid;
    } else if (rawPaymentStatus && rawPaymentStatus.toUpperCase() === 'PAID') {
      finalPaid = finalTotal;
    } else if (rawPaymentStatus && rawPaymentStatus.toUpperCase() === 'UNPAID') {
      finalPaid = 0.0;
    } else {
      // Default to fully paid for retail purchase orders if payment method specified
      finalPaid = finalTotal;
    }

    finalPaid = Number(finalPaid.toFixed(2));
    const finalDue = Number((finalTotal - finalPaid).toFixed(2));

    // 6. Decoupled Payment Status & Lifecycle Status
    let derivedPaymentStatus = 'PAID';
    if (finalDue <= 0.0) {
      derivedPaymentStatus = 'PAID';
    } else if (finalPaid > 0.0) {
      derivedPaymentStatus = 'PARTIAL';
    } else {
      derivedPaymentStatus = 'UNPAID';
    }

    let finalLifecycle = (lifecycleStatus || lifecycle_status || 'RECEIVED').toUpperCase();
    if (!['DRAFT', 'RECEIVED', 'CANCELLED'].includes(finalLifecycle)) {
      throw new BadRequestError("Lifecycle status must be one of: 'DRAFT', 'RECEIVED', 'CANCELLED'");
    }

    const purchaseHeader = {
      purchaseInvoiceNo: finalInvoiceNo,
      supplierId: resolvedSupplierId,
      totalAmount: finalTotal,
      paidAmount: finalPaid,
      dueAmount: finalDue,
      lifecycleStatus: finalLifecycle,
      paymentStatus: derivedPaymentStatus,
      paymentMethod: (paymentMethod || payment_method || 'BANK_TRANSFER').toUpperCase(),
      notes: notes ? String(notes).trim() : null,
      purchaseDate: purchaseDate || purchase_date || new Date().toISOString(),
    };

    const userContext = user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.fullName || user.full_name || user.email,
        }
      : null;

    return purchaseRepository.createPurchaseWithItems(purchaseHeader, validatedItems, userContext);
  }

  /**
   * Disburse payment toward a purchase order
   * @param {object|null} user
   * @param {string} purchaseId
   * @param {object} paymentData
   * @returns {Promise<{ message: string, purchase: object, payment: object }>}
   */
  async recordPayment(user, purchaseId, paymentData) {
    if (!purchaseId || !String(purchaseId).trim()) {
      throw new BadRequestError('Purchase identifier is required');
    }

    const { amount, paymentMethod, payment_method, referenceNo, reference_no, notes, paymentDate, payment_date } = paymentData;

    if (amount === undefined || amount === null || amount === '') {
      throw new BadRequestError('Payment amount is required');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestError('Payment amount must be a positive number greater than 0');
    }

    const validMethods = ['BANK_TRANSFER', 'CHEQUE', 'UPI', 'CASH'];
    const method = (paymentMethod || payment_method || 'BANK_TRANSFER').toUpperCase();
    if (!validMethods.includes(method)) {
      throw new BadRequestError(`Payment method must be one of: ${validMethods.join(', ')}`);
    }

    const userContext = user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.fullName || user.full_name || user.email,
        }
      : null;

    const result = await purchaseRepository.recordSupplierPayment(
      purchaseId.trim(),
      {
        amount: numAmount,
        paymentMethod: method,
        referenceNo: referenceNo || reference_no || null,
        notes: notes ? String(notes).trim() : null,
        paymentDate: paymentDate || payment_date || new Date().toISOString(),
      },
      userContext
    );

    return {
      message: `Payment of ₹${numAmount.toFixed(2)} recorded successfully for invoice #${result.purchase.purchaseInvoiceNo}`,
      purchase: result.purchase,
      payment: result.payment,
    };
  }

  /**
   * Retrieve all payments made toward a purchase
   * @param {string} purchaseId
   * @returns {Promise<Array<object>>}
   */
  async getPurchasePayments(purchaseId) {
    if (!purchaseId || !String(purchaseId).trim()) {
      throw new BadRequestError('Purchase identifier is required');
    }
    return purchaseRepository.getPaymentsByPurchaseId(purchaseId.trim());
  }
}

module.exports = new PurchaseService();
