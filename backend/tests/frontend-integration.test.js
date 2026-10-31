const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Phase 15 Frontend-to-Backend Full-Stack Integration Suite', () => {
  let server;
  let port;
  let baseUrl;
  let adminToken;
  let cashierToken;
  let testProductId;
  let testCustomerId;

  before(async () => {
    // Start HTTP server on an ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await db.pool.end();
  });

  test('1. CORS: Preflight OPTIONS request from http://localhost:3000 is allowed', async () => {
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    assert.match(res.headers.get('access-control-allow-headers'), /authorization/i);
  });

  test('2. Authentication: POST /api/auth/login works for Admin', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'admin@fertilizershop.local',
        password: 'Password@123',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.token, 'Should return signed JWT token');
    assert.equal(json.data.user.role, 'ADMIN');
    assert.equal(json.data.user.email, 'admin@fertilizershop.local');
    adminToken = json.data.token;
  });

  test('3. Authentication: POST /api/auth/login works for Staff / Cashier', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'cashier@fertilizershop.local',
        password: 'Password@123',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.token);
    assert.equal(json.data.user.role, 'STAFF');
    cashierToken = json.data.token;
  });

  test('4. Session Check: GET /api/auth/me returns authenticated user details', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Origin: 'http://localhost:3000',
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.user.email, 'admin@fertilizershop.local');
    assert.equal(json.data.user.role, 'ADMIN');
  });

  test('5. Products API: GET /api/products returns catalog matching frontend fields', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Origin: 'http://localhost:3000',
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0, 'Catalog should contain products');

    const first = json.data[0];
    testProductId = first.id;

    // Verify frontend expected fields
    assert.ok(first.name);
    assert.ok(first.code);
    assert.ok(first.category);
    assert.ok(first.unit);
    assert.ok(typeof first.price === 'number');
    assert.ok(typeof first.costPrice === 'number');
    assert.ok(typeof first.stock === 'number');
    assert.ok(typeof first.minThreshold === 'number');
    assert.ok(first.status);
  });

  test('6. Inventory Summary: GET /api/inventory/summary provides dashboard cards', async () => {
    const res = await fetch(`${baseUrl}/inventory/summary`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Origin: 'http://localhost:3000',
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(typeof json.data.totalProducts === 'number');
    assert.ok(typeof json.data.totalAvailableStock === 'number');
    assert.ok(typeof json.data.lowStockCount === 'number');
    assert.ok(typeof json.data.outOfStockCount === 'number');
    assert.ok(typeof json.data.inStockCount === 'number');
  });

  test('7. Customers API: GET /api/customers returns Khata records matching frontend model', async () => {
    const res = await fetch(`${baseUrl}/customers`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Origin: 'http://localhost:3000',
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0, 'Customers list should contain farmers');

    const cust = json.data[0];
    testCustomerId = cust.id;

    // Verify fields
    assert.ok(cust.id);
    assert.ok(cust.name);
    assert.ok(cust.customerCode);
    assert.ok(typeof cust.totalPurchases === 'number');
    assert.ok(typeof cust.totalPaid === 'number');
    assert.ok(typeof cust.outstandingDues === 'number');
    assert.ok(typeof cust.creditLimit === 'number');
    assert.ok(json.summary, 'Summary stats should be present');
  });

  test('8. Stock Movement History: GET /api/inventory/movements returns audit history', async () => {
    const res = await fetch(`${baseUrl}/inventory/movements`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Origin: 'http://localhost:3000',
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
  });

  test('9. POS Sale Creation: POST /api/sales registers sale and deducts stock', async () => {
    // Check initial stock
    const prodResBefore = await fetch(`${baseUrl}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const prodBefore = (await prodResBefore.json()).data;
    const initialStock = prodBefore.stock;

    const salePayload = {
      customerId: testCustomerId,
      customerName: 'Test Integration Farmer',
      customerPhone: '9876543210',
      customerVillage: 'Khed Rural',
      items: [
        {
          productId: testProductId,
          quantity: 2,
          unitPrice: prodBefore.price,
        },
      ],
      gstRate: 5,
      gstMode: 'EXCLUSIVE',
      paymentMethod: 'CASH',
      paidAmount: Number((2 * prodBefore.price * 1.05).toFixed(2)),
    };

    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify(salePayload),
    });

    assert.equal(saleRes.status, 201);
    const saleJson = await saleRes.json();
    assert.equal(saleJson.success, true);
    assert.ok(saleJson.data.invoiceNumber || saleJson.data.invoice_number);
    assert.equal(saleJson.data.paymentStatus, 'PAID');

    // Verify stock deduction
    const prodResAfter = await fetch(`${baseUrl}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const prodAfter = (await prodResAfter.json()).data;
    assert.equal(prodAfter.stock, initialStock - 2);
  });

  test('10. Reports: GET /api/reports/dashboard returns unified financial KPIs', async () => {
    const res = await fetch(`${baseUrl}/reports/dashboard`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Origin: 'http://localhost:3000',
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data);
    assert.ok(json.data.sales, 'Dashboard should have sales breakdown');
    assert.ok(typeof json.data.sales.turnover === 'number');
    assert.ok(json.data.inventory, 'Dashboard should have inventory metrics');
    assert.ok(typeof json.data.inventory.activeProducts === 'number');
    assert.ok(json.data.accountsReceivable, 'Dashboard should have receivables metrics');
  });

  test('11. Customer Balance: GET /api/customers/:id/balance single source of truth', async () => {
    const res = await fetch(`${baseUrl}/customers/${testCustomerId}/balance`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Origin: 'http://localhost:3000',
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(typeof json.data.outstandingDues === 'number');
    assert.ok(typeof json.data.availableCredit === 'number');
  });

  test('12. Security: Unauthenticated requests to protected endpoints return 401', async () => {
    const res = await fetch(`${baseUrl}/sales`);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
  });
});
