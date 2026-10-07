const { Router } = require('express');
const stockController = require('../controllers/stock.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => stockController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => stockController.getById(req, res, next));
router.post('/', authMiddleware, requirePermission('nav:stock', 'comprador', 'deposito'), (req, res, next) => stockController.save(req, res, next));
router.put('/:id/balance', authMiddleware, requirePermission('nav:stock', 'comprador', 'deposito'), (req, res, next) => stockController.updateBalance(req, res, next));
router.delete('/clear/all', authMiddleware, requirePermission('nav:stock', 'comprador', 'deposito'), (req, res, next) => stockController.clearAll(req, res, next));
router.delete('/:id', authMiddleware, requirePermission('nav:stock', 'comprador', 'deposito'), (req, res, next) => stockController.delete(req, res, next));

module.exports = router;
