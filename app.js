/**
 * Express application setup
 */
const express = require('express');
const healthRoutes = require('./routes/healthRoutes');
const aiRoutes = require('./routes/aiRoutes');
const npcRoutes = require('./routes/npcRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/ai', aiRoutes);
app.use('/npc', npcRoutes);
app.use('/admin', adminRoutes);

module.exports = app;
