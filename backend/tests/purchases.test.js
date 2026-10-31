const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const { pool, closePool } = require('../src/config/db');
const { resetRateLimit } = require('../src/middleware/rateLimiter');
const productRepository = require('../src/repositories/product.repository');

test('Phase 11 Purchase Workflow & Supplier Invoices API Test Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let supplierId;
  let product1Id;
  let product2Id;
  const product1Code = 'TEST-PUR-P01';
  const product2Code = 'TEST-PUR-P02';
  let categoryId;
  let testPurchaseId;
  let testPartialPurchaseId;

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
    await pool.query("DELETE FROM supplier_payments WHERE supplier_id IN (SELECT id FROM suppliers WHERE name = 'Test Wholesale Agri Corp');");
    await pool.query("DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE purchase_invoice_no LIKE 'TEST-%');");
    await pool.query("DELETE FROM purchases WHERE purchase_invoice_no LIKE 'TEST-%';");
    await pool.query("DELETE FROM stock_movements WHERE product_code LIKE 'TEST-PUR-%';");
    await pool.query("DELETE FROM products WHERE code LIKE 'TEST-PUR-%';");
    await pool.query("DELETE FROM suppliers WHERE name = 'Test Wholesale Agri Corp';");


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

    // Create test supplier
    const suppRes = await pool.query(
      `INSERT INTO suppliers (name, contact_person, phone, email, address, is_active)
       VALUES ('Test Wholesale Agri Corp', 'Mahesh Patil', '9822334455', 'sales@testagricorp.local', 'Plot 12, MIDC Kurkumbh', TRUE)
       RETURNING id;`
    );
    supplierId = suppRes.rows[0].id;
    assert.ok(supplierId);

    // Create 2 test products with initial stock
    const p1 = await productRepository.createWithInitialStock(
      {
        code: product1Code,
        name: 'Test Purchase Product Alpha (50kg)',
        categoryId,
        brand: 'Test Brand A',
        packageType: 'Bags',
        packageSize: '50kgs',
        unit: 'Bags (50kgs)',
        costPrice: 400.0,
        price: 480.0,
        minThreshold: 10.0,
      },
      10.0
    );
    product1Id = p1.id;

    const p2 = await productRepository.createWithInitialStock(
      {
        code: product2Code,
        name: 'Test Purchase Product Beta (1L)',
        categoryId,
        brand: 'Test Brand B',
        packageType: 'Bottles',
        packageSize: '1L',
        unit: 'Bottles (1L)',
        costPrice: 250.0,
        price: 320.0,
        minThreshold: 15.0,
      },
      20.0
    );
    product2Id = p2.id;

    assert.ok(product1Id);
    assert.ok(product2Id);
  });

  // =========================================================================
  // 1. PURCHASE SUMMARY & LISTING
  // =========================================================================

  await t.test('GET /api/purchases/summary returns aggregate accounts payable metrics', async () => {
    const res = await fetch(`${baseUrl}/api/purchases/summary`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.data.totalPurchasesCount === 'number');
    assert.ok(typeof body.data.totalPurchasesAmount === 'number');
    assert.ok(typeof body.data.totalPaidAmount === 'number');
    assert.ok(typeof body.data.totalDueAmount === 'number');
  });

  await t.test('GET /api/purchases returns paginated purchase orders list', async () => {
    const res = await fetch(`${baseUrl}/api/purchases?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
  });

  // =========================================================================
  // 2. PURCHASE CREATION & ATOMIC INVENTORY STOCK INWARD
  // =========================================================================

  await t.test('POST /api/purchases creates purchase order, records line items, and increases stock atomically', async () => {
    const purchasePayload = {
      supplierId,
      purchaseInvoiceNo: 'TEST-PUR-INV-001',
      items: [
        {
          productId: product1Id,
          quantity: 15.0,
          unitCost: 420.0,
          unit: 'Bags (50kgs)',
        },
        {
          productId: product2Id,
          quantity: 10.0,
          unitCost: 260.0,
          unit: 'Bottles (1L)',
        },
      ],
      totalAmount: 8900.0, // (15 * 420 = 6300) + (10 * 260 = 2600) = 8900
      paidAmount: 8900.0,
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Wholesale batch delivery from Test Wholesale Agri Corp',
    };

    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify(purchasePayload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.purchaseInvoiceNo, 'TEST-PUR-INV-001');
    assert.strictEqual(body.data.supplierId, supplierId);
    assert.strictEqual(body.data.totalAmount, 8900.0);
    assert.strictEqual(body.data.paidAmount, 8900.0);
    assert.strictEqual(body.data.dueAmount, 0.0);
    assert.strictEqual(body.data.lifecycleStatus, 'RECEIVED');
    assert.strictEqual(body.data.paymentStatus, 'PAID');
    assert.strictEqual(body.data.items.length, 2);

    testPurchaseId = body.data.id;
    assert.ok(testPurchaseId);

    // Verify physical warehouse stock was increased in products table
    const prod1Res = await pool.query('SELECT stock, cost_price FROM products WHERE id = $1;', [product1Id]);
    assert.strictEqual(Number(prod1Res.rows[0].stock), 25.0); // 10 + 15 = 25
    assert.strictEqual(Number(prod1Res.rows[0].cost_price), 420.0); // updated to newest purchase cost

    const prod2Res = await pool.query('SELECT stock, cost_price FROM products WHERE id = $1;', [product2Id]);
    assert.strictEqual(Number(prod2Res.rows[0].stock), 30.0); // 20 + 10 = 30
    assert.strictEqual(Number(prod2Res.rows[0].cost_price), 260.0);

    // Verify stock_movements audit ledger entries were created
    const movRes = await pool.query(
      `SELECT * FROM stock_movements 
       WHERE reference_no = 'TEST-PUR-INV-001' AND movement_type = 'PURCHASE';`
    );
    assert.strictEqual(movRes.rows.length, 2);

    const m1 = movRes.rows.find((m) => m.product_id === product1Id);
    assert.ok(m1);
    assert.strictEqual(m1.action_type, 'ADDED');
    assert.strictEqual(Number(m1.change_qty), 15.0);
    assert.strictEqual(Number(m1.previous_stock), 10.0);
    assert.strictEqual(Number(m1.new_stock), 25.0);

    const m2 = movRes.rows.find((m) => m.product_id === product2Id);
    assert.ok(m2);
    assert.strictEqual(m2.action_type, 'ADDED');
    assert.strictEqual(Number(m2.change_qty), 10.0);
    assert.strictEqual(Number(m2.previous_stock), 20.0);
    assert.strictEqual(Number(m2.new_stock), 30.0);


    // Verify initial supplier payment record created
    const payRes = await pool.query('SELECT * FROM supplier_payments WHERE purchase_id = $1;', [testPurchaseId]);
    assert.strictEqual(payRes.rows.length, 1);
    assert.strictEqual(Number(payRes.rows[0].amount), 8900.0);
    assert.strictEqual(payRes.rows[0].payment_method, 'BANK_TRANSFER');
  });

  // =========================================================================
  // 3. AUTHORIZATION & VALIDATION REJECTIONS
  // =========================================================================

  await t.test('POST /api/purchases rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId,
        items: [{ productId: product1Id, quantity: 5, unitCost: 400 }],
      }),
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test('POST /api/purchases rejects missing supplier with 400/422 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: product1Id, quantity: 5, unitCost: 400 }],
      }),
    });
    assert.ok(res.status === 400 || res.status === 422);
  });

  await t.test('POST /api/purchases rejects empty items array with 400/422 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        supplierId,
        items: [],
      }),
    });
    assert.ok(res.status === 400 || res.status === 422);
  });

  await t.test('POST /api/purchases rejects non-existent product identifier with 404/400', async () => {
    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        supplierId,
        items: [
          {
            productId: '00000000-0000-0000-0000-000000000000',
            quantity: 5,
            unitCost: 400,
          },
        ],
      }),
    });
    assert.ok(res.status === 404 || res.status === 400);
  });

  await t.test('POST /api/purchases rejects duplicate invoice number with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        supplierId,
        purchaseInvoiceNo: 'TEST-PUR-INV-001', // Already created above
        items: [{ productId: product1Id, quantity: 5, unitCost: 400 }],
      }),
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already exists/i);
  });

  // =========================================================================
  // 4. DECOUPLED STATUSES (UNPAID, PARTIAL, AP DISBURSEMENTS)
  // =========================================================================

  await t.test('POST /api/purchases supports PARTIAL payment status and creates outstanding accounts payable due', async () => {
    const partialPayload = {
      supplierId,
      purchaseInvoiceNo: 'TEST-PUR-INV-002',
      items: [
        {
          productId: product1Id,
          quantity: 10.0,
          unitCost: 400.0,
        },
      ],
      totalAmount: 4000.0,
      paidAmount: 1500.0, // Partial payment
      paymentMethod: 'CHEQUE',
      notes: 'Partial payment on delivery, remainder on 30-day supplier credit terms',
    };

    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(partialPayload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.totalAmount, 4000.0);
    assert.strictEqual(body.data.paidAmount, 1500.0);
    assert.strictEqual(body.data.dueAmount, 2500.0);
    assert.strictEqual(body.data.lifecycleStatus, 'RECEIVED');
    assert.strictEqual(body.data.paymentStatus, 'PARTIAL');

    testPartialPurchaseId = body.data.id;
    assert.ok(testPartialPurchaseId);
  });

  await t.test('POST /api/purchases/:id/payments records subsequent supplier payment and updates due amount', async () => {
    // Current due is 2500; disburse 1500
    const res = await fetch(`${baseUrl}/api/purchases/${testPartialPurchaseId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amount: 1500.0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: 'NEFT-123456789',
        notes: 'Second installment paid via NEFT bank transfer',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.purchase.paidAmount, 3000.0); // 1500 + 1500 = 3000
    assert.strictEqual(body.data.purchase.dueAmount, 1000.0); // 4000 - 3000 = 1000
    assert.strictEqual(body.data.purchase.paymentStatus, 'PARTIAL');
    assert.strictEqual(body.data.payment.amount, 1500.0);
  });

  await t.test('POST /api/purchases/:id/payments clears remaining balance and transitions status to PAID', async () => {
    // Current due is 1000; disburse final 1000
    const res = await fetch(`${baseUrl}/api/purchases/${testPartialPurchaseId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amount: 1000.0,
        paymentMethod: 'UPI',
        referenceNo: 'UPI-REF-998877',
        notes: 'Final settlement via UPI',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.purchase.paidAmount, 4000.0);
    assert.strictEqual(body.data.purchase.dueAmount, 0.0);
    assert.strictEqual(body.data.purchase.paymentStatus, 'PAID');
  });

  await t.test('POST /api/purchases/:id/payments rejects payment when invoice is already fully paid with 400', async () => {
    // Due is now 0.0; attempt to pay 500
    const res = await fetch(`${baseUrl}/api/purchases/${testPartialPurchaseId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amount: 500.0,
        paymentMethod: 'CASH',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /already fully paid/i);
  });

  await t.test('GET /api/purchases/:id/payments returns all disbursement receipts for the invoice', async () => {
    const res = await fetch(`${baseUrl}/api/purchases/${testPartialPurchaseId}/payments`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 3); // initial (1500) + installment 2 (1500) + final (1000) = 3
  });

  // =========================================================================
  // 5. DETAIL RETRIEVAL & FILTERING
  // =========================================================================

  await t.test('GET /api/purchases/:id retrieves purchase with item breakdown and SKU codes', async () => {
    const res = await fetch(`${baseUrl}/api/purchases/${testPurchaseId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.id, testPurchaseId);
    assert.strictEqual(body.data.purchaseInvoiceNo, 'TEST-PUR-INV-001');
    assert.strictEqual(body.data.items.length, 2);
    const item1 = body.data.items.find((i) => i.productCode === product1Code);
    const item2 = body.data.items.find((i) => i.productCode === product2Code);
    assert.ok(item1);
    assert.ok(item2);
  });

  // =========================================================================
  // 6. ATOMIC TRANSACTION ROLLBACK VERIFICATION
  // =========================================================================

  await t.test('Atomic transaction rollback: if line item fails, NO purchase, stock, or movement is created', async () => {
    // Current stock of product 1 before failed transaction
    const initialProdRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [product1Id]);
    const initialStock = Number(initialProdRes.rows[0].stock);

    const initialPurchaseCountRes = await pool.query('SELECT COUNT(*)::INTEGER AS count FROM purchases;');
    const initialPurchaseCount = initialPurchaseCountRes.rows[0].count;

    const initialMovementCountRes = await pool.query('SELECT COUNT(*)::INTEGER AS count FROM stock_movements;');
    const initialMovementCount = initialMovementCountRes.rows[0].count;

    // Send payload with 1 valid product and 1 invalid non-existent product
    const failingPayload = {
      supplierId,
      purchaseInvoiceNo: 'TEST-ROLLBACK-FAIL-01',
      items: [
        {
          productId: product1Id,
          quantity: 20.0,
          unitCost: 400.0,
        },
        {
          productId: '00000000-0000-0000-0000-000000000000', // Invalid product
          quantity: 10.0,
          unitCost: 300.0,
        },
      ],
      totalAmount: 11000.0,
    };

    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(failingPayload),
    });

    assert.ok(res.status === 404 || res.status === 400);

    // Verify purchases count did NOT increase
    const afterPurchaseCountRes = await pool.query('SELECT COUNT(*)::INTEGER AS count FROM purchases;');
    assert.strictEqual(afterPurchaseCountRes.rows[0].count, initialPurchaseCount);

    // Verify stock_movements count did NOT increase
    const afterMovementCountRes = await pool.query('SELECT COUNT(*)::INTEGER AS count FROM stock_movements;');
    assert.strictEqual(afterMovementCountRes.rows[0].count, initialMovementCount);

    // Verify product 1 stock was NOT modified
    const afterProdRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [product1Id]);
    assert.strictEqual(Number(afterProdRes.rows[0].stock), initialStock);
  });

  // =========================================================================
  // 7. DOUBLE-ENTRY PHYSICAL RECONCILIATION AFTER PURCHASES
  // =========================================================================

  await t.test('Double-entry physical reconciliation confirms 0 discrepancy for products after purchase inward', async () => {
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
  // 8. TEARDOWN
  // =========================================================================

  await t.test('Teardown: clean test records and close server & database pool', async () => {
    await pool.query("DELETE FROM supplier_payments WHERE supplier_id IN (SELECT id FROM suppliers WHERE name = 'Test Wholesale Agri Corp');");
    await pool.query("DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE purchase_invoice_no LIKE 'TEST-%');");
    await pool.query("DELETE FROM purchases WHERE purchase_invoice_no LIKE 'TEST-%';");
    await pool.query("DELETE FROM stock_movements WHERE product_code LIKE 'TEST-PUR-%';");
    await pool.query("DELETE FROM products WHERE code LIKE 'TEST-PUR-%';");
    await pool.query("DELETE FROM suppliers WHERE name = 'Test Wholesale Agri Corp';");


    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
