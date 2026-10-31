-- ============================================================================
-- MIGRATION: 002_performance_indexes.sql
-- PROJECT: Fertilizer Shop Management System
-- TARGET: PostgreSQL 18.6 | Database: fertilizer_management
-- DESCRIPTION: Non-redundant B-tree performance indexes for foreign keys, 
--              chronological sort columns, status filters, and case-insensitive searches.
--
-- NOTE ON REDUNDANCY:
-- All columns declared PRIMARY KEY or UNIQUE (products.code, customers.phone,
-- sales.invoice_number, payments.receipt_number, etc.) already possess an automatic
-- underlying B-tree unique index in PostgreSQL. They are omitted here to prevent write I/O waste.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PRODUCTS INDEXES
-- ----------------------------------------------------------------------------
-- Accelerates category-based catalog filtering
CREATE INDEX IF NOT EXISTS idx_products_category_id 
    ON products USING btree (category_id);

-- Accelerates low-stock and out-of-stock badge filtering
CREATE INDEX IF NOT EXISTS idx_products_status 
    ON products USING btree (status);

-- Accelerates case-insensitive product name lookups
CREATE INDEX IF NOT EXISTS idx_products_lower_name 
    ON products USING btree (LOWER(name));

-- ----------------------------------------------------------------------------
-- STOCK MOVEMENTS INDEXES
-- ----------------------------------------------------------------------------
-- Accelerates item audit history drawer
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id 
    ON stock_movements USING btree (product_id);

-- Accelerates filtering by movement type (PURCHASE, SALE, ADJUSTMENT)
CREATE INDEX IF NOT EXISTS idx_stock_movements_type 
    ON stock_movements USING btree (movement_type);

-- Accelerates chronological audit trail ordering
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at 
    ON stock_movements USING btree (created_at DESC);

-- ----------------------------------------------------------------------------
-- CUSTOMERS INDEXES
-- ----------------------------------------------------------------------------
-- Accelerates village-based customer filtering
CREATE INDEX IF NOT EXISTS idx_customers_village 
    ON customers USING btree (village);

-- Accelerates case-insensitive customer name search
CREATE INDEX IF NOT EXISTS idx_customers_lower_name 
    ON customers USING btree (LOWER(name));

-- ----------------------------------------------------------------------------
-- SALES & SALE ITEMS INDEXES
-- ----------------------------------------------------------------------------
-- Accelerates customer purchase history retrieval
CREATE INDEX IF NOT EXISTS idx_sales_customer_id 
    ON sales USING btree (customer_id);

-- Accelerates payment status filtering (UNPAID, PARTIAL, PAID)
CREATE INDEX IF NOT EXISTS idx_sales_payment_status 
    ON sales USING btree (payment_status);

-- Accelerates chronological sales reporting and dashboard feeds
CREATE INDEX IF NOT EXISTS idx_sales_sale_date 
    ON sales USING btree (sale_date DESC);

-- Accelerates line-item joins for invoice printing
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
    ON sale_items USING btree (sale_id);

-- Accelerates product sales history analytics
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id 
    ON sale_items USING btree (product_id);

-- ----------------------------------------------------------------------------
-- PURCHASES & PURCHASE ITEMS INDEXES
-- ----------------------------------------------------------------------------
-- Accelerates supplier purchase order lookups
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id 
    ON purchases USING btree (supplier_id);

-- Accelerates purchase line-item queries
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id 
    ON purchase_items USING btree (purchase_id);

-- Accelerates product purchase cost history
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id 
    ON purchase_items USING btree (product_id);

-- ----------------------------------------------------------------------------
-- PAYMENTS INDEXES
-- ----------------------------------------------------------------------------
-- Accelerates customer payment history drawer
CREATE INDEX IF NOT EXISTS idx_payments_customer_id 
    ON payments USING btree (customer_id);

-- Accelerates invoice-specific payment allocation lookups
CREATE INDEX IF NOT EXISTS idx_payments_sale_id 
    ON payments USING btree (sale_id);

-- Accelerates daily cash-up and chronological payment reports
CREATE INDEX IF NOT EXISTS idx_payments_date 
    ON payments USING btree (payment_date DESC);

-- ----------------------------------------------------------------------------
-- SUPPLIER PAYMENTS INDEXES
-- ----------------------------------------------------------------------------
-- Accelerates supplier account payout history
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id 
    ON supplier_payments USING btree (supplier_id);

-- Accelerates purchase invoice settlement queries
CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase_id 
    ON supplier_payments USING btree (purchase_id);

COMMIT;
