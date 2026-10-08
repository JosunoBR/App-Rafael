const orderRepository = require('../repositories/orderRepository');
const fiscalRepository = require('../repositories/fiscalRepository');
const distributionAuditRepo = require('../repositories/distributionAuditRepository');
const stockRepository = require('../repositories/stockRepository');
const { getDatabase, scheduleDatabaseSave } = require('../config/database');

class OrderService {
  async listOrders(currentUser) {
    const orders = await orderRepository.findAll();
    const role = String(currentUser?.role || '').toLowerCase();
    if (role === 'separacao' || role === 'conferente') {
      return orders.filter(order => order.header?.status === 'Em Separação');
    }
    return orders;
  }

  async getOrder(id, currentUser) {
    const order = await orderRepository.findById(id);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    const role = String(currentUser?.role || '').toLowerCase();
    if ((role === 'separacao' || role === 'conferente') && order.header?.status !== 'Em Separação') {
      const err = new Error('Pedido não disponível para separação.');
      err.statusCode = 403;
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
    let isEditingClosed = false;
    const currentId = orderData.header.id;
    const existingForAuthorization = currentId ? await orderRepository.findById(currentId) : null;
    const role = currentUser?.role;
    const isUnrestricted = currentUser && (
      role === 'diretoria' || role === 'root' || currentUser.id === 'usr_root' ||
      currentUser.email?.toLowerCase() === 'root' || currentUser.nome?.toLowerCase() === 'root'
    );
    const hasOperationPermission = (code, defaultRoles) => {
      if (isUnrestricted) return true;
      if (!currentUser) return false;
      if (currentUser.permissions?.[code] === false) return false;
      if (currentUser.permissions?.[code] === true) return true;
      return defaultRoles.includes(role);
    };

    const existingStatusForAuthorization = existingForAuthorization?.header?.status || null;
    const isExistingClosed = Boolean(
      existingForAuthorization &&
      existingStatusForAuthorization !== 'Em Cotação' &&
      existingStatusForAuthorization !== 'Rascunho'
    );
    const permissionCode = isExistingClosed
      ? 'orders:edit_closed'
      : existingForAuthorization
        ? 'orders:edit_draft'
        : 'orders:create';
    const defaultRoles = isExistingClosed ? ['comprador', 'faturamento'] : ['comprador'];

    if (!hasOperationPermission(permissionCode, defaultRoles)) {
      const err = new Error(`Seu perfil (${role || 'não identificado'}) não possui a permissão "${permissionCode}" para salvar este pedido.`);
      err.statusCode = 403;
      err.code = 'ORDER_SAVE_FORBIDDEN';
      throw err;
    }

    if (currentId) {
      const existing = existingForAuthorization;
      if (existing && existing.header) {
        const existingStatus = existing.header.status || 'Em Cotação';
        const isClosed = existingStatus !== 'Em Cotação' && existingStatus !== 'Rascunho';
        isEditingClosed = isClosed;
        if (isClosed && currentUser) {
          const isDiretoriaOrRoot = currentUser.role === 'diretoria' || 
                                    currentUser.role === 'root' || 
                                    currentUser.id === 'usr_root' || 
                                    currentUser.email?.toLowerCase() === 'root' ||
                                    currentUser.nome?.toLowerCase() === 'root';

          const hasEditClosedPermission = currentUser.permissions && currentUser.permissions['orders:edit_closed'] === true;
          const isDeniedEditClosed = currentUser.permissions && currentUser.permissions['orders:edit_closed'] === false;

          // Comprador é autorizado na esteira a menos que expressamente negado nas permissões granulares
          const isCompradorAllowed = currentUser.role === 'comprador' && !isDeniedEditClosed;

          const isAuthorized = isDiretoriaOrRoot || 
                               currentUser.role === 'faturamento' || 
                               isCompradorAllowed ||
                               (hasEditClosedPermission && !isDeniedEditClosed);

          if (!isAuthorized) {
            const err = new Error(`Seu perfil (${currentUser.role}) não possui autorização para alterar pedidos já fechados/aprovados na esteira.`);
            err.statusCode = 403;
            err.code = 'ORDER_CLOSED_FORBIDDEN';
            throw err;
          }

          // Boletos já liberados no Financeiro: Apenas Diretoria e Faturamento podem alterar
          if (existing.header.boletosLiberados && !isDiretoriaOrRoot && currentUser.role !== 'faturamento') {
            const err = new Error('Os boletos deste pedido já foram liberados para o Financeiro. Alterações são restritas à Diretoria e Faturamento.');
            err.statusCode = 403;
            err.code = 'ORDER_LOCKED';
            throw err;
          }
        }

        // 🛡️ PROTEÇÃO CONTRA REGRESSÃO ACIDENTAL DE ETAPAS DA ESTEIRA:
        // Edições normais de campos não devem retroceder o status de um pedido que já avançou na esteira.
        const PIPELINE_LEVELS = {
          'Rascunho': 0,
          'Em Cotação': 1,
          'Aprovado': 2,
          'Em Distribuição': 2.5,
          'Em Separação': 3,
          'Faturamento': 4,
          'Finalizado': 5
        };

        const existingLevel = PIPELINE_LEVELS[existing.header.status] || 0;
        const incomingLevel = PIPELINE_LEVELS[orderData.header.status] || 0;

        if (existingLevel > incomingLevel) {
          console.warn(`[Pipeline Protection] Prevenindo regressão acidental de status para ${orderData.header.numeroPedido}: ${existing.header.status} -> ${orderData.header.status}. Mantendo ${existing.header.status}.`);
          orderData.header.status = existing.header.status;
        }

        // Preservação de marcos operacionais e liberação de boletos
        if (existing.header.boletosLiberados && !orderData.header.boletosLiberados) {
          orderData.header.boletosLiberados = existing.header.boletosLiberados;
          orderData.header.boletosLiberadosPor = existing.header.boletosLiberadosPor || orderData.header.boletosLiberadosPor;
          orderData.header.boletosLiberadosEm = existing.header.boletosLiberadosEm || orderData.header.boletosLiberadosEm;
        }

        if (existing.header.recebidoMatriz && !orderData.header.recebidoMatriz) {
          orderData.header.recebidoMatriz = existing.header.recebidoMatriz;
          orderData.header.dataRecebimentoMatriz = existing.header.dataRecebimentoMatriz || orderData.header.dataRecebimentoMatriz;
          orderData.header.recebidoPor = existing.header.recebidoPor || orderData.header.recebidoPor;
          orderData.header.numeroNotaFiscal = existing.header.numeroNotaFiscal || orderData.header.numeroNotaFiscal;
        }

        if (existing.header.distribuicaoConcluida && !orderData.header.distribuicaoConcluida) {
          orderData.header.distribuicaoConcluida = existing.header.distribuicaoConcluida;
          orderData.header.distribuidoPor = existing.header.distribuidoPor || orderData.header.distribuidoPor;
          orderData.header.dataDistribuicao = existing.header.dataDistribuicao || orderData.header.dataDistribuicao;
        }

        if (existing.header.separacaoConcluida && !orderData.header.separacaoConcluida) {
          orderData.header.separacaoConcluida = existing.header.separacaoConcluida;
          orderData.header.separadoPor = existing.header.separadoPor || orderData.header.separadoPor;
          orderData.header.dataSeparacao = existing.header.dataSeparacao || orderData.header.dataSeparacao;
        }

        if (existing.header.finalizadoPor && !orderData.header.finalizadoPor) {
          orderData.header.finalizadoPor = existing.header.finalizadoPor;
          orderData.header.dataFinalizacao = existing.header.dataFinalizacao || orderData.header.dataFinalizacao;
        }
      }
    }

    // Validação de integridade financeira antes de salvar
    this._validateInstallmentsIntegrity(orderData);

    const saved = await orderRepository.save(orderData);

    // Auditoria de governança para alterações em pedidos fechados/em esteira
    if (isEditingClosed && currentUser) {
      await distributionAuditRepo.create({
        orderId: saved.header.id,
        numeroPedido: saved.header.numeroPedido,
        fornecedor: saved.header.fornecedor,
        usuarioId: currentUser.id || null,
        usuarioNome: currentUser.nome || currentUser.email || 'Usuário',
        usuarioRole: currentUser.role,
        acao: 'EDICAO_PEDIDO_FECHADO',
        observacoes: `Alteração salva no pedido fechado/em esteira (${saved.header.status}) por ${currentUser.nome || currentUser.email || 'Usuário'} (${currentUser.role}).`
      }).catch(e => console.error('Erro ao registrar log de auditoria de alteração:', e));
    }

    // Sincronização automática em tempo real com o Financeiro / Contas a Pagar
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved);
    } catch (finErr) {
      console.error('Erro ao sincronizar pedido com o financeiro:', finErr);
    }

    return {
      success: true,
      message: saved._numberReassigned 
        ? `Concorrência prevenida: O número ${saved._originalNumber} já havia sido ocupado. Pedido salvo com sucesso como ${saved.header.numeroPedido}!`
        : `Pedido ${saved.header.numeroPedido} salvo com sucesso no sistema!`,
      order: saved,
      numberReassigned: Boolean(saved._numberReassigned),
      originalNumber: saved._originalNumber,
      newNumber: saved.header.numeroPedido
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

    // 🛡️ TRAVA DE SEGURANÇA FISCAL & AUDITORIA:
    // Nunca permitir exclusão de pedido que possua qualquer movimentação financeira baixada/paga ou comprovante anexado
    const financialRepo = require('../repositories/financialRepository');
    const finEntries = await financialRepo.findByOrderId(id);
    const hasPaidFinancial = finEntries.some(e => String(e.status).toLowerCase() === 'pago' || Number(e.valorPago) > 0 || Boolean(e.comprovanteArquivo));
    const hasPaidInstallment = Array.isArray(existing.installments) && existing.installments.some(i => String(i.status).toLowerCase() === 'pago');

    if (hasPaidFinancial || hasPaidInstallment) {
      const err = new Error('Não é possível excluir o pedido: existem parcelas/boletos já quitados no financeiro (Contas a Pagar). É proibido por governança fiscal e auditoria excluir pedidos com movimentação financeira liquidada.');
      err.statusCode = 400;
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
   * Reprograma com segurança a data de entrega prevista do pedido.
   * Recalcula proporcionalmente os vencimentos das parcelas em aberto caso solicitado,
   * preservando 100% das parcelas já baixadas/pagas (Governança e Integridade Financeira).
   */
  async rescheduleDelivery(orderId, { novaDataEntregaPrevista, ajustarBoletos = true, motivo = '' }, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    if (!novaDataEntregaPrevista) {
      const err = new Error('Nova data de previsão de entrega é obrigatória.');
      err.statusCode = 400;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    // Não permite reprogramar data se o recebimento físico já foi confirmado na Matriz
    if (order.header.recebidoMatriz) {
      const err = new Error('Não é possível alterar a previsão de entrega de um pedido que já teve o recebimento físico confirmado na Matriz.');
      err.statusCode = 400;
      throw err;
    }

    const dataAntiga = order.header.dataEntregaPrevista || order.header.dataPedido || '';

    const parseFlexible = (val) => {
      if (!val) return null;
      const s = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.split('T')[0] + 'T12:00:00Z');
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split('/');
        return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const dtAntiga = parseFlexible(dataAntiga);
    const dtNova = parseFlexible(novaDataEntregaPrevista);
    if (!dtNova) {
      const err = new Error('Formato de nova data de entrega inválido. Utilize AAAA-MM-DD ou DD/MM/AAAA.');
      err.statusCode = 400;
      throw err;
    }

    const y = dtNova.getUTCFullYear();
    const m = String(dtNova.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dtNova.getUTCDate()).padStart(2, '0');
    const novaIso = `${y}-${m}-${d}`;

    let diffDays = 0;
    if (dtAntiga) {
      diffDays = Math.round((dtNova.getTime() - dtAntiga.getTime()) / (1000 * 60 * 60 * 24));
    }

    let boletosAjustados = 0;
    let boletosPreservados = 0;

    if (ajustarBoletos && diffDays !== 0 && Array.isArray(order.installments) && order.installments.length > 0) {
      order.installments = order.installments.map(inst => {
        const isPaid = String(inst.status || '').toLowerCase() === 'pago' || !!inst.dataPagamento;
        if (isPaid) {
          boletosPreservados++;
          return inst;
        }

        boletosAjustados++;
        const currentDue = parseFlexible(inst.dataVencimento || inst.vencimento);
        if (currentDue) {
          const shifted = new Date(currentDue.getTime() + diffDays * 24 * 60 * 60 * 1000);
          const sy = shifted.getUTCFullYear();
          const sm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
          const sd = String(shifted.getUTCDate()).padStart(2, '0');
          const shiftedIso = `${sy}-${sm}-${sd}`;
          return {
            ...inst,
            dataVencimento: shiftedIso,
            vencimento: shiftedIso,
            updatedAt: new Date().toISOString()
          };
        }
        return inst;
      });
    }

    // Histórico auditável de reprogramação
    const historyEntry = {
      previousDate: dataAntiga,
      newDate: novaIso,
      rescheduledAt: new Date().toISOString(),
      reason: motivo || 'Reprogramação manual da entrega',
      rescheduledBy: currentUser.nome || currentUser.username || 'Comprador',
      diffDays,
      adjustedInstallments: boletosAjustados
    };

    order.header.dataEntregaPrevista = novaIso;
    order.header.deliveryRescheduleHistory = [
      ...(order.header.deliveryRescheduleHistory || []),
      historyEntry
    ];
    order.header.updatedAt = new Date().toISOString();

    const saved = await orderRepository.save(order);

    // Auditoria de governança
    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      usuarioId: currentUser.id,
      usuarioNome: currentUser.nome || currentUser.username || 'Comprador',
      acao: 'REPROGRAMAR_ENTREGA',
      detalhes: JSON.stringify({
        dataAntiga,
        novaData: novaIso,
        diffDays,
        motivo,
        boletosAjustados,
        boletosPreservados
      })
    }).catch(e => console.error('Erro ao registrar log de auditoria de reprogramação:', e));

    // Sincronizar com o módulo financeiro (SQLite)
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved);
    } catch (finErr) {
      console.error('Erro ao sincronizar reprogramação com o financeiro:', finErr);
    }

    return {
      success: true,
      message: `Previsão de entrega do pedido ${saved.header.numeroPedido} reprogramada para ${novaIso} (${diffDays >= 0 ? '+' : ''}${diffDays} dias). ${boletosAjustados} boletos em aberto atualizados.`,
      order: saved,
      diffDays,
      boletosAjustados,
      boletosPreservados
    };
  }

  /**
   * Confirma o recebimento físico de um pedido na Matriz (entrega do fornecedor).
   * Permitido para: diretoria, comprador, deposito. Bloqueado para: separacao.
   */
  async confirmReceipt(orderId, { dataRecebimento, recebidoPor, numeroNotaFiscal, autorizarBoletos }, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    // Validação de Regra de Negócio: Não pode confirmar recebimento em Cotação ou Aprovado
    const currentStatus = order.header.status || 'Em Cotação';
    if (currentStatus === 'Em Cotação' || currentStatus === 'Rascunho' || currentStatus === 'Aprovado') {
      const err = new Error(`Não é permitido confirmar o recebimento de pedidos no status "${currentStatus}". O pedido deve estar em Distribuição, Separação ou Faturamento.`);
      err.statusCode = 400;
      throw err;
    }

    // Atualizar campos de recebimento no cabeçalho
    order.header.recebidoMatriz = true;
    order.header.dataRecebimentoMatriz = dataRecebimento || new Date().toISOString().split('T')[0];
    order.header.recebidoPor = recebidoPor || currentUser.nome || 'Operador';
    order.header.numeroNotaFiscal = numeroNotaFiscal || order.header.numeroNotaFiscal || '';
    order.header.updatedAt = new Date().toISOString();

    const receiptRole = String(currentUser.role || '').toLowerCase();
    const canAuthorizeWithReceipt = ['diretoria', 'root', 'admin'].includes(receiptRole);
    if (autorizarBoletos === true && canAuthorizeWithReceipt) {
      order.header.boletosLiberados = true;
      order.header.boletosLiberadosPor = currentUser.nome || 'Diretoria';
      order.header.boletosLiberadosEm = new Date().toISOString();
    }

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
      message: `Recebimento do pedido ${saved.header.numeroPedido} confirmado na Matriz!${autorizarBoletos && canAuthorizeWithReceipt ? ' Boletos liberados para o Financeiro.' : ''}`,
      order: saved
    };
  }

  /**
   * Envia o pedido aprovado para a Distribuição entre as lojas.
   * Permitido: diretoria, comprador, deposito
   */
  async sendToDistribution(orderId, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    order.header.status = 'Em Distribuição';
    order.header.updatedAt = new Date().toISOString();

    const saved = await orderRepository.save(order);

    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Operador',
      usuarioRole: currentUser.role,
      acao: 'ENVIO_DISTRIBUICAO',
      observacoes: 'Pedido enviado para a esteira de Distribuição entre as lojas'
    }).catch(e => console.error('Erro ao registrar log de auditoria:', e));

    return {
      success: true,
      message: `Pedido ${saved.header.numeroPedido} enviado para Distribuição com sucesso!`,
      order: saved
    };
  }

  /**
   * Conclui a distribuição física entre as 20 lojas e libera o pedido para o perfil Separação.
   * Permitido: comprador, deposito, diretoria
   */
  async releaseToSeparation(orderId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const validReleaseStatuses = ['Aprovado', 'Em Distribuição'];
    if (!validReleaseStatuses.includes(order.header.status) || order.header.distribuicaoConcluida) {
      const err = new Error(`O pedido não pode ser liberado para separação no status "${order.header.status}". Atualize a lista antes de tentar novamente.`);
      err.statusCode = 409;
      err.code = 'INVALID_PIPELINE_STATE';
      throw err;
    }

    // Calcular estatísticas de lojas afetadas e peças totais
    let totalPecas = 0;
    const lojasSet = new Set();
    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        const grade = item.grade || item.separacaoLojas || item.gradeDistribucao || {};
        if (grade && typeof grade === 'object') {
          Object.entries(grade).forEach(([loja, q]) => {
            const qtd = Number(q) || 0;
            if (qtd > 0) {
              lojasSet.add(loja);
              totalPecas += qtd;
            }
          });
        }
      });
    }

    const db = await getDatabase();
    let saved;
    let totalPecasEstoqueEntrada = 0;
    db.run('BEGIN TRANSACTION');
    try {
      const currentStock = await stockRepository.findAll();
      for (const item of order.items || []) {
        const qtdEntrada = Number(item.qtdReservaEstoque || 0);
        if (qtdEntrada <= 0 || !String(item.descricao || '').trim()) continue;

        const normalizedCode = String(item.codigo || item.codigoInterno || '').trim().toLowerCase();
        const normalizedDescription = String(item.descricao || '').trim().toLowerCase();
        const existingStock = currentStock.find(stock =>
          (item.id && stock.productId === item.id) ||
          (normalizedCode && [stock.codigo, stock.codigoInterno].some(value => String(value || '').trim().toLowerCase() === normalizedCode)) ||
          String(stock.descricao || '').trim().toLowerCase() === normalizedDescription
        );

        if (existingStock) {
          await stockRepository.updateBalance(existingStock.id, qtdEntrada);
          existingStock.saldoUnidades = Number(existingStock.saldoUnidades || 0) + qtdEntrada;
        } else {
          const now = new Date().toISOString();
          const newStockItem = {
            id: `stock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            productId: item.id || null,
            codigoInterno: item.codigoInterno || item.codigo || '',
            codigoFornecedor: item.codigoFornecedor || '',
            codigoBarras: item.codigoBarras || item.eanBarcode || '',
            codigo: item.codigo || item.codigoInterno || '',
            descricao: String(item.descricao).trim(),
            categoria: 'Geral',
            fotoUrl: item.fotoUrl || '',
            saldoUnidades: qtdEntrada,
            precoUnitario: Number(item.precoUnitario || 0),
            pdvSugerido: Number(item.pdvAlvo || 0),
            localizacaoGalpao: `Entrada Pedido ${order.header.numeroPedido}`,
            fornecedorOrigem: order.header.fornecedor || '',
            dataUltimaEntrada: now.slice(0, 10),
            createdAt: now,
            updatedAt: now
          };
          await stockRepository.save(newStockItem);
          currentStock.push(newStockItem);
        }
        totalPecasEstoqueEntrada += qtdEntrada;
      }

      order.header.status = 'Em Separação';
      order.header.distribuicaoConcluida = true;
      order.header.distribuidoPor = currentUser.nome || 'Depósito';
      order.header.dataDistribuicao = new Date().toISOString();
      order.header.updatedAt = new Date().toISOString();
      if (payload.observacoes) order.header.observacaoDistribuicao = payload.observacoes;

      saved = await orderRepository.save(order);
      db.run('COMMIT');
      scheduleDatabaseSave(0);
    } catch (error) {
      try { db.run('ROLLBACK'); } catch (_) { /* transação já encerrada */ }
      throw error;
    }

    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Depósito',
      usuarioRole: currentUser.role,
      acao: 'LIBERADO_SEPARACAO',
      lojasAfetadasJson: Array.from(lojasSet),
      totalPecasDistribuidas: totalPecas,
      observacoes: payload.observacoes || 'Distribuição concluída entre as lojas e liberada para o perfil Separação'
    }).catch(e => console.error('Erro ao registrar log de auditoria:', e));

    return {
      success: true,
      message: `Distribuição concluída! Pedido ${saved.header.numeroPedido} liberado para a equipe de Separação.${totalPecasEstoqueEntrada > 0 ? ` Entrada de ${totalPecasEstoqueEntrada} unidade(s) registrada no estoque.` : ''}`,
      order: saved,
      totalPecasEstoqueEntrada
    };
  }

  /**
   * Obtém o estado de separação/doca leve para web e mobile.
   */
  async getSeparationState(orderId, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const state = await orderRepository.getSeparationState(orderId);
    if (!state) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    const role = String(currentUser?.role || '').toLowerCase();
    if ((role === 'separacao' || role === 'conferente') && state.status !== 'Em Separação') {
      const err = new Error('Pedido não disponível para separação.');
      err.statusCode = 403;
      throw err;
    }
    return state;
  }

  /**
   * Atualização atômica de check de separação por loja e item com concorrência otimista.
   */
  async updateSeparationCheck(orderId, storeId, itemId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role?.toLowerCase();
    const isAuthorized = role === 'comprador' || role === 'separacao' || role === 'deposito' || role === 'diretoria' || role === 'root' || role === 'admin';
    if (!isAuthorized) {
      const err = new Error('Perfil não autorizado a conferir itens de separação.');
      err.statusCode = 403;
      throw err;
    }

    if (typeof payload.conferido !== 'boolean') {
      const err = new Error('Campo "conferido" (boolean) é obrigatório.');
      err.statusCode = 400;
      throw err;
    }

    return await orderRepository.updateSeparationCheck(
      orderId,
      storeId,
      itemId,
      { conferido: payload.conferido },
      currentUser,
      payload.expectedVersion
    );
  }

  /**
   * Registro atômico de avaria durante a separação/doca.
   */
  async addSeparationDamage(orderId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role?.toLowerCase();
    const isAuthorized = role === 'comprador' || role === 'separacao' || role === 'deposito' || role === 'diretoria' || role === 'root' || role === 'admin';
    if (!isAuthorized) {
      const err = new Error('Perfil não autorizado a registrar avarias.');
      err.statusCode = 403;
      throw err;
    }

    if (!payload.itemId) {
      const err = new Error('Identificador do item (itemId) é obrigatório.');
      err.statusCode = 400;
      throw err;
    }

    const qtd = Number(payload.quantidade || payload.quantidadeUnidades || 0);
    if (isNaN(qtd) || qtd <= 0) {
      const err = new Error('Quantidade avariada deve ser maior que zero.');
      err.statusCode = 400;
      throw err;
    }

    return await orderRepository.addSeparationDamage(
      orderId,
      payload,
      currentUser,
      payload.expectedVersion
    );
  }

  /**
   * Exclusão atômica de registro de avaria.
   */
  async deleteSeparationDamage(orderId, damageId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role?.toLowerCase();
    const isAuthorized = role === 'comprador' || role === 'separacao' || role === 'deposito' || role === 'diretoria' || role === 'root' || role === 'admin';
    if (!isAuthorized) {
      const err = new Error('Perfil não autorizado a excluir avarias.');
      err.statusCode = 403;
      throw err;
    }

    return await orderRepository.deleteSeparationDamage(
      orderId,
      damageId,
      currentUser,
      payload?.expectedVersion
    );
  }

  /**
   * Conclui a conferência física/apontamento de avarias e encaminha o pedido para o Faturamento.
   * Permitido: comprador, separacao, deposito, diretoria, root, admin
   */
  async sendToFaturamento(orderId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role?.toLowerCase();
    const isAuthorized = role === 'comprador' || role === 'separacao' || role === 'deposito' || role === 'diretoria' || role === 'root' || role === 'admin';
    if (!isAuthorized) {
      const err = new Error('Perfil não autorizado a encaminhar pedidos para faturamento.');
      err.statusCode = 403;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    // Validação de concorrência otimista (se enviada)
    if (payload.expectedVersion !== undefined && payload.expectedVersion !== null) {
      const currentVersion = Number(order.header.version || 1);
      const expected = Number(payload.expectedVersion);
      if (currentVersion !== expected) {
        const err = new Error(`Conflito de concorrência: o pedido foi alterado por outro usuário (versão ${currentVersion} vs esperada ${expected}). Atualize os dados antes de prosseguir.`);
        err.statusCode = 409;
        err.code = 'CONCURRENCY_CONFLICT';
        throw err;
      }
    }

    const currentStatus = order.header?.status || 'Em Cotação';
    const validStatuses = ['Em Separação'];
    if (!validStatuses.includes(currentStatus)) {
      const err = new Error(`Não é possível encaminhar para o Faturamento um pedido com status "${currentStatus}". O pedido deve estar em Separação.`);
      err.statusCode = 400;
      throw err;
    }

    const isTransfer = order.header?.supplierId === 'cd_matriz' || 
                       String(order.header?.numeroPedido || '').startsWith('CD-') || 
                       (order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));

    if (!isTransfer && !order.header.recebidoMatriz) {
      const err = new Error('É obrigatório confirmar o recebimento físico da mercadoria na Matriz antes de encaminhar para o Faturamento. A confirmação deve ser solicitada e registrada.');
      err.statusCode = 400;
      err.code = 'RECEIPT_REQUIRED';
      throw err;
    }

    // Trava de 100% conferido (todas as lojas com itens alocados devem estar conferidas)
    const isDiretoriaOrRoot = role === 'diretoria' || role === 'root' || role === 'admin';
    const conferenciaLojas = order.inspection?.conferenciaLojas || {};
    let missingChecks = 0;
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach(item => {
      if (item.ruptura) return;
      const grade = item.grade || {};
      Object.keys(grade).forEach(storeId => {
        const qtdAlocada = Number(grade[storeId] || 0);
        if (qtdAlocada > 0) {
          const checkKey = `${storeId}_${item.id}`;
          const isConferido = (conferenciaLojas[checkKey] && conferenciaLojas[checkKey].conferido === true) ||
                              (item.checks && item.checks[storeId] && item.checks[storeId].conferido === true);
          if (!isConferido) {
            missingChecks++;
          }
        }
      });
    });

    if (missingChecks > 0 && !(isDiretoriaOrRoot && payload.forceIncomplete === true)) {
      const err = new Error(`Não é possível encaminhar para o Faturamento: existem ${missingChecks} alocações de lojas pendentes de conferência. Conclua 100% da separação ou solicite liberação pela Diretoria.`);
      err.statusCode = 400;
      err.code = 'INCOMPLETE_SEPARATION';
      throw err;
    }

    const db = await getDatabase();
    let saved;
    db.run('BEGIN TRANSACTION');
    try {
      // Transferências internas entram na separação a partir do estoque da Matriz.
      // A baixa e a mudança de etapa precisam ser uma única operação para impedir saldo duplicado em retentativas.
      if (isTransfer) {
        const currentStock = await stockRepository.findAll();
        for (const item of items) {
          if (item.ruptura) continue;
          const quantidade = Number(item.qtdTotalUnidades || 0);
          if (quantidade <= 0) continue;
          const code = String(item.codigo || item.codigoInterno || '').trim().toLowerCase();
          const description = String(item.descricao || '').trim().toLowerCase();
          const stockItem = currentStock.find(stock =>
            (item.id && stock.productId === item.id) ||
            (code && [stock.codigo, stock.codigoInterno].some(value => String(value || '').trim().toLowerCase() === code)) ||
            String(stock.descricao || '').trim().toLowerCase() === description
          );
          if (!stockItem || Number(stockItem.saldoUnidades || 0) < quantidade) {
            const err = new Error(`Saldo insuficiente no estoque da Matriz para "${item.descricao}". Disponível: ${Number(stockItem?.saldoUnidades || 0)}, necessário: ${quantidade}.`);
            err.statusCode = 409;
            err.code = 'INSUFFICIENT_STOCK';
            throw err;
          }
          await stockRepository.updateBalance(stockItem.id, -quantidade);
          stockItem.saldoUnidades = Number(stockItem.saldoUnidades) - quantidade;
        }
      }

      order.header.status = 'Faturamento';
      order.header.separacaoConcluida = true;
      order.header.separadoPor = currentUser.nome || 'Conferente Separação';
      order.header.dataSeparacao = new Date().toISOString();
      order.header.updatedAt = new Date().toISOString();

      if (payload.avarias) order.header.avariasApontadas = payload.avarias;
      if (payload.observacoes) order.header.observacaoSeparacao = payload.observacoes;

      saved = await orderRepository.save(order);
      db.run('COMMIT');
      scheduleDatabaseSave(0);
    } catch (error) {
      try { db.run('ROLLBACK'); } catch (_) { /* transação já encerrada */ }
      throw error;
    }

    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Separação',
      usuarioRole: currentUser.role,
      acao: 'CONFERENCIA_SEPARACAO',
      detalhesJson: { 
        avarias: payload.avarias || [],
        missingChecks,
        forced: missingChecks > 0 && isDiretoriaOrRoot && payload.forceIncomplete === true
      },
      observacoes: payload.observacoes || 'Conferência física e separação concluídas, pedido encaminhado para Faturamento'
    }).catch(e => console.error('Erro ao registrar log de auditoria:', e));

    return {
      success: true,
      message: `Conferência concluída! Pedido ${saved.header.numeroPedido} encaminhado para Faturamento.`,
      order: saved,
      version: saved.header.version
    };
  }

  /**
   * Finaliza o pedido na esteira (boletos validados e conferência física concluída).
   * Permitido: faturamento, diretoria
   */
  async finalizeOrder(orderId, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    order.header.status = 'Finalizado';
    order.header.finalizadoPor = currentUser.nome || 'Faturamento';
    order.header.dataFinalizacao = new Date().toISOString();
    order.header.updatedAt = new Date().toISOString();

    const saved = await orderRepository.save(order);

    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Faturamento',
      usuarioRole: currentUser.role,
      acao: 'FINALIZACAO_PEDIDO',
      observacoes: 'Pedido finalizado com sucesso na esteira'
    }).catch(e => console.error('Erro ao registrar log de auditoria:', e));

    return {
      success: true,
      message: `Pedido ${saved.header.numeroPedido} finalizado com sucesso!`,
      order: saved
    };
  }

  /**
   * Autoriza a liberação dos boletos de um pedido para o Contas a Pagar (Financeiro).
   * Ao liberar boletos na Etapa 4, o pedido é finalizado.
   */
  async authorizeFinancialRelease(orderId, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role;
    if (role && role !== 'faturamento' && role !== 'diretoria' && role !== 'root' && role !== 'admin') {
      const err = new Error(`Perfil '${role}' não tem autorização para liberar boletos no faturamento.`);
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
      err.code = 'RECEIPT_REQUIRED';
      throw err;
    }

    // Marcar como autorizado e transicionar para Finalizado
    order.header.boletosLiberados = true;
    order.header.boletosLiberadosPor = currentUser.nome || 'Faturamento';
    order.header.boletosLiberadosEm = new Date().toISOString();
    order.header.status = 'Finalizado';
    order.header.finalizadoPor = currentUser.nome || 'Faturamento';
    order.header.dataFinalizacao = new Date().toISOString();
    order.header.updatedAt = new Date().toISOString();

    const saved = await orderRepository.save(order);

    // Sincronizar com o financeiro — agora recebido + autorizado, os títulos serão criados
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved);
    } catch (finErr) {
      console.error('Erro ao sincronizar boletos autorizados com o financeiro:', finErr);
    }

    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Faturamento',
      usuarioRole: currentUser.role,
      acao: 'LIBERACAO_BOLETO_FINALIZADO',
      observacoes: 'Boletos liberados no Contas a Pagar e pedido finalizado com sucesso na esteira'
    }).catch(e => console.error('Erro ao registrar log de auditoria:', e));

    return {
      success: true,
      message: `Boletos do pedido ${saved.header.numeroPedido} liberados e pedido finalizado com sucesso!`,
      order: saved
    };
  }

  /**
   * Retrocede o status de um pedido na esteira operacional.
   * Permitido para Diretoria e Compras (RBAC), com justificativa obrigatória e validações financeiras/estoque.
   */
  async rollbackOrderStatus(orderId, { targetStatus, reason } = {}, currentUser) {
    const isAuthorized = currentUser && (
      currentUser.role === 'diretoria' || 
      currentUser.role === 'comprador' || 
      currentUser.role === 'faturamento' || 
      currentUser.role === 'root' || 
      currentUser.id === 'usr_root' || 
      currentUser.email?.toLowerCase() === 'root' ||
      currentUser.nome?.toLowerCase() === 'root'
    );
    if (!isAuthorized) {
      const err = new Error('Apenas a Diretoria, Compras e Faturamento possuem autorização para retroceder o status de um pedido na esteira.');
      err.statusCode = 403;
      throw err;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      const err = new Error('É obrigatório informar uma justificativa detalhada com no mínimo 10 caracteres para o retrocesso.');
      err.statusCode = 400;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const currentStatus = order.header?.status || 'Em Cotação';
    const PIPELINE_ORDER = {
      'Em Cotação': 0,
      'Rascunho': 0,
      'Aprovado': 1,
      'Em Separação': 2,
      'Faturamento': 3,
      'Finalizado': 4
    };

    const currentRank = PIPELINE_ORDER[currentStatus] ?? -1;
    const targetRank = PIPELINE_ORDER[targetStatus] ?? -1;

    if (targetRank < 0) {
      const err = new Error(`Status de destino inválido: "${targetStatus}".`);
      err.statusCode = 400;
      throw err;
    }

    if (targetRank >= currentRank) {
      const err = new Error(`O status de destino ("${targetStatus}") deve ser anterior ao status atual ("${currentStatus}").`);
      err.statusCode = 400;
      throw err;
    }

    // Trava de Segurança Financeira: impedir se houver qualquer parcela paga
    const financialRepo = require('../repositories/financialRepository');
    const entries = await financialRepo.findByOrderId(orderId);
    const hasPaidFinancial = entries.some(e => String(e.status).toLowerCase() === 'pago');
    const hasPaidInstallment = Array.isArray(order.installments) && order.installments.some(i => String(i.status).toLowerCase() === 'pago');

    if (hasPaidFinancial || hasPaidInstallment) {
      const err = new Error('Não é possível retroceder o status do pedido: existem parcelas/boletos já quitados no financeiro. Cancele ou estorne a baixa no Contas a Pagar antes de retroceder.');
      err.statusCode = 400;
      throw err;
    }

    // Estorno de Estoque Central do CD se retroceder de Distribuição/Separação para Aprovado/Cotação
    if (order.header.distribuicaoConcluida && targetRank <= 1 && Array.isArray(order.items)) {
      try {
        const stockRepository = require('../repositories/stockRepository');
        const allStock = await stockRepository.findAll();
        for (const it of order.items) {
          const reserveQty = Number(it.qtdReservaEstoque || 0);
          if (reserveQty > 0) {
            const match = allStock.find(s =>
              (s.codigo && it.codigo && s.codigo.trim().toLowerCase() === it.codigo.trim().toLowerCase()) ||
              (s.descricao && it.descricao && s.descricao.trim().toLowerCase() === it.descricao.trim().toLowerCase()) ||
              (s.productId && (s.productId === it.id || s.productId === it.productId))
            );
            if (match) {
              await stockRepository.updateBalance(match.id, -reserveQty);
            }
          }
        }
      } catch (stockErr) {
        console.warn('Aviso ao estornar reserva de estoque no retrocesso:', stockErr.message);
      }
    }

    // Atualização de cabeçalho e reset seguro de etapas desfeitas
    order.header.status = targetStatus;
    order.header.updatedAt = new Date().toISOString();

    if (targetStatus === 'Em Cotação') {
      order.header.aprovadoPor = null;
      order.header.dataAprovacao = null;
      order.header.recebidoMatriz = false;
      order.header.dataRecebimentoMatriz = null;
      order.header.recebidoPor = null;
      order.header.distribuicaoConcluida = false;
      order.header.distribuidoPor = null;
      order.header.dataDistribuicao = null;
      order.header.separacaoConcluida = false;
      order.header.separadoPor = null;
      order.header.dataSeparacao = null;
      order.header.boletosLiberados = false;
      order.header.boletosLiberadosPor = null;
      order.header.boletosLiberadosEm = null;
      order.header.finalizadoPor = null;
      order.header.dataFinalizacao = null;
    } else if (targetStatus === 'Aprovado') {
      order.header.recebidoMatriz = false;
      order.header.dataRecebimentoMatriz = null;
      order.header.recebidoPor = null;
      order.header.distribuicaoConcluida = false;
      order.header.distribuidoPor = null;
      order.header.dataDistribuicao = null;
      order.header.separacaoConcluida = false;
      order.header.separadoPor = null;
      order.header.dataSeparacao = null;
      order.header.boletosLiberados = false;
      order.header.boletosLiberadosPor = null;
      order.header.boletosLiberadosEm = null;
      order.header.finalizadoPor = null;
      order.header.dataFinalizacao = null;
    } else if (targetStatus === 'Em Separação') {
      order.header.separacaoConcluida = false;
      order.header.separadoPor = null;
      order.header.dataSeparacao = null;
      order.header.boletosLiberados = false;
      order.header.boletosLiberadosPor = null;
      order.header.boletosLiberadosEm = null;
      order.header.finalizadoPor = null;
      order.header.dataFinalizacao = null;
    } else if (targetStatus === 'Faturamento') {
      order.header.boletosLiberados = false;
      order.header.boletosLiberadosPor = null;
      order.header.boletosLiberadosEm = null;
      order.header.finalizadoPor = null;
      order.header.dataFinalizacao = null;
    }

    const saved = await orderRepository.save(order);

    // Ressincronizar com o financeiro (as parcelas retornam para status PREVISTO/Aguardando confirmação)
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved);
    } catch (finErr) {
      console.error('Erro ao sincronizar com o financeiro no retrocesso:', finErr);
    }

    // Registrar log de auditoria imutável
    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Diretoria',
      usuarioRole: currentUser.role,
      acao: 'RETROCESSO_STATUS',
      detalhesJson: {
        statusAnterior: currentStatus,
        statusNovo: targetStatus,
        motivo: reason.trim()
      },
      observacoes: `Retrocesso de [${currentStatus}] para [${targetStatus}]. Motivo: ${reason.trim()}`
    }).catch(e => console.error('Erro ao registrar auditoria de retrocesso:', e));

    return {
      success: true,
      message: `Status do pedido ${saved.header.numeroPedido} retrocedido de "${currentStatus}" para "${targetStatus}" com sucesso!`,
      order: saved
    };
  }
}

module.exports = new OrderService();
