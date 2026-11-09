const { queryAll, queryOne, execute } = require('../config/database');

class SeparationPresetRepository {
  async findAll() {
    const rows = await queryAll("SELECT * FROM separation_presets ORDER BY isDefault DESC, name ASC");
    return rows.map(r => this._hydrate(r));
  }

  async findById(id) {
    const row = await queryOne("SELECT * FROM separation_presets WHERE id = ?", [id]);
    return row ? this._hydrate(row) : null;
  }

  async upsert(preset) {
    const now = new Date().toISOString();
    const presetId = preset.id || ('preset_' + Date.now());
    const existing = await this.findById(presetId);
    const storeWeightsJson = typeof preset.storeWeights === 'string'
      ? preset.storeWeights
      : JSON.stringify(preset.storeWeights || {});

    // Se este modelo está sendo definido como padrão, desmarca os demais
    if (preset.isDefault) {
      await execute("UPDATE separation_presets SET isDefault = 0 WHERE id != ?", [presetId]);
    }

    if (existing) {
      await execute(`
        UPDATE separation_presets SET
          name = ?, description = ?, storeWeightsJson = ?,
          reserveStockPercent = ?, isDefault = ?, updatedAt = ?
        WHERE id = ?
      `, [
        preset.name,
        preset.description || '',
        storeWeightsJson,
        Number(preset.reserveStockPercent) || 0,
        preset.isDefault ? 1 : 0,
        now,
        presetId
      ]);
    } else {
      await execute(`
        INSERT INTO separation_presets (
          id, name, description, storeWeightsJson, reserveStockPercent, isDefault, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        presetId,
        preset.name,
        preset.description || '',
        storeWeightsJson,
        Number(preset.reserveStockPercent) || 0,
        preset.isDefault ? 1 : 0,
        preset.createdAt || now,
        now
      ]);
    }

    return await this.findById(presetId);
  }

  async setDefault(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Modelo de separação não encontrado.');
    }
    const now = new Date().toISOString();
    await execute("UPDATE separation_presets SET isDefault = 0");
    await execute("UPDATE separation_presets SET isDefault = 1, updatedAt = ? WHERE id = ?", [now, id]);
    return await this.findAll();
  }

  async delete(id) {
    // Não permitir deletar o padrão ativo diretamente
    const existing = await this.findById(id);
    if (existing && existing.isDefault) {
      throw new Error('O modelo padrão atual não pode ser excluído diretamente. Defina outro modelo como padrão antes de excluí-lo.');
    }
    await execute("DELETE FROM separation_presets WHERE id = ?", [id]);
    return true;
  }

  _hydrate(row) {
    if (!row) return null;
    let storeWeights = {};
    if (row.storeWeightsJson) {
      try {
        storeWeights = JSON.parse(row.storeWeightsJson);
      } catch {}
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      storeWeights,
      storeWeightsJson: row.storeWeightsJson,
      reserveStockPercent: Number(row.reserveStockPercent) || 0,
      isDefault: Boolean(row.isDefault),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

module.exports = new SeparationPresetRepository();
