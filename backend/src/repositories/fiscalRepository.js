const { queryAll, queryOne, execute } = require('../config/database');

class FiscalRepository {
  async getFiscalConfig() {
    let row = await queryOne("SELECT * FROM fiscal_config WHERE id = 'default'");
    if (!row) {
      const now = new Date().toISOString();
      await execute(`
        INSERT INTO fiscal_config (id, icmsAliquota, ipiAliquota, pisCofinsAliquota, custosFixos, creditoEntradaICMS, updatedAt)
        VALUES ('default', 0.11, 0.00, 0.03, 0.26, 0.195, ?)
      `, [now]);
      row = await queryOne("SELECT * FROM fiscal_config WHERE id = 'default'");
    }
    return row;
  }

  async updateFiscalConfig(cfg) {
    const now = new Date().toISOString();
    await execute(`
      UPDATE fiscal_config SET
        icmsAliquota = ?, ipiAliquota = ?, pisCofinsAliquota = ?,
        custosFixos = ?, creditoEntradaICMS = ?, updatedAt = ?
      WHERE id = 'default'
    `, [
      Number(cfg.icmsAliquota) || 0.11,
      Number(cfg.ipiAliquota) || 0.00,
      Number(cfg.pisCofinsAliquota) || 0.03,
      Number(cfg.custosFixos) || 0.26,
      Number(cfg.creditoEntradaICMS) || 0.195,
      now
    ]);
    return await this.getFiscalConfig();
  }

  async getStores() {
    return await queryAll("SELECT * FROM stores WHERE active = 1 ORDER BY cluster ASC, name ASC");
  }
}

module.exports = new FiscalRepository();
