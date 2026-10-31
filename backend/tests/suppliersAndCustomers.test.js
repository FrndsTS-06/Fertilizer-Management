const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const { pool, closePool } = require('../src/config/db');
const { resetRateLimit } = require('../src/middleware/rateLimiter');

test('Phase 09 Supplier & Customer Management API Test Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let testSupplierId;
  let testCustomerId;
  let testCustomerCode;

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
    await pool.query("DELETE FROM customers WHERE customer_code LIKE 'TEST-%' OR name LIKE 'Test Farmer%';");
    await pool.query("DELETE FROM suppliers WHERE name LIKE 'Test Agro Chemicals%' OR name LIKE 'Unique Agro%';");

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
  // 1. SUPPLIER TESTS
  // =========================================================================

  await t.test('GET /api/suppliers returns seeded supplier list with purchase metrics', async () => {
    const res = await fetch(`${baseUrl}/api/suppliers`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 5, 'Should contain at least 5 seeded suppliers');

    const iffco = body.data.find(s => s.name === 'IFFCO');
    assert.ok(iffco);
    assert.strictEqual(iffco.phone, '18001031967');
  });

  await t.test('POST /api/suppliers creates new supplier when called by ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Test Agro Chemicals Pvt Ltd',
        contactPerson: 'Sunil Patil',
        phone: '9811099881',
        email: 'sunil@testagro.local',
        address: 'Plot 44, MIDC Industrial Area, Pune',
        gstin: '27AAAAA0000A1Z5',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.name, 'Test Agro Chemicals Pvt Ltd');
    assert.strictEqual(body.data.gstin, '27AAAAA0000A1Z5');
    assert.ok(body.data.id);
    testSupplierId = body.data.id;
  });

  await t.test('POST /api/suppliers rejects duplicate supplier name with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Test Agro Chemicals Pvt Ltd',
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.message.includes('already exists'));
  });

  await t.test('POST /api/suppliers rejects invalid GSTIN format with 400 or 422', async () => {
    const res = await fetch(`${baseUrl}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Unique Agro Name',
        gstin: 'INVALID-GST-NUMBER',
      }),
    });

    assert.ok([400, 422].includes(res.status));
    const body = await res.json();
    assert.strictEqual(body.success, false);
    const serialized = JSON.stringify(body);
    assert.ok(serialized.includes('Invalid GSTIN format'));
  });

  await t.test('POST /api/suppliers rejects STAFF creation with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Staff Unauthorized Supplier',
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  await t.test('PATCH /api/suppliers/:id updates supplier details when called by ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/suppliers/${testSupplierId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        contactPerson: 'Sunil V. Patil (Senior Director)',
        phone: '9811099889',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.contactPerson, 'Sunil V. Patil (Senior Director)');
    assert.strictEqual(body.data.phone, '9811099889');
  });

  await t.test('DELETE /api/suppliers/:id archives supplier preserving historical records', async () => {
    const res = await fetch(`${baseUrl}/api/suppliers/${testSupplierId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isActive, false);

    // Default list should exclude archived supplier
    const listRes = await fetch(`${baseUrl}/api/suppliers?search=Test+Agro+Chemicals`);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.data.length, 0);

    // Should appear with include_archived=true
    const archRes = await fetch(`${baseUrl}/api/suppliers?search=Test+Agro+Chemicals&include_archived=true`);
    const archBody = await archRes.json();
    assert.strictEqual(archBody.data.length, 1);
  });

  await t.test('POST /api/suppliers/:id/restore restores archived supplier', async () => {
    const res = await fetch(`${baseUrl}/api/suppliers/${testSupplierId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isActive, true);
  });

  // =========================================================================
  // 2. CUSTOMER TESTS
  // =========================================================================

  await t.test('GET /api/customers returns customer list with v_customer_balances and summary metrics', async () => {
    const res = await fetch(`${baseUrl}/api/customers`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 5);

    // Verify summary metrics presence
    assert.ok(body.summary);
    assert.ok(body.summary.totalCustomers >= 5);
    assert.ok(body.summary.totalOutstandingDues !== undefined);
    assert.ok(body.summary.customersWithDues !== undefined);

    // Verify accounting balance fields exist on customer record
    const ramesh = body.data.find(c => c.customerCode === 'CUST001' || c.name === 'Ramesh Patel');
    assert.ok(ramesh);
    assert.ok(ramesh.totalPurchases !== undefined);
    assert.ok(ramesh.totalPaid !== undefined);
    assert.ok(ramesh.outstandingDues !== undefined);
    assert.ok(ramesh.availableCredit !== undefined);
    assert.ok(ramesh.balanceStatus !== undefined);
  });

  await t.test('GET /api/customers?village=Shivaji+Nagar filters customers by village', async () => {
    const res = await fetch(`${baseUrl}/api/customers?village=Shivaji+Nagar`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 1);
    body.data.forEach(c => {
      assert.strictEqual(c.village.toLowerCase(), 'shivaji nagar');
    });
  });

  await t.test('GET /api/customers with pagination returns proper metadata', async () => {
    const res = await fetch(`${baseUrl}/api/customers?page=1&limit=2`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 2);
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.limit, 2);
    assert.ok(body.pagination.total >= 5);
    assert.strictEqual(body.pagination.hasNext, true);
  });

  await t.test('POST /api/customers registers a new customer account (Staff or Admin)', async () => {
    const res = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Test Farmer Dnyaneshwar',
        phone: '9899112233',
        village: 'Khed Shivapur',
        address: 'Gat No 123, Near Sugar Mill',
        creditLimit: 75000,
        openingBalance: 2500,
        notes: 'Seasonal sugarcane farmer',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.name, 'Test Farmer Dnyaneshwar');
    assert.strictEqual(body.data.phone, '9899112233');
    assert.strictEqual(body.data.creditLimit, 75000);
    assert.strictEqual(body.data.openingBalance, 2500);
    assert.strictEqual(body.data.outstandingDues, 2500);
    assert.ok(body.data.customerCode);
    assert.ok(body.data.id);

    testCustomerId = body.data.id;
    testCustomerCode = body.data.customerCode;
  });

  await t.test('POST /api/customers rejects duplicate phone number with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Another Farmer Duplicate Phone',
        phone: '9899112233', // Duplicate of test customer
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.message.includes('already registered'));
  });

  await t.test('POST /api/customers rejects unauthenticated request with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Farmer' }),
    });

    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/customers/:id retrieves customer by UUID and by customerCode', async () => {
    // By UUID
    const resById = await fetch(`${baseUrl}/api/customers/${testCustomerId}`);
    assert.strictEqual(resById.status, 200);
    const bodyById = await resById.json();
    assert.strictEqual(bodyById.data.id, testCustomerId);

    // By customer_code
    const resByCode = await fetch(`${baseUrl}/api/customers/${testCustomerCode}`);
    assert.strictEqual(resByCode.status, 200);
    const bodyByCode = await resByCode.json();
    assert.strictEqual(bodyByCode.data.id, testCustomerId);
  });

  await t.test('GET /api/customers/nonexistent-id returns 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/api/customers/nonexistent-customer-code-12345`);
    assert.strictEqual(res.status, 404);
  });

  await t.test('PATCH /api/customers/:id updates customer details', async () => {
    const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        village: 'Khed Shivapur Rural',
        creditLimit: 80000,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.village, 'Khed Shivapur Rural');
    assert.strictEqual(body.data.creditLimit, 80000);
  });

  await t.test('DELETE /api/customers/:id is DENIED to STAFF (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.strictEqual(res.status, 403);
  });

  await t.test('DELETE /api/customers/:id archives customer when called by ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isActive, false);

    // Default list should exclude archived customer
    const listRes = await fetch(`${baseUrl}/api/customers?search=${testCustomerCode}`);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.data.length, 0);

    // Restore customer
    const restoreRes = await fetch(`${baseUrl}/api/customers/${testCustomerId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(restoreRes.status, 200);
  });

  // =========================================================================
  // 3. ACCOUNTING & TRANSACTION LEDGER TESTS
  // =========================================================================

  await t.test('GET /api/customers/:id/balance returns single source of truth balance breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}/balance`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.customerId, testCustomerId);
    assert.strictEqual(body.data.outstandingDues, 2500); // Equal to opening balance
    assert.ok(Array.isArray(body.data.unpaidInvoices));
  });

  await t.test('GET /api/customers/:id/sales returns customer sales invoices', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST001/sales`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  await t.test('GET /api/customers/:id/payments returns customer payments receipts', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST001/payments`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  await t.test('GET /api/customers/:id/ledger returns unified chronological statement with running balance', async () => {
    const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}/ledger`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.customer);
    assert.strictEqual(body.data.openingBalance, 2500);
    assert.ok(Array.isArray(body.data.entries));
    assert.ok(body.data.entries.length >= 1);

    // First entry must be OPENING_BALANCE
    const first = body.data.entries[0];
    assert.strictEqual(first.entryType, 'OPENING_BALANCE');
    assert.strictEqual(first.debit, 2500);
    assert.strictEqual(first.runningBalance, 2500);
  });

  // Teardown
  await t.test('Teardown: clean test records and close server & database pool', async () => {
    await pool.query("DELETE FROM customers WHERE customer_code LIKE 'TEST-%' OR name LIKE 'Test Farmer%';");
    await pool.query("DELETE FROM suppliers WHERE name LIKE 'Test Agro Chemicals%' OR name LIKE 'Unique Agro%';");
    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
