const { queryAll, execute } = require('../config/database');

class DeletionAuditRepository {
  async findAll() {
    return await queryAll("SELECT * FROM order_deletion_logs ORDER BY dataExclusao DESC");
  }

  async findByOrderId(orderId) {
    return await queryAll("SELECT * FROM order_deletion_logs WHERE orderId = ? OR numeroPedido = ? ORDER BY dataExclusao DESC", [orderId, orderId]);
  }

  async create(log) {
    const sql = `
      INSERT INTO order_deletion_logs (
        id, orderId, numeroPedido, tipoPedido, fornecedor,
        solicitadoPorNome, solicitadoPorEmail,
        autorizadoPorNome, autorizadoPorEmail,
        motivo, totalPecasEstornadas, totalValor,
        snapshotJson, dataExclusao, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const now = new Date().toISOString();
    await execute(sql, [
      log.id || ('del_log_' + Date.now()),
      log.orderId,
      log.numeroPedido,
      log.tipoPedido || 'compra_fornecedor',
      log.fornecedor || '',
      log.solicitadoPorNome || 'Usuário do Sistema',
      log.solicitadoPorEmail || '',
      log.autorizadoPorNome || 'Diretoria',
      log.autorizadoPorEmail || '',
      log.motivo || 'Exclusão autorizada pela diretoria',
      Number(log.totalPecasEstornadas) || 0,
      Number(log.totalValor) || 0,
      typeof log.snapshotJson === 'string' ? log.snapshotJson : JSON.stringify(log.snapshotJson || {}),
      log.dataExclusao || now,
      now
    ]);
  }
}

module.exports = new DeletionAuditRepository();
