const { queryAll, queryOne, execute } = require('../config/database');

const DEFAULT_PAYMENT_CONDITIONS = [
  { id: 'cond_30_60_90', descricao: '30/60/90 Dias', qtdParcelas: 3, parcelasDias: [30, 60, 90], especie: 'Boleto', ativo: 1, padrao: 1 },
  { id: 'cond_7_14_21_28', descricao: '7/14/21/28 Dias', qtdParcelas: 4, parcelasDias: [7, 14, 21, 28], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_14_21_28_35_42_49_56', descricao: '14/21/28/35/42/49/56 Dias', qtdParcelas: 7, parcelasDias: [14, 21, 28, 35, 42, 49, 56], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_28_35_42', descricao: '28/35/42 Dias', qtdParcelas: 3, parcelasDias: [28, 35, 42], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_28_35_42_49_56', descricao: '28/35/42/49/56 Dias', qtdParcelas: 5, parcelasDias: [28, 35, 42, 49, 56], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_60', descricao: '30/60 Dias', qtdParcelas: 2, parcelasDias: [30, 60], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_45_60', descricao: '30/45/60 Dias', qtdParcelas: 3, parcelasDias: [30, 45, 60], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_40_50_60', descricao: '30/40/50/60 Dias', qtdParcelas: 4, parcelasDias: [30, 40, 50, 60], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_45_60_75_90', descricao: '30/45/60/75/90 Dias', qtdParcelas: 5, parcelasDias: [30, 45, 60, 75, 90], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_40_50_60_70_80_90', descricao: '30/40/50/60/70/80/90 Dias', qtdParcelas: 7, parcelasDias: [30, 40, 50, 60, 70, 80, 90], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_60_90_120', descricao: '30/60/90/120 Dias', qtdParcelas: 4, parcelasDias: [30, 60, 90, 120], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_45_60_75_90_105_120', descricao: '30/45/60/75/90/105/120 Dias', qtdParcelas: 7, parcelasDias: [30, 45, 60, 75, 90, 105, 120], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_40_50_60_70_80_90_100_110_120', descricao: '30/40/50/60/70/80/90/100/110/120 Dias', qtdParcelas: 10, parcelasDias: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_60_90_120_150', descricao: '30/60/90/120/150 Dias', qtdParcelas: 5, parcelasDias: [30, 60, 90, 120, 150], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_45_60_75_90_105_120_135_150', descricao: '30/45/60/75/90/105/120/135/150 Dias', qtdParcelas: 9, parcelasDias: [30, 45, 60, 75, 90, 105, 120, 135, 150], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30_40_50_60_70_80_90_100_110_120_130_140_150', descricao: '30/40/50/60/70/80/90/100/110/120/130/140/150 Dias', qtdParcelas: 13, parcelasDias: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_45_60_75_90', descricao: '45/60/75/90 Dias', qtdParcelas: 4, parcelasDias: [45, 60, 75, 90], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_45_55_65_75_85_95_105_115', descricao: '45/55/65/75/85/95/105/115 Dias', qtdParcelas: 8, parcelasDias: [45, 55, 65, 75, 85, 95, 105, 115], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_45_60_75_90_105_120', descricao: '45/60/75/90/105/120 Dias', qtdParcelas: 6, parcelasDias: [45, 60, 75, 90, 105, 120], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_45_60_75_90_105_120_135_150', descricao: '45/60/75/90/105/120/135/150 Dias', qtdParcelas: 8, parcelasDias: [45, 60, 75, 90, 105, 120, 135, 150], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_45_55_65_75_85_95_105_115_125_135_145_155', descricao: '45/55/65/75/85/95/105/115/125/135/145/155 Dias', qtdParcelas: 12, parcelasDias: [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_30', descricao: '30 Dias (1x)', qtdParcelas: 1, parcelasDias: [30], especie: 'Boleto', ativo: 1, padrao: 0 },
  { id: 'cond_vista', descricao: '100% À Vista (TED/PIX)', qtdParcelas: 1, parcelasDias: [0], especie: 'Depósito / Transferência', ativo: 1, padrao: 0 },
  { id: 'cond_dep_boleto_30_60_90', descricao: 'Entrada + 30/60/90 Dias (Misto)', qtdParcelas: 4, parcelasDias: [0, 30, 60, 90], especie: 'Boleto / Depósito', ativo: 1, padrao: 0, isFormaDupla: true, depositoParcelasCount: 1, saldoParcelasCount: 3 }
];

class PaymentConditionRepository {
  async ensureDefaults() {
    try {
      const hasPadrao = await queryOne("SELECT id FROM payment_conditions WHERE padrao = 1");
      const now = new Date().toISOString();

      for (const c of DEFAULT_PAYMENT_CONDITIONS) {
        const existing = await queryOne("SELECT id FROM payment_conditions WHERE id = ? OR descricao = ?", [c.id, c.descricao]);
        if (!existing) {
          const configJson = JSON.stringify({
            isFormaDupla: Boolean(c.isFormaDupla),
            depositoParcelasCount: c.depositoParcelasCount,
            saldoParcelasCount: c.saldoParcelasCount
          });
          const padraoValue = (!hasPadrao && c.padrao === 1) ? 1 : 0;
          try {
            await execute(`
              INSERT INTO payment_conditions (
                id, descricao, qtdParcelas, parcelasDiasJson, especie, banco, ativo, padrao, observacao, configJson, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, '', ?, ?, '', ?, ?, ?)
            `, [
              c.id,
              c.descricao,
              c.qtdParcelas,
              JSON.stringify(c.parcelasDias),
              c.especie,
              c.ativo,
              padraoValue,
              configJson,
              now,
              now
            ]);
          } catch (insertErr) {
            // Fallback se coluna configJson ainda não existir
            await execute(`
              INSERT INTO payment_conditions (
                id, descricao, qtdParcelas, parcelasDiasJson, especie, banco, ativo, padrao, observacao, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, '', ?, ?, '', ?, ?)
            `, [
              c.id,
              c.descricao,
              c.qtdParcelas,
              JSON.stringify(c.parcelasDias),
              c.especie,
              c.ativo,
              padraoValue,
              now,
              now
            ]);
          }
        }
      }
    } catch (err) {
      console.error('Aviso ao semear condições de pagamento padrão no repositório:', err.message);
    }
  }

  async findAll({ onlyActive = false } = {}) {
    await this.ensureDefaults();
    const sql = onlyActive
      ? "SELECT * FROM payment_conditions WHERE ativo = 1 ORDER BY padrao DESC, descricao ASC"
      : "SELECT * FROM payment_conditions ORDER BY padrao DESC, ativo DESC, descricao ASC";
    const rows = await queryAll(sql);
    return rows.map(r => this._hydrate(r));
  }

  async findById(id) {
    const row = await queryOne("SELECT * FROM payment_conditions WHERE id = ?", [id]);
    return row ? this._hydrate(row) : null;
  }

  async upsert(condition) {
    const now = new Date().toISOString();
    const condId = condition.id || ('cond_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const existing = await this.findById(condId);

    const descricao = (condition.descricao || '').trim();
    if (!descricao) {
      throw new Error('Descrição da condição de pagamento é obrigatória.');
    }

    const qtdParcelas = Math.max(1, parseInt(condition.qtdParcelas, 10) || 1);
    
    // Normalizar parcelasDias para array de números inteiros
    let parcelasDias = [];
    if (Array.isArray(condition.parcelasDias)) {
      parcelasDias = condition.parcelasDias.map(d => Math.max(0, parseInt(d, 10) || 0));
    } else if (typeof condition.parcelasDiasJson === 'string') {
      try {
        const parsed = JSON.parse(condition.parcelasDiasJson);
        if (Array.isArray(parsed)) {
          parcelasDias = parsed.map(d => Math.max(0, parseInt(d, 10) || 0));
        }
      } catch (e) {
        parcelasDias = [];
      }
    }

    // Se faltarem dias para o número de parcelas, preencher com múltiplos padrão (ex: 30, 60, 90)
    while (parcelasDias.length < qtdParcelas) {
      const step = 30;
      const last = parcelasDias.length > 0 ? parcelasDias[parcelasDias.length - 1] : 0;
      parcelasDias.push(last + step);
    }
    if (parcelasDias.length > qtdParcelas) {
      parcelasDias = parcelasDias.slice(0, qtdParcelas);
    }

    const parcelasDiasJson = JSON.stringify(parcelasDias);
    const especie = condition.especie || 'Boleto';
    const banco = condition.banco || '';
    const ativo = condition.ativo !== undefined ? (condition.ativo ? 1 : 0) : 1;
    const padrao = condition.padrao ? 1 : 0;
    const observacao = condition.observacao || '';

    const configData = {
      isFormaDupla: Boolean(condition.isFormaDupla),
      depositoParcelasCount: condition.depositoParcelasCount,
      depositoPrazoDias: condition.depositoPrazoDias,
      depositoParcelasDias: condition.depositoParcelasDias,
      saldoParcelasCount: condition.saldoParcelasCount,
      saldoPrazoDias: condition.saldoPrazoDias,
      saldoParcelasDias: condition.saldoParcelasDias,
      percentualEntradaPadrao: condition.percentualEntradaPadrao,
      depositoForma: condition.depositoForma,
      saldoForma: condition.saldoForma
    };
    const configJson = JSON.stringify(configData);

    // Se estiver marcando como padrão, desmarcar os outros
    if (padrao === 1) {
      await execute("UPDATE payment_conditions SET padrao = 0 WHERE id != ?", [condId]);
    }

    if (existing) {
      try {
        await execute(`
          UPDATE payment_conditions SET
            descricao = ?,
            qtdParcelas = ?,
            parcelasDiasJson = ?,
            especie = ?,
            banco = ?,
            ativo = ?,
            padrao = ?,
            observacao = ?,
            configJson = ?,
            updatedAt = ?
          WHERE id = ?
        `, [
          descricao,
          qtdParcelas,
          parcelasDiasJson,
          especie,
          banco,
          ativo,
          padrao,
          observacao,
          configJson,
          now,
          condId
        ]);
      } catch (err) {
        // Fallback se coluna configJson ainda não existir
        await execute(`
          UPDATE payment_conditions SET
            descricao = ?,
            qtdParcelas = ?,
            parcelasDiasJson = ?,
            especie = ?,
            banco = ?,
            ativo = ?,
            padrao = ?,
            observacao = ?,
            updatedAt = ?
          WHERE id = ?
        `, [
          descricao,
          qtdParcelas,
          parcelasDiasJson,
          especie,
          banco,
          ativo,
          padrao,
          observacao,
          now,
          condId
        ]);
      }
    } else {
      try {
        await execute(`
          INSERT INTO payment_conditions (
            id, descricao, qtdParcelas, parcelasDiasJson, especie, banco, ativo, padrao, observacao, configJson, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          condId,
          descricao,
          qtdParcelas,
          parcelasDiasJson,
          especie,
          banco,
          ativo,
          padrao,
          observacao,
          configJson,
          condition.createdAt || now,
          now
        ]);
      } catch (err) {
        // Fallback se coluna configJson ainda não existir
        await execute(`
          INSERT INTO payment_conditions (
            id, descricao, qtdParcelas, parcelasDiasJson, especie, banco, ativo, padrao, observacao, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          condId,
          descricao,
          qtdParcelas,
          parcelasDiasJson,
          especie,
          banco,
          ativo,
          padrao,
          observacao,
          condition.createdAt || now,
          now
        ]);
      }
    }

    return await this.findById(condId);
  }

  async delete(id) {
    await execute("DELETE FROM payment_conditions WHERE id = ?", [id]);
    return true;
  }

  _hydrate(row) {
    if (!row) return null;
    let parcelasDias = [];
    try {
      if (row.parcelasDiasJson) {
        parcelasDias = JSON.parse(row.parcelasDiasJson);
      }
    } catch (e) {
      parcelasDias = [];
    }

    let config = {};
    try {
      if (row.configJson) {
        config = JSON.parse(row.configJson);
      }
    } catch (e) {
      config = {};
    }

    return {
      id: row.id,
      descricao: row.descricao,
      qtdParcelas: Number(row.qtdParcelas) || 1,
      parcelasDias: Array.isArray(parcelasDias) ? parcelasDias : [],
      parcelasDiasJson: row.parcelasDiasJson || '[]',
      especie: row.especie || 'Boleto',
      banco: row.banco || '',
      ativo: Boolean(row.ativo),
      padrao: Boolean(row.padrao),
      observacao: row.observacao || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...(config || {})
    };
  }
}

module.exports = new PaymentConditionRepository();
