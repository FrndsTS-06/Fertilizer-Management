-- ============================================================================
-- SCRIPT: 000_rollback_all.sql
-- PROJECT: Fertilizer Shop Management System
-- TARGET: PostgreSQL 18.6 | Database: fertilizer_management
-- DESCRIPTION: Development environment emergency rollback script.
--              Drops views, indexes, and tables in strict reverse-dependency order.
--
-- CRITICAL PRODUCTION WARNING:
-- This script is strictly for clean development resets prior to go-live.
-- ONCE PRODUCTION COMMENCES AND LIVE INVOICES / PAYMENTS ARE RECORDED, EXECUTING
-- THIS SCRIPT WILL RESULT IN IRREVERSIBLE FINANCIAL AND INVENTORY DATA LOSS.
-- In production environments, use forward-only migrations (expand-and-contract).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DROP ACCOUNTING & REPORTING VIEWS
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_inventory_valuation;
DROP VIEW IF EXISTS v_customer_balances;
DROP VIEW IF EXISTS v_invoice_balances;

-- ----------------------------------------------------------------------------
-- 2. DROP TABLES IN STRICT REVERSE-DEPENDENCY ORDER
-- ----------------------------------------------------------------------------
-- Financial transaction line items and receipts
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;

-- Supplier inward purchases and payouts
DROP TABLE IF EXISTS supplier_payments;
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS purchases;

-- Physical inventory audit ledger & master catalog
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS products;

-- Master entities
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS store_settings;

COMMIT;
