const express = require('express');
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateReportQuery } = require('../validators');

const router = express.Router();

/**
 * Report & Analytics Routes
 * Base mount point: /api/reports (and /api/v1/reports)
 */

// All reporting routes require valid authentication
router.use(authenticate);

// 1. Dashboard Executive Summary (/api/reports/dashboard, /api/reports, /api/dashboard, /api/dashboard/summary)
router.get(
  ['/', '/dashboard', '/summary'],
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getDashboardSummary(req, res, next)
);

// 2. Sales Totals & Period Breakdown
router.get(
  '/sales',
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getSalesReport(req, res, next)
);

// 3. Purchases & Accounts Payable Totals Report
router.get(
  '/purchases',
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getPurchaseReport(req, res, next)
);

// 4. Low-Stock Products & Immediate Reorder Warnings
router.get(
  '/low-stock',
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getLowStockReport(req, res, next)
);

// 5. Inventory Stock Valuation & Profit Margin Report
router.get(
  '/inventory-valuation',
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getInventoryValuationReport(req, res, next)
);

// 6. Customer Outstanding Balances & Aging (Farmer Khata Dues)
router.get(
  '/customer-dues',
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getCustomerDuesReport(req, res, next)
);

// 7. Supplier Outstanding Balances (Accounts Payable - Admin Only)
router.get(
  '/supplier-dues',
  authorize('ADMIN'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getSupplierDuesReport(req, res, next)
);

// 8. GST / Tax Summary Report (Tax Compliance - Admin Only)
router.get(
  '/gst-summary',
  authorize('ADMIN'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getGstSummaryReport(req, res, next)
);

// 9. Payment Collection & Cash-Flow Summary Report
router.get(
  '/payments-summary',
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getPaymentsSummaryReport(req, res, next)
);

// 10. Product-Level Sales & Inventory Summary Report
router.get(
  '/product-sales',
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getProductSalesReport(req, res, next)
);

// 11. Transaction History (Unified Sales, Purchases, and Collections Ledger)
router.get(
  '/history',
  authorize('ADMIN', 'STAFF'),
  validate(validateReportQuery),
  (req, res, next) => reportController.getTransactionHistory(req, res, next)
);

module.exports = router;
