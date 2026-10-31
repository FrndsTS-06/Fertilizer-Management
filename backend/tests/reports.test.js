const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const { pool, closePool } = require('../src/config/db');
const { resetRateLimit } = require('../src/middleware/rateLimiter');

test('Phase 14 Dashboard & Reporting Analytics Test Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;

  // Test Fixture IDs
  let categoryId;
  let product1Id;
  let product2Id; // Low stock
  let product3Id; // Out of stock
  let supplierId;
  let customerId;
  let saleId;
  let purchaseId;
  let paymentId;

  await t.test('Setup: start test server, login Admin & Staff, and seed deterministic report fixtures', async () => {
    await new Promise((resolve, reject) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
      server.on('error', reject);
    });

    assert.ok(baseUrl);
    resetRateLimit('127.0.0.1');

    // Clean up test records from prior runs
    await pool.query("DELETE FROM payments WHERE reference_no LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM supplier_payments WHERE reference_no LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE 'TEST-REP-%');");
    await pool.query("DELETE FROM sales WHERE invoice_number LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE purchase_invoice_no LIKE 'TEST-REP-%');");
    await pool.query("DELETE FROM purchases WHERE purchase_invoice_no LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM stock_movements WHERE product_code LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM products WHERE code LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM customers WHERE name = 'Test Farmer Reporting Ledger';");
    await pool.query("DELETE FROM suppliers WHERE name = 'Test Agri Reporting Supplier';");

    // Fetch active category
    const catRes = await pool.query('SELECT id FROM categories WHERE is_active = TRUE LIMIT 1;');
    assert.ok(catRes.rows.length > 0);
    categoryId = catRes.rows[0].id;

    // Login Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fertilizershop.local',
        password: 'Password@123',
      }),
    });
    assert.strictEqual(adminRes.status, 200);
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;
    assert.ok(adminToken);

    // Login Staff
    const staffRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cashier@fertilizershop.local',
        password: 'Password@123',
      }),
    });
    assert.strictEqual(staffRes.status, 200);
    const staffData = await staffRes.json();
    staffToken = staffData.data.token;
    assert.ok(staffToken);

    // Seed Test Products:
    // P1: In stock (stock: 50, min: 10, cost: 400, price: 500) -> Cost: 20000, Retail: 25000, Profit: 5000
    const p1Res = await pool.query(`
      INSERT INTO products (code, name, category_id, brand, package_type, package_size, unit, cost_price, price, min_threshold, stock)
      VALUES ('TEST-REP-P01', 'Test Urea 46N Report Granules', $1, 'IFFCO', 'Bag', '45', 'kg', 400.00, 500.00, 10.000, 50.000)
      RETURNING id;
    `, [categoryId]);
    product1Id = p1Res.rows[0].id;

    // P2: Low stock (stock: 5, min: 20, cost: 800, price: 1000) -> Cost: 4000, Retail: 5000, Deficit: 15
    const p2Res = await pool.query(`
      INSERT INTO products (code, name, category_id, brand, package_type, package_size, unit, cost_price, price, min_threshold, stock)
      VALUES ('TEST-REP-P02', 'Test DAP 18-46 Report Fertilizer', $1, 'KRIBHCO', 'Bag', '50', 'kg', 800.00, 1000.00, 20.000, 5.000)
      RETURNING id;
    `, [categoryId]);
    product2Id = p2Res.rows[0].id;

    // P3: Out of stock (stock: 0, min: 15, cost: 300, price: 450) -> Deficit: 15
    const p3Res = await pool.query(`
      INSERT INTO products (code, name, category_id, brand, package_type, package_size, unit, cost_price, price, min_threshold, stock)
      VALUES ('TEST-REP-P03', 'Test Potash MOP Report', $1, 'IPL', 'Bag', '50', 'kg', 300.00, 450.00, 15.000, 0.000)
      RETURNING id;
    `, [categoryId]);
    product3Id = p3Res.rows[0].id;

    // Seed Supplier
    const supRes = await pool.query(`
      INSERT INTO suppliers (name, contact_person, phone, email, address, gstin)
      VALUES ('Test Agri Reporting Supplier', 'Ramesh Patil', '9811223344', 'supplier.rep@agri.local', 'MIDC Kurkumbh, Pune', '27AABCT1234F1Z5')
      RETURNING id;
    `);
    supplierId = supRes.rows[0].id;

    // Seed Customer (Opening balance: 500.00, Credit limit: 25000.00)
    const custRes = await pool.query(`
      INSERT INTO customers (customer_code, name, phone, village, address, credit_limit, opening_balance)
      VALUES ('REP001', 'Test Farmer Reporting Ledger', '9899776655', 'Baramati', 'Gat No 45, Near Canal', 25000.00, 500.00)
      RETURNING id;
    `);
    customerId = custRes.rows[0].id;

    // Seed Purchase Order:
    // Total: 10000.00, Paid: 6000.00, Due: 4000.00, Status: PARTIAL
    const purRes = await pool.query(`
      INSERT INTO purchases (purchase_invoice_no, supplier_id, total_amount, paid_amount, due_amount, lifecycle_status, payment_status, purchase_date)
      VALUES ('TEST-REP-PO-001', $1, 10000.00, 6000.00, 4000.00, 'RECEIVED', 'PARTIAL', CURRENT_TIMESTAMP)
      RETURNING id;
    `, [supplierId]);
    purchaseId = purRes.rows[0].id;

    await pool.query(`
      INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, unit_cost, subtotal, unit)
      VALUES ($1, $2, 'Test Urea 46N Report Granules', 25.000, 400.00, 10000.00, 'Bag');
    `, [purchaseId, product1Id]);

    // Seed Supplier Payment Disbursement (6000.00)
    await pool.query(`
      INSERT INTO supplier_payments (payment_number, supplier_id, purchase_id, amount, payment_method, reference_no, payment_date)
      VALUES ('SPAY-TEST-REP-01', $1, $2, 6000.00, 'BANK_TRANSFER', 'TEST-REP-NEFT-01', CURRENT_TIMESTAMP);
    `, [supplierId, purchaseId]);

    // Seed Sales Invoice:
    // 4 units of P1 @ 500 = 2000.00 subtotal. GST 5% EXCLUSIVE = 100.00 GST. Total: 2100.00.
    // Paid: 1000.00, Due: 1100.00, Status: PARTIAL, Payment Method: SPLIT
    const sRes = await pool.query(`
      INSERT INTO sales (
        invoice_number, customer_id, customer_name, customer_phone, customer_village,
        subtotal, gst_rate, gst_mode, gst_amount, total_amount,
        paid_amount, due_amount, payment_method, payment_status, sale_date
      ) VALUES (
        'TEST-REP-INV-001', $1, 'Test Farmer Reporting Ledger', '9899776655', 'Baramati',
        2000.00, 5.00, 'EXCLUSIVE', 100.00, 2100.00,
        1000.00, 1100.00, 'CREDIT (KHATA)', 'PARTIAL', CURRENT_TIMESTAMP
      ) RETURNING id;
    `, [customerId]);
    saleId = sRes.rows[0].id;

    await pool.query(`
      INSERT INTO sale_items (sale_id, product_id, product_code, product_name, quantity, unit_price, subtotal, unit)
      VALUES ($1, $2, 'TEST-REP-P01', 'Test Urea 46N Report Granules', 4.000, 500.00, 2000.00, 'Bag');
    `, [saleId, product1Id]);

    // Seed Customer Payments:
    // 1. Invoice-allocated payment: 1000.00 (UPI)
    const payRes = await pool.query(`
      INSERT INTO payments (receipt_number, customer_id, sale_id, amount, payment_method, reference_no, payment_date)
      VALUES ('REC-TEST-REP-01', $1, $2, 1000.00, 'UPI', 'TEST-REP-UPI-01', CURRENT_TIMESTAMP)
      RETURNING id;
    `, [customerId, saleId]);
    paymentId = payRes.rows[0].id;

    // 2. On-account deposit: 200.00 (CASH)
    await pool.query(`
      INSERT INTO payments (receipt_number, customer_id, sale_id, amount, payment_method, reference_no, payment_date)
      VALUES ('REC-TEST-REP-02', $1, NULL, 200.00, 'CASH', 'TEST-REP-CASH-01', CURRENT_TIMESTAMP);
    `, [customerId]);
  });

  // =========================================================================
  // 1. AUTHENTICATION & RBAC PERMISSION ENFORCEMENT
  // =========================================================================

  await t.test('Reporting APIs reject unauthenticated requests with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/reports/dashboard`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /authentication token is missing/i);
  });

  await t.test('Staff role is allowed on operational reports (Dashboard, Sales, Inventory Valuation)', async () => {
    const res = await fetch(`${baseUrl}/api/reports/dashboard`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.sales);
    assert.ok(body.data.inventory);
  });

  await t.test('Staff role is strictly FORBIDDEN (403) from sensitive Supplier Accounts Payable report', async () => {
    const res = await fetch(`${baseUrl}/api/reports/supplier-dues`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /insufficient permissions/i);
  });

  await t.test('Staff role is strictly FORBIDDEN (403) from sensitive GST Tax Summary report', async () => {
    const res = await fetch(`${baseUrl}/api/reports/gst-summary`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /insufficient permissions/i);
  });

  await t.test('Admin role has authorized access to sensitive Supplier Payables and GST Tax Summary', async () => {
    const [suppRes, gstRes] = await Promise.all([
      fetch(`${baseUrl}/api/reports/supplier-dues`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
      fetch(`${baseUrl}/api/reports/gst-summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    ]);

    assert.strictEqual(suppRes.status, 200);
    assert.strictEqual(gstRes.status, 200);
  });

  // =========================================================================
  // 2. VALIDATION & DATE BOUNDARY HANDLING
  // =========================================================================

  await t.test('Reporting APIs reject invalid date strings with 422 Unprocessable Entity', async () => {
    const res = await fetch(`${baseUrl}/api/reports/sales?startDate=not-a-valid-date`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 422);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /validation failed/i);
  });

  await t.test('Reporting APIs reject startDate chronologically later than endDate with 422', async () => {
    const res = await fetch(`${baseUrl}/api/reports/sales?startDate=2026-12-31&endDate=2026-01-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 422);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(/startDate cannot be chronologically later than endDate/i.test(JSON.stringify(body)));
  });

  await t.test('Reporting APIs reject invalid period presets with 422', async () => {
    const res = await fetch(`${baseUrl}/api/reports/sales?period=next-millennium`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 422);
  });

  // =========================================================================
  // 3. EMPTY PERIOD BEHAVIOR
  // =========================================================================

  await t.test('Reporting query in empty period (future date) returns zeroed aggregates without 500 error', async () => {
    const res = await fetch(`${baseUrl}/api/reports/sales?startDate=2099-01-01&endDate=2099-01-31`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.summary.totalInvoices, 0);
    assert.strictEqual(body.summary.grossSales, 0);
    assert.strictEqual(body.summary.taxCollected, 0);
    assert.strictEqual(body.data.length, 0);
  });

  // =========================================================================
  // 4. EXECUTIVE DASHBOARD SUMMARY RECONCILIATION
  // =========================================================================

  await t.test('GET /api/reports/dashboard returns comprehensive KPI metrics matching live database state', async () => {
    const res = await fetch(`${baseUrl}/api/reports/dashboard?period=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const d = body.data;
    assert.ok(d.sales.count >= 1);
    assert.ok(d.sales.turnover >= 2100.0);
    assert.ok(d.purchases.count >= 1);
    assert.ok(d.purchases.totalAmount >= 10000.0);
    assert.ok(d.accountsReceivable.totalCustomers >= 1);
    assert.ok(d.accountsReceivable.outstandingReceivables > 0.0);
    assert.ok(d.accountsPayable.outstandingPayables >= 4000.0);
    assert.ok(d.inventory.activeProducts >= 3);
    assert.ok(d.inventory.lowStock >= 1);
    assert.ok(d.inventory.outOfStock >= 1);
    assert.ok(d.inventory.costValuation > 0.0);
    assert.ok(d.collections.totalAmount >= 1200.0); // 1000 + 200
  });

  // =========================================================================
  // 5. SALES TURNOVER REPORT & INVOICE BREAKDOWN
  // =========================================================================

  await t.test('GET /api/reports/sales returns aggregated turnover, payment status, and method distribution', async () => {
    const res = await fetch(`${baseUrl}/api/reports/sales?period=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary.grossSales >= 2100.0);
    assert.ok(body.summary.taxCollected >= 100.0);
    assert.ok(body.statusBreakdown.length >= 1);
    assert.ok(body.methodBreakdown.length >= 1);
    assert.ok(Array.isArray(body.data));
  });

  // =========================================================================
  // 6. PURCHASES & ACCOUNTS PAYABLE REPORT
  // =========================================================================

  await t.test('GET /api/reports/purchases aggregates distributor procurement orders and outstanding dues', async () => {
    const res = await fetch(`${baseUrl}/api/reports/purchases?period=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary.grossPurchases >= 10000.0);
    assert.ok(body.summary.totalPaid >= 6000.0);
    assert.ok(body.summary.totalDue >= 4000.0);
    assert.ok(body.data.length >= 1);
  });

  // =========================================================================
  // 7. LOW-STOCK PRODUCTS & REORDER WARNINGS
  // =========================================================================

  await t.test('GET /api/reports/low-stock identifies depleted items and calculates restock deficit and costs', async () => {
    const res = await fetch(`${baseUrl}/api/reports/low-stock`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary.totalAlertProducts >= 2);
    assert.ok(body.summary.outOfStockCount >= 1);
    assert.ok(body.summary.lowStockCount >= 1);
    assert.ok(body.summary.estimatedReorderCost > 0);

    const p2 = body.data.find((p) => p.code === 'TEST-REP-P02');
    assert.ok(p2);
    assert.strictEqual(p2.reorderDeficit, 15); // min 20 - stock 5 = 15
    assert.strictEqual(p2.estimatedCostToRestock, 12000.0); // 15 * 800 = 12000
  });

  // =========================================================================
  // 8. INVENTORY ASSET VALUATION & MARGIN ANALYSIS
  // =========================================================================

  await t.test('GET /api/reports/inventory-valuation matches v_inventory_valuation totals and category breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/reports/inventory-valuation`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary.totalCostValuation > 0);
    assert.ok(body.summary.totalRetailValuation > body.summary.totalCostValuation);
    assert.ok(body.summary.totalPotentialProfit > 0);
    assert.ok(body.summary.overallProfitMarginPercent > 0);
    assert.ok(body.categoryBreakdown.length >= 1);
  });

  // =========================================================================
  // 9. CUSTOMER KHATA DUES & AGING REPORT
  // =========================================================================

  await t.test('GET /api/reports/customer-dues reconciles customer debt, collections, and aging buckets', async () => {
    const res = await fetch(`${baseUrl}/api/reports/customer-dues`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary.totalInvoicedDebt > 0);
    assert.ok(body.summary.totalOutstandingReceivables > 0);
    assert.ok(body.agingSummary);

    // Verify test customer in data
    const c = body.data.find((cust) => cust.name === 'Test Farmer Reporting Ledger');
    assert.ok(c);
    // Opening balance: 500, Sale 1: 2100 -> Total purchases: 2600.
    // Total paid: 1000 + 200 = 1200.
    // Net outstanding dues: 2600 - 1200 = 1400.00!
    assert.strictEqual(c.totalPurchases, 2600.0);
    assert.strictEqual(c.totalPaid, 1200.0);
    assert.strictEqual(c.outstandingDues, 1400.0);
  });

  // =========================================================================
  // 10. SUPPLIER OUTSTANDING BALANCES (ACCOUNTS PAYABLE)
  // =========================================================================

  await t.test('GET /api/reports/supplier-dues (Admin) reconciles supplier procurement debt and disbursements', async () => {
    const res = await fetch(`${baseUrl}/api/reports/supplier-dues`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary.totalPurchasesInvoiced >= 10000.0);
    assert.ok(body.summary.totalDisbursementsPaid >= 6000.0);
    assert.ok(body.summary.totalOutstandingPayables >= 4000.0);

    const sup = body.data.find((s) => s.supplierName === 'Test Agri Reporting Supplier');
    assert.ok(sup);
    assert.strictEqual(sup.totalPurchased, 10000.0);
    assert.strictEqual(sup.totalDisbursed, 6000.0);
    assert.strictEqual(sup.outstandingPayables, 4000.0);
  });

  // =========================================================================
  // 11. GST / TAX SUMMARY REPORT
  // =========================================================================

  await t.test('GET /api/reports/gst-summary (Admin) calculates output tax, 50/50 CGST/SGST split, and rate distributions', async () => {
    const res = await fetch(`${baseUrl}/api/reports/gst-summary?period=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.summary.totalGstCollected >= 100.0);
    assert.strictEqual(body.data.summary.cgst, Number((body.data.summary.totalGstCollected / 2).toFixed(2)));
    assert.strictEqual(body.data.summary.sgst, Number((body.data.summary.totalGstCollected / 2).toFixed(2)));
    assert.ok(body.data.rateBreakdown.some((r) => r.gstRate === 5));
  });

  // =========================================================================
  // 12. PAYMENTS COLLECTION & CASH FLOW SUMMARY
  // =========================================================================

  await t.test('GET /api/reports/payments-summary reconciles customer collections, disbursements, and net cash flow', async () => {
    const res = await fetch(`${baseUrl}/api/reports/payments-summary?period=all`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.collections.totalCollected >= 1200.0);
    assert.ok(body.data.collections.allocatedAmount >= 1000.0);
    assert.ok(body.data.collections.onAccountAmount >= 200.0);
    assert.ok(body.data.disbursements.totalDisbursed >= 6000.0);
    assert.strictEqual(
      body.data.netCashFlow,
      Number((body.data.collections.totalCollected - body.data.disbursements.totalDisbursed).toFixed(2))
    );
  });

  // =========================================================================
  // 13. PRODUCT-LEVEL SALES & INVENTORY PERFORMANCE
  // =========================================================================

  await t.test('GET /api/reports/product-sales calculates product sales volume, COGS, gross profit, and margin %', async () => {
    const res = await fetch(`${baseUrl}/api/reports/product-sales?period=all`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary.totalRevenue >= 2000.0);
    assert.ok(body.summary.totalCogs > 0);
    assert.ok(body.summary.totalGrossProfit > 0);

    const p1 = body.data.find((p) => p.code === 'TEST-REP-P01');
    assert.ok(p1);
    assert.strictEqual(p1.quantitySold, 4.0);
    assert.strictEqual(p1.revenue, 2000.0);
    assert.strictEqual(p1.cogs, 1600.0); // 4 * 400 = 1600
    assert.strictEqual(p1.grossProfit, 400.0); // 2000 - 1600 = 400
    assert.strictEqual(p1.marginPercent, 20.0); // (400 / 2000) * 100 = 20%
  });

  // =========================================================================
  // 14. UNIFIED TRANSACTION HISTORY STREAM
  // =========================================================================

  await t.test('GET /api/reports/history returns unified chronological transactions across Sales, Purchases, and Collections', async () => {
    const res = await fetch(`${baseUrl}/api/reports/history?period=all`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 3);

    const types = new Set(body.data.map((tx) => tx.type));
    assert.ok(types.has('SALE'));
    assert.ok(types.has('PURCHASE'));
    assert.ok(types.has('PAYMENT'));
  });

  // =========================================================================
  // 15. TEARDOWN
  // =========================================================================

  await t.test('Teardown: clean test records and close server & database pool', async () => {
    await pool.query("DELETE FROM payments WHERE reference_no LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM supplier_payments WHERE reference_no LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE 'TEST-REP-%');");
    await pool.query("DELETE FROM sales WHERE invoice_number LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE purchase_invoice_no LIKE 'TEST-REP-%');");
    await pool.query("DELETE FROM purchases WHERE purchase_invoice_no LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM stock_movements WHERE product_code LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM products WHERE code LIKE 'TEST-REP-%';");
    await pool.query("DELETE FROM customers WHERE name = 'Test Farmer Reporting Ledger';");
    await pool.query("DELETE FROM suppliers WHERE name = 'Test Agri Reporting Supplier';");

    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
