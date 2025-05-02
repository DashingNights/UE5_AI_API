/**
 * Express application setup
 */
const express = require('express');
const path = require('path');
const healthRoutes = require('./routes/healthRoutes');
const aiRoutes = require('./routes/aiRoutes');
const npcRoutes = require('./routes/npcRoutes');
const adminRoutes = require('./routes/adminRoutes');
const debugRoutes = require('./routes/debugRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/health', healthRoutes);
app.use('/ai', aiRoutes);
app.use('/npc', npcRoutes);
app.use('/admin', adminRoutes);
app.use('/debug', debugRoutes);

// Serve the debug dashboard as the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
