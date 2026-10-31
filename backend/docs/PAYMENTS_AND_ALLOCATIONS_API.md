# Payment Collection, Allocations & Accounting Reconciliation API Specification

## 1. Overview
This specification details the RESTful endpoints, transactional invoice allocations, on-account deposits, FIFO multi-bill settlements, auditable payment reversals, and wholesale supplier accounts payable disbursements for **Phase 13 — Payment Collections & Financial Invariants**.

---

## 2. Core Accounting Principles & Financial Invariants

### 2.1 Single Source of Truth for Customer Khata Balances
All balance calculations are derived dynamically and consistently from the database view `v_customer_balances`:
```sql
Total Invoiced Debt = c.opening_balance + SUM(s.total_amount)
Total Collections Received = SUM(p.amount)
Outstanding Dues = ROUND(GREATEST(0.00, Total Invoiced Debt - Total Collections Received), 2)
Available Credit = ROUND(GREATEST(0.00, c.credit_limit - Outstanding Dues), 2)
```

### 2.2 Prevention of Double-Counting
1. **The Invariant**: Collections are summed **strictly once** from the immutable `payments` ledger.
2. In `v_customer_balances`, `sales.paid_amount` is **never** summed with `payments.amount`.
3. When an invoice payment is recorded:
   - A single row is inserted into `payments (receipt_number, customer_id, sale_id, amount, ...)`.
   - The corresponding `sales` row has its tracking fields (`paid_amount`, `due_amount`, `payment_status`) updated atomically to ensure `sales.paid_amount + sales.due_amount = sales.total_amount` (`chk_sales_due_calc`).
   - Customer total paid remains strictly equal to `SUM(payments.amount)`, guaranteeing zero double-counting.

### 2.3 On-Account vs. Invoice-Allocated Payments
- **Invoice-Allocated Payments (`sale_id IS NOT NULL`)**:
  - Remittance is locked and applied directly to reduce the `remaining_due` of a specific invoice.
  - Overpayment beyond the invoice's remaining due is strictly prevented with `400 Bad Request`.
  - Dynamically updates invoice state in `v_invoice_balances`.
- **On-Account Deposits (`sale_id IS NULL`)**:
  - The schema permits unallocated deposits (`payments.sale_id` is nullable).
  - An on-account deposit belongs to the customer account, immediately reducing their net `outstanding_dues` and restoring `available_credit` in `v_customer_balances`.
- **FIFO Auto-Allocation (`autoAllocate = true`)**:
  - When a farmer makes a lump-sum remittance without specifying individual invoice numbers, the system automatically allocates funds to their oldest unpaid/partial invoices chronologically (`sale_date ASC`).
  - Any remaining surplus after settling all outstanding bills is deposited as an on-account balance (`sale_id = NULL`).

### 2.4 Auditable Reversals & Refunds
- **Immutable Financial Trail**: Financial records are never silently altered or dropped.
- **Auditable Reversal Workflow (`POST /api/payments/:id/reverse`)**:
  - Restricted exclusively to Store Administrators (`ADMIN`).
  - Requires a mandatory audit reason (`reason`, minimum 3 characters).
  - Executes within an atomic database transaction with row locks (`FOR UPDATE`):
    1. Locks payment receipt and linked sales invoice.
    2. Deletes the invalidated payment row from `payments`.
    3. Recomputes the invoice's paid amount from surviving ledger records and restores the invoice's remaining due and status.
    4. Refreshes `v_customer_balances`.
    5. Returns an audit payload containing the reversed receipt, restored invoice dues, and user attribution.

---

## 3. Payments REST Endpoints

All endpoints are available under `/api/payments` (and `/api/v1/payments`).

---

### 3.1 GET `/api/payments/summary`
Get aggregated collection metrics, method distributions, and allocation breakdowns.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "totalPaymentsCount": 58,
      "totalAmountCollected": 182400.00,
      "cashCollected": 92000.00,
      "upiCollected": 65400.00,
      "bankCollected": 25000.00,
      "chequeCollected": 0.00,
      "allocatedAmount": 167400.00,
      "unallocatedAmount": 15000.00,
      "allocatedReceiptsCount": 52,
      "onAccountReceiptsCount": 6
    }
  }
  ```

---

### 3.2 GET `/api/payments`
List customer collection receipts with date filtering, allocation status, and pagination.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Query Parameters**:
  * `page` (default `1`)
  * `limit` (default `50`, max `100`)
  * `customerId` (UUID or customer code/name)
  * `saleId` (UUID or invoice number)
  * `paymentMethod` (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`)
  * `allocationStatus` (`allocated`, `on-account`, `unallocated`)
  * `startDate` (`YYYY-MM-DD` or ISO string)
  * `endDate` (`YYYY-MM-DD` or ISO string)
  * `search` (Search receipt number, customer name, phone, invoice number)
  * `sortBy` (`payment_date`, `receipt_number`, `amount`)
  * `sortOrder` (`ASC` or `DESC`, default `DESC`)
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "76ec28c5-e6eb-46f9-b883-92f7c0c1b753",
        "receiptNumber": "REC-20261027-0001",
        "customerId": "81f185ef-9685-48ef-b5f6-c0c9f13cba14",
        "customerName": "Dnyaneshwar Patil",
        "customerCode": "CUST001",
        "customerPhone": "9822114455",
        "customerVillage": "Khed Shivapur",
        "saleId": "18f98c62-8758-4ee0-bb34-31518b5bcf41",
        "invoiceNumber": "INV-20261027-0001",
        "invoiceTotal": 5040.00,
        "invoiceDue": 2540.00,
        "isAllocated": true,
        "isOnAccount": false,
        "amount": 2500.00,
        "paymentMethod": "UPI",
        "referenceNo": "UPI-TXN-998877",
        "notes": "Second installment via PhonePe",
        "paymentDate": "2026-10-27T11:45:00.000Z",
        "createdAt": "2026-10-27T11:45:00.000Z"
      }
    ],
    "pagination": { ... },
    "summary": { ... }
  }
  ```

---

### 3.3 GET `/api/payments/:id`
Retrieve single payment receipt by UUID or receipt number.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)

---

### 3.4 POST `/api/payments`
Record customer collection receipt (supports direct invoice allocation, multi-invoice allocations, FIFO auto-allocation, or on-account deposit).

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Request Payload Examples**:

#### A. Single Invoice Allocation:
```json
{
  "customerId": "81f185ef-9685-48ef-b5f6-c0c9f13cba14",
  "saleId": "18f98c62-8758-4ee0-bb34-31518b5bcf41",
  "amount": 1500.00,
  "paymentMethod": "CASH",
  "notes": "Counter cash payment"
}
```

#### B. FIFO Auto-Allocation Across Open Invoices:
```json
{
  "customerId": "81f185ef-9685-48ef-b5f6-c0c9f13cba14",
  "amount": 5000.00,
  "paymentMethod": "UPI",
  "autoAllocate": true,
  "notes": "Lump sum remittance settling oldest open bills"
}
```

#### C. On-Account Deposit (Advance / Unallocated):
```json
{
  "customerId": "81f185ef-9685-48ef-b5f6-c0c9f13cba14",
  "amount": 10000.00,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNo": "NEFT-123456",
  "notes": "Advance deposit for upcoming sowing season"
}
```

* **Response (`201 Created`)**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Payment recorded successfully",
  "data": { ... }
}
```

---

### 3.5 POST `/api/sales/:id/payments`
Direct invoice payment endpoint matching frontend checkout and Khata settlement workflows.

* **Access**: Protected — Staff / Admin (`Authorization: Bearer <token>`)
* **Request Payload**:
  ```json
  {
    "amount": 1200.00,
    "method": "UPI",
    "reference": "UPI-REF-112233",
    "notes": "Partial settlement"
  }
  ```

---

### 3.6 POST `/api/payments/:id/reverse`
Auditable reversal of an erroneous, bounced, or refunded payment receipt.

* **Access**: Protected — **Store Administrators Only (`ADMIN`)**
* **Request Payload**:
  ```json
  {
    "reason": "Cheque bounced due to signature mismatch on bank clearance"
  }
  ```
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Payment reversed successfully",
    "data": {
      "reversedPayment": {
        "id": "76ec28c5-e6eb-46f9-b883-92f7c0c1b753",
        "receiptNumber": "REC-20261027-0001",
        "amount": 2500.00
      },
      "updatedSale": {
        "id": "18f98c62-8758-4ee0-bb34-31518b5bcf41",
        "invoiceNumber": "INV-20261027-0001",
        "paidAmount": 0.00,
        "dueAmount": 5040.00,
        "status": "UNPAID"
      },
      "customerBalance": {
        "totalPurchases": 5040.00,
        "totalPaid": 0.00,
        "outstandingDues": 5040.00,
        "availableCredit": 44960.00
      },
      "audit": {
        "reversedBy": "admin@fertilizershop.local",
        "reversedAt": "2026-10-27T12:00:00.000Z",
        "reason": "Cheque bounced due to signature mismatch on bank clearance"
      }
    }
  }
  ```

---

### 3.7 Wholesale Supplier Payments (`/api/payments/suppliers`)
- `GET /api/payments/suppliers`: List wholesale supplier disbursements.
- `GET /api/payments/suppliers/:id`: Single supplier disbursement voucher.
- `POST /api/payments/suppliers`: Record wholesale supplier disbursement.
