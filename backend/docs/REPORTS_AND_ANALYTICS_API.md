# Dashboard & Reporting Analytics API Specification

## 1. Overview
This specification details the reporting and analytics subsystem for the **Fertilizer Management System** (Phase 14).
It covers executive dashboard KPIs, sales turnover analysis, inventory stock valuation, customer accounts receivable (Khata aging), supplier accounts payable, GST compliance metrics, and unified transaction auditing.

All analytics are derived using **server-side database aggregations (SQL CTEs and database views)**. Under no circumstances are unbounded raw datasets downloaded into Node.js application memory.

---

## 2. Core Accounting Principles & Data Integrity

### 2.1 Single Source of Truth
All reporting metrics correspond strictly to finalized transactions and audited accounting views:
1. **Customer Receivables**: Directly sourced from `v_customer_balances`:
   $$\text{Total Invoiced Debt} = \text{opening\_balance} + \sum(\text{sales.total\_amount})$$
   $$\text{Total Collections Received} = \sum(\text{payments.amount})$$
   $$\text{Outstanding Dues} = \max(0.00, \text{Total Invoiced Debt} - \text{Total Collections Received})$$
2. **Inventory Stock Valuation**: Sourced from `v_inventory_valuation`:
   $$\text{Total Cost Valuation} = \sum(\text{stock} \times \text{cost\_price})$$
   $$\text{Total Retail/Market Valuation} = \sum(\text{stock} \times \text{selling\_price})$$
   $$\text{Potential Inventory Profit} = \max(0.00, \text{Total Retail Valuation} - \text{Total Cost Valuation})$$
   $$\text{Profit Margin \%} = \frac{\text{Potential Profit}}{\text{Total Retail Valuation}} \times 100\%$$
3. **Supplier Accounts Payable**: Sourced from `purchases` (`lifecycle_status != 'CANCELLED'`) and `supplier_payments`:
   $$\text{Total Outstanding Payables} = \sum(\text{purchases.due\_amount})$$
   $$\text{Disbursements Paid} = \sum(\text{supplier\_payments.amount})$$

### 2.2 Prevention of Duplicate Joins (Cartesian Product Inflation)
A frequent flaw in reporting systems occurs when joining parent tables with multiple independent one-to-many child relations (e.g., `sales JOIN sale_items JOIN payments`). When an invoice contains 3 items and 2 payments, a naive join yields $3 \times 2 = 6$ rows, inflating financial sums by $600\%$.

**Engineering Safeguards Implemented**:
- Independent child tables are **never** joined directly in multi-level aggregation queries.
- Each dimension is aggregated in isolation inside a Common Table Expression (CTE) or subquery with explicit `GROUP BY` prior to joining.
- Pre-aggregated database views (`v_customer_balances`, `v_inventory_valuation`) are used where available.

### 2.3 Timezone & Date Boundary Standardization
All transaction timestamps in PostgreSQL are stored with timezone (`TIMESTAMPTZ`, UTC).
- **Date-Only Strings (`YYYY-MM-DD`)**:
  - `startDate`: Interpreted as the start of that day: `YYYY-MM-DDT00:00:00.000Z`.
  - `endDate`: Interpreted as the end of that day: `YYYY-MM-DDT23:59:59.999Z`.
- **Predefined Presets**:
  - `'today'`: `00:00:00.000` to `23:59:59.999` of current UTC date.
  - `'yesterday'`: `00:00:00.000` to `23:59:59.999` of previous UTC date.
  - `'this-week'`: Monday `00:00:00.000` of current ISO week to end of current day.
  - `'this-month'`: Day 1 `00:00:00.000` of current month to end of current day.
  - `'last-month'`: Day 1 `00:00:00.000` of previous month to last day `23:59:59.999` of previous month.
  - `'this-quarter'`: Start of current 3-month fiscal quarter to end of current day.
  - `'this-year'`: Jan 1st `00:00:00.000` of current year to end of current day.
  - `'all'`: Unbounded.
- **Validation**: Enforces `startDate <= endDate`. If `startDate > endDate`, the system rejects the request with HTTP `422 Unprocessable Entity` / `400 Bad Request`.

### 2.4 Role-Based Authorization
- **Operational Reports** (`ADMIN`, `STAFF`):
  - Executive Dashboard (`/api/reports/dashboard`)
  - Sales Breakdown (`/api/reports/sales`)
  - Purchases Analysis (`/api/reports/purchases`)
  - Low-Stock Alerts (`/api/reports/low-stock`)
  - Inventory Stock Valuation (`/api/reports/inventory-valuation`)
  - Customer Khata Dues (`/api/reports/customer-dues`)
  - Payments Summary (`/api/reports/payments-summary`)
  - Product-Level Performance (`/api/reports/product-sales`)
  - Transaction History Audit (`/api/reports/history`)
- **Sensitive Financial & Compliance Reports** (**ADMIN Only**):
  - Supplier Accounts Payable (`/api/reports/supplier-dues`) — Prevents unauthorized staff visibility into wholesale procurement debt and supplier terms.
  - GST / Tax Summary (`/api/reports/gst-summary`) — Restricted to store management and accounting personnel.

---

## 3. API Endpoints Specification

Base paths: `/api/reports` and `/api/v1/reports`.

---

### 3.1 GET `/api/reports/dashboard`
Executive KPI summary powering the main application dashboard cards and recent activity feeds.
- **Aliases**: `/api/dashboard`, `/api/dashboard/summary`, `/api/reports`
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `period` (`today`, `yesterday`, `this-week`, `this-month`, `last-month`, `this-quarter`, `this-year`, `all`)
  - `startDate`, `endDate` (ISO date string)
  - `limitRecent` (integer, default `5`, max `20`)
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "period": { "startDate": "...", "endDate": "...", "periodName": "this-month" },
      "sales": {
        "count": 42,
        "turnover": 128450.00,
        "subtotal": 115200.00,
        "taxCollected": 13250.00,
        "averageBillValue": 3058.33
      },
      "purchases": {
        "count": 8,
        "totalAmount": 95000.00,
        "paidAmount": 70000.00,
        "dueAmount": 25000.00,
        "averageOrderValue": 11875.00
      },
      "accountsReceivable": {
        "totalCustomers": 120,
        "customersWithDues": 18,
        "totalInvoicedDebt": 245000.00,
        "totalPaid": 195000.00,
        "outstandingReceivables": 50000.00,
        "availableCredit": 1150000.00
      },
      "accountsPayable": {
        "suppliersWithPayables": 3,
        "outstandingPayables": 25000.00
      },
      "inventory": {
        "activeProducts": 45,
        "stockUnits": 1240.000,
        "inStock": 38,
        "lowStock": 5,
        "outOfStock": 2,
        "costValuation": 320000.00,
        "retailValuation": 415000.00,
        "potentialProfit": 95000.00,
        "marginPercent": 22.89
      },
      "collections": {
        "count": 39,
        "totalAmount": 86500.00,
        "cash": 45000.00,
        "upi": 31500.00,
        "bank": 10000.00,
        "cheque": 0.00
      },
      "recentActivity": {
        "sales": [...],
        "purchases": [...],
        "payments": [...]
      }
    }
  }
  ```

---

### 3.2 GET `/api/reports/sales`
Detailed sales turnover report with status, payment method, and daily time-series distribution.
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `period`, `startDate`, `endDate`
  - `customerId` (UUID or customer code/name)
  - `paymentMethod` (`CASH`, `CREDIT`, `UPI`, `SPLIT`, `ALL`)
  - `paymentStatus` (`PAID`, `PARTIAL`, `UNPAID`, `ALL`)
  - `page` (default `1`), `limit` (default `50`)
- **Key Metrics**:
  - `grossSales`: Sum of `sales.total_amount`
  - `taxableAmount`: Sum of `sales.subtotal`
  - `taxCollected`: Sum of `sales.gst_amount`
  - `paidAmount`: Sum of `sales.paid_amount`
  - `dueAmount`: Sum of `sales.due_amount`

---

### 3.3 GET `/api/reports/purchases`
Inward distributor purchase orders, received totals, and procurement payable status.
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `period`, `startDate`, `endDate`
  - `supplierId` (UUID or name)
  - `paymentStatus` (`PAID`, `PARTIAL`, `UNPAID`, `ALL`)
  - `lifecycleStatus` (`RECEIVED`, `DRAFT`, `CANCELLED`, `ALL`)
  - `page`, `limit`

---

### 3.4 GET `/api/reports/low-stock`
Actionable inventory replenishment report showing products at or below their configured minimum stock threshold.
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `categoryId`, `status` (`LOW_STOCK`, `OUT_OF_STOCK`, `ALL`), `search`, `page`, `limit`
- **Key Metrics**:
  - `reorderDeficit`: $\max(0, \text{min\_stock\_threshold} - \text{stock})$
  - `estimatedCostToRestock`: $\text{reorderDeficit} \times \text{cost\_price}$
  - `estimatedReorderCost`: Total cost required to restore all depleted products back to their minimum threshold.

---

### 3.5 GET `/api/reports/inventory-valuation`
Comprehensive inventory asset valuation and margin analysis matching `Reports.jsx`.
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `categoryId`, `brand`, `stockStatus`, `search`, `page`, `limit`
- **Formulas**:
  - `totalCostValuation`: $\sum(\text{stock} \times \text{cost\_price})$
  - `totalRetailValuation`: $\sum(\text{stock} \times \text{selling\_price})$
  - `potentialProfit`: $\max(0, \text{totalRetailValuation} - \text{totalCostValuation})$
  - `overallProfitMarginPercent`: $\frac{\text{potentialProfit}}{\text{totalRetailValuation}} \times 100\%$

---

### 3.6 GET `/api/reports/customer-dues`
Customer credit accounts receivable, outstanding balance distribution, and aging buckets.
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `balanceStatus` (`HAS_DUES`, `CLEARED`, `ALL`), `village`, `search`, `page`, `limit`
- **Aging Analysis**:
  - `dues0To30Days`: Invoices aged $\le 30$ days.
  - `dues31To60Days`: Invoices aged 31 to 60 days.
  - `dues61To90Days`: Invoices aged 61 to 90 days.
  - `duesOver90Days`: Invoices aged $> 90$ days.

---

### 3.7 GET `/api/reports/supplier-dues`
Accounts payable report detailing distributor procurement debts.
- **Access**: **ADMIN Only** (HTTP 403 for Staff)
- **Query Parameters**:
  - `search`, `page`, `limit`
- **Key Metrics**:
  - `totalPurchasesInvoiced`: Total inward purchases from supplier.
  - `totalDisbursementsPaid`: Total disbursements remitted to supplier via `supplier_payments`.
  - `outstandingPayables`: Current unpaid balance on purchase invoices.

---

### 3.8 GET `/api/reports/gst-summary`
Statutory tax compliance report summarizing output tax liabilities, CGST, SGST, and rate distributions.
- **Access**: **ADMIN Only** (HTTP 403 for Staff)
- **Query Parameters**:
  - `period`, `startDate`, `endDate`
- **Rate Breakdown**:
  - Slices gross sales, taxable subtotal, and tax collected by statutory rate: 0%, 5%, 12%, 18%, 28%.
  - Central Goods & Services Tax (CGST) = $50\%$ of GST Amount.
  - State Goods & Services Tax (SGST) = $50\%$ of GST Amount.
- **Mode Breakdown**:
  - Segregates Tax-Inclusive vs. Tax-Exclusive retail sales.

---

### 3.9 GET `/api/reports/payments-summary`
Cash-flow audit reconciling customer inward receipts against distributor outward disbursements.
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `period`, `startDate`, `endDate`
- **Key Metrics**:
  - `totalCollected`: Inward collections from customers.
  - `allocatedAmount`: Collections applied directly to sales invoices.
  - `onAccountAmount`: Advance farmer deposits without bill assignment.
  - `totalDisbursed`: Outward disbursements to wholesale suppliers.
  - `netCashFlow`: $\text{totalCollected} - \text{totalDisbursed}$.

---

### 3.10 GET `/api/reports/product-sales`
Product profitability, volume sales, turn rates, and Cost of Goods Sold (COGS).
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `period`, `startDate`, `endDate`, `categoryId`, `sortBy` (`revenue`, `quantity`, `profit`, `name`, `stock`), `sortOrder` (`ASC`, `DESC`), `page`, `limit`
- **Formulas**:
  - `totalCogs`: $\text{quantitySold} \times \text{costPrice}$
  - `grossProfit`: $\text{revenue} - \text{totalCogs}$
  - `marginPercent`: $\frac{\text{grossProfit}}{\text{revenue}} \times 100\%$

---

### 3.11 GET `/api/reports/history`
Unified audit stream across sales, purchases, and collections.
- **Access**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `type` (`ALL`, `SALE`, `PURCHASE`, `PAYMENT`), `startDate`, `endDate`, `page`, `limit`

---

## 4. Error Catalog

| Status Code | Scenario | Message Format |
| :--- | :--- | :--- |
| `400 / 422` | Invalid date format or date boundary violation | `{"success": false, "message": "Request validation failed", "errors": ["startDate cannot be chronologically later than endDate"]}` |
| `401` | Missing or invalid JWT Bearer token | `{"success": false, "message": "Authentication token is missing or malformed"}` |
| `403` | Staff attempting to view Admin-only report (`supplier-dues`, `gst-summary`) | `{"success": false, "message": "Insufficient permissions. Access requires one of: [ADMIN]"}` |
| `404` | Non-existent sub-resource or invalid filter | `{"success": false, "message": "Resource not found"}` |
