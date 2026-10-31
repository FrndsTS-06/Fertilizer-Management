const BaseRepository = require('./base.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/appError');

/**
 * Payment Repository
 * High-concurrency financial data-access layer for customer collection receipts,
 * on-account deposits, multi-invoice allocations, auditable reversals, and supplier disbursements.
 * Enforces single source of truth views (v_customer_balances & v_invoice_balances).
 */
class PaymentRepository extends BaseRepository {
  /**
   * Format customer payment database row with dual camelCase & snake_case support
   * @param {object} row
   * @returns {object|null}
   */
  formatPayment(row) {
    if (!row) return null;
    const amount = Number(row.amount || 0);

    return {
      id: row.id,
      receiptNumber: row.receipt_number,
      receipt_number: row.receipt_number,
      customerId: row.customer_id,
      customer_id: row.customer_id,
      customerName: row.customer_name || null,
      customer_name: row.customer_name || null,
      customerCode: row.customer_code || null,
      customer_code: row.customer_code || null,
      customerPhone: row.customer_phone || null,
      customer_phone: row.customer_phone || null,
      customerVillage: row.customer_village || null,
      customer_village: row.customer_village || null,
      saleId: row.sale_id || null,
      sale_id: row.sale_id || null,
      invoiceNumber: row.invoice_number || null,
      invoice_number: row.invoice_number || null,
      invoiceTotal: row.invoice_total !== undefined ? Number(row.invoice_total) : null,
      invoice_total: row.invoice_total !== undefined ? Number(row.invoice_total) : null,
      invoiceDue: row.invoice_due !== undefined ? Number(row.invoice_due) : null,
      invoice_due: row.invoice_due !== undefined ? Number(row.invoice_due) : null,
      isAllocated: Boolean(row.sale_id),
      isOnAccount: !row.sale_id,
      amount,
      paymentMethod: row.payment_method,
      payment_method: row.payment_method,
      method: row.payment_method,
      referenceNo: row.reference_no || null,
      reference_no: row.reference_no || null,
      reference: row.reference_no || null,
      notes: row.notes || null,
      paymentDate: row.payment_date,
      payment_date: row.payment_date,
      date: row.payment_date,
      createdAt: row.created_at,
      created_at: row.created_at,
    };
  }

  /**
   * Format wholesale supplier payment row
   * @param {object} row
   * @returns {object|null}
   */
  formatSupplierPayment(row) {
    if (!row) return null;
    const amount = Number(row.amount || 0);

    return {
      id: row.id,
      paymentNumber: row.payment_number,
      payment_number: row.payment_number,
      supplierId: row.supplier_id,
      supplier_id: row.supplier_id,
      supplierName: row.supplier_name || null,
      supplier_name: row.supplier_name || null,
      supplierPhone: row.supplier_phone || null,
      supplier_phone: row.supplier_phone || null,
      supplierGstin: row.supplier_gstin || null,
      supplier_gstin: row.supplier_gstin || null,
      purchaseId: row.purchase_id || null,
      purchase_id: row.purchase_id || null,
      purchaseInvoiceNo: row.purchase_invoice_no || null,
      purchase_invoice_no: row.purchase_invoice_no || null,
      amount,
      paymentMethod: row.payment_method,
      payment_method: row.payment_method,
      method: row.payment_method,
      referenceNo: row.reference_no || null,
      reference_no: row.reference_no || null,
      reference: row.reference_no || null,
      notes: row.notes || null,
      paymentDate: row.payment_date,
      payment_date: row.payment_date,
      date: row.payment_date,
      createdAt: row.created_at,
      created_at: row.created_at,
    };
  }

  /**
   * Generate next sequential receipt number (e.g. REC-YYYYMMDD-0001)
   * @param {(text: string, params?: Array) => Promise<any>} [clientQuery]
   * @returns {Promise<string>}
   */
  async generateNextReceiptNumber(clientQuery = null) {
    const q = clientQuery || ((text, params) => this.findOne(text, params));
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const pattern = `REC-${dateStr}-%`;

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

    return `REC-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Generate next sequential supplier payment voucher number (e.g. SPAY-2026-0001)
   * @param {(text: string, params?: Array) => Promise<any>} [clientQuery]
   * @returns {Promise<string>}
   */
  async generateNextSupplierPaymentNumber(clientQuery = null) {
    const q = clientQuery || ((text, params) => this.findOne(text, params));
    const year = new Date().getFullYear();
    const prefix = `SPAY-${year}-`;

    const sql = `
      SELECT payment_number
      FROM supplier_payments
      WHERE payment_number LIKE $1
      ORDER BY payment_number DESC
      LIMIT 1;
    `;
    const res = await q(sql, [`${prefix}%`]);
    const row = res?.rows ? res.rows[0] : res;

    let nextSeq = 1;
    if (row && row.payment_number) {
      const match = row.payment_number.match(/(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Find single customer payment by UUID or receipt_number
   * @param {string} idOrReceiptNo
   * @returns {Promise<object|null>}
   */
  async findById(idOrReceiptNo) {
    if (!idOrReceiptNo || !idOrReceiptNo.trim()) return null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrReceiptNo);

    const sql = `
      SELECT 
        p.id,
        p.receipt_number,
        p.customer_id,
        c.name AS customer_name,
        c.customer_code,
        c.phone AS customer_phone,
        c.village AS customer_village,
        p.sale_id,
        s.invoice_number,
        s.total_amount AS invoice_total,
        COALESCE(b.remaining_due, s.due_amount) AS invoice_due,
        p.amount,
        p.payment_method,
        p.reference_no,
        p.notes,
        p.payment_date,
        p.created_at
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      LEFT JOIN sales s ON s.id = p.sale_id
      LEFT JOIN v_invoice_balances b ON b.sale_id = s.id
      WHERE ${isUUID ? 'p.id = $1' : 'LOWER(p.receipt_number) = LOWER($1)'};
    `;

    const row = await this.findOne(sql, [idOrReceiptNo.trim()]);
    return this.formatPayment(row);
  }

  /**
   * Build WHERE clauses for customer payment filtering
   * @private
   */
  _buildFilterQuery({ customerId, saleId, paymentMethod, allocationStatus, startDate, endDate, search }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (customerId && customerId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      if (isUUID) {
        conditions.push(`p.customer_id = $${idx++}`);
        params.push(customerId.trim());
      } else {
        conditions.push(`(
          LOWER(c.name) = LOWER($${idx}) OR
          LOWER(c.customer_code) = LOWER($${idx}) OR
          LOWER(c.name) LIKE LOWER($${idx + 1})
        )`);
        params.push(customerId.trim());
        params.push(`%${customerId.trim()}%`);
        idx += 2;
      }
    }

    if (saleId && saleId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saleId);
      if (isUUID) {
        conditions.push(`p.sale_id = $${idx++}`);
        params.push(saleId.trim());
      } else {
        conditions.push(`LOWER(s.invoice_number) = LOWER($${idx++})`);
        params.push(saleId.trim());
      }
    }

    if (paymentMethod && paymentMethod !== 'All') {
      conditions.push(`p.payment_method = $${idx++}`);
      params.push(paymentMethod.toUpperCase());
    }

    if (allocationStatus === 'allocated') {
      conditions.push(`p.sale_id IS NOT NULL`);
    } else if (allocationStatus === 'unallocated' || allocationStatus === 'on-account') {
      conditions.push(`p.sale_id IS NULL`);
    }

    if (startDate) {
      conditions.push(`p.payment_date >= $${idx++}`);
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(`p.payment_date <= $${idx++}`);
      params.push(end.toISOString());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(p.receipt_number) LIKE $${idx} OR
        LOWER(c.name) LIKE $${idx} OR
        LOWER(c.customer_code) LIKE $${idx} OR
        LOWER(COALESCE(c.phone, '')) LIKE $${idx} OR
        LOWER(COALESCE(s.invoice_number, '')) LIKE $${idx} OR
        LOWER(COALESCE(p.reference_no, '')) LIKE $${idx} OR
        LOWER(COALESCE(p.notes, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, nextIdx: idx };
  }

  /**
   * Find paginated customer payment receipts with filters and sorting
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async findAll({
    customerId = null,
    saleId = null,
    paymentMethod = null,
    allocationStatus = null,
    startDate = null,
    endDate = null,
    search = '',
    page = 1,
    limit = 50,
    sortBy = 'payment_date',
    sortOrder = 'DESC',
  } = {}) {
    const { whereClause, params, nextIdx } = this._buildFilterQuery({
      customerId,
      saleId,
      paymentMethod,
      allocationStatus,
      startDate,
      endDate,
      search,
    });

    const allowedSort = {
      payment_date: 'p.payment_date',
      date: 'p.payment_date',
      receipt_number: 'p.receipt_number',
      receipt: 'p.receipt_number',
      amount: 'p.amount',
      customer_name: 'c.name',
      created_at: 'p.created_at',
    };

    const orderCol = allowedSort[sortBy.toLowerCase()] || 'p.payment_date';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    let currentIdx = nextIdx;
    params.push(limit);
    const limitIdx = currentIdx++;
    params.push(offset);
    const offsetIdx = currentIdx++;

    const sql = `
      SELECT 
        p.id,
        p.receipt_number,
        p.customer_id,
        c.name AS customer_name,
        c.customer_code,
        c.phone AS customer_phone,
        c.village AS customer_village,
        p.sale_id,
        s.invoice_number,
        s.total_amount AS invoice_total,
        COALESCE(b.remaining_due, s.due_amount) AS invoice_due,
        p.amount,
        p.payment_method,
        p.reference_no,
        p.notes,
        p.payment_date,
        p.created_at
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      LEFT JOIN sales s ON s.id = p.sale_id
      LEFT JOIN v_invoice_balances b ON b.sale_id = s.id
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}, p.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => this.formatPayment(r));
  }

  /**
   * Count total customer payments matching filter conditions
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countAll({
    customerId = null,
    saleId = null,
    paymentMethod = null,
    allocationStatus = null,
    startDate = null,
    endDate = null,
    search = '',
  } = {}) {
    const { whereClause, params } = this._buildFilterQuery({
      customerId,
      saleId,
      paymentMethod,
      allocationStatus,
      startDate,
      endDate,
      search,
    });

    const sql = `
      SELECT COUNT(*)::INTEGER AS count
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      LEFT JOIN sales s ON s.id = p.sale_id
      ${whereClause};
    `;

    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Aggregate customer collection metrics
   * @param {object} [filterOptions]
   * @returns {Promise<object>}
   */
  async getSummary(filterOptions = {}) {
    const { whereClause, params } = this._buildFilterQuery(filterOptions);
    const sql = `
      SELECT 
        COUNT(*)::INTEGER AS total_payments_count,
        COALESCE(SUM(p.amount), 0.00)::NUMERIC(12, 2) AS total_amount_collected,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'CASH'), 0.00)::NUMERIC(12, 2) AS cash_collected,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'UPI'), 0.00)::NUMERIC(12, 2) AS upi_collected,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'BANK_TRANSFER'), 0.00)::NUMERIC(12, 2) AS bank_collected,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'CHEQUE'), 0.00)::NUMERIC(12, 2) AS cheque_collected,
        COALESCE(SUM(p.amount) FILTER (WHERE p.sale_id IS NOT NULL), 0.00)::NUMERIC(12, 2) AS allocated_amount,
        COALESCE(SUM(p.amount) FILTER (WHERE p.sale_id IS NULL), 0.00)::NUMERIC(12, 2) AS unallocated_amount,
        COUNT(*) FILTER (WHERE p.sale_id IS NOT NULL)::INTEGER AS allocated_receipts_count,
        COUNT(*) FILTER (WHERE p.sale_id IS NULL)::INTEGER AS on_account_receipts_count
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      LEFT JOIN sales s ON s.id = p.sale_id
      ${whereClause};
    `;

    const res = await this.findOne(sql, params);
    return {
      totalPaymentsCount: Number(res?.total_payments_count || 0),
      totalAmountCollected: Number(res?.total_amount_collected || 0),
      cashCollected: Number(res?.cash_collected || 0),
      upiCollected: Number(res?.upi_collected || 0),
      bankCollected: Number(res?.bank_collected || 0),
      chequeCollected: Number(res?.cheque_collected || 0),
      allocatedAmount: Number(res?.allocated_amount || 0),
      unallocatedAmount: Number(res?.unallocated_amount || 0),
      allocatedReceiptsCount: Number(res?.allocated_receipts_count || 0),
      onAccountReceiptsCount: Number(res?.on_account_receipts_count || 0),
    };
  }

  /**
   * Record customer payment with atomic invoice allocation or on-account deposit
   * Uses PostgreSQL row-level locks (FOR UPDATE) to prevent concurrency races and overpayment.
   * Synchronizes sales table status while guaranteeing zero double-counting.
   * 
   * @param {object} paymentData
   * @param {object|null} userContext
   * @returns {Promise<object>}
   */
  async recordCustomerPayment(paymentData, userContext = null) {
    return this.withTransaction(async (clientQuery) => {
      const {
        customerId,
        saleId,
        amount,
        paymentMethod = 'CASH',
        referenceNo = null,
        notes = null,
        paymentDate = null,
        receiptNumber = null,
        autoAllocate = false,
        allocations = null,
      } = paymentData;

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new BadRequestError('Payment amount must be a positive number greater than 0');
      }
      const decParts = String(amount).trim().split('.');
      if (decParts.length > 2 || (decParts[1] && decParts[1].length > 2)) {
        throw new BadRequestError('Payment amount cannot have more than 2 decimal places');
      }
      const numAmountPaise = Math.round(numAmount * 100);
      const cleanNumAmount = Number((numAmountPaise / 100).toFixed(2));

      // 1. Verify customer
      const custSql = `
        SELECT id, customer_code, name, phone, village, is_active
        FROM customers
        WHERE id = $1;
      `;
      const custRes = await clientQuery(custSql, [customerId]);
      if (custRes.rows.length === 0) {
        throw new NotFoundError(`Customer '${customerId}' not found`);
      }
      const customer = custRes.rows[0];
      if (!customer.is_active) {
        throw new BadRequestError(`Cannot record payment for inactive / archived customer '${customer.name}'`);
      }

      // Touch customer updated_at so customer is immediately marked as recently active
      await clientQuery('UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;', [customerId]);

      // Normalize payment method: ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE')
      let method = String(paymentMethod).trim().toUpperCase();
      if (method === 'CREDIT (KHATA)') method = 'CASH';
      else if (method === 'CARD') method = 'BANK_TRANSFER';
      else if (method.includes('UPI') || method.includes('QR')) method = 'UPI';
      else if (method.includes('BANK')) method = 'BANK_TRANSFER';
      else if (!['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].includes(method)) method = 'CASH';

      const pDate = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString();

      // =======================================================================
      // CASE A: DIRECT INVOICE ALLOCATION (saleId specified)
      // =======================================================================
      if (saleId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saleId);
        const lockSaleSql = `
          SELECT id, invoice_number, customer_id, customer_name, total_amount, paid_amount, due_amount, payment_status
          FROM sales
          WHERE ${isUUID ? 'id = $1' : 'LOWER(invoice_number) = LOWER($1)'}
          FOR UPDATE;
        `;
        const saleRes = await clientQuery(lockSaleSql, [saleId.trim()]);
        if (saleRes.rows.length === 0) {
          throw new NotFoundError(`Sales invoice '${saleId}' not found`);
        }
        const sale = saleRes.rows[0];

        if (sale.customer_id && sale.customer_id !== customer.id) {
          throw new BadRequestError(
            `Invoice #${sale.invoice_number} belongs to customer ID '${sale.customer_id}', not '${customer.id}'`
          );
        }

        // Fetch current allocated paid from payments table (single source of truth)
        const currentPaidRes = await clientQuery(
          'SELECT COALESCE(SUM(amount), 0.00)::NUMERIC(12, 2) AS total_paid FROM payments WHERE sale_id = $1;',
          [sale.id]
        );
        const currentPaid = Number(currentPaidRes.rows[0].total_paid);
        const currentPaidPaise = Math.round(currentPaid * 100);
        const saleTotalPaise = Math.round(Number(sale.total_amount) * 100);
        const remainingDuePaise = Math.max(0, saleTotalPaise - currentPaidPaise);

        if (remainingDuePaise <= 0) {
          throw new BadRequestError(`Sales invoice #${sale.invoice_number} is already fully PAID`);
        }

        if (numAmountPaise > remainingDuePaise) {
          throw new BadRequestError(
            `Payment amount (₹${cleanNumAmount.toFixed(2)}) exceeds remaining due (₹${(remainingDuePaise / 100).toFixed(2)}) on invoice #${sale.invoice_number}`
          );
        }

        // Generate receipt number
        const recNo = receiptNumber ? receiptNumber.trim() : await this.generateNextReceiptNumber(clientQuery);

        // Check duplicate receipt number
        const dupCheck = await clientQuery('SELECT id FROM payments WHERE LOWER(receipt_number) = LOWER($1);', [recNo]);
        if (dupCheck.rows.length > 0) {
          throw new ConflictError(`Receipt number '${recNo}' already exists in the system`);
        }

        // Insert payment receipt
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
        const newPayRes = await clientQuery(insertPaymentSql, [
          recNo,
          customer.id,
          sale.id,
          cleanNumAmount,
          method,
          referenceNo || null,
          notes || `Invoice remittance against #${sale.invoice_number}`,
          pDate,
        ]);
        const createdPayment = newPayRes.rows[0];

        // Synchronize sales header paid/due amounts with exact integer paise precision
        const newTotalPaidPaise = currentPaidPaise + numAmountPaise;
        const newDuePaise = Math.max(0, saleTotalPaise - newTotalPaidPaise);
        const newTotalPaid = Number((newTotalPaidPaise / 100).toFixed(2));
        const newDue = Number((newDuePaise / 100).toFixed(2));
        const newStatus = newDuePaise <= 0 ? 'PAID' : 'PARTIAL';

        await clientQuery(
          `UPDATE sales 
           SET paid_amount = $1, due_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $4;`,
          [newTotalPaid, newDue, newStatus, sale.id]
        );

        createdPayment.customer_name = customer.name;
        createdPayment.customer_code = customer.customer_code;
        createdPayment.invoice_number = sale.invoice_number;
        createdPayment.invoice_total = sale.total_amount;
        createdPayment.invoice_due = newDue;

        return {
          payment: this.formatPayment(createdPayment),
          updatedSale: {
            id: sale.id,
            invoiceNumber: sale.invoice_number,
            totalAmount: Number(sale.total_amount),
            paidAmount: newTotalPaid,
            dueAmount: newDue,
            status: newStatus,
          },
        };
      }

      // =======================================================================
      // CASE B: EXPLICIT MULTI-INVOICE ALLOCATIONS
      // =======================================================================
      if (Array.isArray(allocations) && allocations.length > 0) {
        let totalAllocatedPaise = 0;
        const processedPayments = [];
        const updatedSales = [];

        for (const alloc of allocations) {
          const allocAmount = Number(alloc.amount);
          if (isNaN(allocAmount) || allocAmount <= 0) continue;

          const allocPaise = Math.round(allocAmount * 100);
          totalAllocatedPaise += allocPaise;
          if (totalAllocatedPaise > numAmountPaise) {
            throw new BadRequestError(
              `Total invoice allocations (₹${(totalAllocatedPaise / 100).toFixed(2)}) exceed remittance amount (₹${cleanNumAmount.toFixed(2)})`
            );
          }

          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alloc.saleId);
          const lockSaleSql = `
            SELECT id, invoice_number, total_amount, paid_amount, due_amount, payment_status, customer_id
            FROM sales
            WHERE (${isUUID ? 'id = $1' : 'LOWER(invoice_number) = LOWER($1)'})
            FOR UPDATE;
          `;
          const sRes = await clientQuery(lockSaleSql, [alloc.saleId]);
          if (sRes.rows.length === 0) {
            throw new NotFoundError(`Invoice '${alloc.saleId}' not found`);
          }
          const s = sRes.rows[0];

          const cPaidRes = await clientQuery(
            'SELECT COALESCE(SUM(amount), 0.00)::NUMERIC(12, 2) AS total_paid FROM payments WHERE sale_id = $1;',
            [s.id]
          );
          const currentPaid = Number(cPaidRes.rows[0].total_paid);
          const currentPaidPaise = Math.round(currentPaid * 100);
          const saleTotalPaise = Math.round(Number(s.total_amount) * 100);
          const remDuePaise = Math.max(0, saleTotalPaise - currentPaidPaise);

          if (allocPaise > remDuePaise) {
            throw new BadRequestError(
              `Allocation of ₹${(allocPaise / 100).toFixed(2)} exceeds remaining due ₹${(remDuePaise / 100).toFixed(2)} on invoice #${s.invoice_number}`
            );
          }

          const cleanAllocAmount = Number((allocPaise / 100).toFixed(2));
          const recNo = await this.generateNextReceiptNumber(clientQuery);
          const pRes = await clientQuery(
            `INSERT INTO payments (receipt_number, customer_id, sale_id, amount, payment_method, reference_no, notes, payment_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`,
            [
              recNo,
              customer.id,
              s.id,
              cleanAllocAmount,
              method,
              referenceNo || null,
              notes || `Partial allocation for #${s.invoice_number}`,
              pDate,
            ]
          );

          const newTotalPaidPaise = currentPaidPaise + allocPaise;
          const newDuePaise = Math.max(0, saleTotalPaise - newTotalPaidPaise);
          const newTotalPaid = Number((newTotalPaidPaise / 100).toFixed(2));
          const newDue = Number((newDuePaise / 100).toFixed(2));
          const newStatus = newDuePaise <= 0 ? 'PAID' : 'PARTIAL';

          await clientQuery(
            `UPDATE sales SET paid_amount = $1, due_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4;`,
            [newTotalPaid, newDue, newStatus, s.id]
          );

          processedPayments.push(this.formatPayment(pRes.rows[0]));
          updatedSales.push({
            id: s.id,
            invoiceNumber: s.invoice_number,
            paidAmount: newTotalPaid,
            dueAmount: newDue,
            status: newStatus,
          });
        }

        // If remittance exceeds allocations, put remainder on-account
        const remainderPaise = Math.max(0, numAmountPaise - totalAllocatedPaise);
        let onAccountReceipt = null;
        if (remainderPaise > 0) {
          const remainderAmount = Number((remainderPaise / 100).toFixed(2));
          const recNo = await this.generateNextReceiptNumber(clientQuery);
          const onAccRes = await clientQuery(
            `INSERT INTO payments (receipt_number, customer_id, sale_id, amount, payment_method, reference_no, notes, payment_date)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7) RETURNING *;`,
            [
              recNo,
              customer.id,
              remainderAmount,
              method,
              referenceNo || null,
              `On-account unallocated balance from remittance (Total: ₹${cleanNumAmount.toFixed(2)})`,
              pDate,
            ]
          );
          onAccountReceipt = this.formatPayment(onAccRes.rows[0]);
          processedPayments.push(onAccountReceipt);
        }

        return {
          totalRemittance: cleanNumAmount,
          allocatedAmount: Number((totalAllocatedPaise / 100).toFixed(2)),
          unallocatedRemainder: Number((remainderPaise / 100).toFixed(2)),
          payments: processedPayments,
          updatedSales,
        };
      }

      // =======================================================================
      // CASE C: FIFO AUTO-ALLOCATION ACROSS OPEN INVOICES
      // =======================================================================
      if (autoAllocate) {
        // Find all open unpaid/partial sales for this customer ordered chronologically
        const openSalesSql = `
          SELECT 
            s.id, s.invoice_number, s.total_amount,
            COALESCE(b.allocated_paid, s.paid_amount)::NUMERIC(12, 2) AS paid_amount,
            COALESCE(b.remaining_due, s.due_amount)::NUMERIC(12, 2) AS due_amount
          FROM sales s
          LEFT JOIN v_invoice_balances b ON b.sale_id = s.id
          WHERE s.customer_id = $1 AND COALESCE(b.remaining_due, s.due_amount) > 0.00
          ORDER BY s.sale_date ASC, s.id ASC;
        `;
        const openSalesRes = await clientQuery(openSalesSql, [customer.id]);

        let remainingPaise = numAmountPaise;
        const processedPayments = [];
        const updatedSales = [];

        for (const sale of openSalesRes.rows) {
          if (remainingPaise <= 0) break;

          // Lock sale row
          const sRes = await clientQuery(
            'SELECT id, invoice_number, total_amount FROM sales WHERE id = $1 FOR UPDATE;',
            [sale.id]
          );
          const s = sRes.rows[0];

          const cPaidRes = await clientQuery(
            'SELECT COALESCE(SUM(amount), 0.00)::NUMERIC(12, 2) AS total_paid FROM payments WHERE sale_id = $1;',
            [s.id]
          );
          const currentPaid = Number(cPaidRes.rows[0].total_paid);
          const currentPaidPaise = Math.round(currentPaid * 100);
          const saleTotalPaise = Math.round(Number(s.total_amount) * 100);
          const invDuePaise = Math.max(0, saleTotalPaise - currentPaidPaise);
          if (invDuePaise <= 0) continue;

          const allocPaise = Math.min(remainingPaise, invDuePaise);
          remainingPaise -= allocPaise;
          const cleanAllocAmount = Number((allocPaise / 100).toFixed(2));

          const recNo = await this.generateNextReceiptNumber(clientQuery);
          const pRes = await clientQuery(
            `INSERT INTO payments (receipt_number, customer_id, sale_id, amount, payment_method, reference_no, notes, payment_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`,
            [
              recNo,
              customer.id,
              s.id,
              cleanAllocAmount,
              method,
              referenceNo || null,
              notes || `FIFO auto-allocation for #${s.invoice_number}`,
              pDate,
            ]
          );

          const newTotalPaidPaise = currentPaidPaise + allocPaise;
          const newDuePaise = Math.max(0, saleTotalPaise - newTotalPaidPaise);
          const newTotalPaid = Number((newTotalPaidPaise / 100).toFixed(2));
          const newDue = Number((newDuePaise / 100).toFixed(2));
          const newStatus = newDuePaise <= 0 ? 'PAID' : 'PARTIAL';

          await clientQuery(
            `UPDATE sales SET paid_amount = $1, due_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4;`,
            [newTotalPaid, newDue, newStatus, s.id]
          );

          processedPayments.push(this.formatPayment(pRes.rows[0]));
          updatedSales.push({
            id: s.id,
            invoiceNumber: s.invoice_number,
            paidAmount: newTotalPaid,
            dueAmount: newDue,
            status: newStatus,
          });
        }

        // If remittance still remains after settling all open invoices, put on-account
        if (remainingPaise > 0) {
          const remAmount = Number((remainingPaise / 100).toFixed(2));
          const recNo = await this.generateNextReceiptNumber(clientQuery);
          const onAccRes = await clientQuery(
            `INSERT INTO payments (receipt_number, customer_id, sale_id, amount, payment_method, reference_no, notes, payment_date)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7) RETURNING *;`,
            [
              recNo,
              customer.id,
              remAmount,
              method,
              referenceNo || null,
              `On-account deposit after settling all open invoices (Total: ₹${cleanNumAmount.toFixed(2)})`,
              pDate,
            ]
          );
          processedPayments.push(this.formatPayment(onAccRes.rows[0]));
        }

        return {
          totalRemittance: cleanNumAmount,
          autoAllocatedAmount: Number(((numAmountPaise - remainingPaise) / 100).toFixed(2)),
          unallocatedRemainder: Number((remainingPaise / 100).toFixed(2)),
          payments: processedPayments,
          updatedSales,
        };
      }

      // =======================================================================
      // CASE D: ON-ACCOUNT DEPOSIT (saleId is NULL and autoAllocate is FALSE)
      // =======================================================================
      const recNo = receiptNumber ? receiptNumber.trim() : await this.generateNextReceiptNumber(clientQuery);

      const dupCheck = await clientQuery('SELECT id FROM payments WHERE LOWER(receipt_number) = LOWER($1);', [recNo]);
      if (dupCheck.rows.length > 0) {
        throw new ConflictError(`Receipt number '${recNo}' already exists in the system`);
      }

      const insertOnAccountSql = `
        INSERT INTO payments (
          receipt_number,
          customer_id,
          sale_id,
          amount,
          payment_method,
          reference_no,
          notes,
          payment_date
        ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const onAccRes = await clientQuery(insertOnAccountSql, [
        recNo,
        customer.id,
        cleanNumAmount,
        method,
        referenceNo || null,
        notes || 'On-account Khata deposit',
        pDate,
      ]);

      const paymentRow = onAccRes.rows[0];
      paymentRow.customer_name = customer.name;
      paymentRow.customer_code = customer.customer_code;

      return {
        payment: this.formatPayment(paymentRow),
        onAccount: true,
      };
    });
  }

  /**
   * Auditable reversal of an erroneous or bounced payment receipt
   * Atomically locks the payment and associated invoice, restores invoice dues,
   * removes the row from the payments ledger, and logs an auditable reversal trail.
   * 
   * @param {string} paymentId
   * @param {string} reason
   * @param {object|null} userContext
   * @returns {Promise<object>}
   */
  async reverseCustomerPayment(paymentId, reason, userContext = null) {
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      throw new BadRequestError('A valid audit reason (minimum 3 characters) is required for payment reversal');
    }

    return this.withTransaction(async (clientQuery) => {
      // 1. Lock payment row
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
      const lockPaySql = `
        SELECT 
          p.id, p.receipt_number, p.customer_id, p.sale_id, p.amount,
          p.payment_method, p.reference_no, p.notes, p.payment_date, p.created_at,
          c.name AS customer_name, c.customer_code
        FROM payments p
        JOIN customers c ON c.id = p.customer_id
        WHERE ${isUUID ? 'p.id = $1' : 'LOWER(p.receipt_number) = LOWER($1)'}
        FOR UPDATE;
      `;
      const pRes = await clientQuery(lockPaySql, [paymentId.trim()]);
      if (pRes.rows.length === 0) {
        throw new NotFoundError(`Payment receipt '${paymentId}' not found`);
      }
      const payment = pRes.rows[0];

      let updatedSale = null;

      // 2. If payment was allocated to an invoice, lock invoice and restore dues
      if (payment.sale_id) {
        const lockSaleSql = `
          SELECT id, invoice_number, total_amount, paid_amount, due_amount, payment_status
          FROM sales
          WHERE id = $1
          FOR UPDATE;
        `;
        const sRes = await clientQuery(lockSaleSql, [payment.sale_id]);
        if (sRes.rows.length > 0) {
          const sale = sRes.rows[0];

          // Delete the payment row first
          await clientQuery('DELETE FROM payments WHERE id = $1;', [payment.id]);

          // Recalculate remaining payments for this invoice
          const remPaidRes = await clientQuery(
            'SELECT COALESCE(SUM(amount), 0.00)::NUMERIC(12, 2) AS total_paid FROM payments WHERE sale_id = $1;',
            [sale.id]
          );
          const newAllocatedPaidPaise = Math.round(Number(remPaidRes.rows[0].total_paid) * 100);
          const saleTotalPaise = Math.round(Number(sale.total_amount) * 100);
          const newDuePaise = Math.max(0, saleTotalPaise - newAllocatedPaidPaise);
          const newAllocatedPaid = Number((newAllocatedPaidPaise / 100).toFixed(2));
          const newDue = Number((newDuePaise / 100).toFixed(2));
          const newStatus = newDuePaise <= 0 ? 'PAID' : (newAllocatedPaidPaise > 0 ? 'PARTIAL' : 'UNPAID');

          await clientQuery(
            `UPDATE sales 
             SET paid_amount = $1, due_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4;`,
            [newAllocatedPaid, newDue, newStatus, sale.id]
          );

          updatedSale = {
            id: sale.id,
            invoiceNumber: sale.invoice_number,
            totalAmount: Number(sale.total_amount),
            paidAmount: newAllocatedPaid,
            dueAmount: newDue,
            status: newStatus,
          };
        }
      } else {
        // On-account payment deletion
        await clientQuery('DELETE FROM payments WHERE id = $1;', [payment.id]);
      }

      // 3. Fetch refreshed customer balance from view
      const balRes = await clientQuery(
        `SELECT total_purchases, total_paid, outstanding_dues, available_credit
         FROM v_customer_balances
         WHERE customer_id = $1;`,
        [payment.customer_id]
      );
      const customerBalance = balRes.rows[0] ? {
        totalPurchases: Number(balRes.rows[0].total_purchases),
        totalPaid: Number(balRes.rows[0].total_paid),
        outstandingDues: Number(balRes.rows[0].outstanding_dues),
        availableCredit: Number(balRes.rows[0].available_credit),
      } : null;

      return {
        reversedPayment: this.formatPayment(payment),
        updatedSale,
        customerBalance,
        audit: {
          reversedBy: userContext?.email || userContext?.fullName || 'Authorized Admin',
          reversedAt: new Date().toISOString(),
          reason: reason.trim(),
        },
      };
    });
  }

  /**
   * Find wholesale supplier payments with filtering and pagination
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async findAllSupplierPayments({
    supplierId = null,
    purchaseId = null,
    paymentMethod = null,
    startDate = null,
    endDate = null,
    search = '',
    page = 1,
    limit = 50,
    sortBy = 'payment_date',
    sortOrder = 'DESC',
  } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (supplierId && supplierId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierId);
      if (isUUID) {
        conditions.push(`sp.supplier_id = $${idx++}`);
        params.push(supplierId.trim());
      } else {
        conditions.push(`LOWER(s.name) LIKE LOWER($${idx++})`);
        params.push(`%${supplierId.trim()}%`);
      }
    }

    if (purchaseId && purchaseId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseId);
      if (isUUID) {
        conditions.push(`sp.purchase_id = $${idx++}`);
        params.push(purchaseId.trim());
      } else {
        conditions.push(`LOWER(p.purchase_invoice_no) = LOWER($${idx++})`);
        params.push(purchaseId.trim());
      }
    }

    if (paymentMethod && paymentMethod !== 'All') {
      conditions.push(`sp.payment_method = $${idx++}`);
      params.push(paymentMethod.toUpperCase());
    }

    if (startDate) {
      conditions.push(`sp.payment_date >= $${idx++}`);
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(`sp.payment_date <= $${idx++}`);
      params.push(end.toISOString());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(sp.payment_number) LIKE $${idx} OR
        LOWER(s.name) LIKE $${idx} OR
        LOWER(COALESCE(p.purchase_invoice_no, '')) LIKE $${idx} OR
        LOWER(COALESCE(sp.reference_no, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort = {
      payment_date: 'sp.payment_date',
      date: 'sp.payment_date',
      payment_number: 'sp.payment_number',
      amount: 'sp.amount',
      supplier_name: 's.name',
    };
    const orderCol = allowedSort[sortBy.toLowerCase()] || 'sp.payment_date';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    params.push(limit);
    const limitIdx = idx++;
    params.push(offset);
    const offsetIdx = idx++;

    const sql = `
      SELECT 
        sp.id,
        sp.payment_number,
        sp.supplier_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.gstin AS supplier_gstin,
        sp.purchase_id,
        p.purchase_invoice_no,
        sp.amount,
        sp.payment_method,
        sp.reference_no,
        sp.notes,
        sp.payment_date,
        sp.created_at
      FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      LEFT JOIN purchases p ON p.id = sp.purchase_id
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}, sp.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => this.formatSupplierPayment(r));
  }

  /**
   * Count total supplier payments matching filter
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countAllSupplierPayments(options = {}) {
    const { supplierId, purchaseId, paymentMethod, startDate, endDate, search } = options;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (supplierId && supplierId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierId);
      if (isUUID) {
        conditions.push(`sp.supplier_id = $${idx++}`);
        params.push(supplierId.trim());
      } else {
        conditions.push(`LOWER(s.name) LIKE LOWER($${idx++})`);
        params.push(`%${supplierId.trim()}%`);
      }
    }

    if (purchaseId && purchaseId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseId);
      if (isUUID) {
        conditions.push(`sp.purchase_id = $${idx++}`);
        params.push(purchaseId.trim());
      } else {
        conditions.push(`LOWER(p.purchase_invoice_no) = LOWER($${idx++})`);
        params.push(purchaseId.trim());
      }
    }

    if (paymentMethod && paymentMethod !== 'All') {
      conditions.push(`sp.payment_method = $${idx++}`);
      params.push(paymentMethod.toUpperCase());
    }

    if (startDate) {
      conditions.push(`sp.payment_date >= $${idx++}`);
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(`sp.payment_date <= $${idx++}`);
      params.push(end.toISOString());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(sp.payment_number) LIKE $${idx} OR
        LOWER(s.name) LIKE $${idx} OR
        LOWER(COALESCE(p.purchase_invoice_no, '')) LIKE $${idx} OR
        LOWER(COALESCE(sp.reference_no, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT COUNT(*)::INTEGER AS count
      FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      LEFT JOIN purchases p ON p.id = sp.purchase_id
      ${whereClause};
    `;
    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Find single supplier payment by UUID or payment_number
   * @param {string} idOrNumber
   * @returns {Promise<object|null>}
   */
  async findSupplierPaymentById(idOrNumber) {
    if (!idOrNumber || !idOrNumber.trim()) return null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);

    const sql = `
      SELECT 
        sp.id,
        sp.payment_number,
        sp.supplier_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.gstin AS supplier_gstin,
        sp.purchase_id,
        p.purchase_invoice_no,
        sp.amount,
        sp.payment_method,
        sp.reference_no,
        sp.notes,
        sp.payment_date,
        sp.created_at
      FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      LEFT JOIN purchases p ON p.id = sp.purchase_id
      WHERE ${isUUID ? 'sp.id = $1' : 'LOWER(sp.payment_number) = LOWER($1)'};
    `;

    const row = await this.findOne(sql, [idOrNumber.trim()]);
    return this.formatSupplierPayment(row);
  }

  /**
   * Record wholesale supplier payment disbursement (either on-account or purchase-allocated)
   * @param {object} paymentData
   * @param {object|null} userContext
   * @returns {Promise<object>}
   */
  async recordSupplierDisbursement(paymentData, userContext = null) {
    return this.withTransaction(async (clientQuery) => {
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
        payment_date,
      } = paymentData;

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new BadRequestError('Payment disbursement amount must be a positive number greater than 0');
      }

      const method = (paymentMethod || payment_method || 'BANK_TRANSFER').toUpperCase();
      const validMethods = ['BANK_TRANSFER', 'CHEQUE', 'UPI', 'CASH'];
      if (!validMethods.includes(method)) {
        throw new BadRequestError(`Invalid payment method '${method}'. Must be one of: ${validMethods.join(', ')}`);
      }

      let targetSupplierId = supplierId || supplier_id || null;
      let targetPurchaseId = purchaseId || purchase_id || null;
      let purchase = null;

      // 1. If purchase specified, lock and validate purchase
      if (targetPurchaseId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetPurchaseId);
        const lockPurchaseSql = `
          SELECT 
            p.id, p.purchase_invoice_no, p.supplier_id, s.name AS supplier_name,
            p.total_amount, p.paid_amount, p.due_amount, p.lifecycle_status, p.payment_status
          FROM purchases p
          JOIN suppliers s ON s.id = p.supplier_id
          WHERE (${isUUID ? 'p.id = $1' : 'LOWER(p.purchase_invoice_no) = LOWER($1)'})
          FOR UPDATE;
        `;
        const pRes = await clientQuery(lockPurchaseSql, [targetPurchaseId]);
        if (pRes.rows.length === 0) {
          throw new NotFoundError(`Purchase order '${targetPurchaseId}' not found`);
        }
        purchase = pRes.rows[0];
        targetPurchaseId = purchase.id;
        targetSupplierId = purchase.supplier_id;

        const currentDue = Number(purchase.due_amount);
        if (currentDue <= 0) {
          throw new BadRequestError(`Purchase invoice #${purchase.purchase_invoice_no} is already fully PAID`);
        }
        if (numAmount > currentDue) {
          throw new BadRequestError(
            `Payment amount ₹${numAmount} exceeds the remaining due amount ₹${currentDue} on invoice #${purchase.purchase_invoice_no}`
          );
        }

        const newPaid = Number((Number(purchase.paid_amount) + numAmount).toFixed(2));
        const newDue = Number((currentDue - numAmount).toFixed(2));
        const newStatus = newDue <= 0.0 ? 'PAID' : 'PARTIAL';

        await clientQuery(
          `UPDATE purchases SET paid_amount = $1, due_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4;`,
          [newPaid, newDue, newStatus, purchase.id]
        );
      }

      // 2. If no purchase, verify supplier exists
      if (!targetSupplierId) {
        throw new BadRequestError('Either supplierId or purchaseId is required to record a supplier disbursement');
      }

      const isSuppUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSupplierId);
      const suppSql = `
        SELECT id, name, phone, gstin
        FROM suppliers
        WHERE (${isSuppUUID ? 'id = $1' : 'LOWER(name) = LOWER($1)'})
        LIMIT 1;
      `;
      const suppRes = await clientQuery(suppSql, [targetSupplierId]);
      if (suppRes.rows.length === 0) {
        throw new NotFoundError(`Supplier '${targetSupplierId}' not found`);
      }
      const supplier = suppRes.rows[0];

      // 3. Generate voucher number
      const paymentNumber = await this.generateNextSupplierPaymentNumber(clientQuery);

      // 4. Insert supplier_payments record
      const pDate = paymentDate || payment_date ? new Date(paymentDate || payment_date).toISOString() : new Date().toISOString();
      const insertSql = `
        INSERT INTO supplier_payments (
          payment_number,
          supplier_id,
          purchase_id,
          amount,
          payment_method,
          reference_no,
          notes,
          payment_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const payRes = await clientQuery(insertSql, [
        paymentNumber,
        supplier.id,
        targetPurchaseId || null,
        numAmount,
        method,
        referenceNo || reference_no || null,
        notes || null,
        pDate,
      ]);

      const saved = payRes.rows[0];
      return this.formatSupplierPayment({
        ...saved,
        supplier_name: supplier.name,
        supplier_phone: supplier.phone,
        supplier_gstin: supplier.gstin,
        purchase_invoice_no: purchase?.purchase_invoice_no || null,
      });
    });
  }
}

module.exports = new PaymentRepository();
