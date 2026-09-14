const { Router } = require('express');
const financialController = require('../controllers/financial.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/entries', optionalAuth, (req, res) => financialController.getEntries(req, res));
router.get('/summary', optionalAuth, (req, res) => financialController.getSummary(req, res));
router.get('/entries/:id', optionalAuth, (req, res) => financialController.getEntryById(req, res));
router.post('/entries', optionalAuth, (req, res) => financialController.createEntry(req, res));
router.put('/entries/:id', optionalAuth, (req, res) => financialController.updateEntry(req, res));
router.post('/entries/:id/pay', optionalAuth, (req, res) => financialController.payEntry(req, res));
router.delete('/entries/:id', optionalAuth, (req, res) => financialController.deleteEntry(req, res));
router.post('/sync-orders', optionalAuth, (req, res) => financialController.syncOrders(req, res));
router.post('/import-sheet', optionalAuth, (req, res) => financialController.importSheet(req, res));

module.exports = router;
