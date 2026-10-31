const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const { pool, closePool } = require('../src/config/db');
const { resetRateLimit } = require('../src/middleware/rateLimiter');
const productRepository = require('../src/repositories/product.repository');

test('Phase 12 POS Sales & Invoicing API Test Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let customerId;
  let product1Id;
  let product2Id;
  const product1Code = 'TEST-POS-P01';
  const product2Code = 'TEST-POS-P02';
  let categoryId;
  let testWalkInInvoiceNo;
  let testCreditInvoiceNo;

  await t.test('Setup: HTTP server starts on an ephemeral port, logs in Admin & Staff, and seeds test data', async () => {
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
    const testSalesQuery = `SELECT id FROM sales WHERE invoice_number LIKE 'TEST-%' OR id IN (SELECT sale_id FROM sale_items WHERE product_id IN (SELECT id FROM products WHERE code LIKE 'TEST-POS-%'))`;
    await pool.query(`DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE name = 'Test Farmer Sales Pos') OR sale_id IN (${testSalesQuery});`);
    await pool.query(`DELETE FROM sale_items WHERE sale_id IN (${testSalesQuery}) OR product_id IN (SELECT id FROM products WHERE code LIKE 'TEST-POS-%');`);
    await pool.query(`DELETE FROM sales WHERE id IN (${testSalesQuery});`);
    await pool.query("DELETE FROM stock_movements WHERE product_code LIKE 'TEST-POS-%';");
    await pool.query("DELETE FROM products WHERE code LIKE 'TEST-POS-%';");
    await pool.query("DELETE FROM customers WHERE name = 'Test Farmer Sales Pos';");

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

    // Create test customer
    const custRes = await pool.query(
      `INSERT INTO customers (customer_code, name, phone, village, address, credit_limit, opening_balance, is_active)
       VALUES ('TEST-CUST-POS', 'Test Farmer Sales Pos', '9822998877', 'Khed Shivapur', 'Gat No 45, Near Mandi', 50000.00, 0.00, TRUE)
       RETURNING id;`
    );
    customerId = custRes.rows[0].id;
    assert.ok(customerId);

    // Create 2 test products with initial stock
    const p1 = await productRepository.createWithInitialStock(
      {
        code: product1Code,
        name: 'Test POS Product Urea (50kg)',
        categoryId,
        brand: 'Test Brand A',
        packageType: 'Bags',
        packageSize: '50kgs',
        unit: 'Bags (50kgs)',
        costPrice: 400.0,
        price: 500.0,
        minThreshold: 10.0,
      },
      100.0,
      'Initial stock for POS testing'
    );
    product1Id = p1.id;

    const p2 = await productRepository.createWithInitialStock(
      {
        code: product2Code,
        name: 'Test POS Product DAP (50kg)',
        categoryId,
        brand: 'Test Brand B',
        packageType: 'Bags',
        packageSize: '50kgs',
        unit: 'Bags (50kgs)',
        costPrice: 1200.0,
        price: 1350.0,
        minThreshold: 5.0,
      },
      50.0,
      'Initial stock for POS testing'
    );
    product2Id = p2.id;

    assert.ok(product1Id);
    assert.ok(product2Id);
  });

  // =========================================================================
  // 1. AUTHENTICATION & ACCESS CONTROL
  // =========================================================================

  await t.test('GET /api/sales rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/sales`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('GET /api/sales allows authenticated Staff & Admin to list sales with pagination', async () => {
    const res = await fetch(`${baseUrl}/api/sales?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
  });

  await t.test('GET /api/sales/summary returns aggregated sales metrics', async () => {
    const res = await fetch(`${baseUrl}/api/sales/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(typeof body.data.totalSalesCount, 'number');
    assert.strictEqual(typeof body.data.totalSalesAmount, 'number');
    assert.strictEqual(typeof body.data.totalPaidAmount, 'number');
    assert.strictEqual(typeof body.data.totalDueAmount, 'number');
  });

  // =========================================================================
  // 2. POS SALES CREATION & ATOMIC INVENTORY DEDUCTION
  // =========================================================================

  await t.test('POST /api/sales creates walk-in cash sale, deducts inventory, and records stock movement', async () => {
    testWalkInInvoiceNo = 'TEST-INV-WALK-001';

    // Current stock of product 1 is 100. We buy 10 bags.
    const salePayload = {
      invoiceNumber: testWalkInInvoiceNo,
      customerName: 'Ramesh Walk-in Farmer',
      customerPhone: '9811223344',
      customerVillage: 'Local Mandi',
      paymentMethod: 'CASH',
      gstRate: 5.0,
      gstMode: 'EXCLUSIVE',
      items: [
        {
          productId: product1Id,
          quantity: 10,
          unitPrice: 500.0,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify(salePayload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.invoiceNumber, testWalkInInvoiceNo);
    assert.strictEqual(body.data.customerName, 'Ramesh Walk-in Farmer');
    assert.strictEqual(body.data.subtotal, 5000.0);
    assert.strictEqual(body.data.gstRate, 5.0);
    assert.strictEqual(body.data.gstAmount, 250.0);
    assert.strictEqual(body.data.totalAmount, 5250.0);
    assert.strictEqual(body.data.paidAmount, 5250.0);
    assert.strictEqual(body.data.dueAmount, 0.0);
    assert.strictEqual(body.data.paymentStatus, 'PAID');
    assert.strictEqual(body.data.items.length, 1);

    // Verify inventory deduction: 100 - 10 = 90
    const pRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [product1Id]);
    assert.strictEqual(Number(pRes.rows[0].stock), 90.0);

    // Verify stock movement ledger record
    const movRes = await pool.query(
      `SELECT * FROM stock_movements WHERE reference_no = $1 AND product_id = $2;`,
      [testWalkInInvoiceNo, product1Id]
    );
    assert.strictEqual(movRes.rows.length, 1);
    const mov = movRes.rows[0];
    assert.strictEqual(mov.movement_type, 'SALE');
    assert.strictEqual(mov.action_type, 'SELL');
    assert.strictEqual(Number(mov.change_qty), -10.0);
    assert.strictEqual(Number(mov.previous_stock), 100.0);
    assert.strictEqual(Number(mov.new_stock), 90.0);
  });

  await t.test('POST /api/sales calculates TAX-EXCLUSIVE GST correctly on server', async () => {
    // 5 bags of Product 1 @ 500 = 2500 subtotal. 18% GST EXCLUSIVE = 450 GST, total = 2950
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: 'TEST-INV-TAX-EXC',
        customerName: 'Direct Cash Customer',
        paymentMethod: 'UPI',
        gstRate: 18.0,
        gstMode: 'EXCLUSIVE',
        items: [
          {
            productId: product1Id,
            quantity: 5,
            unitPrice: 500.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.subtotal, 2500.0);
    assert.strictEqual(body.data.gstRate, 18.0);
    assert.strictEqual(body.data.gstAmount, 450.0);
    assert.strictEqual(body.data.totalAmount, 2950.0);
    assert.strictEqual(body.data.paidAmount, 2950.0);
    assert.strictEqual(body.data.paymentStatus, 'PAID');
  });

  await t.test('POST /api/sales calculates TAX-INCLUSIVE GST correctly on server', async () => {
    // 1 bag of Product 2 @ 1350 = 1350 gross total. 5% GST INCLUSIVE
    // gstAmount = (1350 * 5) / 105 = 64.29, totalAmount = 1350.00
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: 'TEST-INV-TAX-INC',
        customerName: 'Direct Cash Customer',
        paymentMethod: 'CARD',
        gstRate: 5.0,
        gstMode: 'INCLUSIVE',
        items: [
          {
            productId: product2Id,
            quantity: 1,
            unitPrice: 1350.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.subtotal, 1350.0);
    assert.strictEqual(body.data.gstRate, 5.0);
    assert.strictEqual(body.data.gstAmount, 64.29);
    assert.strictEqual(body.data.totalAmount, 1350.0);
    assert.strictEqual(body.data.paidAmount, 1350.0);
  });

  await t.test('POST /api/sales applies order/item discounts accurately', async () => {
    // 2 bags of Product 1 @ 500 = 1000 subtotal, minus 100 order discount = 900 taxable
    // 5% GST on 900 = 45.00, total = 945.00
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: 'TEST-INV-DISCOUNT',
        customerName: 'Direct Cash Customer',
        paymentMethod: 'CASH',
        discount: 100.0,
        gstRate: 5.0,
        gstMode: 'EXCLUSIVE',
        items: [
          {
            productId: product1Id,
            quantity: 2,
            unitPrice: 500.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.subtotal, 900.0);
    assert.strictEqual(body.data.gstAmount, 45.0);
    assert.strictEqual(body.data.totalAmount, 945.0);
  });

  // =========================================================================
  // 3. VALIDATIONS, ERROR HANDLING & WALK-IN RESTRICTIONS
  // =========================================================================

  await t.test('POST /api/sales rejects missing/empty items array with 422/400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerName: 'Walk-in Farmer',
        items: [],
      }),
    });

    assert.ok(res.status === 400 || res.status === 422);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('POST /api/sales rejects non-existent product identifier with 404/400', async () => {
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerName: 'Walk-in Farmer',
        items: [
          {
            productId: '00000000-0000-0000-0000-000000000000',
            quantity: 1,
            unitPrice: 100.0,
          },
        ],
      }),
    });

    assert.ok(res.status === 404 || res.status === 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('POST /api/sales rejects insufficient stock with 400 Bad Request', async () => {
    // Current stock of Product 2 is 49. Attempting to sell 1000 bags.
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerName: 'Walk-in Farmer',
        items: [
          {
            productId: product2Id,
            quantity: 1000,
            unitPrice: 1350.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Insufficient stock/i);
  });

  await t.test('POST /api/sales rejects walk-in customer attempt to buy on credit (Khata) with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerName: 'Anonymous Walk-in Customer',
        paymentMethod: 'CREDIT (KHATA)',
        items: [
          {
            productId: product1Id,
            quantity: 1,
            unitPrice: 500.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Credit \(Khata\) sales require a registered customer account/i);
  });

  // =========================================================================
  // 4. REGISTERED CUSTOMER KHATA CREDIT SALES & PAYMENT RECEIPTS
  // =========================================================================

  await t.test('POST /api/sales supports registered customer Khata credit sale with PARTIAL payment and logs payment receipt', async () => {
    testCreditInvoiceNo = 'TEST-INV-KHATA-001';

    // 4 bags of Product 1 @ 500 = 2000. 5% GST = 100. Total = 2100.
    // Farmer pays 600 down payment, remaining 1500 goes to Khata debt.
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: testCreditInvoiceNo,
        customerId,
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 600.0,
        gstRate: 5.0,
        gstMode: 'EXCLUSIVE',
        items: [
          {
            productId: product1Id,
            quantity: 4,
            unitPrice: 500.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.invoiceNumber, testCreditInvoiceNo);
    assert.strictEqual(body.data.customerId, customerId);
    assert.strictEqual(body.data.totalAmount, 2100.0);
    assert.strictEqual(body.data.paidAmount, 600.0);
    assert.strictEqual(body.data.dueAmount, 1500.0);
    assert.strictEqual(body.data.paymentStatus, 'PARTIAL');

    // Verify initial receipt recorded in payments table
    const payRes = await pool.query(
      `SELECT * FROM payments WHERE customer_id = $1 AND sale_id = $2;`,
      [customerId, body.data.id]
    );
    assert.strictEqual(payRes.rows.length, 1);
    assert.strictEqual(Number(payRes.rows[0].amount), 600.0);

    // Verify customer's real-time Khata balance from view v_customer_balances
    const custBalRes = await pool.query(
      `SELECT total_purchases, total_paid, outstanding_dues FROM v_customer_balances WHERE customer_id = $1;`,
      [customerId]
    );
    assert.strictEqual(custBalRes.rows.length, 1);
    const bal = custBalRes.rows[0];
    assert.strictEqual(Number(bal.total_purchases), 2100.0);
    assert.strictEqual(Number(bal.total_paid), 600.0);
    assert.strictEqual(Number(bal.outstanding_dues), 1500.0);
  });

  await t.test('POST /api/sales supports registered customer Khata credit sale with full UNPAID status', async () => {
    // 2 bags of Product 1 @ 500 = 1000. 5% GST = 50. Total = 1050. Paid = 0.
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: 'TEST-INV-KHATA-002',
        customerId,
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 0.0,
        gstRate: 5.0,
        gstMode: 'EXCLUSIVE',
        items: [
          {
            productId: product1Id,
            quantity: 2,
            unitPrice: 500.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.totalAmount, 1050.0);
    assert.strictEqual(body.data.paidAmount, 0.0);
    assert.strictEqual(body.data.dueAmount, 1050.0);
    assert.strictEqual(body.data.paymentStatus, 'UNPAID');

    // Customer dues should now be 1500 (prior) + 1050 = 2550.00
    const custBalRes = await pool.query(
      `SELECT outstanding_dues FROM v_customer_balances WHERE customer_id = $1;`,
      [customerId]
    );
    assert.strictEqual(Number(custBalRes.rows[0].outstanding_dues), 2550.0);
  });

  await t.test('POST /api/sales rejects duplicate invoice number with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: testWalkInInvoiceNo, // Already used earlier
        customerName: 'Duplicate Attempt',
        items: [
          {
            productId: product1Id,
            quantity: 1,
            unitPrice: 500.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already exists/i);
  });

  await t.test('POST /api/sales auto-generates unique sequential invoice number when omitted', async () => {
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerName: 'Walk-in Cash Customer Auto Inv',
        paymentMethod: 'CASH',
        items: [
          {
            productId: product1Id,
            quantity: 1,
            unitPrice: 500.0,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.invoiceNumber);
    assert.match(body.data.invoiceNumber, /^INV-\d{8}-\d{4}$/);

    // Clean up auto-generated invoice
    await pool.query('DELETE FROM sale_items WHERE sale_id = $1;', [body.data.id]);
    await pool.query('DELETE FROM sales WHERE id = $1;', [body.data.id]);
  });

  // =========================================================================
  // 5. INVOICE DETAIL & PRINT RETRIEVAL
  // =========================================================================

  await t.test('GET /api/sales/:id retrieves print-ready bill with line items, store details, and customer info', async () => {
    const res = await fetch(`${baseUrl}/api/sales/${testCreditInvoiceNo}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.invoiceNumber, testCreditInvoiceNo);
    assert.strictEqual(body.data.customerName, 'Test Farmer Sales Pos');
    assert.ok(body.data.store);
    assert.ok(body.data.store.storeName);
    assert.ok(body.data.customer);
    assert.strictEqual(body.data.customer.customerCode, 'TEST-CUST-POS');
    assert.strictEqual(body.data.items.length, 1);
    assert.strictEqual(body.data.items[0].productCode, product1Code);
    assert.strictEqual(body.data.payments.length, 1);
  });

  // =========================================================================
  // 6. DATE-FILTERED SALES HISTORY
  // =========================================================================

  await t.test('GET /api/sales filters by date range accurately', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${baseUrl}/api/sales?startDate=${today}&endDate=${today}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2);
  });

  // =========================================================================
  // 7. ATOMIC ROLLBACK & CONCURRENCY INTEGRITY
  // =========================================================================

  await t.test('Atomic transaction rollback: if line item has insufficient stock or fails, NO sale, stock change, or movement is saved', async () => {
    const p1BeforeRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [product1Id]);
    const p2BeforeRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [product2Id]);
    const p1StockBefore = Number(p1BeforeRes.rows[0].stock);
    const p2StockBefore = Number(p2BeforeRes.rows[0].stock);

    const failPayload = {
      invoiceNumber: 'TEST-ROLLBACK-FAIL-01',
      customerName: 'Rollback Tester',
      paymentMethod: 'CASH',
      items: [
        {
          productId: product1Id,
          quantity: 5, // Valid
          unitPrice: 500.0,
        },
        {
          productId: product2Id,
          quantity: 9999, // Insufficient!
          unitPrice: 1350.0,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify(failPayload),
    });

    assert.strictEqual(res.status, 400);

    // Verify product stock did NOT change
    const p1AfterRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [product1Id]);
    const p2AfterRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [product2Id]);
    assert.strictEqual(Number(p1AfterRes.rows[0].stock), p1StockBefore);
    assert.strictEqual(Number(p2AfterRes.rows[0].stock), p2StockBefore);

    // Verify no sales or movement records exist
    const saleCheck = await pool.query("SELECT id FROM sales WHERE invoice_number = 'TEST-ROLLBACK-FAIL-01';");
    assert.strictEqual(saleCheck.rows.length, 0);

    const movCheck = await pool.query("SELECT id FROM stock_movements WHERE reference_no = 'TEST-ROLLBACK-FAIL-01';");
    assert.strictEqual(movCheck.rows.length, 0);
  });

  // =========================================================================
  // 8. DOUBLE-ENTRY PHYSICAL RECONCILIATION AFTER SALES
  // =========================================================================

  await t.test('Double-entry physical reconciliation confirms 0 discrepancy for products after customer sales', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/reconciliation/${product1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.productCode, product1Code);
    assert.strictEqual(body.data.discrepancy, 0);
    assert.strictEqual(body.data.status, 'RECONCILED');
  });

  // =========================================================================
  // 9. TEARDOWN
  // =========================================================================

  await t.test('Teardown: clean test records and close server & database pool', async () => {
    const testSalesQuery = `SELECT id FROM sales WHERE invoice_number LIKE 'TEST-%' OR id IN (SELECT sale_id FROM sale_items WHERE product_id IN (SELECT id FROM products WHERE code LIKE 'TEST-POS-%'))`;
    await pool.query(`DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE name = 'Test Farmer Sales Pos') OR sale_id IN (${testSalesQuery});`);
    await pool.query(`DELETE FROM sale_items WHERE sale_id IN (${testSalesQuery}) OR product_id IN (SELECT id FROM products WHERE code LIKE 'TEST-POS-%');`);
    await pool.query(`DELETE FROM sales WHERE id IN (${testSalesQuery});`);
    await pool.query("DELETE FROM stock_movements WHERE product_code LIKE 'TEST-POS-%';");
    await pool.query("DELETE FROM products WHERE code LIKE 'TEST-POS-%';");
    await pool.query("DELETE FROM customers WHERE name = 'Test Farmer Sales Pos';");

    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
