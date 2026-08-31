const { Router } = require('express');
const configController = require('../controllers/config.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/fiscal', optionalAuth, (req, res, next) => configController.getFiscal(req, res, next));
router.post('/fiscal', authMiddleware, requireRole('diretoria'), (req, res, next) => configController.saveFiscal(req, res, next));
router.get('/stores', optionalAuth, (req, res, next) => configController.getStores(req, res, next));

module.exports = router;
