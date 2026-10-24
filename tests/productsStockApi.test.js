// Unit / Integration test for Products & Inventory API endpoints
const assert = require('assert');
const app = require('../backend/src/app');
const http = require('http');

let server;
let baseUrl;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}${path}`;
    const parsed = new URL(url);

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Products & Inventory API Tests ---');

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  try {
    // 1. GET /api/products
    console.log('Test 1: GET /api/products');
    let res = await request('/api/products');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length >= 7);
    console.log('✓ PASS: All products listed successfully.');

    // 2. GET /api/products?search=Urea
    console.log('Test 2: GET /api/products?search=Urea');
    res = await request('/api/products?search=Urea');
    assert.strictEqual(res.status, 200);
    assert(res.body.data.some(p => p.name.includes('Urea')));
    console.log('✓ PASS: Search by product name works.');

    // 3. GET /api/products/PRD001
    console.log('Test 3: GET /api/products/PRD001');
    res = await request('/api/products/PRD001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.code, 'PRD001');
    console.log('✓ PASS: Fetch product by code works.');

    // 4. POST /api/products
    console.log('Test 4: POST /api/products');
    res = await request('/api/products', {
      method: 'POST',
      body: {
        name: 'Potash Special 00:00:50',
        code: 'PRD999',
        category: 'Potassic',
        brand: 'IFFCO',
        unit: 'bags',
        costPrice: 1900,
        price: 2100,
        minThreshold: 10,
        initialStock: 25,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.name, 'Potash Special 00:00:50');
    assert.strictEqual(res.body.data.stock, 25);
    console.log('✓ PASS: Product created successfully.');

    // 5. PATCH /api/products/PRD001
    console.log('Test 5: PATCH /api/products/PRD001');
    res = await request('/api/products/PRD001', {
      method: 'PATCH',
      body: {
        price: 270.0,
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.price, 270.0);
    console.log('✓ PASS: Product patched successfully.');

    // 6. GET /api/inventory/summary
    console.log('Test 6: GET /api/inventory/summary');
    res = await request('/api/inventory/summary');
    assert.strictEqual(res.status, 200);
    assert(typeof res.body.data.totalProducts === 'number');
    assert(typeof res.body.data.totalAvailableStock === 'number');
    assert(typeof res.body.data.lowStockCount === 'number');
    assert(typeof res.body.data.outOfStockCount === 'number');
    console.log('✓ PASS: Inventory summary computed correctly.');

    // 7. POST /api/inventory/adjustments
    console.log('Test 7: POST /api/inventory/adjustments (REDUCE - damaged)');
    res = await request('/api/inventory/adjustments', {
      method: 'POST',
      body: {
        productId: 'PRD001',
        operation: 'REDUCE',
        quantity: 2,
        reason: 'Damaged packaging during rain storm',
        reference: 'AUDIT-OCT-09',
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.movement.changeQty, -2);
    console.log('✓ PASS: Manual stock adjustment applied.');

    // 8. GET /api/inventory/movements
    console.log('Test 8: GET /api/inventory/movements');
    res = await request('/api/inventory/movements');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.some(m => m.reference === 'AUDIT-OCT-09'));
    console.log('✓ PASS: Movement history contains newly logged adjustment.');

    console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
