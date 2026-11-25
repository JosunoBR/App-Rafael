const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const memos = require('../services/calendarMemos.service');
const router = Router();
router.use(authMiddleware);
router.use((req, res, next) => ['root','diretoria'].includes(req.user.role) || req.user.id === 'usr_root' ? next() : res.status(403).json({ error: 'Os memorandos de avaliação são exclusivos da diretoria.' }));
const action = work => async (req, res) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await work(req)); }
  catch (error) { if (!error.status) console.error('[memorandos-calendario]', error.message); res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível processar o memorando. Tente novamente.' }); }
};
router.get('/', action(req => memos.list(req.query.month, req.query.storeId)));
router.get('/:storeId/:date', action(req => memos.get(req.params.storeId, req.params.date)));
router.put('/:storeId/:date', action(req => memos.save(req.user, req.params.storeId, req.params.date, req.body)));
module.exports = router;
