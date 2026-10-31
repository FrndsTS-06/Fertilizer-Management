const saleRepository = require('../repositories/sale.repository');
const customerRepository = require('../repositories/customer.repository');
const productRepository = require('../repositories/product.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/appError');
const validators = require('../validators');

/**
 * Sale Service
 * Business logic layer for POS invoicing, automated totals/tax calculations,
 * walk-in direct sales, customer credit checks, and inventory synchronization.
 */
class SaleService {
  /**
   * Calculate exact financial totals on the server
   * NEVER trust client-submitted subtotals, tax amounts, or total payables.
   * 
   * @param {Array<object>} items - Line items with verified prices and quantities
   * @param {number} gstRate - Tax rate percentage (e.g. 5.00, 18.00)
   * @param {string} gstMode - 'EXCLUSIVE' (added on top) or 'INCLUSIVE' (included in price)
   * @param {number} [orderDiscount=0] - Optional order-level discount
   * @returns {{ subtotal: number, gstRate: number, gstMode: string, gstAmount: number, totalAmount: number }}
   */
  calculateSaleTotals(items, gstRate = 5.0, gstMode = 'EXCLUSIVE', orderDiscount = 0) {
    // 1. Calculate line subtotals
    let grossSubtotal = 0;
    for (const item of items) {
      grossSubtotal += Number(item.subtotal || 0);
    }
    grossSubtotal = Number(grossSubtotal.toFixed(2));

    // 2. Apply order discount if present
    const discount = Math.max(0, Number(orderDiscount || 0));
    const taxableSubtotal = Number(Math.max(0, grossSubtotal - discount).toFixed(2));

    const rate = Math.max(0, Math.min(100, Number(gstRate || 0)));
    const mode = String(gstMode || 'EXCLUSIVE').toUpperCase() === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE';

    let gstAmount = 0;
    let totalAmount = 0;

    if (mode === 'EXCLUSIVE') {
      // GST added on top of taxable subtotal
      gstAmount = Number(((taxableSubtotal * rate) / 100).toFixed(2));
      totalAmount = Number((taxableSubtotal + gstAmount).toFixed(2));
    } else {
      // GST is already included inside product prices
      gstAmount = rate > 0 ? Number(((taxableSubtotal * rate) / (100 + rate)).toFixed(2)) : 0.0;
      totalAmount = taxableSubtotal;
    }

    return {
      subtotal: taxableSubtotal,
      gstRate: rate,
      gstMode: mode,
      gstAmount,
      totalAmount,
    };
  }

  /**
   * List sales with date filtering, status filters, and pagination
   * @param {object} query
   * @returns {Promise<{ sales: Array<object>, summary: object, pagination: object }>}
   */
  async listSales(query = {}) {
    const {
      customerId,
      customer_id,
      paymentStatus,
      payment_status,
      status,
      paymentMethod,
      payment_method,
      billingType,
      billing_type,
      startDate,
      start_date,
      endDate,
      end_date,
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'sale_date',
      sortOrder = 'DESC',
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const filterOptions = {
      customerId: customerId || customer_id || null,
      paymentStatus: paymentStatus || payment_status || status || null,
      paymentMethod: paymentMethod || payment_method || null,
      billingType: billingType || billing_type || null,
      startDate: startDate || start_date || null,
      endDate: endDate || end_date || null,
      search,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder,
    };

    const [sales, total, summary] = await Promise.all([
      saleRepository.findAll(filterOptions),
      saleRepository.countAll(filterOptions),
      saleRepository.getSummary(filterOptions),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      sales,
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
   * Get single sale by UUID or invoiceNumber with complete breakdown
   * @param {string} idOrInvoiceNo
   * @returns {Promise<object>}
   */
  async getSale(idOrInvoiceNo) {
    if (!idOrInvoiceNo || !idOrInvoiceNo.trim()) {
      throw new BadRequestError('Invoice number or identifier is required');
    }

    const sale = await saleRepository.findById(idOrInvoiceNo.trim());
    if (!sale) {
      throw new NotFoundError(`Sale invoice '${idOrInvoiceNo}' not found`);
    }

    // Attach full customer profile if linked to registered customer
    if (sale.customerId) {
      try {
        const customer = await customerRepository.findById(sale.customerId);
        if (customer) {
          sale.customer = {
            id: customer.id,
            customerCode: customer.customerCode,
            name: customer.name,
            phone: customer.phone,
            village: customer.village,
            address: customer.address,
            creditLimit: customer.creditLimit,
            outstandingDues: customer.outstandingDues,
            availableCredit: customer.availableCredit,
          };
        }
      } catch (err) {
        // Silently proceed if customer lookup non-critical
      }
    }

    return sale;
  }

  /**
   * Get aggregated sales metrics
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getSummary(query = {}) {
    return saleRepository.getSummary({
      customerId: query.customerId || query.customer_id || null,
      paymentStatus: query.paymentStatus || query.payment_status || query.status || null,
      paymentMethod: query.paymentMethod || query.payment_method || null,
      billingType: query.billingType || query.billing_type || null,
      startDate: query.startDate || query.start_date || null,
      endDate: query.endDate || query.end_date || null,
      search: query.search || '',
    });
  }

  /**
   * Create POS sale, record items, deduct stock, and register payments atomically
   * @param {object} data - Client payload
   * @param {object|null} userContext - Current authenticated user
   * @returns {Promise<object>}
   */
  async createSale(data = {}, userContext = null) {
    // 1. Validate payload using standardized validator
    const validationErrors = validators.validateCreateSale({ body: data });
    if (validationErrors.length > 0) {
      throw new BadRequestError(`Validation failed: ${validationErrors.join('; ')}`);
    }

    const {
      customerId,
      customer_id,
      customerName,
      customer_name,
      customerPhone,
      customer_phone,
      customerVillage,
      customer_village,
      customerAddress,
      customer_address,
      ownerGstin,
      owner_gstin,
      ownerGstId,
      gstId,
      invoiceNumber,
      invoice_number,
      items = [],
      lineItems,
      line_items,
      gstRate,
      gst_rate,
      gstMode,
      gst_mode,
      paymentMethod,
      payment_method,
      paymentMode,
      paidAmount,
      paid_amount,
      discount,
      saleDate,
      sale_date,
      date,
    } = data;

    const rawItems = items.length > 0 ? items : (lineItems || line_items || []);
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BadRequestError('Sale must contain at least one line item');
    }

    // 2. Resolve payment method early
    let rawMethod = String(paymentMethod || payment_method || paymentMode || 'CASH').trim().toUpperCase();
    if (rawMethod === 'UPI / QR' || rawMethod.includes('UPI')) rawMethod = 'UPI';
    else if (rawMethod === 'CREDIT' || rawMethod.includes('KHATA')) rawMethod = 'CREDIT (KHATA)';
    else if (rawMethod === 'BANK') rawMethod = 'CARD';

    const validMethods = ['CASH', 'UPI', 'CREDIT (KHATA)', 'CARD', 'CHEQUE'];
    if (!validMethods.includes(rawMethod)) {
      throw new BadRequestError(`Invalid payment method '${rawMethod}'. Allowed methods: ${validMethods.join(', ')}`);
    }

    const isCredit = rawMethod === 'CREDIT (KHATA)';

    // 3. Resolve billing type and customer information
    const rawBillingType = String(data.billingType || data.billing_type || '').trim().toUpperCase();
    const resolvedCustomerId = customerId || customer_id || null;
    const rawName = (customerName || customer_name || '').trim();
    const rawPhone = (customerPhone || customer_phone || '').trim();
    const rawVillage = (customerVillage || customer_village || '').trim();
    const rawAddress = (customerAddress || customer_address || '').trim();
    const isPlaceholderWalkIn = !rawName || /walk-?in|counter|anonymous|direct sale|cash customer/i.test(rawName);

    let billingType = 'RETAIL';
    if (rawBillingType === 'RETAIL') {
      billingType = 'RETAIL';
    } else if (rawBillingType === 'CUSTOMER') {
      billingType = 'CUSTOMER';
    } else if (resolvedCustomerId || isCredit) {
      billingType = 'CUSTOMER';
    } else if (!isPlaceholderWalkIn && rawName) {
      // Legacy compatibility: when no explicit billingType is given and genuine customer name is provided
      billingType = 'CUSTOMER';
    } else {
      billingType = 'RETAIL';
    }

    let customer = null;

    if (billingType === 'RETAIL') {
      // Retail Bill behavior:
      // Direct counter sale. Never link to or create a registered customer in the database.
      if (isCredit) {
        throw new BadRequestError('Retail Bills cannot use Credit (Khata) settlement. Please select Customer Bill or use Cash/UPI/Card.');
      }
      customer = null;
    } else {
      // Customer Bill behavior:
      if (resolvedCustomerId) {
        customer = await customerRepository.findById(resolvedCustomerId);
        if (!customer) {
          throw new NotFoundError(`Customer '${resolvedCustomerId}' not found`);
        }
        if (!customer.isActive) {
          throw new BadRequestError(`Customer '${customer.name}' is archived or inactive`);
        }
      } else {
        if (isPlaceholderWalkIn) {
          if (isCredit) {
            throw new BadRequestError('Credit (Khata) sales require a registered customer account');
          }
          throw new BadRequestError('Customer Bill requires selecting a registered customer or entering a customer name');
        }

        // Check phone match first (unique phone identifier)
        if (rawPhone) {
          const existingByPhone = await customerRepository.findByPhone(rawPhone);
          if (existingByPhone) {
            customer = await customerRepository.findById(existingByPhone.id);
          }
        }

        // Check exact name match if phone not matched or not provided
        if (!customer) {
          const existingByName = await customerRepository.findByName(rawName);
          if (existingByName) {
            customer = await customerRepository.findById(existingByName.id);
          }
        }

        // Auto-register new customer if a genuine customer name was supplied
        if (!customer) {
          const nextCode = await customerRepository.generateNextCustomerCode();
          customer = await customerRepository.create({
            customer_code: nextCode,
            name: rawName,
            phone: rawPhone || null,
            village: rawVillage || null,
            address: rawAddress || null,
            credit_limit: 50000.0,
            opening_balance: 0.0,
            notes: 'Auto-registered during POS billing',
          });
        }
      }
    }

    // 4. Verify walk-in vs. credit constraints
    if (isCredit && !customer) {
      throw new BadRequestError('Credit (Khata) sales require a registered customer account');
    }

    // 5. Verify product details and build verified line items
    const storeSettings = await saleRepository.getStoreSettings();
    const verifiedItems = [];

    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      const prodIdentifier = it.productId || it.product_id || it.productCode || it.code || it.id;
      if (!prodIdentifier) {
        throw new BadRequestError(`Line item at position ${i + 1} is missing a product identifier`);
      }

      const requestedQty = Number(it.quantity !== undefined ? it.quantity : it.qty);
      if (isNaN(requestedQty) || requestedQty <= 0) {
        throw new BadRequestError(`Line item at position ${i + 1} must have a quantity greater than 0`);
      }

      // Check product in repository
      const prod = await productRepository.findById(prodIdentifier);
      if (!prod) {
        throw new NotFoundError(`Product '${prodIdentifier}' not found`);
      }
      if (!prod.isActive) {
        throw new BadRequestError(`Product '${prod.name}' (${prod.code}) is inactive / archived`);
      }

      // Resolve unit price: use client price if given >= 0, otherwise catalog selling price
      let unitPrice = it.unitPrice !== undefined ? it.unitPrice : (it.unit_price !== undefined ? it.unit_price : it.price);
      if (unitPrice === undefined || unitPrice === null || unitPrice === '') {
        unitPrice = Number(prod.price);
      } else {
        unitPrice = Number(unitPrice);
        if (isNaN(unitPrice) || unitPrice < 0) {
          throw new BadRequestError(`Line item '${prod.name}' must have a valid non-negative unit price`);
        }
      }

      const itemDiscount = Math.max(0, Number(it.discount || 0));
      const lineSubtotal = Number(Math.max(0, requestedQty * unitPrice - itemDiscount).toFixed(2));

      verifiedItems.push({
        productId: prod.id,
        productCode: prod.code,
        productName: prod.name,
        quantity: requestedQty,
        unitPrice,
        subtotal: lineSubtotal,
        unit: prod.unit,
      });
    }

    // 6. Tax and total calculations on server
    const resolvedGstRate = gstRate !== undefined ? Number(gstRate) : (gst_rate !== undefined ? Number(gst_rate) : storeSettings.defaultGstRate);
    if (isNaN(resolvedGstRate) || resolvedGstRate < 0 || resolvedGstRate > 100) {
      throw new BadRequestError('GST rate must be a percentage between 0 and 100');
    }

    const resolvedGstMode = (gstMode || gst_mode || storeSettings.defaultGstMode || 'EXCLUSIVE').toUpperCase();
    if (!['EXCLUSIVE', 'INCLUSIVE'].includes(resolvedGstMode)) {
      throw new BadRequestError("GST mode must be either 'EXCLUSIVE' or 'INCLUSIVE'");
    }

    const totals = this.calculateSaleTotals(verifiedItems, resolvedGstRate, resolvedGstMode, discount);

    // 7. Resolve payment and outstanding due amounts
    let calculatedPaidAmount;
    if (isCredit) {
      // Credit sale: down payment defaults to 0 unless client explicitly disbursed cash
      const rawPaid = paidAmount !== undefined ? paidAmount : paid_amount;
      calculatedPaidAmount = rawPaid !== undefined && rawPaid !== null ? Math.max(0, Number(rawPaid)) : 0.0;
    } else {
      // Immediate payment (CASH, UPI, CARD, CHEQUE): defaults to full bill payment
      const rawPaid = paidAmount !== undefined ? paidAmount : paid_amount;
      calculatedPaidAmount = rawPaid !== undefined && rawPaid !== null ? Math.max(0, Number(rawPaid)) : totals.totalAmount;
    }

    calculatedPaidAmount = Number(calculatedPaidAmount.toFixed(2));
    if (calculatedPaidAmount > totals.totalAmount) {
      throw new BadRequestError(`Paid amount (₹${calculatedPaidAmount}) cannot exceed total bill amount (₹${totals.totalAmount})`);
    }

    const calculatedDueAmount = Number((totals.totalAmount - calculatedPaidAmount).toFixed(2));

    // Walk-in sales cannot carry unpaid debt
    if (!customer && calculatedDueAmount > 0) {
      throw new BadRequestError('Walk-in direct sales cannot carry outstanding debt. Customer must be registered.');
    }

    let calculatedPaymentStatus = 'PAID';
    if (calculatedDueAmount <= 0) {
      calculatedPaymentStatus = 'PAID';
    } else if (calculatedPaidAmount > 0) {
      calculatedPaymentStatus = 'PARTIAL';
    } else {
      calculatedPaymentStatus = 'UNPAID';
    }

    // 8. Resolve invoice number
    let finalInvoiceNumber = (invoiceNumber || invoice_number || '').trim();
    let isAutoInvoice = false;
    if (finalInvoiceNumber) {
      const existing = await saleRepository.findByInvoiceNumber(finalInvoiceNumber);
      if (existing) {
        throw new ConflictError(`Invoice number '${finalInvoiceNumber}' already exists in the system`);
      }
    } else {
      isAutoInvoice = true;
    }

    // 9. Store owner GSTIN resolution
    const resolvedOwnerGstin = (ownerGstin || owner_gstin || ownerGstId || gstId || storeSettings.gstin || '').trim() || null;
    if (resolvedOwnerGstin && !validators.isGSTIN(resolvedOwnerGstin)) {
      // If store owner configured or provided, validate format
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(resolvedOwnerGstin)) {
        throw new BadRequestError(`Invalid Owner GSTIN format: '${resolvedOwnerGstin}'`);
      }
    }

    const saleHeader = {
      invoiceNumber: finalInvoiceNumber,
      isAutoInvoice,
      billingType,
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : ((customerName || customer_name || (billingType === 'RETAIL' ? 'Retail Walk-in Customer' : 'Direct Counter Sale')).trim()),
      customerPhone: customer ? (customer.phone || customerPhone || customer_phone || null) : (customerPhone || customer_phone || null),
      customerVillage: customer ? (customer.village || customerVillage || customer_village || null) : (customerVillage || customer_village || null),
      ownerGstin: resolvedOwnerGstin,
      subtotal: totals.subtotal,
      gstRate: totals.gstRate,
      gstMode: totals.gstMode,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      paidAmount: calculatedPaidAmount,
      dueAmount: calculatedDueAmount,
      paymentMethod: rawMethod,
      paymentStatus: calculatedPaymentStatus,
      saleDate: saleDate || sale_date || date || new Date().toISOString(),
    };

    // 10. Execute atomic transaction
    return saleRepository.createSaleWithItems(saleHeader, verifiedItems, userContext);
  }

  /**
   * Clear customer receipts (invoices and payments)
   * @param {object} options
   * @returns {Promise<object>}
   */
  async clearCustomerReceipts(options = {}) {
    return saleRepository.clearCustomerReceipts(options);
  }
}

module.exports = new SaleService();
