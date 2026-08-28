const supplierService = require('../services/supplier.service');

class SupplierController {
  async list(req, res, next) {
    try {
      const suppliers = await supplierService.listSuppliers();
      return res.json(suppliers);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const supplier = await supplierService.getSupplier(req.params.id);
      return res.json(supplier);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const result = await supplierService.saveSupplier(req.body);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await supplierService.deleteSupplier(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SupplierController();
