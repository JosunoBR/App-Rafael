const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

// Gestão de usuários protegida por RBAC (Apenas Diretoria pode criar/listar/editar/excluir usuários)
router.get('/', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.list(req, res, next));
router.get('/available-stores', authMiddleware, requireRole('diretoria'), async (req, res, next) => {
  try {
    const excluded = req.query.excludeUserId;
    if (excluded !== undefined && (typeof excluded !== 'string' || excluded.length > 200)) return res.status(400).json({ error: 'Usuário inválido.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(await require('../services/user.service').availableStores(excluded ?? null));
  } catch (error) { next(error); }
});
router.get('/:id', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.getById(req, res, next));
router.post('/', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.create(req, res, next));
router.put('/:id', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.update(req, res, next));
router.put('/:id/permissions', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.updatePermissions(req, res, next));
router.delete('/:id', authMiddleware, requireRole('diretoria'), (req, res, next) => userController.delete(req, res, next));

module.exports = router;
