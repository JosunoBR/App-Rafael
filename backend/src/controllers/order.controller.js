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
      const result = await orderService.deleteOrder(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
