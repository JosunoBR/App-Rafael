const { Router } = require('express');
const auditController = require('../controllers/audit.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', authMiddleware, requirePermission('audit:view'), (req, res, next) => auditController.list(req, res, next));
router.get('/deletions', authMiddleware, requirePermission('audit:view'), (req, res, next) => auditController.listDeletions(req, res, next));
router.get('/distribution/:orderId?', authMiddleware, requirePermission('audit:view', 'comprador', 'deposito', 'separacao', 'faturamento'), (req, res, next) => auditController.listDistributionLogs(req, res, next));
router.get('/financial', authMiddleware, requirePermission('audit:view', 'faturamento'), (req, res, next) => auditController.listFinancialLogs(req, res, next));
router.post('/', authMiddleware, requirePermission('audit:view'), (req, res, next) => auditController.create(req, res, next));

module.exports = router;
