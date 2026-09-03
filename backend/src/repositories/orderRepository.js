const { queryAll, queryOne, execute } = require('../config/database');

class OrderRepository {
  async findAll() {
    const rows = await queryAll("SELECT * FROM purchase_orders ORDER BY createdAt DESC");
    const orders = [];
    for (const r of rows) {
      orders.push(await this._mapRowToOrder(r));
    }
    return orders;
  }

  async findById(id) {
    const row = await queryOne("SELECT * FROM purchase_orders WHERE id = ?", [id]);
    return row ? await this._mapRowToOrder(row) : null;
  }

  async findByNumero(numeroPedido) {
    const row = await queryOne("SELECT * FROM purchase_orders WHERE numeroPedido = ?", [numeroPedido]);
    return row ? await this._mapRowToOrder(row) : null;
  }

  async save(order) {
    const existing = await queryOne("SELECT id, numeroPedido FROM purchase_orders WHERE id = ? OR numeroPedido = ?", [order.header.id, order.header.numeroPedido]);
    const now = new Date().toISOString();

    const items = order.items || [];
    const installments = order.installments || [];
    const itemsJson = JSON.stringify(items);
    const installmentsJson = JSON.stringify(installments);
    const separationJson = order.separationDistribution ? JSON.stringify(order.separationDistribution) : null;

    let totalLiquido = 0;
    let totalPecas = 0;
    items.forEach(item => {
      totalLiquido += (Number(item.valorTotalBruto || item.custoLiquidoTotalComDesconto || item.custoLiquidoTotal || 0));
      totalPecas += (Number(item.qtdTotalUnidades || 0));
    });

    const tableInfo = await query("PRAGMA table_info(purchase_orders)");
    const colNames = (tableInfo || []).map(r => r.name);
    const hasDataPedido = colNames.includes('dataPedido');
    const dateVal = order.header.dataPedido || order.header.dataEmissao || new Date().toISOString().split('T')[0];

    if (existing) {
      const targetId = existing.id;
      if (hasDataPedido) {
        const sql = `
          UPDATE purchase_orders SET
            numeroPedido = ?, fornecedor = ?, supplierId = ?, aliquotaSt = ?,
            vendedor = ?, contatoVendedor = ?, condicaoPagamento = ?, dataEmissao = ?,
            dataPedido = ?, dataEntregaPrevista = ?, percentualDescontoOff = ?, percentualNota = ?,
            observacoes = ?, status = ?, separationStatus = ?, totalLiquido = ?,
            totalPecas = ?, installmentsJson = ?, itemsJson = ?,
            separationDistributionJson = ?, updatedAt = ?
          WHERE id = ?
        `;
        await execute(sql, [
          order.header.numeroPedido,
          order.header.fornecedor,
          order.header.supplierId || null,
          Number(order.header.aliquotaSt) || 0,
          order.header.vendedor || '',
          order.header.contatoVendedor || '',
          order.header.condicaoPagamento || '30/60/90 Dias',
          dateVal,
          dateVal,
          order.header.dataEntregaPrevista || '',
          Number(order.header.percentualDescontoOff) || 0,
          order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100,
          order.header.observacoes || '',
          order.header.status || 'Em Cotação',
          order.header.separationStatus || 'Pendente',
          totalLiquido,
          totalPecas,
          installmentsJson,
          itemsJson,
          separationJson,
          now,
          targetId
        ]);
      } else {
        const sql = `
          UPDATE purchase_orders SET
            numeroPedido = ?, fornecedor = ?, supplierId = ?, aliquotaSt = ?,
            vendedor = ?, contatoVendedor = ?, condicaoPagamento = ?, dataEmissao = ?,
            dataEntregaPrevista = ?, percentualDescontoOff = ?, percentualNota = ?,
            observacoes = ?, status = ?, separationStatus = ?, totalLiquido = ?,
            totalPecas = ?, installmentsJson = ?, itemsJson = ?,
            separationDistributionJson = ?, updatedAt = ?
          WHERE id = ?
        `;
        await execute(sql, [
          order.header.numeroPedido,
          order.header.fornecedor,
          order.header.supplierId || null,
          Number(order.header.aliquotaSt) || 0,
          order.header.vendedor || '',
          order.header.contatoVendedor || '',
          order.header.condicaoPagamento || '30/60/90 Dias',
          dateVal,
          order.header.dataEntregaPrevista || '',
          Number(order.header.percentualDescontoOff) || 0,
          order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100,
          order.header.observacoes || '',
          order.header.status || 'Em Cotação',
          order.header.separationStatus || 'Pendente',
          totalLiquido,
          totalPecas,
          installmentsJson,
          itemsJson,
          separationJson,
          now,
          targetId
        ]);
      }
    } else {
      if (hasDataPedido) {
        const sql = `
          INSERT INTO purchase_orders (
            id, numeroPedido, fornecedor, supplierId, aliquotaSt, vendedor,
            contatoVendedor, condicaoPagamento, dataEmissao, dataPedido, dataEntregaPrevista,
            percentualDescontoOff, percentualNota, observacoes, status,
            separationStatus, totalLiquido, totalPecas, installmentsJson,
            itemsJson, separationDistributionJson, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await execute(sql, [
          order.header.id,
          order.header.numeroPedido,
          order.header.fornecedor,
          order.header.supplierId || null,
          Number(order.header.aliquotaSt) || 0,
          order.header.vendedor || '',
          order.header.contatoVendedor || '',
          order.header.condicaoPagamento || '30/60/90 Dias',
          dateVal,
          dateVal,
          order.header.dataEntregaPrevista || '',
          Number(order.header.percentualDescontoOff) || 0,
          order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100,
          order.header.observacoes || '',
          order.header.status || 'Em Cotação',
          order.header.separationStatus || 'Pendente',
          totalLiquido,
          totalPecas,
          installmentsJson,
          itemsJson,
          separationJson,
          order.header.createdAt || now,
          now
        ]);
      } else {
        const sql = `
          INSERT INTO purchase_orders (
            id, numeroPedido, fornecedor, supplierId, aliquotaSt, vendedor,
            contatoVendedor, condicaoPagamento, dataEmissao, dataEntregaPrevista,
            percentualDescontoOff, percentualNota, observacoes, status,
            separationStatus, totalLiquido, totalPecas, installmentsJson,
            itemsJson, separationDistributionJson, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await execute(sql, [
          order.header.id,
          order.header.numeroPedido,
          order.header.fornecedor,
          order.header.supplierId || null,
          Number(order.header.aliquotaSt) || 0,
          order.header.vendedor || '',
          order.header.contatoVendedor || '',
          order.header.condicaoPagamento || '30/60/90 Dias',
          dateVal,
          order.header.dataEntregaPrevista || '',
          Number(order.header.percentualDescontoOff) || 0,
          order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100,
          order.header.observacoes || '',
          order.header.status || 'Em Cotação',
          order.header.separationStatus || 'Pendente',
          totalLiquido,
          totalPecas,
          installmentsJson,
          itemsJson,
          separationJson,
          order.header.createdAt || now,
          now
        ]);
      }
    }

    // Persistência relacional normalizada nas tabelas order_items e order_installments
    try {
      await execute("DELETE FROM order_items WHERE orderId = ?", [order.header.id]);
      for (const item of items) {
        const itemId = item.id || `it_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await execute(`
          INSERT INTO order_items (
            id, orderId, codigoInterno, codigoFornecedor, codigo, descricao, fotoUrl,
            qtdTotalUnidades, precoUnitario, valorTotalBruto, pdvAlvo, despesasPdvUnit,
            creditoIcmsUnit, custoRealEfetivo, margemRealUnit, margemPercentual,
            qtdReservaEstoque, separacaoManual, separacaoLojasJson, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          order.header.id,
          item.codigoInterno || item.codigo || '',
          item.codigoFornecedor || '',
          item.codigo || item.codigoInterno || '',
          item.descricao || '',
          item.fotoUrl || '',
          Number(item.qtdTotalUnidades) || 0,
          Number(item.precoUnitario) || 0,
          Number(item.valorTotalBruto) || 0,
          Number(item.pdvAlvo) || 12.0,
          Number(item.despesasPdvUnit) || 0,
          Number(item.creditoIcmsUnit) || 0,
          Number(item.custoRealEfetivo) || 0,
          Number(item.margemRealUnit) || 0,
          Number(item.margemPercentual) || 0,
          Number(item.qtdReservaEstoque) || 0,
          item.separacaoManual ? 1 : 0,
          JSON.stringify(item.separacaoLojas || {}),
          item.createdAt || now,
          now
        ]);
      }

      await execute("DELETE FROM order_installments WHERE orderId = ?", [order.header.id]);
      for (const inst of installments) {
        const instId = inst.id || `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await execute(`
          INSERT INTO order_installments (
            id, orderId, numeroParcela, totalParcelas, dataVencimento, valor,
            valorOriginal, status, dataPagamento, observacao, documentoRef, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          instId,
          order.header.id,
          Number(inst.numeroParcela) || 1,
          Number(inst.totalParcelas) || 1,
          inst.dataVencimento || '',
          Number(inst.valor) || 0,
          Number(inst.valorOriginal) || Number(inst.valor) || 0,
          inst.status || 'A Vencer',
          inst.dataPagamento || null,
          inst.observacao || '',
          inst.documentoRef || '',
          inst.createdAt || now,
          now
        ]);
      }

      // Persistência relacional de avarias registradas
      if (order.inspection && Array.isArray(order.inspection.avarias)) {
        await execute("DELETE FROM order_avarias WHERE orderId = ?", [order.header.id]);
        for (const av of order.inspection.avarias) {
          const avId = av.id || `av_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await execute(`
            INSERT INTO order_avarias (
              id, orderId, itemId, codigoProduto, descricaoProduto, storeId, nomeLoja,
              quantidade, unidadeMedida, custoUnitario, valorPrejuizoTotal, motivo,
              conferente, dataRegistro, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            avId,
            order.header.id,
            av.itemId || '',
            av.codigoProduto || '',
            av.descricaoProduto || '',
            av.storeId || '',
            av.nomeLoja || '',
            Number(av.quantidade) || 0,
            av.unidadeMedida || 'UN',
            Number(av.custoUnitario) || 0,
            Number(av.valorPrejuizoTotal) || 0,
            av.motivo || '',
            av.conferente || order.inspection.conferente || '',
            av.dataRegistro || now,
            now
          ]);
        }
      }
    } catch (e) {
      console.warn('Aviso na persistência relacional normalizada de itens/avarias:', e.message);
    }

    return await this.findById(order.header.id);
  }

  async updateInstallments(orderId, installments) {
    const now = new Date().toISOString();
    const sql = `UPDATE purchase_orders SET installmentsJson = ?, updatedAt = ? WHERE id = ?`;
    await execute(sql, [JSON.stringify(installments), now, orderId]);

    try {
      await execute("DELETE FROM order_installments WHERE orderId = ?", [orderId]);
      for (const inst of (installments || [])) {
        const instId = inst.id || `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await execute(`
          INSERT INTO order_installments (
            id, orderId, numeroParcela, totalParcelas, dataVencimento, valor,
            valorOriginal, status, dataPagamento, observacao, documentoRef, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          instId,
          orderId,
          Number(inst.numeroParcela) || 1,
          Number(inst.totalParcelas) || 1,
          inst.dataVencimento || '',
          Number(inst.valor) || 0,
          Number(inst.valorOriginal) || Number(inst.valor) || 0,
          inst.status || 'A Vencer',
          inst.dataPagamento || null,
          inst.observacao || '',
          inst.documentoRef || '',
          inst.createdAt || now,
          now
        ]);
      }
    } catch (e) {
      console.warn('Aviso no update relacional de parcelas:', e.message);
    }

    return await this.findById(orderId);
  }

  async delete(id) {
    await execute("DELETE FROM order_avarias WHERE orderId = ?", [id]);
    await execute("DELETE FROM order_items WHERE orderId = ?", [id]);
    await execute("DELETE FROM order_installments WHERE orderId = ?", [id]);
    await execute("DELETE FROM purchase_orders WHERE id = ?", [id]);
    return true;
  }

  async _mapRowToOrder(r) {
    let items = [];
    let installments = [];
    let separationDistribution = null;
    let inspection = null;

    // 1. Tenta carregar das tabelas relacionais normalizadas
    try {
      const dbItems = await queryAll("SELECT * FROM order_items WHERE orderId = ?", [r.id]);
      if (dbItems && dbItems.length > 0) {
        items = dbItems.map(it => ({
          id: it.id,
          codigoInterno: it.codigoInterno,
          codigoFornecedor: it.codigoFornecedor,
          codigo: it.codigo,
          descricao: it.descricao,
          fotoUrl: it.fotoUrl,
          qtdTotalUnidades: it.qtdTotalUnidades,
          precoUnitario: it.precoUnitario,
          valorTotalBruto: it.valorTotalBruto,
          pdvAlvo: it.pdvAlvo,
          despesasPdvUnit: it.despesasPdvUnit,
          creditoIcmsUnit: it.creditoIcmsUnit,
          custoRealEfetivo: it.custoRealEfetivo,
          margemRealUnit: it.margemRealUnit,
          margemPercentual: it.margemPercentual,
          qtdReservaEstoque: it.qtdReservaEstoque,
          separacaoManual: it.separacaoManual === 1,
          separacaoLojas: it.separacaoLojasJson ? JSON.parse(it.separacaoLojasJson) : {}
        }));
      } else if (r.itemsJson) {
        items = JSON.parse(r.itemsJson);
      }
    } catch {
      try { items = JSON.parse(r.itemsJson || '[]'); } catch {}
    }

    try {
      const dbInst = await queryAll("SELECT * FROM order_installments WHERE orderId = ? ORDER BY numeroParcela ASC", [r.id]);
      if (dbInst && dbInst.length > 0) {
        installments = dbInst.map(ins => ({
          id: ins.id,
          orderId: ins.orderId,
          numeroParcela: ins.numeroParcela,
          totalParcelas: ins.totalParcelas,
          dataVencimento: ins.dataVencimento,
          valor: ins.valor,
          valorOriginal: ins.valorOriginal,
          status: ins.status,
          dataPagamento: ins.dataPagamento,
          observacao: ins.observacao,
          documentoRef: ins.documentoRef
        }));
      } else if (r.installmentsJson) {
        installments = JSON.parse(r.installmentsJson);
      }
    } catch {
      try { installments = JSON.parse(r.installmentsJson || '[]'); } catch {}
    }

    try {
      const dbAvarias = await queryAll("SELECT * FROM order_avarias WHERE orderId = ?", [r.id]);
      if (dbAvarias && dbAvarias.length > 0) {
        inspection = {
          possuiAvarias: true,
          conferente: dbAvarias[0]?.conferente || 'Conferente',
          dataConferencia: dbAvarias[0]?.dataRegistro || r.updatedAt,
          avarias: dbAvarias.map(av => ({
            id: av.id,
            itemId: av.itemId,
            codigoProduto: av.codigoProduto,
            descricaoProduto: av.descricaoProduto,
            storeId: av.storeId,
            nomeLoja: av.nomeLoja,
            quantidade: av.quantidade,
            unidadeMedida: av.unidadeMedida,
            custoUnitario: av.custoUnitario,
            valorPrejuizoTotal: av.valorPrejuizoTotal,
            motivo: av.motivo,
            conferente: av.conferente,
            dataRegistro: av.dataRegistro
          }))
        };
      }
    } catch {}

    try { separationDistribution = r.separationDistributionJson ? JSON.parse(r.separationDistributionJson) : null; } catch {}

    return {
      id: r.id,
      header: {
        id: r.id,
        numeroPedido: r.numeroPedido,
        fornecedor: r.fornecedor,
        supplierId: r.supplierId,
        aliquotaSt: r.aliquotaSt,
        vendedor: r.vendedor,
        contatoVendedor: r.contatoVendedor,
        condicaoPagamento: r.condicaoPagamento,
        dataPedido: r.dataEmissao || '',
        dataEmissao: r.dataEmissao || '',
        dataEntregaPrevista: r.dataEntregaPrevista,
        percentualDescontoOff: r.percentualDescontoOff,
        percentualNota: r.percentualNota !== undefined ? r.percentualNota : 100,
        observacoes: r.observacoes,
        status: r.status,
        separationStatus: r.separationStatus,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      },
      items,
      installments,
      inspection,
      separationDistribution,
      totalLiquido: r.totalLiquido || 0,
      totalPecas: r.totalPecas || 0
    };
  }
}

module.exports = new OrderRepository();
