const { queryAll, execute } = require('../config/database');

class DistributionAuditRepository {
  async findAll(limit = 100) {
    return await queryAll("SELECT * FROM order_distribution_logs ORDER BY timestamp DESC LIMIT ?", [limit]);
  }

  async findByOrderId(orderId) {
    return await queryAll(
      "SELECT * FROM order_distribution_logs WHERE orderId = ? OR numeroPedido = ? ORDER BY timestamp DESC", 
      [orderId, orderId]
    );
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
