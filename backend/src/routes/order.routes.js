const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', authMiddleware, (req, res, next) => orderController.list(req, res, next));
router.get('/next-number', authMiddleware, (req, res, next) => orderController.getNextNumber(req, res, next));
router.get('/check-numero/:numero', authMiddleware, (req, res, next) => orderController.checkNumero(req, res, next));
router.get('/:id', authMiddleware, (req, res, next) => orderController.getById(req, res, next));
router.post('/', authMiddleware, (req, res, next) => orderController.save(req, res, next));
router.post('/:id/duplicate', authMiddleware, (req, res, next) => orderController.duplicate(req, res, next));
router.put('/:id/installment', authMiddleware, (req, res, next) => orderController.updateInstallment(req, res, next));
router.post('/:id/confirm-receipt', authMiddleware, (req, res, next) => orderController.confirmReceipt(req, res, next));
router.post('/:id/send-to-distribution', authMiddleware, (req, res, next) => orderController.sendToDistribution(req, res, next));
router.post('/:id/release-to-separation', authMiddleware, (req, res, next) => orderController.releaseToSeparation(req, res, next));
router.post('/:id/send-to-faturamento', authMiddleware, (req, res, next) => orderController.sendToFaturamento(req, res, next));
router.post('/:id/finalize', authMiddleware, (req, res, next) => orderController.finalizeOrder(req, res, next));
router.post('/:id/authorize-financial', authMiddleware, (req, res, next) => orderController.authorizeFinancial(req, res, next));
router.post('/:id/rollback', authMiddleware, requireRole(['diretoria']), (req, res, next) => orderController.rollbackOrderStatus(req, res, next));
router.delete('/:id', authMiddleware, (req, res, next) => orderController.delete(req, res, next));

module.exports = router;
