# Supplier & Customer Management API Specification — Fertilizer Management System

## 1. Overview
This document specifies the RESTful endpoints, schemas, authorization rules, accounting models, and ledger reading endpoints for **Suppliers & Distributors** and **Customers & Farmer Khata** (Phase 09).

### 1.1 Architectural & Accounting Guarantees
* **Single Source of Truth**: All customer balances are derived directly from PostgreSQL view `v_customer_balances`. No divergent or ad-hoc balance calculations exist across controllers.
* **No Double Counting**: Invoice balances decouple sales debts from remittances via `payments` table allocations.
* **Preservation of Historical Integrity**: Archiving/deleting suppliers (`DELETE /api/suppliers/:id`) and customers (`DELETE /api/customers/:id`) performs a safe soft-delete (`is_active = FALSE`). Foreign key constraints (`ON DELETE RESTRICT`) on historical purchases, purchase items, sales invoices, sale items, and payment receipts are preserved.
* **Role-Based Access Control**:
  * **Suppliers**: Read access is available to authenticated users/public catalog; write and archive operations strictly require `ADMIN` role.
  * **Customers**: Registered staff (`STAFF`) or store administrators (`ADMIN`) can create and update farmer customer profiles; deleting/archiving customer accounts is restricted to `ADMIN`.
* **Parameterized SQL**: All database operations use PostgreSQL `$1, $2, ...` placeholders to prevent SQL injection vulnerabilities.

---

## 2. Supplier & Distributor Endpoints

All endpoints are accessible under `/api/suppliers` (and `/api/v1/suppliers`).

### 2.1 GET `/api/suppliers`
List suppliers with substring search, active filter, purchase metrics, and pagination.

* **Access**: Public / Staff / Admin
* **Query Parameters**:
  * `search` *(string, optional)*: Search substring matching company name, contact person, phone, email, or GSTIN.
  * `is_active` *(boolean or 'all', default: `true`)*: Filter active vs. archived suppliers.
  * `page` *(number, default: `1`)*: Page number (>= 1).
  * `limit` *(number, default: `50`)*: Items per page (1 to 100).
  * `sortBy` *(string, default: `name`)*: `name`, `created_at`, `id`.
  * `sortOrder` *(string, default: `ASC`)*: `ASC`, `DESC`.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "7876a47a-ea4c-4740-b8d2-f4ce9d724f11",
        "name": "IFFCO",
        "contactPerson": "Regional Marketing Officer",
        "phone": "18001031967",
        "email": "contact@iffco.in",
        "address": "IFFCO Sadan, C-1, District Centre, Saket, New Delhi",
        "gstin": null,
        "isActive": true,
        "purchaseCount": 5,
        "totalPurchases": 125000.00,
        "createdAt": "2026-10-27T00:00:00.000Z",
        "updatedAt": "2026-10-27T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
  ```

---

### 2.2 GET `/api/suppliers/:id`
Retrieve single supplier profile by UUID or exact company name.

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**: Returns supplier object with purchase metrics.
* **Error (`404 Not Found`)**: If supplier not found.

---

### 2.3 POST `/api/suppliers`
Register a new wholesale distributor/manufacturer.

* **Access**: Protected — Admin Only (`Authorization: Bearer <adminToken>`)
* **Request Body**:
  ```json
  {
    "name": "Mahadhan Agri Solutions",
    "contactPerson": "Suresh Deshpande",
    "phone": "9822001122",
    "email": "contact@mahadhanagri.local",
    "address": "Gat 45, MIDC Baramati, Pune",
    "gstin": "27AAAAA0000A1Z5"
  }
  ```
* **Validation**:
  * `name`: Required, non-empty, <= 150 chars.
  * `gstin`: Optional, but if provided, must match Indian 15-character GST format (`/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`).
  * `email`: Optional, must be valid email format.
* **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Supplier created successfully",
    "data": { ... }
  }
  ```
* **Error (`409 Conflict`)**: If company name already exists.

---

### 2.4 PATCH `/api/suppliers/:id`
Update supplier details.

* **Access**: Protected — Admin Only
* **Request Body**: Partial fields (`name`, `contactPerson`, `phone`, `email`, `address`, `gstin`, `isActive`).
* **Response (`200 OK`)**: Updated supplier object.

---

### 2.5 DELETE `/api/suppliers/:id`
Archive supplier (soft-delete). Preserves historical purchase invoices and stock inward records.

* **Access**: Protected — Admin Only
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Supplier 'IFFCO' archived successfully. Historical purchase records preserved.",
    "data": { "id": "...", "isActive": false }
  }
  ```

---

### 2.6 POST `/api/suppliers/:id/restore`
Reactivate an archived supplier account.

* **Access**: Protected — Admin Only
* **Response (`200 OK`)**: Returns supplier with `isActive: true`.

---

### 2.7 GET `/api/suppliers/:id/purchases`
Retrieve inward purchase orders associated with a supplier.

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**: Array of purchase order headers with invoice numbers and payment status.

---

## 3. Customer & Farmer Khata Endpoints

All endpoints are accessible under `/api/customers` (and `/api/v1/customers`).

### 3.1 GET `/api/customers`
List customers with real-time balance fields joined from `v_customer_balances`, dashboard summary, and filters.

* **Access**: Public / Staff / Admin
* **Query Parameters**:
  * `search` *(string, optional)*: Substring search across farmer name, phone, village, and customer code (`CUST001`).
  * `village` *(string, optional)*: Filter by village name.
  * `duesOnly` *(string, default: `all`)*: `'has-dues'` (dues > 0), `'cleared'` (dues == 0), or `'all'`.
  * `is_active` *(boolean or 'all', default: `true`)*: Active vs. archived accounts.
  * `page` *(number, default: `1`)*: Page number.
  * `limit` *(number, default: `50`)*: Items per page.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "76495810-72c6-48ec-96cb-8d5fdf687009",
        "customerCode": "CUST001",
        "name": "Ramesh Patel",
        "phone": "9822012345",
        "village": "Shivaji Nagar",
        "address": "Plot 12, Near Temple, Shivaji Nagar",
        "creditLimit": 50000.00,
        "openingBalance": 0.00,
        "totalPurchases": 14200.00,
        "totalPaid": 0.00,
        "outstandingDues": 14200.00,
        "availableCredit": 35800.00,
        "balanceStatus": "HAS_DUES",
        "isActive": true,
        "createdAt": "2026-10-27T00:00:00.000Z"
      }
    ],
    "summary": {
      "totalCustomers": 5,
      "totalOutstandingDues": 27900.00,
      "customersWithDues": 3,
      "totalPaymentsReceived": 8815.00,
      "clearedCustomers": 2
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
  ```

---

### 3.2 GET `/api/customers/:id`
Retrieve customer profile by UUID or customer code (`CUST001`).

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**: Customer profile with live Khata balance.
* **Error (`404 Not Found`)**: If customer not found.

---

### 3.3 POST `/api/customers`
Register a new farmer customer.

* **Access**: Protected — Staff or Admin (`Authorization: Bearer <token>`)
* **Request Body**:
  ```json
  {
    "name": "Dnyaneshwar Shinde",
    "phone": "9899112233",
    "village": "Khed Shivapur",
    "address": "Gat No 123, Near Sugar Mill",
    "creditLimit": 75000,
    "openingBalance": 2500,
    "notes": "Sugarcane grower"
  }
  ```
* **Validation**:
  * `name`: Required, non-empty, <= 150 chars.
  * `phone`: Optional, but if provided, must be unique across all customers.
  * `creditLimit`: Optional non-negative number (default: 30000.00).
  * `openingBalance`: Optional non-negative number (default: 0.00).
* **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Customer registered successfully",
    "data": {
      "id": "...",
      "customerCode": "CUST006",
      "name": "Dnyaneshwar Shinde",
      "creditLimit": 75000,
      "openingBalance": 2500,
      "outstandingDues": 2500,
      "balanceStatus": "HAS_DUES"
    }
  }
  ```
* **Error (`409 Conflict`)**: If phone number is already registered to another farmer.

---

### 3.4 PATCH `/api/customers/:id`
Update customer profile details.

* **Access**: Protected — Staff or Admin
* **Request Body**: Partial customer fields (`name`, `phone`, `village`, `address`, `creditLimit`, `openingBalance`, `notes`, `isActive`).
* **Response (`200 OK`)**: Updated customer object.

---

### 3.5 DELETE `/api/customers/:id`
Archive customer (soft-delete). Preserves historical sales invoices and Khata receipts.

* **Access**: Protected — Admin Only (`403 Forbidden` for Staff).
* **Response (`200 OK`)**: Customer archived (`isActive: false`).

---

### 3.6 POST `/api/customers/:id/restore`
Reactivate an archived customer.

* **Access**: Protected — Admin Only
* **Response (`200 OK`)**: Customer restored (`isActive: true`).

---

### 3.7 GET `/api/customers/:id/balance`
Single source of truth Khata balance verification derived directly from `v_customer_balances`. Includes breakdown of unpaid/partial sales invoices.

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "customerId": "76495810-72c6-48ec-96cb-8d5fdf687009",
      "customerCode": "CUST001",
      "customerName": "Ramesh Patel",
      "creditLimit": 50000,
      "totalPurchases": 14200,
      "totalPaid": 0,
      "outstandingDues": 14200,
      "availableCredit": 35800,
      "balanceStatus": "HAS_DUES",
      "unpaidInvoices": [ ... ]
    }
  }
  ```

---

### 3.8 GET `/api/customers/:id/sales`
Retrieve customer sales invoices with nested line items.

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**: Array of sales invoices with `allocated_paid`, `remaining_due`, and line item snapshots.

---

### 3.9 GET `/api/customers/:id/payments`
Retrieve all payments/receipts recorded for this customer.

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**: Array of receipt records with payment method and reference numbers.

---

### 3.10 GET `/api/customers/:id/ledger`
Unified chronological Khata statement suitable for export or printing.

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "customer": { ... },
      "openingBalance": 2500.00,
      "totalPurchases": 16700.00,
      "totalPaid": 5000.00,
      "outstandingDues": 11700.00,
      "availableCredit": 63300.00,
      "entries": [
        {
          "entryType": "OPENING_BALANCE",
          "referenceNumber": "INITIAL-KHATA",
          "entryDate": "2026-01-01T00:00:00.000Z",
          "debit": 2500.00,
          "credit": 0.00,
          "runningBalance": 2500.00,
          "description": "Historical Opening Khata Balance"
        },
        {
          "entryType": "SALE",
          "referenceId": "...",
          "referenceNumber": "INV-2026-0891",
          "entryDate": "2026-08-15T10:30:00.000Z",
          "debit": 14200.00,
          "credit": 0.00,
          "runningBalance": 16700.00,
          "description": "Invoice #INV-2026-0891"
        },
        {
          "entryType": "PAYMENT",
          "referenceId": "...",
          "referenceNumber": "REC-1002",
          "entryDate": "2026-09-12T16:00:00.000Z",
          "debit": 0.00,
          "credit": 5000.00,
          "runningBalance": 11700.00,
          "description": "Receipt #REC-1002 (CASH)"
        }
      ]
    }
  }
  ```
