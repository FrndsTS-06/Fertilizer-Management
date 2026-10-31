const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const { query, pool } = require('../src/config/db');

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

describe('Decimal Payment & Balance Precision Test Suite', () => {
  let server;
  let authToken;
  const testCustomerIds = [];
  const testSaleIds = [];

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));

    const loginRes = await requestHelper(server, 'POST', '/api/auth/login', {}, {
      email: 'admin@fertilizershop.local',
      password: 'Password@123',
    });
    assert.equal(loginRes.status, 200);
    authToken = loginRes.body.token || loginRes.body.data?.token;
    assert.ok(authToken);
  });

  after(async () => {
    // Cleanup test records
    if (testSaleIds.length > 0) {
      await query('DELETE FROM payments WHERE sale_id = ANY($1::uuid[])', [testSaleIds]);
      await query('DELETE FROM sale_items WHERE sale_id = ANY($1::uuid[])', [testSaleIds]);
      await query('DELETE FROM sales WHERE id = ANY($1::uuid[])', [testSaleIds]);
    }
    if (testCustomerIds.length > 0) {
      await query('DELETE FROM payments WHERE customer_id = ANY($1::uuid[])', [testCustomerIds]);
      await query('DELETE FROM customers WHERE id = ANY($1::uuid[])', [testCustomerIds]);
    }
    await new Promise((resolve) => server.close(resolve));
  });

  async function createTestCustomerAndInvoice(name, totalAmount, initialPaid = 0) {
    const code = `TEST_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const randomPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const custRes = await query(
      `INSERT INTO customers (customer_code, name, phone, village, credit_limit, opening_balance, is_active)
       VALUES ($1, $2, $3, $4, 50000, 0, true) RETURNING id;`,
      [code, name, randomPhone, 'Test Village']
    );
    const customerId = custRes.rows[0].id;
    testCustomerIds.push(customerId);

    const dueAmount = Number((totalAmount - initialPaid).toFixed(2));
    const status = dueAmount <= 0 ? 'PAID' : (initialPaid > 0 ? 'PARTIAL' : 'UNPAID');
    const invNumber = `INV-DEC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const saleRes = await query(
      `INSERT INTO sales (
        invoice_number, customer_id, customer_name, billing_type,
        subtotal, gst_rate, gst_mode, gst_amount, total_amount, paid_amount, due_amount, payment_method, payment_status
      ) VALUES ($1, $2, $3, 'CUSTOMER', $4, 0, 'EXCLUSIVE', 0, $4, $5, $6, 'CASH', $7)
      RETURNING id, invoice_number;`,
      [invNumber, customerId, name, totalAmount, initialPaid, dueAmount, status]
    );
    const saleId = saleRes.rows[0].id;
    testSaleIds.push(saleId);

    if (initialPaid > 0) {
      const recNo = `REC-DEC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await query(
        `INSERT INTO payments (receipt_number, customer_id, sale_id, amount, payment_method, notes)
         VALUES ($1, $2, $3, $4, 'CASH', 'Initial test payment');`,
        [recNo, customerId, saleId, initialPaid]
      );
    }

    return { customerId, saleId, invNumber };
  }

  test('Validation: Rejects negative payment amounts and amounts with > 2 decimal places', async () => {
    const { customerId, saleId } = await createTestCustomerAndInvoice('Validation Tester', 1800.60);

    // Negative amount
    const negRes = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: -50, paymentMethod: 'CASH' }
    );
    assert.equal(negRes.status, 422);

    // More than 2 decimal places
    const decRes = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: 50.125, paymentMethod: 'CASH' }
    );
    assert.equal(decRes.status, 422);

    // Overpayment exceeding pending balance (rejected by business logic / repository)
    const overRes = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: 1800.61, paymentMethod: 'CASH' }
    );
    assert.equal(overRes.status, 400);
  });

  test('Case 1: Pending Balance ₹1,800.60, Payment ₹1,800.60 -> Remaining ₹0.00, Status PAID', async () => {
    const { customerId, saleId } = await createTestCustomerAndInvoice('Case 1 Tester', 1800.60);

    const res = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: 1800.60, paymentMethod: 'CASH' }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.updatedSale.dueAmount, 0.00);
    assert.equal(res.body.data.updatedSale.paidAmount, 1800.60);
    assert.equal(res.body.data.updatedSale.status, 'PAID');

    // Verify balance in customer balance view
    const balRes = await requestHelper(server, 'GET', `/api/customers/${customerId}/balance`);
    assert.equal(balRes.status, 200);
    assert.equal(Number(balRes.body.data.outstandingDues), 0.00);
    assert.equal(Number(balRes.body.data.totalPaid), 1800.60);
    assert.equal(balRes.body.data.balanceStatus, 'CLEARED');
  });

  test('Case 2: Pending Balance ₹1,800.60, Payment ₹1,800.00 -> Remaining ₹0.60, Status PARTIAL', async () => {
    const { customerId, saleId } = await createTestCustomerAndInvoice('Case 2 Tester', 1800.60);

    const res = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: 1800.00, paymentMethod: 'CASH' }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.updatedSale.dueAmount, 0.60);
    assert.equal(res.body.data.updatedSale.paidAmount, 1800.00);
    assert.equal(res.body.data.updatedSale.status, 'PARTIAL');

    const balRes = await requestHelper(server, 'GET', `/api/customers/${customerId}/balance`);
    assert.equal(balRes.status, 200);
    assert.equal(Number(balRes.body.data.outstandingDues), 0.60);
    assert.equal(Number(balRes.body.data.totalPaid), 1800.00);
    assert.equal(balRes.body.data.balanceStatus, 'HAS_DUES');

    // Follow-up: Pay the remaining ₹0.60 and verify it clears to 0.00
    const payRemRes = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: 0.60, paymentMethod: 'UPI' }
    );
    assert.equal(payRemRes.status, 201);
    assert.equal(payRemRes.body.data.updatedSale.dueAmount, 0.00);
    assert.equal(payRemRes.body.data.updatedSale.status, 'PAID');
  });

  test('Case 3: Pending Balance ₹1,800.60, Payment ₹1,000.25 -> Remaining ₹800.35, Status PARTIAL', async () => {
    const { customerId, saleId } = await createTestCustomerAndInvoice('Case 3 Tester', 1800.60);

    const res = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: 1000.25, paymentMethod: 'BANK_TRANSFER' }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.updatedSale.dueAmount, 800.35);
    assert.equal(res.body.data.updatedSale.paidAmount, 1000.25);
    assert.equal(res.body.data.updatedSale.status, 'PARTIAL');

    const balRes = await requestHelper(server, 'GET', `/api/customers/${customerId}/balance`);
    assert.equal(balRes.status, 200);
    assert.equal(Number(balRes.body.data.outstandingDues), 800.35);
    assert.equal(Number(balRes.body.data.totalPaid), 1000.25);
  });

  test('Case 4: Pending Balance ₹500.50, Payment ₹250.25 -> Remaining ₹250.25, Status PARTIAL', async () => {
    const { customerId, saleId } = await createTestCustomerAndInvoice('Case 4 Tester', 500.50);

    const res = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: 250.25, paymentMethod: 'CASH' }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.updatedSale.dueAmount, 250.25);
    assert.equal(res.body.data.updatedSale.paidAmount, 250.25);
    assert.equal(res.body.data.updatedSale.status, 'PARTIAL');

    const balRes = await requestHelper(server, 'GET', `/api/customers/${customerId}/balance`);
    assert.equal(balRes.status, 200);
    assert.equal(Number(balRes.body.data.outstandingDues), 250.25);
  });

  test('Case 5: Pending Balance ₹999.99, Payment ₹999.99 -> Remaining ₹0.00, Status PAID', async () => {
    const { customerId, saleId } = await createTestCustomerAndInvoice('Case 5 Tester', 999.99);

    const res = await requestHelper(
      server,
      'POST',
      `/api/sales/${saleId}/payments`,
      { Authorization: `Bearer ${authToken}` },
      { amount: 999.99, paymentMethod: 'UPI' }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.updatedSale.dueAmount, 0.00);
    assert.equal(res.body.data.updatedSale.paidAmount, 999.99);
    assert.equal(res.body.data.updatedSale.status, 'PAID');

    const balRes = await requestHelper(server, 'GET', `/api/customers/${customerId}/balance`);
    assert.equal(balRes.status, 200);
    assert.equal(Number(balRes.body.data.outstandingDues), 0.00);
    assert.equal(balRes.body.data.balanceStatus, 'CLEARED');
  });
});
