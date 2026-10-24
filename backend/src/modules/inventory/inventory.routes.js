const express = require('express');
const router = express.Router();
const controller = require('./inventory.controller');

router.get('/summary', controller.getInventorySummary);
router.get('/movements', controller.getInventoryMovements);
router.post('/adjustments', controller.createAdjustment);

module.exports = router;
