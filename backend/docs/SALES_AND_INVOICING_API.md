# POS Sales & Invoicing API Specification — Fertilizer Management System

## 1. Overview
This specification details the RESTful endpoints, transactional inventory deductions, point-of-sale calculations, GST compliance rules, walk-in counter billing, farmer Khata credit billing, and authorization rules for **Phase 12 — POS Sales & Invoicing**.

### 1.1 Architectural & POS Accounting Invariants

1. **Atomic Transactional Coupling**:
   - Creating a retail bill (`POST /api/sales`) atomically executes:
     1. Resolves and locks product rows via exclusive row locks (`SELECT ... FOR UPDATE`).
     2. Verifies stock availability (`currentStock >= requestedQty`). If any line item has insufficient inventory, throws `400 Bad Request` and rolls back immediately.
     3. Decrements warehouse physical stock in `products`.
     4. Inserts immutable audit ledger records in `stock_movements` with `movement_type = 'SALE'`, `action_type = 'SELL'`, and negative `change_qty`.
     5. Inserts the invoice master record into `sales`.
     6. Persists line items snapshot in `sale_items` with item quantity, unit price, and subtotal.
     7. If a registered customer makes an initial payment (`paidAmount > 0`), inserts a payment receipt in `payments` linking `customer_id` and `sale_id`.
   - If any step fails or a constraint is violated, the entire transaction rolls back via `ROLLBACK`, leaving zero orphaned header, item, payment, or movement records.

2. **Server-Side Totals & GST Calculations**:
   - **Never trust client-submitted subtotals, tax amounts, or total payable amounts.**
   - All calculations are recalculated from catalog prices and verified item quantities:
     - Item Subtotal: `ROUND(quantity * unitPrice - itemDiscount, 2)`.
     - Order Subtotal: `SUM(itemSubtotals) - orderDiscount`.
     - **Tax-Exclusive Mode (`EXCLUSIVE`)**:
       - `gstAmount = ROUND((taxableSubtotal * gstRate) / 100, 2)`
       - `totalAmount = ROUND(taxableSubtotal + gstAmount, 2)`
     - **Tax-Inclusive Mode (`INCLUSIVE`)**:
       - `gstAmount = ROUND((taxableSubtotal * gstRate) / (100 + gstRate), 2)`
       - `totalAmount = ROUND(taxableSubtotal, 2)`
       - Taxable base = `totalAmount - gstAmount`.

3. **Walk-in Counter vs. Farmer Khata Credit Billing**:
   - **Direct Walk-in Counter Sales**:
     - Permitted when `customerId` is null or omitted.
     - Default customer name: `'Direct Counter Sale'`.
     - Requires immediate payment (`paymentMethod IN ('CASH', 'UPI', 'CARD', 'CHEQUE')`).
     - `paidAmount` must equal `totalAmount` (`dueAmount = 0.00`).
     - Walk-in customers **cannot** carry unpaid credit or debt.
   - **Farmer Khata Credit Sales (`CREDIT (KHATA)`)**:
     - Requires a registered customer account (`customerId` must be a valid active customer).
     - Permits down payments (`paidAmount >= 0`, `dueAmount = totalAmount - paidAmount`).
     - Payment status derived dynamically: `'PAID'`, `'PARTIAL'`, or `'UNPAID'`.
     - Customer Khata balance (`v_customer_balances`) and customer statement (`v_invoice_balances`) reflect the debt in real time.

4. **Unique Sequential Invoice Numbers**:
   - Invoice numbers are strictly unique across the system (`sales.invoice_number`).
   - If omitted in the request, automatically generated using store settings prefix: `INV-YYYYMMDD-XXXX`.
   - Client-provided custom invoice numbers are verified for uniqueness (`409 Conflict` if duplicate).

5. **No Hardcoded GST Registration**:
   - Store GSTIN and registration details are read dynamically from `store_settings` or verified against client request (`ownerGstin`).
   - No fabricated or hardcoded GSTINs exist in source code.

6. **Role-Based Access Control**:
   - Staff (`STAFF`) and Administrators (`ADMIN`) can create bills, retrieve invoice details, and view sales history.
   - Unauthenticated requests are rejected with `401 Unauthorized`.

---

## 2. Sales REST Endpoints

All endpoints are available under `/api/sales` (and `/api/v1/sales`).

---

### 2.1 GET `/api/sales/summary`
Get aggregated sales revenue, tax collections, and billing volume.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Query Parameters** (Optional):
  * `startDate` (`YYYY-MM-DD` or ISO string)
  * `endDate` (`YYYY-MM-DD` or ISO string)
  * `paymentStatus` (`PAID`, `PARTIAL`, `UNPAID`, or `All`)
  * `paymentMethod` (`CASH`, `UPI`, `CREDIT (KHATA)`, `CARD`, `CHEQUE`)
  * `search` (Search by customer, invoice number, phone)
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "totalSalesCount": 45,
      "totalSalesAmount": 128500.00,
      "totalPaidAmount": 115000.00,
      "totalDueAmount": 13500.00,
      "totalGstAmount": 6125.00,
      "paidBillsCount": 41,
      "partialBillsCount": 2,
      "unpaidBillsCount": 2,
      "walkInSalesCount": 25,
      "customerSalesCount": 20
    }
  }
  ```

---

### 2.2 GET `/api/sales`
List sales invoices with date filtering, status filters, and pagination.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Query Parameters**:
  * `page` (default `1`)
  * `limit` (default `50`, max `100`)
  * `startDate` (`YYYY-MM-DD`): Filter invoices on or after this date
  * `endDate` (`YYYY-MM-DD`): Filter invoices on or before this date
  * `customerId` (UUID or customer name)
  * `paymentStatus` (`PAID`, `PARTIAL`, `UNPAID`)
  * `paymentMethod` (`CASH`, `UPI`, `CREDIT (KHATA)`, `CARD`, `CHEQUE`)
  * `search` (Search text)
  * `sortBy` (`sale_date`, `invoice_number`, `total_amount`, `customer_name`)
  * `sortOrder` (`ASC` or `DESC`, default `DESC`)
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "18f98c62-8758-4ee0-bb34-31518b5bcf41",
        "invoiceNumber": "INV-20261027-0001",
        "customerId": "81f185ef-9685-48ef-b5f6-c0c9f13cba14",
        "customerName": "Dnyaneshwar Patil",
        "customerPhone": "9822114455",
        "customerVillage": "Khed Shivapur",
        "subtotal": 2400.00,
        "gstRate": 5.00,
        "gstMode": "EXCLUSIVE",
        "gstAmount": 120.00,
        "totalAmount": 2520.00,
        "paidAmount": 2520.00,
        "dueAmount": 0.00,
        "paymentMethod": "UPI",
        "paymentStatus": "PAID",
        "saleDate": "2026-10-27T10:30:00.000Z",
        "itemCount": 2,
        "items": [
          {
            "id": "2cf55d14-38bb-4a57-8df2-0fbc49ebcf48",
            "productId": "79de0914-fb12-4fe3-979b-2ec32386121f",
            "productCode": "PRD001",
            "productName": "Neem Coated Urea (45kg)",
            "quantity": 5,
            "unitPrice": 266.50,
            "subtotal": 1332.50,
            "unit": "Bags (45kgs)"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "summary": { ... }
  }
  ```

---

### 2.3 GET `/api/sales/:id`
Retrieve print-ready sales invoice with customer profile, store settings, line items, and payment receipts.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Path Parameters**:
  * `id`: UUID of the invoice or exact `invoiceNumber` (e.g. `INV-20261027-0001`)
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "id": "18f98c62-8758-4ee0-bb34-31518b5bcf41",
      "invoiceNumber": "INV-20261027-0001",
      "customerId": "81f185ef-9685-48ef-b5f6-c0c9f13cba14",
      "customerName": "Dnyaneshwar Patil",
      "customerPhone": "9822114455",
      "customerVillage": "Khed Shivapur",
      "ownerGstin": "27AAAAA0000A1Z5",
      "subtotal": 2400.00,
      "gstRate": 5.00,
      "gstMode": "EXCLUSIVE",
      "gstAmount": 120.00,
      "totalAmount": 2520.00,
      "paidAmount": 2520.00,
      "dueAmount": 0.00,
      "paymentMethod": "UPI",
      "paymentStatus": "PAID",
      "saleDate": "2026-10-27T10:30:00.000Z",
      "customer": {
        "id": "81f185ef-9685-48ef-b5f6-c0c9f13cba14",
        "customerCode": "CUST001",
        "name": "Dnyaneshwar Patil",
        "phone": "9822114455",
        "village": "Khed Shivapur",
        "creditLimit": 50000.00,
        "outstandingDues": 0.00,
        "availableCredit": 50000.00
      },
      "store": {
        "storeName": "Fertilizer & Seed Store",
        "legalName": "Retail Agricultural Inputs Agency",
        "gstin": "27AAAAA0000A1Z5",
        "phone": "9822012345",
        "addressLine1": "Shop No. 12, Krishi Mandi Commercial Complex",
        "villageOrCity": "District Center",
        "state": "Maharashtra",
        "pincode": "411001"
      },
      "items": [ ... ],
      "payments": [ ... ]
    }
  }
  ```

---

### 2.4 POST `/api/sales`
Create POS retail sale, deduct inventory, and record payments atomically.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Request Body**:
  ```json
  {
    "invoiceNumber": "INV-20261027-0001",
    "customerId": "81f185ef-9685-48ef-b5f6-c0c9f13cba14",
    "customerName": "Dnyaneshwar Patil",
    "customerPhone": "9822114455",
    "customerVillage": "Khed Shivapur",
    "paymentMethod": "CREDIT (KHATA)",
    "paidAmount": 500.00,
    "gstRate": 5.00,
    "gstMode": "EXCLUSIVE",
    "discount": 0.00,
    "items": [
      {
        "productId": "79de0914-fb12-4fe3-979b-2ec32386121f",
        "quantity": 10,
        "unitPrice": 480.00
      }
    ]
  }
  ```
* **Validation & Accounting Rules**:
  * `items`: Must contain at least 1 item with positive `quantity > 0` and non-negative `unitPrice >= 0`.
  * `inventory`: Product must exist, be active, and have `stock >= quantity`. If insufficient, returns `400 Bad Request`.
  * `totals`: Recomputed on server; `paid_amount + due_amount = total_amount`.
  * `walk-in`: If `customerId` is omitted, `paymentMethod` cannot be `'CREDIT (KHATA)'` and `dueAmount` must be `0.00`.
* **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Sale invoice created successfully",
    "data": {
      "id": "18f98c62-8758-4ee0-bb34-31518b5bcf41",
      "invoiceNumber": "INV-20261027-0001",
      "subtotal": 4800.00,
      "gstRate": 5.00,
      "gstAmount": 240.00,
      "totalAmount": 5040.00,
      "paidAmount": 500.00,
      "dueAmount": 4540.00,
      "paymentMethod": "CREDIT (KHATA)",
      "paymentStatus": "PARTIAL",
      "items": [ ... ],
      "payments": [ ... ]
    }
  }
  ```
