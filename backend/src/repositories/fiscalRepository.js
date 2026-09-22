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
    return await queryAll("SELECT * FROM stores ORDER BY cluster ASC, name ASC");
  }

  async updateStores(stores) {
    if (!Array.isArray(stores)) return await this.getStores();

    const incomingIds = stores.map(s => s.id).filter(Boolean);

    // 1. Inserir ou atualizar lojas enviadas
    for (const store of stores) {
      if (!store.id) continue;
      const existing = await queryOne("SELECT id FROM stores WHERE id = ?", [store.id]);
      if (existing) {
        await execute(`
          UPDATE stores SET
            name = ?, shortName = ?, cluster = ?, defaultWeight = ?, active = ?
          WHERE id = ?
        `, [
          (store.name || '').trim(),
          (store.shortName || store.name || '').trim(),
          store.cluster || 'A',
          Math.max(0, Number(store.defaultWeight) || 0),
          store.active ? 1 : 0,
          store.id
        ]);
      } else {
        await execute(`
          INSERT INTO stores (id, name, shortName, cluster, defaultWeight, active)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          store.id,
          (store.name || '').trim(),
          (store.shortName || store.name || '').trim(),
          store.cluster || 'A',
          Math.max(0, Number(store.defaultWeight) || 0),
          store.active ? 1 : 0
        ]);
      }
    }

    // 2. Remover lojas que não estão mais presentes na lista (se houver IDs válidos)
    if (incomingIds.length > 0) {
      const allCurrent = await queryAll("SELECT id FROM stores");
      for (const cur of allCurrent) {
        if (!incomingIds.includes(cur.id)) {
          await execute("DELETE FROM stores WHERE id = ?", [cur.id]);
        }
      }
    }

    return await this.getStores();
  }
}

module.exports = new FiscalRepository();
