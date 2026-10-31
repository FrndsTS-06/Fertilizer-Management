const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const config = require('../src/config');
const { pool, closePool } = require('../src/config/db');
const { resetRateLimit } = require('../src/middleware/rateLimiter');

test('Phase 08 Products & Categories API Test Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let testCategoryId;
  let testProductId;
  let testProductCode;

  await t.test('Setup: HTTP server starts on an ephemeral port and logs in Admin & Staff', async () => {
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

    // Clean up test records from prior runs to guarantee test suite idempotence
    await pool.query("DELETE FROM stock_movements WHERE product_name LIKE 'Bio-Zyme%';");
    await pool.query("DELETE FROM products WHERE name LIKE 'Bio-Zyme%';");
    await pool.query("DELETE FROM categories WHERE name = 'Growth Regulators & Stimulants';");

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
  });

  // =========================================================================
  // 1. CATEGORY TESTS
  // =========================================================================

  await t.test('GET /api/categories returns seeded category list with product counts', async () => {
    const res = await fetch(`${baseUrl}/api/categories`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 7, 'Should contain at least 7 seeded categories');

    const nitrogenous = body.data.find(c => c.name === 'Nitrogenous');
    assert.ok(nitrogenous);
    assert.ok(nitrogenous.active_product_count !== undefined);
  });

  await t.test('POST /api/categories creates a new category when called by ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Growth Regulators & Stimulants',
        description: 'Plant growth promoters, gibberellic acid, and humic acid stimulants.',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.name, 'Growth Regulators & Stimulants');
    assert.ok(body.data.id);
    testCategoryId = body.data.id;
  });

  await t.test('POST /api/categories rejects duplicate category name with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Growth Regulators & Stimulants',
        description: 'Duplicate attempt.',
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.message.includes('already exists'));
  });

  await t.test('POST /api/categories rejects category creation from STAFF with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Category',
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('POST /api/categories rejects unauthenticated request with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Auth Category' }),
    });

    assert.strictEqual(res.status, 401);
  });

  await t.test('PATCH /api/categories/:id updates category details when called by ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/categories/${testCategoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Updated bio-stimulants and plant enhancers description.',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.description, 'Updated bio-stimulants and plant enhancers description.');
  });

  // =========================================================================
  // 2. PRODUCT CREATION & INVENTORY OPENING STOCK WORKFLOW
  // =========================================================================

  await t.test('POST /api/products creates product with initial stock and audit movement in transaction', async () => {
    const productPayload = {
      name: 'Bio-Zyme Crop Booster (1L)',
      category: 'Growth Regulators & Stimulants',
      brand: 'Multiplex',
      packageType: 'Bottles',
      packageSize: '1L',
      unit: 'Bottles (1L)',
      costPrice: 320.0,
      price: 450.0,
      minThreshold: 10,
      initialStock: 30,
      photo: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300',
      description: 'Enzyme-based organic plant booster for foliar application.',
    };

    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(productPayload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.id);
    assert.ok(body.data.code);
    assert.strictEqual(body.data.name, 'Bio-Zyme Crop Booster (1L)');
    assert.strictEqual(body.data.stock, 30);
    assert.strictEqual(body.data.status, 'In Stock');
    assert.strictEqual(body.data.costPrice, 320);
    assert.strictEqual(body.data.price, 450);

    testProductId = body.data.id;
    testProductCode = body.data.code;

    // Verify stock_movements ledger entry in DB
    const movementRes = await pool.query(
      `SELECT * FROM stock_movements WHERE product_id = $1 AND movement_type = 'OPENING_STOCK';`,
      [testProductId]
    );
    assert.strictEqual(movementRes.rows.length, 1);
    const movement = movementRes.rows[0];
    assert.strictEqual(movement.action_type, 'ADDED');
    assert.strictEqual(Number(movement.change_qty), 30);
    assert.strictEqual(Number(movement.previous_stock), 0);
    assert.strictEqual(Number(movement.new_stock), 30);
    assert.strictEqual(movement.reference_no, `INIT-${testProductCode}`);
  });

  await t.test('POST /api/products rejects invalid category foreign key with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Category Product',
        category: 'NonExistentCategoryName',
        unit: 'bags',
        costPrice: 100,
        price: 150,
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.message.includes('Invalid category'));
  });

  await t.test('POST /api/products rejects STAFF product creation with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Staff Created Product',
        category: 'Nitrogenous',
        unit: 'bags',
        costPrice: 100,
        price: 150,
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  // =========================================================================
  // 3. PRODUCT LIST, FILTERING, SEARCH, PAGINATION & SORTING
  // =========================================================================

  await t.test('GET /api/products returns product list with pagination metadata', async () => {
    const res = await fetch(`${baseUrl}/api/products?page=1&limit=5`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 5);
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.limit, 5);
    assert.ok(body.pagination.total >= 9);
    assert.strictEqual(body.pagination.hasNext, true);
  });

  await t.test('GET /api/products?search=Urea filters products by substring', async () => {
    const res = await fetch(`${baseUrl}/api/products?search=Urea`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 1);
    const urea = body.data.find(p => p.name.includes('Urea'));
    assert.ok(urea);
  });

  await t.test('GET /api/products?category=Nitrogenous filters products by category', async () => {
    const res = await fetch(`${baseUrl}/api/products?category=Nitrogenous`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 1);
    body.data.forEach(p => {
      assert.strictEqual(p.category, 'Nitrogenous');
    });
  });

  await t.test('GET /api/products/:id retrieves product by UUID and by SKU code', async () => {
    // By UUID
    const resById = await fetch(`${baseUrl}/api/products/${testProductId}`);
    assert.strictEqual(resById.status, 200);
    const bodyById = await resById.json();
    assert.strictEqual(bodyById.data.id, testProductId);

    // By Code
    const resByCode = await fetch(`${baseUrl}/api/products/${testProductCode}`);
    assert.strictEqual(resByCode.status, 200);
    const bodyByCode = await resByCode.json();
    assert.strictEqual(bodyByCode.data.id, testProductId);
  });

  // =========================================================================
  // 4. PRODUCT UPDATE & STOCK EDIT PROHIBITION
  // =========================================================================

  await t.test('PATCH /api/products/:id updates price and threshold when called by ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/products/${testProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        price: 495.0,
        minThreshold: 15,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.price, 495);
    assert.strictEqual(body.data.minThreshold, 15);
  });

  await t.test('PATCH /api/products/:id strictly REJECTS direct stock modification', async () => {
    const res = await fetch(`${baseUrl}/api/products/${testProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        stock: 500, // Direct stock modification prohibited!
      }),
    });

    assert.ok(res.status === 422 || res.status === 400, 'Should reject with validation error');
    const body = await res.json();
    assert.strictEqual(body.success, false);
    const serialized = JSON.stringify(body);
    assert.ok(
      serialized.includes('Direct stock modification is not permitted via product updates'),
      'Must guide user to inventory adjustment workflow'
    );
  });

  // =========================================================================
  // 5. PRODUCT ARCHIVE (SOFT-DELETE) & HISTORICAL PRESERVATION
  // =========================================================================

  await t.test('DELETE /api/products/:id archives product and preserves historical stock movements', async () => {
    const res = await fetch(`${baseUrl}/api/products/${testProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.message.includes('archived successfully'));
    assert.strictEqual(body.data.isActive, false);

    // Verify historical audit record still exists in stock_movements
    const movementCheck = await pool.query(
      `SELECT * FROM stock_movements WHERE product_id = $1;`,
      [testProductId]
    );
    assert.strictEqual(movementCheck.rows.length, 1, 'Historical movement must be intact');

    // Default product list must NOT include the archived product
    const listRes = await fetch(`${baseUrl}/api/products?search=${testProductCode}`);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.data.length, 0, 'Archived product should be hidden from standard list');

    // With include_archived=true, product can still be audited
    const archiveListRes = await fetch(`${baseUrl}/api/products?search=${testProductCode}&include_archived=true`);
    const archiveListBody = await archiveListRes.json();
    assert.strictEqual(archiveListBody.data.length, 1);
  });

  await t.test('POST /api/products/:id/restore reactivates an archived product', async () => {
    const res = await fetch(`${baseUrl}/api/products/${testProductId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isActive, true);
  });

  // =========================================================================
  // 6. INVENTORY SUMMARY & MOVEMENTS ENDPOINTS
  // =========================================================================

  await t.test('GET /api/inventory/summary returns valid stock metrics', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/summary`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.totalProducts > 0);
    assert.ok(body.data.totalAvailableStock > 0);
    assert.ok(body.data.inStockCount !== undefined);
  });

  await t.test('GET /api/inventory/movements returns audit history', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/movements`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  // Teardown
  await t.test('Teardown: close server and database pool', async () => {
    await pool.query("DELETE FROM stock_movements WHERE product_name LIKE 'Bio-Zyme%';");
    await pool.query("DELETE FROM products WHERE name LIKE 'Bio-Zyme%';");
    await pool.query("DELETE FROM categories WHERE name = 'Growth Regulators & Stimulants';");
    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
