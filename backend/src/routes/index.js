const { Router } = require('express');
const { dbPath } = require('../config/database');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const orderRoutes = require('./order.routes');
const supplierRoutes = require('./supplier.routes');
const productRoutes = require('./product.routes');
const auditRoutes = require('./audit.routes');
const exportRoutes = require('./export.routes');
const configRoutes = require('./config.routes');
const stockRoutes = require('./stock.routes');

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    architecture: 'Clean Architecture (SRP + DIP + RBAC + SQLite Relational)',
    database: 'SQLite (mega12.db)',
    path: dbPath,
    timestamp: new Date().toISOString()
  });
});

// Modular Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/config', configRoutes);
router.use('/audit', auditRoutes);
router.use('/export', exportRoutes);

module.exports = router;
