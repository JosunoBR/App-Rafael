const { queryAll, execute } = require('../config/database');

class FinancialAuditRepository {
  async findAll(limit = 100) {
    return await queryAll("SELECT * FROM financial_audit_logs ORDER BY timestamp DESC LIMIT ?", [limit]);
  }

  async findByEntryId(entryId) {
    return await queryAll("SELECT * FROM financial_audit_logs WHERE entryId = ? ORDER BY timestamp DESC", [entryId]);
  }

  async findByOrderId(orderId) {
    return await queryAll(
      "SELECT * FROM financial_audit_logs WHERE orderId = ? OR numeroPedido = ? ORDER BY timestamp DESC", 
      [orderId, orderId]
    );
  }

  async create(log) {
    const id = log.id || ('fin_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO financial_audit_logs (
        id, entryId, orderId, numeroPedido, descricao,
        usuarioId, usuarioNome, usuarioRole,
        acao, campoAlterado, valorAnterior, valorNovo,
        snapshotJson, observacao, timestamp, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await execute(sql, [
      id,
      log.entryId || null,
      log.orderId || null,
      log.numeroPedido || '',
      log.descricao || '',
      log.usuarioId || null,
      log.usuarioNome || 'Sistema / Faturamento',
      log.usuarioRole || 'faturamento',
      log.acao || 'UPDATE_BOLETO',
      log.campoAlterado || '',
      String(log.valorAnterior ?? ''),
      String(log.valorNovo ?? ''),
      typeof log.snapshotJson === 'string' ? log.snapshotJson : JSON.stringify(log.snapshotJson || {}),
      log.observacao || '',
      log.timestamp || now,
      now
    ]);

    return { id, ...log, timestamp: log.timestamp || now, createdAt: now };
  }
}

module.exports = new FinancialAuditRepository();
