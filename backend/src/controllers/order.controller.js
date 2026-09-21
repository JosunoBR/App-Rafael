const orderService = require('../services/order.service');

class OrderController {
  async list(req, res, next) {
    try {
      const orders = await orderService.listOrders();
      return res.json(orders);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await orderService.getOrder(req.params.id);
      return res.json(order);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const result = await orderService.saveOrder(req.body);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateInstallment(req, res, next) {
    try {
      const result = await orderService.updateInstallment(req.params.id, req.body);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await orderService.deleteOrder(req.params.id, req.body, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async duplicate(req, res, next) {
    try {
      const result = await orderService.duplicateOrder(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getNextNumber(req, res, next) {
    try {
      const nextNumber = await orderService.getNextOrderNumber();
      return res.json({ nextNumber });
    } catch (err) {
      next(err);
    }
  }

  async checkNumero(req, res, next) {
    try {
      const { numero } = req.params;
      const { excludeId } = req.query;
      const result = await orderService.checkNumeroAvailable(numero, excludeId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
