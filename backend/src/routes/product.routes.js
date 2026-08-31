const { Router } = require('express');
const productController = require('../controllers/product.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => productController.list(req, res, next));
router.post('/sync-catalog', optionalAuth, (req, res, next) => productController.syncCatalog(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => productController.getById(req, res, next));
router.post('/', authMiddleware, requireRole('diretoria', 'comprador'), (req, res, next) => productController.save(req, res, next));
router.delete('/:id', authMiddleware, requireRole('diretoria'), (req, res, next) => productController.delete(req, res, next));

module.exports = router;
