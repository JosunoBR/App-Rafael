const { queryAll, queryOne, execute } = require('../config/database');

class DistributionAuditRepository {
  async findAll(limit = 100) {
    return await queryAll("SELECT * FROM order_distribution_logs ORDER BY timestamp DESC LIMIT ?", [limit]);
  }

  async findByOrderId(orderId, numeroPedido = null) {
    const targetId = orderId ? String(orderId).trim() : '';
    const targetNumero = numeroPedido ? String(numeroPedido).trim() : (targetId.startsWith('PED-') ? targetId : '');

    // 1. Logs da tabela dedicada de eventos de esteira
    const logs = await queryAll(
      `SELECT * FROM order_distribution_logs 
       WHERE orderId = ? OR numeroPedido = ? OR (orderId != '' AND orderId = ?) OR (numeroPedido != '' AND numeroPedido = ?)
       ORDER BY timestamp DESC`, 
      [targetId, targetId, targetNumero, targetNumero]
    );

    // 2. Busca o pedido no SQLite para extrair os marcos oficiais já persistidos no banco
    const orderRow = await queryOne(
      `SELECT * FROM purchase_orders 
       WHERE id = ? OR numeroPedido = ? OR (id != '' AND id = ?) OR (numeroPedido != '' AND numeroPedido = ?) LIMIT 1`,
      [targetId, targetId, targetNumero, targetNumero]
    );

    if (!orderRow) {
      return logs;
    }

    const synthesizedLogs = [];

    // Marco: Criação do Pedido
    if (orderRow.createdAt) {
      synthesizedLogs.push({
        id: `synth_create_${orderRow.id}`,
        orderId: orderRow.id,
        numeroPedido: orderRow.numeroPedido,
        fornecedor: orderRow.fornecedor,
        usuarioNome: 'Comprador',
        usuarioRole: 'comprador',
        acao: 'CRIACAO_PEDIDO',
        observacoes: `Pedido comercial ${orderRow.numeroPedido} criado e iniciado na esteira em cotação.`,
        timestamp: orderRow.createdAt,
        createdAt: orderRow.createdAt
      });
    }

    // Marco: Aprovação Comercial
    if (orderRow.aprovadoPor || orderRow.dataAprovacao) {
      synthesizedLogs.push({
        id: `synth_aprov_${orderRow.id}`,
        orderId: orderRow.id,
        numeroPedido: orderRow.numeroPedido,
        fornecedor: orderRow.fornecedor,
        usuarioNome: orderRow.aprovadoPor || 'Diretoria',
        usuarioRole: 'diretoria',
        acao: 'APROVACAO_COMERCIAL',
        observacoes: `Pedido aprovado comercialmente por ${orderRow.aprovadoPor || 'Diretoria'} e enviado para esteira.`,
        timestamp: orderRow.dataAprovacao || orderRow.updatedAt || orderRow.createdAt,
        createdAt: orderRow.dataAprovacao || orderRow.updatedAt || orderRow.createdAt
      });
    }

    // Marco: Distribuição CD
    if (orderRow.distribuicaoConcluida || orderRow.distribuidoPor) {
      synthesizedLogs.push({
        id: `synth_dist_${orderRow.id}`,
        orderId: orderRow.id,
        numeroPedido: orderRow.numeroPedido,
        fornecedor: orderRow.fornecedor,
        usuarioNome: orderRow.distribuidoPor || 'Root',
        usuarioRole: 'deposito',
        acao: 'LIBERADO_SEPARACAO',
        observacoes: orderRow.observacaoDistribuicao || `Distribuição entre as lojas do CD concluída por ${orderRow.distribuidoPor || 'Root'} e liberada para separação.`,
        timestamp: orderRow.dataDistribuicao || orderRow.updatedAt,
        createdAt: orderRow.dataDistribuicao || orderRow.updatedAt
      });
    }

    // Marco: Separação Concluída
    if (orderRow.separacaoConcluida || orderRow.separadoPor) {
      synthesizedLogs.push({
        id: `synth_sep_${orderRow.id}`,
        orderId: orderRow.id,
        numeroPedido: orderRow.numeroPedido,
        fornecedor: orderRow.fornecedor,
        usuarioNome: orderRow.separadoPor || 'Conferente',
        usuarioRole: 'separacao',
        acao: 'CONFERENCIA_SEPARACAO',
        observacoes: orderRow.observacaoSeparacao || `Separação e conferência na doca concluída por ${orderRow.separadoPor || 'Conferente'}.`,
        timestamp: orderRow.dataSeparacao || orderRow.updatedAt,
        createdAt: orderRow.dataSeparacao || orderRow.updatedAt
      });
    }

    // Marco: Recebimento Matriz
    if (orderRow.recebidoMatriz || orderRow.recebidoPor) {
      synthesizedLogs.push({
        id: `synth_rec_${orderRow.id}`,
        orderId: orderRow.id,
        numeroPedido: orderRow.numeroPedido,
        fornecedor: orderRow.fornecedor,
        usuarioNome: orderRow.recebidoPor || 'Almoxarifado',
        usuarioRole: 'deposito',
        acao: 'RECEBIMENTO_MATRIZ',
        observacoes: `Entrega física do fornecedor recebida na Matriz por ${orderRow.recebidoPor || 'Almoxarifado'}${orderRow.numeroNotaFiscal ? ` (NF: ${orderRow.numeroNotaFiscal})` : ''}.`,
        timestamp: orderRow.dataRecebimentoMatriz || orderRow.updatedAt,
        createdAt: orderRow.dataRecebimentoMatriz || orderRow.updatedAt
      });
    }

    // Marco: Boletos Liberados para Financeiro
    if (orderRow.boletosLiberados || orderRow.boletosLiberadosPor) {
      synthesizedLogs.push({
        id: `synth_fin_${orderRow.id}`,
        orderId: orderRow.id,
        numeroPedido: orderRow.numeroPedido,
        fornecedor: orderRow.fornecedor,
        usuarioNome: orderRow.boletosLiberadosPor || 'Diretoria',
        usuarioRole: 'diretoria',
        acao: 'LIBERACAO_FINANCEIRO',
        observacoes: `Boletos e títulos liberados para o Financeiro por ${orderRow.boletosLiberadosPor || 'Diretoria'}.`,
        timestamp: orderRow.boletosLiberadosEm || orderRow.updatedAt,
        createdAt: orderRow.boletosLiberadosEm || orderRow.updatedAt
      });
    }

    // Marco: Finalização
    if (orderRow.status === 'Finalizado' || orderRow.finalizadoPor) {
      synthesizedLogs.push({
        id: `synth_finz_${orderRow.id}`,
        orderId: orderRow.id,
        numeroPedido: orderRow.numeroPedido,
        fornecedor: orderRow.fornecedor,
        usuarioNome: orderRow.finalizadoPor || 'Diretoria',
        usuarioRole: 'diretoria',
        acao: 'FINALIZACAO_PEDIDO',
        observacoes: `Pedido finalizado com sucesso na esteira por ${orderRow.finalizadoPor || 'Diretoria'}.`,
        timestamp: orderRow.dataFinalizacao || orderRow.updatedAt,
        createdAt: orderRow.dataFinalizacao || orderRow.updatedAt
      });
    }

    // 3. Mescla com os logs existentes deduplicando ações idênticas
    const combined = [...logs];
    for (const s of synthesizedLogs) {
      const alreadyLogged = logs.some(l => 
        l.acao === s.acao || 
        (l.timestamp && s.timestamp && Math.abs(new Date(l.timestamp).getTime() - new Date(s.timestamp).getTime()) < 3000)
      );
      if (!alreadyLogged) {
        combined.push(s);
      }
    }

    // Ordena do mais recente para o mais antigo
    combined.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    return combined;
  }

  async create(log) {
    const id = log.id || ('dist_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO order_distribution_logs (
        id, orderId, numeroPedido, fornecedor,
        usuarioId, usuarioNome, usuarioRole,
        acao, lojasAfetadasJson, totalPecasDistribuidas,
        detalhesJson, observacoes, timestamp, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await execute(sql, [
      id,
      log.orderId,
      log.numeroPedido || '',
      log.fornecedor || '',
      log.usuarioId || null,
      log.usuarioNome || 'Operador',
      log.usuarioRole || 'deposito',
      log.acao || 'DISTRIBUICAO_CONCLUIDA',
      typeof log.lojasAfetadasJson === 'string' ? log.lojasAfetadasJson : JSON.stringify(log.lojasAfetadasJson || []),
      Number(log.totalPecasDistribuidas) || 0,
      typeof log.detalhesJson === 'string' ? log.detalhesJson : JSON.stringify(log.detalhesJson || {}),
      log.observacoes || '',
      log.timestamp || now,
      now
    ]);

    return { id, ...log, timestamp: log.timestamp || now, createdAt: now };
  }
}

module.exports = new DistributionAuditRepository();
