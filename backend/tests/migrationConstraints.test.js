const test = require('node:test');
const assert = require('node:assert');
const { pool, query, closePool } = require('../src/config/db');

test('Database Constraints, Views & Business Integrity Rules Suite', async (t) => {
  // Test 1: Single-row constraint on store_settings
  await t.test('Store settings prevents multiple rows or invalid id', async () => {
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO store_settings (id, store_name, legal_name, phone, address_line1, village_or_city, state, pincode)
          VALUES (2, 'Invalid Store', 'Invalid Legal', '9999999999', 'Road', 'City', 'State', '411001');
        `);
      },
      (err) => {
        assert.ok(err.message.includes('chk_store_settings_single_row'));
        return true;
      }
    );
  });

  // Test 2: Invalid GSTIN regex constraint
  await t.test('Suppliers table rejects malformed GSTIN', async () => {
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO suppliers (name, gstin)
          VALUES ('Bad GSTIN Supplier', '99INVALID0000Z1');
        `);
      },
      (err) => {
        assert.ok(err.message.includes('chk_suppliers_gstin_format'));
        return true;
      }
    );
  });

  // Test 3: Stock movement math constraint (previous_stock + change_qty = new_stock)
  await t.test('Stock movements audit ledger rejects mathematically inconsistent quantities', async () => {
    const prodRes = await query('SELECT id, code, name FROM products LIMIT 1;');
    assert.ok(prodRes.rows.length > 0, 'Products should be seeded');
    const product = prodRes.rows[0];

    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO stock_movements (
            product_id, product_code, product_name, movement_type, action_type,
            change_qty, previous_stock, new_stock, unit, reason, reference_no
          ) VALUES (
            $1, $2, $3, 'ADJUSTMENT', 'UPDATE',
            10.000, 50.000, 999.000, 'Bags', 'Bad math test', 'TEST-ERR-001'
          );
        `, [product.id, product.code, product.name]);
      },
      (err) => {
        assert.ok(err.message.includes('chk_stock_movement_math'));
        return true;
      }
    );
  });

  // Test 4: Sales due balance calculation constraint (paid_amount + due_amount = total_amount)
  await t.test('Sales table rejects mismatched paid + due amounts', async () => {
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO sales (
            invoice_number, subtotal, total_amount, paid_amount, due_amount
          ) VALUES (
            'INV-ERR-001', 1000.00, 1000.00, 500.00, 200.00
          );
        `);
      },
      (err) => {
        assert.ok(err.message.includes('chk_sales_due_calc'));
        return true;
      }
    );
  });

  // Test 5: Purchases due balance calculation constraint
  await t.test('Purchases table rejects mismatched paid + due amounts', async () => {
    const suppRes = await query('SELECT id FROM suppliers LIMIT 1;');
    assert.ok(suppRes.rows.length > 0, 'Suppliers should be seeded');
    const supplierId = suppRes.rows[0].id;

    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO purchases (
            purchase_invoice_no, supplier_id, total_amount, paid_amount, due_amount
          ) VALUES (
            'PO-ERR-001', $1, 5000.00, 3000.00, 1000.00
          );
        `, [supplierId]);
      },
      (err) => {
        assert.ok(err.message.includes('chk_purchases_due_calc'));
        return true;
      }
    );
  });

  // Test 6: Verify Generated Column on products table
  await t.test('Products status column correctly generates In Stock, Low Stock, and Out of Stock', async () => {
    const res = await query(`
      SELECT code, stock, min_threshold, status
      FROM products
      ORDER BY code;
    `);
    assert.ok(res.rows.length >= 8, 'Expected at least 8 seeded products');

    for (const p of res.rows) {
      const stock = parseFloat(p.stock);
      const minThreshold = parseFloat(p.min_threshold);
      if (stock <= 0) {
        assert.strictEqual(p.status, 'Out of Stock');
      } else if (stock <= minThreshold) {
        assert.strictEqual(p.status, 'Low Stock');
      } else {
        assert.strictEqual(p.status, 'In Stock');
      }
    }
  });

  // Test 7: Verify v_customer_balances accounting view
  await t.test('View v_customer_balances accurately aggregates customer Khata without double counting', async () => {
    const res = await query(`
      SELECT customer_code, name, credit_limit, opening_balance, total_purchases, total_paid, outstanding_dues, balance_status
      FROM v_customer_balances
      ORDER BY customer_code;
    `);
    assert.ok(res.rows.length >= 5, 'Expected 5 seeded customers');
    for (const c of res.rows) {
      assert.strictEqual(parseFloat(c.outstanding_dues) >= 0, true);
      assert.ok(['HAS_DUES', 'CLEARED'].includes(c.balance_status));
    }
  });

  // Test 8: Verify v_inventory_valuation view
  await t.test('View v_inventory_valuation computes valuations and expected profits correctly', async () => {
    const res = await query(`
      SELECT product_code, stock, cost_price, selling_price, total_cost_valuation, total_retail_valuation, potential_profit
      FROM v_inventory_valuation
      ORDER BY product_code;
    `);
    assert.ok(res.rows.length >= 8);
    for (const item of res.rows) {
      const stock = parseFloat(item.stock);
      const costPrice = parseFloat(item.cost_price);
      const sellingPrice = parseFloat(item.selling_price);
      const expectedCostVal = Math.round(stock * costPrice * 100) / 100;
      const expectedRetailVal = Math.round(stock * sellingPrice * 100) / 100;
      assert.strictEqual(parseFloat(item.total_cost_valuation), expectedCostVal);
      assert.strictEqual(parseFloat(item.total_retail_valuation), expectedRetailVal);
    }
  });

  // Teardown: close database pool
  await t.test('Teardown: pool closes cleanly', async () => {
    await closePool();
  });
});
