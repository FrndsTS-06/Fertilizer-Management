/**
 * Common Reusable Validator Helpers
 * Standardized pure functions to validate request inputs without external packages.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/; // Standard 10-digit Indian mobile number

const validators = {
  isUUID: (val) => typeof val === 'string' && UUID_REGEX.test(val),

  isGSTIN: (val) => typeof val === 'string' && GSTIN_REGEX.test(val),

  isEmail: (val) => typeof val === 'string' && EMAIL_REGEX.test(val),

  isPhone: (val) => typeof val === 'string' && PHONE_REGEX.test(val),

  isNonEmptyString: (val) => typeof val === 'string' && val.trim().length > 0,

  isPositiveNumber: (val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  },

  isNonNegativeNumber: (val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  },

  /**
   * Helper to validate pagination query parameters
   * @param {object} query
   * @returns {Array<string>} Validation error messages if any
   */
  validatePagination: (query) => {
    const errors = [];
    if (query.page !== undefined) {
      const page = parseInt(query.page, 10);
      if (isNaN(page) || page < 1) errors.push('Page must be a positive integer >= 1');
    }
    if (query.limit !== undefined) {
      const limit = parseInt(query.limit, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) errors.push('Limit must be an integer between 1 and 100');
    }
    return errors;
  },

  /**
   * Validate login request payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateLogin: (req) => {
    const errors = [];
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      errors.push('A valid email address is required');
    }
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      errors.push('Password is required');
    }
    return errors;
  },

  /**
   * Validate category creation payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateCreateCategory: (req) => {
    const errors = [];
    const { name, description } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Category name is required and cannot be empty');
    } else if (name.trim().length > 100) {
      errors.push('Category name cannot exceed 100 characters');
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      errors.push('Category description must be a string');
    }

    return errors;
  },

  /**
   * Validate category update payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateUpdateCategory: (req) => {
    const errors = [];
    const { name, description, is_active, isActive } = req.body || {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Category name cannot be empty');
      } else if (name.trim().length > 100) {
        errors.push('Category name cannot exceed 100 characters');
      }
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      errors.push('Category description must be a string');
    }

    const active = is_active !== undefined ? is_active : isActive;
    if (active !== undefined && typeof active !== 'boolean') {
      errors.push('is_active must be a boolean');
    }

    return errors;
  },

  /**
   * Validate product creation payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateCreateProduct: (req) => {
    const errors = [];
    const {
      name,
      category,
      categoryId,
      category_id,
      costPrice,
      cost_price,
      price,
      selling_price,
      minThreshold,
      min_threshold,
      initialStock,
      initial_stock,
    } = req.body || {};

    // Name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Product name is required');
    } else if (name.trim().length > 200) {
      errors.push('Product name cannot exceed 200 characters');
    }

    // Category
    const cat = category || categoryId || category_id;
    if (!cat || (typeof cat !== 'string' && typeof cat !== 'number')) {
      errors.push('Category is required (specify category name or UUID)');
    }

    // Cost price
    const cp = costPrice !== undefined ? costPrice : cost_price;
    if (cp === undefined || cp === null || cp === '') {
      errors.push('Cost price is required');
    } else {
      const numCp = Number(cp);
      if (isNaN(numCp) || numCp < 0) {
        errors.push('Cost price must be a non-negative number');
      }
    }

    // Selling price
    const sp = price !== undefined ? price : selling_price;
    if (sp === undefined || sp === null || sp === '') {
      errors.push('Selling price is required');
    } else {
      const numSp = Number(sp);
      if (isNaN(numSp) || numSp < 0) {
        errors.push('Selling price must be a non-negative number');
      }
    }

    // Minimum stock threshold
    const th = minThreshold !== undefined ? minThreshold : min_threshold;
    if (th !== undefined && th !== null && th !== '') {
      const numTh = Number(th);
      if (isNaN(numTh) || numTh < 0) {
        errors.push('Minimum stock threshold must be a non-negative number');
      }
    }

    // Initial stock
    const initStock = initialStock !== undefined ? initialStock : initial_stock;
    if (initStock !== undefined && initStock !== null && initStock !== '') {
      const numInit = Number(initStock);
      if (isNaN(numInit) || numInit < 0) {
        errors.push('Initial stock must be a non-negative number');
      }
    }

    return errors;
  },

  /**
   * Validate product update payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateUpdateProduct: (req) => {
    const errors = [];
    const body = req.body || {};

    // Safety rule: Direct stock updates are prohibited through ordinary product edits
    if (body.stock !== undefined || body.initialStock !== undefined || body.initial_stock !== undefined) {
      errors.push(
        'Direct stock modification is not permitted via product updates. Use the Inventory Stock Adjustment workflow to change stock levels.'
      );
    }

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        errors.push('Product name cannot be empty');
      } else if (body.name.trim().length > 200) {
        errors.push('Product name cannot exceed 200 characters');
      }
    }

    const cp = body.costPrice !== undefined ? body.costPrice : body.cost_price;
    if (cp !== undefined) {
      const numCp = Number(cp);
      if (isNaN(numCp) || numCp < 0) {
        errors.push('Cost price must be a non-negative number');
      }
    }

    const sp = body.price !== undefined ? body.price : body.selling_price;
    if (sp !== undefined) {
      const numSp = Number(sp);
      if (isNaN(numSp) || numSp < 0) {
        errors.push('Selling price must be a non-negative number');
      }
    }

    const th = body.minThreshold !== undefined ? body.minThreshold : body.min_threshold;
    if (th !== undefined) {
      const numTh = Number(th);
      if (isNaN(numTh) || numTh < 0) {
        errors.push('Minimum stock threshold must be a non-negative number');
      }
    }

    return errors;
  },

  /**
   * Validate supplier creation payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateCreateSupplier: (req) => {
    const errors = [];
    const { name, email, gstin } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Supplier company name is required');
    } else if (name.trim().length > 150) {
      errors.push('Supplier company name cannot exceed 150 characters');
    }

    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
        errors.push('A valid email address is required');
      }
    }

    if (gstin !== undefined && gstin !== null && gstin !== '') {
      if (typeof gstin !== 'string' || !GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
        errors.push('Invalid GSTIN format. Must be a valid 15-character Indian Goods & Services Tax identification number.');
      }
    }

    return errors;
  },

  /**
   * Validate supplier update payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateUpdateSupplier: (req) => {
    const errors = [];
    const { name, email, gstin } = req.body || {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Supplier name cannot be empty');
      } else if (name.trim().length > 150) {
        errors.push('Supplier name cannot exceed 150 characters');
      }
    }

    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
        errors.push('A valid email address is required');
      }
    }

    if (gstin !== undefined && gstin !== null && gstin !== '') {
      if (typeof gstin !== 'string' || !GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
        errors.push('Invalid GSTIN format. Must be a valid 15-character Indian Goods & Services Tax identification number.');
      }
    }

    return errors;
  },

  /**
   * Validate customer creation payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateCreateCustomer: (req) => {
    const errors = [];
    const { name, phone, village, creditLimit, credit_limit, openingBalance, opening_balance, duePayment, totalPayment } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Customer name is required');
    } else if (name.trim().length > 150) {
      errors.push('Customer name cannot exceed 150 characters');
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      errors.push('Phone number is required');
    } else {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        errors.push('Phone number must be exactly 10 digits');
      }
    }

    if (!village || typeof village !== 'string' || village.trim().length === 0) {
      errors.push('Village / Town is required');
    }

    const cl = creditLimit !== undefined ? creditLimit : credit_limit;
    if (cl !== undefined && cl !== null && cl !== '') {
      const numCl = Number(cl);
      if (isNaN(numCl) || numCl < 0) {
        errors.push('Credit limit must be a non-negative number');
      }
    }

    const ob = openingBalance !== undefined ? openingBalance : (opening_balance !== undefined ? opening_balance : (duePayment !== undefined ? duePayment : totalPayment));
    if (ob !== undefined && ob !== null && ob !== '') {
      const numOb = Number(ob);
      if (isNaN(numOb) || numOb < 0) {
        errors.push('Opening balance must be a non-negative number');
      }
    }

    return errors;
  },

  /**
   * Validate customer update payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateUpdateCustomer: (req) => {
    const errors = [];
    const { name, phone, village, creditLimit, credit_limit, openingBalance, opening_balance } = req.body || {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Customer name cannot be empty');
      } else if (name.trim().length > 150) {
        errors.push('Customer name cannot exceed 150 characters');
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim().length === 0) {
        errors.push('Phone number cannot be empty');
      } else {
        const cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          errors.push('Phone number must be exactly 10 digits');
        }
      }
    }

    if (village !== undefined && (typeof village !== 'string' || village.trim().length === 0)) {
      errors.push('Village / Town cannot be empty');
    }

    const cl = creditLimit !== undefined ? creditLimit : credit_limit;
    if (cl !== undefined && cl !== null && cl !== '') {
      const numCl = Number(cl);
      if (isNaN(numCl) || numCl < 0) {
        errors.push('Credit limit must be a non-negative number');
      }
    }

    const ob = openingBalance !== undefined ? openingBalance : opening_balance;
    if (ob !== undefined && ob !== null && ob !== '') {
      const numOb = Number(ob);
      if (isNaN(numOb) || numOb < 0) {
        errors.push('Opening balance must be a non-negative number');
      }
    }

    return errors;
  },

  /**
   * Validate stock adjustment request payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateStockAdjustment: (req) => {
    const errors = [];
    const body = req.body || {};
    const { productId, product_id, productCode, productName, operation, quantity, reason, costPrice, unitCost } = body;

    const prodId = productId || product_id || productCode || productName;
    if (!prodId || typeof prodId !== 'string' || prodId.trim().length === 0) {
      errors.push('Product identifier (productId, productCode, or productName) is required');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      errors.push('Stock adjustment reason is mandatory and cannot be empty');
    }

    const op = operation ? String(operation).trim().toUpperCase() : 'ADD';
    if (!['ADD', 'REDUCE', 'CORRECT'].includes(op)) {
      errors.push("Invalid operation. Operation must be one of: 'ADD', 'REDUCE', 'CORRECT'");
    }

    if (quantity === undefined || quantity === null || quantity === '') {
      errors.push('Quantity is required');
    } else {
      const numQty = Number(quantity);
      if (isNaN(numQty)) {
        errors.push('Quantity must be a valid number');
      } else if (op === 'CORRECT') {
        if (numQty < 0) errors.push('Corrected stock level must be a non-negative number >= 0');
      } else {
        if (numQty <= 0) errors.push('Quantity must be a positive number greater than 0');
      }
    }

    const cp = costPrice !== undefined ? costPrice : unitCost;
    if (cp !== undefined && cp !== null && cp !== '') {
      const numCp = Number(cp);
      if (isNaN(numCp) || numCp < 0) {
        errors.push('Cost price must be a non-negative number');
      }
    }

    return errors;
  },

  /**
   * Validate inward stock receiving payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateStockInward: (req) => {
    const errors = [];
    const body = req.body || {};
    const { productId, product_id, productCode, quantity, reason, reference, referenceNo } = body;

    const prodId = productId || product_id || productCode;
    if (!prodId || typeof prodId !== 'string' || prodId.trim().length === 0) {
      errors.push('Product identifier is required');
    }

    if (quantity === undefined || quantity === null || quantity === '') {
      errors.push('Quantity is required');
    } else {
      const numQty = Number(quantity);
      if (isNaN(numQty) || numQty <= 0) {
        errors.push('Quantity must be a positive number greater than 0');
      }
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      errors.push('Stock inward reason or description is mandatory');
    }

    const ref = reference || referenceNo;
    if (!ref || typeof ref !== 'string' || ref.trim().length === 0) {
      errors.push('Source reference (e.g. invoice/PO number) is required for inward stock traceability');
    }

    return errors;
  },

  /**
   * Validate outward stock dispatch payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateStockOutward: (req) => {
    const errors = [];
    const body = req.body || {};
    const { productId, product_id, productCode, quantity, reason, reference, referenceNo } = body;

    const prodId = productId || product_id || productCode;
    if (!prodId || typeof prodId !== 'string' || prodId.trim().length === 0) {
      errors.push('Product identifier is required');
    }

    if (quantity === undefined || quantity === null || quantity === '') {
      errors.push('Quantity is required');
    } else {
      const numQty = Number(quantity);
      if (isNaN(numQty) || numQty <= 0) {
        errors.push('Quantity must be a positive number greater than 0');
      }
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      errors.push('Stock outward reason is mandatory');
    }

    return errors;
  },

  /**
   * Validate purchase order creation payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateCreatePurchase: (req) => {
    const errors = [];
    const body = req.body || {};
    const { supplierId, supplier_id, supplierName, supplier, items, lineItems, line_items, totalAmount, total_amount, paidAmount, paid_amount } = body;

    const supp = supplierId || supplier_id || supplierName || supplier;
    if (!supp || typeof supp !== 'string' || supp.trim().length === 0) {
      errors.push('Supplier identifier (supplierId or supplierName) is required');
    }

    const rawItems = items || lineItems || line_items;
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      errors.push('Purchase order must contain an array with at least one line item');
    } else {
      rawItems.forEach((item, idx) => {
        const prod = item.productId || item.product_id || item.productCode || item.code || item.id;
        if (!prod || typeof prod !== 'string' || prod.trim().length === 0) {
          errors.push(`Item at position ${idx + 1} is missing a product identifier`);
        }

        const qty = Number(item.quantity !== undefined ? item.quantity : item.qty);
        if (isNaN(qty) || qty <= 0) {
          errors.push(`Item at position ${idx + 1} must have a valid quantity greater than 0`);
        }

        const cost = Number(item.unitCost !== undefined ? item.unitCost : (item.unit_cost !== undefined ? item.unit_cost : (item.costPrice !== undefined ? item.costPrice : item.price)));
        if (isNaN(cost) || cost < 0) {
          errors.push(`Item at position ${idx + 1} must have a valid non-negative unit cost`);
        }
      });
    }

    const rawTotal = totalAmount !== undefined ? totalAmount : total_amount;
    if (rawTotal !== undefined && rawTotal !== null && rawTotal !== '') {
      const numTotal = Number(rawTotal);
      if (isNaN(numTotal) || numTotal < 0) {
        errors.push('Total amount must be a non-negative number');
      }
    }

    const rawPaid = paidAmount !== undefined ? paidAmount : paid_amount;
    if (rawPaid !== undefined && rawPaid !== null && rawPaid !== '') {
      const numPaid = Number(rawPaid);
      if (isNaN(numPaid) || numPaid < 0) {
        errors.push('Paid amount must be a non-negative number');
      }
    }

    return errors;
  },

  /**
   * Validate supplier payment disbursement payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateSupplierPayment: (req) => {
    const errors = [];
    const body = req.body || {};
    const { amount, paymentMethod, payment_method } = body;

    if (amount === undefined || amount === null || amount === '') {
      errors.push('Payment amount is required');
    } else {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        errors.push('Payment amount must be a positive number greater than 0');
      }
    }

    const pm = paymentMethod || payment_method;
    if (pm !== undefined && pm !== null && pm !== '') {
      const validMethods = ['BANK_TRANSFER', 'CHEQUE', 'UPI', 'CASH'];
      if (!validMethods.includes(String(pm).toUpperCase())) {
        errors.push(`Payment method must be one of: ${validMethods.join(', ')}`);
      }
    }

    return errors;
  },

  /**
   * Validate POS sales creation payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateCreateSale: (req) => {
    const errors = [];
    const body = req.body || {};
    const {
      items,
      lineItems,
      line_items,
      customerId,
      customer_id,
      paymentMethod,
      payment_method,
      paymentMode,
      gstRate,
      gst_rate,
      gstMode,
      gst_mode,
      paidAmount,
      paid_amount,
      discount,
    } = body;

    const rawItems = items || lineItems || line_items;
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      errors.push('Sale must contain an array with at least one line item');
    } else {
      rawItems.forEach((item, idx) => {
        const prod = item.productId || item.product_id || item.productCode || item.code || item.id;
        if (!prod || typeof prod !== 'string' || prod.trim().length === 0) {
          errors.push(`Item at position ${idx + 1} is missing a product identifier`);
        }

        const qty = Number(item.quantity !== undefined ? item.quantity : item.qty);
        if (isNaN(qty) || qty <= 0) {
          errors.push(`Item at position ${idx + 1} must have a valid quantity greater than 0`);
        }

        const price = item.unitPrice !== undefined ? item.unitPrice : (item.unit_price !== undefined ? item.unit_price : item.price);
        if (price !== undefined && price !== null && price !== '') {
          const numPrice = Number(price);
          if (isNaN(numPrice) || numPrice < 0) {
            errors.push(`Item at position ${idx + 1} must have a valid non-negative unit price`);
          }
        }

        const itemDisc = item.discount;
        if (itemDisc !== undefined && itemDisc !== null && itemDisc !== '') {
          const numDisc = Number(itemDisc);
          if (isNaN(numDisc) || numDisc < 0) {
            errors.push(`Item at position ${idx + 1} must have a valid non-negative discount`);
          }
        }
      });
    }

    const cid = customerId || customer_id;
    if (cid !== undefined && cid !== null && cid !== '') {
      if (!validators.isUUID(cid)) {
        errors.push('Customer ID must be a valid UUID');
      }
    }

    const pm = paymentMethod || payment_method || paymentMode;
    if (pm !== undefined && pm !== null && pm !== '') {
      const validMethods = ['CASH', 'UPI', 'CREDIT (KHATA)', 'CARD', 'CHEQUE', 'UPI / QR', 'BANK', 'CREDIT'];
      if (!validMethods.includes(String(pm).trim().toUpperCase())) {
        errors.push(`Payment method must be one of: CASH, UPI, CREDIT (KHATA), CARD, CHEQUE`);
      }
    }

    const rate = gstRate !== undefined ? gstRate : gst_rate;
    if (rate !== undefined && rate !== null && rate !== '') {
      const numRate = Number(rate);
      if (isNaN(numRate) || numRate < 0 || numRate > 100) {
        errors.push('GST rate must be a valid percentage between 0 and 100');
      }
    }

    const mode = gstMode || gst_mode;
    if (mode !== undefined && mode !== null && mode !== '') {
      if (!['EXCLUSIVE', 'INCLUSIVE'].includes(String(mode).toUpperCase())) {
        errors.push("GST mode must be either 'EXCLUSIVE' or 'INCLUSIVE'");
      }
    }

    const rawPaid = paidAmount !== undefined ? paidAmount : paid_amount;
    if (rawPaid !== undefined && rawPaid !== null && rawPaid !== '') {
      const numPaid = Number(rawPaid);
      if (isNaN(numPaid) || numPaid < 0) {
        errors.push('Paid amount must be a non-negative number');
      }
    }

    if (discount !== undefined && discount !== null && discount !== '') {
      const numDisc = Number(discount);
      if (isNaN(numDisc) || numDisc < 0) {
        errors.push('Order discount must be a non-negative number');
      }
    }

    const bType = body.billingType || body.billing_type;
    if (bType !== undefined && bType !== null && bType !== '') {
      if (!['RETAIL', 'CUSTOMER'].includes(String(bType).trim().toUpperCase())) {
        errors.push("Billing type must be either 'RETAIL' or 'CUSTOMER'");
      }
    }

    return errors;
  },

  /**
   * Validate customer payment collection payload
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateRecordPayment: (req) => {
    const errors = [];
    const body = req.body || {};
    const { amount, paymentMethod, payment_method, method, customerId, customer_id, allocations } = body;

    if (amount === undefined || amount === null || amount === '') {
      errors.push('Payment amount is required');
    } else {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        errors.push('Payment amount must be a positive number greater than 0');
      } else {
        const parts = String(amount).trim().split('.');
        if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
          errors.push('Payment amount cannot have more than 2 decimal places');
        }
      }
    }

    const pm = paymentMethod || payment_method || method;
    if (pm !== undefined && pm !== null && pm !== '') {
      const validMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'UPI / QR', 'BANK', 'CREDIT (KHATA)'];
      if (!validMethods.includes(String(pm).trim().toUpperCase())) {
        errors.push('Payment method must be one of: CASH, UPI, BANK_TRANSFER, CHEQUE');
      }
    }

    const cid = customerId || customer_id || req.params?.id;
    if (cid !== undefined && cid !== null && cid !== '') {
      if (!validators.isUUID(cid)) {
        errors.push('Customer ID must be a valid UUID');
      }
    }

    if (allocations !== undefined && allocations !== null) {
      if (!Array.isArray(allocations)) {
        errors.push('Allocations must be an array of invoice allocation objects');
      } else {
        allocations.forEach((alloc, idx) => {
          if (!alloc.saleId && !alloc.sale_id && !alloc.invoiceNumber && !alloc.invoice_number) {
            errors.push(`Allocation at index ${idx} is missing a saleId or invoiceNumber`);
          }
          const numAlloc = Number(alloc.amount);
          if (isNaN(numAlloc) || numAlloc <= 0) {
            errors.push(`Allocation at index ${idx} must have an amount greater than 0`);
          } else {
            const parts = String(alloc.amount).trim().split('.');
            if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
              errors.push(`Allocation at index ${idx} cannot have more than 2 decimal places`);
            }
          }
        });
      }
    }

    return errors;
  },

  /**
   * Validate payment reversal justification
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateReversePayment: (req) => {
    const errors = [];
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      errors.push('A valid audit reason (minimum 3 characters) is required for payment reversal');
    }

    return errors;
  },

  /**
   * Validate report query parameters (date boundaries, presets, pagination)
   * @param {import('express').Request} req
   * @returns {Array<string>}
   */
  validateReportQuery: (req) => {
    const errors = [];
    const query = req.query || {};

    const paginationErrors = validators.validatePagination(query);
    errors.push(...paginationErrors);

    const allowedPeriods = ['today', 'yesterday', 'this-week', 'week', 'this-month', 'month', 'last-month', 'this-quarter', 'quarter', 'this-year', 'year', 'all', 'all-time', 'custom'];
    if (query.period && !allowedPeriods.includes(String(query.period).toLowerCase().trim())) {
      errors.push(`Invalid period preset '${query.period}'. Allowed: ${allowedPeriods.join(', ')}`);
    }

    if (query.startDate) {
      const d = new Date(query.startDate);
      if (isNaN(d.getTime())) {
        errors.push(`startDate '${query.startDate}' must be a valid date or timestamp`);
      }
    }

    if (query.endDate) {
      const d = new Date(query.endDate);
      if (isNaN(d.getTime())) {
        errors.push(`endDate '${query.endDate}' must be a valid date or timestamp`);
      }
    }

    if (query.startDate && query.endDate) {
      const s = new Date(query.startDate);
      const e = new Date(query.endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s.getTime() > e.getTime()) {
        errors.push('startDate cannot be chronologically later than endDate');
      }
    }

    return errors;
  },
};

module.exports = validators;




