const BaseRepository = require('./base.repository');

/**
 * Report Repository
 * Executes high-performance SQL aggregations and reporting queries using PostgreSQL CTEs,
 * database views (v_customer_balances, v_inventory_valuation, v_invoice_balances),
 * and parameterized date boundaries. Zero Cartesian product joins.
 */
class ReportRepository extends BaseRepository {
  /**
   * 1. Dashboard Executive Summary
   * Single-roundtrip aggregated metrics across Sales, Purchases, Khata Receivables, Supplier Payables, Stock, and Cash Collections.
   * @param {object} options
   * @param {string|null} options.startDate
   * @param {string|null} options.endDate
   * @param {number} [options.limitRecent=5]
   * @returns {Promise<object>}
   */
  async getDashboardSummary(options = {}) {
    const { startDate, endDate, limitRecent = 5 } = options;

    const salesParams = [];
    const salesConditions = [];
    let sIdx = 1;
    if (startDate) {
      salesConditions.push(`s.sale_date >= $${sIdx++}`);
      salesParams.push(startDate);
    }
    if (endDate) {
      salesConditions.push(`s.sale_date <= $${sIdx++}`);
      salesParams.push(endDate);
    }
    const salesWhere = salesConditions.length > 0 ? `WHERE ${salesConditions.join(' AND ')}` : '';

    const purchaseParams = [];
    const purchaseConditions = ["p.lifecycle_status != 'CANCELLED'"];
    let pIdx = 1;
    if (startDate) {
      purchaseConditions.push(`p.purchase_date >= $${pIdx++}`);
      purchaseParams.push(startDate);
    }
    if (endDate) {
      purchaseConditions.push(`p.purchase_date <= $${pIdx++}`);
      purchaseParams.push(endDate);
    }
    const purchaseWhere = `WHERE ${purchaseConditions.join(' AND ')}`;

    const payParams = [];
    const payConditions = [];
    let payIdx = 1;
    if (startDate) {
      payConditions.push(`pay.payment_date >= $${payIdx++}`);
      payParams.push(startDate);
    }
    if (endDate) {
      payConditions.push(`pay.payment_date <= $${payIdx++}`);
      payParams.push(endDate);
    }
    const payWhere = payConditions.length > 0 ? `WHERE ${payConditions.join(' AND ')}` : '';

    const [
      salesSummaryRes,
      purchasesSummaryRes,
      customerReceivablesRes,
      supplierPayablesRes,
      inventorySummaryRes,
      stockValuationRes,
      paymentsSummaryRes,
      recentSalesRes,
      recentPurchasesRes,
      recentPaymentsRes,
    ] = await Promise.all([
      // Sales totals (no duplicate joins)
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_sales_count,
          COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(14, 2) AS total_sales_turnover,
          COALESCE(SUM(s.subtotal), 0.00)::NUMERIC(14, 2) AS total_sales_subtotal,
          COALESCE(SUM(s.gst_amount), 0.00)::NUMERIC(14, 2) AS total_sales_tax,
          COALESCE(ROUND(AVG(s.total_amount), 2), 0.00)::NUMERIC(12, 2) AS average_bill_value
        FROM sales s
        ${salesWhere};`,
        salesParams
      ),

      // Purchases totals (no duplicate joins)
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_purchases_count,
          COALESCE(SUM(p.total_amount), 0.00)::NUMERIC(14, 2) AS total_purchases_amount,
          COALESCE(SUM(p.paid_amount), 0.00)::NUMERIC(14, 2) AS total_purchases_paid,
          COALESCE(SUM(p.due_amount), 0.00)::NUMERIC(14, 2) AS total_purchases_due,
          COALESCE(ROUND(AVG(p.total_amount), 2), 0.00)::NUMERIC(12, 2) AS average_purchase_value
        FROM purchases p
        ${purchaseWhere};`,
        purchaseParams
      ),

      // Customer Receivables (from single source of truth view)
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_customers_count,
          COUNT(*) FILTER (WHERE outstanding_dues > 0.00)::INTEGER AS customers_with_dues_count,
          COALESCE(SUM(total_purchases), 0.00)::NUMERIC(14, 2) AS total_customer_debt,
          COALESCE(SUM(total_paid), 0.00)::NUMERIC(14, 2) AS total_customer_paid,
          COALESCE(SUM(outstanding_dues), 0.00)::NUMERIC(14, 2) AS total_customer_receivables,
          COALESCE(SUM(available_credit), 0.00)::NUMERIC(14, 2) AS total_available_credit
        FROM v_customer_balances;`
      ),

      // Supplier Payables
      this.findOne(
        `SELECT 
          COUNT(DISTINCT supplier_id) FILTER (WHERE due_amount > 0.00)::INTEGER AS suppliers_with_payables_count,
          COALESCE(SUM(due_amount), 0.00)::NUMERIC(14, 2) AS total_supplier_payables
        FROM purchases
        WHERE lifecycle_status != 'CANCELLED';`
      ),

      // Stock Counts & Alert Thresholds
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_active_products,
          COALESCE(SUM(stock), 0.000)::NUMERIC(12, 3) AS total_stock_units,
          COUNT(*) FILTER (WHERE stock <= 0.000)::INTEGER AS out_of_stock_count,
          COUNT(*) FILTER (WHERE stock > 0.000 AND stock <= min_threshold)::INTEGER AS low_stock_count,
          COUNT(*) FILTER (WHERE stock > min_threshold)::INTEGER AS in_stock_count
        FROM products
        WHERE is_active = TRUE;`
      ),

      // Stock Valuations (from single source of truth view)
      this.findOne(
        `SELECT 
          COALESCE(SUM(total_cost_valuation), 0.00)::NUMERIC(14, 2) AS total_cost_valuation,
          COALESCE(SUM(total_retail_valuation), 0.00)::NUMERIC(14, 2) AS total_retail_valuation,
          COALESCE(SUM(potential_profit), 0.00)::NUMERIC(14, 2) AS potential_inventory_profit,
          ROUND(
            COALESCE(
              (SUM(potential_profit) / NULLIF(SUM(total_retail_valuation), 0.00)) * 100.0,
              0.00
            ),
            2
          )::NUMERIC(5, 2) AS overall_profit_margin_percent
        FROM v_inventory_valuation;`
      ),

      // Collections in period
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_collections_count,
          COALESCE(SUM(pay.amount), 0.00)::NUMERIC(14, 2) AS total_amount_collected,
          COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_method = 'CASH'), 0.00)::NUMERIC(14, 2) AS cash_collected,
          COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_method = 'UPI'), 0.00)::NUMERIC(14, 2) AS upi_collected,
          COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_method = 'BANK_TRANSFER'), 0.00)::NUMERIC(14, 2) AS bank_collected,
          COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_method = 'CHEQUE'), 0.00)::NUMERIC(14, 2) AS cheque_collected
        FROM payments pay
        ${payWhere};`,
        payParams
      ),

      // Recent Sales
      this.findMany(
        `SELECT 
          s.id, s.invoice_number, s.customer_name, s.customer_phone,
          s.total_amount, s.paid_amount, s.due_amount, s.payment_status, s.sale_date
        FROM sales s
        ORDER BY s.sale_date DESC, s.created_at DESC
        LIMIT $1;`,
        [limitRecent]
      ),

      // Recent Purchases
      this.findMany(
        `SELECT 
          p.id, p.purchase_invoice_no, s.name AS supplier_name,
          p.total_amount, p.paid_amount, p.due_amount, p.lifecycle_status, p.payment_status, p.purchase_date
        FROM purchases p
        JOIN suppliers s ON s.id = p.supplier_id
        ORDER BY p.purchase_date DESC, p.created_at DESC
        LIMIT $1;`,
        [limitRecent]
      ),

      // Recent Collections
      this.findMany(
        `SELECT 
          pay.id, pay.receipt_number, c.name AS customer_name,
          pay.amount, pay.payment_method, pay.reference_no, pay.payment_date, pay.sale_id
        FROM payments pay
        JOIN customers c ON c.id = pay.customer_id
        ORDER BY pay.payment_date DESC, pay.created_at DESC
        LIMIT $1;`,
        [limitRecent]
      ),
    ]);

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      sales: {
        count: Number(salesSummaryRes?.total_sales_count || 0),
        turnover: Number(salesSummaryRes?.total_sales_turnover || 0),
        subtotal: Number(salesSummaryRes?.total_sales_subtotal || 0),
        taxCollected: Number(salesSummaryRes?.total_sales_tax || 0),
        averageBillValue: Number(salesSummaryRes?.average_bill_value || 0),
      },
      purchases: {
        count: Number(purchasesSummaryRes?.total_purchases_count || 0),
        totalAmount: Number(purchasesSummaryRes?.total_purchases_amount || 0),
        paidAmount: Number(purchasesSummaryRes?.total_purchases_paid || 0),
        dueAmount: Number(purchasesSummaryRes?.total_purchases_due || 0),
        averageOrderValue: Number(purchasesSummaryRes?.average_purchase_value || 0),
      },
      accountsReceivable: {
        totalCustomers: Number(customerReceivablesRes?.total_customers_count || 0),
        customersWithDues: Number(customerReceivablesRes?.customers_with_dues_count || 0),
        totalInvoicedDebt: Number(customerReceivablesRes?.total_customer_debt || 0),
        totalPaid: Number(customerReceivablesRes?.total_customer_paid || 0),
        outstandingReceivables: Number(customerReceivablesRes?.total_customer_receivables || 0),
        availableCredit: Number(customerReceivablesRes?.total_available_credit || 0),
      },
      accountsPayable: {
        suppliersWithPayables: Number(supplierPayablesRes?.suppliers_with_payables_count || 0),
        outstandingPayables: Number(supplierPayablesRes?.total_supplier_payables || 0),
      },
      inventory: {
        activeProducts: Number(inventorySummaryRes?.total_active_products || 0),
        stockUnits: Number(inventorySummaryRes?.total_stock_units || 0),
        inStock: Number(inventorySummaryRes?.in_stock_count || 0),
        lowStock: Number(inventorySummaryRes?.low_stock_count || 0),
        outOfStock: Number(inventorySummaryRes?.out_of_stock_count || 0),
        costValuation: Number(stockValuationRes?.total_cost_valuation || 0),
        retailValuation: Number(stockValuationRes?.total_retail_valuation || 0),
        potentialProfit: Number(stockValuationRes?.potential_inventory_profit || 0),
        marginPercent: Number(stockValuationRes?.overall_profit_margin_percent || 0),
      },
      collections: {
        count: Number(paymentsSummaryRes?.total_collections_count || 0),
        totalAmount: Number(paymentsSummaryRes?.total_amount_collected || 0),
        cash: Number(paymentsSummaryRes?.cash_collected || 0),
        upi: Number(paymentsSummaryRes?.upi_collected || 0),
        bank: Number(paymentsSummaryRes?.bank_collected || 0),
        cheque: Number(paymentsSummaryRes?.cheque_collected || 0),
      },
      recentActivity: {
        sales: (recentSalesRes || []).map((r) => ({
          id: r.id,
          invoiceNumber: r.invoice_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          totalAmount: Number(r.total_amount),
          paidAmount: Number(r.paid_amount),
          dueAmount: Number(r.due_amount),
          paymentStatus: r.payment_status,
          saleDate: r.sale_date,
        })),
        purchases: (recentPurchasesRes || []).map((r) => ({
          id: r.id,
          purchaseInvoiceNo: r.purchase_invoice_no,
          supplierName: r.supplier_name,
          totalAmount: Number(r.total_amount),
          paidAmount: Number(r.paid_amount),
          dueAmount: Number(r.due_amount),
          lifecycleStatus: r.lifecycle_status,
          paymentStatus: r.payment_status,
          purchaseDate: r.purchase_date,
        })),
        payments: (recentPaymentsRes || []).map((r) => ({
          id: r.id,
          receiptNumber: r.receipt_number,
          customerName: r.customer_name,
          amount: Number(r.amount),
          paymentMethod: r.payment_method,
          referenceNo: r.reference_no,
          paymentDate: r.payment_date,
          isOnAccount: r.sale_id === null,
        })),
      },
    };
  }

  /**
   * 2. Sales Totals & Period Breakdown Report
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getSalesReport(options = {}) {
    const { startDate, endDate, customerId, paymentMethod, paymentStatus, page = 1, limit = 50 } = options;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (startDate) {
      conditions.push(`s.sale_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`s.sale_date <= $${idx++}`);
      params.push(endDate);
    }
    if (customerId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      if (isUUID) {
        conditions.push(`s.customer_id = $${idx++}`);
        params.push(customerId.trim());
      } else {
        conditions.push(`(LOWER(s.customer_name) LIKE LOWER($${idx}) OR LOWER(s.customer_phone) LIKE LOWER($${idx}))`);
        params.push(`%${customerId.trim()}%`);
        idx++;
      }
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      conditions.push(`s.payment_status = $${idx++}`);
      params.push(paymentStatus.toUpperCase());
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      conditions.push(`s.payment_method = $${idx++}`);
      params.push(paymentMethod.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Aggregates, status breakdown, and paginated records executed in parallel
    const [summaryRes, statusBreakdownRes, methodBreakdownRes, dailySeriesRes, invoicesRes, countRes] = await Promise.all([
      // Summary
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_invoices,
          COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(14, 2) AS gross_sales,
          COALESCE(SUM(s.subtotal), 0.00)::NUMERIC(14, 2) AS taxable_amount,
          COALESCE(SUM(s.gst_amount), 0.00)::NUMERIC(14, 2) AS total_tax_collected,
          COALESCE(SUM(s.paid_amount), 0.00)::NUMERIC(14, 2) AS total_paid_amount,
          COALESCE(SUM(s.due_amount), 0.00)::NUMERIC(14, 2) AS total_due_amount,
          COALESCE(ROUND(AVG(s.total_amount), 2), 0.00)::NUMERIC(12, 2) AS average_invoice_value
        FROM sales s
        ${whereClause};`,
        params
      ),

      // Payment Status Breakdown
      this.findMany(
        `SELECT 
          s.payment_status,
          COUNT(*)::INTEGER AS count,
          COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(14, 2) AS total_amount,
          COALESCE(SUM(s.due_amount), 0.00)::NUMERIC(14, 2) AS due_amount
        FROM sales s
        ${whereClause}
        GROUP BY s.payment_status
        ORDER BY s.payment_status;`,
        params
      ),

      // Payment Method Breakdown
      this.findMany(
        `SELECT 
          s.payment_method,
          COUNT(*)::INTEGER AS count,
          COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(14, 2) AS total_amount
        FROM sales s
        ${whereClause}
        GROUP BY s.payment_method
        ORDER BY total_amount DESC;`,
        params
      ),

      // Daily Time-Series (last 31 days within range)
      this.findMany(
        `SELECT 
          DATE_TRUNC('day', s.sale_date)::DATE AS sale_date,
          COUNT(*)::INTEGER AS count,
          COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(14, 2) AS total_amount,
          COALESCE(SUM(s.gst_amount), 0.00)::NUMERIC(14, 2) AS tax_amount
        FROM sales s
        ${whereClause}
        GROUP BY DATE_TRUNC('day', s.sale_date)
        ORDER BY sale_date DESC
        LIMIT 31;`,
        params
      ),

      // Paginated Invoices
      this.findMany(
        `SELECT 
          s.id, s.invoice_number, s.customer_id, s.customer_name, s.customer_phone, s.customer_village,
          s.subtotal, s.gst_rate, s.gst_mode, s.gst_amount, s.total_amount,
          s.paid_amount, s.due_amount, s.payment_method, s.payment_status, s.sale_date
        FROM sales s
        ${whereClause}
        ORDER BY s.sale_date DESC, s.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1};`,
        [...params, limitNum, offset]
      ),

      // Total count
      this.findOne(`SELECT COUNT(*)::INTEGER AS total FROM sales s ${whereClause};`, params),
    ]);

    const total = countRes ? countRes.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      summary: {
        totalInvoices: Number(summaryRes?.total_invoices || 0),
        grossSales: Number(summaryRes?.gross_sales || 0),
        taxableAmount: Number(summaryRes?.taxable_amount || 0),
        taxCollected: Number(summaryRes?.total_tax_collected || 0),
        paidAmount: Number(summaryRes?.total_paid_amount || 0),
        dueAmount: Number(summaryRes?.total_due_amount || 0),
        averageInvoiceValue: Number(summaryRes?.average_invoice_value || 0),
      },
      statusBreakdown: (statusBreakdownRes || []).map((b) => ({
        paymentStatus: b.payment_status,
        count: Number(b.count),
        totalAmount: Number(b.total_amount),
        dueAmount: Number(b.due_amount),
      })),
      methodBreakdown: (methodBreakdownRes || []).map((m) => ({
        paymentMethod: m.payment_method,
        count: Number(m.count),
        totalAmount: Number(m.total_amount),
      })),
      dailyTrends: (dailySeriesRes || []).map((d) => ({
        date: d.sale_date,
        invoiceCount: Number(d.count),
        totalAmount: Number(d.total_amount),
        taxAmount: Number(d.tax_amount),
      })),
      invoices: (invoicesRes || []).map((r) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerVillage: r.customer_village,
        subtotal: Number(r.subtotal),
        gstRate: Number(r.gst_rate),
        gstMode: r.gst_mode,
        gstAmount: Number(r.gst_amount),
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount),
        dueAmount: Number(r.due_amount),
        paymentMethod: r.payment_method,
        paymentStatus: r.payment_status,
        saleDate: r.sale_date,
      })),
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
   * 3. Purchases & Accounts Payable Totals Report
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getPurchaseReport(options = {}) {
    const { startDate, endDate, supplierId, paymentStatus, lifecycleStatus, page = 1, limit = 50 } = options;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (startDate) {
      conditions.push(`p.purchase_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`p.purchase_date <= $${idx++}`);
      params.push(endDate);
    }
    if (supplierId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierId);
      if (isUUID) {
        conditions.push(`p.supplier_id = $${idx++}`);
        params.push(supplierId.trim());
      } else {
        conditions.push(`LOWER(s.name) LIKE LOWER($${idx++})`);
        params.push(`%${supplierId.trim()}%`);
      }
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      conditions.push(`p.payment_status = $${idx++}`);
      params.push(paymentStatus.toUpperCase());
    }
    if (lifecycleStatus && lifecycleStatus !== 'ALL') {
      conditions.push(`p.lifecycle_status = $${idx++}`);
      params.push(lifecycleStatus.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const [summaryRes, statusBreakdownRes, ordersRes, countRes] = await Promise.all([
      // Summary
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_orders,
          COALESCE(SUM(p.total_amount), 0.00)::NUMERIC(14, 2) AS gross_purchases,
          COALESCE(SUM(p.paid_amount), 0.00)::NUMERIC(14, 2) AS total_paid,
          COALESCE(SUM(p.due_amount), 0.00)::NUMERIC(14, 2) AS total_due,
          COALESCE(ROUND(AVG(p.total_amount), 2), 0.00)::NUMERIC(12, 2) AS average_order_value
        FROM purchases p
        JOIN suppliers s ON s.id = p.supplier_id
        ${whereClause};`,
        params
      ),

      // Payment Status Breakdown
      this.findMany(
        `SELECT 
          p.payment_status,
          COUNT(*)::INTEGER AS count,
          COALESCE(SUM(p.total_amount), 0.00)::NUMERIC(14, 2) AS total_amount,
          COALESCE(SUM(p.due_amount), 0.00)::NUMERIC(14, 2) AS due_amount
        FROM purchases p
        JOIN suppliers s ON s.id = p.supplier_id
        ${whereClause}
        GROUP BY p.payment_status
        ORDER BY p.payment_status;`,
        params
      ),

      // Paginated Purchase Orders
      this.findMany(
        `SELECT 
          p.id, p.purchase_invoice_no, p.supplier_id, s.name AS supplier_name, s.phone AS supplier_phone,
          p.total_amount, p.paid_amount, p.due_amount, p.lifecycle_status, p.payment_status,
          p.notes, p.purchase_date
        FROM purchases p
        JOIN suppliers s ON s.id = p.supplier_id
        ${whereClause}
        ORDER BY p.purchase_date DESC, p.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1};`,
        [...params, limitNum, offset]
      ),

      // Total count
      this.findOne(
        `SELECT COUNT(*)::INTEGER AS total 
         FROM purchases p 
         JOIN suppliers s ON s.id = p.supplier_id 
         ${whereClause};`,
        params
      ),
    ]);

    const total = countRes ? countRes.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      summary: {
        totalOrders: Number(summaryRes?.total_orders || 0),
        grossPurchases: Number(summaryRes?.gross_purchases || 0),
        totalPaid: Number(summaryRes?.total_paid || 0),
        totalDue: Number(summaryRes?.total_due || 0),
        averageOrderValue: Number(summaryRes?.average_order_value || 0),
      },
      statusBreakdown: (statusBreakdownRes || []).map((b) => ({
        paymentStatus: b.payment_status,
        count: Number(b.count),
        totalAmount: Number(b.total_amount),
        dueAmount: Number(b.due_amount),
      })),
      orders: (ordersRes || []).map((r) => ({
        id: r.id,
        purchaseInvoiceNo: r.purchase_invoice_no,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        supplierPhone: r.supplier_phone,
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount),
        dueAmount: Number(r.due_amount),
        lifecycleStatus: r.lifecycle_status,
        paymentStatus: r.payment_status,
        notes: r.notes,
        purchaseDate: r.purchase_date,
      })),
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
   * 4. Low-Stock Products & Immediate Reorder Warnings
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getLowStockReport(options = {}) {
    const { categoryId, status = 'ALL', search = '', page = 1, limit = 50 } = options;

    const conditions = ['p.is_active = TRUE', 'p.stock <= p.min_threshold'];
    const params = [];
    let idx = 1;

    if (categoryId && categoryId !== 'ALL') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      if (isUUID) {
        conditions.push(`p.category_id = $${idx++}`);
        params.push(categoryId.trim());
      } else {
        conditions.push(`LOWER(c.name) = LOWER($${idx++})`);
        params.push(categoryId.trim());
      }
    }

    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      if (s === 'OUT_OF_STOCK' || s === 'OUT OF STOCK') {
        conditions.push('p.stock <= 0.000');
      } else if (s === 'LOW_STOCK' || s === 'LOW STOCK') {
        conditions.push('p.stock > 0.000 AND p.stock <= p.min_threshold');
      }
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(p.name) LIKE $${idx} OR
        LOWER(p.code) LIKE $${idx} OR
        LOWER(COALESCE(p.brand, '')) LIKE $${idx} OR
        LOWER(c.name) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const [summaryRes, productsRes, countRes] = await Promise.all([
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_alert_products,
          COUNT(*) FILTER (WHERE p.stock <= 0.000)::INTEGER AS out_of_stock_count,
          COUNT(*) FILTER (WHERE p.stock > 0.000)::INTEGER AS low_stock_count,
          COALESCE(
            SUM((p.min_threshold - GREATEST(0.000, p.stock)) * p.cost_price),
            0.00
          )::NUMERIC(14, 2) AS estimated_reorder_cost
        FROM products p
        JOIN categories c ON c.id = p.category_id
        ${whereClause};`,
        params
      ),

      this.findMany(
        `SELECT 
          p.id, p.code, p.name, c.name AS category_name, p.brand,
          p.package_type, p.package_size, p.unit, p.stock, p.min_threshold,
          p.min_threshold AS min_stock_threshold,
          p.cost_price, p.price, p.status,
          GREATEST(0.000, p.min_threshold - p.stock)::NUMERIC(12, 3) AS reorder_deficit,
          ROUND(GREATEST(0.000, p.min_threshold - p.stock) * p.cost_price, 2)::NUMERIC(12, 2) AS estimated_cost_to_restock
        FROM products p
        JOIN categories c ON c.id = p.category_id
        ${whereClause}
        ORDER BY p.stock ASC, p.min_threshold DESC
        LIMIT $${idx} OFFSET $${idx + 1};`,
        [...params, limitNum, offset]
      ),

      this.findOne(
        `SELECT COUNT(*)::INTEGER AS total 
         FROM products p 
         JOIN categories c ON c.id = p.category_id 
         ${whereClause};`,
        params
      ),
    ]);

    const total = countRes ? countRes.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      summary: {
        totalAlertProducts: Number(summaryRes?.total_alert_products || 0),
        outOfStockCount: Number(summaryRes?.out_of_stock_count || 0),
        lowStockCount: Number(summaryRes?.low_stock_count || 0),
        estimatedReorderCost: Number(summaryRes?.estimated_reorder_cost || 0),
      },
      products: (productsRes || []).map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category_name,
        brand: r.brand,
        packageType: r.package_type,
        packageSize: Number(r.package_size),
        unit: r.unit,
        stock: Number(r.stock),
        minStockThreshold: Number(r.min_stock_threshold),
        costPrice: Number(r.cost_price),
        price: Number(r.price),
        status: r.status,
        reorderDeficit: Number(r.reorder_deficit),
        estimatedCostToRestock: Number(r.estimated_cost_to_restock),
      })),
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
   * 5. Inventory Stock Valuation & Profit Margin Report
   * Leverages single source of truth view: v_inventory_valuation
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getInventoryValuationReport(options = {}) {
    const { categoryId, brand, stockStatus, search = '', page = 1, limit = 50 } = options;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (categoryId && categoryId !== 'ALL') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      if (isUUID) {
        conditions.push(`v.product_id IN (SELECT id FROM products WHERE category_id = $${idx++})`);
        params.push(categoryId.trim());
      } else {
        conditions.push(`LOWER(v.category_name) = LOWER($${idx++})`);
        params.push(categoryId.trim());
      }
    }

    if (brand && brand !== 'ALL') {
      conditions.push(`LOWER(v.brand) = LOWER($${idx++})`);
      params.push(brand.trim());
    }

    if (stockStatus && stockStatus !== 'ALL') {
      conditions.push(`v.stock_status = $${idx++}`);
      params.push(stockStatus.toUpperCase());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(v.product_name) LIKE $${idx} OR
        LOWER(v.product_code) LIKE $${idx} OR
        LOWER(COALESCE(v.brand, '')) LIKE $${idx} OR
        LOWER(v.category_name) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const [summaryRes, categoryBreakdownRes, productsRes, countRes] = await Promise.all([
      // Overall totals
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_products,
          COALESCE(SUM(v.stock), 0.000)::NUMERIC(12, 3) AS total_stock_units,
          COALESCE(SUM(v.total_cost_valuation), 0.00)::NUMERIC(14, 2) AS total_cost_valuation,
          COALESCE(SUM(v.total_retail_valuation), 0.00)::NUMERIC(14, 2) AS total_retail_valuation,
          COALESCE(SUM(v.potential_profit), 0.00)::NUMERIC(14, 2) AS total_potential_profit,
          ROUND(
            COALESCE(
              (SUM(v.potential_profit) / NULLIF(SUM(v.total_retail_valuation), 0.00)) * 100.0,
              0.00
            ),
            2
          )::NUMERIC(5, 2) AS overall_profit_margin_percent
        FROM v_inventory_valuation v
        ${whereClause};`,
        params
      ),

      // Category-wise Breakdown
      this.findMany(
        `SELECT 
          v.category_name,
          COUNT(*)::INTEGER AS product_count,
          COALESCE(SUM(v.stock), 0.000)::NUMERIC(12, 3) AS stock_units,
          COALESCE(SUM(v.total_cost_valuation), 0.00)::NUMERIC(14, 2) AS cost_valuation,
          COALESCE(SUM(v.total_retail_valuation), 0.00)::NUMERIC(14, 2) AS retail_valuation,
          COALESCE(SUM(v.potential_profit), 0.00)::NUMERIC(14, 2) AS potential_profit,
          ROUND(
            COALESCE(
              (SUM(v.potential_profit) / NULLIF(SUM(v.total_retail_valuation), 0.00)) * 100.0,
              0.00
            ),
            2
          )::NUMERIC(5, 2) AS margin_percent
        FROM v_inventory_valuation v
        ${whereClause}
        GROUP BY v.category_name
        ORDER BY retail_valuation DESC;`,
        params
      ),

      // Paginated items
      this.findMany(
        `SELECT 
          v.product_id, v.product_code, v.product_name, v.category_name, v.brand,
          v.package_type, v.package_size, v.unit, v.stock, v.cost_price, v.selling_price,
          v.total_cost_valuation, v.total_retail_valuation, v.potential_profit, v.stock_status,
          ROUND(
            COALESCE(
              (v.potential_profit / NULLIF(v.total_retail_valuation, 0.00)) * 100.0,
              0.00
            ),
            2
          )::NUMERIC(5, 2) AS margin_percent
        FROM v_inventory_valuation v
        ${whereClause}
        ORDER BY v.total_retail_valuation DESC, v.product_name ASC
        LIMIT $${idx} OFFSET $${idx + 1};`,
        [...params, limitNum, offset]
      ),

      // Count
      this.findOne(`SELECT COUNT(*)::INTEGER AS total FROM v_inventory_valuation v ${whereClause};`, params),
    ]);

    const total = countRes ? countRes.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      summary: {
        totalProducts: Number(summaryRes?.total_products || 0),
        totalStockUnits: Number(summaryRes?.total_stock_units || 0),
        totalCostValuation: Number(summaryRes?.total_cost_valuation || 0),
        totalRetailValuation: Number(summaryRes?.total_retail_valuation || 0),
        totalPotentialProfit: Number(summaryRes?.total_potential_profit || 0),
        overallProfitMarginPercent: Number(summaryRes?.overall_profit_margin_percent || 0),
      },
      categoryBreakdown: (categoryBreakdownRes || []).map((c) => ({
        categoryName: c.category_name,
        productCount: Number(c.product_count),
        stockUnits: Number(c.stock_units),
        costValuation: Number(c.cost_valuation),
        retailValuation: Number(c.retail_valuation),
        potentialProfit: Number(c.potential_profit),
        marginPercent: Number(c.margin_percent),
      })),
      products: (productsRes || []).map((r) => ({
        productId: r.product_id,
        code: r.product_code,
        name: r.product_name,
        category: r.category_name,
        brand: r.brand,
        packageType: r.package_type,
        packageSize: Number(r.package_size),
        unit: r.unit,
        stock: Number(r.stock),
        costPrice: Number(r.cost_price),
        price: Number(r.selling_price),
        totalCostValuation: Number(r.total_cost_valuation),
        totalRetailValuation: Number(r.total_retail_valuation),
        potentialProfit: Number(r.potential_profit),
        marginPercent: Number(r.margin_percent),
        status: r.stock_status,
      })),
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
   * 6. Customer Outstanding Balances & Aging (Farmer Khata Dues)
   * Leverages single source of truth view: v_customer_balances
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getCustomerDuesReport(options = {}) {
    const { balanceStatus = 'HAS_DUES', village, search = '', page = 1, limit = 50 } = options;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (balanceStatus && balanceStatus !== 'ALL') {
      conditions.push(`cb.balance_status = $${idx++}`);
      params.push(balanceStatus.toUpperCase());
    }

    if (village && village !== 'ALL') {
      conditions.push(`LOWER(cb.village) = LOWER($${idx++})`);
      params.push(village.trim());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(cb.name) LIKE $${idx} OR
        LOWER(cb.customer_code) LIKE $${idx} OR
        LOWER(COALESCE(cb.phone, '')) LIKE $${idx} OR
        LOWER(COALESCE(cb.village, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const [summaryRes, agingRes, customersRes, countRes] = await Promise.all([
      // Summary from view
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_customers,
          COUNT(*) FILTER (WHERE cb.outstanding_dues > 0.00)::INTEGER AS customers_with_dues_count,
          COUNT(*) FILTER (WHERE cb.outstanding_dues = 0.00)::INTEGER AS cleared_customers_count,
          COALESCE(SUM(cb.total_purchases), 0.00)::NUMERIC(14, 2) AS total_invoiced_debt,
          COALESCE(SUM(cb.total_paid), 0.00)::NUMERIC(14, 2) AS total_payments_collected,
          COALESCE(SUM(cb.outstanding_dues), 0.00)::NUMERIC(14, 2) AS total_outstanding_receivables,
          COALESCE(SUM(cb.credit_limit), 0.00)::NUMERIC(14, 2) AS total_credit_limit_allocated,
          COALESCE(SUM(cb.available_credit), 0.00)::NUMERIC(14, 2) AS total_available_credit
        FROM v_customer_balances cb
        ${whereClause};`,
        params
      ),

      // Aging breakdown of unpaid invoices
      this.findOne(
        `SELECT 
          COALESCE(SUM(due_amount) FILTER (WHERE CURRENT_DATE - sale_date::date <= 30), 0.00)::NUMERIC(14, 2) AS dues_0_to_30_days,
          COALESCE(SUM(due_amount) FILTER (WHERE CURRENT_DATE - sale_date::date BETWEEN 31 AND 60), 0.00)::NUMERIC(14, 2) AS dues_31_to_60_days,
          COALESCE(SUM(due_amount) FILTER (WHERE CURRENT_DATE - sale_date::date BETWEEN 61 AND 90), 0.00)::NUMERIC(14, 2) AS dues_61_to_90_days,
          COALESCE(SUM(due_amount) FILTER (WHERE CURRENT_DATE - sale_date::date > 90), 0.00)::NUMERIC(14, 2) AS dues_over_90_days
        FROM sales
        WHERE due_amount > 0.00;`
      ),

      // Paginated customers
      this.findMany(
        `SELECT 
          cb.customer_id, cb.customer_code, cb.name, cb.phone, cb.village,
          cb.credit_limit, cb.opening_balance, cb.total_purchases, cb.total_paid,
          cb.outstanding_dues, cb.available_credit, cb.balance_status
        FROM v_customer_balances cb
        ${whereClause}
        ORDER BY cb.outstanding_dues DESC, cb.name ASC
        LIMIT $${idx} OFFSET $${idx + 1};`,
        [...params, limitNum, offset]
      ),

      // Count
      this.findOne(`SELECT COUNT(*)::INTEGER AS total FROM v_customer_balances cb ${whereClause};`, params),
    ]);

    const total = countRes ? countRes.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      summary: {
        totalCustomers: Number(summaryRes?.total_customers || 0),
        customersWithDuesCount: Number(summaryRes?.customers_with_dues_count || 0),
        clearedCustomersCount: Number(summaryRes?.cleared_customers_count || 0),
        totalInvoicedDebt: Number(summaryRes?.total_invoiced_debt || 0),
        totalPaymentsCollected: Number(summaryRes?.total_payments_collected || 0),
        totalOutstandingReceivables: Number(summaryRes?.total_outstanding_receivables || 0),
        totalCreditLimitAllocated: Number(summaryRes?.total_credit_limit_allocated || 0),
        totalAvailableCredit: Number(summaryRes?.total_available_credit || 0),
      },
      agingSummary: {
        dues0To30Days: Number(agingRes?.dues_0_to_30_days || 0),
        dues31To60Days: Number(agingRes?.dues_31_to_60_days || 0),
        dues61To90Days: Number(agingRes?.dues_61_to_90_days || 0),
        duesOver90Days: Number(agingRes?.dues_over_90_days || 0),
      },
      customers: (customersRes || []).map((r) => ({
        customerId: r.customer_id,
        customerCode: r.customer_code,
        name: r.name,
        phone: r.phone,
        village: r.village,
        creditLimit: Number(r.credit_limit),
        openingBalance: Number(r.opening_balance),
        totalPurchases: Number(r.total_purchases),
        totalPaid: Number(r.total_paid),
        outstandingDues: Number(r.outstanding_dues),
        availableCredit: Number(r.available_credit),
        balanceStatus: r.balance_status,
      })),
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
   * 7. Supplier Outstanding Balances (Accounts Payable) Report
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getSupplierDuesReport(options = {}) {
    const { search = '', page = 1, limit = 50 } = options;

    const conditions = ['s.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(s.name) LIKE $${idx} OR
        LOWER(COALESCE(s.phone, '')) LIKE $${idx} OR
        LOWER(COALESCE(s.gstin, '')) LIKE $${idx}
      )`);
      params.push(q);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // CTE: Aggregates purchases and disbursements separately to avoid Cartesian multiplication
    const baseCte = `
      WITH supplier_purchases AS (
        SELECT 
          supplier_id,
          COALESCE(SUM(total_amount), 0.00)::NUMERIC(14, 2) AS total_purchased,
          COALESCE(SUM(paid_amount), 0.00)::NUMERIC(14, 2) AS invoice_paid,
          COALESCE(SUM(due_amount), 0.00)::NUMERIC(14, 2) AS open_dues,
          COUNT(id)::INTEGER AS total_orders
        FROM purchases
        WHERE lifecycle_status != 'CANCELLED'
        GROUP BY supplier_id
      ),
      supplier_disbursements AS (
        SELECT 
          supplier_id,
          COALESCE(SUM(amount), 0.00)::NUMERIC(14, 2) AS total_disbursed,
          COUNT(id)::INTEGER AS total_disbursements_count
        FROM supplier_payments
        GROUP BY supplier_id
      ),
      supplier_balances AS (
        SELECT 
          s.id AS supplier_id,
          s.name AS supplier_name,
          s.phone AS supplier_phone,
          s.email AS supplier_email,
          s.gstin AS supplier_gstin,
          COALESCE(sp.total_orders, 0) AS total_orders,
          COALESCE(sp.total_purchased, 0.00) AS total_purchased,
          COALESCE(sd.total_disbursed, 0.00) AS total_disbursed,
          COALESCE(sp.open_dues, 0.00) AS outstanding_payables,
          CASE 
            WHEN COALESCE(sp.open_dues, 0.00) > 0.00 THEN 'HAS_PAYABLES'
            ELSE 'SETTLED'
          END AS payment_status
        FROM suppliers s
        LEFT JOIN supplier_purchases sp ON sp.supplier_id = s.id
        LEFT JOIN supplier_disbursements sd ON sd.supplier_id = s.id
        ${whereClause}
      )
    `;

    const [summaryRes, suppliersRes, countRes] = await Promise.all([
      this.findOne(`
        ${baseCte}
        SELECT 
          COUNT(*)::INTEGER AS total_suppliers,
          COUNT(*) FILTER (WHERE outstanding_payables > 0.00)::INTEGER AS suppliers_with_payables_count,
          COALESCE(SUM(total_purchased), 0.00)::NUMERIC(14, 2) AS total_purchases_invoiced,
          COALESCE(SUM(total_disbursed), 0.00)::NUMERIC(14, 2) AS total_disbursements_paid,
          COALESCE(SUM(outstanding_payables), 0.00)::NUMERIC(14, 2) AS total_outstanding_payables
        FROM supplier_balances;
      `, params),

      this.findMany(`
        ${baseCte}
        SELECT *
        FROM supplier_balances
        ORDER BY outstanding_payables DESC, supplier_name ASC
        LIMIT $${idx} OFFSET $${idx + 1};
      `, [...params, limitNum, offset]),

      this.findOne(`
        ${baseCte}
        SELECT COUNT(*)::INTEGER AS total FROM supplier_balances;
      `, params),
    ]);

    const total = countRes ? countRes.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      summary: {
        totalSuppliers: Number(summaryRes?.total_suppliers || 0),
        suppliersWithPayablesCount: Number(summaryRes?.suppliers_with_payables_count || 0),
        totalPurchasesInvoiced: Number(summaryRes?.total_purchases_invoiced || 0),
        totalDisbursementsPaid: Number(summaryRes?.total_disbursements_paid || 0),
        totalOutstandingPayables: Number(summaryRes?.total_outstanding_payables || 0),
      },
      suppliers: (suppliersRes || []).map((r) => ({
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        supplierPhone: r.supplier_phone,
        supplierEmail: r.supplier_email,
        supplierGstin: r.supplier_gstin,
        totalOrders: Number(r.total_orders),
        totalPurchased: Number(r.total_purchased),
        totalDisbursed: Number(r.total_disbursed),
        outstandingPayables: Number(r.outstanding_payables),
        paymentStatus: r.payment_status,
      })),
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
   * 8. GST / Tax Summary Report
   * Computes Output Tax Liability, GST rate breakdown, and CGST/SGST allocations.
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getGstSummaryReport(options = {}) {
    const { startDate, endDate } = options;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (startDate) {
      conditions.push(`s.sale_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`s.sale_date <= $${idx++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [summaryRes, rateBreakdownRes, modeBreakdownRes] = await Promise.all([
      // Overall Tax Summary
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_invoices,
          COALESCE(SUM(s.subtotal), 0.00)::NUMERIC(14, 2) AS total_taxable_subtotal,
          COALESCE(SUM(s.gst_amount), 0.00)::NUMERIC(14, 2) AS total_gst_collected,
          COALESCE(ROUND(SUM(s.gst_amount) / 2.0, 2), 0.00)::NUMERIC(14, 2) AS total_cgst,
          COALESCE(ROUND(SUM(s.gst_amount) / 2.0, 2), 0.00)::NUMERIC(14, 2) AS total_sgst,
          COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(14, 2) AS total_gross_sales
        FROM sales s
        ${whereClause};`,
        params
      ),

      // Rate Breakdown (0%, 5%, 12%, 18%, 28%)
      this.findMany(
        `SELECT 
          s.gst_rate,
          COUNT(*)::INTEGER AS invoice_count,
          COALESCE(SUM(s.subtotal), 0.00)::NUMERIC(14, 2) AS taxable_amount,
          COALESCE(SUM(s.gst_amount), 0.00)::NUMERIC(14, 2) AS gst_amount,
          COALESCE(ROUND(SUM(s.gst_amount) / 2.0, 2), 0.00)::NUMERIC(14, 2) AS cgst_amount,
          COALESCE(ROUND(SUM(s.gst_amount) / 2.0, 2), 0.00)::NUMERIC(14, 2) AS sgst_amount,
          COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(14, 2) AS gross_amount
        FROM sales s
        ${whereClause}
        GROUP BY s.gst_rate
        ORDER BY s.gst_rate ASC;`,
        params
      ),

      // Mode Breakdown (INCLUSIVE vs EXCLUSIVE)
      this.findMany(
        `SELECT 
          s.gst_mode,
          COUNT(*)::INTEGER AS invoice_count,
          COALESCE(SUM(s.subtotal), 0.00)::NUMERIC(14, 2) AS taxable_amount,
          COALESCE(SUM(s.gst_amount), 0.00)::NUMERIC(14, 2) AS gst_amount,
          COALESCE(SUM(s.total_amount), 0.00)::NUMERIC(14, 2) AS gross_amount
        FROM sales s
        ${whereClause}
        GROUP BY s.gst_mode
        ORDER BY s.gst_mode ASC;`,
        params
      ),
    ]);

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalInvoices: Number(summaryRes?.total_invoices || 0),
        taxableSubtotal: Number(summaryRes?.total_taxable_subtotal || 0),
        totalGstCollected: Number(summaryRes?.total_gst_collected || 0),
        cgst: Number(summaryRes?.total_cgst || 0),
        sgst: Number(summaryRes?.total_sgst || 0),
        grossSales: Number(summaryRes?.total_gross_sales || 0),
      },
      rateBreakdown: (rateBreakdownRes || []).map((r) => ({
        gstRate: Number(r.gst_rate),
        invoiceCount: Number(r.invoice_count),
        taxableAmount: Number(r.taxable_amount),
        gstAmount: Number(r.gst_amount),
        cgstAmount: Number(r.cgst_amount),
        sgstAmount: Number(r.sgst_amount),
        grossAmount: Number(r.gross_amount),
      })),
      modeBreakdown: (modeBreakdownRes || []).map((m) => ({
        gstMode: m.gst_mode,
        invoiceCount: Number(m.invoice_count),
        taxableAmount: Number(m.taxable_amount),
        gstAmount: Number(m.gst_amount),
        grossAmount: Number(m.gross_amount),
      })),
    };
  }

  /**
   * 9. Payment Collection & Cash-Flow Summary Report
   * Reconciles inward collections against outward disbursements.
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getPaymentsSummaryReport(options = {}) {
    const { startDate, endDate } = options;

    const inConditions = [];
    const inParams = [];
    let inIdx = 1;

    if (startDate) {
      inConditions.push(`p.payment_date >= $${inIdx++}`);
      inParams.push(startDate);
    }
    if (endDate) {
      inConditions.push(`p.payment_date <= $${inIdx++}`);
      inParams.push(endDate);
    }
    const inWhere = inConditions.length > 0 ? `WHERE ${inConditions.join(' AND ')}` : '';

    const outConditions = [];
    const outParams = [];
    let outIdx = 1;

    if (startDate) {
      outConditions.push(`sp.payment_date >= $${outIdx++}`);
      outParams.push(startDate);
    }
    if (endDate) {
      outConditions.push(`sp.payment_date <= $${outIdx++}`);
      outParams.push(endDate);
    }
    const outWhere = outConditions.length > 0 ? `WHERE ${outConditions.join(' AND ')}` : '';

    const [inSummaryRes, inMethodRes, outSummaryRes, outMethodRes] = await Promise.all([
      // Customer Collections (Inward)
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_receipts_count,
          COALESCE(SUM(p.amount), 0.00)::NUMERIC(14, 2) AS total_collected,
          COUNT(*) FILTER (WHERE p.sale_id IS NOT NULL)::INTEGER AS allocated_receipts_count,
          COALESCE(SUM(p.amount) FILTER (WHERE p.sale_id IS NOT NULL), 0.00)::NUMERIC(14, 2) AS allocated_amount,
          COUNT(*) FILTER (WHERE p.sale_id IS NULL)::INTEGER AS on_account_receipts_count,
          COALESCE(SUM(p.amount) FILTER (WHERE p.sale_id IS NULL), 0.00)::NUMERIC(14, 2) AS on_account_amount
        FROM payments p
        ${inWhere};`,
        inParams
      ),

      // Customer Collections by Method
      this.findMany(
        `SELECT 
          p.payment_method,
          COUNT(*)::INTEGER AS count,
          COALESCE(SUM(p.amount), 0.00)::NUMERIC(14, 2) AS total_amount
        FROM payments p
        ${inWhere}
        GROUP BY p.payment_method
        ORDER BY total_amount DESC;`,
        inParams
      ),

      // Supplier Disbursements (Outward)
      this.findOne(
        `SELECT 
          COUNT(*)::INTEGER AS total_disbursements_count,
          COALESCE(SUM(sp.amount), 0.00)::NUMERIC(14, 2) AS total_disbursed
        FROM supplier_payments sp
        ${outWhere};`,
        outParams
      ),

      // Supplier Disbursements by Method
      this.findMany(
        `SELECT 
          sp.payment_method,
          COUNT(*)::INTEGER AS count,
          COALESCE(SUM(sp.amount), 0.00)::NUMERIC(14, 2) AS total_amount
        FROM supplier_payments sp
        ${outWhere}
        GROUP BY sp.payment_method
        ORDER BY total_amount DESC;`,
        outParams
      ),
    ]);

    const totalCollected = Number(inSummaryRes?.total_collected || 0);
    const totalDisbursed = Number(outSummaryRes?.total_disbursed || 0);
    const netCashFlow = Number((totalCollected - totalDisbursed).toFixed(2));

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      netCashFlow,
      collections: {
        totalReceiptsCount: Number(inSummaryRes?.total_receipts_count || 0),
        totalCollected,
        allocatedReceiptsCount: Number(inSummaryRes?.allocated_receipts_count || 0),
        allocatedAmount: Number(inSummaryRes?.allocated_amount || 0),
        onAccountReceiptsCount: Number(inSummaryRes?.on_account_receipts_count || 0),
        onAccountAmount: Number(inSummaryRes?.on_account_amount || 0),
        methodBreakdown: (inMethodRes || []).map((m) => ({
          method: m.payment_method,
          count: Number(m.count),
          amount: Number(m.total_amount),
        })),
      },
      disbursements: {
        totalDisbursementsCount: Number(outSummaryRes?.total_disbursements_count || 0),
        totalDisbursed,
        methodBreakdown: (outMethodRes || []).map((m) => ({
          method: m.payment_method,
          count: Number(m.count),
          amount: Number(m.total_amount),
        })),
      },
    };
  }

  /**
   * 10. Product-Level Sales & Inventory Summary Report
   * Aggregates quantity sold, sales revenue, COGS, gross profit, margin %, and current stock per product.
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getProductSalesReport(options = {}) {
    const { startDate, endDate, categoryId, sortBy = 'revenue', sortOrder = 'DESC', page = 1, limit = 50 } = options;

    const conditions = ['p.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (categoryId && categoryId !== 'ALL') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      if (isUUID) {
        conditions.push(`p.category_id = $${idx++}`);
        params.push(categoryId.trim());
      } else {
        conditions.push(`LOWER(c.name) = LOWER($${idx++})`);
        params.push(categoryId.trim());
      }
    }

    const saleDateConditions = [];
    const dateParams = [];
    let dIdx = idx;

    if (startDate) {
      saleDateConditions.push(`s.sale_date >= $${dIdx++}`);
      dateParams.push(startDate);
    }
    if (endDate) {
      saleDateConditions.push(`s.sale_date <= $${dIdx++}`);
      dateParams.push(endDate);
    }

    const saleDateWhere = saleDateConditions.length > 0 ? `WHERE ${saleDateConditions.join(' AND ')}` : '';
    const combinedParams = [...params, ...dateParams];

    const allowedSort = {
      revenue: 'total_revenue',
      quantity: 'total_quantity_sold',
      profit: 'gross_profit',
      name: 'p.name',
      stock: 'p.stock',
    };
    const orderCol = allowedSort[sortBy.toLowerCase()] || 'total_revenue';
    const orderDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Subquery aggregates sale_items without multiplying rows
    const sql = `
      WITH sales_by_product AS (
        SELECT 
          si.product_id,
          COALESCE(SUM(si.quantity), 0.000)::NUMERIC(12, 3) AS total_quantity_sold,
          COALESCE(SUM(si.subtotal), 0.00)::NUMERIC(14, 2) AS total_revenue
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        ${saleDateWhere}
        GROUP BY si.product_id
      )
      SELECT 
        p.id AS product_id,
        p.code AS product_code,
        p.name AS product_name,
        c.name AS category_name,
        p.brand,
        p.package_type,
        p.package_size,
        p.unit,
        p.stock AS current_stock,
        p.min_threshold AS min_stock_threshold,
        p.cost_price,
        p.price AS selling_price,
        p.status AS stock_status,
        COALESCE(sp.total_quantity_sold, 0.000)::NUMERIC(12, 3) AS total_quantity_sold,
        COALESCE(sp.total_revenue, 0.00)::NUMERIC(14, 2) AS total_revenue,
        ROUND(COALESCE(sp.total_quantity_sold, 0.000) * p.cost_price, 2)::NUMERIC(14, 2) AS total_cogs,
        ROUND(COALESCE(sp.total_revenue, 0.00) - (COALESCE(sp.total_quantity_sold, 0.000) * p.cost_price), 2)::NUMERIC(14, 2) AS gross_profit,
        ROUND(
          COALESCE(
            ((COALESCE(sp.total_revenue, 0.00) - (COALESCE(sp.total_quantity_sold, 0.000) * p.cost_price)) / NULLIF(COALESCE(sp.total_revenue, 0.00), 0.00)) * 100.0,
            0.00
          ),
          2
        )::NUMERIC(5, 2) AS margin_percentage
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN sales_by_product sp ON sp.product_id = p.id
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}, p.name ASC
      LIMIT $${dIdx} OFFSET $${dIdx + 1};
    `;

    const countSql = `
      SELECT COUNT(*)::INTEGER AS total
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ${whereClause};
    `;

    const summarySql = `
      WITH sales_by_product AS (
        SELECT 
          si.product_id,
          COALESCE(SUM(si.quantity), 0.000)::NUMERIC(12, 3) AS total_quantity_sold,
          COALESCE(SUM(si.subtotal), 0.00)::NUMERIC(14, 2) AS total_revenue
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        ${saleDateWhere}
        GROUP BY si.product_id
      )
      SELECT 
        COUNT(p.id)::INTEGER AS total_products,
        COALESCE(SUM(sp.total_quantity_sold), 0.000)::NUMERIC(12, 3) AS total_units_sold,
        COALESCE(SUM(sp.total_revenue), 0.00)::NUMERIC(14, 2) AS total_sales_revenue,
        COALESCE(SUM(sp.total_quantity_sold * p.cost_price), 0.00)::NUMERIC(14, 2) AS total_cogs,
        COALESCE(SUM(sp.total_revenue - (sp.total_quantity_sold * p.cost_price)), 0.00)::NUMERIC(14, 2) AS total_gross_profit,
        ROUND(
          COALESCE(
            (SUM(sp.total_revenue - (sp.total_quantity_sold * p.cost_price)) / NULLIF(SUM(sp.total_revenue), 0.00)) * 100.0,
            0.00
          ),
          2
        )::NUMERIC(5, 2) AS overall_margin_percentage
      FROM products p
      LEFT JOIN sales_by_product sp ON sp.product_id = p.id
      ${whereClause};
    `;

    const [productsRes, countRes, summaryRes] = await Promise.all([
      this.findMany(sql, [...combinedParams, limitNum, offset]),
      this.findOne(countSql, params),
      this.findOne(summarySql, combinedParams),
    ]);

    const total = countRes ? countRes.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalProducts: Number(summaryRes?.total_products || 0),
        totalUnitsSold: Number(summaryRes?.total_units_sold || 0),
        totalRevenue: Number(summaryRes?.total_sales_revenue || 0),
        totalCogs: Number(summaryRes?.total_cogs || 0),
        totalGrossProfit: Number(summaryRes?.total_gross_profit || 0),
        overallMarginPercent: Number(summaryRes?.overall_margin_percentage || 0),
      },
      products: (productsRes || []).map((r) => ({
        productId: r.product_id,
        code: r.product_code,
        name: r.product_name,
        category: r.category_name,
        brand: r.brand,
        packageType: r.package_type,
        packageSize: Number(r.package_size),
        unit: r.unit,
        currentStock: Number(r.current_stock),
        minStockThreshold: Number(r.min_stock_threshold),
        costPrice: Number(r.cost_price),
        sellingPrice: Number(r.selling_price),
        status: r.stock_status,
        quantitySold: Number(r.total_quantity_sold),
        revenue: Number(r.total_revenue),
        cogs: Number(r.total_cogs),
        grossProfit: Number(r.gross_profit),
        marginPercent: Number(r.margin_percentage),
      })),
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
   * 11. Transaction History (Unified Sales, Purchases, and Collections Ledger)
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getTransactionHistory(options = {}) {
    const { type = 'ALL', startDate, endDate, page = 1, limit = 50 } = options;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const queries = [];
    const params = [];
    let idx = 1;

    let dateCondS = '';
    let dateCondP = '';
    let dateCondPay = '';

    if (startDate) {
      dateCondS += ` AND s.sale_date >= $${idx}`;
      dateCondP += ` AND p.purchase_date >= $${idx}`;
      dateCondPay += ` AND pay.payment_date >= $${idx}`;
      params.push(startDate);
      idx++;
    }
    if (endDate) {
      dateCondS += ` AND s.sale_date <= $${idx}`;
      dateCondP += ` AND p.purchase_date <= $${idx}`;
      dateCondPay += ` AND pay.payment_date <= $${idx}`;
      params.push(endDate);
      idx++;
    }

    const upperType = String(type).toUpperCase();

    if (upperType === 'ALL' || upperType === 'SALE') {
      queries.push(`
        SELECT 
          s.id,
          'SALE' AS transaction_type,
          s.invoice_number AS reference_number,
          s.customer_name AS party_name,
          s.total_amount AS debit_amount,
          0.00 AS credit_amount,
          s.payment_status AS status,
          s.payment_method AS method,
          s.sale_date AS transaction_date,
          s.created_at
        FROM sales s
        WHERE 1=1 ${dateCondS}
      `);
    }

    if (upperType === 'ALL' || upperType === 'PURCHASE') {
      queries.push(`
        SELECT 
          p.id,
          'PURCHASE' AS transaction_type,
          p.purchase_invoice_no AS reference_number,
          sup.name AS party_name,
          0.00 AS debit_amount,
          p.total_amount AS credit_amount,
          p.payment_status AS status,
          'BANK_TRANSFER' AS method,
          p.purchase_date AS transaction_date,
          p.created_at
        FROM purchases p
        JOIN suppliers sup ON sup.id = p.supplier_id
        WHERE p.lifecycle_status != 'CANCELLED' ${dateCondP}
      `);
    }

    if (upperType === 'ALL' || upperType === 'PAYMENT') {
      queries.push(`
        SELECT 
          pay.id,
          'PAYMENT' AS transaction_type,
          pay.receipt_number AS reference_number,
          c.name AS party_name,
          0.00 AS debit_amount,
          pay.amount AS credit_amount,
          'COLLECTED' AS status,
          pay.payment_method AS method,
          pay.payment_date AS transaction_date,
          pay.created_at
        FROM payments pay
        JOIN customers c ON c.id = pay.customer_id
        WHERE 1=1 ${dateCondPay}
      `);
    }

    const unionSql = queries.join(' UNION ALL ');

    const pagedSql = `
      WITH unified_history AS (
        ${unionSql}
      )
      SELECT *
      FROM unified_history
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    const countSql = `
      WITH unified_history AS (
        ${unionSql}
      )
      SELECT COUNT(*)::INTEGER AS total FROM unified_history;
    `;

    const [rows, countRes] = await Promise.all([
      this.findMany(pagedSql, [...params, limitNum, offset]),
      this.findOne(countSql, params),
    ]);

    const total = countRes ? countRes.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      transactions: (rows || []).map((r) => ({
        id: r.id,
        type: r.transaction_type,
        referenceNumber: r.reference_number,
        partyName: r.party_name,
        debitAmount: Number(r.debit_amount),
        creditAmount: Number(r.credit_amount),
        status: r.status,
        method: r.method,
        transactionDate: r.transaction_date,
      })),
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
}

module.exports = new ReportRepository();
