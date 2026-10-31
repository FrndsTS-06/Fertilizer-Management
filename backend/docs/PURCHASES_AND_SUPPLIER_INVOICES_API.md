# Purchase Workflow & Supplier Invoices API Specification — Fertilizer Management System

## 1. Overview
This specification details the RESTful endpoints, transactional inventory couplings, accounts payable (AP) disbursements, and authorization rules for **Phase 11 — Purchase Workflow & Supplier Invoices**.

### 1.1 Architectural & Inventory Invariants

1. **Atomic Transactional Coupling**:
   - Creating a purchase order (`lifecycle_status = 'RECEIVED'`) atomically writes:
     1. The master record in `purchases`.
     2. All line items in `purchase_items`.
     3. Increments warehouse physical stock in `products` via exclusive row locks (`SELECT ... FOR UPDATE`).
     4. Updates product procurement cost price (`cost_price`).
     5. Inserts immutable audit entries in `stock_movements` with `movement_type = 'PURCHASE'` and `action_type = 'ADDED'`.
     6. If initial disbursement was paid, inserts an initial payment voucher in `supplier_payments`.
   - If any validation fails or a constraint is violated, the entire database transaction rolls back via `ROLLBACK`, leaving zero orphaned or partial records.
2. **Reuse of Shared Inventory Movement Ledger**:
   - Stock updates are coordinated via the shared `InventoryRepository.recordMovement` and row-level locking mechanisms. Purchase controllers never duplicate inventory logic.
3. **Decoupled Order Lifecycle vs. Payment Status**:
   - `lifecycle_status`:
     - `'DRAFT'`: Initial order drafting. Stock is not yet received.
     - `'RECEIVED'`: Stock has physically arrived at the warehouse. Stock is incremented and movements logged.
     - `'CANCELLED'`: Purchase cancelled.
   - `payment_status`:
     - `'UNPAID'`: No disbursement made to supplier (`paid_amount = 0.00`, `due_amount = total_amount`).
     - `'PARTIAL'`: Partial disbursement made (`0.00 < paid_amount < total_amount`).
     - `'PAID'`: Fully paid (`due_amount = 0.00`, `paid_amount = total_amount`).
   - Invariant: `ROUND(paid_amount + due_amount, 2) = ROUND(total_amount, 2)`.
4. **Duplicate Submission Prevention**:
   - Invoice numbers (`purchase_invoice_no`) are strictly unique across the system. Attempting to submit a duplicate invoice number returns `409 Conflict`.
5. **Role-Based Access Control**:
   - Authenticated Staff (`STAFF`) and Store Administrators (`ADMIN`) can create purchases, record supplier payments, and view purchase history. Unauthenticated requests are rejected with `401 Unauthorized`.

---

## 2. Purchase REST Endpoints

All endpoints are available under `/api/purchases` (and `/api/v1/purchases`).

---

### 2.1 GET `/api/purchases/summary`
Get aggregate accounts payable and wholesale purchase metrics.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "totalPurchasesCount": 12,
      "totalPurchasesAmount": 284500.00,
      "totalPaidAmount": 242000.00,
      "totalDueAmount": 42500.00,
      "unpaidBillsCount": 2,
      "partialBillsCount": 1,
      "paidBillsCount": 9,
      "receivedOrdersCount": 12
    }
  }
  ```

---

### 2.2 GET `/api/purchases`
List purchase orders with filtering by supplier, order status, payment status, date range, and pagination.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Query Parameters**:
  * `supplierId` *(string, optional)*: Filter by Supplier UUID or exact name.
  * `lifecycleStatus` *(string, optional)*: `'All'`, `'DRAFT'`, `'RECEIVED'`, `'CANCELLED'`.
  * `paymentStatus` *(string, optional)*: `'All'`, `'UNPAID'`, `'PARTIAL'`, `'PAID'`.
  * `startDate` *(string, optional)*: Start date (`YYYY-MM-DD`).
  * `endDate` *(string, optional)*: End date (`YYYY-MM-DD`).
  * `search` *(string, optional)*: Substring search matching invoice number, supplier name, or notes.
  * `page` *(number, default: `1`)*: Page number.
  * `limit` *(number, default: `50`)*: Records per page (1 to 100).
  * `sortBy` *(string, default: `purchase_date`)*: `purchase_date`, `purchase_invoice_no`, `total_amount`, `due_amount`.
  * `sortOrder` *(string, default: `DESC`)*: `ASC` or `DESC`.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "acf01d1e-88a5-4754-9a92-f91e3df49bb1",
        "purchaseInvoiceNo": "PUR-2026-0001",
        "supplierId": "7876a47a-ea4c-4740-b8d2-f4ce9d724f11",
        "supplierName": "IFFCO",
        "supplierPhone": "18001031967",
        "supplierGstin": null,
        "totalAmount": 125000.00,
        "paidAmount": 125000.00,
        "dueAmount": 0.00,
        "lifecycleStatus": "RECEIVED",
        "paymentStatus": "PAID",
        "itemCount": 2,
        "notes": "Truck delivery received at main yard",
        "purchaseDate": "2026-10-27T08:00:00.000Z",
        "createdAt": "2026-10-27T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
  ```

---

### 2.3 GET `/api/purchases/:id`
Retrieve full purchase order detail with all line items and allocated payment vouchers.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "id": "acf01d1e-88a5-4754-9a92-f91e3df49bb1",
      "purchaseInvoiceNo": "PUR-2026-0001",
      "supplierId": "7876a47a-ea4c-4740-b8d2-f4ce9d724f11",
      "supplierName": "IFFCO",
      "supplierPhone": "18001031967",
      "totalAmount": 125000.00,
      "paidAmount": 125000.00,
      "dueAmount": 0.00,
      "lifecycleStatus": "RECEIVED",
      "paymentStatus": "PAID",
      "items": [
        {
          "id": "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
          "productId": "acb76a24-104a-4d93-a158-061c8dbabc6b",
          "productCode": "PRD001",
          "productName": "Neem Coated Urea (45kg)",
          "quantity": 500.000,
          "unitCost": 242.00,
          "subtotal": 121000.00,
          "unit": "Bags (45kgs)"
        },
        {
          "id": "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
          "productId": "f25c2e17-bd93-4a15-ba3a-1daffd8cb44f",
          "productCode": "PRD004",
          "productName": "NPK 19:19:19 Water Soluble (1kg)",
          "quantity": 40.000,
          "unitCost": 100.00,
          "subtotal": 4000.00,
          "unit": "Packets (1kg)"
        }
      ],
      "payments": [
        {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "paymentNumber": "SPAY-2026-0001",
          "amount": 125000.00,
          "paymentMethod": "BANK_TRANSFER",
          "referenceNo": "PUR-2026-0001",
          "paymentDate": "2026-10-27T08:00:00.000Z"
        }
      ]
    }
  }
  ```

---

### 2.4 POST `/api/purchases`
Create purchase order, write line items, update physical stock, and log audit movements atomically.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Request Body**:
  ```json
  {
    "supplierId": "7876a47a-ea4c-4740-b8d2-f4ce9d724f11",
    "purchaseInvoiceNo": "INV-IFFCO-2026-044",
    "items": [
      {
        "productId": "acb76a24-104a-4d93-a158-061c8dbabc6b",
        "quantity": 50.0,
        "unitCost": 245.00,
        "unit": "Bags (45kgs)"
      }
    ],
    "totalAmount": 12250.00,
    "paidAmount": 5000.00,
    "paymentMethod": "BANK_TRANSFER",
    "notes": "Delivered via truck MH-12-PQ-9988"
  }
  ```
* **Validation**:
  * `supplierId`: Required, must reference active supplier.
  * `items`: Non-empty array, each item must have valid product, quantity > 0, unitCost >= 0.
  * `totalAmount`: Must match mathematical sum of item subtotals ($\sum \text{qty} \times \text{unitCost}$).
  * `paidAmount`: $0 \le \text{paidAmount} \le \text{totalAmount}$.
* **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Purchase invoice #INV-IFFCO-2026-044 created successfully",
    "data": { ... }
  }
  ```
* **Errors**:
  * `400 Bad Request`: Validation failure or total amount mismatch.
  * `401 Unauthorized`: Token missing or expired.
  * `404 Not Found`: Supplier or product not found.
  * `409 Conflict`: Duplicate `purchaseInvoiceNo` already exists.
  * `422 Unprocessable Entity`: Request body schema invalid.

---

### 2.5 POST `/api/purchases/:id/payments`
Record an accounts payable disbursement toward an outstanding purchase order.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Request Body**:
  ```json
  {
    "amount": 7250.00,
    "paymentMethod": "BANK_TRANSFER",
    "referenceNo": "NEFT-20261027-0091",
    "notes": "Final settlement disbursement"
  }
  ```
* **Validation**:
  * `amount`: Positive number > 0. Cannot exceed remaining `due_amount`.
  * `paymentMethod`: `'BANK_TRANSFER'`, `'CHEQUE'`, `'UPI'`, `'CASH'`.
* **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Payment of ₹7250.00 recorded successfully for invoice #INV-IFFCO-2026-044",
    "data": {
      "purchase": {
        "id": "...",
        "paidAmount": 12250.00,
        "dueAmount": 0.00,
        "paymentStatus": "PAID"
      },
      "payment": {
        "paymentNumber": "SPAY-2026-0002",
        "amount": 7250.00,
        "paymentMethod": "BANK_TRANSFER",
        "referenceNo": "NEFT-20261027-0091"
      }
    }
  }
  ```

---

### 2.6 GET `/api/purchases/:id/payments`
Retrieve all supplier payment disbursements allocated to a purchase order.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Response (`200 OK`)**: Array of `supplier_payments` records for the specified invoice.
