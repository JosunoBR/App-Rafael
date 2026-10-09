const orderService = require('../services/order.service');

class OrderController {
  async list(req, res, next) {
    try {
      const orders = await orderService.listOrders(req.user);
      return res.json(orders);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await orderService.getOrder(req.params.id, req.user);
      return res.json(order);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const result = await orderService.saveOrder(req.body, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async importPackage(req, res, next) {
    try {
      const result = await orderService.importOrderPackage(req.body, req.user);
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

  async rescheduleDelivery(req, res, next) {
    try {
      const { novaDataEntregaPrevista, ajustarBoletos, motivo } = req.body;
      const result = await orderService.rescheduleDelivery(
        req.params.id,
        { novaDataEntregaPrevista, ajustarBoletos, motivo },
        req.user
      );
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async confirmReceipt(req, res, next) {
    try {
      const { dataRecebimento, recebidoPor, numeroNotaFiscal, autorizarBoletos } = req.body;
      const result = await orderService.confirmReceipt(
        req.params.id,
        { dataRecebimento, recebidoPor, numeroNotaFiscal, autorizarBoletos },
        req.user
      );
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async sendToDistribution(req, res, next) {
    try {
      const result = await orderService.sendToDistribution(req.params.id, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async releaseToSeparation(req, res, next) {
    try {
      const result = await orderService.releaseToSeparation(req.params.id, req.body, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getSeparation(req, res, next) {
    try {
      const result = await orderService.getSeparationState(req.params.id, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateSeparationCheck(req, res, next) {
    try {
      const { id, storeId, itemId } = req.params;
      const result = await orderService.updateSeparationCheck(id, storeId, itemId, req.body, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async addSeparationDamage(req, res, next) {
    try {
      const result = await orderService.addSeparationDamage(req.params.id, req.body, req.user);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteSeparationDamage(req, res, next) {
    try {
      const { id, damageId } = req.params;
      const result = await orderService.deleteSeparationDamage(id, damageId, req.body, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async sendToFaturamento(req, res, next) {
    try {
      const result = await orderService.sendToFaturamento(req.params.id, req.body, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async finalizeOrder(req, res, next) {
    try {
      const result = await orderService.finalizeOrder(req.params.id, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async authorizeFinancial(req, res, next) {
    try {
      const result = await orderService.authorizeFinancialRelease(req.params.id, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async rollbackOrderStatus(req, res, next) {
    try {
      const { targetStatus, reason } = req.body || {};
      const result = await orderService.rollbackOrderStatus(req.params.id, { targetStatus, reason }, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
