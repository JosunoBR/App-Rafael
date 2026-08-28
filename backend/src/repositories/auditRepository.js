const { queryAll, execute } = require('../config/database');

class AuditRepository {
  async findAll() {
    const rows = await queryAll("SELECT * FROM separation_audit_logs ORDER BY timestamp DESC");
    return rows.map(r => ({
      ...r,
      fotos: r.fotosJson ? JSON.parse(r.fotosJson) : [],
      romaneioData: r.romaneioDataJson ? JSON.parse(r.romaneioDataJson) : null
    }));
  }

  async findByOrderId(orderId) {
    const rows = await queryAll("SELECT * FROM separation_audit_logs WHERE orderId = ? ORDER BY timestamp DESC", [orderId]);
    return rows.map(r => ({
      ...r,
      fotos: r.fotosJson ? JSON.parse(r.fotosJson) : [],
      romaneioData: r.romaneioDataJson ? JSON.parse(r.romaneioDataJson) : null
    }));
  }

  async create(log) {
    const sql = `
      INSERT INTO separation_audit_logs (
        id, orderId, numeroPedido, conferenteNome, conferenteId,
        statusAnterior, novoStatus, totalItensConferidos, totalDivergencias,
        observacoes, fotosJson, romaneioDataJson, timestamp, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const now = new Date().toISOString();
    await execute(sql, [
      log.id || ('audit_' + Date.now()),
      log.orderId,
      log.numeroPedido,
      log.conferenteNome || 'Conferente Doca',
      log.conferenteId || null,
      log.statusAnterior || '',
      log.novoStatus || 'Em Separação',
      Number(log.totalItensConferidos) || 0,
      Number(log.totalDivergencias) || 0,
      log.observacoes || '',
      log.fotos ? JSON.stringify(log.fotos) : null,
      log.romaneioData ? JSON.stringify(log.romaneioData) : null,
      log.timestamp || now,
      now
    ]);
  }
}

module.exports = new AuditRepository();
