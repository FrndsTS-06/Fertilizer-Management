const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const { pool, closePool } = require('../src/config/db');
const { resetRateLimit } = require('../src/middleware/rateLimiter');
const productRepository = require('../src/repositories/product.repository');

test('Phase 13 Payment Collection, Allocations & Financial Invariants Test Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let customerId;
  let supplierId;
  let product1Id;
  let categoryId;
  let sale1Id;
  let sale2Id;
  let sale1InvoiceNo;
  let sale2InvoiceNo;
  let testPaymentId;

  await t.test('Setup: HTTP server starts on an ephemeral port, logs in Admin & Staff, and seeds test data', async () => {
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

    // Clean up test records from prior runs
    await pool.query("DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE name = 'Test Farmer Financial Ledger');");
    await pool.query("DELETE FROM supplier_payments WHERE supplier_id IN (SELECT id FROM suppliers WHERE name = 'Test Agri Wholesale Suppliers');");
    await pool.query("DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE 'TEST-FIN-%');");
    await pool.query("DELETE FROM sales WHERE invoice_number LIKE 'TEST-FIN-%';");
    await pool.query("DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE purchase_invoice_no LIKE 'TEST-FIN-%');");
    await pool.query("DELETE FROM purchases WHERE purchase_invoice_no LIKE 'TEST-FIN-%';");
    await pool.query("DELETE FROM stock_movements WHERE product_code = 'TEST-FIN-P01';");
    await pool.query("DELETE FROM products WHERE code = 'TEST-FIN-P01';");
    await pool.query("DELETE FROM customers WHERE name = 'Test Farmer Financial Ledger';");
    await pool.query("DELETE FROM suppliers WHERE name = 'Test Agri Wholesale Suppliers';");

    // Fetch active category
    const catRes = await pool.query('SELECT id FROM categories WHERE is_active = TRUE LIMIT 1;');
    assert.ok(catRes.rows.length > 0);
    categoryId = catRes.rows[0].id;

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

    // Create test customer
    const custRes = await pool.query(
      `INSERT INTO customers (customer_code, name, phone, village, address, credit_limit, opening_balance, is_active)
       VALUES ('TEST-CUST-FIN', 'Test Farmer Financial Ledger', '9822339900', 'Baramati Rural', 'Gat 12', 60000.00, 1000.00, TRUE)
       RETURNING id;`
    );
    customerId = custRes.rows[0].id;
    assert.ok(customerId);

    // Create test supplier
    const suppRes = await pool.query(
      `INSERT INTO suppliers (name, contact_person, phone, email, address, is_active)
       VALUES ('Test Agri Wholesale Suppliers', 'Rajan Deshmukh', '9822334466', 'sales@agriws.local', 'MIDC Pune', TRUE)
       RETURNING id;`
    );
    supplierId = suppRes.rows[0].id;
    assert.ok(supplierId);

    // Create test product with 200 initial stock
    const p = await productRepository.createWithInitialStock(
      {
        code: 'TEST-FIN-P01',
        name: 'Test Product Fin Urea (50kg)',
        categoryId,
        brand: 'Test Fin Brand',
        packageType: 'Bags',
        packageSize: '50kgs',
        unit: 'Bags (50kgs)',
        costPrice: 400.0,
        price: 500.0,
        minThreshold: 10.0,
      },
      200.0,
      'Initial stock for financial payment tests'
    );
    product1Id = p.id;
    assert.ok(product1Id);

    // Create Sale 1 on Credit: 4 bags @ 500 = 2000, 5% GST = 100, Total = 2100, Paid = 0, Due = 2100
    sale1InvoiceNo = 'TEST-FIN-INV-001';
    const s1Res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: sale1InvoiceNo,
        customerId,
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 0.0,
        gstRate: 5.0,
        gstMode: 'EXCLUSIVE',
        items: [{ productId: product1Id, quantity: 4, unitPrice: 500.0 }],
      }),
    });
    assert.strictEqual(s1Res.status, 201);
    const s1Body = await s1Res.json();
    sale1Id = s1Body.data.id;
    assert.strictEqual(s1Body.data.totalAmount, 2100.0);
    assert.strictEqual(s1Body.data.dueAmount, 2100.0);
    assert.strictEqual(s1Body.data.status, 'UNPAID');

    // Create Sale 2 on Credit: 6 bags @ 500 = 3000, 5% GST = 150, Total = 3150, Paid = 0, Due = 3150
    sale2InvoiceNo = 'TEST-FIN-INV-002';
    const s2Res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: sale2InvoiceNo,
        customerId,
        paymentMethod: 'CREDIT (KHATA)',
        paidAmount: 0.0,
        gstRate: 5.0,
        gstMode: 'EXCLUSIVE',
        items: [{ productId: product1Id, quantity: 6, unitPrice: 500.0 }],
      }),
    });
    assert.strictEqual(s2Res.status, 201);
    const s2Body = await s2Res.json();
    sale2Id = s2Body.data.id;
    assert.strictEqual(s2Body.data.totalAmount, 3150.0);
    assert.strictEqual(s2Body.data.dueAmount, 3150.0);
    assert.strictEqual(s2Body.data.status, 'UNPAID');
  });

  // =========================================================================
  // 1. AUTHENTICATION & ACCESS CONTROL
  // =========================================================================

  await t.test('GET /api/payments rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/payments`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('GET /api/payments allows authenticated Staff & Admin to list payment receipts with pagination', async () => {
    const res = await fetch(`${baseUrl}/api/payments?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
  });

  await t.test('GET /api/payments/summary returns aggregated collection metrics and payment method distributions', async () => {
    const res = await fetch(`${baseUrl}/api/payments/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(typeof body.data.totalPaymentsCount, 'number');
    assert.strictEqual(typeof body.data.totalAmountCollected, 'number');
  });

  // =========================================================================
  // 2. INVOICE ALLOCATED PAYMENTS & OVERPAYMENT PREVENTION
  // =========================================================================

  await t.test('POST /api/sales/:id/payments records partial payment against invoice, updates dues, and transitions status to PARTIAL', async () => {
    // Invoice 1 total is 2100, remaining due is 2100. Remit 1000 via UPI.
    const res = await fetch(`${baseUrl}/api/sales/${sale1Id}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        amount: 1000.0,
        method: 'UPI',
        reference: 'UPI-TXN-1001',
        notes: 'First installment for Sale 1',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.payment);
    assert.strictEqual(body.data.payment.amount, 1000.0);
    assert.strictEqual(body.data.payment.paymentMethod, 'UPI');
    assert.strictEqual(body.data.updatedSale.paidAmount, 1000.0);
    assert.strictEqual(body.data.updatedSale.dueAmount, 1100.0);
    assert.strictEqual(body.data.updatedSale.status, 'PARTIAL');

    testPaymentId = body.data.payment.id;
    assert.ok(testPaymentId);
  });

  await t.test('POST /api/sales/:id/payments rejects payment exceeding remaining invoice due with 400 Bad Request', async () => {
    // Remaining due on Invoice 1 is 1100. Attempting to remit 1500.
    const res = await fetch(`${baseUrl}/api/sales/${sale1Id}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        amount: 1500.0,
        method: 'CASH',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /exceeds remaining due/i);
  });

  await t.test('POST /api/sales/:id/payments records full remaining balance and transitions invoice status to PAID', async () => {
    // Clear the remaining 1100 due on Invoice 1
    const res = await fetch(`${baseUrl}/api/sales/${sale1Id}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        amount: 1100.0,
        method: 'CASH',
        notes: 'Final settlement for Sale 1',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.updatedSale.paidAmount, 2100.0);
    assert.strictEqual(body.data.updatedSale.dueAmount, 0.0);
    assert.strictEqual(body.data.updatedSale.status, 'PAID');
  });

  await t.test('POST /api/sales/:id/payments rejects payment when invoice is already fully paid with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/sales/${sale1Id}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        amount: 200.0,
        method: 'CASH',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already fully PAID/i);
  });

  // =========================================================================
  // 3. ON-ACCOUNT PAYMENTS & MULTI-INVOICE ALLOCATIONS
  // =========================================================================

  await t.test('POST /api/payments records on-account unallocated deposit (sale_id = null) and updates customer balance', async () => {
    const res = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerId,
        amount: 500.0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: 'IMPS-998877',
        notes: 'Advance deposit on customer Khata without invoice assignment',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.payment.amount, 500.0);
    assert.strictEqual(body.data.payment.saleId, null);
    assert.strictEqual(body.data.payment.isOnAccount, true);
    assert.strictEqual(body.data.onAccount, true);
  });

  await t.test('POST /api/payments supports multi-invoice allocations across distinct open sales', async () => {
    // Invoice 2 has remaining due 3150. Remit 2000 total: 1500 allocated to Invoice 2, 500 unallocated remainder on-account.
    const res = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerId,
        amount: 2000.0,
        paymentMethod: 'UPI',
        allocations: [{ saleId: sale2Id, amount: 1500.0 }],
        notes: 'Multi allocation split: 1500 to Sale 2, 500 on account',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.allocatedAmount, 1500.0);
    assert.strictEqual(body.data.unallocatedRemainder, 500.0);
    assert.strictEqual(body.data.payments.length, 2); // 1 allocated + 1 on-account

    // Verify Invoice 2 updated: 3150 total, 1500 paid, 1650 due
    const s2Check = await pool.query('SELECT paid_amount, due_amount, payment_status FROM sales WHERE id = $1;', [sale2Id]);
    assert.strictEqual(Number(s2Check.rows[0].paid_amount), 1500.0);
    assert.strictEqual(Number(s2Check.rows[0].due_amount), 1650.0);
    assert.strictEqual(s2Check.rows[0].payment_status, 'PARTIAL');
  });

  await t.test('POST /api/payments supports FIFO auto-allocation across oldest open invoices', async () => {
    // Invoice 2 has remaining due 1650. Farmer remits 2000 with autoAllocate = true.
    // 1650 should clear Invoice 2 (transitioning to PAID), and 350 should go on-account.
    const res = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerId,
        amount: 2000.0,
        paymentMethod: 'CASH',
        autoAllocate: true,
        notes: 'FIFO auto clearance',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.autoAllocatedAmount, 1650.0);
    assert.strictEqual(body.data.unallocatedRemainder, 350.0);

    // Verify Invoice 2 is now fully PAID
    const s2Check = await pool.query('SELECT paid_amount, due_amount, payment_status FROM sales WHERE id = $1;', [sale2Id]);
    assert.strictEqual(Number(s2Check.rows[0].paid_amount), 3150.0);
    assert.strictEqual(Number(s2Check.rows[0].due_amount), 0.0);
    assert.strictEqual(s2Check.rows[0].payment_status, 'PAID');
  });

  // =========================================================================
  // 4. ZERO DOUBLE-COUNTING & BALANCE RECONCILIATION
  // =========================================================================

  await t.test('Double-counting verification: customer Khata balance in v_customer_balances never double-counts sales.paid_amount and payments.amount', async () => {
    // Current customer accounting state:
    // Opening balance: 1000.00
    // Sale 1: 2100.00
    // Sale 2: 3150.00
    // Gross Debt = 1000 + 2100 + 3150 = 6250.00
    // Payments made:
    // - Sale 1: 1000 + 1100 = 2100.00
    // - On-account: 500.00
    // - Sale 2 multi-allocation: 1500.00 + 500.00 on-account = 2000.00
    // - FIFO auto-allocation: 1650.00 + 350.00 on-account = 2000.00
    // Total Payments Received = 2100 + 500 + 2000 + 2000 = 6600.00
    // Net Dues = GREATEST(0, 6250 - 6600) = 0.00 (Customer has overpaid advance!)

    const res = await pool.query(
      `SELECT total_purchases, total_paid, outstanding_dues, available_credit
       FROM v_customer_balances
       WHERE customer_id = $1;`,
      [customerId]
    );

    assert.strictEqual(res.rows.length, 1);
    const b = res.rows[0];
    assert.strictEqual(Number(b.total_purchases), 6250.0);
    assert.strictEqual(Number(b.total_paid), 6600.0);
    assert.strictEqual(Number(b.outstanding_dues), 0.0);
  });

  // =========================================================================
  // 5. AUDITABLE PAYMENT REVERSALS
  // =========================================================================

  await t.test('POST /api/payments/:id/reverse rejects unauthenticated or Staff requests with 401/403 (Admin-only)', async () => {
    // Unauthenticated
    const resNoAuth = await fetch(`${baseUrl}/api/payments/${testPaymentId}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Accidental payment entry' }),
    });
    assert.strictEqual(resNoAuth.status, 401);

    // Staff role
    const resStaff = await fetch(`${baseUrl}/api/payments/${testPaymentId}/reverse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ reason: 'Accidental payment entry' }),
    });
    assert.strictEqual(resStaff.status, 403);
  });

  await t.test('POST /api/payments/:id/reverse rejects missing or too short reversal reason with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/payments/${testPaymentId}/reverse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'no' }), // < 3 characters
    });

    assert.ok(res.status === 400 || res.status === 422, 'Status should be 400 or 422');
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(/validation failed/i.test(body.message) || (body.errors && body.errors.some((e) => /valid audit reason/i.test(e))));
  });

  await t.test('POST /api/payments/:id/reverse successfully reverses payment, restores invoice due/status, and refreshes customer balance', async () => {
    // We reverse testPaymentId (which was the 1000 payment on Sale 1)
    const res = await fetch(`${baseUrl}/api/payments/${testPaymentId}/reverse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: 'Cheque bounced due to signature mismatch on bank clearance',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.reversedPayment.id, testPaymentId);
    assert.strictEqual(body.data.reversedPayment.amount, 1000.0);
    assert.ok(body.data.audit);
    assert.strictEqual(body.data.audit.reason, 'Cheque bounced due to signature mismatch on bank clearance');

    // Sale 1 had 2100 total. Earlier: 1000 + 1100 = 2100 paid.
    // Now with 1000 reversed, surviving payment is 1100.
    // Sale 1 should now have paidAmount = 1100, dueAmount = 1000, status = PARTIAL!
    assert.strictEqual(body.data.updatedSale.paidAmount, 1100.0);
    assert.strictEqual(body.data.updatedSale.dueAmount, 1000.0);
    assert.strictEqual(body.data.updatedSale.status, 'PARTIAL');

    // Verify row was removed from payments table
    const checkDeleted = await pool.query('SELECT id FROM payments WHERE id = $1;', [testPaymentId]);
    assert.strictEqual(checkDeleted.rows.length, 0);

    // Verify customer total_paid decreased by 1000 (from 6600 to 5600)
    // Debt = 6250, Total Paid = 5600 => Outstanding Dues = 650.00!
    assert.strictEqual(body.data.customerBalance.totalPaid, 5600.0);
    assert.strictEqual(body.data.customerBalance.outstandingDues, 650.0);
  });

  // =========================================================================
  // 6. WHOLESALE SUPPLIER AP PAYMENTS
  // =========================================================================

  await t.test('POST /api/payments/suppliers lists and records wholesale supplier payment disbursement', async () => {
    // Record supplier payment disbursement
    const res = await fetch(`${baseUrl}/api/payments/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        supplierId,
        amount: 8000.0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: 'NEFT-AGRI-1001',
        notes: 'Monthly advance disbursement for wholesale fertilizer consignment',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.paymentNumber);
    assert.strictEqual(body.data.amount, 8000.0);
    assert.strictEqual(body.data.paymentMethod, 'BANK_TRANSFER');

    // List supplier disbursements
    const listRes = await fetch(`${baseUrl}/api/payments/suppliers?supplierId=${supplierId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.success, true);
    assert.ok(listBody.data.length >= 1);
  });

  // =========================================================================
  // 7. CUSTOMER PAYMENT HISTORY & TRANSACTION LEDGER
  // =========================================================================

  await t.test('GET /api/customers/:id/payments retrieves customer payment history matching ledger', async () => {
    const res = await fetch(`${baseUrl}/api/customers/${customerId}/payments`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 3);
  });

  await t.test('GET /api/customers/:id/ledger confirms unified chronological ledger reflects debit sales and credit payments', async () => {
    const res = await fetch(`${baseUrl}/api/customers/${customerId}/ledger`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.entries);
    assert.strictEqual(body.data.openingBalance, 1000.0);
    assert.strictEqual(body.data.totalPurchases, 6250.0);
    assert.strictEqual(body.data.totalPaid, 5600.0);
    assert.strictEqual(body.data.outstandingDues, 650.0);
  });

  // =========================================================================
  // 8. TEARDOWN
  // =========================================================================

  await t.test('Teardown: clean test records and close server & database pool', async () => {
    await pool.query("DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE name = 'Test Farmer Financial Ledger');");
    await pool.query("DELETE FROM supplier_payments WHERE supplier_id IN (SELECT id FROM suppliers WHERE name = 'Test Agri Wholesale Suppliers');");
    await pool.query("DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE 'TEST-FIN-%');");
    await pool.query("DELETE FROM sales WHERE invoice_number LIKE 'TEST-FIN-%';");
    await pool.query("DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE purchase_invoice_no LIKE 'TEST-FIN-%');");
    await pool.query("DELETE FROM purchases WHERE purchase_invoice_no LIKE 'TEST-FIN-%';");
    await pool.query("DELETE FROM stock_movements WHERE product_code = 'TEST-FIN-P01';");
    await pool.query("DELETE FROM products WHERE code = 'TEST-FIN-P01';");
    await pool.query("DELETE FROM customers WHERE name = 'Test Farmer Financial Ledger';");
    await pool.query("DELETE FROM suppliers WHERE name = 'Test Agri Wholesale Suppliers';");

    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
