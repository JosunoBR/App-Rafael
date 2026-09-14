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

  /**
   * Valida a integridade financeira das parcelas do pedido antes da persistência
   */
  _validateInstallmentsIntegrity(orderData) {
    const installments = orderData.installments;
    if (!Array.isArray(installments) || installments.length === 0) {
      return;
    }

    let sumInstallments = 0;
    installments.forEach((inst, index) => {
      const valor = Number(inst.valor);
      if (isNaN(valor) || valor < 0) {
        const err = new Error(`Parcela ${inst.numeroParcela || index + 1} contém valor inválido: ${inst.valor}`);
        err.statusCode = 400;
        throw err;
      }
      if (!inst.dataVencimento) {
        const err = new Error(`Parcela ${inst.numeroParcela || index + 1} está sem data de vencimento.`);
        err.statusCode = 400;
        throw err;
      }
      sumInstallments += valor;
    });

    // Se houver total de mercadorias / itens e o pedido não for um rascunho
    if (!orderData.header?.isDraft && Array.isArray(orderData.items) && orderData.items.length > 0) {
      const itemsSum = orderData.items.reduce((acc, item) => {
        return acc + Number(item.valorTotalLiquido !== undefined ? item.valorTotalLiquido : (item.valorTotalBruto || item.custoLiquidoTotalComDesconto || item.custoLiquidoTotal || 0));
      }, 0);
      
      const frete = Number(orderData.header.valorFrete) || 0;
      const expectedTotal = itemsSum + frete;

      // Se ambas as somas forem expressivas (> 1 real) e a discrepância for superior a 5 reais (além de centavos)
      if (sumInstallments > 1 && expectedTotal > 1) {
        const diff = Math.abs(sumInstallments - expectedTotal);
        if (diff > 5.0 && !orderData.header.percentualDescontoOff && !orderData.header.descontoComercialTotal) {
          console.warn(`[Auditoria Financeira] Divergência no pedido ${orderData.header.numeroPedido}: Soma parcelas (R$ ${sumInstallments.toFixed(2)}) vs Total Calculado (R$ ${expectedTotal.toFixed(2)})`);
        }
      }
    }
  }

  async saveOrder(orderData) {
    if (!orderData || !orderData.header || !orderData.header.numeroPedido) {
      const err = new Error('Dados do pedido inválidos: número do pedido é obrigatório.');
      err.statusCode = 400;
      throw err;
    }

    // Validação de integridade financeira antes de salvar
    this._validateInstallmentsIntegrity(orderData);

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
    if (!updatedInstallment) {
      const err = new Error('Dados da parcela são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const valor = Number(updatedInstallment.valor);
    if (isNaN(valor) || valor < 0) {
      const err = new Error(`Valor da parcela inválido: ${updatedInstallment.valor}`);
      err.statusCode = 400;
      throw err;
    }

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
