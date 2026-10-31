const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const inventoryRoutes = require('./inventory.routes');
const supplierRoutes = require('./supplier.routes');
const customerRoutes = require('./customer.routes');
const purchaseRoutes = require('./purchase.routes');
const saleRoutes = require('./sale.routes');

const router = express.Router();

/**
 * Central API Router
 * Aggregates all modular routes under a unified namespace.
 */

// System Health & Diagnostics
router.use('/health', healthRoutes);

// Authentication & Identity
router.use('/auth', authRoutes);

// Products & Catalog
router.use('/products', productRoutes);

// Categories
router.use('/categories', categoryRoutes);

// Inventory & Stock Movements
router.use('/inventory', inventoryRoutes);

// Suppliers & Manufacturers
router.use('/suppliers', supplierRoutes);

// Customers & Farmer Khata
router.use('/customers', customerRoutes);

// Purchases & Accounts Payable
router.use('/purchases', purchaseRoutes);

// POS Sales & Invoicing
router.use('/sales', saleRoutes);

// Payments & Accounts Receivable/Payable
const paymentRoutes = require('./payment.routes');
router.use('/payments', paymentRoutes);

// Reports & Financial Analytics
const reportRoutes = require('./report.routes');
router.use('/reports', reportRoutes);

// Dashboard alias (/api/dashboard/summary and /api/dashboard)
router.use('/dashboard', reportRoutes);

module.exports = router;


