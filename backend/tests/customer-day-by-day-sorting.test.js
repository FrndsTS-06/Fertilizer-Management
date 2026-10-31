const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  try {
    await pool.query("DELETE FROM customers WHERE village LIKE 'Day Sorting Mandi%' OR village LIKE 'Updated Village%' OR name LIKE 'Sorting Fixture%' OR name LIKE 'Brand New Today Customer%'");
  } catch (e) {}
  await pool.end();
});

test('Customer Day-by-Day and Latest Updated on Top Test Suite', async (t) => {
  let adminToken = '';

  await t.test('Login as Admin', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fertilizershop.local',
        password: 'Password@123',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    adminToken = body.data.token;
    assert.ok(adminToken);
  });

  await t.test('1. Default GET /api/customers returns data sorted by created_at DESC', async () => {
    // Ensure at least 2 test fixtures exist for sorting validation
    let res = await fetch(`${baseUrl}/api/customers`);
    let body = await res.json();
    if (body.data.length < 2) {
      await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Sorting Fixture A', phone: '9900112233', village: 'Day Sorting Mandi A', creditLimit: 10000, openingBalance: 0 }),
      });
      await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Sorting Fixture B', phone: '9900112244', village: 'Day Sorting Mandi B', creditLimit: 10000, openingBalance: 0 }),
      });
      res = await fetch(`${baseUrl}/api/customers`);
      body = await res.json();
    }

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 2);

    // Verify created_at timestamps are in descending order (newest first, older down)
    for (let i = 0; i < body.data.length - 1; i++) {
      const curTime = new Date(body.data[i].createdAt).getTime();
      const nextTime = new Date(body.data[i + 1].createdAt).getTime();
      assert.ok(curTime >= nextTime, `Item ${i} (${curTime}) should be >= Item ${i + 1} (${nextTime})`);
    }
  });

  await t.test('2. GET /api/customers?dateFilter=today returns only records registered today', async () => {
    const res = await fetch(`${baseUrl}/api/customers?dateFilter=today`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));

    const todayStr = new Date().toDateString();
    body.data.forEach((c) => {
      const regDate = new Date(c.createdAt);
      assert.strictEqual(regDate.toDateString(), todayStr);
    });
  });

  let testCustId = '';
  await t.test('3. Registering a new customer immediately puts them on top of the list', async () => {
    const uniquePhone = '97' + Math.floor(10000000 + Math.random() * 90000000);
    const createRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Brand New Today Customer ' + Date.now(),
        phone: uniquePhone,
        village: 'Day Sorting Mandi',
        creditLimit: 30000,
        openingBalance: 0,
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createdBody = await createRes.json();
    testCustId = createdBody.data.id;
    assert.ok(testCustId);

    // Fetch customer list: the newly created customer MUST be at index 0 (on top)
    const listRes = await fetch(`${baseUrl}/api/customers`);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.data[0].id, testCustId, 'Newly registered customer must be on top');
  });

  await t.test('4. Updating an older customer preserves date-wise descending order (does not jump to top)', async () => {
    // Pick an older customer from the bottom of the list
    const listRes1 = await fetch(`${baseUrl}/api/customers`);
    const listBody1 = await listRes1.json();
    const olderCustomer = listBody1.data[listBody1.data.length - 1];

    // Update their village
    const patchRes = await fetch(`${baseUrl}/api/customers/${olderCustomer.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        village: 'Updated Village ' + Date.now(),
      }),
    });
    assert.strictEqual(patchRes.status, 200);

    // Now fetch list again: the newly created customer (testCustId) is still on top!
    const listRes2 = await fetch(`${baseUrl}/api/customers`);
    const listBody2 = await listRes2.json();
    assert.strictEqual(listBody2.data[0].id, testCustId, 'Newest customer remains on top');

    // And verify date-wise descending order is intact
    for (let i = 0; i < listBody2.data.length - 1; i++) {
      const curTime = new Date(listBody2.data[i].createdAt).getTime();
      const nextTime = new Date(listBody2.data[i + 1].createdAt).getTime();
      assert.ok(curTime >= nextTime);
    }
  });
});
