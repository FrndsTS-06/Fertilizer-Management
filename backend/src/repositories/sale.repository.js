const BaseRepository = require('./base.repository');
const inventoryRepository = require('./inventory.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/appError');

/**
 * Sale Repository
 * High-concurrency data-access layer for POS retail sales, farmer Khata credit sales,
 * line items persistence, atomic inventory stock deduction, and payment receipts.
 */
class SaleRepository extends BaseRepository {
  /**
   * Format sale database row with dual camelCase & snake_case support
   * @param {object} row
   * @param {Array<object>} items
   * @param {Array<object>} payments
   * @param {object|null} storeSettings
   * @returns {object|null}
   */
  formatSale(row, items = [], payments = [], storeSettings = null) {
    if (!row) return null;

    const subtotal = Number(row.subtotal || 0);
    const gstRate = Number(row.gst_rate || 0);
    const gstAmount = Number(row.gst_amount || 0);
    const totalAmount = Number(row.total_amount || 0);
    const paidAmount = Number(row.paid_amount || 0);
    const dueAmount = Number(row.due_amount || 0);

    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      invoice_number: row.invoice_number,
      customerId: row.customer_id,
      customer_id: row.customer_id,
      customerName: row.customer_name,
      customer_name: row.customer_name,
      customerPhone: row.customer_phone,
      customer_phone: row.customer_phone,
      customerVillage: row.customer_village,
      customer_village: row.customer_village,
      billingType: row.billing_type || (row.customer_id ? 'CUSTOMER' : 'RETAIL'),
      billing_type: row.billing_type || (row.customer_id ? 'CUSTOMER' : 'RETAIL'),
      ownerGstin: row.owner_gstin,
      owner_gstin: row.owner_gstin,
      ownerGstId: row.owner_gstin,
      gstId: row.owner_gstin,
      createdByUserId: row.created_by_user_id,
      created_by_user_id: row.created_by_user_id,
      createdByName: row.created_by_name || null,
      subtotal,
      gstRate,
      gst_rate: gstRate,
      gstMode: row.gst_mode,
      gst_mode: row.gst_mode,
      gstAmount,
      gst_amount: gstAmount,
      totalAmount,
      total_amount: totalAmount,
      paidAmount,
      paid_amount: paidAmount,
      dueAmount,
      due_amount: dueAmount,
      paymentMethod: row.payment_method,
      payment_method: row.payment_method,
      paymentStatus: row.payment_status,
      payment_status: row.payment_status,
      status: row.payment_status,
      saleDate: row.sale_date,
      sale_date: row.sale_date,
      date: row.sale_date,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
      itemCount: row.item_count !== undefined ? Number(row.item_count) : items.length,
      item_count: row.item_count !== undefined ? Number(row.item_count) : items.length,
      items: items.map((i) => this.formatSaleItem(i)),
      payments: payments.map((p) => this.formatPayment(p)),
      store: storeSettings || null,
    };
  }

  /**
   * Format line item row
   * @param {object} row
   * @returns {object|null}
   */
  formatSaleItem(row) {
    if (!row) return null;
    const quantity = Number(row.quantity !== undefined ? row.quantity : (row.qty || 0));
    const unitPrice = Number(row.unit_price !== undefined ? row.unit_price : (row.unitPrice !== undefined ? row.unitPrice : (row.price || 0)));
    const subtotal = Number(row.subtotal !== undefined ? row.subtotal : (quantity * unitPrice));
    const prodName = row.product_name || row.productName || row.name || '';
    const prodCode = row.product_code || row.productCode || row.code || '';
    const prodId = row.product_id || row.productId || null;

    return {
      id: row.id,
      saleId: row.sale_id || row.saleId,
      sale_id: row.sale_id || row.saleId,
      productId: prodId,
      product_id: prodId,
      productCode: prodCode,
      product_code: prodCode,
      code: prodCode,
      productName: prodName,
      product_name: prodName,
      name: prodName,
      quantity,
      qty: quantity,
      unitPrice,
      unit_price: unitPrice,
      price: unitPrice,
      subtotal,
      total: subtotal,
      unit: row.unit || null,
    };
  }

  /**
   * Format customer payment receipt row
   * @param {object} row
   * @returns {object|null}
   */
  formatPayment(row) {
    if (!row) return null;
    return {
      id: row.id,
      receiptNumber: row.receipt_number,
      receipt_number: row.receipt_number,
      customerId: row.customer_id,
      customer_id: row.customer_id,
      saleId: row.sale_id,
      sale_id: row.sale_id,
      amount: Number(row.amount || 0),
      paymentMethod: row.payment_method,
      payment_method: row.payment_method,
      referenceNo: row.reference_no,
      reference_no: row.reference_no,
      reference: row.reference_no,
      notes: row.notes,
      paymentDate: row.payment_date,
      payment_date: row.payment_date,
      date: row.payment_date,
      createdAt: row.created_at,
      created_at: row.created_at,
    };
  }

  /**
   * Get store settings for invoice branding and taxes
   * @param {(text: string, params?: Array) => Promise<any>} [clientQuery]
   * @returns {Promise<object>}
   */
  async getStoreSettings(clientQuery = null) {
    const q = clientQuery || ((text, params) => this.findOne(text, params));
    const sql = `
      SELECT 
        id, store_name, legal_name, gstin, phone, email,
        address_line1, address_line2, village_or_city, state, pincode,
        default_gst_rate, default_gst_mode, invoice_prefix, receipt_prefix
      FROM store_settings
      WHERE id = 1;
    `;
    const res = await q(sql);
    const row = res?.rows ? res.rows[0] : res;

    return {
      id: 1,
      storeName: row?.store_name || 'Fertilizer & Seed Store',
      store_name: row?.store_name || 'Fertilizer & Seed Store',
      legalName: row?.legal_name || 'Retail Agricultural Inputs Agency',
      legal_name: row?.legal_name || 'Retail Agricultural Inputs Agency',
      gstin: row?.gstin || null,
      phone: row?.phone || '9999999999',
      email: row?.email || null,
      addressLine1: row?.address_line1 || 'Main Market Road',
      address_line1: row?.address_line1 || 'Main Market Road',
      addressLine2: row?.address_line2 || null,
      address_line2: row?.address_line2 || null,
      villageOrCity: row?.village_or_city || 'District Center',
      village_or_city: row?.village_or_city || 'District Center',
      state: row?.state || 'Maharashtra',
      pincode: row?.pincode || '411001',
      defaultGstRate: Number(row?.default_gst_rate || 5.0),
      default_gst_rate: Number(row?.default_gst_rate || 5.0),
      defaultGstMode: row?.default_gst_mode || 'EXCLUSIVE',
      default_gst_mode: row?.default_gst_mode || 'EXCLUSIVE',
      invoicePrefix: row?.invoice_prefix || 'INV',
      invoice_prefix: row?.invoice_prefix || 'INV',
      receiptPrefix: row?.receipt_prefix || 'REC',
      receipt_prefix: row?.receipt_prefix || 'REC',
    };
  }

  /**
   * Generate next sequential invoice number (e.g. INV-YYYYMMDD-0001)
   * @param {(text: string, params?: Array) => Promise<any>} [clientQuery]
   * @returns {Promise<string>}
   */
  async generateNextInvoiceNumber(clientQuery = null) {
    const q = clientQuery || ((text, params) => this.findOne(text, params));
    const store = await this.getStoreSettings(clientQuery);
    const prefix = store.invoicePrefix || 'INV';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // e.g. 20261027
    const pattern = `${prefix}-${dateStr}-%`;

    const sql = `
      SELECT invoice_number
      FROM sales
      WHERE invoice_number LIKE $1
      ORDER BY invoice_number DESC
      LIMIT 1;
    `;
    const res = await q(sql, [pattern]);
    const row = res?.rows ? res.rows[0] : res;

    let nextSeq = 1;
    if (row && row.invoice_number) {
      const match = row.invoice_number.match(/(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Generate next sequential receipt number for payments (e.g. REC-YYYYMMDD-0001)
   * @param {(text: string, params?: Array) => Promise<any>} [clientQuery]
   * @returns {Promise<string>}
   */
  async generateNextReceiptNumber(clientQuery = null) {
    const q = clientQuery || ((text, params) => this.findOne(text, params));
    const store = await this.getStoreSettings(clientQuery);
    const prefix = store.receiptPrefix || 'REC';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const pattern = `${prefix}-${dateStr}-%`;

    const sql = `
      SELECT receipt_number
      FROM payments
      WHERE receipt_number LIKE $1
      ORDER BY receipt_number DESC
      LIMIT 1;
    `;
    const res = await q(sql, [pattern]);
    const row = res?.rows ? res.rows[0] : res;

    let nextSeq = 1;
    if (row && row.receipt_number) {
      const match = row.receipt_number.match(/(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Find single sale by exact invoice number
   * @param {string} invoiceNumber
   * @returns {Promise<object|null>}
   */
  async findByInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber || !invoiceNumber.trim()) return null;
    const sql = `
      SELECT s.*, u.full_name AS created_by_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.created_by_user_id
      WHERE LOWER(s.invoice_number) = LOWER($1);
    `;
    return this.findOne(sql, [invoiceNumber.trim()]);
  }

  /**
   * Find single sale by UUID or invoiceNumber with all line items, payments, and store settings
   * @param {string} idOrInvoiceNo
   * @returns {Promise<object|null>}
   */
  async findById(idOrInvoiceNo) {
    if (!idOrInvoiceNo) return null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrInvoiceNo);

    const saleSql = `
      SELECT 
        s.id,
        s.invoice_number,
        s.customer_id,
        s.customer_name,
        s.customer_phone,
        s.customer_village,
        s.billing_type,
        s.owner_gstin,
        s.created_by_user_id,
        u.full_name AS created_by_name,
        s.subtotal,
        s.gst_rate,
        s.gst_mode,
        s.gst_amount,
        s.total_amount,
        COALESCE(b.allocated_paid, s.paid_amount)::NUMERIC(12, 2) AS paid_amount,
        COALESCE(b.remaining_due, s.due_amount)::NUMERIC(12, 2) AS due_amount,
        s.payment_method,
        COALESCE(b.computed_payment_status, s.payment_status) AS payment_status,
        s.sale_date,
        s.created_at,
        s.updated_at
      FROM sales s
      LEFT JOIN v_invoice_balances b ON b.sale_id = s.id
      LEFT JOIN users u ON u.id = s.created_by_user_id
      WHERE ${isUUID ? 's.id = $1' : 'LOWER(s.invoice_number) = LOWER($1)'};
    `;

    const saleRow = await this.findOne(saleSql, [idOrInvoiceNo.trim()]);
    if (!saleRow) return null;

    // Fetch line items
    const itemsSql = `
      SELECT 
        si.id,
        si.sale_id,
        si.product_id,
        si.product_code,
        si.product_name,
        si.quantity,
        si.unit_price,
        si.subtotal,
        si.unit
      FROM sale_items si
      WHERE si.sale_id = $1
      ORDER BY si.id ASC;
    `;

    // Fetch allocated payment receipts
    const paymentsSql = `
      SELECT 
        p.id,
        p.receipt_number,
        p.customer_id,
        p.sale_id,
        p.amount,
        p.payment_method,
        p.reference_no,
        p.notes,
        p.payment_date,
        p.created_at
      FROM payments p
      WHERE p.sale_id = $1
      ORDER BY p.payment_date ASC, p.id ASC;
    `;

    const [items, payments, storeSettings] = await Promise.all([
      this.findMany(itemsSql, [saleRow.id]),
      this.findMany(paymentsSql, [saleRow.id]),
      this.getStoreSettings(),
    ]);

    return this.formatSale(saleRow, items, payments, storeSettings);
  }

  /**
   * Build WHERE clauses for sales filtering
   * @private
   */
  _buildFilterQuery({ customerId, paymentStatus, paymentMethod, billingType, startDate, endDate, search }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (billingType && billingType !== 'All') {
      conditions.push(`s.billing_type = $${idx++}`);
      params.push(billingType.toUpperCase());
    }

    if (customerId && customerId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      if (isUUID) {
        conditions.push(`s.customer_id = $${idx++}`);
        params.push(customerId.trim());
      } else {
        conditions.push(`(
          LOWER(s.customer_name) = LOWER($${idx}) OR
          LOWER(s.customer_name) LIKE LOWER($${idx + 1})
        )`);
        params.push(customerId.trim());
        params.push(`%${customerId.trim()}%`);
        idx += 2;
      }
    }

    if (paymentStatus && paymentStatus !== 'All') {
      conditions.push(`COALESCE(b.computed_payment_status, s.payment_status) = $${idx++}`);
      params.push(paymentStatus.toUpperCase());
    }

    if (paymentMethod && paymentMethod !== 'All') {
      conditions.push(`s.payment_method = $${idx++}`);
      params.push(paymentMethod);
    }

    if (startDate) {
      conditions.push(`s.sale_date >= $${idx++}`);
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(`s.sale_date <= $${idx++}`);
      params.push(end.toISOString());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(s.invoice_number) LIKE $${idx} OR
        LOWER(s.customer_name) LIKE $${idx} OR
        LOWER(COALESCE(s.customer_phone, '')) LIKE $${idx} OR
        LOWER(COALESCE(s.customer_village, '')) LIKE $${idx} OR
        LOWER(COALESCE(s.owner_gstin, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, nextIdx: idx };
  }

  /**
   * Find paginated sales with search, filters, and sorting
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async findAll({
    customerId = null,
    paymentStatus = null,
    paymentMethod = null,
    billingType = null,
    startDate = null,
    endDate = null,
    search = '',
    page = 1,
    limit = 50,
    sortBy = 'sale_date',
    sortOrder = 'DESC',
  } = {}) {
    const { whereClause, params, nextIdx } = this._buildFilterQuery({
      customerId,
      paymentStatus,
      paymentMethod,
      billingType,
      startDate,
      endDate,
      search,
    });

    const allowedSort = {
      sale_date: 's.sale_date',
      date: 's.sale_date',
      invoice_number: 's.invoice_number',
      invoice_no: 's.invoice_number',
      total_amount: 's.total_amount',
      due_amount: 'due_amount',
      paid_amount: 'paid_amount',
      customer_name: 's.customer_name',
      created_at: 's.created_at',
    };

    const orderCol = allowedSort[sortBy.toLowerCase()] || 's.sale_date';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    let currentIdx = nextIdx;
    params.push(limit);
    const limitIdx = currentIdx++;
    params.push(offset);
    const offsetIdx = currentIdx++;

    const sql = `
      SELECT 
        s.id,
        s.invoice_number,
        s.customer_id,
        s.customer_name,
        s.customer_phone,
        s.customer_village,
        s.billing_type,
        s.owner_gstin,
        s.created_by_user_id,
        u.full_name AS created_by_name,
        s.subtotal,
        s.gst_rate,
        s.gst_mode,
        s.gst_amount,
        s.total_amount,
        COALESCE(b.allocated_paid, s.paid_amount)::NUMERIC(12, 2) AS paid_amount,
        COALESCE(b.remaining_due, s.due_amount)::NUMERIC(12, 2) AS due_amount,
        s.payment_method,
        COALESCE(b.computed_payment_status, s.payment_status) AS payment_status,
        s.sale_date,
        s.created_at,
        s.updated_at,
        COUNT(si.id)::INTEGER AS item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', si.id,
              'productId', si.product_id,
              'productCode', si.product_code,
              'productName', si.product_name,
              'name', si.product_name,
              'quantity', si.quantity,
              'unitPrice', si.unit_price,
              'price', si.unit_price,
              'subtotal', si.subtotal,
              'unit', si.unit
            )
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM sales s
      LEFT JOIN v_invoice_balances b ON b.sale_id = s.id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN users u ON u.id = s.created_by_user_id
      ${whereClause}
      GROUP BY s.id, b.allocated_paid, b.remaining_due, b.computed_payment_status, u.full_name
      ORDER BY ${orderCol} ${orderDir}, s.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => this.formatSale(r, r.items || []));
  }

  /**
   * Count total sales matching filter conditions
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countAll({
    customerId = null,
    paymentStatus = null,
    paymentMethod = null,
    billingType = null,
    startDate = null,
    endDate = null,
    search = '',
  } = {}) {
    const { whereClause, params } = this._buildFilterQuery({
      customerId,
      paymentStatus,
      paymentMethod,
      billingType,
      startDate,
      endDate,
      search,
    });

    const sql = `
      SELECT COUNT(*)::INTEGER AS count
      FROM sales s
      LEFT JOIN v_invoice_balances b ON b.sale_id = s.id
      ${whereClause};
    `;

    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Aggregate sales metrics and revenue summaries
   * @param {object} [filterOptions]
   * @returns {Promise<object>}
   */
  async getSummary(filterOptions = {}) {
    const { whereClause, params } = this._buildFilterQuery(filterOptions);
    const sql = `
      SELECT 
        COUNT(*)::INTEGER AS total_sales_count,
        COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(12, 2) AS total_sales_amount,
        COALESCE(SUM(COALESCE(b.allocated_paid, s.paid_amount)), 0.00)::NUMERIC(12, 2) AS total_paid_amount,
        COALESCE(SUM(COALESCE(b.remaining_due, s.due_amount)), 0.00)::NUMERIC(12, 2) AS total_due_amount,
        COALESCE(SUM(s.gst_amount), 0.00)::NUMERIC(12, 2) AS total_gst_amount,
        COUNT(*) FILTER (WHERE COALESCE(b.computed_payment_status, s.payment_status) = 'PAID')::INTEGER AS paid_bills_count,
        COUNT(*) FILTER (WHERE COALESCE(b.computed_payment_status, s.payment_status) = 'PARTIAL')::INTEGER AS partial_bills_count,
        COUNT(*) FILTER (WHERE COALESCE(b.computed_payment_status, s.payment_status) = 'UNPAID')::INTEGER AS unpaid_bills_count,
        COUNT(*) FILTER (WHERE s.customer_id IS NULL)::INTEGER AS walk_in_sales_count,
        COUNT(*) FILTER (WHERE s.customer_id IS NOT NULL)::INTEGER AS customer_sales_count
      FROM sales s
      LEFT JOIN v_invoice_balances b ON b.sale_id = s.id
      ${whereClause};
    `;

    const res = await this.findOne(sql, params);
    return {
      totalSalesCount: Number(res?.total_sales_count || 0),
      totalSalesAmount: Number(res?.total_sales_amount || 0),
      totalPaidAmount: Number(res?.total_paid_amount || 0),
      totalDueAmount: Number(res?.total_due_amount || 0),
      totalGstAmount: Number(res?.total_gst_amount || 0),
      paidBillsCount: Number(res?.paid_bills_count || 0),
      partialBillsCount: Number(res?.partial_bills_count || 0),
      unpaidBillsCount: Number(res?.unpaid_bills_count || 0),
      walkInSalesCount: Number(res?.walk_in_sales_count || 0),
      customerSalesCount: Number(res?.customer_sales_count || 0),
    };
  }

  /**
   * Create POS sale, persist line items, deduct inventory, and record movements atomically
   * All mutations execute in a single PostgreSQL transaction.
   * If any item check fails (e.g. insufficient stock), all changes roll back immediately.
   * 
   * @param {object} saleData - Validated sales header
   * @param {Array<object>} items - Line items to purchase
   * @param {object|null} userContext - Current authenticated user
   * @returns {Promise<object>}
   */
  async createSaleWithItems(saleData, items, userContext = null) {
    return this.withTransaction(async (clientQuery) => {
      // 1. Verify customer existence if registered customer
      let registeredCustomer = null;
      if (saleData.customerId) {
        const custSql = `
          SELECT id, customer_code, name, phone, village, address, credit_limit, opening_balance, is_active
          FROM customers
          WHERE id = $1;
        `;
        const custRes = await clientQuery(custSql, [saleData.customerId]);
        if (custRes.rows.length === 0) {
          throw new NotFoundError(`Customer with ID '${saleData.customerId}' not found`);
        }
        registeredCustomer = custRes.rows[0];
        if (!registeredCustomer.is_active) {
          throw new BadRequestError(`Cannot bill inactive / archived customer '${registeredCustomer.name}'`);
        }
      }

      // 2. Prevent duplicate invoice submission and serialize concurrent auto-generation
      if (saleData.isAutoInvoice || !saleData.invoiceNumber) {
        // Lock store_settings row for update to guarantee strict invoice serialization under concurrency
        await clientQuery('SELECT id FROM store_settings WHERE id = 1 FOR UPDATE;');
        saleData.invoiceNumber = await this.generateNextInvoiceNumber(clientQuery);
      } else {
        const existing = await clientQuery(
          'SELECT id, invoice_number FROM sales WHERE LOWER(invoice_number) = LOWER($1);',
          [saleData.invoiceNumber.trim()]
        );
        if (existing.rows.length > 0) {
          throw new ConflictError(`Invoice number '${saleData.invoiceNumber}' already exists in the system`);
        }
      }

      // 3. For each item: acquire row lock (FOR UPDATE), verify stock, deduct inventory, and log movement
      // Sort items deterministically by productId to guarantee consistent lock acquisition order and prevent deadlocks
      const createdItems = [];
      const sortedItems = [...items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
      for (const item of sortedItems) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId);
        const lockSql = `
          SELECT id, code, name, unit, cost_price, price, stock, min_threshold, is_active
          FROM products
          WHERE (${isUUID ? 'id = $1' : 'LOWER(code) = LOWER($1)'})
          FOR UPDATE;
        `;
        const prodRes = await clientQuery(lockSql, [item.productId]);
        if (prodRes.rows.length === 0) {
          throw new NotFoundError(`Product '${item.productId}' not found`);
        }
        const product = prodRes.rows[0];
        if (!product.is_active) {
          throw new BadRequestError(`Product '${product.name}' (${product.code}) is inactive / archived`);
        }

        const currentStock = Number(product.stock);
        const requestedQty = Number(item.quantity);

        if (currentStock < requestedQty) {
          throw new BadRequestError(
            `Insufficient stock for product '${product.name}' (${product.code}). Available: ${currentStock} ${product.unit}, Requested: ${requestedQty} ${product.unit}`
          );
        }

        const newStock = Number((currentStock - requestedQty).toFixed(3));

        // Deduct inventory
        await clientQuery(
          'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;',
          [newStock, product.id]
        );

        // Record immutable stock movement in ledger
        await inventoryRepository.recordMovement(clientQuery, {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          movementType: 'SALE',
          actionType: 'SELL',
          changeQty: -requestedQty,
          previousStock: currentStock,
          newStock: newStock,
          unit: product.unit,
          reason: `Customer Sale Invoice #${saleData.invoiceNumber.trim()}`,
          referenceNo: saleData.invoiceNumber.trim(),
        });

        createdItems.push({
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          quantity: requestedQty,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          unit: product.unit,
        });
      }

      // 4. Insert sales header
      const insertSaleSql = `
        INSERT INTO sales (
          invoice_number,
          customer_id,
          customer_name,
          customer_phone,
          customer_village,
          billing_type,
          owner_gstin,
          created_by_user_id,
          subtotal,
          gst_rate,
          gst_mode,
          gst_amount,
          total_amount,
          paid_amount,
          due_amount,
          payment_method,
          payment_status,
          sale_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *;
      `;

      const resolvedBillingType = saleData.billingType || (registeredCustomer ? 'CUSTOMER' : 'RETAIL');

      const saleParams = [
        saleData.invoiceNumber.trim(),
        registeredCustomer ? registeredCustomer.id : null,
        registeredCustomer ? registeredCustomer.name : (saleData.customerName || 'Direct Counter Sale'),
        registeredCustomer ? (registeredCustomer.phone || saleData.customerPhone || null) : (saleData.customerPhone || null),
        registeredCustomer ? (registeredCustomer.village || saleData.customerVillage || null) : (saleData.customerVillage || null),
        resolvedBillingType,
        saleData.ownerGstin || null,
        userContext?.id || null,
        saleData.subtotal,
        saleData.gstRate,
        saleData.gstMode,
        saleData.gstAmount,
        saleData.totalAmount,
        saleData.paidAmount,
        saleData.dueAmount,
        saleData.paymentMethod,
        saleData.paymentStatus,
        saleData.saleDate ? new Date(saleData.saleDate).toISOString() : new Date().toISOString(),
      ];

      const saleRes = await clientQuery(insertSaleSql, saleParams);
      const createdSale = saleRes.rows[0];

      // 5. Insert line items
      const insertedLineItems = [];
      for (const item of createdItems) {
        const insertItemSql = `
          INSERT INTO sale_items (
            sale_id,
            product_id,
            product_code,
            product_name,
            quantity,
            unit_price,
            subtotal,
            unit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;
        const itemRes = await clientQuery(insertItemSql, [
          createdSale.id,
          item.productId,
          item.productCode,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.subtotal,
          item.unit,
        ]);
        insertedLineItems.push(itemRes.rows[0]);
      }

      // 6. If initial payment disbursed on customer account, record in payments table
      const createdPayments = [];
      if (registeredCustomer && saleData.paidAmount > 0) {
        const receiptNumber = await this.generateNextReceiptNumber(clientQuery);

        // Normalize payment method for payments table: ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE')
        let method = String(saleData.paymentMethod || 'CASH').toUpperCase();
        if (method === 'CREDIT (KHATA)') method = 'CASH';
        else if (method === 'CARD') method = 'BANK_TRANSFER';
        else if (method.includes('UPI') || method.includes('QR')) method = 'UPI';
        else if (method.includes('BANK')) method = 'BANK_TRANSFER';
        else if (!['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].includes(method)) method = 'CASH';

        const insertPaymentSql = `
          INSERT INTO payments (
            receipt_number,
            customer_id,
            sale_id,
            amount,
            payment_method,
            reference_no,
            notes,
            payment_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;
        const paymentRes = await clientQuery(insertPaymentSql, [
          receiptNumber,
          registeredCustomer.id,
          createdSale.id,
          saleData.paidAmount,
          method,
          saleData.invoiceNumber.trim(),
          `Initial remittance against Invoice #${saleData.invoiceNumber.trim()}`,
          createdSale.sale_date,
        ]);
        createdPayments.push(paymentRes.rows[0]);
      }

      // Touch customer updated_at so customer is immediately marked as recently active
      if (registeredCustomer) {
        await clientQuery('UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;', [registeredCustomer.id]);
      }

      const storeSettings = await this.getStoreSettings(clientQuery);
      return this.formatSale(createdSale, insertedLineItems, createdPayments, storeSettings);
    });
  }

  /**
   * Clear customer receipts (invoices and payments)
   * Restores inventory quantities that were sold on those receipts,
   * removes sale stock movements, and deletes the payments and sales.
   *
   * @param {object} options
   * @param {string|null} [options.customerId=null]
   * @param {string} [options.clearType='CUSTOMER'] - 'CUSTOMER' | 'ALL'
   * @param {boolean} [options.restoreStock=true]
   * @returns {Promise<{ clearedSalesCount: number, clearedPaymentsCount: number, restoredProductsCount: number }>}
   */
  async clearCustomerReceipts({ customerId = null, clearType = 'CUSTOMER', restoreStock = true } = {}) {
    return this.withTransaction(async (clientQuery) => {
      // 1. Build sale filter condition
      let saleWhere = '';
      const saleParams = [];

      if (customerId) {
        saleParams.push(customerId);
        saleWhere = 'WHERE s.customer_id = $1';
      } else if (String(clearType).toUpperCase() === 'ALL') {
        saleWhere = 'WHERE 1=1';
      } else {
        // Default: CUSTOMER
        saleWhere = 'WHERE s.customer_id IS NOT NULL OR s.billing_type = \'CUSTOMER\'';
      }

      // 2. If restoreStock is enabled, calculate items to return to stock
      let restoredProductsCount = 0;
      if (restoreStock) {
        const itemsToRestoreSql = `
          SELECT si.product_id, SUM(si.quantity)::numeric(12,3) AS total_qty
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          ${saleWhere}
          GROUP BY si.product_id;
        `;
        const itemsToRestore = await clientQuery(itemsToRestoreSql, saleParams);

        for (const item of itemsToRestore.rows) {
          const qty = Number(item.total_qty);
          if (qty > 0) {
            await clientQuery(
              `UPDATE products 
               SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $2;`,
              [qty, item.product_id]
            );
            restoredProductsCount++;
          }
        }

        // Delete stock movements associated with these sales
        const deleteMovementsSql = `
          DELETE FROM stock_movements
          WHERE movement_type = 'SALE'
            AND reference_no IN (
              SELECT s.invoice_number FROM sales s ${saleWhere}
            );
        `;
        await clientQuery(deleteMovementsSql, saleParams);
      }

      // 3. Delete payments
      let paymentWhere = '';
      const paymentParams = [];
      if (customerId) {
        paymentParams.push(customerId);
        paymentWhere = 'WHERE customer_id = $1';
      } else if (String(clearType).toUpperCase() === 'ALL') {
        paymentWhere = '';
      } else {
        paymentWhere = 'WHERE customer_id IS NOT NULL OR sale_id IN (SELECT s.id FROM sales s WHERE s.customer_id IS NOT NULL OR s.billing_type = \'CUSTOMER\')';
      }

      const deletePaymentsSql = paymentWhere
        ? `DELETE FROM payments ${paymentWhere} RETURNING id;`
        : 'DELETE FROM payments RETURNING id;';
      const delPaymentsRes = await clientQuery(deletePaymentsSql, paymentParams);
      const clearedPaymentsCount = delPaymentsRes.rows.length;

      // 4. Delete sales (cascades to sale_items)
      const deleteSalesSql = customerId
        ? 'DELETE FROM sales WHERE customer_id = $1 RETURNING id;'
        : (String(clearType).toUpperCase() === 'ALL'
          ? 'DELETE FROM sales RETURNING id;'
          : 'DELETE FROM sales WHERE customer_id IS NOT NULL OR billing_type = \'CUSTOMER\' RETURNING id;');
      const delSalesRes = await clientQuery(deleteSalesSql, customerId ? [customerId] : []);
      const clearedSalesCount = delSalesRes.rows.length;

      return {
        clearedSalesCount,
        clearedPaymentsCount,
        restoredProductsCount,
      };
    });
  }
}

module.exports = new SaleRepository();
