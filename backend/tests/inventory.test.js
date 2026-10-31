const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const { pool, closePool } = require('../src/config/db');
const { resetRateLimit } = require('../src/middleware/rateLimiter');
const productRepository = require('../src/repositories/product.repository');

test('Phase 10 Inventory & Stock Movements API Test Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let testProductId;
  let testProductCode = 'TEST-INV-01';
  let categoryId;

  await t.test('Setup: HTTP server starts on an ephemeral port, logs in Admin & Staff, and seeds test product', async () => {
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
    await pool.query("DELETE FROM stock_movements WHERE product_code LIKE 'TEST-%' OR reference_no LIKE 'TEST-%' OR reference_no LIKE 'ADJ-%';");
    await pool.query("DELETE FROM products WHERE code LIKE 'TEST-%';");

    // Fetch an active category
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

    // Create a dedicated test product with 50 units initial stock
    const created = await productRepository.createWithInitialStock(
      {
        code: testProductCode,
        name: 'Test Fertilizer Granules 50kg',
        categoryId,
        brand: 'Test Brand',
        packageType: 'Bags',
        packageSize: '50kgs',
        unit: 'Bags (50kgs)',
        costPrice: 500.0,
        price: 600.0,
        minThreshold: 20.0,
        description: 'Test inventory product',
      },
      50.0
    );
    testProductId = created.id;
    assert.ok(testProductId);
    assert.strictEqual(Number(created.stock), 50.0);
  });

  // =========================================================================
  // 1. INVENTORY SUMMARY & MOVEMENTS QUERY
  // =========================================================================

  await t.test('GET /api/inventory/summary returns aggregate warehouse stock metrics', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/summary`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.data.totalProducts === 'number');
    assert.ok(typeof body.data.totalAvailableStock === 'number');
    assert.ok(typeof body.data.lowStockCount === 'number');
    assert.ok(typeof body.data.outOfStockCount === 'number');
    assert.ok(typeof body.data.inStockCount === 'number');
  });

  await t.test('GET /api/inventory/movements returns paginated audit history', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/movements?page=1&limit=10`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.limit, 10);
  });

  await t.test('GET /api/inventory/movements filtered by productId returns test product opening movement', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/movements?productId=${testProductId}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 1);
    const mov = body.data[0];
    assert.strictEqual(mov.productCode, testProductCode);
    assert.strictEqual(mov.type, 'OPENING_STOCK');
    assert.strictEqual(mov.changeQty, 50);
    assert.strictEqual(mov.newStock, 50);
  });

  // =========================================================================
  // 2. STOCK ADJUSTMENT VALIDATIONS & OPERATIONS
  // =========================================================================

  await t.test('POST /api/inventory/adjustments rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'ADD',
        quantity: 10,
        reason: 'Missing token',
      }),
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test('POST /api/inventory/adjustments rejects missing reason with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'ADD',
        quantity: 10,
        reason: '   ', // whitespace only
      }),
    });
    assert.ok(res.status === 400 || res.status === 422);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /reason is mandatory|validation failed/i);
  });

  await t.test('POST /api/inventory/adjustments rejects invalid operation with 400/422 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'INVALID_OP',
        quantity: 10,
        reason: 'Testing invalid operation',
      }),
    });
    assert.ok(res.status === 400 || res.status === 422);
  });

  await t.test('POST /api/inventory/adjustments rejects invalid or negative quantities with 400/422 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'ADD',
        quantity: -15,
        reason: 'Testing negative quantity',
      }),
    });
    assert.ok(res.status === 400 || res.status === 422);
  });

  await t.test('POST /api/inventory/adjustments executes ADD operation and creates immutable movement record', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'ADD',
        quantity: 25,
        reason: 'Wholesale batch delivery verified',
        reference: 'TEST-ADJ-ADD-01',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(Number(body.data.product.stock), 75.0);
    assert.strictEqual(body.data.movement.changeQty, 25);
    assert.strictEqual(body.data.movement.previousStock, 50);
    assert.strictEqual(body.data.movement.newStock, 75);
    assert.strictEqual(body.data.movement.actionType, 'ADDED');
    assert.match(body.data.movement.reason, /Wholesale batch delivery verified/);
    assert.match(body.data.movement.reason, /Auth:/); // User attribution verified
  });

  await t.test('POST /api/inventory/adjustments executes REDUCE operation and decreases stock', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'REDUCE',
        quantity: 15,
        reason: 'Damaged packaging during storage',
        reference: 'TEST-ADJ-RED-01',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(Number(body.data.product.stock), 60.0);
    assert.strictEqual(body.data.movement.changeQty, -15);
    assert.strictEqual(body.data.movement.previousStock, 75);
    assert.strictEqual(body.data.movement.newStock, 60);
    assert.strictEqual(body.data.movement.actionType, 'UPDATE');
  });

  await t.test('POST /api/inventory/adjustments prevents negative stock and rejects overselling with 400 Bad Request', async () => {
    // Current stock is 60; attempt to reduce 100 units
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'REDUCE',
        quantity: 100,
        reason: 'Excessive stock deduction beyond warehouse inventory',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Insufficient stock/i);
    assert.match(body.message, /Negative stock is not permitted/i);

    // Verify stock was NOT altered
    const prodRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [testProductId]);
    assert.strictEqual(Number(prodRes.rows[0].stock), 60.0);
  });

  await t.test('POST /api/inventory/adjustments executes CORRECT operation to set absolute stock', async () => {
    // Correct stock to exactly 40.0
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'CORRECT',
        quantity: 40,
        reason: 'Physical month-end stock count adjustment',
        reference: 'TEST-ADJ-COR-01',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(Number(body.data.product.stock), 40.0);
    assert.strictEqual(body.data.movement.changeQty, -20); // 60 -> 40 = -20
    assert.strictEqual(body.data.movement.previousStock, 60);
    assert.strictEqual(body.data.movement.newStock, 40);
  });

  // =========================================================================
  // 3. IDEMPOTENCY & DUPLICATE PREVENTION
  // =========================================================================

  await t.test('POST /api/inventory/adjustments rejects duplicate movement reference with 409 Conflict', async () => {
    // Attempt to replay previous adjustment with exact same reference
    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'ADD',
        quantity: 25,
        reason: 'Accidental retry of wholesale batch delivery',
        reference: 'TEST-ADJ-ADD-01', // already used above
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Duplicate stock movement detected/i);
  });

  // =========================================================================
  // 4. INWARD & OUTWARD STOCK MOVEMENTS
  // =========================================================================

  await t.test('POST /api/inventory/inward records stock receiving with source PO reference', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/inward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        quantity: 30,
        reason: 'Received inward from distributor truck #MH-12-AB-1234',
        reference: 'PO-TEST-INW-01',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(Number(body.data.product.stock), 70.0); // 40 + 30
    assert.strictEqual(body.data.movement.movementType, 'PURCHASE');
    assert.strictEqual(body.data.movement.actionType, 'ADDED');
  });

  await t.test('POST /api/inventory/outward records stock dispatch', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/outward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        quantity: 20,
        reason: 'Dispatched for agricultural cooperative bulk order',
        reference: 'DISP-TEST-OUT-01',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(Number(body.data.product.stock), 50.0); // 70 - 20
    assert.strictEqual(body.data.movement.changeQty, -20);
  });

  await t.test('POST /api/inventory/outward rejects dispatch exceeding stock with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/outward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        quantity: 200,
        reason: 'Attempted overselling beyond available stock',
        reference: 'DISP-OVERSELL-FAIL',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Insufficient stock/i);
  });

  // =========================================================================
  // 5. LOW STOCK QUERIES
  // =========================================================================

  await t.test('GET /api/inventory/low-stock returns products at or below threshold', async () => {
    // Product threshold is 20, current stock is 50.
    // Query with threshold override = 60 so our test product is included
    const res = await fetch(`${baseUrl}/api/inventory/low-stock?threshold=60`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.summary);
    assert.ok(body.pagination);

    const found = body.data.find((p) => p.code === testProductCode);
    assert.ok(found);
    assert.strictEqual(found.stock, 50);
  });

  // =========================================================================
  // 6. INVENTORY VALUATION
  // =========================================================================

  await t.test('GET /api/inventory/valuation rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/valuation`);
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/inventory/valuation returns approved cost price valuation breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/valuation`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary);
    assert.ok(body.summary.totalCostValuation >= 0);
    assert.ok(body.summary.totalRetailValuation >= 0);
    assert.ok(body.summary.potentialProfit >= 0);
    assert.strictEqual(body.summary.valuationMethod, 'COST_PRICE_FIFO_EQUIVALENT');

    // Find test product in valuation list
    const found = body.data.find((p) => p.productCode === testProductCode);
    assert.ok(found);
    assert.strictEqual(found.stock, 50);
    assert.strictEqual(found.costPrice, 500);
    assert.strictEqual(found.sellingPrice, 600);
    assert.strictEqual(found.totalCostValuation, 25000); // 50 * 500
    assert.strictEqual(found.totalRetailValuation, 30000); // 50 * 600
    assert.strictEqual(found.potentialProfit, 5000); // 30000 - 25000
  });

  // =========================================================================
  // 7. DOUBLE-ENTRY PHYSICAL RECONCILIATION
  // =========================================================================

  await t.test('GET /api/inventory/reconciliation confirms zero discrepancy between physical stock and movement ledger', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/reconciliation`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary);
    assert.strictEqual(body.summary.systemStatus, 'BALANCED');
    assert.strictEqual(body.summary.discrepancyCount, 0);

    // Verify test product specifically
    const found = body.data.find((p) => p.productCode === testProductCode);
    assert.ok(found);
    assert.strictEqual(found.currentPhysicalStock, 50);
    assert.strictEqual(found.movementLedgerSum, 50);
    assert.strictEqual(found.discrepancy, 0);
    assert.strictEqual(found.status, 'RECONCILED');
  });

  await t.test('GET /api/inventory/reconciliation/:productId returns single product audit status', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/reconciliation/${testProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.productCode, testProductCode);
    assert.strictEqual(body.data.discrepancy, 0);
    assert.strictEqual(body.data.status, 'RECONCILED');
  });

  // =========================================================================
  // 8. CONCURRENCY & ROW LOCKING (PREVENTS OVERSELLING)
  // =========================================================================

  await t.test('Row lock concurrency controls prevent race condition overselling under parallel reduction requests', async () => {
    // Create a product with exact stock = 20.0
    const concCode = 'TEST-CONC-01';
    const concProd = await productRepository.createWithInitialStock(
      {
        code: concCode,
        name: 'Concurrent Stock Race Protection Test Product',
        categoryId,
        brand: 'Lock Test',
        packageType: 'Bags',
        packageSize: '50kgs',
        unit: 'Bags (50kgs)',
        costPrice: 100.0,
        price: 150.0,
        minThreshold: 5.0,
      },
      20.0
    );

    // Fire 5 concurrent reduction requests of 10.0 units each in parallel
    // Available stock is 20.0, so exactly 2 requests must succeed and 3 must fail.
    const reductionPromises = [1, 2, 3, 4, 5].map((i) =>
      fetch(`${baseUrl}/api/inventory/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          productId: concProd.id,
          operation: 'REDUCE',
          quantity: 10.0,
          reason: `Concurrent reduction test worker #${i}`,
          reference: `CONC-REF-${i}-${Date.now()}`,
        }),
      })
    );

    const responses = await Promise.all(reductionPromises);
    const statusCodes = responses.map((r) => r.status);

    const successCount = statusCodes.filter((s) => s === 201).length;
    const failureCount = statusCodes.filter((s) => s === 400).length;

    assert.strictEqual(successCount, 2, 'Exactly 2 reduction operations must succeed for 20 units total');
    assert.strictEqual(failureCount, 3, 'Remaining 3 reduction operations must fail with 400 Bad Request');

    // Verify physical stock in database is exactly 0.000 (never negative)
    const finalProd = await pool.query('SELECT stock FROM products WHERE id = $1;', [concProd.id]);
    assert.strictEqual(Number(finalProd.rows[0].stock), 0.0);

    // Verify double-entry reconciliation remains balanced for the concurrent product
    const reconcRes = await fetch(`${baseUrl}/api/inventory/reconciliation/${concProd.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reconcBody = await reconcRes.json();
    assert.strictEqual(reconcBody.data.currentPhysicalStock, 0);
    assert.strictEqual(reconcBody.data.movementLedgerSum, 0);
    assert.strictEqual(reconcBody.data.discrepancy, 0);
    assert.strictEqual(reconcBody.data.status, 'RECONCILED');

    // Clean up concurrent test product
    await pool.query("DELETE FROM stock_movements WHERE product_code = $1;", [concCode]);
    await pool.query("DELETE FROM products WHERE code = $1;", [concCode]);
  });

  // =========================================================================
  // 9. ATOMIC TRANSACTION ROLLBACK VERIFICATION
  // =========================================================================

  await t.test('Database transaction rolls back cleanly if any constraint fails, leaving no orphaned movement records', async () => {
    const initialMovementCountRes = await pool.query(
      'SELECT COUNT(*)::INTEGER AS count FROM stock_movements WHERE product_id = $1;',
      [testProductId]
    );
    const initialMovementCount = initialMovementCountRes.rows[0].count;

    const initialStockRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [testProductId]);
    const initialStock = Number(initialStockRes.rows[0].stock);

    // Attempt invalid reduction that violates stock constraint
    const failRes = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        operation: 'REDUCE',
        quantity: 99999, // Impossible quantity
        reason: 'Rollback verification test',
      }),
    });

    assert.strictEqual(failRes.status, 400);

    // Verify movement count was NOT incremented (no orphaned records)
    const afterMovementCountRes = await pool.query(
      'SELECT COUNT(*)::INTEGER AS count FROM stock_movements WHERE product_id = $1;',
      [testProductId]
    );
    assert.strictEqual(afterMovementCountRes.rows[0].count, initialMovementCount);

    // Verify stock is unchanged
    const afterStockRes = await pool.query('SELECT stock FROM products WHERE id = $1;', [testProductId]);
    assert.strictEqual(Number(afterStockRes.rows[0].stock), initialStock);
  });

  // =========================================================================
  // 10. TEARDOWN
  // =========================================================================

  await t.test('Teardown: clean test records and close server & database pool', async () => {
    await pool.query("DELETE FROM stock_movements WHERE product_code LIKE 'TEST-%' OR reference_no LIKE 'TEST-%' OR reference_no LIKE 'ADJ-%';");
    await pool.query("DELETE FROM products WHERE code LIKE 'TEST-%';");
    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
