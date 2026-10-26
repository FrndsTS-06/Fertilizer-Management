const express = require('express');
const router = express.Router();
const controller = require('./customers.controller');

router.get('/', controller.getAllCustomers);
router.post('/', controller.createCustomer);
router.get('/:id', controller.getCustomerById);
router.patch('/:id', controller.updateCustomer);
router.delete('/:id', controller.deleteCustomer);
router.delete('/', controller.clearAllCustomers);
router.get('/:id/sales', controller.getCustomerSales);
router.get('/:id/payments', controller.getCustomerPayments);
router.get('/:id/balance', controller.getCustomerBalance);

module.exports = router;

