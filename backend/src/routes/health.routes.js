const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Lightweight health check endpoint verifying Express status
 * @access  Public
 */
router.get('/', (req, res) => healthController.getHealth(req, res));

/**
 * @route   GET /api/health/db
 * @desc    Safe database connectivity diagnostic endpoint (read-only query)
 * @access  Public
 */
router.get('/db', (req, res, next) => healthController.getDatabaseHealth(req, res, next));

module.exports = router;
