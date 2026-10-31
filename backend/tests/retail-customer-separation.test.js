const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');

const productRepository = require('../src/repositories/product.repository');

describe('Retail Bill vs Customer Bill Separation Test Suite', () => {
  let server;
  let baseUrl;
  let adminToken;
  let testProductId;
  let registeredCustomerId;
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testProductCode = `TEST-SEP-P${uniqueSuffix}`;

  before(async () => {
    // 1. Start test HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 2. Admin Login
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
    adminToken = loginData.data?.token || loginData.token;
    assert.ok(adminToken, 'Admin token acquired');

    // 3. Create isolated test product with 500 units initial stock
    const catRes = await db.query('SELECT id FROM categories LIMIT 1;');
    const categoryId = catRes.rows[0].id;

    const createdProd = await productRepository.createWithInitialStock(
      {
        code: testProductCode,
        name: `Separation Test Fertilizer ${uniqueSuffix}`,
        categoryId,
        category: 'Nitrogenous',
        unit: 'Bags',
        costPrice: 400,
        price: 500,
        minThreshold: 10,
      },
      500.0
    );
    testProductId = createdProd.id;
    assert.ok(testProductId, 'Test product created with initial stock');

    // 4. Seed a registered customer
    const custRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Registered Farmer Santosh ${uniqueSuffix}`,
        phone: `998811${uniqueSuffix}`,
        village: 'Satara Test Village',
        creditLimit: 50000,
        openingBalance: 0,
      }),
    });
    assert.equal(custRes.status, 201);
    const custData = await custRes.json();
    registeredCustomerId = custData.data?.id || custData.id;
    assert.ok(registeredCustomerId, 'Registered customer created');
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up test records
    try {
      await db.query(`DELETE FROM payments WHERE sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE 'TEST-SEP-%')`);
      await db.query(`DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE 'TEST-SEP-%')`);
      await db.query(`DELETE FROM sales WHERE invoice_number LIKE 'TEST-SEP-%'`);
      if (testProductId) {
        await db.query(`DELETE FROM stock_movements WHERE product_id = $1`, [testProductId]);
        await db.query(`DELETE FROM products WHERE id = $1`, [testProductId]);
      }
      if (registeredCustomerId) {
        await db.query(`DELETE FROM payments WHERE customer_id = $1`, [registeredCustomerId]);
        await db.query(`DELETE FROM sales WHERE customer_id = $1`, [registeredCustomerId]);
        await db.query(`DELETE FROM customers WHERE id = $1`, [registeredCustomerId]);
      }
      await db.closePool();
    } catch (e) {
      console.warn('Cleanup error:', e);
    }
  });

  test('Test 1: Retail Bill creation with buyer info saves receipt without registering customer', async () => {
    const retailPhone = `987654${uniqueSuffix}`;
    const retailName = `Retail Walkin Farmer ${uniqueSuffix}`;

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        billingType: 'RETAIL',
        invoiceNumber: `TEST-SEP-RET-01-${uniqueSuffix}`,
        customerName: retailName,
        customerPhone: retailPhone,
        customerVillage: 'Local Mandi',
        paymentMethod: 'CASH',
        paidAmount: 1000,
        gstRate: 0,
        items: [
          {
            productId: testProductId,
            quantity: 2,
            unitPrice: 500,
          },
        ],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    const sale = body.data;

    // Must be classified as RETAIL
    assert.equal(sale.billingType, 'RETAIL');
    // Must NOT link to any customer_id
    assert.equal(sale.customerId, null);
    // Preserves buyer details on the bill
    assert.equal(sale.customerName, retailName);
    assert.equal(sale.customerPhone, retailPhone);
    assert.equal(sale.customerVillage, 'Local Mandi');

    // VERIFY DATABASE: Must NOT create customer in `customers` table
    const custCheck = await db.query('SELECT * FROM customers WHERE phone = $1', [retailPhone]);
    assert.equal(custCheck.rows.length, 0, 'Retail bill MUST NOT create a customer record in customers table');
  });

  test('Test 2: Retail Bill cannot buy on Credit (Khata) and is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        billingType: 'RETAIL',
        invoiceNumber: `TEST-SEP-RET-FAIL-${uniqueSuffix}`,
        customerName: 'Walk-in Credit Attempt',
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 0,
        gstRate: 0,
        items: [
          {
            productId: testProductId,
            quantity: 1,
            unitPrice: 500,
          },
        ],
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Retail bills cannot use Credit/i);
  });

  test('Test 3: Customer Bill links to registered customer, updates Khata, and is labeled CUSTOMER', async () => {
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        billingType: 'CUSTOMER',
        customerId: registeredCustomerId,
        invoiceNumber: `TEST-SEP-CUST-01-${uniqueSuffix}`,
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 500,
        gstRate: 0,
        items: [
          {
            productId: testProductId,
            quantity: 4,
            unitPrice: 500,
          },
        ],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    const sale = body.data;

    // Must be classified as CUSTOMER
    assert.equal(sale.billingType, 'CUSTOMER');
    // Must be linked to registered customer
    assert.equal(sale.customerId, registeredCustomerId);
    assert.equal(sale.totalAmount, 2000);
    assert.equal(sale.paidAmount, 500);
    assert.equal(sale.dueAmount, 1500);
    assert.equal(sale.paymentStatus, 'PARTIAL');

    // Customer balance verification in v_customer_balances
    const balRes = await fetch(`${baseUrl}/customers/${registeredCustomerId}/balance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(balRes.status, 200);
    const balData = await balRes.json();
    const balance = balData.data || balData;
    assert.equal(Number(balance.outstandingDues), 1500);
  });

  test('Test 4: GET /api/sales?billingType=RETAIL returns only Retail Bills', async () => {
    const res = await fetch(`${baseUrl}/sales?billingType=RETAIL`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    const sales = body.data;
    assert.ok(sales.length > 0);
    for (const s of sales) {
      assert.equal(s.billingType, 'RETAIL', `Sale ${s.invoiceNumber} must be RETAIL`);
      assert.equal(s.customerId, null, `Retail sale ${s.invoiceNumber} must have customerId = null`);
    }
  });

  test('Test 5: GET /api/sales?billingType=CUSTOMER returns only Customer Bills', async () => {
    const res = await fetch(`${baseUrl}/sales?billingType=CUSTOMER`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    const sales = body.data;
    assert.ok(sales.length > 0);
    for (const s of sales) {
      assert.equal(s.billingType, 'CUSTOMER', `Sale ${s.invoiceNumber} must be CUSTOMER`);
      assert.ok(s.customerId !== null, `Customer sale ${s.invoiceNumber} must have non-null customerId`);
    }
  });

  test('Test 6: Customer purchase history endpoint (/api/customers/:id/sales) includes Customer Bills and excludes Retail Bills', async () => {
    const res = await fetch(`${baseUrl}/customers/${registeredCustomerId}/sales`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    const customerSales = body.data || body;
    assert.ok(Array.isArray(customerSales));
    assert.ok(customerSales.length >= 1);

    const foundCustBill = customerSales.find(s => s.invoiceNumber === `TEST-SEP-CUST-01-${uniqueSuffix}`);
    assert.ok(foundCustBill, 'Customer purchase history must contain Customer Bill');

    const foundRetailBill = customerSales.find(s => s.invoiceNumber === `TEST-SEP-RET-01-${uniqueSuffix}`);
    assert.equal(foundRetailBill, undefined, 'Customer purchase history must NEVER contain Retail Bill');
  });

  test('Test 7: Retail Purchase deducts product stock correctly in products and stock_movements', async () => {
    // Check product stock after retail sale (initial 500 - 2 retail - 4 customer = 494)
    const prodRes = await fetch(`${baseUrl}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(prodRes.status, 200);
    const prodData = await prodRes.json();
    const product = prodData.data || prodData;
    assert.equal(Number(product.stock), 494, 'Stock should reflect exact deductions');

    // Perform another retail sale of 10 units
    const retailRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        billingType: 'RETAIL',
        invoiceNumber: `TEST-SEP-RET-02-${uniqueSuffix}`,
        customerName: 'Second Walk-in Buyer',
        paymentMethod: 'UPI',
        paidAmount: 5000,
        gstRate: 0,
        items: [
          {
            productId: testProductId,
            quantity: 10,
            unitPrice: 500,
          },
        ],
      }),
    });
    assert.equal(retailRes.status, 201);

    // Verify stock decremented by 10
    const prodRes2 = await fetch(`${baseUrl}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const product2 = (await prodRes2.json()).data;
    assert.equal(Number(product2.stock), 484, 'Stock should be 484 after additional retail sale');
  });

  test('Test 8: Frontend PurchasesSales.jsx has removed Retail Bill toggle and operates cleanly in Customer Bill mode', () => {
    const fs = require('fs');
    const path = require('path');
    const psPath = path.resolve(__dirname, '../../frontend/src/pages/PurchasesSales.jsx');
    const psContent = fs.readFileSync(psPath, 'utf8');

    // 1. Must NOT contain the old Retail Bill toggle inside Customer & Checkout
    assert.equal(psContent.includes('<span>🛒</span> Retail Bill\n              </button>'), false, 'Old Retail Bill button inside toggle must be removed');
    assert.equal(psContent.includes('<span>👥</span> Customer Bill\n              </button>'), false, 'Old Customer Bill button inside toggle must be removed');

    // 2. Customer & Checkout displays registered farmer selection directly
    assert.ok(psContent.includes('Select Registered Farmer / Customer'), 'Must contain registered customer selection dropdown');

    // 3. Must contain + Retail Purchase button that opens retail modal
    assert.ok(psContent.includes('setIsRetailModalOpen(true)'), 'Must have retail modal trigger');
    assert.ok(psContent.includes('Retail Purchase / Direct Counter Bill'), 'Must have Retail Purchase modal');
  });
});
