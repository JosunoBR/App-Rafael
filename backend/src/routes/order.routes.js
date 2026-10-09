const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole, requirePermission } = require('../middlewares/rbac.middleware');

const router = Router();

router.get('/', authMiddleware, (req, res, next) => orderController.list(req, res, next));
router.get('/next-number', authMiddleware, (req, res, next) => orderController.getNextNumber(req, res, next));
router.get('/check-numero/:numero', authMiddleware, (req, res, next) => orderController.checkNumero(req, res, next));
router.get('/:id', authMiddleware, (req, res, next) => orderController.getById(req, res, next));
router.post('/import', authMiddleware, (req, res, next) => orderController.importPackage(req, res, next));
router.post('/', authMiddleware, (req, res, next) => orderController.save(req, res, next));
router.post('/:id/duplicate', authMiddleware, (req, res, next) => orderController.duplicate(req, res, next));
router.put('/:id/installment', authMiddleware, (req, res, next) => orderController.updateInstallment(req, res, next));
router.post('/:id/reschedule-delivery', authMiddleware, (req, res, next) => orderController.rescheduleDelivery(req, res, next));
router.post('/:id/confirm-receipt', authMiddleware, requirePermission('pipeline:confirm_receipt', 'comprador', 'deposito'), (req, res, next) => orderController.confirmReceipt(req, res, next));
router.post('/:id/send-to-distribution', authMiddleware, requirePermission('pipeline:send_distribution', 'comprador', 'deposito'), (req, res, next) => orderController.sendToDistribution(req, res, next));
router.post('/:id/release-to-separation', authMiddleware, requirePermission('pipeline:release_separation', 'comprador', 'deposito'), (req, res, next) => orderController.releaseToSeparation(req, res, next));
router.get('/:id/separation', authMiddleware, (req, res, next) => orderController.getSeparation(req, res, next));
router.patch('/:id/separation/checks/:storeId/:itemId', authMiddleware, (req, res, next) => orderController.updateSeparationCheck(req, res, next));
router.post('/:id/separation/damages', authMiddleware, (req, res, next) => orderController.addSeparationDamage(req, res, next));
router.delete('/:id/separation/damages/:damageId', authMiddleware, (req, res, next) => orderController.deleteSeparationDamage(req, res, next));
router.post('/:id/send-to-faturamento', authMiddleware, requirePermission('pipeline:send_faturamento', 'comprador', 'deposito', 'separacao'), (req, res, next) => orderController.sendToFaturamento(req, res, next));
router.post('/:id/finalize', authMiddleware, (req, res, next) => orderController.finalizeOrder(req, res, next));
router.post('/:id/authorize-financial', authMiddleware, requirePermission('financial:authorize_release', 'faturamento'), (req, res, next) => orderController.authorizeFinancial(req, res, next));
router.post('/:id/rollback', authMiddleware, requireRole('diretoria', 'comprador', 'faturamento'), (req, res, next) => orderController.rollbackOrderStatus(req, res, next));
router.delete('/:id', authMiddleware, (req, res, next) => orderController.delete(req, res, next));

module.exports = router;
