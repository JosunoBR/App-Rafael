const { Router } = require('express');
const supplierController = require('../controllers/supplier.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', optionalAuth, (req, res, next) => supplierController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => supplierController.getById(req, res, next));
router.post('/', optionalAuth, (req, res, next) => supplierController.save(req, res, next));
router.delete('/:id', optionalAuth, (req, res, next) => supplierController.delete(req, res, next));

module.exports = router;
