const { Router } = require('express');
const auditController = require('../controllers/audit.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => auditController.list(req, res, next));
router.get('/deletions', optionalAuth, (req, res, next) => auditController.listDeletions(req, res, next));
router.get('/distribution/:orderId?', optionalAuth, (req, res, next) => auditController.listDistributionLogs(req, res, next));
router.get('/financial', optionalAuth, (req, res, next) => auditController.listFinancialLogs(req, res, next));
router.post('/', optionalAuth, (req, res, next) => auditController.create(req, res, next));

module.exports = router;
