-- ============================================================================
-- MIGRATION: 005_sales_billing_type.sql
-- PROJECT: Fertilizer Shop Management System
-- TARGET: PostgreSQL 18.6 | Database: fertilizer_management
-- DESCRIPTION: Add explicit billing_type column to sales table to reliably
--              differentiate between Retail Bills (counter walk-in, no Khata debt)
--              and Customer Bills (registered farmer accounts with Khata ledger).
-- ============================================================================

BEGIN;

-- 1. Add billing_type column with default 'RETAIL' and check constraint
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20) NOT NULL DEFAULT 'RETAIL' 
CHECK (billing_type IN ('RETAIL', 'CUSTOMER'));

-- 2. Backfill existing records based on customer relationship
UPDATE sales SET billing_type = 'CUSTOMER' WHERE customer_id IS NOT NULL;
UPDATE sales SET billing_type = 'RETAIL' WHERE customer_id IS NULL;

-- 3. Create performance index for fast filtering by billing_type
CREATE INDEX IF NOT EXISTS idx_sales_billing_type ON sales (billing_type);

-- 4. Update comment on sales table
COMMENT ON COLUMN sales.billing_type IS 'Explicit classification: RETAIL for direct walk-in counter bills, CUSTOMER for registered farmer Khata accounts';

COMMIT;

