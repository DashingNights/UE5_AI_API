/**
 * Health check routes
 */
const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (_, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
