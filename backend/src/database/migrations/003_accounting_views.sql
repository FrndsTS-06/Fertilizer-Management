-- ============================================================================
-- MIGRATION: 003_accounting_views.sql
-- PROJECT: Fertilizer Shop Management System
-- TARGET: PostgreSQL 18.6 | Database: fertilizer_management
-- DESCRIPTION: Core business and accounting views for real-time customer balances,
--              invoice payment allocations, and inventory stock valuations.
--
-- ACCOUNTING INVARIANTS:
-- 1. Double-counting is prevented by using `payments` as the sole source of truth
--    for collections. `sales.paid_amount` is never summed with `payments.amount`.
-- 2. Dues are dynamically computed from the immutable debt minus remitted cash.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PER-INVOICE BALANCE & PAYMENT ALLOCATION VIEW
-- Computes allocated receipts, remaining dues, and payment state per bill.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_invoice_balances CASCADE;
CREATE OR REPLACE VIEW v_invoice_balances AS
SELECT 
    s.id AS sale_id,
    s.invoice_number,
    s.customer_id,
    s.customer_name,
    s.customer_phone,
    s.customer_village,
    s.billing_type,
    s.sale_date,
    s.subtotal,
    s.gst_rate,
    s.gst_mode,
    s.gst_amount,
    s.total_amount,
    -- Allocated paid amount:
    -- If direct walk-in sale (customer_id IS NULL), direct counter remittance recorded on sales applies.
    -- If customer account sale (customer_id IS NOT NULL), payments table is sole source of truth.
    CASE 
        WHEN s.customer_id IS NULL THEN s.paid_amount::NUMERIC
        ELSE COALESCE(p.allocated_paid, 0.00)::NUMERIC
    END AS allocated_paid,
    -- Calculated remaining due on this invoice:
    CASE 
        WHEN s.customer_id IS NULL THEN s.due_amount::NUMERIC
        ELSE GREATEST(0.00, s.total_amount - COALESCE(p.allocated_paid, 0.00))::NUMERIC
    END AS remaining_due,
    -- Dynamically derived payment status:
    CASE 
        WHEN s.customer_id IS NULL THEN s.payment_status::TEXT
        WHEN COALESCE(p.allocated_paid, 0.00) >= s.total_amount THEN 'PAID'::TEXT
        WHEN COALESCE(p.allocated_paid, 0.00) > 0.00 THEN 'PARTIAL'::TEXT
        ELSE 'UNPAID'::TEXT
    END AS computed_payment_status
FROM sales s
LEFT JOIN (
    SELECT 
        sale_id,
        SUM(amount) AS allocated_paid
    FROM payments
    WHERE sale_id IS NOT NULL
    GROUP BY sale_id
) p ON s.id = p.sale_id;

COMMENT ON VIEW v_invoice_balances IS 'Real-time invoice payment state derived strictly from allocated receipts in payments table';

-- ----------------------------------------------------------------------------
-- 2. CUSTOMER KHATA BALANCE & RECONCILIATION VIEW
-- Single source of truth for farmer accounts:
-- - Total Purchases = Opening balance + All finalized sales
-- - Total Paid = All cash/online payments recorded (both allocated & unallocated)
-- - Outstanding Dues = Total Purchases - Total Paid (Floored at 0.00)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_customer_balances AS
SELECT 
    c.id AS customer_id,
    c.customer_code,
    c.name,
    c.phone,
    c.village,
    c.credit_limit,
    c.opening_balance,
    -- 1. Total Purchases = Opening balance + Sum of all finalized sales total_amount
    ROUND(c.opening_balance + COALESCE(s.total_invoiced, 0.00), 2) AS total_purchases,
    -- 2. Total Paid = Sum of all receipts recorded in the payments table
    ROUND(COALESCE(p.total_payments_received, 0.00), 2) AS total_paid,
    -- 3. Outstanding Dues = Total Debt - Total Paid (Floored at 0 to prevent negative dues)
    ROUND(GREATEST(0.00, (c.opening_balance + COALESCE(s.total_invoiced, 0.00)) - COALESCE(p.total_payments_received, 0.00)), 2) AS outstanding_dues,
    -- 4. Available Credit = Max(0, Credit Limit - Outstanding Dues)
    ROUND(GREATEST(0.00, c.credit_limit - GREATEST(0.00, (c.opening_balance + COALESCE(s.total_invoiced, 0.00)) - COALESCE(p.total_payments_received, 0.00))), 2) AS available_credit,
    -- 5. Customer Status Indicator
    CASE 
        WHEN ((c.opening_balance + COALESCE(s.total_invoiced, 0.00)) - COALESCE(p.total_payments_received, 0.00)) > 0.00 THEN 'HAS_DUES'
        ELSE 'CLEARED'
    END AS balance_status
FROM customers c
LEFT JOIN (
    SELECT 
        customer_id,
        SUM(total_amount) AS total_invoiced
    FROM sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
) s ON c.id = s.customer_id
LEFT JOIN (
    SELECT 
        customer_id,
        SUM(amount) AS total_payments_received
    FROM payments
    GROUP BY customer_id
) p ON c.id = p.customer_id;

COMMENT ON VIEW v_customer_balances IS 'Single source of truth for customer Khata ledger: eliminates double-counting by reconciling all payments directly against gross invoice totals';

-- ----------------------------------------------------------------------------
-- 3. INVENTORY STOCK VALUATION VIEW
-- Calculates purchase valuation, market valuation, and expected profit margins
-- directly inside PostgreSQL, matching frontend Reports page specifications.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_inventory_valuation AS
SELECT 
    p.id AS product_id,
    p.code AS product_code,
    p.name AS product_name,
    c.name AS category_name,
    p.brand,
    p.package_type,
    p.package_size,
    p.unit,
    p.stock,
    p.cost_price,
    p.price AS selling_price,
    ROUND(p.stock * p.cost_price, 2) AS total_cost_valuation,
    ROUND(p.stock * p.price, 2) AS total_retail_valuation,
    ROUND(GREATEST(0.00, (p.stock * p.price) - (p.stock * p.cost_price)), 2) AS potential_profit,
    p.status AS stock_status
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.is_active = TRUE;

COMMENT ON VIEW v_inventory_valuation IS 'Real-time stock valuation and margin analysis view powering Reports & Analytics';

COMMIT;
