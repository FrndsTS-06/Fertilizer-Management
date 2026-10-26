const express = require('express');
const cors = require('cors');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Modular Routes
app.use('/api/products', require('./modules/products/products.routes'));
app.use('/api/inventory', require('./modules/inventory/inventory.routes'));
app.use('/api/customers', require('./modules/customers/customers.routes'));

// Sales & payments routes
const customersController = require('./modules/customers/customers.controller');
app.get('/api/sales', customersController.getAllSales);
app.post('/api/sales', customersController.createSale);
app.get('/api/payments', customersController.getAllPayments);
app.post('/api/sales/:id/payments', customersController.recordSalePayment);

// app.use('/api/auth', require('./modules/auth/routes'));
// app.use('/api/purchases', require('./modules/purchases/routes'));
// app.use('/api/sales', require('./modules/sales/routes'));
// app.use('/api/payments', require('./modules/payments/routes'));
// app.use('/api/reports', require('./modules/reports/routes'));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

module.exports = app;
