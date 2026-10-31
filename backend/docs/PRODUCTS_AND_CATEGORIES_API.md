# Products & Categories API Specification — Fertilizer Management System

## 1. Overview
This document specifies the RESTful endpoints, data schemas, authorization rules, and error handling for the **Products, Categories, and Inventory** modules (Phase 08).

### 1.1 Key Principles Enforced
* **Layered 4-Tier Architecture**: Requests follow `Routes -> Middleware -> Controller -> Service -> Repository -> PostgreSQL`.
* **Zero Plaintext Credentials & RBAC**: Modifying endpoints (`POST`, `PATCH`, `PUT`, `DELETE`) require `authenticate` and `authorize('ADMIN')`. Read-only catalog endpoints are open to all users (Staff, Admin, and public catalog viewers).
* **Direct Stock Mutation Prohibition**: Product update endpoints (`PATCH /api/products/:id`) strictly disallow modifying `stock` or `initialStock`. Stock levels can only be modified through the inventory workflow.
* **Initial Stock Workflow**: When a product is created with `initialStock > 0`, the product row and an opening stock audit entry in `stock_movements` (`movement_type = 'OPENING_STOCK'`, `action_type = 'ADDED'`) are created atomically inside a PostgreSQL transaction (`BEGIN ... COMMIT`).
* **Preservation of Historical Integrity**: Archiving/deleting a product (`DELETE /api/products/:id`) executes a soft-delete (`is_active = FALSE`). Historical sales, purchases, and stock movements referencing `products(id)` are fully preserved.
* **Dual Parameter Support**: Both snake_case (`cost_price`, `category_id`) and camelCase (`costPrice`, `categoryId`, `category`) are accepted in request bodies and returned in response payloads to maintain 100% frontend compatibility.

---

## 2. Category Endpoints

### 2.1 GET `/api/categories`
List all categories with associated product counts.

* **Access**: Public / Staff / Admin
* **Query Parameters**:
  * `search` *(string, optional)*: Filter by category name or description substring.
  * `is_active` *(boolean or 'all', default: `true`)*: Filter active vs. archived categories.
  * `sortBy` *(string, default: `name`)*: `name`, `created_at`.
  * `sortOrder` *(string, default: `ASC`)*: `ASC`, `DESC`.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "22ff06ee-c3cf-4299-8472-fc74ec6ae29a",
        "name": "Nitrogenous",
        "description": "Primary nitrogen providers including Neem Coated Urea...",
        "is_active": true,
        "created_at": "2026-10-27T00:00:00.000Z",
        "active_product_count": 2,
        "total_product_count": 2
      }
    ]
  }
  ```

---

### 2.2 GET `/api/categories/:id`
Retrieve single category details by UUID.

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "id": "22ff06ee-c3cf-4299-8472-fc74ec6ae29a",
      "name": "Nitrogenous",
      "description": "Primary nitrogen providers...",
      "is_active": true,
      "created_at": "2026-10-27T00:00:00.000Z",
      "active_product_count": 2,
      "total_product_count": 2
    }
  }
  ```
* **Error (`404 Not Found`)**: If category UUID does not exist.

---

### 2.3 POST `/api/categories`
Create a new product category.

* **Access**: Protected — Admin Only (`Authorization: Bearer <adminToken>`)
* **Request Body**:
  ```json
  {
    "name": "Growth Regulators & Stimulants",
    "description": "Plant growth promoters and organic stimulants."
  }
  ```
* **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Category created successfully",
    "data": {
      "id": "b18fc100-3580-4cf9-93ff-eb9c5120a101",
      "name": "Growth Regulators & Stimulants",
      "description": "Plant growth promoters and organic stimulants.",
      "is_active": true,
      "created_at": "2026-10-27T15:50:00.000Z"
    }
  }
  ```
* **Error (`409 Conflict`)**: If category name already exists (case-insensitive).
* **Error (`403 Forbidden`)**: If called by Staff user.

---

### 2.4 PATCH `/api/categories/:id`
Update an existing category's name or description.

* **Access**: Protected — Admin Only
* **Request Body**:
  ```json
  {
    "description": "Updated description for bio-stimulants."
  }
  ```
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Category updated successfully",
    "data": { ... }
  }
  ```

---

### 2.5 DELETE `/api/categories/:id`
Archive a category. If products are linked to the category, it is safely soft-archived (`is_active = FALSE`) to preserve referential integrity.

* **Access**: Protected — Admin Only
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Category 'Nitrogenous' has 2 associated product(s). It has been archived to preserve historical data.",
    "data": { ... }
  }
  ```

---

## 3. Product Endpoints

### 3.1 GET `/api/products`
List products with comprehensive search, category filtering, stock status filtering, pagination, and stable sorting.

* **Access**: Public / Staff / Admin
* **Query Parameters**:
  * `search` *(string, optional)*: Substring search across product name, SKU code, brand, and category name.
  * `category` *(string, optional)*: Category UUID or Category Name (e.g. `'Nitrogenous'`).
  * `status` *(string, optional)*: Generated status filter (`'In Stock'`, `'Low Stock'`, `'Out of Stock'`, or `'All'`).
  * `is_active` / `include_archived` *(boolean, default: `true`)*: Set `include_archived=true` to include archived items.
  * `page` *(number, default: `1`)*: Page number (>= 1).
  * `limit` *(number, default: `50`)*: Items per page (1 to 100).
  * `sortBy` *(string, default: `created_at`)*: `created_at`, `name`, `code`, `price`, `stock`, `brand`, `category`.
  * `sortOrder` *(string, default: `DESC`)*: `ASC` or `DESC`.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "e44d320b-f38b-4b11-a589-983279144342",
        "code": "PRD001",
        "name": "Neem Coated Urea (45kg)",
        "categoryId": "22ff06ee-c3cf-4299-8472-fc74ec6ae29a",
        "category": "Nitrogenous",
        "brand": "IFFCO",
        "packageType": "Bags",
        "packageSize": "45kgs",
        "unit": "Bags (45kgs)",
        "costPrice": 242.0,
        "price": 266.5,
        "stock": 120.0,
        "minThreshold": 20.0,
        "photo": "https://images.unsplash.com/...",
        "description": "Agricultural grade Neem Coated Urea...",
        "status": "In Stock",
        "isActive": true,
        "createdAt": "2026-10-27T00:00:00.000Z",
        "updatedAt": "2026-10-27T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 8,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
  ```

---

### 3.2 GET `/api/products/:id`
Retrieve single product by UUID or SKU code (`PRD001`).

* **Access**: Public / Staff / Admin
* **Response (`200 OK`)**: Returns single product object.
* **Error (`404 Not Found`)**: If product not found.

---

### 3.3 POST `/api/products`
Create a new product. If `initialStock > 0`, records an opening stock movement entry in `stock_movements` inside the same database transaction.

* **Access**: Protected — Admin Only (`Authorization: Bearer <adminToken>`)
* **Request Body**:
  ```json
  {
    "name": "Bio-Zyme Crop Booster (1L)",
    "category": "Growth Regulators & Stimulants",
    "brand": "Multiplex",
    "packageType": "Bottles",
    "packageSize": "1L",
    "unit": "Bottles (1L)",
    "costPrice": 320.0,
    "price": 450.0,
    "minThreshold": 10,
    "initialStock": 30,
    "photo": "https://images.unsplash.com/...",
    "description": "Enzyme-based organic plant booster."
  }
  ```
* **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Product created successfully with approved initial stock audit",
    "data": {
      "id": "f36a83ad-88c1-4ea6-b651-a5982ca3e56d",
      "code": "PRD009",
      "name": "Bio-Zyme Crop Booster (1L)",
      "category": "Growth Regulators & Stimulants",
      "brand": "Multiplex",
      "unit": "Bottles (1L)",
      "costPrice": 320,
      "price": 450,
      "stock": 30,
      "status": "In Stock",
      "isActive": true
    }
  }
  ```
* **Error (`400 Bad Request`)**: Missing name, invalid/non-existent category, or negative numeric price.
* **Error (`403 Forbidden`)**: Attempted by non-Admin role.

---

### 3.4 PATCH `/api/products/:id`
Update product non-stock attributes (name, category, brand, packaging, cost price, selling price, threshold, photo, description).

* **Access**: Protected — Admin Only
* **Important Safety Rule**: Attempting to supply `stock` or `initialStock` in the payload is rejected with `422 Unprocessable Entity` or `400 Bad Request`:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Request validation failed",
      "details": [
        "Direct stock modification is not permitted via product updates. Use the Inventory Stock Adjustment workflow to change stock levels."
      ]
    }
  }
  ```

---

### 3.5 DELETE `/api/products/:id`
Archive a product (soft-delete). Sets `is_active = FALSE`.

* **Access**: Protected — Admin Only
* **Integrity Guarantee**: Historical purchase items, sale invoices, and stock movements are preserved.
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Product 'Bio-Zyme Crop Booster (1L)' (PRD009) archived successfully. Historical transaction references preserved.",
    "data": {
      "id": "...",
      "code": "PRD009",
      "isActive": false
    }
  }
  ```

---

### 3.6 POST `/api/products/:id/restore`
Reactivate an archived product.

* **Access**: Protected — Admin Only
* **Response (`200 OK`)**: Product is restored (`isActive = true`).

---

## 4. Inventory Endpoints

### 4.1 GET `/api/inventory/summary`
Returns warehouse valuation and stock level metrics computed from active catalog products.

* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "totalProducts": 8,
      "totalAvailableStock": 297.0,
      "lowStockCount": 2,
      "outOfStockCount": 1,
      "inStockCount": 5
    }
  }
  ```

---

### 4.2 GET `/api/inventory/movements`
Returns physical stock movement audit ledger.

* **Query Parameters**:
  * `productId` *(string, optional)*: Filter by product UUID or SKU code.
  * `type` *(string, optional)*: Movement type filter (`'PURCHASE'`, `'SALE'`, `'ADJUSTMENT'`, `'OPENING_STOCK'`).
* **Response (`200 OK`)**: Returns array of audit movement records ordered chronologically descending.
