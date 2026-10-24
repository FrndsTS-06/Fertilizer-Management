// Automated integration tests for Customer & Khata Payments API endpoints
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
  console.log('--- Starting Customer Details & Payments API Tests ---');

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  try {
    // 1. GET /api/customers
    console.log('Test 1: GET /api/customers');
    let res = await request('/api/customers');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length >= 5);
    console.log('✓ PASS: All customers listed successfully.');

    // 2. POST /api/customers
    console.log('Test 2: POST /api/customers');
    res = await request('/api/customers', {
      method: 'POST',
      body: {
        name: 'Suresh Patil',
        phone: '9850123499',
        village: 'Wadgaon',
        address: 'Farm Plot 9, Wadgaon',
        creditLimit: 35000,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.name, 'Suresh Patil');
    const newCustId = res.body.data.id;
    console.log('✓ PASS: Customer created successfully.');

    // 3. GET /api/customers/:id
    console.log('Test 3: GET /api/customers/:id');
    res = await request(`/api/customers/${newCustId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, newCustId);
    console.log('✓ PASS: Fetch customer by ID works.');

    // 4. PATCH /api/customers/:id
    console.log('Test 4: PATCH /api/customers/:id');
    res = await request(`/api/customers/${newCustId}`, {
      method: 'PATCH',
      body: {
        village: 'New Wadgaon',
        creditLimit: 40000,
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.village, 'New Wadgaon');
    assert.strictEqual(res.body.data.creditLimit, 40000);
    console.log('✓ PASS: Customer details updated.');

    // 5. GET /api/customers/:id/sales
    console.log('Test 5: GET /api/customers/CUST001/sales');
    res = await request('/api/customers/CUST001/sales');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length > 0);
    console.log('✓ PASS: Customer sales invoices retrieved.');

    // 6. GET /api/customers/:id/payments
    console.log('Test 6: GET /api/customers/CUST001/payments');
    res = await request('/api/customers/CUST001/payments');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body.data));
    console.log('✓ PASS: Customer payment history retrieved.');

    // 7. GET /api/customers/:id/balance
    console.log('Test 7: GET /api/customers/CUST001/balance');
    res = await request('/api/customers/CUST001/balance');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.customerId, 'CUST001');
    assert(Array.isArray(res.body.data.unpaidInvoices));
    assert(res.body.data.totalOutstandingDues > 0);
    console.log('✓ PASS: Customer balance & unpaid invoices retrieved.');

    // 8. POST /api/sales/:id/payments
    console.log('Test 8: POST /api/sales/INV-2026-0891/payments (Record payment against invoice)');
    res = await request('/api/sales/INV-2026-0891/payments', {
      method: 'POST',
      body: {
        amount: 5000,
        method: 'UPI',
        reference: 'UPI/TEST/990011',
        notes: 'Partial invoice clearance',
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.payment.amount, 5000);
    assert.strictEqual(res.body.data.updatedSale.paidAmount, 5000);
    assert.strictEqual(res.body.data.updatedSale.dueAmount, 9200); // 14200 - 5000 = 9200
    console.log('✓ PASS: Invoice payment successfully recorded and due updated.');

    console.log('\n🎉 ALL 8 CUSTOMER API TESTS PASSED! 🎉');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
