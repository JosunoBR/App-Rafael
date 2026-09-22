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

  async saveOrder(orderData, currentUser) {
    if (!orderData || !orderData.header || !orderData.header.numeroPedido) {
      const err = new Error('Dados do pedido inválidos: número do pedido é obrigatório.');
      err.statusCode = 400;
      throw err;
    }

    // Validação de Permissão: Pedidos fechados / em esteira
    const currentId = orderData.header.id;
    if (currentId) {
      const existing = await orderRepository.findById(currentId);
      if (existing && existing.header) {
        const existingStatus = existing.header.status || 'Em Cotação';
        const isClosed = existingStatus !== 'Em Cotação' && existingStatus !== 'Rascunho';
        if (isClosed && currentUser) {
          // Comprador: bloqueia alteração em pedido fechado com aviso amigável
          if (currentUser.role === 'comprador') {
            const err = new Error(`Este pedido já foi aprovado e está na esteira operacional (${existingStatus}). Para efetuar alterações comerciais ou de quantidades, solicite a liberação à Diretoria.`);
            err.statusCode = 403;
            err.code = 'ORDER_LOCKED';
            throw err;
          }
          // Operadores de Depósito e Separação podem atualizar campos operacionais (separação/conferência)
          // Demais perfis que não sejam diretoria nem operacionais são bloqueados
          if (currentUser.role !== 'diretoria' && currentUser.role !== 'separacao' && currentUser.role !== 'deposito') {
            const err = new Error(`Apenas a Diretoria possui autorização para editar pedidos que já foram fechados (Status atual: ${existingStatus}).`);
            err.statusCode = 403;
            err.code = 'ORDER_LOCKED';
            throw err;
          }
        }
      }
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

  /**
   * Confirma o recebimento físico de um pedido na Matriz (entrega do fornecedor).
   * Permitido para: diretoria, comprador, deposito. Bloqueado para: separacao.
   */
  async confirmReceipt(orderId, { dataRecebimento, recebidoPor, numeroNotaFiscal, autorizarBoletos }, currentUser) {
    const allowedRoles = ['diretoria', 'comprador', 'deposito'];
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      const err = new Error('Apenas Diretoria, Comprador ou Depósito podem confirmar o recebimento na Matriz.');
      err.statusCode = 403;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    // Atualizar campos de recebimento no cabeçalho
    order.header.recebidoMatriz = true;
    order.header.dataRecebimentoMatriz = dataRecebimento || new Date().toISOString().split('T')[0];
    order.header.recebidoPor = recebidoPor || currentUser.nome || 'Operador';
    order.header.numeroNotaFiscal = numeroNotaFiscal || order.header.numeroNotaFiscal || '';
    order.header.updatedAt = new Date().toISOString();

    // Recalcular as datas de vencimento das parcelas a partir da data de recebimento na Matriz
    const dataRecebimentoEfetiva = order.header.dataRecebimentoMatriz;
    if (dataRecebimentoEfetiva && Array.isArray(order.installments) && order.installments.length > 0) {
      const baseDt = new Date(`${dataRecebimentoEfetiva}T12:00:00Z`);
      order.installments = order.installments.map((inst, index) => {
        // Se a parcela já foi baixada como paga, preserva seus dados
        if (inst.status === 'Pago') return inst;

        let offsetDays = Number(inst.dias);
        if (isNaN(offsetDays) || offsetDays <= 0) {
          if (inst.vencimento && (order.header.dataPedido || order.header.previsaoEntrega)) {
            const originalBase = new Date(`${order.header.previsaoEntrega || order.header.dataPedido}T12:00:00Z`);
            const originalDue = new Date(`${inst.vencimento}T12:00:00Z`);
            const diff = Math.round((originalDue.getTime() - originalBase.getTime()) / (1000 * 60 * 60 * 24));
            if (diff > 0) offsetDays = diff;
          }
        }
        if (isNaN(offsetDays) || offsetDays <= 0) {
          offsetDays = (index + 1) * 30;
        }

        const newDue = new Date(baseDt.getTime() + offsetDays * 24 * 60 * 60 * 1000);
        const y = newDue.getUTCFullYear();
        const m = String(newDue.getUTCMonth() + 1).padStart(2, '0');
        const d = String(newDue.getUTCDate()).padStart(2, '0');
        const newDueIso = `${y}-${m}-${d}`;

        return {
          ...inst,
          vencimento: newDueIso,
          dataVencimento: newDueIso,
          dias: offsetDays,
          status: 'Previsto' // Conforme diretriz Mega 12: permanece Previsto até efetivo pagamento
        };
      });
    }

    const saved = await orderRepository.save(order);

    // Sincronizar com o financeiro (só vai efetivamente criar títulos se recebido + autorizado)
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved);
    } catch (finErr) {
      console.error('Erro ao sincronizar recebimento com o financeiro:', finErr);
    }

    return {
      success: true,
      message: `Recebimento do pedido ${saved.header.numeroPedido} confirmado na Matriz!${autorizarBoletos && currentUser.role === 'diretoria' ? ' Boletos liberados para o Financeiro.' : ''}`,
      order: saved
    };
  }

  /**
   * Autoriza a liberação dos boletos de um pedido para o Contas a Pagar (Financeiro).
   * Restrito estritamente à Diretoria (RBAC).
   */
  async authorizeFinancialRelease(orderId, currentUser) {
    if (!currentUser || currentUser.role !== 'diretoria') {
      const err = new Error('Apenas a Diretoria pode autorizar a liberação de boletos para o Financeiro.');
      err.statusCode = 403;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    if (!order.header.recebidoMatriz) {
      const err = new Error('O pedido precisa estar fisicamente recebido na Matriz antes de liberar os boletos.');
      err.statusCode = 400;
      throw err;
    }

    // Marcar como autorizado
    order.header.boletosLiberados = true;
    order.header.boletosLiberadosPor = currentUser.nome || 'Diretoria';
    order.header.boletosLiberadosEm = new Date().toISOString();
    order.header.updatedAt = new Date().toISOString();

    const saved = await orderRepository.save(order);

    // Sincronizar com o financeiro — agora recebido + autorizado, os títulos serão criados
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved);
    } catch (finErr) {
      console.error('Erro ao sincronizar boletos autorizados com o financeiro:', finErr);
    }

    return {
      success: true,
      message: `Boletos do pedido ${saved.header.numeroPedido} liberados para o Contas a Pagar!`,
      order: saved
    };
  }
}

module.exports = new OrderService();
