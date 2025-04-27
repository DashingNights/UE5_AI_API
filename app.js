/**
 * Express application setup
 */
const express = require('express');
const healthRoutes = require('./routes/healthRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/ai', aiRoutes);

module.exports = app;
