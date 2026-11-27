const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const announcements = require('../services/franchiseAnnouncements.service');

const router = Router();
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'root' && req.user.id !== 'usr_root') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador raiz.' });
  }
  next();
});

const action = work => async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(await work(req));
  } catch (error) {
    if (!error.status) console.error('[comunicados da rede]', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível processar o comunicado.' });
  }
};

router.get('/', action(() => announcements.list()));
router.post('/', action(req => announcements.publish(req.user, req.body)));
router.post('/:id/archive', action(req => announcements.archive(req.user, req.params.id)));

module.exports = router;
