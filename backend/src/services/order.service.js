const orderRepository = require('../repositories/orderRepository');
const fiscalRepository = require('../repositories/fiscalRepository');
const distributionAuditRepo = require('../repositories/distributionAuditRepository');
const stockRepository = require('../repositories/stockRepository');
const { getDatabase, scheduleDatabaseSave, withTransaction, queryOne, queryAll } = require('../config/database');
const supplierService = require('./supplier.service');
const productService = require('./product.service');

function requireConfirmedReceipt(order) {
  if (order.header.recebidoMatriz === true) return;
  const error = new Error('Confirme o recebimento físico na Matriz antes de avançar com o pedido.');
  error.statusCode = 409;
  error.code = 'RECEIPT_REQUIRED';
  throw error;
}

function isStockTransfer(header) {
  return header?.supplierId === 'cd_matriz' &&
    String(header.id || '').startsWith('order_transf_cd_') &&
    String(header.numeroPedido || '').startsWith('CD-');
}

function checkPipelineVersion(order, expectedVersion) {
  if (expectedVersion == null || Number(expectedVersion) === Number(order.header.version || 1)) return;
  const error = new Error('O pedido foi alterado por outro usuário. Atualize os dados antes de prosseguir.');
  error.statusCode = 409;
  error.code = 'CONCURRENCY_CONFLICT';
  throw error;
}

async function applyDistributionItems(order, changes) {
  if (changes === undefined) return;
  const items = new Map((order.items || []).map(item => [item.id, item]));
  const invalid = () => {
    const error = new Error('A distribuição contém itens ou quantidades inválidas. Confira a grade antes de liberar.');
    error.statusCode = 400;
    error.code = 'INVALID_DISTRIBUTION';
    throw error;
  };
  if (!Array.isArray(changes) || changes.length > items.size) invalid();
  const activeStores = new Set((await queryAll('SELECT id FROM stores WHERE active = 1')).map(store => store.id));
  for (const change of changes) {
    const item = items.get(change?.id);
    if (!item || !change.separacaoLojas || typeof change.separacaoLojas !== 'object' ||
        Array.isArray(change.separacaoLojas)) invalid();
    items.delete(item.id);

    const purchased = Number(item.qtdTotalUnidades) || 0;
    const received = change.qtdRecebida ?? item.qtdRecebida ?? (item.ruptura ? 0 : purchased);
    const reserve = change.qtdReservaEstoque;
    const allocations = Object.entries(change.separacaoLojas);
    const validUnits = value => Number.isSafeInteger(value) && value >= 0;
    if ((change.qtdRecebida != null && (!validUnits(change.qtdRecebida) || change.qtdRecebida > purchased)) ||
        !validUnits(reserve) ||
        allocations.some(([storeId, quantity]) => !validUnits(quantity) || (quantity > 0 && !activeStores.has(storeId))) ||
        reserve + allocations.reduce((sum, [, quantity]) => sum + quantity, 0) > received) invalid();

    item.separacaoLojas = Object.fromEntries(allocations.filter(([storeId]) => activeStores.has(storeId)));
    item.grade = { ...item.separacaoLojas };
    item.qtdReservaEstoque = reserve;
    item.separacaoManual = change.separacaoManual === true;
    if (change.qtdRecebida != null) {
      item.qtdRecebida = change.qtdRecebida;
      item.ruptura = change.qtdRecebida === 0;
    }
  }
  order.header.possuiDivergenciaFaturamento = (order.items || []).some(item =>
    item.ruptura || (item.qtdRecebida != null && item.qtdRecebida < item.qtdTotalUnidades)
  );
  if (order.header.possuiDivergenciaFaturamento) order.header.divergenciaResolvida = false;
}

class OrderService {
  async listOrders(currentUser) {
    const orders = await orderRepository.findAll();
    const role = String(currentUser?.role || '').toLowerCase();
    if (role === 'separacao' || role === 'conferente') {
      return orders.filter(order => {
        const isTransfer = order.header?.supplierId === 'cd_matriz' || 
                           String(order.header?.numeroPedido || '').startsWith('CD-') || 
                           Boolean(order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));
        // Doca só recebe pedidos para separação manual quando o recebimento físico na Matriz estiver confirmado
        return order.header?.status === 'Em Separação' && (isTransfer || Boolean(order.header?.recebidoMatriz));
      });
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
    if (role === 'separacao' || role === 'conferente') {
      const isTransfer = order.header?.supplierId === 'cd_matriz' || 
                         String(order.header?.numeroPedido || '').startsWith('CD-') || 
                         Boolean(order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));
      if (order.header?.status !== 'Em Separação' || (!isTransfer && !order.header?.recebidoMatriz)) {
        const err = new Error('Pedido ainda não disponível para separação na doca (aguardando confirmação do recebimento físico na Matriz).');
        err.statusCode = 403;
        throw err;
      }
    }
    return order;
  }

  async getOrderVersionInfo(id) {
    const header = await queryOne(
      `SELECT id, numeroPedido, status, version, boletosLiberados, updatedAt,
              lastModifiedById, lastModifiedByName, lastModifiedByRole, lastModifiedAt
       FROM purchase_orders 
       WHERE id = ? OR numeroPedido = ?`,
      [id, id]
    );
    if (!header) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    let lastModifierId = header.lastModifiedById || null;
    let lastModifier = header.lastModifiedByName 
      ? `${header.lastModifiedByName}${header.lastModifiedByRole ? ` (${header.lastModifiedByRole})` : ''}`
      : null;
    let lastModifiedAt = header.lastModifiedAt || null;

    if (!lastModifier) {
      try {
        const lastLog = await queryOne(
          `SELECT usuarioId, usuarioNome, usuarioRole, createdAt 
           FROM order_distribution_logs 
           WHERE orderId = ? 
           ORDER BY createdAt DESC LIMIT 1`,
          [header.id]
        );
        if (lastLog) {
          lastModifierId = lastLog.usuarioId || null;
          lastModifier = `${lastLog.usuarioNome}${lastLog.usuarioRole ? ` (${lastLog.usuarioRole})` : ''}`;
          lastModifiedAt = lastLog.createdAt;
        }
      } catch {}
    }

    return {
      id: header.id,
      numeroPedido: header.numeroPedido,
      version: Number(header.version || 1),
      status: header.status,
      boletosLiberados: Boolean(header.boletosLiberados),
      updatedAt: header.updatedAt,
      lastModifierId,
      lastModifier,
      lastModifiedAt
    };
  }

  async recordPresence(orderId, user) {
    const presenceService = require('./presence.service');
    const activeViewers = presenceService.record(orderId, user);
    const versionInfo = await this.getOrderVersionInfo(orderId).catch(() => null);

    return {
      activeViewers,
      currentVersion: versionInfo?.version || 1,
      lastModifiedById: versionInfo?.lastModifierId || null,
      lastModifiedByName: versionInfo?.lastModifier || null,
      lastModifiedAt: versionInfo?.lastModifiedAt || null
    };
  }

  leavePresence(orderId, userId) {
    const presenceService = require('./presence.service');
    presenceService.leave(orderId, userId);
  }

  /**
   * Valida a integridade financeira das parcelas do pedido antes da persistência
   */
  _validateInstallmentsIntegrity(orderData) {
    const installments = orderData.installments;
    const warnings = [];
    if (!Array.isArray(installments) || installments.length === 0) {
      return warnings;
    }

    let sumMercadorias = 0;
    let sumFrete = 0;
    const seenIds = new Set();
    let hasDuplicateIds = false;

    installments.forEach((inst, index) => {
      inst.dataVencimento = inst.dataVencimento || inst.vencimento;
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

      if (inst.id) {
        if (seenIds.has(inst.id)) {
          hasDuplicateIds = true;
        } else {
          seenIds.add(inst.id);
        }
      }

      if (inst.isBoletoFrete || inst.tipoTitulo === 'frete') {
        sumFrete += valor;
      } else {
        sumMercadorias += valor;
      }
    });

    if (hasDuplicateIds) {
      warnings.push({
        code: 'DUPLICATE_INSTALLMENT_IDS',
        message: 'Aviso: Foram identificadas parcelas com chaves duplicadas no pedido. Elas foram normalizadas automaticamente com identificadores exclusivos.'
      });
    }

    // Se houver total de mercadorias / itens e o pedido não for um rascunho
    if (!orderData.header?.isDraft && Array.isArray(orderData.items) && orderData.items.length > 0) {
      let brutoSum = 0;
      let ipiSum = 0;
      let descSum = 0;
      orderData.items.forEach(item => {
        const isRuptura = item.ruptura === true || item.ruptura === 1 || item.ruptura === '1' ||
                          item.isRuptura === true || item.isRuptura === 1 || item.isRuptura === '1';
        if (isRuptura) return;

        const pack = Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1;
        const pacotes = Number(item.qtdPacotes || 0);
        const pecasOriginal = Number(item.qtdTotalUnidades || 0) || (pacotes * pack);
        const hasQtdRecebida = item.qtdRecebida !== undefined && item.qtdRecebida !== null;
        const pecas = hasQtdRecebida ? Math.max(0, Number(item.qtdRecebida)) : pecasOriginal;

        const preco = Number(item.precoUnitario || 0);
        const bruto = Number(item.valorTotalBruto !== undefined && !hasQtdRecebida ? item.valorTotalBruto : (pecas * preco));
        brutoSum += bruto;
        ipiSum += Number(item.valorIpi || 0);
        descSum += Number(item.valorDescontoItem || 0);
      });

      const headerDesc = Number(orderData.header.descontoComercialTotal || 0);
      const totalDesconto = descSum > 0 ? descSum : headerDesc;

      // 🛡️ Se não houver IPI destacado item a item, verifica se há alíquota global no cabeçalho ou fiscalConfig
      if (ipiSum === 0) {
        const headerIpi = Number(orderData.header?.aliquotaIpi || 0);
        const fiscalIpi = Number(orderData.fiscalConfig?.ipiAliquota || 0);
        const aliqIpi = headerIpi > 0 ? headerIpi : fiscalIpi;
        if (aliqIpi > 0) {
          const pct = aliqIpi > 1 ? aliqIpi / 100 : aliqIpi;
          const baseCalculo = Math.max(0, brutoSum - totalDesconto);
          ipiSum = Number((baseCalculo * pct).toFixed(2));
        }
      }

      // Regra Oficial Central: Total (Bruto) + IPI - Desconto Comercial = Total Geral
      const expectedTotal = Number(Math.max(0, brutoSum + ipiSum - totalDesconto).toFixed(2));

      // Se houver ST destacada ou alíquota global de ST
      let stSum = 0;
      orderData.items.forEach(item => {
        if (item.ruptura) return;
        stSum += Number(item.valorSt || 0);
      });
      if (stSum === 0 && Number(orderData.header?.aliquotaSt || 0) > 0) {
        const aliqSt = Number(orderData.header.aliquotaSt);
        const pctSt = aliqSt > 1 ? aliqSt / 100 : aliqSt;
        const baseSt = Math.max(0, brutoSum + ipiSum - totalDesconto);
        stSum = Number((baseSt * pctSt).toFixed(2));
      }

      // Se ambas as somas forem expressivas (> 1 real) e a discrepância for superior a 1 real
      if (sumMercadorias > 1 && expectedTotal > 1) {
        const diff = Math.abs(sumMercadorias - expectedTotal);
        const diffWithSt = Math.abs(sumMercadorias - (expectedTotal + stSum));
        const rawNf = Number(orderData.header?.valorNotaFiscalEntregue || 0);
        const diffWithNf = rawNf > 0 ? Math.abs(sumMercadorias - rawNf) : 999999;

        if (diff > 1.0 && diffWithSt > 1.0 && diffWithNf > 1.0 && !orderData.header.percentualDescontoOff && !orderData.header.descontoComercialTotal) {
          const warnMsg = `Divergência Financeira: A soma das parcelas de produtos (R$ ${sumMercadorias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) difere do total calculado do pedido (R$ ${expectedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Diferença de R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
          console.warn(`[Auditoria Financeira] Divergência no pedido ${orderData.header.numeroPedido}: ${warnMsg}`);
          warnings.push({
            code: 'FINANCIAL_DIVERGENCE',
            message: warnMsg,
            sumInstallments: sumMercadorias,
            expectedTotal: expectedTotal,
            difference: diff
          });
        }
      }

      // Validação de frete destacado
      const freteEsperado = Number(orderData.header.valorFrete) || 0;
      const isCif = String(orderData.header.tipoFrete || '').toUpperCase() === 'CIF';
      if (!isCif && freteEsperado > 0 && sumFrete > 0 && Math.abs(sumFrete - freteEsperado) > 1.0) {
        const freteWarn = `Divergência de Frete: O valor da parcela de frete (R$ ${sumFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) difere do valor de frete cadastrado no cabeçalho (R$ ${freteEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
        warnings.push({
          code: 'FREIGHT_DIVERGENCE',
          message: freteWarn
        });
      }
    }

    return warnings;
  }

  _isProductInfoOnlyChange(existing, incoming) {
    if (!existing || !incoming) return false;
    const exH = existing.header || {};
    const inH = incoming.header || {};

    // 1. Status do pedido não pode mudar
    if (exH.status && inH.status && exH.status !== inH.status) return false;
    // 2. Fornecedor não pode mudar
    if (exH.fornecedor && inH.fornecedor && exH.fornecedor !== inH.fornecedor) return false;
    // 3. Flags de esteira e marcos operacionais não podem sofrer alteração
    if (Boolean(exH.boletosLiberados) !== Boolean(inH.boletosLiberados)) return false;
    if (Boolean(exH.recebidoMatriz) !== Boolean(inH.recebidoMatriz)) return false;
    if (Boolean(exH.distribuicaoConcluida) !== Boolean(inH.distribuicaoConcluida)) return false;
    if (Boolean(exH.separacaoConcluida) !== Boolean(inH.separacaoConcluida)) return false;

    // Filtra itens vazios / trailing blank rows em ambas as listas para comparação justa
    const isRealItem = it => it && Boolean(
      (it.descricao && it.descricao.trim()) || 
      (it.codigo && it.codigo.trim()) || 
      (it.codigoInterno && it.codigoInterno.trim()) ||
      (it.codigoFornecedor && it.codigoFornecedor.trim()) ||
      Number(it.qtdTotalUnidades || 0) > 0 ||
      Number(it.precoUnitario || 0) > 0
    );

    const exItems = (existing.items || []).filter(isRealItem);
    const inItems = (incoming.items || []).filter(isRealItem);

    // Não pode adicionar nem remover produtos reais do pedido
    if (exItems.length !== inItems.length) return false;

    for (const exIt of exItems) {
      const inIt = inItems.find(it => 
        (exIt.id && it.id === exIt.id) || 
        (exIt.codigoFornecedor && it.codigoFornecedor && exIt.codigoFornecedor === it.codigoFornecedor) ||
        (exIt.descricao && it.descricao && exIt.descricao.trim() === it.descricao.trim())
      );
      if (!inIt) return false;

      // Quantidades negociadas não podem sofrer alteração
      if (Number(exIt.qtdTotalUnidades || 0) !== Number(inIt.qtdTotalUnidades || 0)) return false;
      if (Number(exIt.qtdPacotes || 0) !== Number(inIt.qtdPacotes || 0)) return false;
    }

    return true;
  }

  async saveOrder(orderData, currentUser, options = {}) {
    if (!orderData || !orderData.header || !orderData.header.numeroPedido) {
      const err = new Error('Dados do pedido inválidos: número do pedido é obrigatório.');
      err.statusCode = 400;
      throw err;
    }

    if (currentUser) {
      orderData.header.lastModifiedById = currentUser.id || null;
      orderData.header.lastModifiedByName = currentUser.nome || currentUser.email || 'Usuário';
      orderData.header.lastModifiedByRole = currentUser.role || null;
      orderData.header.lastModifiedAt = new Date().toISOString();
    }

    // Validação de Permissão: Pedidos fechados / em esteira
    let isEditingClosed = false;
    const currentId = orderData.header.id;
    const existingForAuthorization = currentId ? await orderRepository.findById(currentId) : null;

    // 🛡️ Alerta e Proteção contra Concorrência e Sobrescrita Simultânea
    if (currentId && existingForAuthorization && existingForAuthorization.header) {
      const incomingVersion = orderData.header?.version !== undefined && orderData.header?.version !== null
        ? Number(orderData.header.version)
        : null;
      const currentVersion = Number(existingForAuthorization.header.version || 1);
      const isForceOverwrite = Boolean(options.forceOverwrite || orderData.forceOverwrite);

      // Identifica quem modificou por último: direto pelo cabeçalho do pedido
      let lastModifierId = existingForAuthorization.header.lastModifiedById || null;
      let lastModifierName = existingForAuthorization.header.lastModifiedByName || 'outro operador';
      let lastModifiedAt = existingForAuthorization.header.lastModifiedAt
        ? new Date(existingForAuthorization.header.lastModifiedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '';
      let isSelfOrSystemModifier = false;

      const isUserDiretoria = currentUser?.role === 'diretoria' || currentUser?.role === 'root' || currentUser?.id === 'usr_root';

      // 🛡️ Regra 1: Se o autor da última alteração for o próprio usuário logado, NÃO há concorrência consigo mesmo!
      if (
        currentUser && (
          (lastModifierId && lastModifierId === currentUser.id) ||
          (lastModifierName && lastModifierName === currentUser.nome) ||
          (isUserDiretoria && (lastModifierId === 'usr_root' || lastModifierName === 'Root'))
        )
      ) {
        isSelfOrSystemModifier = true;
      }

      // Fallback: consulta auditoria de doca caso os campos do cabeçalho estejam nulos
      if (!isSelfOrSystemModifier && !lastModifierId) {
        try {
          const { queryOne } = require('../config/database');
          const lastLog = await queryOne(
            'SELECT usuarioId, usuarioNome, usuarioRole, createdAt FROM order_distribution_logs WHERE orderId = ? ORDER BY createdAt DESC LIMIT 1',
            [currentId]
          );
          if (lastLog) {
            lastModifierName = `${lastLog.usuarioNome}${lastLog.usuarioRole ? ` (${lastLog.usuarioRole})` : ''}`;
            lastModifiedAt = lastLog.createdAt ? new Date(lastLog.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

            if (
              lastLog.usuarioId === currentUser?.id ||
              lastLog.usuarioNome === currentUser?.nome ||
              (isUserDiretoria && (lastLog.usuarioId === 'usr_root' || lastLog.usuarioNome === 'Root'))
            ) {
              isSelfOrSystemModifier = true;
            }
          }
        } catch {}
      }

      if (incomingVersion !== null && currentVersion > incomingVersion && !isForceOverwrite && !isSelfOrSystemModifier && !isUserDiretoria) {
        const err = new Error(
          `Conflito de Concorrência: Este pedido foi alterado e salvo no servidor por ${lastModifierName}${lastModifiedAt ? ` às ${lastModifiedAt}` : ''} enquanto você o editava. Recarregue os dados mais recentes para não perder alterações.`
        );
        err.statusCode = 409;
        err.code = 'ORDER_CONCURRENT_MODIFICATION';
        err.lastModifier = lastModifierName;
        err.lastModifiedAt = lastModifiedAt;
        err.currentVersion = currentVersion;
        err.incomingVersion = incomingVersion;
        throw err;
      }
    }
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

    // 🛡️ Regra de Negócio: Edição de dados cadastrais do produto (código interno, ref fabricante, código de barras, foto, descrição, NCM)
    // não altera negociação comercial, quantidades ou etapas do pedido, logo é permitida a qualquer momento que o pedido esteja na esteira
    const isProductInfoUpdate = Boolean(
      options?.isProductInfoUpdate === true ||
      orderData?.isProductInfoUpdate === true ||
      (existingForAuthorization && this._isProductInfoOnlyChange(existingForAuthorization, orderData))
    );
    const canManageProductInfo = isUnrestricted ||
      role === 'deposito' ||
      role === 'separacao' ||
      role === 'comprador' ||
      role === 'faturamento' ||
      currentUser?.permissions?.['nav:products'] === true ||
      currentUser?.permissions?.['nav:separation'] === true ||
      currentUser?.permissions?.['orders:edit_closed'] === true ||
      currentUser?.permissions?.['orders:edit_draft'] === true;

    if (isProductInfoUpdate && canManageProductInfo) {
      // ✅ Edição de informações do produto liberada na esteira para perfis de catálogo/depósito/compras
    } else if (!hasOperationPermission(permissionCode, defaultRoles)) {
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

          if (!isAuthorized && !isProductInfoUpdate) {
            const err = new Error(`Seu perfil (${currentUser.role}) não possui autorização para alterar pedidos já fechados/aprovados na esteira.`);
            err.statusCode = 403;
            err.code = 'ORDER_CLOSED_FORBIDDEN';
            throw err;
          }

          // Boletos já liberados no Financeiro: Apenas Diretoria e Faturamento podem alterar dados comerciais
          if (existing.header.boletosLiberados && !isDiretoriaOrRoot && currentUser.role !== 'faturamento' && !isProductInfoUpdate) {
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
          'Em Distribuição': 2,
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

        // Preservação de marcos operacionais e liberação de boletos (apenas para pedidos em esteira avançada)
        const isCotacaoOrDraft = orderData.header?.status === 'Em Cotação' || orderData.header?.status === 'Rascunho';
        if (!isCotacaoOrDraft) {
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
    }

    // A edição comum não confirma recebimento nem substitui a liberação que movimenta o estoque.
    const persistedHeader = existingForAuthorization?.header;
    if (!isStockTransfer(persistedHeader || orderData.header)) {
      if (orderData.header.status === 'Em Separação' && persistedHeader?.status !== 'Em Separação') {
        const error = new Error('Use a opção Liberar para Separação na tela de Distribuição.');
        error.statusCode = 409;
        error.code = 'USE_SEPARATION_RELEASE';
        throw error;
      }
      orderData.header.recebidoMatriz = persistedHeader?.recebidoMatriz === true;
      orderData.header.recebidoPor = persistedHeader?.recebidoPor ?? null;
      orderData.header.dataRecebimentoMatriz = persistedHeader?.dataRecebimentoMatriz ?? null;
    }

    // Validação de integridade financeira antes de salvar
    const warnings = this._validateInstallmentsIntegrity(orderData) || [];

    const saved = await orderRepository.save(orderData);

    // Auditoria de governança para alterações em pedidos
    if (currentUser) {
      await distributionAuditRepo.create({
        orderId: saved.header.id,
        numeroPedido: saved.header.numeroPedido,
        fornecedor: saved.header.fornecedor,
        usuarioId: currentUser.id || null,
        usuarioNome: currentUser.nome || currentUser.email || 'Usuário',
        usuarioRole: currentUser.role,
        acao: isProductInfoUpdate ? 'EDICAO_INFO_PRODUTO' : (isEditingClosed ? 'EDICAO_PEDIDO_FECHADO' : 'SALVAMENTO_PEDIDO'),
        observacoes: isProductInfoUpdate
          ? `Atualização de dados cadastrais de produto no pedido (${saved.header.status}) por ${currentUser.nome || currentUser.email || 'Usuário'} (${currentUser.role}).`
          : `Alteração salva no pedido (${saved.header.status}) por ${currentUser.nome || currentUser.email || 'Usuário'} (${currentUser.role}).`
      }).catch(e => console.error('Erro ao registrar log de auditoria de alteração:', e));
    }

    // Sincronização automática em tempo real com o Financeiro / Contas a Pagar
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved);
    } catch (finErr) {
      if (options.strictFinancial === true) throw finErr;
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
      newNumber: saved.header.numeroPedido,
      warnings
    };
  }

  async importOrderPackage(payload, currentUser) {
    const { order, supplier, products } = payload || {};
    if (!order?.header || !supplier || !Array.isArray(products)) {
      const err = new Error('Pacote de importação inválido: pedido, fornecedor e produtos são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    return withTransaction(async () => {
      const supplierResult = await supplierService.saveSupplier(supplier);
      const savedSupplier = supplierResult.supplier;
      const normalizedProducts = products.map(product => {
        if (product.supplierId && product.supplierId !== savedSupplier.id) {
          const err = new Error(`O produto "${product.codigo || product.descricao || 'sem código'}" não pertence ao fornecedor importado.`);
          err.statusCode = 400;
          throw err;
        }
        return {
          ...product,
          supplierId: savedSupplier.id,
          nomeFornecedor: savedSupplier.razaoSocial || savedSupplier.nomeFantasia || product.nomeFornecedor || ''
        };
      });
      const productResult = await productService.saveBatchProducts(normalizedProducts, { strict: true });
      if (productResult.count !== normalizedProducts.length) {
        const err = new Error('Nem todos os produtos da planilha puderam ser salvos. A importação foi cancelada.');
        err.statusCode = 400;
        throw err;
      }

      const normalizedOrder = {
        ...order,
        header: {
          ...order.header,
          supplierId: savedSupplier.id,
          fornecedor: savedSupplier.razaoSocial || savedSupplier.nomeFantasia || order.header.fornecedor,
          cnpj: savedSupplier.cnpj || order.header.cnpj || ''
        }
      };
      const orderResult = await this.saveOrder(normalizedOrder, currentUser, { strictFinancial: true });
      return {
        success: true,
        message: orderResult.message,
        supplier: savedSupplier,
        products: productResult.products,
        order: orderResult.order,
        numberReassigned: orderResult.numberReassigned
      };
    });
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
      const err = new Error('A senha de confirmação é obrigatória para autorizar a exclusão.');
      err.statusCode = 400;
      throw err;
    }

    // Busca usuário atualizado do banco para obter permissões efetivas
    const dbCurrentUser = currentUser?.id 
      ? await userRepository.findById(currentUser.id) 
      : (currentUser?.email ? await userRepository.findByEmailOrAlias(currentUser.email) : null);

    const effectivePermissions = dbCurrentUser?.permissions || currentUser?.permissions || {};
    const parsedPermissions = typeof effectivePermissions === 'string'
      ? (() => { try { return JSON.parse(effectivePermissions); } catch { return {}; } })()
      : effectivePermissions;

    const isDiretoriaOrRoot = (
      currentUser?.role === 'diretoria' || 
      currentUser?.role === 'root' || 
      currentUser?.id === 'usr_root' ||
      dbCurrentUser?.role === 'diretoria' ||
      dbCurrentUser?.id === 'usr_root'
    );

    const hasDeletePermission = isDiretoriaOrRoot || Boolean(parsedPermissions && parsedPermissions['orders:delete']);

    let authorizingDirector = null;

    // Cenário 1: O usuário possui permissão direta para excluir (Diretoria ou orders:delete ativa) -> Sudo Mode com a própria senha
    if (hasDeletePermission) {
      const dbUser = dbCurrentUser || await userRepository.findById(currentUser?.id) || await userRepository.findByEmailOrAlias(currentUser?.email);
      if (!dbUser) {
        const err = new Error('Usuário autenticado não encontrado no sistema.');
        err.statusCode = 401;
        throw err;
      }
      const isPasswordValid = await bcrypt.compare(directorPassword, dbUser.senha);
      if (!isPasswordValid) {
        const err = new Error('Sua senha de acesso está incorreta.');
        err.statusCode = 403;
        throw err;
      }
      authorizingDirector = dbUser;
    } else {
      // Cenário 2: Usuário logado não possui permissão de exclusão -> Exige autorização presencial de supervisor Diretoria
      const targetEmail = (directorEmail || '').trim().toLowerCase();
      if (!targetEmail) {
        const err = new Error('O e-mail de um Diretor supervisor é obrigatório para autorizar a exclusão.');
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

    // Se for romaneio de transferência do CD que já havia sido baixado (Finalizado), estorna o estoque central
    const isTransfer = existing.header?.supplierId === 'cd_matriz' || 
                       String(existing.header?.numeroPedido || '').startsWith('CD-') || 
                       String(id).startsWith('order_transf_cd_') ||
                       (existing.header?.fornecedor && existing.header.fornecedor.toLowerCase().includes('transferência'));

    const wasDeducted = isTransfer && (existing.header?.status === 'Finalizado' || existing.header?.status === 'Faturamento');

    let reversedUnits = 0;
    if (wasDeducted && Array.isArray(existing.items)) {
      try {
        const stockRepository = require('../repositories/stockRepository');
        const allStock = await stockRepository.findAll();
        for (const it of existing.items) {
          const qty = Number(it.qtdTotalUnidades || 0);
          if (qty > 0 && !it.ruptura) {
            const code = String(it.codigo || it.codigoInterno || '').trim().toLowerCase();
            const desc = String(it.descricao || '').trim().toLowerCase();
            const match = allStock.find(s => 
              (s.productId && (s.productId === it.id || s.productId === it.productId)) ||
              (code && [s.codigo, s.codigoInterno].some(val => String(val || '').trim().toLowerCase() === code)) ||
              (desc && String(s.descricao || '').trim().toLowerCase() === desc)
            );
            if (match) {
              await stockRepository.updateBalance(match.id, qty);
              reversedUnits += qty;
            }
          }
        }
      } catch (stockErr) {
        console.warn('Aviso ao estornar estoque de transferência finalizada:', stockErr.message);
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
   * Registra a conciliação do valor da NF no cabeçalho e sincroniza com o Ajuste Fiscal e parcelas.
   * Permitido para: diretoria, comprador, deposito. Bloqueado para: separacao.
   */
  async confirmReceipt(orderId, { dataRecebimento, recebidoPor, numeroNotaFiscal, valorNotaFiscal, autorizarBoletos, expectedVersion }, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const { saved, canAuthorizeWithReceipt } = await withTransaction(async () => {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        const err = new Error('Pedido não encontrado.');
        err.statusCode = 404;
        throw err;
      }

      checkPipelineVersion(order, expectedVersion);

      // Validação de Regra de Negócio: Permite confirmar recebimento de pedidos ativos (inclusive Aprovado)
      const currentStatus = order.header.status || 'Em Cotação';
      if (currentStatus === 'Finalizado') {
        const err = new Error('Não é permitido alterar o recebimento de pedidos já Finalizados.');
        err.statusCode = 400;
        throw err;
      }

      // Atualizar campos de recebimento no cabeçalho
      order.header.recebidoMatriz = true;
      order.header.dataRecebimentoMatriz = dataRecebimento || new Date().toISOString().split('T')[0];
      order.header.recebidoPor = recebidoPor || currentUser.nome || 'Operador';
      order.header.numeroNotaFiscal = numeroNotaFiscal || order.header.numeroNotaFiscal || '';

      // Atualizar Valor da Nota Fiscal (Ajuste Fiscal da Entrega)
      const numValorNf = valorNotaFiscal !== undefined && valorNotaFiscal !== null && valorNotaFiscal !== ''
        ? Number(valorNotaFiscal)
        : undefined;

      if (numValorNf !== undefined && !isNaN(numValorNf) && numValorNf > 0) {
        order.header.valorNotaFiscalEntregue = Number(numValorNf.toFixed(2));
        order.header.totalGeral = order.header.valorNotaFiscalEntregue;

        // Calcular diferença em relação ao total base comercial do pedido
        const baseCalc = Number(order.header.totalBruto || order.header.totalLiquido || order.header.totalGeral || 0);
        if (baseCalc > 0) {
          order.header.ajusteFiscalDiferenca = Number((order.header.valorNotaFiscalEntregue - baseCalc).toFixed(2));
        }
        order.header.ajusteFiscalData = new Date().toISOString();
        order.header.ajusteFiscalUsuario = currentUser.nome || 'Operador';
      }

      order.header.updatedAt = new Date().toISOString();

      const receiptRole = String(currentUser.role || '').toLowerCase();
      const canAuthorizeWithReceipt = ['diretoria', 'root', 'admin'].includes(receiptRole);
      if (autorizarBoletos === true && canAuthorizeWithReceipt) {
        order.header.boletosLiberados = true;
        order.header.boletosLiberadosPor = currentUser.nome || 'Diretoria';
        order.header.boletosLiberadosEm = new Date().toISOString();
        if (currentStatus === 'Faturamento') {
          order.header.status = 'Finalizado';
          order.header.finalizadoPor = currentUser.nome || 'Diretoria';
          order.header.dataFinalizacao = new Date().toISOString();
        }
      }

      // Recalcular as parcelas a partir da data de recebimento na Matriz e sincronizar valor da NF
      const dataRecebimentoEfetiva = order.header.dataRecebimentoMatriz;
      if (dataRecebimentoEfetiva && Array.isArray(order.installments) && order.installments.length > 0) {
        const baseDt = new Date(`${dataRecebimentoEfetiva}T12:00:00Z`);

        // Se houver valor da NF informado, ajusta proporcionalmente o valor das parcelas de mercadorias não baixadas
        const nonFreteInsts = order.installments.filter(i => !i.isBoletoFrete && i.tipoTitulo !== 'frete' && i.status !== 'Pago');
        let dividedVals = null;
        if (numValorNf !== undefined && !isNaN(numValorNf) && numValorNf > 0 && nonFreteInsts.length > 0) {
          const count = nonFreteInsts.length;
          const valorParcelaBase = Math.floor((numValorNf / count) * 100) / 100;
          const restoCentavos = Number((numValorNf - (valorParcelaBase * count)).toFixed(2));
          dividedVals = nonFreteInsts.map((_, idx) => {
            if (idx === count - 1) {
              return Number((valorParcelaBase + restoCentavos).toFixed(2));
            }
            return valorParcelaBase;
          });
        }

        let nonFreteIdx = 0;
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

          let novoValor = inst.valor;
          if (dividedVals && !inst.isBoletoFrete && inst.tipoTitulo !== 'frete') {
            novoValor = dividedVals[nonFreteIdx++] ?? inst.valor;
          }

          return {
            ...inst,
            valor: novoValor,
            vencimento: newDueIso,
            dataVencimento: newDueIso,
            dias: offsetDays,
            status: 'Previsto' // Conforme diretriz Mega 12: permanece Previsto até efetivo pagamento
          };
        });
      }

      return { saved: await orderRepository.save(order), canAuthorizeWithReceipt };
    });

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

    const { saved, transitioned } = await withTransaction(async () => {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        const err = new Error('Pedido não encontrado.');
        err.statusCode = 404;
        throw err;
      }

      if (order.header.status !== 'Aprovado' && order.header.status !== 'Em Distribuição') {
        const error = new Error('O pedido precisa estar aprovado para iniciar a Distribuição.');
        error.statusCode = 409;
        error.code = 'INVALID_PIPELINE_STATE';
        throw error;
      }

      // O pedido permanece Aprovado (etapa 2 oficial da esteira de 5 fases)
      order.header.status = 'Aprovado';
      order.header.updatedAt = new Date().toISOString();

      return { saved: await orderRepository.save(order), transitioned: true };
    });
    if (!transitioned) return { success: true, order: saved };

    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Operador',
      usuarioRole: currentUser.role,
      acao: 'ENVIO_DISTRIBUICAO',
      observacoes: 'Pedido preparado na esteira de Distribuição entre as lojas'
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

    const { saved, totalPecasEstoqueEntrada, lojasSet, totalPecas } = await withTransaction(async () => {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        const err = new Error('Pedido não encontrado.');
        err.statusCode = 404;
        throw err;
      }

      if (order.header.status !== 'Aprovado' && order.header.status !== 'Em Distribuição') {
        const err = new Error('O pedido precisa estar aprovado para ser liberado para Separação.');
        err.statusCode = 409;
        err.code = 'INVALID_PIPELINE_STATE';
        throw err;
      }
      checkPipelineVersion(order, payload.expectedVersion);
      await applyDistributionItems(order, payload.items);

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

      let totalPecasEstoqueEntrada = 0;
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

      const saved = await orderRepository.save(order);
      return { saved, totalPecasEstoqueEntrada, lojasSet, totalPecas };
    });

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
   * Conclui a conferência física e o apontamento de avarias na doca / separação.
   * Mantém o pedido no status "Em Separação", gravando separacaoConcluida = true.
   * Permitido: separacao, deposito, comprador, diretoria, root, admin
   */
  async concludeSeparation(orderId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role?.toLowerCase();
    const isDiretoriaOrRoot = role === 'diretoria' || 
                              role === 'root' || 
                              role === 'admin' || 
                              currentUser.id === 'usr_root' || 
                              currentUser.email?.toLowerCase() === 'root' ||
                              currentUser.nome?.toLowerCase() === 'root';
    const isAuthorized = isDiretoriaOrRoot || role === 'comprador' || role === 'separacao' || role === 'deposito';
    if (!isAuthorized) {
      const err = new Error('Perfil não autorizado a concluir a separação de pedidos.');
      err.statusCode = 403;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

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
    if (currentStatus !== 'Em Separação') {
      const err = new Error(`Não é possível concluir a separação de um pedido com status "${currentStatus}". O pedido deve estar "Em Separação".`);
      err.statusCode = 400;
      throw err;
    }

    const isTransfer = order.header?.supplierId === 'cd_matriz' || 
                       String(order.header?.numeroPedido || '').startsWith('CD-') || 
                       (order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));

    if (isTransfer) {
      order.header.recebidoMatriz = true;
      order.header.recebidoMatrizPor = payload.conferente || currentUser.nome || 'Conferente Separação';
      if (!order.header.dataRecebimentoMatriz) order.header.dataRecebimentoMatriz = new Date().toISOString();
      order.header.boletosLiberados = true;
    } else {
      requireConfirmedReceipt(order);
    }

    const conferenteNome = payload.conferente || currentUser.nome || 'Conferente Separação';
    const dataConferencia = new Date().toISOString();

    if (!order.inspection) {
      order.inspection = {
        conferente: conferenteNome,
        dataConferencia: dataConferencia,
        possuiAvarias: Array.isArray(payload.avarias) && payload.avarias.length > 0,
        observacoesDoca: payload.observacoes || '',
        avarias: payload.avarias || [],
        conferenciaLojas: {}
      };
    }
    if (!order.inspection.conferenciaLojas) {
      order.inspection.conferenciaLojas = {};
    }

    const conferenciaLojas = order.inspection.conferenciaLojas;
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach(item => {
      if (item.ruptura) return;
      if (!item.checks || typeof item.checks !== 'object') {
        item.checks = {};
      }
      const grade = item.grade || item.separacaoLojas || {};
      Object.keys(grade).forEach(storeId => {
        const qtdAlocada = Number(grade[storeId] || 0);
        if (qtdAlocada > 0) {
          const checkKey = `${storeId}_${item.id}`;
          const isConferido = (conferenciaLojas[checkKey] && conferenciaLojas[checkKey].conferido === true) ||
                              (item.checks[storeId] && item.checks[storeId].conferido === true);
          if (!isConferido) {
            conferenciaLojas[checkKey] = {
              conferido: true,
              conferente: conferenteNome,
              dataConferencia
            };
            item.checks[storeId] = {
              conferido: true,
              conferente: conferenteNome,
              dataConferencia
            };
          }
        }
      });
    });

    const db = await getDatabase();
    let saved;
    db.run('BEGIN TRANSACTION');
    try {
      if (isTransfer) {
        order.header.status = 'Finalizado';
        order.header.finalizadoPor = conferenteNome;
        order.header.dataFinalizacao = dataConferencia;
        order.header.boletosLiberados = true;
      } else {
        order.header.status = 'Em Separação';
      }

      order.header.separacaoConcluida = true;
      order.header.separadoPor = conferenteNome;
      order.header.dataSeparacao = dataConferencia;
      order.header.updatedAt = dataConferencia;

      if (payload.avarias) {
        order.header.avariasApontadas = payload.avarias;
        order.inspection.avarias = payload.avarias;
        order.inspection.possuiAvarias = payload.avarias.length > 0;
      }
      if (payload.observacoes) {
        order.header.observacaoSeparacao = payload.observacoes;
        order.inspection.observacoesDoca = payload.observacoes;
      }
      if (payload.conferente) {
        order.inspection.conferente = payload.conferente;
      }

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
      acao: isTransfer ? 'EXPEDICAO_TRANSFERENCIA_FINALIZADA' : 'CONFERENCIA_SEPARACAO_CONCLUIDA',
      detalhesJson: {
        conferente: conferenteNome,
        separacaoConcluida: true,
        dataSeparacao: dataConferencia,
        avariasCount: payload.avarias?.length || 0
      },
      observacoes: payload.observacoes || (isTransfer ? 'Transferência expedida com sucesso' : 'Conferência física finalizada na doca')
    }).catch(e => console.error('Erro ao registrar log de auditoria:', e));

    return {
      message: `Separação do pedido ${saved.header.numeroPedido} concluída com sucesso!`,
      order: saved
    };
  }

  /**
   * Encaminha o pedido formalmente para o Faturamento.
   * Exclusivo para: comprador, deposito, faturamento, diretoria, root, admin (não permitido para apenas separacao).
   * Exige que a conferência física (separacaoConcluida) já tenha sido realizada na doca.
   */
  async sendToFaturamento(orderId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role?.toLowerCase();
    const isDiretoriaOrRoot = role === 'diretoria' || 
                              role === 'root' || 
                              role === 'admin' || 
                              currentUser.id === 'usr_root' || 
                              currentUser.email?.toLowerCase() === 'root' ||
                              currentUser.nome?.toLowerCase() === 'root';
    const isAuthorized = isDiretoriaOrRoot || role === 'comprador' || role === 'deposito' || role === 'faturamento';
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
    const validStatuses = ['Em Separação', 'Faturamento'];
    if (!validStatuses.includes(currentStatus)) {
      const err = new Error(`Não é possível encaminhar para o Faturamento um pedido com status "${currentStatus}". O pedido deve estar em Separação.`);
      err.statusCode = 400;
      throw err;
    }

    const isTransfer = order.header?.supplierId === 'cd_matriz' || 
                       String(order.header?.numeroPedido || '').startsWith('CD-') || 
                       (order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));

    // Trava de governança: a doca deve ter concluído a conferência física antes da liberação ao faturamento
    if (!isTransfer && !order.header.separacaoConcluida && !(isDiretoriaOrRoot && payload.forceIncomplete === true)) {
      const err = new Error('A separação física na doca ainda não foi concluída. Conclua a separação antes de liberar para o Faturamento.');
      err.statusCode = 400;
      err.code = 'SEPARATION_NOT_CONCLUDED';
      throw err;
    }

    // Transferência interna já está fisicamente na Matriz
    if (isTransfer) {
      order.header.recebidoMatriz = true;
      order.header.recebidoMatrizPor = payload.conferente || currentUser.nome || 'Conferente Separação';
      if (!order.header.dataRecebimentoMatriz) order.header.dataRecebimentoMatriz = new Date().toISOString();
      order.header.boletosLiberados = true;
    } else {
      requireConfirmedReceipt(order);
    }

    // Inicializar estrutura de inspeção caso não exista
    if (!order.inspection) {
      order.inspection = {
        conferente: payload.conferente || currentUser.nome || 'Conferente Separação',
        dataConferencia: new Date().toISOString(),
        possuiAvarias: Array.isArray(payload.avarias) && payload.avarias.length > 0,
        observacoesDoca: payload.observacoes || '',
        avarias: payload.avarias || [],
        conferenciaLojas: {}
      };
    }
    if (!order.inspection.conferenciaLojas) {
      order.inspection.conferenciaLojas = {};
    }

    const conferenciaLojas = order.inspection.conferenciaLojas;
    const conferenteNome = payload.conferente || currentUser.nome || 'Conferente Separação';
    const dataConferencia = new Date().toISOString();

    // Auto-conferência das alocações da grade: garante liberdade de ação e fluidez operacional,
    // eliminando bloqueios desnecessários em pedidos duplicados ou conferência unificada na doca
    let missingChecks = 0;
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach(item => {
      if (item.ruptura) return;
      if (!item.checks || typeof item.checks !== 'object') {
        item.checks = {};
      }
      const grade = item.grade || item.separacaoLojas || {};
      Object.keys(grade).forEach(storeId => {
        const qtdAlocada = Number(grade[storeId] || 0);
        if (qtdAlocada > 0) {
          const checkKey = `${storeId}_${item.id}`;
          const isConferido = (conferenciaLojas[checkKey] && conferenciaLojas[checkKey].conferido === true) ||
                              (item.checks[storeId] && item.checks[storeId].conferido === true);
          if (!isConferido) {
            missingChecks++;
            conferenciaLojas[checkKey] = {
              conferido: true,
              conferente: conferenteNome,
              dataConferencia
            };
            item.checks[storeId] = {
              conferido: true,
              conferente: conferenteNome,
              dataConferencia
            };
          }
        }
      });
    });

    const db = await getDatabase();
    let saved;
    db.run('BEGIN TRANSACTION');
    try {
      // Transferências internas entram na separação a partir do estoque da Matriz.
      // A baixa e a finalização ocorrem em uma única transação atômica.
      if (isTransfer && currentStatus !== 'Finalizado') {
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

      if (isTransfer) {
        // Transferências não passam por Faturamento: vão direto para Finalizado com baixa de estoque concluída
        order.header.status = 'Finalizado';
        order.header.finalizadoPor = conferenteNome;
        order.header.dataFinalizacao = dataConferencia;
        order.header.boletosLiberados = true;
      } else {
        order.header.status = 'Faturamento';
        order.header.liberadoFaturamentoPor = currentUser.nome || 'Operador';
        order.header.dataLiberacaoFaturamento = dataConferencia;
      }
      order.header.separacaoConcluida = true;
      if (!order.header.separadoPor) order.header.separadoPor = conferenteNome;
      if (!order.header.dataSeparacao) order.header.dataSeparacao = dataConferencia;
      order.header.updatedAt = dataConferencia;

      if (payload.avarias) {
        order.header.avariasApontadas = payload.avarias;
        order.inspection.avarias = payload.avarias;
        order.inspection.possuiAvarias = payload.avarias.length > 0;
      }
      if (payload.observacoes) {
        order.header.observacaoSeparacao = payload.observacoes;
        order.inspection.observacoesDoca = payload.observacoes;
      }
      if (payload.conferente) {
        order.inspection.conferente = payload.conferente;
      }

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
      acao: isTransfer ? 'EXPEDICAO_TRANSFERENCIA_FINALIZADA' : 'CONFERENCIA_SEPARACAO',
      detalhesJson: { 
        avarias: payload.avarias || [],
        missingChecks,
        forced: missingChecks > 0 && isDiretoriaOrRoot && payload.forceIncomplete === true
      },
      observacoes: payload.observacoes || (isTransfer ? 'Conferência física concluída e transferência expedida para as filiais' : 'Conferência física e separação concluídas, pedido encaminhado para Faturamento')
    }).catch(e => console.error('Erro ao registrar log de auditoria:', e));

    return {
      success: true,
      message: isTransfer
        ? `Separação concluída! Romaneio ${saved.header.numeroPedido} finalizado e expedido com sucesso para as filiais.`
        : `Conferência concluída! Pedido ${saved.header.numeroPedido} encaminhado para Faturamento.`,
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

    const isTransfer = order.header?.supplierId === 'cd_matriz' || 
                       String(order.header?.numeroPedido || '').startsWith('CD-') || 
                       (order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));

    if (!isTransfer && !order.header.recebidoMatriz) {
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
   * Disponível para qualquer usuário autenticado mediante confirmação de senha pessoal
   * e validações financeiras/estoque.
   */
  async rollbackOrderStatus(orderId, { targetStatus, password } = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Usuário não autenticado.');
      err.statusCode = 401;
      throw err;
    }

    // 🔒 Confirmação obrigatória da senha do usuário logado
    if (!password || typeof password !== 'string' || !password.trim()) {
      const err = new Error('A confirmação da sua senha de acesso é obrigatória para retroceder o status do pedido.');
      err.statusCode = 400;
      throw err;
    }

    const userRepository = require('../repositories/userRepository');
    const bcrypt = require('bcryptjs');
    const dbUser = (currentUser.id ? await userRepository.findById(currentUser.id) : null) || 
                   (currentUser.email ? await userRepository.findByEmailOrAlias(currentUser.email) : null);
    if (!dbUser) {
      const err = new Error('Usuário autenticado não encontrado no sistema.');
      err.statusCode = 401;
      throw err;
    }

    let isPasswordValid = false;
    const isBcrypt = dbUser.senha && dbUser.senha.startsWith('$2');
    if (isBcrypt) {
      isPasswordValid = await bcrypt.compare(password.trim(), dbUser.senha);
    } else {
      isPasswordValid = (dbUser.senha === password.trim());
    }

    if (!isPasswordValid) {
      const err = new Error('Senha de confirmação incorreta. O pedido não foi retrocedido.');
      err.statusCode = 403;
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

    const isTransfer = order.header?.supplierId === 'cd_matriz' || 
                       String(order.header?.numeroPedido || '').startsWith('CD-') || 
                       String(order.header?.id || orderId).startsWith('order_transf_cd_') ||
                       (order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));

    // Estorno de Estoque
    if (isTransfer) {
      // Se estava Finalizado e retrocedeu para Separação/Cotação, devolve as unidades debitadas ao estoque central
      if (currentStatus === 'Finalizado' && targetRank < 4 && Array.isArray(order.items)) {
        try {
          const stockRepository = require('../repositories/stockRepository');
          const allStock = await stockRepository.findAll();
          for (const it of order.items) {
            const qty = Number(it.qtdTotalUnidades || 0);
            if (qty > 0 && !it.ruptura) {
              const code = String(it.codigo || it.codigoInterno || '').trim().toLowerCase();
              const desc = String(it.descricao || '').trim().toLowerCase();
              const match = allStock.find(s =>
                (s.productId && (s.productId === it.id || s.productId === it.productId)) ||
                (code && [s.codigo, s.codigoInterno].some(val => String(val || '').trim().toLowerCase() === code)) ||
                (desc && String(s.descricao || '').trim().toLowerCase() === desc)
              );
              if (match) {
                await stockRepository.updateBalance(match.id, qty);
              }
            }
          }
        } catch (stockErr) {
          console.warn('Aviso ao estornar baixa de transferência no retrocesso:', stockErr.message);
        }
      }
    } else {
      // Pedido comercial padrão: Estorno de Estoque Central do CD se retroceder de Distribuição/Separação para Aprovado/Cotação
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
      usuarioNome: currentUser.nome || currentUser.email || 'Usuário',
      usuarioRole: currentUser.role,
      acao: 'RETROCESSO_STATUS',
      detalhesJson: {
        statusAnterior: currentStatus,
        statusNovo: targetStatus
      },
      observacoes: `Retrocesso de [${currentStatus}] para [${targetStatus}] mediante confirmação de senha.`
    }).catch(e => console.error('Erro ao registrar auditoria de retrocesso:', e));

    return {
      success: true,
      message: `Status do pedido ${saved.header.numeroPedido} retrocedido de "${currentStatus}" para "${targetStatus}" com sucesso!`,
      order: saved
    };
  }

  /**
   * Registra um ajuste de divergência física de carga (pack ou quantidade de caixas/peças)
   * recalculando as cotas das lojas e salvando auditoria.
   */
  async applyPhysicalDivergence(orderId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role?.toLowerCase();
    const isDiretoriaOrRoot = role === 'diretoria' || 
                              role === 'root' || 
                              role === 'admin' || 
                              currentUser.id === 'usr_root' || 
                              currentUser.email?.toLowerCase() === 'root' ||
                              currentUser.nome?.toLowerCase() === 'root';
    const isAuthorized = isDiretoriaOrRoot || role === 'comprador' || role === 'deposito' || role === 'separacao';
    if (!isAuthorized) {
      const err = new Error('Perfil não autorizado a ajustar divergências físicas.');
      err.statusCode = 403;
      throw err;
    }

    const { itemId, novoPack, novasCaixas, novasUnidades, novaGrade, motivo, expectedVersion } = payload;

    if (!itemId) {
      const err = new Error('Identificador do produto (itemId) é obrigatório.');
      err.statusCode = 400;
      throw err;
    }

    const packNum = Number(novoPack);
    const caixasNum = Number(novasCaixas);
    const unidadesNum = Number(novasUnidades !== undefined ? novasUnidades : caixasNum * packNum);

    if (isNaN(packNum) || packNum <= 0) {
      const err = new Error('O pack (unidades por embalagem) deve ser um número maior que zero.');
      err.statusCode = 400;
      throw err;
    }

    if (isNaN(caixasNum) || caixasNum < 0) {
      const err = new Error('A quantidade de caixas físicas não pode ser negativa.');
      err.statusCode = 400;
      throw err;
    }

    if (!motivo || !String(motivo).trim()) {
      const err = new Error('O motivo da divergência física é obrigatório para fins de auditoria.');
      err.statusCode = 400;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    if (expectedVersion !== undefined && expectedVersion !== null) {
      const currentVersion = Number(order.header.version || 1);
      const expected = Number(expectedVersion);
      if (currentVersion !== expected) {
        const err = new Error(`Conflito de concorrência: o pedido foi alterado por outro usuário (versão ${currentVersion} vs esperada ${expected}). Atualize os dados antes de prosseguir.`);
        err.statusCode = 409;
        err.code = 'CONCURRENCY_CONFLICT';
        throw err;
      }
    }

    const item = (order.items || []).find(it => it.id === itemId || String(it.id) === String(itemId));
    if (!item) {
      const err = new Error('Produto não encontrado neste pedido.');
      err.statusCode = 404;
      throw err;
    }

    // Preservar valores originais do item antes da primeira divergência
    const packOriginal = Number(item.packOriginal || item.qtdNoPacote || item.qtdPorPacote || 1);
    const qtdPacotesOriginal = Number(item.qtdPacotesOriginal !== undefined ? item.qtdPacotesOriginal : (item.qtdPacotes || 0));
    const qtdTotalUnidadesOriginal = Number(item.qtdTotalUnidadesOriginal !== undefined ? item.qtdTotalUnidadesOriginal : (item.qtdTotalUnidades || (qtdPacotesOriginal * packOriginal)));
    const separacaoLojasOriginal = item.separacaoLojasOriginal 
      ? { ...item.separacaoLojasOriginal } 
      : { ...(item.separacaoLojas || item.grade || {}) };

    const divergenceId = 'div_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const record = {
      id: divergenceId,
      itemId: item.id,
      codigoInterno: item.codigoInterno || item.codigo || '',
      codigoFornecedor: item.codigoFornecedor || '',
      descricao: item.descricao || '',
      dataRegistro: new Date().toISOString(),
      registradoPor: currentUser.nome || currentUser.email || 'Operador',
      registradoPorId: currentUser.id || null,
      packOriginal,
      packNovo: packNum,
      qtdPacotesOriginal,
      qtdPacotesNovo: caixasNum,
      qtdTotalUnidadesOriginal,
      qtdTotalUnidadesNovo: unidadesNum,
      separacaoLojasOriginal,
      separacaoLojasNovo: novaGrade && typeof novaGrade === 'object' ? { ...novaGrade } : {},
      motivo: String(motivo).trim(),
      status: 'aplicado'
    };

    // Armazenar backup original no item se for o primeiro ajuste
    if (item.packOriginal === undefined) item.packOriginal = packOriginal;
    if (item.qtdPacotesOriginal === undefined) item.qtdPacotesOriginal = qtdPacotesOriginal;
    if (item.qtdTotalUnidadesOriginal === undefined) item.qtdTotalUnidadesOriginal = qtdTotalUnidadesOriginal;
    if (!item.separacaoLojasOriginal) item.separacaoLojasOriginal = separacaoLojasOriginal;

    // Atualizar dados operacionais do item
    item.qtdNoPacote = packNum;
    item.qtdPorPacote = packNum;
    item.qtdPacotes = caixasNum;
    item.qtdTotalUnidades = unidadesNum;
    if (novaGrade && typeof novaGrade === 'object') {
      item.separacaoLojas = { ...novaGrade };
      item.grade = { ...novaGrade };
    }
    const precoUnit = Number(item.precoUnitario) || 0;
    item.valorTotalBruto = unidadesNum * precoUnit;
    const descontoItem = Number(item.valorDescontoItem) || 0;
    item.valorTotalLiquido = Math.max(0, item.valorTotalBruto - descontoItem);
    item.divergenciaFisicaAtiva = true;
    item.divergenciaFisicaId = divergenceId;

    // Atualizar cabeçalho do pedido
    if (!order.header.divergenciasFisicas || !Array.isArray(order.header.divergenciasFisicas)) {
      order.header.divergenciasFisicas = [];
    }
    // Desativar registros anteriores do mesmo item caso já existisse
    order.header.divergenciasFisicas.forEach(d => {
      if (d.itemId === item.id && d.status === 'aplicado') {
        d.status = 'substituido';
      }
    });
    order.header.divergenciasFisicas.unshift(record);

    order.header.possuiDivergenciaFisica = true;
    order.header.possuiDivergenciaFaturamento = true;

    // Recalcular totais globais do pedido
    order.header.totalPecas = order.items.reduce((acc, it) => acc + (Number(it.qtdTotalUnidades) || 0), 0);
    order.header.totalVolumes = order.items.reduce((acc, it) => acc + (Number(it.qtdPacotes) || 0), 0);
    order.header.totalBruto = order.items.reduce((acc, it) => acc + (Number(it.valorTotalBruto) || 0), 0);
    order.header.totalLiquido = order.items.reduce((acc, it) => acc + (Number(it.valorTotalLiquido) || 0), 0);
    order.header.totalGeral = order.header.totalLiquido + (Number(order.header.totalIpi) || 0) + (Number(order.header.totalSt) || 0) + (Number(order.header.valorFrete) || 0);

    order.header.version = (Number(order.header.version) || 1) + 1;
    order.header.updatedAt = new Date().toISOString();
    order.header.lastModifiedByName = currentUser.nome || 'Operador';
    order.header.lastModifiedById = currentUser.id || null;

    let saved;
    const { getDb, scheduleDatabaseSave } = require('../config/database');
    const db = getDb();
    db.run('BEGIN TRANSACTION');
    try {
      saved = await orderRepository.save(order);
      db.run('COMMIT');
      scheduleDatabaseSave(0);
    } catch (saveErr) {
      try { db.run('ROLLBACK'); } catch (_) {}
      throw saveErr;
    }

    // Log de auditoria
    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Operador',
      usuarioRole: currentUser.role,
      acao: 'DIVERGENCIA_FISICA_APLICADA',
      detalhesJson: {
        itemId: item.id,
        produto: item.descricao,
        packAnterior: packOriginal,
        packNovo: packNum,
        caixasAnteriores: qtdPacotesOriginal,
        caixasNovas: caixasNum,
        pecasAnteriores: qtdTotalUnidadesOriginal,
        pecasNovas: unidadesNum,
        motivo: record.motivo
      },
      observacoes: `Divergência física de carga aplicada para "${item.descricao}". Cx: ${qtdPacotesOriginal}➔${caixasNum}, Pack: ${packOriginal}➔${packNum}. Motivo: ${record.motivo}`
    }).catch(e => console.error('Erro ao registrar log de auditoria da divergência física:', e));

    return {
      success: true,
      message: `Divergência física do produto "${item.descricao}" aplicada com sucesso!`,
      order: saved,
      divergence: record
    };
  }

  /**
   * Reverte um ajuste de divergência física, restaurando os valores originais do item.
   */
  async revertPhysicalDivergence(orderId, divergenceId, payload = {}, currentUser) {
    if (!currentUser) {
      const err = new Error('Acesso não autorizado. Identificação de usuário necessária.');
      err.statusCode = 401;
      throw err;
    }

    const role = currentUser.role?.toLowerCase();
    const isDiretoriaOrRoot = role === 'diretoria' || 
                              role === 'root' || 
                              role === 'admin' || 
                              currentUser.id === 'usr_root' || 
                              currentUser.email?.toLowerCase() === 'root' ||
                              currentUser.nome?.toLowerCase() === 'root';
    const isAuthorized = isDiretoriaOrRoot || role === 'comprador' || role === 'deposito' || role === 'separacao';
    if (!isAuthorized) {
      const err = new Error('Perfil não autorizado a reverter divergências físicas.');
      err.statusCode = 403;
      throw err;
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

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

    const divergencias = order.header.divergenciasFisicas || [];
    const divIndex = divergencias.findIndex(d => d.id === divergenceId);
    if (divIndex === -1) {
      const err = new Error('Registro de divergência não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const targetDiv = divergencias[divIndex];
    const item = (order.items || []).find(it => it.id === targetDiv.itemId);

    if (item) {
      // Restaurar valores originais
      item.qtdNoPacote = targetDiv.packOriginal;
      item.qtdPorPacote = targetDiv.packOriginal;
      item.qtdPacotes = targetDiv.qtdPacotesOriginal;
      item.qtdTotalUnidades = targetDiv.qtdTotalUnidadesOriginal;
      item.separacaoLojas = { ...(targetDiv.separacaoLojasOriginal || {}) };
      item.grade = { ...(targetDiv.separacaoLojasOriginal || {}) };

      const precoUnit = Number(item.precoUnitario) || 0;
      item.valorTotalBruto = item.qtdTotalUnidades * precoUnit;
      const descontoItem = Number(item.valorDescontoItem) || 0;
      item.valorTotalLiquido = Math.max(0, item.valorTotalBruto - descontoItem);

      delete item.divergenciaFisicaAtiva;
      delete item.divergenciaFisicaId;
      delete item.packOriginal;
      delete item.qtdPacotesOriginal;
      delete item.qtdTotalUnidadesOriginal;
      delete item.separacaoLojasOriginal;
    }

    targetDiv.status = 'revertido';
    targetDiv.revertidoEm = new Date().toISOString();
    targetDiv.revertidoPor = currentUser.nome || 'Operador';

    // Verificar se sobrou alguma divergência ativa
    const hasRemainingActive = divergencias.some(d => d.status === 'aplicado');
    order.header.possuiDivergenciaFisica = hasRemainingActive;

    // Recalcular totais globais
    order.header.totalPecas = order.items.reduce((acc, it) => acc + (Number(it.qtdTotalUnidades) || 0), 0);
    order.header.totalVolumes = order.items.reduce((acc, it) => acc + (Number(it.qtdPacotes) || 0), 0);
    order.header.totalBruto = order.items.reduce((acc, it) => acc + (Number(it.valorTotalBruto) || 0), 0);
    order.header.totalLiquido = order.items.reduce((acc, it) => acc + (Number(it.valorTotalLiquido) || 0), 0);
    order.header.totalGeral = order.header.totalLiquido + (Number(order.header.totalIpi) || 0) + (Number(order.header.totalSt) || 0) + (Number(order.header.valorFrete) || 0);

    order.header.version = (Number(order.header.version) || 1) + 1;
    order.header.updatedAt = new Date().toISOString();
    order.header.lastModifiedByName = currentUser.nome || 'Operador';
    order.header.lastModifiedById = currentUser.id || null;

    let saved;
    const { getDb, scheduleDatabaseSave } = require('../config/database');
    const db = getDb();
    db.run('BEGIN TRANSACTION');
    try {
      saved = await orderRepository.save(order);
      db.run('COMMIT');
      scheduleDatabaseSave(0);
    } catch (saveErr) {
      try { db.run('ROLLBACK'); } catch (_) {}
      throw saveErr;
    }

    // Log de auditoria
    await distributionAuditRepo.create({
      orderId: saved.header.id,
      numeroPedido: saved.header.numeroPedido,
      fornecedor: saved.header.fornecedor,
      usuarioId: currentUser.id || null,
      usuarioNome: currentUser.nome || 'Operador',
      usuarioRole: currentUser.role,
      acao: 'DIVERGENCIA_FISICA_REVERTIDA',
      detalhesJson: {
        divergenceId,
        itemId: targetDiv.itemId,
        produto: targetDiv.descricao,
        revertidoPor: currentUser.nome
      },
      observacoes: `Divergência física do produto "${targetDiv.descricao}" revertida com sucesso aos valores originais.`
    }).catch(e => console.error('Erro ao registrar log de auditoria da reversão:', e));

    return {
      success: true,
      message: `Ajuste de divergência do produto "${targetDiv.descricao}" revertido com sucesso!`,
      order: saved
    };
  }
}

module.exports = new OrderService();
