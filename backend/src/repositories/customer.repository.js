const BaseRepository = require('./base.repository');

/**
 * Customer Repository
 * Data-access layer for farmer accounts, Khata credit ledgers, and transactions.
 * Utilizes v_customer_balances and v_invoice_balances as the single source of truth.
 */
class CustomerRepository extends BaseRepository {
  /**
   * Format database row with dual camelCase and snake_case support
   * @param {object} row
   * @returns {object|null}
   */
  formatCustomer(row) {
    if (!row) return null;
    return {
      id: row.id,
      customerCode: row.customer_code,
      customer_code: row.customer_code,
      name: row.name,
      phone: row.phone,
      village: row.village,
      address: row.address,
      creditLimit: Number(row.credit_limit || 0),
      credit_limit: Number(row.credit_limit || 0),
      openingBalance: Number(row.opening_balance || 0),
      opening_balance: Number(row.opening_balance || 0),
      totalPurchases: Number(row.total_purchases || 0),
      total_purchases: Number(row.total_purchases || 0),
      totalPaid: Number(row.total_paid || 0),
      total_paid: Number(row.total_paid || 0),
      outstandingDues: Number(row.outstanding_dues || 0),
      outstanding_dues: Number(row.outstanding_dues || 0),
      availableCredit: Number(row.available_credit || 0),
      available_credit: Number(row.available_credit || 0),
      balanceStatus: row.balance_status || (Number(row.outstanding_dues || 0) > 0 ? 'HAS_DUES' : 'CLEARED'),
      balance_status: row.balance_status || (Number(row.outstanding_dues || 0) > 0 ? 'HAS_DUES' : 'CLEARED'),
      notes: row.notes,
      isActive: Boolean(row.is_active),
      is_active: Boolean(row.is_active),
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
      latestActivityAt: row.latest_activity_at || row.updated_at || row.created_at,
      latest_activity_at: row.latest_activity_at || row.updated_at || row.created_at,
    };
  }

  /**
   * Build WHERE clauses for customer filtering
   * @private
   */
  _buildFilterQuery({ search, village, duesOnly, isActive, dateFilter, startDate, endDate }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (isActive !== null && isActive !== undefined && isActive !== 'all') {
      conditions.push(`c.is_active = $${idx++}`);
      params.push(Boolean(isActive));
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(c.name) LIKE $${idx} OR
        LOWER(c.customer_code) LIKE $${idx} OR
        LOWER(COALESCE(c.phone, '')) LIKE $${idx} OR
        LOWER(COALESCE(c.village, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    if (village && village !== 'All') {
      conditions.push(`LOWER(COALESCE(c.village, '')) = LOWER($${idx++})`);
      params.push(village.trim());
    }

    if (duesOnly === 'true' || duesOnly === 'has-dues') {
      conditions.push(`b.outstanding_dues > 0.00`);
    } else if (duesOnly === 'cleared') {
      conditions.push(`b.outstanding_dues = 0.00`);
    }

    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'today') {
        conditions.push(`c.created_at >= CURRENT_DATE`);
      } else if (dateFilter === 'yesterday') {
        conditions.push(`c.created_at >= CURRENT_DATE - INTERVAL '1 day' AND c.created_at < CURRENT_DATE`);
      } else if (dateFilter === 'week' || dateFilter === '7days') {
        conditions.push(`c.created_at >= CURRENT_DATE - INTERVAL '7 days'`);
      } else if (dateFilter === 'month' || dateFilter === '30days') {
        conditions.push(`c.created_at >= CURRENT_DATE - INTERVAL '30 days'`);
      }
    }

    if (startDate) {
      conditions.push(`c.created_at >= $${idx++}`);
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      conditions.push(`c.created_at <= $${idx++}`);
      params.push(new Date(endDate).toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, nextIdx: idx };
  }

  /**
   * Find paginated customers joined with real-time accounting view v_customer_balances
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async findAll({
    search = '',
    village = 'All',
    duesOnly = 'all',
    isActive = true,
    dateFilter = 'all',
    startDate,
    endDate,
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = {}) {
    const { whereClause, params, nextIdx } = this._buildFilterQuery({
      search,
      village,
      duesOnly,
      isActive,
      dateFilter,
      startDate,
      endDate,
    });

    const allowedSortColumns = {
      name: 'c.name',
      customer_code: 'c.customer_code',
      village: 'c.village',
      dues: 'b.outstanding_dues',
      outstanding_dues: 'b.outstanding_dues',
      purchases: 'b.total_purchases',
      total_purchases: 'b.total_purchases',
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
      latest_activity: 'latest_activity_at',
      latest_activity_at: 'latest_activity_at',
      id: 'c.id',
    };
    const orderCol = allowedSortColumns[sortBy.toLowerCase()] || 'c.created_at';
    const orderDir = (sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    let currentIdx = nextIdx;
    params.push(limit);
    const limitIdx = currentIdx++;
    params.push(offset);
    const offsetIdx = currentIdx++;

    const sql = `
      SELECT 
        c.id,
        c.customer_code,
        c.name,
        c.phone,
        c.village,
        c.address,
        c.credit_limit,
        c.opening_balance,
        c.notes,
        c.is_active,
        c.created_at,
        c.updated_at,
        GREATEST(
          c.updated_at,
          c.created_at,
          COALESCE(last_s.last_sale_at, c.created_at),
          COALESCE(last_p.last_payment_at, c.created_at)
        ) AS latest_activity_at,
        COALESCE(b.total_purchases, c.opening_balance)::NUMERIC(12, 2) AS total_purchases,
        COALESCE(b.total_paid, 0.00)::NUMERIC(12, 2) AS total_paid,
        COALESCE(b.outstanding_dues, c.opening_balance)::NUMERIC(12, 2) AS outstanding_dues,
        COALESCE(b.available_credit, c.credit_limit)::NUMERIC(12, 2) AS available_credit,
        COALESCE(b.balance_status, 'CLEARED') AS balance_status
      FROM customers c
      LEFT JOIN v_customer_balances b ON b.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, MAX(sale_date) AS last_sale_at
        FROM sales
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) last_s ON last_s.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, MAX(payment_date) AS last_payment_at
        FROM payments
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) last_p ON last_p.customer_id = c.id
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}, c.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => this.formatCustomer(r));
  }

  /**
   * Count total customers matching query filters
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countAll({ search = '', village = 'All', duesOnly = 'all', isActive = true, dateFilter = 'all', startDate, endDate } = {}) {
    const { whereClause, params } = this._buildFilterQuery({
      search,
      village,
      duesOnly,
      isActive,
      dateFilter,
      startDate,
      endDate,
    });

    const sql = `
      SELECT COUNT(*)::INTEGER AS count
      FROM customers c
      LEFT JOIN v_customer_balances b ON b.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, MAX(sale_date) AS last_sale_at
        FROM sales
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) last_s ON last_s.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, MAX(payment_date) AS last_payment_at
        FROM payments
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) last_p ON last_p.customer_id = c.id
      ${whereClause};
    `;

    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Get Khata dashboard summary metrics derived directly from v_customer_balances
   * @returns {Promise<object>}
   */
  async getSummary() {
    const sql = `
      SELECT
        COUNT(c.id)::INTEGER AS total_customers,
        COALESCE(SUM(b.outstanding_dues), 0.00)::NUMERIC(12, 2) AS total_outstanding_dues,
        COUNT(c.id) FILTER (WHERE b.outstanding_dues > 0.00)::INTEGER AS customers_with_dues,
        COALESCE(SUM(b.total_paid), 0.00)::NUMERIC(12, 2) AS total_payments_received
      FROM customers c
      LEFT JOIN v_customer_balances b ON b.customer_id = c.id
      WHERE c.is_active = TRUE;
    `;

    const res = await this.findOne(sql);
    const totalCustomers = Number(res?.total_customers || 0);
    const customersWithDues = Number(res?.customers_with_dues || 0);

    return {
      totalCustomers,
      totalOutstandingDues: Number(res?.total_outstanding_dues || 0),
      customersWithDues,
      totalPaymentsReceived: Number(res?.total_payments_received || 0),
      clearedCustomers: Math.max(0, totalCustomers - customersWithDues),
    };
  }

  /**
   * Find single customer by UUID or customer_code
   * @param {string} idOrCode
   * @returns {Promise<object|null>}
   */
  async findById(idOrCode) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const sql = `
      SELECT 
        c.id,
        c.customer_code,
        c.name,
        c.phone,
        c.village,
        c.address,
        c.credit_limit,
        c.opening_balance,
        c.notes,
        c.is_active,
        c.created_at,
        c.updated_at,
        COALESCE(b.total_purchases, c.opening_balance)::NUMERIC(12, 2) AS total_purchases,
        COALESCE(b.total_paid, 0.00)::NUMERIC(12, 2) AS total_paid,
        COALESCE(b.outstanding_dues, c.opening_balance)::NUMERIC(12, 2) AS outstanding_dues,
        COALESCE(b.available_credit, c.credit_limit)::NUMERIC(12, 2) AS available_credit,
        COALESCE(b.balance_status, 'CLEARED') AS balance_status
      FROM customers c
      LEFT JOIN v_customer_balances b ON b.customer_id = c.id
      WHERE ${isUUID ? 'c.id = $1' : 'LOWER(c.customer_code) = LOWER($1)'};
    `;

    const row = await this.findOne(sql, [idOrCode]);
    return this.formatCustomer(row);
  }

  /**
   * Find customer by registered phone number
   * @param {string} phone
   * @returns {Promise<object|null>}
   */
  async findByPhone(phone) {
    const sql = `
      SELECT id, customer_code, name, phone, village
      FROM customers
      WHERE TRIM(phone) = TRIM($1);
    `;
    return this.findOne(sql, [phone.trim()]);
  }

  /**
   * Find customer by registered exact or normalized name
   * @param {string} name
   * @returns {Promise<object|null>}
   */
  async findByName(name) {
    if (!name || !name.trim()) return null;
    const sql = `
      SELECT id, customer_code, name, phone, village
      FROM customers
      WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
      LIMIT 1;
    `;
    return this.findOne(sql, [name.trim()]);
  }

  /**
   * Generate next customer code (e.g. CUST006)
   * @returns {Promise<string>}
   */
  async generateNextCustomerCode() {
    const sql = `
      SELECT customer_code
      FROM customers
      WHERE customer_code ~ '^CUST[0-9]+$'
      ORDER BY NULLIF(regexp_replace(customer_code, '\\D', '', 'g'), '')::INTEGER DESC
      LIMIT 1;
    `;
    const res = await this.findOne(sql);
    let nextNum = 1;
    if (res && res.customer_code) {
      const match = res.customer_code.match(/CUST(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `CUST${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Create a new customer
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create({
    customer_code,
    name,
    phone = null,
    village = null,
    address = null,
    credit_limit = 30000.0,
    opening_balance = 0.0,
    notes = null,
  }) {
    const sql = `
      INSERT INTO customers (
        customer_code,
        name,
        phone,
        village,
        address,
        credit_limit,
        opening_balance,
        notes,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      RETURNING *;
    `;
    const params = [
      customer_code,
      name.trim(),
      phone ? phone.trim() : null,
      village ? village.trim() : null,
      address ? address.trim() : null,
      credit_limit,
      opening_balance,
      notes ? notes.trim() : null,
    ];

    const row = await this.findOne(sql, params);
    return this.findById(row.id);
  }

  /**
   * Update customer attributes
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object|null>}
   */
  async update(id, updates) {
    const allowedFields = {
      name: 'name',
      phone: 'phone',
      village: 'village',
      address: 'address',
      creditLimit: 'credit_limit',
      credit_limit: 'credit_limit',
      openingBalance: 'opening_balance',
      opening_balance: 'opening_balance',
      notes: 'notes',
      isActive: 'is_active',
      is_active: 'is_active',
      createdAt: 'created_at',
      created_at: 'created_at',
      date: 'created_at',
    };

    const setClauses = [];
    const params = [id];
    let idx = 2;

    for (const [key, col] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined && !setClauses.some((c) => c.startsWith(`${col} =`))) {
        setClauses.push(`${col} = $${idx++}`);
        const val = updates[key];
        if (col === 'name') {
          params.push(String(val).trim());
        } else if (col === 'phone') {
          params.push(val ? String(val).trim() : null);
        } else if (col === 'credit_limit' || col === 'opening_balance') {
          params.push(Number(val));
        } else if (col === 'is_active') {
          params.push(Boolean(val));
        } else if (col === 'created_at') {
          params.push(new Date(val).toISOString());
        } else {
          params.push(val ? String(val).trim() : null);
        }
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE customers
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id;
    `;

    const res = await this.findOne(sql, params);
    if (!res) return null;
    return this.findById(id);
  }

  /**
   * Delete customer permanently from database
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async delete(id) {
    const sql = `
      DELETE FROM customers
      WHERE id = $1
      RETURNING id;
    `;
    const res = await this.findOne(sql, [id]);
    return res;
  }

  /**
   * Archive / Soft-delete customer
   * Preserves historical invoices and payment receipts
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async archive(id) {
    const sql = `
      UPDATE customers
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;
    const res = await this.findOne(sql, [id]);
    if (!res) return null;
    return this.findById(id);
  }

  /**
   * Restore archived customer
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async restore(id) {
    const sql = `
      UPDATE customers
      SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;
    const res = await this.findOne(sql, [id]);
    if (!res) return null;
    return this.findById(id);
  }

  /**
   * Get all sales/invoices for a customer with item details
   * @param {string} customerId
   * @returns {Promise<Array<object>>}
   */
  async getCustomerSales(customerId) {
    const sql = `
      SELECT 
        s.id,
        s.invoice_number AS "invoiceNumber",
        s.customer_id AS "customerId",
        s.customer_name AS "customerName",
        s.customer_phone AS "customerPhone",
        s.customer_village AS "customerVillage",
        s.subtotal,
        s.gst_rate AS "gstRate",
        s.gst_mode AS "gstMode",
        s.gst_amount AS "gstAmount",
        s.total_amount AS "totalAmount",
        COALESCE(b.allocated_paid, s.paid_amount)::NUMERIC(12, 2) AS "paidAmount",
        COALESCE(b.remaining_due, s.due_amount)::NUMERIC(12, 2) AS "dueAmount",
        s.payment_method AS "paymentMethod",
        COALESCE(b.computed_payment_status, s.payment_status) AS "status",
        s.sale_date AS "date",
        s.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', si.id,
              'productId', si.product_id,
              'productCode', si.product_code,
              'productName', si.product_name,
              'quantity', si.quantity,
              'unitPrice', si.unit_price,
              'subtotal', si.subtotal,
              'unit', si.unit
            )
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM sales s
      LEFT JOIN v_invoice_balances b ON b.sale_id = s.id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE s.customer_id = $1
      GROUP BY s.id, b.allocated_paid, b.remaining_due, b.computed_payment_status
      ORDER BY s.sale_date DESC, s.id DESC;
    `;

    const rows = await this.findMany(sql, [customerId]);
    return rows.map((r) => ({
      ...r,
      subtotal: Number(r.subtotal || 0),
      gstRate: Number(r.gstRate || 0),
      gstAmount: Number(r.gstAmount || 0),
      totalAmount: Number(r.totalAmount || 0),
      paidAmount: Number(r.paidAmount || 0),
      dueAmount: Number(r.dueAmount || 0),
      items: Array.isArray(r.items)
        ? r.items.map((it) => ({
            ...it,
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
            subtotal: Number(it.subtotal || 0),
          }))
        : [],
    }));
  }

  /**
   * Get payment receipts for a customer
   * @param {string} customerId
   * @returns {Promise<Array<object>>}
   */
  async getCustomerPayments(customerId) {
    const sql = `
      SELECT 
        p.id,
        p.receipt_number AS "receiptNumber",
        p.customer_id AS "customerId",
        p.sale_id AS "saleId",
        s.invoice_number AS "invoiceNumber",
        p.amount::NUMERIC(12, 2) AS "amount",
        p.payment_method AS "method",
        p.reference_no AS "reference",
        p.notes,
        p.payment_date AS "date",
        p.created_at AS "createdAt"
      FROM payments p
      LEFT JOIN sales s ON s.id = p.sale_id
      WHERE p.customer_id = $1
      ORDER BY p.payment_date DESC, p.id DESC;
    `;

    const rows = await this.findMany(sql, [customerId]);
    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount || 0),
    }));
  }

  /**
   * Unified chronological transaction ledger for a farmer account
   * Reconciles opening balance, sales debits, payment credits, and running balance
   * 
   * @param {string} customerId
   * @returns {Promise<object>}
   */
  async getCustomerLedger(customerId) {
    const customer = await this.findById(customerId);
    if (!customer) return null;

    // Fetch unified chronological events: sales and payments
    const sql = `
      SELECT 
        'SALE' AS entry_type,
        s.id AS reference_id,
        s.invoice_number AS reference_number,
        s.sale_date AS entry_date,
        s.total_amount::NUMERIC(12, 2) AS debit,
        0.00::NUMERIC(12, 2) AS credit,
        CONCAT('Invoice #', s.invoice_number) AS description
      FROM sales s
      WHERE s.customer_id = $1

      UNION ALL

      SELECT 
        'PAYMENT' AS entry_type,
        p.id AS reference_id,
        p.receipt_number AS reference_number,
        p.payment_date AS entry_date,
        0.00::NUMERIC(12, 2) AS debit,
        p.amount::NUMERIC(12, 2) AS credit,
        CONCAT('Receipt #', p.receipt_number, CASE WHEN p.payment_method IS NOT NULL THEN CONCAT(' (', p.payment_method, ')') ELSE '' END) AS description
      FROM payments p
      WHERE p.customer_id = $1

      ORDER BY entry_date ASC, reference_number ASC;
    `;

    const entries = await this.findMany(sql, [customerId]);

    // Calculate running balance starting from opening balance
    let runningBalance = customer.openingBalance;
    const ledgerEntries = [
      {
        entryType: 'OPENING_BALANCE',
        referenceNumber: 'INITIAL-KHATA',
        entryDate: customer.createdAt,
        debit: customer.openingBalance,
        credit: 0.0,
        runningBalance: Number(runningBalance.toFixed(2)),
        description: 'Historical Opening Khata Balance',
      },
    ];

    for (const entry of entries) {
      const debit = Number(entry.debit);
      const credit = Number(entry.credit);
      runningBalance = runningBalance + debit - credit;

      ledgerEntries.push({
        entryType: entry.entry_type,
        referenceId: entry.reference_id,
        referenceNumber: entry.reference_number,
        entryDate: entry.entry_date,
        debit,
        credit,
        runningBalance: Number(Math.max(0, runningBalance).toFixed(2)),
        description: entry.description,
      });
    }

    return {
      customer,
      openingBalance: customer.openingBalance,
      totalPurchases: customer.totalPurchases,
      totalPaid: customer.totalPaid,
      outstandingDues: customer.outstandingDues,
      availableCredit: customer.availableCredit,
      entries: ledgerEntries,
    };
  }
}

module.exports = new CustomerRepository();
