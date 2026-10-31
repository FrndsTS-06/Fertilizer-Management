const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');
const { resetRateLimit } = require('../src/middleware/rateLimiter');

describe('Phase 16 Comprehensive Integrated QA Automation Test Suite', () => {
  let server;
  let port;
  let baseUrl;
  let adminToken;
  let cashierToken;

  // Track created test entities for guaranteed isolation and thorough cleanup
  const createdEntities = {
    categoryIds: [],
    productIds: [],
    supplierIds: [],
    customerIds: [],
    purchaseIds: [],
    saleIds: [],
    paymentIds: [],
    supplierPaymentIds: [],
  };

  const cleanQaData = async () => {
    try {
      await db.query(`
        DELETE FROM payments 
        WHERE customer_id IN (SELECT id FROM customers WHERE customer_code LIKE 'QA-%' OR name LIKE 'QA %')
           OR sale_id IN (SELECT id FROM sales WHERE customer_name LIKE 'QA%' OR customer_id IN (SELECT id FROM customers WHERE customer_code LIKE 'QA-%' OR name LIKE 'QA %'));
      `);
      await db.query(`
        DELETE FROM supplier_payments
        WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'QA %');
      `);
      await db.query(`
        DELETE FROM sale_items
        WHERE sale_id IN (
          SELECT id FROM sales WHERE customer_name LIKE 'QA%' OR customer_id IN (SELECT id FROM customers WHERE customer_code LIKE 'QA-%' OR name LIKE 'QA %')
        ) OR product_id IN (SELECT id FROM products WHERE code LIKE 'QA-%' OR name LIKE 'QA %');
      `);
      await db.query(`
        DELETE FROM stock_movements
        WHERE product_id IN (SELECT id FROM products WHERE code LIKE 'QA-%' OR name LIKE 'QA %');
      `);
      await db.query(`
        DELETE FROM sales
        WHERE customer_name LIKE 'QA%' OR customer_id IN (SELECT id FROM customers WHERE customer_code LIKE 'QA-%' OR name LIKE 'QA %');
      `);
      await db.query(`
        DELETE FROM purchase_items
        WHERE purchase_id IN (SELECT id FROM purchases WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'QA %'))
           OR product_id IN (SELECT id FROM products WHERE code LIKE 'QA-%' OR name LIKE 'QA %');
      `);
      await db.query(`
        DELETE FROM purchases
        WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'QA %');
      `);
      await db.query(`
        DELETE FROM products WHERE code LIKE 'QA-%' OR name LIKE 'QA %';
      `);
      await db.query(`
        DELETE FROM categories WHERE name LIKE 'QA %';
      `);
      await db.query(`
        DELETE FROM customers WHERE customer_code LIKE 'QA-%' OR name LIKE 'QA %';
      `);
      await db.query(`
        DELETE FROM suppliers WHERE name LIKE 'QA %';
      `);
    } catch (err) {
      console.error('cleanQaData error:', err.message);
    }
  };

  before(async () => {
    // 1. Start server on an ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 2. Clear rate limiter for localhost testing
    resetRateLimit('127.0.0.1');

    // 3. Pre-test cleanup of any stale QA test records
    await cleanQaData();

    // 4. Authenticate Admin
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fertilizershop.local',
        password: 'Password@123',
      }),
    });
    assert.equal(adminLoginRes.status, 200, 'Admin login should succeed');
    const adminData = await adminLoginRes.json();
    adminToken = adminData.data.token;
    assert.ok(adminToken, 'Admin token should be present');

    // 5. Authenticate Staff / Cashier
    const staffLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cashier@fertilizershop.local',
        password: 'Password@123',
      }),
    });
    assert.equal(staffLoginRes.status, 200, 'Cashier login should succeed');
    const staffData = await staffLoginRes.json();
    cashierToken = staffData.data.token;
    assert.ok(cashierToken, 'Cashier token should be present');
  });

  after(async () => {
    // Thorough cleanup of all test records created during test execution
    try {
      if (createdEntities.customerIds.length > 0) {
        await db.query('DELETE FROM payments WHERE customer_id = ANY($1::uuid[])', [createdEntities.customerIds]);
      }
      if (createdEntities.paymentIds.length > 0) {
        await db.query('DELETE FROM payments WHERE id = ANY($1::uuid[])', [createdEntities.paymentIds]);
      }
      if (createdEntities.supplierPaymentIds.length > 0) {
        await db.query('DELETE FROM supplier_payments WHERE id = ANY($1::uuid[])', [createdEntities.supplierPaymentIds]);
      }
      if (createdEntities.saleIds.length > 0) {
        await db.query('DELETE FROM payments WHERE sale_id = ANY($1::uuid[])', [createdEntities.saleIds]);
        await db.query('DELETE FROM sale_items WHERE sale_id = ANY($1::uuid[])', [createdEntities.saleIds]);
        await db.query('DELETE FROM sales WHERE id = ANY($1::uuid[])', [createdEntities.saleIds]);
      }
      if (createdEntities.purchaseIds.length > 0) {
        await db.query('DELETE FROM purchase_items WHERE purchase_id = ANY($1::uuid[])', [createdEntities.purchaseIds]);
        await db.query('DELETE FROM purchases WHERE id = ANY($1::uuid[])', [createdEntities.purchaseIds]);
      }
      if (createdEntities.productIds.length > 0) {
        await db.query('DELETE FROM stock_movements WHERE product_id = ANY($1::uuid[])', [createdEntities.productIds]);
        await db.query('DELETE FROM products WHERE id = ANY($1::uuid[])', [createdEntities.productIds]);
      }
      if (createdEntities.customerIds.length > 0) {
        await db.query('DELETE FROM customers WHERE id = ANY($1::uuid[])', [createdEntities.customerIds]);
      }
      if (createdEntities.supplierIds.length > 0) {
        await db.query('DELETE FROM suppliers WHERE id = ANY($1::uuid[])', [createdEntities.supplierIds]);
      }
      if (createdEntities.categoryIds.length > 0) {
        await db.query('DELETE FROM categories WHERE id = ANY($1::uuid[])', [createdEntities.categoryIds]);
      }
      // General safety cleanup for QA prefixes
      await cleanQaData();
    } catch (err) {
      console.error('Error during QA cleanup:', err.message);
    } finally {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await db.pool.end();
    }
  });

  // =========================================================================
  // SECTION 1: AUTHENTICATION, AUTHORIZATION & RBAC ENFORCEMENT
  // =========================================================================
  describe('1. Authentication, Authorization & Security', () => {
    test('POST /api/auth/login rejects invalid password with 401', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@fertilizershop.local', password: 'WrongPassword!123' }),
      });
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /invalid email or password/i);
    });

    test('POST /api/auth/login rejects non-existent email with generic 401 (prevent enumeration)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent.user@fertilizershop.local', password: 'Password@123' }),
      });
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /invalid email or password/i);
    });

    test('POST /api/auth/login rejects missing fields with 400 or 422 validation error', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }),
      });
      assert.ok([400, 422].includes(res.status));
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.errors && json.errors.length > 0 || json.message);
    });

    test('GET /api/sales rejects unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/sales`);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /token is missing/i);
    });

    test('GET /api/sales rejects malformed or fabricated JWT token with 401', async () => {
      const res = await fetch(`${baseUrl}/sales`, {
        headers: { Authorization: 'Bearer fabricated.invalid.jwt.token' },
      });
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /invalid/i);
    });

    test('GET /api/auth/admin-only allows ADMIN and denies STAFF with 403 Forbidden', async () => {
      const adminRes = await fetch(`${baseUrl}/auth/admin-only`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminRes.status, 200);

      const staffRes = await fetch(`${baseUrl}/auth/admin-only`, {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      assert.equal(staffRes.status, 403);
      const staffJson = await staffRes.json();
      assert.equal(staffJson.success, false);
      assert.match(staffJson.message, /insufficient permissions/i);
    });
  });

  // =========================================================================
  // SECTION 2: CATEGORY & PRODUCT CATALOG CRUD & INPUT VALIDATION
  // =========================================================================
  describe('2. Category & Product Catalog CRUD & Validation', () => {
    let qaCategoryId;
    let qaProductId;
    const qaProductCode = `QA-PRD-${Date.now().toString().slice(-4)}`;

    test('POST /api/categories allows ADMIN to create category', async () => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: `QA Bio-Stimulants ${Date.now()}`,
          description: 'Automated QA testing category',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.id);
      qaCategoryId = json.data.id;
      createdEntities.categoryIds.push(qaCategoryId);
    });

    test('POST /api/categories denies STAFF with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({ name: 'Staff Category' }),
      });
      assert.equal(res.status, 403);
    });

    test('POST /api/categories rejects duplicate category name with 409 Conflict', async () => {
      // Fetch category just created
      const catRes = await fetch(`${baseUrl}/categories/${qaCategoryId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const cat = (await catRes.json()).data;

      const dupRes = await fetch(`${baseUrl}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: cat.name }),
      });
      assert.equal(dupRes.status, 409);
    });

    test('POST /api/products creates product with initial stock inward audit', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: qaProductCode,
          name: `QA Liquid Organic Potash ${qaProductCode}`,
          categoryId: qaCategoryId,
          brand: 'QA Agro Science',
          packageType: 'Bottles',
          packageSize: '1L',
          unit: 'Bottles (1L)',
          costPrice: 220.0,
          price: 310.0,
          minThreshold: 15,
          initialStock: 50,
          description: 'High-grade organic potash solution for QA test suite',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.id);
      assert.equal(json.data.stock, 50);
      assert.equal(json.data.status, 'In Stock');
      qaProductId = json.data.id;
      createdEntities.productIds.push(qaProductId);

      // Verify initial stock inward movement in stock_movements
      const movRes = await fetch(`${baseUrl}/inventory/movements?productId=${qaProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(movRes.status, 200);
      const movJson = await movRes.json();
      assert.ok(movJson.data.length > 0);
      const initialMov = movJson.data[0];
      assert.ok(['OPENING_STOCK', 'PURCHASE'].includes(initialMov.type));
      assert.equal(Number(initialMov.changeQuantity || initialMov.changeQty), 50);
    });

    test('POST /api/products denies STAFF creation with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          name: 'Staff Product',
          categoryId: qaCategoryId,
          costPrice: 100,
          price: 150,
        }),
      });
      assert.equal(res.status, 403);
    });

    test('POST /api/products rejects duplicate product code with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: qaProductCode,
          name: 'Duplicate Product Attempt',
          categoryId: qaCategoryId,
          costPrice: 100,
          price: 150,
        }),
      });
      assert.equal(res.status, 409);
    });

    test('POST /api/products rejects negative price with 400/422', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: `QA-NEG-${Date.now().toString().slice(-4)}`,
          name: 'Negative Price Product',
          categoryId: qaCategoryId,
          costPrice: -50,
          price: 100,
        }),
      });
      assert.ok([400, 422].includes(res.status));
    });

    test('GET /api/products/:id resolves by UUID and SKU code', async () => {
      // By UUID
      const resUuid = await fetch(`${baseUrl}/products/${qaProductId}`, {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      assert.equal(resUuid.status, 200);
      const jsonUuid = await resUuid.json();
      assert.equal(jsonUuid.data.id, qaProductId);

      // By SKU code
      const resCode = await fetch(`${baseUrl}/products/${qaProductCode}`, {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      assert.equal(resCode.status, 200);
      const jsonCode = await resCode.json();
      assert.equal(jsonCode.data.id, qaProductId);
    });

    test('GET /api/products/:id returns 404 for non-existent product', async () => {
      const res = await fetch(`${baseUrl}/products/00000000-0000-0000-0000-000000000000`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 404);
    });

    test('PATCH /api/products/:id updates non-stock attributes', async () => {
      const res = await fetch(`${baseUrl}/products/${qaProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          price: 330.0,
          minThreshold: 20,
          brand: 'QA Premium Bio Agro',
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.price, 330.0);
      assert.equal(json.data.minThreshold, 20);
      assert.equal(json.data.brand, 'QA Premium Bio Agro');
    });
  });

  // =========================================================================
  // SECTION 3: SUPPLIER & CUSTOMER CRUD & ARCHIVE WORKFLOWS
  // =========================================================================
  describe('3. Supplier & Customer Management CRUD & Archival', () => {
    let qaSupplierId;
    let qaCustomerId;
    const uniqueSuffix = Date.now().toString().slice(-4);
    const testPhone = `998877${uniqueSuffix}`;

    test('POST /api/suppliers creates supplier (Admin)', async () => {
      const res = await fetch(`${baseUrl}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: `QA Agro Chemicals Pvt Ltd ${uniqueSuffix}`,
          contactPerson: 'QA Manager',
          phone: testPhone,
          email: `supplier${uniqueSuffix}@qa-agro.local`,
          address: 'Plot 42, Industrial Chemical Zone, MIDC',
          openingBalance: 0,
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.id);
      qaSupplierId = json.data.id;
      createdEntities.supplierIds.push(qaSupplierId);
    });

    test('POST /api/suppliers rejects duplicate supplier name with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: `QA Agro Chemicals Pvt Ltd ${uniqueSuffix}`,
          phone: `998800${uniqueSuffix}`,
        }),
      });
      assert.equal(res.status, 409);
    });

    test('POST /api/customers registers new customer account (Staff & Admin)', async () => {
      const res = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          name: `QA Farmer Suresh ${uniqueSuffix}`,
          phone: `982233${uniqueSuffix}`,
          village: 'QA Shivapur Green Belt',
          address: 'Farm House 14, Gat No 88',
          creditLimit: 75000,
          openingBalance: 0,
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.id);
      assert.equal(json.data.creditLimit, 75000);
      qaCustomerId = json.data.id;
      createdEntities.customerIds.push(qaCustomerId);
    });

    test('DELETE /api/customers/:id is DENIED to STAFF (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/customers/${qaCustomerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      assert.equal(res.status, 403);
    });

    test('DELETE /api/customers/:id and POST restore works for ADMIN', async () => {
      // Archive
      const delRes = await fetch(`${baseUrl}/customers/${qaCustomerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(delRes.status, 200);

      // Verify archived customer does not show in active default list
      const listRes = await fetch(`${baseUrl}/customers?search=${uniqueSuffix}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const listJson = await listRes.json();
      assert.equal(listJson.data.length, 0);

      // Restore
      const restoreRes = await fetch(`${baseUrl}/customers/${qaCustomerId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(restoreRes.status, 200);

      // Verify active again
      const activeRes = await fetch(`${baseUrl}/customers/${qaCustomerId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const activeJson = await activeRes.json();
      assert.equal(activeJson.data.isActive, true);
    });
  });

  // =========================================================================
  // SECTION 4: INVENTORY MOVEMENTS, ADJUSTMENTS & COST VALUATION
  // =========================================================================
  describe('4. Stock Adjustments & Movement Audit Ledger', () => {
    let adjProductId;

    before(async () => {
      // Create dedicated product for stock adjustment testing
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: `QA-ADJ-${Date.now().toString().slice(-4)}`,
          name: `QA Micronutrient Chelate ${Date.now()}`,
          category: 'Micronutrients',
          packageType: 'Packets',
          packageSize: '1kg',
          unit: 'Packets (1kg)',
          costPrice: 150.0,
          price: 210.0,
          minThreshold: 10,
          initialStock: 25,
        }),
      });
      const json = await res.json();
      adjProductId = json.data.id;
      createdEntities.productIds.push(adjProductId);
    });

    test('POST /api/inventory/adjustments ADD increases stock and logs movement', async () => {
      const res = await fetch(`${baseUrl}/inventory/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          productId: adjProductId,
          operation: 'ADD',
          quantity: 15,
          reason: 'QA Inward verification adjustment',
          reference: 'QA-REF-001',
        }),
      });
      assert.ok([200, 201].includes(res.status));
      const json = await res.json();
      assert.equal(json.data.product.stock, 40); // 25 + 15
      assert.equal(Number(json.data.movement.changeQty || json.data.movement.changeQuantity), 15);
      assert.ok(['ADDED', 'INWARD'].includes(json.data.movement.actionType));
    });

    test('POST /api/inventory/adjustments REDUCE decreases stock and logs movement', async () => {
      const res = await fetch(`${baseUrl}/inventory/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          productId: adjProductId,
          operation: 'REDUCE',
          quantity: 10,
          reason: 'QA Damaged packaging write-off',
          reference: 'QA-REF-002',
        }),
      });
      assert.ok([200, 201].includes(res.status));
      const json = await res.json();
      assert.equal(json.data.product.stock, 30); // 40 - 10
      assert.equal(Number(json.data.movement.changeQty || json.data.movement.changeQuantity), -10);
      assert.ok(['UPDATE', 'OUTWARD'].includes(json.data.movement.actionType));
    });

    test('POST /api/inventory/adjustments CORRECT sets absolute stock level', async () => {
      const res = await fetch(`${baseUrl}/inventory/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          productId: adjProductId,
          operation: 'CORRECT',
          quantity: 22,
          reason: 'QA Physical stock reconciliation audit',
          reference: 'QA-AUDIT-003',
        }),
      });
      assert.ok([200, 201].includes(res.status));
      const json = await res.json();
      assert.equal(json.data.product.stock, 22);
      assert.equal(Number(json.data.movement.changeQty || json.data.movement.changeQuantity), -8); // from 30 to 22 = -8
    });

    test('POST /api/inventory/adjustments rejects missing reason with 400/422', async () => {
      const res = await fetch(`${baseUrl}/inventory/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          productId: adjProductId,
          operation: 'ADD',
          quantity: 5,
          reason: '', // Mandatory!
        }),
      });
      assert.ok([400, 422].includes(res.status));
      const json = await res.json();
      assert.ok(json.message || json.errors);
    });

    test('POST /api/inventory/adjustments REDUCE rejects quantity greater than stock with 400', async () => {
      const res = await fetch(`${baseUrl}/inventory/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          productId: adjProductId,
          operation: 'REDUCE',
          quantity: 9999, // Current stock is 22
          reason: 'Excess reduction test',
        }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /insufficient stock/i);
    });

    test('GET /api/inventory/valuation computes cost price valuation accurately', async () => {
      const res = await fetch(`${baseUrl}/inventory/valuation`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      const valSummary = json.summary || json.data;
      assert.ok(typeof valSummary.totalCostValuation === 'number');
      assert.ok(typeof valSummary.totalRetailValuation === 'number');
      assert.ok(valSummary.totalRetailValuation >= valSummary.totalCostValuation);
    });
  });

  // =========================================================================
  // SECTION 5: COMPLETE PURCHASE WORKFLOW & SUPPLIER ACCOUNTS PAYABLE
  // =========================================================================
  describe('5. Complete Purchase Order Workflow & Accounts Payable', () => {
    let purchaseSupplierId;
    let purchaseProductId;
    let createdPurchaseId;
    let initialStock;

    before(async () => {
      const suf = Date.now().toString().slice(-4);
      // Create supplier
      const sRes = await fetch(`${baseUrl}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: `QA National Fertilizers Ltd ${suf}`,
          phone: `911222${suf}`,
          email: `nfl${suf}@qa.local`,
          openingBalance: 0,
        }),
      });
      purchaseSupplierId = (await sRes.json()).data.id;
      createdEntities.supplierIds.push(purchaseSupplierId);

      // Create product
      const pRes = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          code: `QA-PUR-${suf}`,
          name: `QA Granular Urea 46N ${suf}`,
          category: 'Nitrogenous',
          costPrice: 240.0,
          price: 268.0,
          initialStock: 10,
        }),
      });
      const pData = (await pRes.json()).data;
      purchaseProductId = pData.id;
      initialStock = pData.stock;
      createdEntities.productIds.push(purchaseProductId);
    });

    test('POST /api/purchases records wholesale order and atomically increments stock', async () => {
      const orderQty = 40;
      const unitCost = 240.0;
      const expectedTotal = orderQty * unitCost; // 9600

      const res = await fetch(`${baseUrl}/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          supplierId: purchaseSupplierId,
          supplierInvoiceNumber: `NFL-INV-${Date.now().toString().slice(-6)}`,
          paymentStatus: 'UNPAID',
          paidAmount: 0,
          items: [
            {
              productId: purchaseProductId,
              quantity: orderQty,
              costPrice: unitCost,
            },
          ],
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.id);
      assert.equal(json.data.totalAmount, expectedTotal);
      createdPurchaseId = json.data.id;
      createdEntities.purchaseIds.push(createdPurchaseId);

      // Verify stock was increased
      const pRes = await fetch(`${baseUrl}/products/${purchaseProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const pData = (await pRes.json()).data;
      assert.equal(pData.stock, initialStock + orderQty);

      // Verify purchase order dueAmount reflects this purchase
      const poRes = await fetch(`${baseUrl}/purchases/${createdPurchaseId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const poData = (await poRes.json()).data;
      assert.equal(Number(poData.dueAmount), expectedTotal);
    });

    test('POST /api/purchases/:id/payments records supplier disbursement and decreases AP', async () => {
      const disburseAmount = 5000.0;

      const res = await fetch(`${baseUrl}/purchases/${createdPurchaseId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          amount: disburseAmount,
          paymentMethod: 'BANK_TRANSFER',
          reference: `QA-DISBURSE-${Date.now().toString().slice(-4)}`,
          notes: 'Partial supplier payment against PO',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      const paymentId = json.data?.payment?.id || json.data?.id;
      if (paymentId) {
        createdEntities.supplierPaymentIds.push(paymentId);
      }

      // Verify purchase outstanding due decreased
      const poRes2 = await fetch(`${baseUrl}/purchases/${createdPurchaseId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const poData2 = (await poRes2.json()).data;
      assert.equal(Number(poData2.dueAmount), 9600 - 5000); // 4600
      assert.equal(Number(poData2.paidAmount), 5000);
    });
  });

  // =========================================================================
  // SECTION 6: COMPLETE POS SALES, INVOICING & CONCURRENCY
  // =========================================================================
  describe('6. POS Sales, Invoicing, Stock Deductions & Concurrency', () => {
    let salesCustomerId;
    let salesProductId;
    let initialProductStock = 30;

    before(async () => {
      const suf = Date.now().toString().slice(-4);
      // Customer
      const cRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: `QA Farmer Anand ${suf}`,
          phone: `976655${suf}`,
          village: 'QA Shivapur East',
          creditLimit: 50000,
          openingBalance: 0,
        }),
      });
      salesCustomerId = (await cRes.json()).data.id;
      createdEntities.customerIds.push(salesCustomerId);

      // Product
      const pRes = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          code: `QA-SAL-${suf}`,
          name: `QA Single Super Phosphate ${suf}`,
          category: 'Phosphatic',
          costPrice: 420.0,
          price: 480.0,
          initialStock: initialProductStock,
        }),
      });
      salesProductId = (await pRes.json()).data.id;
      createdEntities.productIds.push(salesProductId);
    });

    test('POST /api/sales generates cash sale, verifies totals on server, and deducts inventory', async () => {
      const sellQty = 5;
      const unitPrice = 480.0;
      const gstRate = 5; // 5% exclusive
      const expectedSubtotal = sellQty * unitPrice; // 2400
      const expectedGst = expectedSubtotal * (gstRate / 100); // 120
      const expectedTotal = expectedSubtotal + expectedGst; // 2520

      const res = await fetch(`${baseUrl}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          customerId: null, // Walk-in customer allowed for cash
          customerName: 'Walk-in Farmer',
          items: [{ productId: salesProductId, quantity: sellQty, unitPrice }],
          gstRate,
          gstMode: 'EXCLUSIVE',
          paymentMethod: 'CASH',
          paidAmount: expectedTotal,
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.id);
      assert.ok(json.data.invoiceNumber);
      assert.equal(Number(json.data.subtotal), expectedSubtotal);
      assert.equal(Number(json.data.gstAmount), expectedGst);
      assert.equal(Number(json.data.totalAmount), expectedTotal);
      assert.equal(json.data.paymentStatus, 'PAID');
      createdEntities.saleIds.push(json.data.id);

      // Verify stock was deducted
      const pRes = await fetch(`${baseUrl}/products/${salesProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const pData = (await pRes.json()).data;
      assert.equal(pData.stock, initialProductStock - sellQty); // 30 - 5 = 25
    });

    test('POST /api/sales rejects CREDIT sale without registered customer', async () => {
      const res = await fetch(`${baseUrl}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          customerId: null, // No customer!
          customerName: 'Anonymous Walk-in',
          items: [{ productId: salesProductId, quantity: 2, unitPrice: 480 }],
          paymentMethod: 'CREDIT (KHATA)',
          paidAmount: 0,
        }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /require a registered customer/i);
    });

    test('POST /api/sales rejects sale when requested quantity exceeds available stock (Rollback test)', async () => {
      // Current stock is 25
      const pResBefore = await fetch(`${baseUrl}/products/${salesProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const stockBefore = (await pResBefore.json()).data.stock;

      const res = await fetch(`${baseUrl}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          customerId: salesCustomerId,
          items: [{ productId: salesProductId, quantity: stockBefore + 10, unitPrice: 480 }],
          paymentMethod: 'CASH',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /insufficient stock/i);

      // Verify atomic rollback: stock has NOT changed
      const pResAfter = await fetch(`${baseUrl}/products/${salesProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const stockAfter = (await pResAfter.json()).data.stock;
      assert.equal(stockAfter, stockBefore, 'Stock must remain unchanged on aborted sale');
    });

    test('Concurrency: Competing simultaneous sales cannot oversell stock', async () => {
      // Current stock is 25. Launch 3 parallel requests of 10 items each (total requested = 30).
      // Only 2 requests can succeed (10 + 10 = 20), the 3rd must fail due to row-level locks and stock checks.
      const sell10 = () =>
        fetch(`${baseUrl}/sales`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cashierToken}`,
          },
          body: JSON.stringify({
            customerId: salesCustomerId,
            items: [{ productId: salesProductId, quantity: 10, unitPrice: 480 }],
            paymentMethod: 'CASH',
            paidAmount: 4800,
          }),
        });

      const [res1, res2, res3] = await Promise.all([sell10(), sell10(), sell10()]);

      const statuses = [res1.status, res2.status, res3.status];
      const successCount = statuses.filter((s) => s === 201).length;
      const failureCount = statuses.filter((s) => s === 400).length;

      assert.equal(successCount, 2, 'Exactly 2 sales should succeed with 20 items');
      assert.equal(failureCount, 1, 'Exactly 1 sale should be rejected due to insufficient stock');

      // Track created sale IDs for cleanup
      for (const res of [res1, res2, res3]) {
        if (res.status === 201) {
          const json = await res.json();
          createdEntities.saleIds.push(json.data.id);
        }
      }

      // Verify stock remaining is exactly 5 (25 - 20)
      const pResFinal = await fetch(`${baseUrl}/products/${salesProductId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const finalStock = (await pResFinal.json()).data.stock;
      assert.equal(finalStock, 5);
    });
  });

  // =========================================================================
  // SECTION 7: PAYMENT ALLOCATIONS & KHATA LEDGER RECONCILIATION
  // =========================================================================
  describe('7. Payment Allocations & Customer Khata Reconciliations', () => {
    let khataCustomerId;
    let khataSaleId;
    let khataTotalAmount = 4800.0;

    before(async () => {
      const suf = Date.now().toString().slice(-4);
      // Create customer
      const cRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: `QA Farmer Khata Bal ${suf}`,
          phone: `955444${suf}`,
          village: 'QA Shivapur West',
          creditLimit: 60000,
          openingBalance: 0,
        }),
      });
      khataCustomerId = (await cRes.json()).data.id;
      createdEntities.customerIds.push(khataCustomerId);

      // Create product with ample stock
      const pRes = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          code: `QA-KHT-${suf}`,
          name: `QA Organic NPK Granules ${suf}`,
          category: 'Complex',
          costPrice: 400,
          price: 480,
          initialStock: 100,
        }),
      });
      const prodId = (await pRes.json()).data.id;
      createdEntities.productIds.push(prodId);

      // Create Credit Sale
      const saleRes = await fetch(`${baseUrl}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
        body: JSON.stringify({
          customerId: khataCustomerId,
          items: [{ productId: prodId, quantity: 10, unitPrice: 480 }],
          paymentMethod: 'CREDIT (KHATA)',
          paidAmount: 0,
          gstRate: 0,
        }),
      });
      const sData = (await saleRes.json()).data;
      khataSaleId = sData.id;
      khataTotalAmount = Number(sData.totalAmount);
      createdEntities.saleIds.push(khataSaleId);
    });

    test('Initial Credit Sale reflects UNPAID status and creates customer outstanding due', async () => {
      const balRes = await fetch(`${baseUrl}/customers/${khataCustomerId}/balance`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(balRes.status, 200);
      const bal = (await balRes.json()).data;
      assert.equal(bal.outstandingDues, khataTotalAmount);
    });

    test('POST /api/sales/:id/payments records partial payment and updates status to PARTIAL', async () => {
      const partialPay = 2000.0;
      const res = await fetch(`${baseUrl}/sales/${khataSaleId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          amount: partialPay,
          method: 'UPI',
          reference: 'QA-UPI-PARTIAL-01',
          notes: 'Partial installment payment',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      const paymentId = json.data?.payment?.id || json.data?.id;
      assert.ok(paymentId);
      createdEntities.paymentIds.push(paymentId);

      // Verify invoice due is now 2800 (4800 - 2000) and status PARTIAL
      const saleRes = await fetch(`${baseUrl}/sales/${khataSaleId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const saleData = (await saleRes.json()).data;
      assert.equal(Number(saleData.dueAmount), 2800.0);
      assert.equal(saleData.paymentStatus, 'PARTIAL');

      // Verify customer outstanding due reflects partial payment
      const balRes = await fetch(`${baseUrl}/customers/${khataCustomerId}/balance`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const bal = (await balRes.json()).data;
      assert.equal(bal.outstandingDues, 2800.0);
    });

    test('POST /api/sales/:id/payments rejects overpayment exceeding due balance with 400', async () => {
      // Remaining due is 2800. Attempt payment of 3500.
      const res = await fetch(`${baseUrl}/sales/${khataSaleId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          amount: 3500.0,
          method: 'CASH',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /exceeds/i);
    });

    test('POST /api/sales/:id/payments records remainder payment and completes invoice to PAID', async () => {
      const remainder = 2800.0;
      const res = await fetch(`${baseUrl}/sales/${khataSaleId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          amount: remainder,
          method: 'CASH',
          reference: 'QA-CASH-FINAL-02',
          notes: 'Final settlement payment',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      const finalPaymentId = json.data?.payment?.id || json.data?.id;
      assert.ok(finalPaymentId);
      createdEntities.paymentIds.push(finalPaymentId);

      // Verify invoice is fully paid
      const saleRes = await fetch(`${baseUrl}/sales/${khataSaleId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const saleData = (await saleRes.json()).data;
      assert.equal(Number(saleData.dueAmount), 0.0);
      assert.equal(saleData.paymentStatus, 'PAID');

      // Verify customer outstanding due is now 0
      const balRes = await fetch(`${baseUrl}/customers/${khataCustomerId}/balance`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const bal = (await balRes.json()).data;
      assert.equal(bal.outstandingDues, 0.0);
    });

    test('GET /api/customers/:id/ledger reconciles running balance against sales and payments', async () => {
      const res = await fetch(`${baseUrl}/customers/${khataCustomerId}/ledger`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.entries));
      assert.ok(json.data.entries.length >= 3); // Opening, Sale, Payment 1, Payment 2

      // Closing running balance in ledger must equal 0.00
      const lastEntry = json.data.entries[json.data.entries.length - 1];
      assert.equal(Number(lastEntry.runningBalance), 0.0);
      assert.equal(Number(json.data.outstandingDues), 0.0);
    });
  });

  // =========================================================================
  // SECTION 8: DASHBOARD & FINANCIAL REPORT RECONCILIATION
  // =========================================================================
  describe('8. Dashboard & Reporting Reconciliation', () => {
    test('GET /api/reports/dashboard aggregates KPIs from verified transactions', async () => {
      const res = await fetch(`${baseUrl}/reports/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      assert.ok(json.data.sales);
      assert.ok(typeof json.data.sales.turnover === 'number');
      assert.ok(json.data.inventory);
      assert.ok(typeof json.data.inventory.activeProducts === 'number');
      assert.ok(json.data.accountsReceivable);
      assert.ok(typeof json.data.accountsReceivable.outstandingReceivables === 'number');
      assert.ok(json.data.accountsPayable);
      assert.ok(typeof json.data.accountsPayable.outstandingPayables === 'number');
    });

    test('GET /api/reports/sales provides period breakdowns', async () => {
      const res = await fetch(`${baseUrl}/reports/sales?period=today`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      const salesSummary = json.summary || json.data;
      assert.ok(typeof salesSummary.grossSales === 'number' || typeof salesSummary.totalSalesAmount === 'number' || typeof salesSummary.totalAmount === 'number');
    });

    test('GET /api/reports/gst-summary returns tax compliance metrics for ADMIN', async () => {
      const res = await fetch(`${baseUrl}/reports/gst-summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data);
    });

    test('GET /api/reports/supplier-dues denies STAFF with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/supplier-dues`, {
        headers: { Authorization: `Bearer ${cashierToken}` },
      });
      assert.equal(res.status, 403);
    });
  });
});
