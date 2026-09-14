const orderRepository = require('../repositories/orderRepository');
const fiscalRepository = require('../repositories/fiscalRepository');

class OrderService {
  async listOrders() {
    return await orderRepository.findAll();
  }

  async getOrder(id) {
    const order = await orderRepository.findById(id);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return order;
  }

  async saveOrder(orderData) {
    if (!orderData || !orderData.header || !orderData.header.numeroPedido) {
      const err = new Error('Dados do pedido inválidos: número do pedido é obrigatório.');
      err.statusCode = 400;
      throw err;
    }

    const saved = await orderRepository.save(orderData);

    // Sincronização automática em tempo real com o Financeiro / Contas a Pagar
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved);
    } catch (finErr) {
      console.error('Erro ao sincronizar pedido com o financeiro:', finErr);
    }

    return {
      success: true,
      message: `Pedido ${orderData.header.numeroPedido} salvo com sucesso no SQLite!`,
      order: saved
    };
  }

  async updateInstallment(orderId, updatedInstallment) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    let installments = order.installments || [];
    const idx = installments.findIndex(i => i.numeroParcela === updatedInstallment.numeroParcela);

    if (idx >= 0) {
      installments[idx] = updatedInstallment;
    } else {
      installments.push(updatedInstallment);
    }

    const updated = await orderRepository.updateInstallments(orderId, installments);

    // Sincronização automática em tempo real com o Financeiro
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(updated);
    } catch (finErr) {
      console.error('Erro ao sincronizar parcela com o financeiro:', finErr);
    }

    return {
      success: true,
      message: `Parcela ${updatedInstallment.numeroParcela}ª atualizada com sucesso!`,
      order: updated
    };
  }

  async deleteOrder(id) {
    const existing = await orderRepository.findById(id);
    if (!existing) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    await orderRepository.delete(id);

    // Remove lançamentos financeiros vinculados ao pedido
    try {
      const financialRepo = require('../repositories/financialRepository');
      await financialRepo.deleteByOrderId(id);
    } catch (finErr) {
      console.error('Erro ao remover lançamentos financeiros do pedido:', finErr);
    }

    return { success: true, message: `Pedido ${existing.header.numeroPedido} excluído com sucesso.` };
  }

  async duplicateOrder(id) {
    const duplicated = await orderRepository.duplicate(id);
    return {
      success: true,
      message: `Pedido duplicado com sucesso: ${duplicated.header.numeroPedido}`,
      order: duplicated
    };
  }
}

module.exports = new OrderService();
