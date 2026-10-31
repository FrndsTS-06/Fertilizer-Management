-- ============================================================================
-- MIGRATION: 001_core_schema.sql
-- PROJECT: Fertilizer Shop Management System
-- TARGET: PostgreSQL 18.6 | Database: fertilizer_management
-- DESCRIPTION: Core relational schema with normalized tables, exact precision,
--              referential integrity, check constraints, and generated columns.
--
-- EXECUTION NOTICE:
-- Wrapped in an explicit transaction block (BEGIN ... COMMIT).
-- If any error occurs during execution, all changes are automatically rolled back.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. STORE & SYSTEM SETTINGS
-- Single-row configuration entity holding store trade name, legal details,
-- GSTIN, and default tax configurations. Prevents hardcoding in application code.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
    id INT PRIMARY KEY DEFAULT 1,
    store_name VARCHAR(150) NOT NULL DEFAULT 'Fertilizer Shop',
    legal_name VARCHAR(150) NOT NULL DEFAULT 'Agricultural Input Retailer',
    gstin VARCHAR(15) NULL,
    phone VARCHAR(20) NOT NULL DEFAULT '9999999999',
    email VARCHAR(100) NULL,
    address_line1 VARCHAR(150) NOT NULL DEFAULT 'Main Market Road',
    address_line2 VARCHAR(150) NULL,
    village_or_city VARCHAR(100) NOT NULL DEFAULT 'District Center',
    state VARCHAR(50) NOT NULL DEFAULT 'Maharashtra',
    pincode VARCHAR(10) NOT NULL DEFAULT '411001',
    default_gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00 CHECK (default_gst_rate >= 0.00 AND default_gst_rate <= 100.00),
    default_gst_mode VARCHAR(20) NOT NULL DEFAULT 'EXCLUSIVE' CHECK (default_gst_mode IN ('EXCLUSIVE', 'INCLUSIVE')),
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
    receipt_prefix VARCHAR(10) NOT NULL DEFAULT 'REC',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_store_settings_single_row CHECK (id = 1),
    CONSTRAINT chk_store_settings_gstin_format CHECK (
        gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    )
);

COMMENT ON TABLE store_settings IS 'Single-row configuration for store identity, GSTIN, and invoice prefix';
COMMENT ON COLUMN store_settings.default_gst_rate IS 'Standard Indian fertilizer GST rate (5.00% standard for chemical/bio fertilizers)';

-- ----------------------------------------------------------------------------
-- 2. PRODUCT CATEGORIES
-- Master categories for fertilizer and chemical classification.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE categories IS 'Classification for products (Nitrogenous, Phosphatic, Potassic, Micronutrients, etc.)';

-- ----------------------------------------------------------------------------
-- 3. SUPPLIERS / DISTRIBUTORS
-- Manufacturers, wholesalers, and fertilizer distribution companies.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    contact_person VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    address TEXT NULL,
    gstin VARCHAR(15) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_suppliers_gstin_format CHECK (
        gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    )
);

COMMENT ON TABLE suppliers IS 'Fertilizer manufacturers and wholesale distributors';

-- ----------------------------------------------------------------------------
-- 4. SYSTEM USERS & CASHIERS
-- Authentication entity for staff and store administrators.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'User accounts and cashiers for point-of-sale attribution';

-- ----------------------------------------------------------------------------
-- 5. CUSTOMERS / FARMERS
-- Master customer directory with village location and Khata credit tracking.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NULL UNIQUE,
    village VARCHAR(100) NULL,
    address TEXT NULL,
    credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0.00),
    opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0.00),
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS 'Farmer accounts with credit limit and opening Khata balance';
COMMENT ON COLUMN customers.opening_balance IS 'Pre-existing historical debt prior to software adoption';

-- ----------------------------------------------------------------------------
-- 6. PRODUCTS (FERTILIZER INVENTORY MASTER)
-- Master product catalog with SKU code, packaging, pricing, and stock.
-- Stock quantity is DECIMAL(12, 3) to support fractional kg, grams, and liters.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand VARCHAR(100) NOT NULL DEFAULT 'Standard',
    package_type VARCHAR(50) NOT NULL DEFAULT 'Bags',
    package_size VARCHAR(50) NOT NULL DEFAULT '50kgs',
    unit VARCHAR(100) NOT NULL,
    cost_price DECIMAL(12, 2) NOT NULL CHECK (cost_price >= 0.00),
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0.00),
    stock DECIMAL(12, 3) NOT NULL DEFAULT 0.000 CHECK (stock >= 0.000),
    min_threshold DECIMAL(12, 3) NOT NULL DEFAULT 10.000 CHECK (min_threshold >= 0.000),
    photo TEXT NULL,
    description TEXT NULL,
    status VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN stock <= 0.000 THEN 'Out of Stock'
            WHEN stock <= min_threshold THEN 'Low Stock'
            ELSE 'In Stock'
        END
    ) STORED,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS 'Master catalog of fertilizers, pesticides, and seeds';
COMMENT ON COLUMN products.stock IS 'Physical warehouse quantity on hand in product units (3 decimal places)';
COMMENT ON COLUMN products.status IS 'Generated alert badge: Out of Stock, Low Stock, or In Stock';

-- ----------------------------------------------------------------------------
-- 7. STOCK MOVEMENT AUDIT LEDGER
-- Immutable log of every inventory increment or decrement.
-- Math check enforces previous_stock + change_qty = new_stock.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'OPENING_STOCK')),
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('ADDED', 'SELL', 'UPDATE')),
    change_qty DECIMAL(12, 3) NOT NULL,
    previous_stock DECIMAL(12, 3) NOT NULL CHECK (previous_stock >= 0.000),
    new_stock DECIMAL(12, 3) NOT NULL CHECK (new_stock >= 0.000),
    unit VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
    reference_no VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stock_movement_math CHECK (ROUND(previous_stock + change_qty, 3) = ROUND(new_stock, 3))
);

COMMENT ON TABLE stock_movements IS 'Immutable physical inventory audit ledger tracking every stock addition or reduction';

-- ----------------------------------------------------------------------------
-- 8. PURCHASES (STOCK INWARD ORDERS) & ACCOUNTS PAYABLE
-- Decouples order lifecycle status from payment status.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_invoice_no VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0.00),
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0.00),
    due_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (due_amount >= 0.00),
    lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED' CHECK (lifecycle_status IN ('DRAFT', 'RECEIVED', 'CANCELLED')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID')),
    notes TEXT NULL,
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_purchases_due_calc CHECK (ROUND(paid_amount + due_amount, 2) = ROUND(total_amount, 2))
);

COMMENT ON TABLE purchases IS 'Distributor inward invoices and stock purchase orders';

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0.000),
    unit_cost DECIMAL(12, 2) NOT NULL CHECK (unit_cost >= 0.00),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0.00),
    unit VARCHAR(50) NOT NULL
);

COMMENT ON TABLE purchase_items IS 'Line items purchased in a stock inward order';

CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_id UUID NULL REFERENCES purchases(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0.00),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER' CHECK (payment_method IN ('BANK_TRANSFER', 'CHEQUE', 'UPI', 'CASH')),
    reference_no VARCHAR(100) NULL,
    notes TEXT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE supplier_payments IS 'Outward disbursements paid to wholesale suppliers';

-- ----------------------------------------------------------------------------
-- 9. SALES (POS INVOICES) & ACCOUNTS RECEIVABLE
-- Retail invoices supporting both counter walk-in and credit Khata billing.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(150) NOT NULL DEFAULT 'Direct Counter Sale',
    customer_phone VARCHAR(20) NULL,
    customer_village VARCHAR(100) NULL,
    billing_type VARCHAR(20) NOT NULL DEFAULT 'RETAIL' CHECK (billing_type IN ('RETAIL', 'CUSTOMER')),
    owner_gstin VARCHAR(15) NULL,
    created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0.00),
    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00 CHECK (gst_rate >= 0.00 AND gst_rate <= 100.00),
    gst_mode VARCHAR(20) NOT NULL DEFAULT 'EXCLUSIVE' CHECK (gst_mode IN ('EXCLUSIVE', 'INCLUSIVE')),
    gst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (gst_amount >= 0.00),
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0.00),
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0.00),
    due_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (due_amount >= 0.00),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'UPI', 'CREDIT (KHATA)', 'CARD', 'CHEQUE')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PARTIAL', 'UNPAID')),
    sale_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sales_due_calc CHECK (ROUND(paid_amount + due_amount, 2) = ROUND(total_amount, 2))
);

COMMENT ON TABLE sales IS 'Point-of-sale retail bills and farmer Khata credit sales';

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0.000),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0.00),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0.00),
    unit VARCHAR(50) NOT NULL
);

COMMENT ON TABLE sale_items IS 'Line items sold under an invoice with historical price snapshot';

-- ----------------------------------------------------------------------------
-- 10. PAYMENTS (CUSTOMER INWARD RECEIPTS)
-- Single source of truth for customer collections.
-- Supports both invoice-allocated and on-account farmer deposits.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sale_id UUID NULL REFERENCES sales(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0.00),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE')),
    reference_no VARCHAR(100) NULL,
    notes TEXT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE payments IS 'Customer cash and online payments (single source of truth for Khata balance)';
COMMENT ON COLUMN payments.sale_id IS 'Specific invoice being settled, or NULL for unallocated on-account deposit';

COMMIT;
