const BaseRepository = require('./base.repository');
const inventoryRepository = require('./inventory.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/appError');

/**
 * Purchase Repository
 * Data-access layer for distributor stock inward orders, line items, and accounts payable.
 * Manages atomic inventory stock inward updates and supplier payments.
 */
class PurchaseRepository extends BaseRepository {
  /**
   * Format purchase database row with dual camelCase & snake_case support
   * @param {object} row
   * @param {Array<object>} items
   * @param {Array<object>} payments
   * @returns {object|null}
   */
  formatPurchase(row, items = [], payments = []) {
    if (!row) return null;
    return {
      id: row.id,
      purchaseInvoiceNo: row.purchase_invoice_no,
      purchase_invoice_no: row.purchase_invoice_no,
      invoiceNumber: row.purchase_invoice_no,
      supplierId: row.supplier_id,
      supplier_id: row.supplier_id,
      supplierName: row.supplier_name,
      supplier_name: row.supplier_name,
      supplierPhone: row.supplier_phone,
      supplier_phone: row.supplier_phone,
      supplierGstin: row.supplier_gstin,
      supplier_gstin: row.supplier_gstin,
      totalAmount: Number(row.total_amount || 0),
      total_amount: Number(row.total_amount || 0),
      paidAmount: Number(row.paid_amount || 0),
      paid_amount: Number(row.paid_amount || 0),
      dueAmount: Number(row.due_amount || 0),
      due_amount: Number(row.due_amount || 0),
      lifecycleStatus: row.lifecycle_status,
      lifecycle_status: row.lifecycle_status,
      paymentStatus: row.payment_status,
      payment_status: row.payment_status,
      notes: row.notes,
      purchaseDate: row.purchase_date,
      purchase_date: row.purchase_date,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
      itemCount: row.item_count !== undefined ? Number(row.item_count) : items.length,
      item_count: row.item_count !== undefined ? Number(row.item_count) : items.length,
      items: items.map((i) => this.formatPurchaseItem(i)),
      payments: payments.map((p) => this.formatSupplierPayment(p)),
    };
  }

  /**
   * Format line item row
   * @param {object} row
   * @returns {object|null}
   */
  formatPurchaseItem(row) {
    if (!row) return null;
    return {
      id: row.id,
      purchaseId: row.purchase_id,
      purchase_id: row.purchase_id,
      productId: row.product_id,
      product_id: row.product_id,
      productCode: row.product_code || null,
      product_code: row.product_code || null,
      productName: row.product_name,
      product_name: row.product_name,
      quantity: Number(row.quantity || 0),
      unitCost: Number(row.unit_cost || 0),
      unit_cost: Number(row.unit_cost || 0),
      costPrice: Number(row.unit_cost || 0),
      subtotal: Number(row.subtotal || 0),
      unit: row.unit,
    };
  }

  /**
   * Format supplier payment disbursement row
   * @param {object} row
   * @returns {object|null}
   */
  formatSupplierPayment(row) {
    if (!row) return null;
    return {
      id: row.id,
      paymentNumber: row.payment_number,
      payment_number: row.payment_number,
      supplierId: row.supplier_id,
      supplier_id: row.supplier_id,
      purchaseId: row.purchase_id,
      purchase_id: row.purchase_id,
      amount: Number(row.amount || 0),
      paymentMethod: row.payment_method,
      payment_method: row.payment_method,
      referenceNo: row.reference_no,
      reference_no: row.reference_no,
      notes: row.notes,
      paymentDate: row.payment_date,
      payment_date: row.payment_date,
      createdAt: row.created_at,
      created_at: row.created_at,
    };
  }

  /**
   * Generate next sequential purchase invoice number (e.g. PUR-2026-0001)
   * @returns {Promise<string>}
   */
  async generateNextInvoiceNo() {
    const year = new Date().getFullYear();
    const prefix = `PUR-${year}-`;
    const sql = `
      SELECT purchase_invoice_no
      FROM purchases
      WHERE purchase_invoice_no LIKE $1
      ORDER BY purchase_invoice_no DESC
      LIMIT 1;
    `;
    const res = await this.findOne(sql, [`${prefix}%`]);
    if (!res || !res.purchase_invoice_no) {
      return `${prefix}0001`;
    }

    const match = res.purchase_invoice_no.match(/(\d+)$/);
    if (!match) {
      return `${prefix}0001`;
    }

    const nextSeq = parseInt(match[1], 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Generate next sequential supplier payment voucher number (e.g. SPAY-2026-0001)
   * @returns {Promise<string>}
   */
  async generateNextPaymentNumber() {
    const year = new Date().getFullYear();
    const prefix = `SPAY-${year}-`;
    const sql = `
      SELECT payment_number
      FROM supplier_payments
      WHERE payment_number LIKE $1
      ORDER BY payment_number DESC
      LIMIT 1;
    `;
    const res = await this.findOne(sql, [`${prefix}%`]);
    if (!res || !res.payment_number) {
      return `${prefix}0001`;
    }

    const match = res.payment_number.match(/(\d+)$/);
    if (!match) {
      return `${prefix}0001`;
    }

    const nextSeq = parseInt(match[1], 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Find purchase by exact purchase_invoice_no
   * @param {string} invoiceNo
   * @returns {Promise<object|null>}
   */
  async findByInvoiceNo(invoiceNo) {
    if (!invoiceNo || !invoiceNo.trim()) return null;
    const sql = `
      SELECT p.*, s.name AS supplier_name, s.phone AS supplier_phone, s.gstin AS supplier_gstin
      FROM purchases p
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE LOWER(p.purchase_invoice_no) = LOWER($1);
    `;
    return this.findOne(sql, [invoiceNo.trim()]);
  }

  /**
   * Find single purchase by UUID or purchase_invoice_no with all line items and payment disbursements
   * @param {string} idOrInvoiceNo
   * @returns {Promise<object|null>}
   */
  async findById(idOrInvoiceNo) {
    if (!idOrInvoiceNo) return null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrInvoiceNo);

    const purchaseSql = `
      SELECT 
        p.id,
        p.purchase_invoice_no,
        p.supplier_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.gstin AS supplier_gstin,
        p.total_amount,
        p.paid_amount,
        p.due_amount,
        p.lifecycle_status,
        p.payment_status,
        p.notes,
        p.purchase_date,
        p.created_at,
        p.updated_at
      FROM purchases p
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE ${isUUID ? 'p.id = $1' : 'LOWER(p.purchase_invoice_no) = LOWER($1)'};
    `;

    const purchaseRow = await this.findOne(purchaseSql, [idOrInvoiceNo.trim()]);
    if (!purchaseRow) return null;

    // Fetch line items with SKU codes
    const itemsSql = `
      SELECT 
        pi.id,
        pi.purchase_id,
        pi.product_id,
        pr.code AS product_code,
        pi.product_name,
        pi.quantity,
        pi.unit_cost,
        pi.subtotal,
        pi.unit
      FROM purchase_items pi
      LEFT JOIN products pr ON pr.id = pi.product_id
      WHERE pi.purchase_id = $1
      ORDER BY pi.id ASC;
    `;

    // Fetch supplier payments allocated to this purchase
    const paymentsSql = `
      SELECT 
        id,
        payment_number,
        supplier_id,
        purchase_id,
        amount,
        payment_method,
        reference_no,
        notes,
        payment_date,
        created_at
      FROM supplier_payments
      WHERE purchase_id = $1
      ORDER BY payment_date ASC, id ASC;
    `;

    const [items, payments] = await Promise.all([
      this.findMany(itemsSql, [purchaseRow.id]),
      this.findMany(paymentsSql, [purchaseRow.id]),
    ]);

    return this.formatPurchase(purchaseRow, items, payments);
  }

  /**
   * Build WHERE clauses for purchase list filtering
   * @private
   */
  _buildFilterQuery({ supplierId, lifecycleStatus, paymentStatus, startDate, endDate, search }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (supplierId && supplierId !== 'All') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierId);
      if (isUUID) {
        conditions.push(`p.supplier_id = $${idx++}`);
        params.push(supplierId.trim());
      } else {
        conditions.push(`(LOWER(s.name) = LOWER($${idx}) OR LOWER(s.name) LIKE LOWER($${idx + 1}))`);
        params.push(supplierId.trim());
        params.push(`%${supplierId.trim()}%`);
        idx += 2;
      }
    }

    if (lifecycleStatus && lifecycleStatus !== 'All') {
      conditions.push(`p.lifecycle_status = $${idx++}`);
      params.push(lifecycleStatus.toUpperCase());
    }

    if (paymentStatus && paymentStatus !== 'All') {
      conditions.push(`p.payment_status = $${idx++}`);
      params.push(paymentStatus.toUpperCase());
    }

    if (startDate) {
      conditions.push(`p.purchase_date >= $${idx++}`);
      params.push(new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(`p.purchase_date <= $${idx++}`);
      params.push(end.toISOString());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(p.purchase_invoice_no) LIKE $${idx} OR
        LOWER(s.name) LIKE $${idx} OR
        LOWER(COALESCE(s.phone, '')) LIKE $${idx} OR
        LOWER(COALESCE(p.notes, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, nextIdx: idx };
  }

  /**
   * Find paginated purchases with search, status filters, and sorting
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async findAll({
    supplierId = null,
    lifecycleStatus = null,
    paymentStatus = null,
    startDate = null,
    endDate = null,
    search = '',
    page = 1,
    limit = 50,
    sortBy = 'purchase_date',
    sortOrder = 'DESC',
  } = {}) {
    const { whereClause, params, nextIdx } = this._buildFilterQuery({
      supplierId,
      lifecycleStatus,
      paymentStatus,
      startDate,
      endDate,
      search,
    });

    const allowedSort = {
      purchase_date: 'p.purchase_date',
      date: 'p.purchase_date',
      purchase_invoice_no: 'p.purchase_invoice_no',
      invoice_no: 'p.purchase_invoice_no',
      total_amount: 'p.total_amount',
      due_amount: 'p.due_amount',
      paid_amount: 'p.paid_amount',
      created_at: 'p.created_at',
      supplier_name: 's.name',
    };

    const orderCol = allowedSort[sortBy.toLowerCase()] || 'p.purchase_date';
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
        p.purchase_invoice_no,
        p.supplier_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.gstin AS supplier_gstin,
        p.total_amount,
        p.paid_amount,
        p.due_amount,
        p.lifecycle_status,
        p.payment_status,
        p.notes,
        p.purchase_date,
        p.created_at,
        p.updated_at,
        COALESCE(COUNT(pi.id), 0)::INTEGER AS item_count
      FROM purchases p
      JOIN suppliers s ON s.id = p.supplier_id
      LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
      ${whereClause}
      GROUP BY p.id, p.purchase_invoice_no, p.supplier_id, s.name, s.phone, s.gstin, p.total_amount, p.paid_amount, p.due_amount, p.lifecycle_status, p.payment_status, p.notes, p.purchase_date, p.created_at, p.updated_at
      ORDER BY ${orderCol} ${orderDir}, p.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const rows = await this.findMany(sql, params);
    return rows.map((r) => this.formatPurchase(r));
  }

  /**
   * Count total purchases matching filters
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countAll({
    supplierId = null,
    lifecycleStatus = null,
    paymentStatus = null,
    startDate = null,
    endDate = null,
    search = '',
  } = {}) {
    const { whereClause, params } = this._buildFilterQuery({
      supplierId,
      lifecycleStatus,
      paymentStatus,
      startDate,
      endDate,
      search,
    });

    const sql = `
      SELECT COUNT(*)::INTEGER AS count
      FROM purchases p
      JOIN suppliers s ON s.id = p.supplier_id
      ${whereClause};
    `;

    const res = await this.findOne(sql, params);
    return res ? res.count : 0;
  }

  /**
   * Aggregate accounts payable and purchase summary metrics
   * @returns {Promise<object>}
   */
  async getSummary() {
    const sql = `
      SELECT 
        COUNT(*)::INTEGER AS total_purchases_count,
        COALESCE(SUM(total_amount), 0.00)::NUMERIC(12, 2) AS total_purchases_amount,
        COALESCE(SUM(paid_amount), 0.00)::NUMERIC(12, 2) AS total_paid_amount,
        COALESCE(SUM(due_amount), 0.00)::NUMERIC(12, 2) AS total_due_amount,
        COUNT(*) FILTER (WHERE payment_status = 'UNPAID')::INTEGER AS unpaid_bills_count,
        COUNT(*) FILTER (WHERE payment_status = 'PARTIAL')::INTEGER AS partial_bills_count,
        COUNT(*) FILTER (WHERE payment_status = 'PAID')::INTEGER AS paid_bills_count,
        COUNT(*) FILTER (WHERE lifecycle_status = 'RECEIVED')::INTEGER AS received_orders_count
      FROM purchases;
    `;
    const res = await this.findOne(sql);
    return {
      totalPurchasesCount: Number(res?.total_purchases_count || 0),
      totalPurchasesAmount: Number(res?.total_purchases_amount || 0),
      totalPaidAmount: Number(res?.total_paid_amount || 0),
      totalDueAmount: Number(res?.total_due_amount || 0),
      unpaidBillsCount: Number(res?.unpaid_bills_count || 0),
      partialBillsCount: Number(res?.partial_bills_count || 0),
      paidBillsCount: Number(res?.paid_bills_count || 0),
      receivedOrdersCount: Number(res?.received_orders_count || 0),
    };
  }

  /**
   * Create a purchase order, line items, stock updates, and movement records atomically
   * All mutations occur within a single database transaction. If any item validation fails,
   * all operations roll back together, leaving zero orphaned records.
   * 
   * @param {object} purchaseData - Header data
   * @param {Array<object>} items - Line items
   * @param {object|null} userContext - Current authenticated user
   * @returns {Promise<object>}
   */
  async createPurchaseWithItems(purchaseData, items, userContext = null) {
    return this.withTransaction(async (clientQuery) => {
      // 1. Verify supplier existence and active state
      const supplierSql = `
        SELECT id, name, phone, gstin, is_active
        FROM suppliers
        WHERE id = $1;
      `;
      const supplierRes = await clientQuery(supplierSql, [purchaseData.supplierId]);
      if (supplierRes.rows.length === 0) {
        throw new NotFoundError(`Supplier with ID '${purchaseData.supplierId}' not found`);
      }
      const supplier = supplierRes.rows[0];
      if (!supplier.is_active) {
        throw new BadRequestError(`Cannot create purchase for inactive/archived supplier '${supplier.name}'`);
      }

      // 2. Prevent duplicate invoice number submission
      const existingInvoice = await clientQuery(
        'SELECT id, purchase_invoice_no FROM purchases WHERE LOWER(purchase_invoice_no) = LOWER($1);',
        [purchaseData.purchaseInvoiceNo.trim()]
      );
      if (existingInvoice.rows.length > 0) {
        throw new ConflictError(
          `Purchase invoice number '${purchaseData.purchaseInvoiceNo}' already exists in the system`
        );
      }

      // 3. Insert purchase header
      const insertPurchaseSql = `
        INSERT INTO purchases (
          purchase_invoice_no,
          supplier_id,
          total_amount,
          paid_amount,
          due_amount,
          lifecycle_status,
          payment_status,
          notes,
          purchase_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;

      const purchaseParams = [
        purchaseData.purchaseInvoiceNo.trim(),
        supplier.id,
        purchaseData.totalAmount,
        purchaseData.paidAmount,
        purchaseData.dueAmount,
        purchaseData.lifecycleStatus || 'RECEIVED',
        purchaseData.paymentStatus || (purchaseData.dueAmount <= 0 ? 'PAID' : (purchaseData.paidAmount > 0 ? 'PARTIAL' : 'UNPAID')),
        purchaseData.notes || null,
        purchaseData.purchaseDate ? new Date(purchaseData.purchaseDate).toISOString() : new Date().toISOString(),
      ];

      const purchaseRes = await clientQuery(insertPurchaseSql, purchaseParams);
      const createdPurchase = purchaseRes.rows[0];
      createdPurchase.supplier_name = supplier.name;
      createdPurchase.supplier_phone = supplier.phone;
      createdPurchase.supplier_gstin = supplier.gstin;

      // 4. Process line items & update inventory atomically
      const createdItems = [];
      const isReceived = createdPurchase.lifecycle_status === 'RECEIVED';

      for (const item of items) {
        // Lock the product row exclusively to update stock
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId);
        const lockProductSql = `
          SELECT 
            id, code, name, unit, cost_price, price, stock, min_threshold, is_active
          FROM products
          WHERE (${isUUID ? 'id = $1' : 'LOWER(code) = LOWER($1)'})
          FOR UPDATE;
        `;
        const productRes = await clientQuery(lockProductSql, [item.productId]);
        if (productRes.rows.length === 0) {
          throw new NotFoundError(`Product '${item.productId}' not found`);
        }
        const product = productRes.rows[0];
        if (!product.is_active) {
          throw new BadRequestError(`Cannot purchase archived/inactive product '${product.name}' (${product.code})`);
        }

        const qty = Number(item.quantity);
        const unitCost = Number(item.unitCost);
        const subtotal = Number((qty * unitCost).toFixed(2));
        const itemUnit = item.unit || product.unit;

        // Insert purchase line item
        const insertItemSql = `
          INSERT INTO purchase_items (
            purchase_id,
            product_id,
            product_name,
            quantity,
            unit_cost,
            subtotal,
            unit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `;
        const itemRes = await clientQuery(insertItemSql, [
          createdPurchase.id,
          product.id,
          product.name,
          qty,
          unitCost,
          subtotal,
          itemUnit,
        ]);
        const itemRow = itemRes.rows[0];
        itemRow.product_code = product.code;
        createdItems.push(itemRow);

        // 5. If order is received, increment stock & record movement ledger
        if (isReceived) {
          const prevStock = Number(product.stock);
          const newStock = Number((prevStock + qty).toFixed(3));

          // Update product stock and optionally update procurement cost price
          const updateProductSql = `
            UPDATE products
            SET stock = $1,
                cost_price = CASE WHEN $2::NUMERIC > 0 THEN $2::NUMERIC ELSE cost_price END,
                price = CASE WHEN $2::NUMERIC > 0 AND price < $2::NUMERIC THEN ROUND($2::NUMERIC * 1.10, 2) ELSE price END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *;
          `;
          await clientQuery(updateProductSql, [newStock, unitCost, product.id]);

          // User attribution
          let auditReason = `Purchase Inward - Invoice #${createdPurchase.purchase_invoice_no} from ${supplier.name}`;
          if (userContext && (userContext.fullName || userContext.email)) {
            const attribution = userContext.fullName || userContext.email;
            auditReason = `${auditReason} [Auth: ${attribution}]`;
          }

          // Record movement via shared inventory audit method
          await inventoryRepository.recordMovement(clientQuery, {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            movementType: 'PURCHASE',
            actionType: 'ADDED',
            changeQty: qty,
            previousStock: prevStock,
            newStock,
            unit: itemUnit,
            reason: auditReason,
            referenceNo: createdPurchase.purchase_invoice_no,
          });
        }
      }

      // 6. If initial payment was disbursed on purchase creation, record supplier_payments
      const createdPayments = [];
      if (Number(createdPurchase.paid_amount) > 0) {
        const paymentNumber = await this.generateNextPaymentNumber();
        const insertPaymentSql = `
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
        const paymentRes = await clientQuery(insertPaymentSql, [
          paymentNumber,
          supplier.id,
          createdPurchase.id,
          Number(createdPurchase.paid_amount),
          purchaseData.paymentMethod || 'BANK_TRANSFER',
          createdPurchase.purchase_invoice_no,
          `Initial disbursement for Invoice #${createdPurchase.purchase_invoice_no}`,
          createdPurchase.purchase_date,
        ]);
        createdPayments.push(paymentRes.rows[0]);
      }

      return this.formatPurchase(createdPurchase, createdItems, createdPayments);
    });
  }

  /**
   * Record subsequent supplier payment disbursement toward a purchase invoice
   * Atomically decreases due_amount, increases paid_amount, and updates payment_status.
   * 
   * @param {string} purchaseId
   * @param {object} paymentData
   * @param {object|null} userContext
   * @returns {Promise<{ purchase: object, payment: object }>}
   */
  async recordSupplierPayment(purchaseId, paymentData, userContext = null) {
    return this.withTransaction(async (clientQuery) => {
      // 1. Lock purchase row exclusively
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseId);
      const lockPurchaseSql = `
        SELECT 
          p.id, p.purchase_invoice_no, p.supplier_id, s.name AS supplier_name,
          p.total_amount, p.paid_amount, p.due_amount, p.lifecycle_status, p.payment_status
        FROM purchases p
        JOIN suppliers s ON s.id = p.supplier_id
        WHERE (${isUUID ? 'p.id = $1' : 'LOWER(p.purchase_invoice_no) = LOWER($1)'})
        FOR UPDATE;
      `;

      const purchaseRes = await clientQuery(lockPurchaseSql, [purchaseId]);
      if (purchaseRes.rows.length === 0) {
        throw new NotFoundError(`Purchase order '${purchaseId}' not found`);
      }

      const purchase = purchaseRes.rows[0];
      const paymentAmount = Number(paymentData.amount);

      if (paymentAmount <= 0) {
        throw new BadRequestError('Payment amount must be a positive number greater than 0');
      }

      const currentDue = Number(purchase.due_amount);
      if (currentDue <= 0) {
        throw new BadRequestError(`Purchase invoice #${purchase.purchase_invoice_no} is already fully PAID`);
      }

      if (paymentAmount > currentDue) {
        throw new BadRequestError(
          `Payment amount ₹${paymentAmount} exceeds the remaining due amount ₹${currentDue} on invoice #${purchase.purchase_invoice_no}`
        );
      }

      const newPaid = Number((Number(purchase.paid_amount) + paymentAmount).toFixed(2));
      const newDue = Number((currentDue - paymentAmount).toFixed(2));
      const newPaymentStatus = newDue <= 0.00 ? 'PAID' : 'PARTIAL';

      // 2. Generate payment voucher number
      const paymentNumber = await this.generateNextPaymentNumber();

      // 3. Insert supplier_payments record
      const insertPaymentSql = `
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

      const paymentRes = await clientQuery(insertPaymentSql, [
        paymentNumber,
        purchase.supplier_id,
        purchase.id,
        paymentAmount,
        paymentData.paymentMethod || 'BANK_TRANSFER',
        paymentData.referenceNo || purchase.purchase_invoice_no,
        paymentData.notes || `Disbursement toward invoice #${purchase.purchase_invoice_no}`,
        paymentData.paymentDate ? new Date(paymentData.paymentDate).toISOString() : new Date().toISOString(),
      ]);

      // 4. Update purchases table
      const updatePurchaseSql = `
        UPDATE purchases
        SET paid_amount = $1,
            due_amount = $2,
            payment_status = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *;
      `;

      const updateRes = await clientQuery(updatePurchaseSql, [
        newPaid,
        newDue,
        newPaymentStatus,
        purchase.id,
      ]);

      const updatedRow = updateRes.rows[0];
      updatedRow.supplier_name = purchase.supplier_name;

      return {
        purchase: this.formatPurchase(updatedRow),
        payment: this.formatSupplierPayment(paymentRes.rows[0]),
      };
    });
  }

  /**
   * Get all payments made toward a purchase
   * @param {string} purchaseId
   * @returns {Promise<Array<object>>}
   */
  async getPaymentsByPurchaseId(purchaseId) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseId);
    const sql = `
      SELECT 
        sp.id,
        sp.payment_number,
        sp.supplier_id,
        s.name AS supplier_name,
        sp.purchase_id,
        sp.amount,
        sp.payment_method,
        sp.reference_no,
        sp.notes,
        sp.payment_date,
        sp.created_at
      FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      LEFT JOIN purchases p ON p.id = sp.purchase_id
      WHERE (${isUUID ? 'sp.purchase_id = $1' : 'LOWER(p.purchase_invoice_no) = LOWER($1)'})
      ORDER BY sp.payment_date DESC, sp.id DESC;
    `;
    const rows = await this.findMany(sql, [purchaseId]);
    return rows.map((r) => this.formatSupplierPayment(r));
  }
}

module.exports = new PurchaseRepository();
