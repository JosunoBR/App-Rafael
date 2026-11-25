const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { getUnitsBi } = require('../services/unitsBi.service');
const router = Router();
router.get('/', authMiddleware, requirePermission('nav:units_bi'), async (req, res) => {
  try {
    const data = await getUnitsBi(req.query.month);
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  } catch (error) {
    if (!error.status) console.error('[BI das unidades]', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível carregar o BI das unidades. Tente novamente.' });
  }
});
module.exports = router;
