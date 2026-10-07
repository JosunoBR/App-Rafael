const { Router } = require('express');
const productController = require('../controllers/product.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/images/:filename', (req, res, next) => productController.getImage(req, res, next));
router.get('/', optionalAuth, (req, res, next) => productController.list(req, res, next));
router.post('/sync-catalog', authMiddleware, requirePermission('nav:products', 'comprador', 'deposito'), (req, res, next) => productController.syncCatalog(req, res, next));
router.post('/batch', authMiddleware, requirePermission('nav:products', 'comprador', 'deposito'), (req, res, next) => productController.saveBatch(req, res, next));
router.get('/next-code', optionalAuth, (req, res, next) => productController.getNextCode(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => productController.getById(req, res, next));
router.post('/', authMiddleware, requirePermission('nav:products', 'comprador', 'deposito'), (req, res, next) => productController.save(req, res, next));
router.delete('/:id', authMiddleware, requirePermission('nav:products', 'comprador', 'deposito'), (req, res, next) => productController.delete(req, res, next));

module.exports = router;
