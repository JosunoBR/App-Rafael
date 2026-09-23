const { queryAll, queryOne, execute, getDatabase, flushDatabaseToDisk } = require('../config/database');

/**
 * Converte qualquer data para formato brasileiro oficial DD/MM/YYYY
 */
function toBrDate(val) {
  if (!val) return '';
  const str = String(val).trim();
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${day}/${month}/${year}`;
  }
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  return str;
}

class FinancialRepository {
  /**
   * Busca registros com filtros múltiplos: mês, ano, loja, categoria, status, tipo, busca de texto.
   * Suporta formato brasileiro DD/MM/YYYY e legado YYYY-MM-DD.
   */
  async findAll({ month, year, storeId, lojaNome, categoria, status, tipo, search, empresa, statusPrevisao, formaPagamento } = {}) {
    let sql = 'SELECT * FROM financial_entries WHERE 1=1';
    const params = [];

    // Filtro por Ano/Mês no formato brasileiro DD/MM/YYYY e compatibilidade legada YYYY-MM-DD
    if (year && year !== 'all' && month && month !== 'all') {
      const formattedMonth = String(month).padStart(2, '0');
      sql += ' AND (dataVencimento LIKE ? OR dataVencimento LIKE ?)';
      params.push(`%/${formattedMonth}/${year}`, `${year}-${formattedMonth}-%`);
    } else if (year && year !== 'all') {
      sql += ' AND (dataVencimento LIKE ? OR dataVencimento LIKE ?)';
      params.push(`%/${year}`, `${year}-%`);
    } else if (month && month !== 'all') {
      const formattedMonth = String(month).padStart(2, '0');
      sql += ' AND (dataVencimento LIKE ? OR dataVencimento LIKE ?)';
      params.push(`%/${formattedMonth}/%`, `%-${formattedMonth}-%`);
    }

    if (storeId) {
      sql += ' AND storeId = ?';
      params.push(storeId);
    }

    if (lojaNome) {
      sql += ' AND (lojaNome = ? OR storeId = ?)';
      params.push(lojaNome, lojaNome);
    }

    if (categoria && categoria !== 'all') {
      sql += ' AND categoria = ?';
      params.push(categoria.toUpperCase());
    }

    if (status && status !== 'all') {
      if (status === 'pendente' || status === 'aberto' || status === 'nao_pago') {
        sql += " AND status != 'Pago'";
      } else {
        sql += ' AND status = ?';
        params.push(status);
      }
    }

    if (tipo && tipo !== 'all') {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }

    if (empresa && empresa !== 'all') {
      sql += ' AND empresa = ?';
      params.push(empresa);
    }

    if (statusPrevisao && statusPrevisao !== 'all') {
      sql += ' AND UPPER(statusPrevisao) = ?';
      params.push(statusPrevisao.toUpperCase());
    }

    if (formaPagamento && formaPagamento !== 'all') {
      const fpUpper = formaPagamento.toUpperCase();
      if (fpUpper === 'BOLETO') {
        sql += ' AND UPPER(formaPagamento) LIKE ?';
        params.push('%BOLETO%');
      } else if (fpUpper === 'DEPOSITO' || fpUpper === 'DEPÓSITO') {
        sql += ' AND (UPPER(formaPagamento) LIKE ? OR UPPER(formaPagamento) LIKE ?)';
        params.push('%DEPÓSITO%', '%DEPOSITO%');
      } else if (fpUpper === 'DINHEIRO_PIX' || fpUpper === 'PIX' || fpUpper === 'DINHEIRO') {
        sql += ' AND (UPPER(formaPagamento) LIKE ? OR UPPER(formaPagamento) LIKE ?)';
        params.push('%DINHEIRO%', '%PIX%');
      } else {
        sql += ' AND UPPER(formaPagamento) = ?';
        params.push(fpUpper);
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(descricao) LIKE ? OR LOWER(fornecedor) LIKE ? OR LOWER(documentoRef) LIKE ? OR LOWER(observacao) LIKE ? OR LOWER(bancoConta) LIKE ?)';
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY 
      CASE 
        WHEN dataVencimento LIKE '__/__/____' THEN 
          SUBSTR(dataVencimento, 7, 4) || '-' || SUBSTR(dataVencimento, 4, 2) || '-' || SUBSTR(dataVencimento, 1, 2)
        ELSE dataVencimento 
      END ASC, createdAt ASC`;

    const rows = await queryAll(sql, params);
    return rows.map(r => this._hydrate(r));
  }

  async findById(id) {
    const row = await queryOne('SELECT * FROM financial_entries WHERE id = ?', [id]);
    return row ? this._hydrate(row) : null;
  }

  async findByOrderId(orderId) {
    const rows = await queryAll('SELECT * FROM financial_entries WHERE orderId = ? ORDER BY dataVencimento ASC', [orderId]);
    return rows.map(r => this._hydrate(r));
  }

  async create(entry) {
    const nowIso = new Date().toISOString();
    const now = new Date();
    const todayBr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const id = entry.id || ('fin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const normalizedVencimento = toBrDate(entry.dataVencimento) || todayBr;
    const normalizedPagamento = entry.dataPagamento ? toBrDate(entry.dataPagamento) : null;

    await execute(`
      INSERT INTO financial_entries (
        id, tipo, orderId, installmentId, descricao, categoria, fornecedor,
        storeId, lojaNome, empresa, formaPagamento, bancoConta, documentoRef,
        parcelaNumero, parcelaTotal, parcelaDesc, dataVencimento, valor,
        status, dataPagamento, valorPago, observacao, recorrente, recorrenciaId, statusPrevisao,
        comprovanteNome, comprovanteTipo, comprovanteTamanho, comprovanteArquivo, comprovanteUrl,
        comprovantesJson, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      entry.tipo || 'despesa',
      entry.orderId || null,
      entry.installmentId || null,
      entry.descricao || 'Despesa',
      (entry.categoria || 'OPERACIONAL').toUpperCase(),
      entry.fornecedor || '',
      entry.storeId || '',
      entry.lojaNome || '',
      entry.empresa || 'ALS',
      (entry.formaPagamento || 'BOLETO').toUpperCase(),
      entry.bancoConta || '',
      entry.documentoRef || '',
      parseInt(entry.parcelaNumero, 10) || 1,
      parseInt(entry.parcelaTotal, 10) || 1,
      entry.parcelaDesc || 'Única',
      normalizedVencimento,
      parseFloat(entry.valor) || 0,
      entry.status || 'A Vencer',
      normalizedPagamento,
      entry.valorPago !== undefined ? parseFloat(entry.valorPago) : (entry.status === 'Pago' ? parseFloat(entry.valor) : 0),
      entry.observacao || '',
      entry.recorrente ? 1 : 0,
      entry.recorrenciaId || null,
      (entry.statusPrevisao || 'CONFIRMADO').toUpperCase(),
      entry.comprovanteNome || null,
      entry.comprovanteTipo || null,
      entry.comprovanteTamanho !== undefined && entry.comprovanteTamanho !== null ? Number(entry.comprovanteTamanho) : null,
      entry.comprovanteArquivo || null,
      entry.comprovanteUrl || null,
      entry.comprovantesJson || (entry.comprovantes ? JSON.stringify(entry.comprovantes) : null),
      entry.createdAt || nowIso,
      nowIso
    ]);

    return await this.findById(id);
  }

  async createBatch(entries) {
    const results = [];
    for (const entry of entries) {
      const created = await this.create(entry);
      results.push(created);
    }
    return results;
  }

  async importBatch({ entries, targetYear, targetMonth, mode = 'append' }) {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const now = new Date();
    const todayBr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Transação SQLite atômica
    db.run("BEGIN TRANSACTION;");
    try {
      if (mode === 'replace_month' && targetYear && targetMonth) {
        const formattedMonth = String(targetMonth).padStart(2, '0');
        const deleteSql = `
          DELETE FROM financial_entries 
          WHERE (dataVencimento LIKE ? OR dataVencimento LIKE ?)
            AND status != 'Pago'
            AND (tipo = 'despesa' OR orderId IS NULL)
        `;
        db.run(deleteSql, [`%/${formattedMonth}/${targetYear}`, `${targetYear}-${formattedMonth}-%`]);
      }

      const insertSql = `
        INSERT INTO financial_entries (
          id, tipo, orderId, installmentId, descricao, categoria, fornecedor,
          storeId, lojaNome, empresa, formaPagamento, bancoConta, documentoRef,
          parcelaNumero, parcelaTotal, parcelaDesc, dataVencimento, valor,
          status, dataPagamento, valorPago, observacao, recorrente, recorrenciaId, statusPrevisao,
          comprovanteNome, comprovanteTipo, comprovanteTamanho, comprovanteArquivo, comprovanteUrl,
          comprovantesJson, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

      let insertedCount = 0;
      let totalValor = 0;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const val = parseFloat(entry.valor) || 0;
        if (val <= 0 && !entry.descricao) continue;

        const id = entry.id || ('fin_imp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 6));
        const normalizedVencimento = toBrDate(entry.dataVencimento) || todayBr;
        const normalizedPagamento = entry.dataPagamento ? toBrDate(entry.dataPagamento) : null;
        const status = entry.status || (entry.valorPago && entry.valorPago >= val ? 'Pago' : 'A Vencer');

        db.run(insertSql, [
          id,
          entry.tipo || (entry.categoria === 'PRODUTOS' ? 'pedido_parcela' : 'despesa'),
          entry.orderId || null,
          entry.installmentId || null,
          String(entry.descricao || 'Despesa').trim(),
          String(entry.categoria || 'OPERACIONAL').trim().toUpperCase(),
          String(entry.fornecedor || '').trim(),
          String(entry.storeId || '').trim(),
          String(entry.lojaNome || 'ALS').trim(),
          String(entry.empresa || 'ALS').trim(),
          String(entry.formaPagamento || 'BOLETO').trim().toUpperCase(),
          String(entry.bancoConta || '').trim(),
          String(entry.documentoRef || '').trim(),
          parseInt(entry.parcelaNumero, 10) || 1,
          parseInt(entry.parcelaTotal, 10) || 1,
          String(entry.parcelaDesc || 'Única').trim(),
          normalizedVencimento,
          val,
          status,
          normalizedPagamento,
          entry.valorPago !== undefined ? parseFloat(entry.valorPago) : (status === 'Pago' ? val : 0),
          String(entry.observacao || '').trim(),
          entry.recorrente ? 1 : 0,
          entry.recorrenciaId || null,
          (entry.statusPrevisao || 'CONFIRMADO').toUpperCase(),
          entry.comprovanteNome || null,
          entry.comprovanteTipo || null,
          entry.comprovanteTamanho !== undefined && entry.comprovanteTamanho !== null ? Number(entry.comprovanteTamanho) : null,
          entry.comprovanteArquivo || null,
          entry.comprovanteUrl || null,
          entry.comprovantesJson || (entry.comprovantes ? JSON.stringify(entry.comprovantes) : null),
          entry.createdAt || nowIso,
          nowIso
        ]);

        insertedCount++;
        totalValor += val;
      }

      db.run("COMMIT;");
      flushDatabaseToDisk();

      return {
        success: true,
        count: insertedCount,
        totalValor,
        message: `${insertedCount} lançamentos importados com sucesso! (Total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
      };
    } catch (err) {
      try { db.run("ROLLBACK;"); } catch (_) {}
      throw err;
    }
  }

  async update(id, entry) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const normalizedVencimento = entry.dataVencimento !== undefined ? toBrDate(entry.dataVencimento) : toBrDate(existing.dataVencimento);
    const normalizedPagamento = entry.dataPagamento !== undefined ? (entry.dataPagamento ? toBrDate(entry.dataPagamento) : null) : (existing.dataPagamento ? toBrDate(existing.dataPagamento) : null);

    await execute(`
      UPDATE financial_entries SET
        tipo = ?,
        orderId = ?,
        installmentId = ?,
        descricao = ?,
        categoria = ?,
        fornecedor = ?,
        storeId = ?,
        lojaNome = ?,
        empresa = ?,
        formaPagamento = ?,
        bancoConta = ?,
        documentoRef = ?,
        parcelaNumero = ?,
        parcelaTotal = ?,
        parcelaDesc = ?,
        dataVencimento = ?,
        valor = ?,
        status = ?,
        dataPagamento = ?,
        valorPago = ?,
        observacao = ?,
        recorrente = ?,
        recorrenciaId = ?,
        statusPrevisao = ?,
        comprovanteNome = ?,
        comprovanteTipo = ?,
        comprovanteTamanho = ?,
        comprovanteArquivo = ?,
        comprovanteUrl = ?,
        updatedAt = ?
      WHERE id = ?
    `, [
      entry.tipo !== undefined ? entry.tipo : existing.tipo,
      entry.orderId !== undefined ? entry.orderId : existing.orderId,
      entry.installmentId !== undefined ? entry.installmentId : existing.installmentId,
      entry.descricao !== undefined ? entry.descricao : existing.descricao,
      entry.categoria !== undefined ? entry.categoria.toUpperCase() : existing.categoria,
      entry.fornecedor !== undefined ? entry.fornecedor : existing.fornecedor,
      entry.storeId !== undefined ? entry.storeId : existing.storeId,
      entry.lojaNome !== undefined ? entry.lojaNome : existing.lojaNome,
      entry.empresa !== undefined ? entry.empresa : existing.empresa,
      entry.formaPagamento !== undefined ? entry.formaPagamento.toUpperCase() : existing.formaPagamento,
      entry.bancoConta !== undefined ? entry.bancoConta : existing.bancoConta,
      entry.documentoRef !== undefined ? entry.documentoRef : existing.documentoRef,
      entry.parcelaNumero !== undefined ? parseInt(entry.parcelaNumero, 10) : existing.parcelaNumero,
      entry.parcelaTotal !== undefined ? parseInt(entry.parcelaTotal, 10) : existing.parcelaTotal,
      entry.parcelaDesc !== undefined ? entry.parcelaDesc : existing.parcelaDesc,
      normalizedVencimento,
      entry.valor !== undefined ? parseFloat(entry.valor) : existing.valor,
      entry.status !== undefined ? entry.status : existing.status,
      normalizedPagamento,
      entry.valorPago !== undefined ? parseFloat(entry.valorPago) : existing.valorPago,
      entry.observacao !== undefined ? entry.observacao : existing.observacao,
      entry.recorrente !== undefined ? (entry.recorrente ? 1 : 0) : (existing.recorrente ? 1 : 0),
      entry.recorrenciaId !== undefined ? entry.recorrenciaId : existing.recorrenciaId,
      entry.statusPrevisao !== undefined ? entry.statusPrevisao.toUpperCase() : (existing.statusPrevisao || 'CONFIRMADO'),
      entry.comprovanteNome !== undefined ? entry.comprovanteNome : existing.comprovanteNome,
      entry.comprovanteTipo !== undefined ? entry.comprovanteTipo : existing.comprovanteTipo,
      entry.comprovanteTamanho !== undefined ? entry.comprovanteTamanho : existing.comprovanteTamanho,
      entry.comprovanteArquivo !== undefined ? entry.comprovanteArquivo : existing.comprovanteArquivo,
      entry.comprovanteUrl !== undefined ? entry.comprovanteUrl : existing.comprovanteUrl,
      now,
      id
    ]);

    return await this.findById(id);
  }

  async markAsPaid(id, { 
    dataPagamento, 
    valorPago, 
    observacao,
    comprovanteNome,
    comprovanteTipo,
    comprovanteTamanho,
    comprovanteArquivo,
    comprovanteUrl,
    comprovantesJson
  } = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const payDate = dataPagamento || now.substring(0, 10);
    const paidAmount = valorPago !== undefined ? parseFloat(valorPago) : existing.valor;

    await execute(`
      UPDATE financial_entries SET
        status = 'Pago',
        dataPagamento = ?,
        valorPago = ?,
        observacao = CASE WHEN ? != '' THEN ? ELSE observacao END,
        comprovanteNome = COALESCE(?, comprovanteNome),
        comprovanteTipo = COALESCE(?, comprovanteTipo),
        comprovanteTamanho = COALESCE(?, comprovanteTamanho),
        comprovanteArquivo = COALESCE(?, comprovanteArquivo),
        comprovanteUrl = COALESCE(?, comprovanteUrl),
        comprovantesJson = COALESCE(?, comprovantesJson),
        updatedAt = ?
      WHERE id = ?
    `, [
      payDate, 
      paidAmount, 
      observacao || '', 
      observacao || '', 
      comprovanteNome || null,
      comprovanteTipo || null,
      comprovanteTamanho !== undefined ? comprovanteTamanho : null,
      comprovanteArquivo || null,
      comprovanteUrl || null,
      comprovantesJson || null,
      now, 
      id
    ]);

    return await this.findById(id);
  }

  async markMultipleAsPaid(ids, { dataPagamento, observacao } = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const now = new Date().toISOString();
    const payDate = dataPagamento || now.substring(0, 10);

    const placeholders = ids.map(() => '?').join(',');
    let sql = `
      UPDATE financial_entries SET
        status = 'Pago',
        dataPagamento = ?,
        valorPago = CASE WHEN valorPago IS NULL OR valorPago = 0 THEN valor ELSE valorPago END,
        updatedAt = ?
    `;
    const params = [payDate, now];
    if (observacao && observacao.trim()) {
      sql += `, observacao = CASE WHEN observacao IS NOT NULL AND observacao != '' THEN observacao || ' | ' || ? ELSE ? END`;
      params.push(observacao.trim(), observacao.trim());
    }
    sql += ` WHERE id IN (${placeholders})`;
    params.push(...ids);

    await execute(sql, params);

    const selectSql = `SELECT * FROM financial_entries WHERE id IN (${placeholders})`;
    const rows = await queryAll(selectSql, ids);
    return rows.map(r => this._hydrate(r));
  }

  async delete(id) {
    await execute('DELETE FROM financial_entries WHERE id = ?', [id]);
    return true;
  }

  async deleteByOrderId(orderId) {
    await execute('DELETE FROM financial_entries WHERE orderId = ?', [orderId]);
    return true;
  }

  /**
   * Retorna as séries recorrentes ativas agrupadas por recorrenciaId
   * com a data da última parcela existente no banco e os dados do contrato base.
   */
  async findActiveRecurringSeries() {
    const rows = await queryAll(`
      SELECT 
        recorrenciaId,
        descricao,
        categoria,
        fornecedor,
        storeId,
        lojaNome,
        empresa,
        formaPagamento,
        bancoConta,
        documentoRef,
        valor,
        tipo,
        statusPrevisao,
        observacao,
        MAX(dataVencimento) as maxVencimento,
        MIN(dataVencimento) as minVencimento,
        COUNT(*) as totalParcelas
      FROM financial_entries
      WHERE recorrente = 1 AND recorrenciaId IS NOT NULL AND recorrenciaId != ''
      GROUP BY recorrenciaId
    `);
    return rows;
  }

  /**
   * Remove parcelas futuras em aberto de uma série recorrente (ex: encerramento de contrato)
   */
  async deleteFutureRecurringEntries(recorrenciaId, fromDate) {
    await execute(`
      DELETE FROM financial_entries 
      WHERE recorrenciaId = ? 
        AND dataVencimento >= ? 
        AND status != 'Pago'
    `, [recorrenciaId, fromDate]);

    // Marca os registros remanescentes da série como não-recorrentes para impedir reativação pela janela deslizante
    await execute(`
      UPDATE financial_entries 
      SET recorrente = 0 
      WHERE recorrenciaId = ?
    `, [recorrenciaId]);

    return true;
  }

  _hydrate(row) {
    if (!row) return null;
    return {
      id: row.id,
      tipo: row.tipo || 'despesa',
      orderId: row.orderId || null,
      installmentId: row.installmentId || null,
      descricao: row.descricao || '',
      categoria: row.categoria || 'OPERACIONAL',
      fornecedor: row.fornecedor || '',
      storeId: row.storeId || '',
      lojaNome: row.lojaNome || '',
      empresa: row.empresa || 'ALS',
      formaPagamento: row.formaPagamento || 'BOLETO',
      bancoConta: row.bancoConta || '',
      documentoRef: row.documentoRef || '',
      parcelaNumero: Number(row.parcelaNumero) || 1,
      parcelaTotal: Number(row.parcelaTotal) || 1,
      parcelaDesc: row.parcelaDesc || 'Única',
      dataVencimento: toBrDate(row.dataVencimento),
      valor: Number(row.valor) || 0,
      status: row.status || 'A Vencer',
      statusPrevisao: (row.statusPrevisao || 'CONFIRMADO').toUpperCase(),
      dataPagamento: row.dataPagamento ? toBrDate(row.dataPagamento) : null,
      valorPago: Number(row.valorPago) || 0,
      observacao: row.observacao || '',
      recorrente: Boolean(row.recorrente),
      recorrenciaId: row.recorrenciaId || null,
      comprovanteNome: row.comprovanteNome || null,
      comprovanteTipo: row.comprovanteTipo || null,
      comprovanteTamanho: row.comprovanteTamanho !== null && row.comprovanteTamanho !== undefined ? Number(row.comprovanteTamanho) : null,
      comprovanteArquivo: row.comprovanteArquivo || null,
      comprovanteUrl: row.comprovanteUrl || null,
      comprovantesJson: row.comprovantesJson || null,
      comprovantes: (() => {
        if (row.comprovantesJson) {
          try {
            const parsed = JSON.parse(row.comprovantesJson);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch (e) {}
        }
        if (row.comprovanteArquivo) {
          return [{
            id: 'comp_0',
            nome: row.comprovanteNome || 'comprovante',
            tipo: row.comprovanteTipo || 'application/octet-stream',
            tamanho: row.comprovanteTamanho || 0,
            arquivo: row.comprovanteArquivo,
            url: row.comprovanteUrl || `/api/financial/entries/${row.id}/comprovante`
          }];
        }
        return [];
      })(),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

module.exports = new FinancialRepository();
