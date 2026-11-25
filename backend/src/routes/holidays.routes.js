const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const holidays = require('../services/holidays.service');
const router = Router();
router.use(authMiddleware);
const action = work => async (req, res) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await work(req)); }
  catch (error) { if (!error.status) console.error('[feriados]', error.message); res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível processar o feriado. Tente novamente.' }); }
};
router.get('/stores', requirePermission('nav:units_conference', 'faturamento'), action(() => holidays.stores()));
router.post('/central', requirePermission('nav:units_conference', 'faturamento'), action(req => holidays.declare(req.user, req.body)));
router.get('/', (req, res, next) => requirePermission(req.user.role === 'unidade' ? 'nav:store_portal' : 'nav:units_conference', 'faturamento')(req, res, next), action(req => {
  if (req.user.role === 'unidade' && (!req.user.storeId || req.query.storeId && req.query.storeId !== req.user.storeId)) throw Object.assign(new Error('Acesso à unidade negado.'), { status: 403 });
  return holidays.list({ storeId: req.user.role === 'unidade' ? req.user.storeId : req.query.storeId, month: req.query.month });
}));
router.post('/requests', requirePermission('units:submit', 'unidade'), action(req => {
  if (req.user.role !== 'unidade') throw Object.assign(new Error('Use o cadastro de feriado geral da central.'), { status: 403 });
  return holidays.submit(req.user, req.body);
}));
router.post('/global', requirePermission('nav:units_conference', 'faturamento'), action(req => holidays.submit(req.user, req.body, true)));
router.post('/:id/review', requirePermission('nav:units_conference', 'faturamento'), action(req => holidays.review(req.user, req.params.id, req.body.decision, req.body.note)));
module.exports = router;
