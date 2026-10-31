# Database Migrations: Fertilizer Management System

**Target Database:** `fertilizer_management`  
**Database Engine:** PostgreSQL 18.6  
**Architecture:** Normalized Relational with Immutable Movement & Payment Ledgers  

---

## 1. File Structure & Execution Order

All migration files are versioned, idempotent, and wrapped in transaction blocks (`BEGIN ... COMMIT`). They must be executed in strict numerical sequence:

| Step | Migration File | Scope & Contents |
| :--- | :--- | :--- |
| **01** | `001_core_schema.sql` | 13 normalized tables (`store_settings`, `categories`, `suppliers`, `users`, `customers`, `products`, `stock_movements`, `purchases`, `purchase_items`, `supplier_payments`, `sales`, `sale_items`, `payments`), check constraints, and generated columns. |
| **02** | `002_performance_indexes.sql` | 21 non-redundant B-tree indexes for foreign keys, statuses, dates, and lowercase search fields. |
| **03** | `003_accounting_views.sql` | 3 core views: `v_invoice_balances`, `v_customer_balances` (single source of truth Khata balance), and `v_inventory_valuation`. |
| **04** | `004_seed_initial_data.sql` | Baseline configuration: store settings, 7 standard categories, 5 fertilizer manufacturers, admin account, 8 catalog products, and 5 customer accounts. |
| **Reset** | `000_rollback_all.sql` | **Development Reset Only**: Drops all views and tables in reverse dependency order. |

---

## 2. Execution Methods

> [!CAUTION]
> **DO NOT EXECUTE** these scripts until explicitly authorized. The database currently remains unapplied.

### Option A: Via `psql` (CLI)
```bash
# Connect to PostgreSQL and run each script in order:
psql -U postgres -d fertilizer_management -f backend/src/database/migrations/001_core_schema.sql
psql -U postgres -d fertilizer_management -f backend/src/database/migrations/002_performance_indexes.sql
psql -U postgres -d fertilizer_management -f backend/src/database/migrations/003_accounting_views.sql
psql -U postgres -d fertilizer_management -f backend/src/database/migrations/004_seed_initial_data.sql
```

### Option B: Via pgAdmin 4 (GUI)
1. Open **pgAdmin 4** and connect to your local PostgreSQL server.
2. Ensure the database `fertilizer_management` exists.
3. Open the **Query Tool** (`Tools` > `Query Tool`).
4. Load and execute files `001` through `004` sequentially using the `F5` key.

---

## 3. Production Rollback & Safety Restrictions

* Once production operations commence and live customer bills or payments are logged, **DO NOT RUN `000_rollback_all.sql`**.
* In a production environment, schema evolution must follow the **Expand/Contract pattern**:
  1. Add new columns/tables in a forward migration.
  2. Backfill historical records.
  3. Deprecate and remove obsolete structures in a subsequent migration.
* Always generate an automated database snapshot prior to executing any DDL:
  ```bash
  pg_dump -h localhost -U postgres -d fertilizer_management -Fc -f "pre_migration_backup_$(date +%Y%m%d_%H%M%S).dump"
  ```
