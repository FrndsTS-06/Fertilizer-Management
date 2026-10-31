const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const { query } = require('../src/config/db');

function requestHelper(server, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

describe('Clear Customer Receipts Test Suite', () => {
  let server;
  let authToken;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));

    // Login as Admin
    const loginRes = await requestHelper(server, 'POST', '/api/auth/login', {}, {
      email: 'admin@fertilizershop.local',
      password: 'Password@123',
    });
    assert.equal(loginRes.status, 200);
    authToken = loginRes.body.token || loginRes.body.data?.token;
    assert.ok(authToken);
  });

  test('POST /api/sales/receipts/clear-all successfully clears customer receipts', async () => {
    const res = await requestHelper(
      server,
      'POST',
      '/api/sales/receipts/clear-all',
      { Authorization: `Bearer ${authToken}` },
      { clearType: 'CUSTOMER', restoreStock: true }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);

    // Verify in database that customer sales and payments are 0
    const salesCheck = await query("SELECT count(*) FROM sales WHERE customer_id IS NOT NULL OR billing_type = 'CUSTOMER'");
    assert.equal(Number(salesCheck.rows[0].count), 0);

    const paymentsCheck = await query("SELECT count(*) FROM payments WHERE customer_id IS NOT NULL");
    assert.equal(Number(paymentsCheck.rows[0].count), 0);

    // Verify all customer dues are 0
    const duesCheck = await query("SELECT count(*) FROM v_customer_balances WHERE outstanding_dues > 0");
    assert.equal(Number(duesCheck.rows[0].count), 0);
  });
});
