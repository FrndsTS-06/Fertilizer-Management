# Fertilizer Shop Management System

A full-stack point-of-sale (POS), inventory management, and customer ledger system tailored for agricultural input retailers and fertilizer shops.

---

## 📁 Project Structure

```text
fertilizer-shop/
├── frontend/
│   └── src/
│       ├── components/        # Reusable UI widgets & cards
│       ├── layouts/           # Sidebar, navbar, page wrappers
│       ├── pages/             # Main functional views
│       │   ├── Dashboard.jsx
│       │   ├── ProductsStockOverview.jsx
│       │   ├── PurchasesSales.jsx
│       │   ├── CustomerDetails.jsx
│       │   └── Reports.jsx
│       ├── forms/             # Modal & inline forms (add product, sale bill)
│       ├── services/          # API client & axios instances
│       ├── hooks/             # Custom React hooks
│       └── App.jsx
├── backend/
│   └── src/
│       ├── modules/           # Feature-sliced modular architecture
│       │   ├── auth/          # Login, tokens, role guards
│       │   ├── products/      # Catalog, pricing, categories
│       │   ├── inventory/     # Batch numbers, expiry, stock adjustments
│       │   ├── purchases/     # Distributor invoices, stock in
│       │   ├── sales/         # POS retail billing, receipts
│       │   ├── customers/     # Farmer directory, khata credit tracking
│       │   ├── payments/      # Cash, UPI, credit settlement
│       │   └── reports/       # Analytics, stock valuation, GST reports
│       ├── middleware/        # Auth verification, validation, error handler
│       ├── app.js             # Express app setup
│       └── server.js          # Server entry point
├── prisma/
│   ├── schema.prisma          # PostgreSQL relational schema
│   └── migrations/
├── tests/                     # Unit and integration test suites
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
cp ../.env.example .env
# Update DATABASE_URL in .env
npx prisma generate --schema=../prisma/schema.prisma
npx prisma migrate dev --name init --schema=../prisma/schema.prisma
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
