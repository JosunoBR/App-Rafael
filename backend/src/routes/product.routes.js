const { Router } = require('express');
const productController = require('../controllers/product.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => productController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => productController.getById(req, res, next));
router.post('/', optionalAuth, (req, res, next) => productController.save(req, res, next));
router.delete('/:id', optionalAuth, (req, res, next) => productController.delete(req, res, next));

module.exports = router;
