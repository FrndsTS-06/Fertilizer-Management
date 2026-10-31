# Inventory & Stock Movements API Specification — Fertilizer Management System

## 1. Overview
This specification details the inventory management, warehouse concurrency controls, stock movement audit trail, valuation calculations, and physical stock reconciliation endpoints for **Phase 10 — Inventory & Stock Movements**.

### 1.1 Architectural & Inventory Invariants

1. **Atomic Transactional Coupling**:
   - Stock quantities in `products.stock` **CANNOT** be updated without inserting an immutable audit entry in `stock_movements`.
   - Both operations are executed within the exact same PostgreSQL database transaction block (`BEGIN ... COMMIT`).
   - If either operation or any constraint check fails, the transaction is automatically rolled back, leaving zero orphaned records.
2. **Concurrency Control via Row Locks (`FOR UPDATE`)**:
   - High-concurrency operations (e.g. concurrent retail billings or batch shipments) acquire an exclusive row-level lock on the target product row:
     ```sql
     SELECT id, code, name, stock, min_threshold, unit, cost_price, price, is_active
     FROM products
     WHERE id = $1
     FOR UPDATE;
     ```
   - Concurrent requests for the same product wait until the lock is released. Stock verification is evaluated against the latest committed stock level, preventing race-condition overselling.
3. **Strict Non-Negative Stock Invariant**:
   - Physical inventory cannot drop below zero (`stock >= 0.000` enforced at both the application service layer and PostgreSQL table `CHECK` constraints).
   - Any reduction attempt exceeding available stock is rejected immediately with `400 Bad Request`.
4. **Audit Movement Math Check**:
   - Every movement entry strictly satisfies:
     $$\text{previous\_stock} + \text{change\_qty} = \text{new\_stock}$$
     enforced by PostgreSQL database constraint `chk_stock_movement_math`.
5. **Idempotency & Duplicate Prevention**:
   - Requests providing a `reference` or `referenceNo` (e.g. Purchase Order, Delivery Note, or Invoice number) verify that an identical reference with the same action type does not already exist for that product. Duplicate retries are rejected with `409 Conflict`.
6. **Mandatory Audit Reason & User Attribution**:
   - All stock adjustments require a non-empty `reason` string and record the authenticated user's credentials in the movement audit trail.
7. **Approved Cost Price Valuation**:
   - Real-time stock valuation uses the PostgreSQL view `v_inventory_valuation` based on the approved cost price formula:
     $$\text{Cost Valuation} = \text{ROUND}(\text{stock} \times \text{cost\_price}, 2)$$
     $$\text{Retail Valuation} = \text{ROUND}(\text{stock} \times \text{selling\_price}, 2)$$
     $$\text{Potential Profit} = \text{ROUND}(\max(0, \text{Retail Valuation} - \text{Cost Valuation}), 2)$$
8. **Double-Entry Physical Reconciliation**:
   - Audits whether current physical stock equals the mathematical sum of all historical movement records:
     $$\text{Discrepancy} = \text{products.stock} - \sum \text{stock\_movements.change\_qty}$$

---

## 2. Inventory REST Endpoints

All endpoints are available under `/api/inventory` (and the `/api/v1/inventory` versioned alias).

---

### 2.1 GET `/api/inventory/summary`
Get aggregate warehouse inventory status and alert counts.

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "totalProducts": 8,
      "totalAvailableStock": 297.000,
      "lowStockCount": 3,
      "outOfStockCount": 1,
      "inStockCount": 4
    }
  }
  ```

---

### 2.2 GET `/api/inventory/movements`
Retrieve chronological physical stock movement audit ledger with multi-field filtering and pagination.

* **Access**: Public / Staff / Admin
* **Query Parameters**:
  * `productId` *(string, optional)*: Filter by Product UUID, SKU code, or name.
  * `type` *(string, optional)*: Filter by movement type (`All`, `PURCHASE`, `SALE`, `ADJUSTMENT`, `OPENING_STOCK`).
  * `action` *(string, optional)*: Filter by action type (`All`, `ADDED`, `SELL`, `UPDATE`).
  * `startDate` *(string, optional)*: ISO date (`YYYY-MM-DD` or full timestamp) for start range.
  * `endDate` *(string, optional)*: ISO date (`YYYY-MM-DD` or full timestamp) for end range.
  * `search` *(string, optional)*: Search across product code, product name, reference, or reason.
  * `page` *(number, default: `1`)*: Page number (>= 1).
  * `limit` *(number, default: `50`)*: Records per page (1 to 100).
  * `sortBy` *(string, default: `created_at`)*: `created_at`, `change_qty`, `new_stock`, `product_name`.
  * `sortOrder` *(string, default: `DESC`)*: `ASC` or `DESC`.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "5f1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
        "productId": "acb76a24-104a-4d93-a158-061c8dbabc6b",
        "productCode": "PRD001",
        "productName": "Neem Coated Urea (45kg)",
        "movementType": "PURCHASE",
        "actionType": "ADDED",
        "changeQty": 50.000,
        "previousStock": 120.000,
        "newStock": 170.000,
        "unit": "Bags (45kgs)",
        "reason": "Wholesale shipment received from IFFCO [Auth: Admin User]",
        "referenceNo": "PO-2026-089",
        "createdAt": "2026-10-27T10:00:00.000Z"
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

### 2.3 POST `/api/inventory/adjustments`
Execute an inventory stock adjustment (`ADD`, `REDUCE`, or `CORRECT`) with mandatory reason and concurrency row lock.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Request Body**:
  ```json
  {
    "productId": "acb76a24-104a-4d93-a158-061c8dbabc6b",
    "operation": "ADD",
    "quantity": 25.0,
    "reason": "Batch count physical verification",
    "reference": "ADJ-2026-10-001",
    "costPrice": 266.50
  }
  ```
* **Operations**:
  * `ADD`: Increments stock by `quantity`. `actionType = 'ADDED'`.
  * `REDUCE`: Decrements stock by `quantity`. Rejects with `400` if `currentStock < quantity`. `actionType = 'UPDATE'`.
  * `CORRECT`: Sets absolute stock level to `quantity`. Computes delta `quantity - currentStock`. `actionType = 'UPDATE'`.
* **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Stock successfully adjusted for Neem Coated Urea (45kg) (PRD001)",
    "data": {
      "product": {
        "id": "acb76a24-104a-4d93-a158-061c8dbabc6b",
        "code": "PRD001",
        "name": "Neem Coated Urea (45kg)",
        "stock": 145.000,
        "status": "In Stock"
      },
      "movement": {
        "id": "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
        "changeQty": 25.000,
        "previousStock": 120.000,
        "newStock": 145.000,
        "reason": "Batch count physical verification [Auth: Cashier (cashier@fertilizershop.local)]",
        "referenceNo": "ADJ-2026-10-001"
      }
    }
  }
  ```
* **Errors**:
  * `400 Bad Request`: Missing mandatory reason, invalid quantity, or insufficient stock.
  * `401 Unauthorized`: Token missing or malformed.
  * `404 Not Found`: Product not found.
  * `409 Conflict`: Duplicate movement reference already processed.
  * `422 Unprocessable Entity`: Request body validation failed.

---

### 2.4 POST `/api/inventory/inward`
Record inbound stock receiving from wholesale purchase orders or supplier deliveries.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Request Body**:
  ```json
  {
    "productId": "PRD002",
    "quantity": 50.0,
    "reason": "Delivery truck unloaded at warehouse bay 2",
    "reference": "PO-IFFCO-2026-004",
    "costPrice": 1350.00
  }
  ```
* **Response (`201 Created`)**: Stock increased and movement created with `movementType = 'PURCHASE'`.

---

### 2.5 POST `/api/inventory/outward`
Record outbound stock dispatch (retail sale issue, bulk transfer, or write-off).

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Request Body**:
  ```json
  {
    "productId": "PRD002",
    "quantity": 20.0,
    "reason": "Dispatched for farmer cooperative dispatch",
    "reference": "DISP-2026-001"
  }
  ```
* **Response (`201 Created`)**: Stock decreased. If `currentStock < quantity`, returns `400 Bad Request`.

---

### 2.6 GET `/api/inventory/low-stock`
Query products currently at or below minimum inventory thresholds.

* **Access**: Public / Staff / Admin
* **Query Parameters**:
  * `threshold` *(number, optional)*: Threshold override (e.g. `?threshold=15`).
  * `categoryId` *(string, optional)*: Filter by Category UUID or name.
  * `status` *(string, default: `all`)*: `'all'`, `'Low Stock'`, `'Out of Stock'`.
  * `page` *(number, default: `1`)*: Page number.
  * `limit` *(number, default: `50`)*: Records per page.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "summary": {
      "totalAlerts": 4,
      "outOfStockCount": 1,
      "lowStockCount": 3
    },
    "data": [
      {
        "id": "f25c2e17-bd93-4a15-ba3a-1daffd8cb44f",
        "code": "PRD004",
        "name": "NPK 19:19:19 Water Soluble (1kg)",
        "unit": "Packets (1kg)",
        "stock": 0.000,
        "minThreshold": 15.000,
        "deficit": 15.000,
        "status": "Out of Stock"
      }
    ]
  }
  ```

---

### 2.7 GET `/api/inventory/valuation`
Calculate real-time warehouse inventory valuation using the approved cost price model.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Query Parameters**:
  * `categoryId` *(string, optional)*: Filter by Category name.
  * `search` *(string, optional)*: Filter by product code, name, or brand.
  * `page` *(number, default: `1`)*: Page number.
  * `limit` *(number, default: `50`)*: Items per page.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "summary": {
      "totalProducts": 8,
      "totalStockUnits": 297.000,
      "totalCostValuation": 174880.00,
      "totalRetailValuation": 206800.00,
      "potentialProfit": 31920.00,
      "overallMarginPercentage": 15.44,
      "valuationMethod": "COST_PRICE_FIFO_EQUIVALENT"
    },
    "data": [
      {
        "productId": "4a9b642f-386e-40d6-bbbd-64589f20dd68",
        "productCode": "PRD008",
        "productName": "Ammonium Sulphate (50kg)",
        "categoryName": "Nitrogenous",
        "brand": "GSFC",
        "stock": 24.000,
        "costPrice": 850.00,
        "sellingPrice": 960.00,
        "totalCostValuation": 20400.00,
        "totalRetailValuation": 23040.00,
        "potentialProfit": 2640.00,
        "marginPercentage": 11.46,
        "stockStatus": "In Stock"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 8,
      "totalPages": 1
    }
  }
  ```

---

### 2.8 GET `/api/inventory/reconciliation`
Audit report comparing physical warehouse stock against mathematical sum of movement ledger entries.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Query Parameters**:
  * `productId` *(string, optional)*: Filter by Product UUID or SKU code.
  * `status` *(string, default: `all`)*: `'all'`, `'RECONCILED'`, `'DISCREPANCY'`.
  * `page` *(number, default: `1`)*: Page number.
  * `limit` *(number, default: `50`)*: Items per page.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "summary": {
      "totalAudited": 8,
      "reconciledCount": 8,
      "discrepancyCount": 0,
      "systemStatus": "BALANCED",
      "auditTimestamp": "2026-10-27T16:28:30.000Z"
    },
    "data": [
      {
        "productId": "acb76a24-104a-4d93-a158-061c8dbabc6b",
        "productCode": "PRD001",
        "productName": "Neem Coated Urea (45kg)",
        "unit": "Bags (45kgs)",
        "currentPhysicalStock": 120.000,
        "movementLedgerSum": 120.000,
        "discrepancy": 0.000,
        "movementCount": 1,
        "status": "RECONCILED"
      }
    ]
  }
  ```

---

### 2.9 GET `/api/inventory/reconciliation/:productId`
Single-product double-entry audit status.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Response (`200 OK`)**: Returns reconciliation object for the specified product.
* **Error (`404 Not Found`)**: If product not found in audit register.
