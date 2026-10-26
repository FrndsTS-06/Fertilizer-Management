const express = require('express');
const router = express.Router();
const controller = require('./products.controller');

router.get('/', controller.getAllProducts);
router.get('/:id', controller.getProductById);
router.post('/', controller.createProduct);
router.patch('/:id', controller.updateProduct);
router.delete('/:id', controller.deleteProduct);
router.delete('/', controller.clearAllProducts);

module.exports = router;

