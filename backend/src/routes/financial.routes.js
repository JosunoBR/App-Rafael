const { Router } = require('express');
const financialController = require('../controllers/financial.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');

const router = Router();

// Gestão Financeira protegida por RBAC (Diretoria e Faturamento)
router.use(authMiddleware);

router.get('/entries', requirePermission('financial:view', 'faturamento'), (req, res) => financialController.getEntries(req, res));
router.get('/summary', requirePermission('financial:view', 'faturamento'), (req, res) => financialController.getSummary(req, res));
router.get('/entries/:id', requirePermission('financial:view', 'faturamento'), (req, res) => financialController.getEntryById(req, res));
router.post('/entries', requirePermission('financial:create_entry', 'faturamento'), (req, res) => financialController.createEntry(req, res));
router.put('/entries/:id', requirePermission('financial:edit_entry', 'faturamento'), (req, res) => financialController.updateEntry(req, res));
router.post('/entries/:id/pay', requirePermission('financial:pay_entry', 'faturamento'), (req, res) => financialController.payEntry(req, res));
router.get('/entries/:id/comprovante', requirePermission('financial:view', 'faturamento'), (req, res) => financialController.downloadComprovante(req, res));
router.post('/entries/batch-pay', requirePermission('financial:pay_entry', 'faturamento'), (req, res) => financialController.batchPay(req, res));
router.delete('/entries/:id', requirePermission('financial:edit_entry', 'faturamento'), (req, res) => financialController.deleteEntry(req, res));
router.post('/sync-orders', requirePermission('financial:edit_entry', 'faturamento'), (req, res) => financialController.syncOrders(req, res));
router.post('/import-sheet', requirePermission('financial:create_entry', 'faturamento'), (req, res) => financialController.importSheet(req, res));
router.post('/import-spreadsheet', requirePermission('financial:create_entry', 'faturamento'), (req, res) => financialController.importSpreadsheet(req, res));
router.delete('/recurring/:recorrenciaId', requirePermission('financial:cancel_recurrence', 'faturamento'), (req, res) => financialController.cancelRecurrence(req, res));

module.exports = router;
