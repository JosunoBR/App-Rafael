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
      let brutoSum = 0;
      let ipiSum = 0;
      let descSum = 0;
      orderData.items.forEach(item => {
        if (item.ruptura) return;
        const pecas = Number(item.qtdTotalUnidades || 0);
        const preco = Number(item.precoUnitario || 0);
        const bruto = Number(item.valorTotalBruto !== undefined ? item.valorTotalBruto : (pecas * preco));
        brutoSum += bruto;
        ipiSum += Number(item.valorIpi || 0);
        descSum += Number(item.valorDescontoItem || 0);
      });

      const headerDesc = Number(orderData.header.descontoComercialTotal || 0);
      const totalDesconto = descSum > 0 ? descSum : headerDesc;
      // Regra Oficial Central: Total (Bruto) + IPI - Desconto Comercial = Total Geral
      const expectedTotal = Number(Math.max(0, brutoSum + ipiSum - totalDesconto).toFixed(2));

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

  async deleteOrder(id, authData = {}, currentUser = null) {
    const existing = await orderRepository.findById(id);
    if (!existing) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const userRepository = require('../repositories/userRepository');
    const bcrypt = require('bcryptjs');

    const { directorEmail, directorPassword, reason } = authData || {};

    if (!directorPassword || String(directorPassword).trim().length === 0) {
      const err = new Error('A senha de Diretoria é obrigatória para autorizar a exclusão.');
      err.statusCode = 400;
      throw err;
    }

    let authorizingDirector = null;

    // Cenário 1: O usuário logado já possui perfil de Diretoria (Sudo Mode)
    if (currentUser && currentUser.role === 'diretoria') {
      const dbUser = await userRepository.findById(currentUser.id) || await userRepository.findByEmailOrAlias(currentUser.email);
      if (!dbUser) {
        const err = new Error('Usuário de diretoria não encontrado no sistema.');
        err.statusCode = 401;
        throw err;
      }
      const isPasswordValid = await bcrypt.compare(directorPassword, dbUser.senha);
      if (!isPasswordValid) {
        const err = new Error('Senha de Diretoria incorreta.');
        err.statusCode = 403;
        throw err;
      }
      authorizingDirector = dbUser;
    } else {
      // Cenário 2: Usuário logado não é Diretoria (Comprador, Depósito, etc.) -> Exige autorização de supervisor
      const targetEmail = (directorEmail || '').trim().toLowerCase();
      if (!targetEmail) {
        const err = new Error('O e-mail de um Diretor é obrigatório para autorizar a exclusão.');
        err.statusCode = 400;
        throw err;
      }
      const directorUser = await userRepository.findByEmailOrAlias(targetEmail);
      if (!directorUser || directorUser.role !== 'diretoria' || directorUser.ativo === 0) {
        const err = new Error('Usuário supervisor não encontrado ou não possui perfil de Diretoria ativo.');
        err.statusCode = 403;
        throw err;
      }
      const isPasswordValid = await bcrypt.compare(directorPassword, directorUser.senha);
      if (!isPasswordValid) {
        const err = new Error('Senha do Diretor supervisor incorreta.');
        err.statusCode = 403;
        throw err;
      }
      authorizingDirector = directorUser;
    }

    // Se for romaneio de transferência do CD, estorna o estoque central automaticamente
    const isTransfer = existing.header?.supplierId === 'cd_matriz' || 
                       String(existing.header?.numeroPedido || '').startsWith('CD-') || 
                       String(id).startsWith('order_transf_cd_') ||
                       (existing.header?.fornecedor && existing.header.fornecedor.toLowerCase().includes('transferência'));

    let reversedUnits = 0;
    if (isTransfer && Array.isArray(existing.items)) {
      try {
        const stockRepository = require('../repositories/stockRepository');
        const allStock = await stockRepository.findAll();
        for (const it of existing.items) {
          const qty = Number(it.qtdTotalUnidades || 0);
          if (qty > 0) {
            const match = allStock.find(s => 
              (s.codigo && it.codigo && s.codigo.trim().toLowerCase() === it.codigo.trim().toLowerCase()) ||
              (s.descricao && it.descricao && s.descricao.trim().toLowerCase() === it.descricao.trim().toLowerCase()) ||
              (s.productId && (s.productId === it.id || s.productId === it.productId))
            );
            if (match) {
              await stockRepository.updateBalance(match.id, qty);
              reversedUnits += qty;
            }
          }
        }
      } catch (stockErr) {
        console.warn('Aviso ao estornar estoque de transferência:', stockErr.message);
      }
    }

    // Calcula totais para auditoria
    const totalPecas = Number(existing.header?.totalPecas || 0) || reversedUnits;
    const totalValor = Number(existing.header?.totalGeral || existing.header?.totalLiquido || 0);

    // Grava log de auditoria no SQLite
    try {
      const deletionAuditRepo = require('../repositories/deletionAuditRepository');
      await deletionAuditRepo.create({
        orderId: existing.header?.id || id,
        numeroPedido: existing.header?.numeroPedido || id,
        tipoPedido: isTransfer ? 'transferencia_cd' : 'compra_fornecedor',
        fornecedor: existing.header?.fornecedor || (isTransfer ? 'Depósito Central Matriz' : ''),
        solicitadoPorNome: currentUser?.nome || 'Operador do Sistema',
        solicitadoPorEmail: currentUser?.email || '',
        autorizadoPorNome: authorizingDirector?.nome || 'Diretoria',
        autorizadoPorEmail: authorizingDirector?.email || '',
        motivo: (reason || '').trim() || 'Cancelamento autorizado pela Diretoria',
        totalPecasEstornadas: reversedUnits || totalPecas,
        totalValor: totalValor,
        snapshotJson: existing,
        dataExclusao: new Date().toISOString()
      });
    } catch (auditErr) {
      console.error('Erro ao gravar log de auditoria no SQLite:', auditErr);
    }

    await orderRepository.delete(id);

    // Remove lançamentos financeiros vinculados ao pedido
    try {
      const financialRepo = require('../repositories/financialRepository');
      await financialRepo.deleteByOrderId(id);
    } catch (finErr) {
      console.error('Erro ao remover lançamentos financeiros do pedido:', finErr);
    }

    return { 
      success: true, 
      message: isTransfer 
        ? `Romaneio ${existing.header.numeroPedido} excluído! ${reversedUnits} unidades creditadas de volta no Estoque Central.`
        : `Pedido ${existing.header.numeroPedido} excluído com sucesso.`,
      isTransfer,
      reversedUnits,
      autorizadoPor: authorizingDirector?.nome
    };
  }

  async duplicateOrder(id) {
    const duplicated = await orderRepository.duplicate(id);
    return {
      success: true,
      message: `Pedido duplicado com sucesso: ${duplicated.header.numeroPedido}`,
      order: duplicated
    };
  }

  async getNextOrderNumber() {
    return await orderRepository.getNextNumeroPedido();
  }

  async checkNumeroAvailable(numeroPedido, excludeId = null) {
    if (!numeroPedido) return { available: false, message: 'Número é obrigatório.' };
    const num = String(numeroPedido).trim();
    const existing = await orderRepository.findByNumero(num);
    if (existing && existing.header.id !== excludeId) {
      return {
        available: false,
        conflictId: existing.header.id,
        conflictFornecedor: existing.header.fornecedor,
        message: `O número "${num}" já está em uso pelo pedido do fornecedor "${existing.header.fornecedor}".`
      };
    }
    return { available: true, message: `O número "${num}" está disponível.` };
  }
}

module.exports = new OrderService();
