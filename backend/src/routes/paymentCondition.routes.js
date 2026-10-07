const { Router } = require('express');
const paymentConditionController = require('../controllers/paymentCondition.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => paymentConditionController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => paymentConditionController.getById(req, res, next));
router.post('/', authMiddleware, requireRole('comprador', 'faturamento'), (req, res, next) => paymentConditionController.save(req, res, next));
router.delete('/:id', authMiddleware, requireRole('comprador', 'faturamento'), (req, res, next) => paymentConditionController.delete(req, res, next));

module.exports = router;
