const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');
const productRepository = require('../src/repositories/product.repository');

describe('Purchase & Sales Full/Partial Payment & Customer Khata Integration Test Suite', () => {
  let server;
  let port;
  let baseUrl;
  let adminToken;
  let testCustomerId;
  let testProductId;
  let createdSaleIds = [];

  before(async () => {
    // 1. Start HTTP server on an ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 2. Obtain Admin JWT token
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fertilizershop.local',
        password: 'Password@123',
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    adminToken = loginData.data.token;
    assert.ok(adminToken, 'Admin token acquired');

    // 3. Clean up any leftover test data and create an isolated test customer
    const testPhone = `98${Date.now().toString().slice(-8)}`;
    await db.query(`
      DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE name LIKE 'Integration Test Farmer%');
      DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE customer_id IN (SELECT id FROM customers WHERE name LIKE 'Integration Test Farmer%'));
      DELETE FROM sales WHERE customer_id IN (SELECT id FROM customers WHERE name LIKE 'Integration Test Farmer%');
      DELETE FROM customers WHERE name LIKE 'Integration Test Farmer%';
    `);

    const custRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Integration Test Farmer Ramesh ${Date.now().toString().slice(-4)}`,
        phone: testPhone,
        village: 'Satara Test Village',
        creditLimit: 50000,
        openingBalance: 0,
      }),
    });
    assert.equal(custRes.status, 201);
    const custData = await custRes.json();
    testCustomerId = custData.data.id;
    assert.ok(testCustomerId, 'Test customer created');

    // 4. Create an isolated test product with 500 units initial stock
    const catRes = await db.query('SELECT id FROM categories LIMIT 1;');
    const categoryId = catRes.rows[0].id;

    const createdProd = await productRepository.createWithInitialStock(
      {
        code: `PRD-INT-${Date.now().toString().slice(-6)}`,
        name: 'Integration Test Fertilizer 50kg',
        categoryId,
        brand: 'TestBrand',
        packageType: 'Bags',
        packageSize: '50kgs',
        unit: 'bags',
        costPrice: 800,
        price: 1000,
        minThreshold: 10,
      },
      500.0
    );
    testProductId = createdProd.id;
    assert.ok(testProductId, 'Test product created with initial stock');
  });

  after(async () => {
    // Cleanup created test records
    try {
      if (createdSaleIds.length > 0) {
        for (const sid of createdSaleIds) {
          await db.query('DELETE FROM payments WHERE sale_id = $1;', [sid]);
          await db.query('DELETE FROM sale_items WHERE sale_id = $1;', [sid]);
          await db.query('DELETE FROM stock_movements WHERE reference_no LIKE $1;', [`%${sid}%`]);
          await db.query('DELETE FROM sales WHERE id = $1;', [sid]);
        }
      }
      if (testCustomerId) {
        await db.query('DELETE FROM payments WHERE customer_id = $1;', [testCustomerId]);
        await db.query('DELETE FROM customers WHERE id = $1;', [testCustomerId]);
      }
      if (testProductId) {
        await db.query('DELETE FROM stock_movements WHERE product_id = $1;', [testProductId]);
        await db.query('DELETE FROM products WHERE id = $1;', [testProductId]);
      }
    } catch (e) {
      console.warn('Cleanup error:', e.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await db.pool.end();
  });

  test('Test 1: Full Payment on Sale (₹10,000 bill, ₹10,000 paid) -> Status PAID, ₹0 Khata debt', async () => {
    // 10 bags @ ₹1000 = ₹10,000 subtotal. GST rate 0% for round ₹10,000 total.
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        items: [{ productId: testProductId, quantity: 10, unitPrice: 1000 }],
        gstRate: 0,
        gstMode: 'EXCLUSIVE',
        paymentMethod: 'CASH',
        paidAmount: 10000,
      }),
    });

    assert.equal(saleRes.status, 201);
    const saleBody = await saleRes.json();
    const sale = saleBody.data;
    createdSaleIds.push(sale.id);

    // Verify invoice fields
    assert.equal(Number(sale.totalAmount), 10000);
    assert.equal(Number(sale.paidAmount), 10000);
    assert.equal(Number(sale.dueAmount), 0);
    assert.equal(sale.paymentStatus, 'PAID');
    assert.equal(sale.status, 'PAID');

    // Verify customer Khata has NO outstanding debt for this sale
    const balanceRes = await fetch(`${baseUrl}/customers/${testCustomerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(balanceRes.status, 200);
    const balanceBody = await balanceRes.json();
    assert.equal(Number(balanceBody.data.outstandingDues), 0, 'Customer Khata dues must be 0');
    assert.equal(Number(balanceBody.data.totalPurchases), 10000);
    assert.equal(Number(balanceBody.data.totalPaid), 10000);
  });

  test('Test 2: Partial Payment (Off Payment) on Sale (₹10,000 bill, ₹3,000 paid) -> Status PARTIAL, ₹7,000 Khata balance', async () => {
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        items: [{ productId: testProductId, quantity: 10, unitPrice: 1000 }],
        gstRate: 0,
        gstMode: 'EXCLUSIVE',
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 3000,
      }),
    });

    assert.equal(saleRes.status, 201);
    const saleBody = await saleRes.json();
    const partialSale = saleBody.data;
    createdSaleIds.push(partialSale.id);

    // Verify invoice fields
    assert.equal(Number(partialSale.totalAmount), 10000);
    assert.equal(Number(partialSale.paidAmount), 3000);
    assert.equal(Number(partialSale.dueAmount), 7000);
    assert.equal(partialSale.paymentStatus, 'PARTIAL');
    assert.equal(partialSale.status, 'PARTIAL');

    // Verify customer Khata reflects exactly ₹7,000 outstanding dues
    const balanceRes = await fetch(`${baseUrl}/customers/${testCustomerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(balanceRes.status, 200);
    const balanceBody = await balanceRes.json();
    assert.equal(Number(balanceBody.data.outstandingDues), 7000, 'Customer Khata dues must reflect ₹7,000');
  });

  test('Test 3: Credit Sale with No Initial Payment (₹10,000 bill, ₹0 paid) -> Status UNPAID, Khata debt increases by ₹10,000', async () => {
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        items: [{ productId: testProductId, quantity: 10, unitPrice: 1000 }],
        gstRate: 0,
        gstMode: 'EXCLUSIVE',
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 0,
      }),
    });

    assert.equal(saleRes.status, 201);
    const saleBody = await saleRes.json();
    const unpaidSale = saleBody.data;
    createdSaleIds.push(unpaidSale.id);

    // Verify invoice fields
    assert.equal(Number(unpaidSale.totalAmount), 10000);
    assert.equal(Number(unpaidSale.paidAmount), 0);
    assert.equal(Number(unpaidSale.dueAmount), 10000);
    assert.equal(unpaidSale.paymentStatus, 'UNPAID');
    assert.equal(unpaidSale.status, 'UNPAID');

    // Verify customer Khata reflects 7,000 + 10,000 = ₹17,000 outstanding dues
    const balanceRes = await fetch(`${baseUrl}/customers/${testCustomerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(balanceRes.status, 200);
    const balanceBody = await balanceRes.json();
    assert.equal(Number(balanceBody.data.outstandingDues), 17000, 'Customer Khata dues must be ₹17,000');
  });

  test('Test 4: Subsequent Payment of ₹7,000 against Partial Invoice (Test 2) -> Invoice becomes PAID, dues drop by ₹7,000', async () => {
    // The second sale created in Test 2 had ₹7,000 due
    const partialSaleId = createdSaleIds[1];

    const payRes = await fetch(`${baseUrl}/sales/${partialSaleId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amount: 7000,
        paymentMethod: 'UPI',
        referenceNo: 'UPI-TEST-0001',
        notes: 'Farmer cleared remaining dues via UPI',
      }),
    });

    assert.equal(payRes.status, 201);
    const payBody = await payRes.json();
    assert.equal(payBody.success, true);
    assert.equal(Number(payBody.data.updatedSale.paidAmount), 10000);
    assert.equal(Number(payBody.data.updatedSale.dueAmount), 0);
    assert.equal(payBody.data.updatedSale.status, 'PAID');

    // Fetch sale directly from API to confirm single-source persistence
    const checkSale = await fetch(`${baseUrl}/sales/${partialSaleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const saleData = (await checkSale.json()).data;
    assert.equal(Number(saleData.paidAmount), 10000);
    assert.equal(Number(saleData.dueAmount), 0);
    assert.equal(saleData.paymentStatus, 'PAID');

    // Verify customer Khata dropped by ₹7,000 (from 17,000 to 10,000)
    const balanceRes = await fetch(`${baseUrl}/customers/${testCustomerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const balanceData = (await balanceRes.json()).data;
    assert.equal(Number(balanceData.outstandingDues), 10000, 'Customer Khata dues must drop to ₹10,000');
  });

  test('Test 5: Multiple Partial Payments against Unpaid Invoice (Test 3) -> Cumulative paid & outstanding update correctly', async () => {
    // Unpaid sale from Test 3 has ₹10,000 due
    const unpaidSaleId = createdSaleIds[2];

    // First partial payment of ₹4,000
    const pay1 = await fetch(`${baseUrl}/sales/${unpaidSaleId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amount: 4000,
        paymentMethod: 'CASH',
        notes: 'First installment of ₹4,000',
      }),
    });
    assert.equal(pay1.status, 201);
    const pay1Body = await pay1.json();
    assert.equal(Number(pay1Body.data.updatedSale.paidAmount), 4000);
    assert.equal(Number(pay1Body.data.updatedSale.dueAmount), 6000);
    assert.equal(pay1Body.data.updatedSale.status, 'PARTIAL');

    // Second partial payment of ₹2,500
    const pay2 = await fetch(`${baseUrl}/sales/${unpaidSaleId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amount: 2500,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: 'IMPS-2026-9901',
        notes: 'Second installment of ₹2,500',
      }),
    });
    assert.equal(pay2.status, 201);
    const pay2Body = await pay2.json();
    assert.equal(Number(pay2Body.data.updatedSale.paidAmount), 6500);
    assert.equal(Number(pay2Body.data.updatedSale.dueAmount), 3500);
    assert.equal(pay2Body.data.updatedSale.status, 'PARTIAL');

    // Customer Khata should now be 10,000 - 4,000 - 2,500 = ₹3,500
    const balanceRes = await fetch(`${baseUrl}/customers/${testCustomerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const balanceData = (await balanceRes.json()).data;
    assert.equal(Number(balanceData.outstandingDues), 3500, 'Customer Khata dues must be exactly ₹3,500');
  });

  test('Test 6: Overpayment Prevention -> Attempting to pay more than remaining due is rejected with 400', async () => {
    const saleId = createdSaleIds[2]; // Remaining due is ₹3,500

    const overpayRes = await fetch(`${baseUrl}/sales/${saleId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amount: 5000, // ₹5,000 > ₹3,500
        paymentMethod: 'CASH',
      }),
    });

    assert.equal(overpayRes.status, 400);
    const errBody = await overpayRes.json();
    assert.match(errBody.message, /exceeds remaining due/i);
  });

  test('Test 7: Concurrency & Database Locking -> Concurrent payments serialize without race condition or overpayment', async () => {
    const saleId = createdSaleIds[2]; // Current due is ₹3,500

    // Two parallel requests each trying to pay ₹2,500
    // Total ₹5,000 > ₹3,500 due. Exactly ONE must succeed and the second must be rejected with 400.
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/sales/${saleId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ amount: 2500, paymentMethod: 'CASH', notes: 'Concurrent request 1' }),
      }),
      fetch(`${baseUrl}/sales/${saleId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ amount: 2500, paymentMethod: 'CASH', notes: 'Concurrent request 2' }),
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [201, 400], 'One payment must succeed (201) and the competing overpayment must fail (400)');

    // Verify remaining due is exactly ₹1,000 (3,500 - 2,500)
    const checkSale = await fetch(`${baseUrl}/sales/${saleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const saleData = (await checkSale.json()).data;
    assert.equal(Number(saleData.dueAmount), 1000);
    assert.equal(Number(saleData.paidAmount), 9000);
  });

  test('Test 8: Non-Credit Sales -> Cash/UPI sales default to full payment without creating Khata balance', async () => {
    const cashSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        items: [{ productId: testProductId, quantity: 2, unitPrice: 1000 }],
        gstRate: 0,
        gstMode: 'EXCLUSIVE',
        paymentMethod: 'UPI',
        paidAmount: 2000,
      }),
    });

    assert.equal(cashSaleRes.status, 201);
    const cashSale = (await cashSaleRes.json()).data;
    createdSaleIds.push(cashSale.id);

    assert.equal(Number(cashSale.dueAmount), 0);
    assert.equal(cashSale.paymentStatus, 'PAID');

    // Customer dues should NOT increase from this cash sale (stays at ₹1,000)
    const balanceRes = await fetch(`${baseUrl}/customers/${testCustomerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const balanceData = (await balanceRes.json()).data;
    assert.equal(Number(balanceData.outstandingDues), 1000);
  });

  test('Test 9: Walk-In Sales -> Direct walk-in sales work with full payment and do not corrupt Khata records', async () => {
    const walkInRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerName: 'Direct Walk-in Visitor',
        customerPhone: '9800000000',
        items: [{ productId: testProductId, quantity: 1, unitPrice: 1000 }],
        gstRate: 0,
        gstMode: 'EXCLUSIVE',
        paymentMethod: 'CASH',
        paidAmount: 1000,
      }),
    });

    assert.equal(walkInRes.status, 201);
    const walkInSale = (await walkInRes.json()).data;
    createdSaleIds.push(walkInSale.id);

    assert.equal(walkInSale.customerId, null);
    assert.equal(Number(walkInSale.dueAmount), 0);
    assert.equal(walkInSale.paymentStatus, 'PAID');

    // Re-verify test customer balance is unaffected
    const balanceRes = await fetch(`${baseUrl}/customers/${testCustomerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const balanceData = (await balanceRes.json()).data;
    assert.equal(Number(balanceData.outstandingDues), 1000);
  });

  test('Test 10: Auto-create customer during billing -> Billing a new farmer by name auto-registers them, links invoice, and records pending dues in Khata', async () => {
    const autoFarmerName = `Auto Registered Farmer ${Date.now().toString().slice(-4)}`;
    const autoFarmerPhone = `97${Date.now().toString().slice(-8)}`;
    const autoFarmerVillage = 'Baramati Mandi';

    const autoSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerName: autoFarmerName,
        customerPhone: autoFarmerPhone,
        customerVillage: autoFarmerVillage,
        items: [{ productId: testProductId, quantity: 2, unitPrice: 1000 }],
        gstRate: 0,
        gstMode: 'EXCLUSIVE',
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 500, // Partial off-payment: ₹2000 total, ₹500 paid, ₹1500 due
      }),
    });

    assert.equal(autoSaleRes.status, 201);
    const autoSale = (await autoSaleRes.json()).data;
    createdSaleIds.push(autoSale.id);

    // Verify customer was automatically resolved and created
    assert.ok(autoSale.customerId, 'CustomerId should be auto-populated and linked');
    assert.equal(autoSale.customerName, autoFarmerName);
    assert.equal(Number(autoSale.totalAmount), 2000);
    assert.equal(Number(autoSale.paidAmount), 500);
    assert.equal(Number(autoSale.dueAmount), 1500);
    assert.equal(autoSale.paymentStatus, 'PARTIAL');

    // Verify the newly auto-created customer exists in customer directory
    const custRes = await fetch(`${baseUrl}/customers/${autoSale.customerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(custRes.status, 200);
    const custProfile = (await custRes.json()).data;
    assert.equal(custProfile.name, autoFarmerName);
    assert.equal(custProfile.phone, autoFarmerPhone);
    assert.equal(custProfile.village, autoFarmerVillage);
    assert.equal(Number(custProfile.outstandingDues), 1500);
    assert.equal(custProfile.balanceStatus, 'HAS_DUES');

    // Verify single source of truth balance endpoint
    const balanceRes = await fetch(`${baseUrl}/customers/${autoSale.customerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(balanceRes.status, 200);
    const balanceData = (await balanceRes.json()).data;
    assert.equal(Number(balanceData.totalPurchases), 2000);
    assert.equal(Number(balanceData.totalPaid), 500);
    assert.equal(Number(balanceData.outstandingDues), 1500);

    // Verify customer sales history contains this invoice
    const salesRes = await fetch(`${baseUrl}/customers/${autoSale.customerId}/sales`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(salesRes.status, 200);
    const customerSales = (await salesRes.json()).data;
    assert.equal(customerSales.length, 1);
    assert.equal(customerSales[0].id, autoSale.id);
    assert.equal(Number(customerSales[0].dueAmount), 1500);

    // Clean up auto customer
    await db.query('DELETE FROM payments WHERE customer_id = $1;', [autoSale.customerId]);
    await db.query('DELETE FROM sale_items WHERE sale_id = $1;', [autoSale.id]);
    await db.query('DELETE FROM sales WHERE id = $1;', [autoSale.id]);
    await db.query('DELETE FROM customers WHERE id = $1;', [autoSale.customerId]);
  });
});
