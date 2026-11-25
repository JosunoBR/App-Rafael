const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requirePermission, requireRole } = require('../middlewares/rbac.middleware');
const repository = require('../repositories/goalsRepository');
const service = require('../services/goals.service');
const router = Router();
router.use(authMiddleware);
const action = work => async (req, res) => {
  try { await work(req, res); }
  catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[metas] Operação não concluída:', error.message);
    res.status(status).json({ error: status >= 500 ? 'Não foi possível acessar as metas. Tente novamente ou contate o suporte.' : error.message });
  }
};
const historyAccess = (req, res, next) => {
  if (req.user?.role === 'unidade') return res.status(403).json({ error: 'Histórico geral indisponível para o perfil Unidade.' });
  if (req.user?.permissions?.['nav:goals'] === true || req.user?.permissions?.['nav:units_history'] === true) return next();
  return requireRole('diretoria')(req, res, next);
};
router.get(['/workbook', '/history'], historyAccess, action(async (req, res) => {
  await service.ensureSeed();
  res.setHeader('Cache-Control', 'no-store');
  res.json(await repository.findWorkbook());
}));
router.get('/history/source-sheet', historyAccess, action(async (req, res) => {
  if (typeof req.query.name !== 'string' || req.query.name.length > 100) return res.status(400).json({ error: 'Aba inválida.' });
  res.setHeader('Cache-Control', 'no-store');
  res.json(await repository.getSourceSheet(req.query.name));
}));
router.get('/plans', (req,res,next) => requirePermission(req.user.role === 'unidade' ? 'units:view_goals' : 'nav:goals')(req,res,next), action(async (req, res) => {
  const year = Number(req.query.year), month = Number(req.query.month);
  service.validatePeriod(year, month);
  res.setHeader('Cache-Control', 'no-store');
  const plans = await repository.getPlans(year, month);
  res.json(req.user.role === 'unidade' ? plans.filter(plan => plan.storeId === req.user.storeId) : plans);
}));
router.put('/plans', requirePermission('goals:manage', 'diretoria'), action(async (req, res) => {
  const body = service.validatePlans(req.body);
  res.json(await repository.savePlans(body.year, body.month, body.plans, req.user.id));
}));
router.post('/import', requireRole('diretoria'), action(async (req, res) => res.json(await service.importSeed(req.user.id))));
module.exports = router;
