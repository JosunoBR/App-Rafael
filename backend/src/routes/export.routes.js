const { Router } = require('express');
const exportController = require('../controllers/export.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/excel', authMiddleware, (req, res, next) => exportController.exportExcel(req, res, next));
router.post('/pdf', authMiddleware, (req, res, next) => exportController.exportPdf(req, res, next));
router.post('/pdf/separation', authMiddleware, (req, res, next) => exportController.exportSeparationPdf(req, res, next));

module.exports = router;
