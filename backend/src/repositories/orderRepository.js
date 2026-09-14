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
    const targetId = existing ? existing.id : (order.header.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    order.header.id = targetId;

    const items = order.items || [];
    const installments = order.installments || [];
    const itemsJson = JSON.stringify(items);
    const installmentsJson = JSON.stringify(installments);
    const separationJson = order.separationDistribution ? JSON.stringify(order.separationDistribution) : null;

    const paymentConfig = {
      parcelasCount: order.header.parcelasCount,
      prazoDias: order.header.prazoDias,
      diaVencimentoPersonalizado: order.header.diaVencimentoPersonalizado,
      dataPrimeiroVencimento: order.header.dataPrimeiroVencimento,
      datasVencimentoPersonalizadas: order.header.datasVencimentoPersonalizadas,
      valorEntradaAVista: order.header.valorEntradaAVista,
      percentualEntrada: order.header.percentualEntrada,
      isEntradaProporcional: order.header.isEntradaProporcional,
      depositoFormaPagamento: order.header.depositoFormaPagamento,
      depositoParcelasCount: order.header.depositoParcelasCount,
      depositoPrazoDias: order.header.depositoPrazoDias,
      saldoFormaPagamento: order.header.saldoFormaPagamento,
      saldoParcelasCount: order.header.saldoParcelasCount,
      saldoPrazoDias: order.header.saldoPrazoDias
    };
    const paymentConfigJson = JSON.stringify(paymentConfig);

    const fiscal = order.fiscalConfig || {};
    const fiscalConfigJson = JSON.stringify(fiscal);
    const aliquotaIpi = Number(fiscal.ipiAliquota !== undefined ? fiscal.ipiAliquota : (order.header.aliquotaIpi || 0));
    const aliquotaFrete = Number(fiscal.freteAliquota !== undefined ? fiscal.freteAliquota : (order.header.aliquotaFrete || 0));
    const aliquotaIcmsEntrada = Number(fiscal.creditoEntradaICMS !== undefined ? fiscal.creditoEntradaICMS : (order.header.aliquotaIcmsEntrada !== undefined ? order.header.aliquotaIcmsEntrada : 12));
    const aliquotaCustoFixo = Number(fiscal.custosFixos !== undefined ? fiscal.custosFixos : (order.header.aliquotaCustoFixo !== undefined ? order.header.aliquotaCustoFixo : 26));
    const aliquotaIcmsSaida = Number(fiscal.icmsAliquota !== undefined ? fiscal.icmsAliquota : (order.header.aliquotaIcmsSaida !== undefined ? order.header.aliquotaIcmsSaida : 19.5));
    const aliquotaPisCofinsIr = Number(fiscal.pisCofinsAliquota !== undefined ? fiscal.pisCofinsAliquota : (order.header.aliquotaPisCofinsIr !== undefined ? order.header.aliquotaPisCofinsIr : 6));

    let totalLiquido = 0;
    let totalPecas = 0;
    items.forEach(item => {
      totalLiquido += (Number(item.valorTotalLiquido !== undefined ? item.valorTotalLiquido : (item.valorTotalBruto || item.custoLiquidoTotalComDesconto || item.custoLiquidoTotal || 0)));
      totalPecas += (Number(item.qtdTotalUnidades || 0));
    });

    const today = new Date().toISOString().split('T')[0];
    const dataPedido = order.header.dataPedido || order.header.dataEmissao || today;
    const dataEmissao = order.header.dataEmissao || order.header.dataPedido || today;

    if (existing) {
      const sql = `
        UPDATE purchase_orders SET
          numeroPedido = ?, fornecedor = ?, supplierId = ?, aliquotaSt = ?,
          vendedor = ?, contatoVendedor = ?, condicaoPagamento = ?, formaPagamento = ?,
          previsaoPagamento = ?, tipoFrete = ?, valorFrete = ?, descontoComercialTotal = ?,
          descontoComercialTipo = ?, isDraft = ?, dataPedido = ?, dataEmissao = ?, dataEntregaPrevista = ?,
          percentualDescontoOff = ?, percentualNota = ?, observacoes = ?, status = ?,
          separationStatus = ?, totalLiquido = ?, totalPecas = ?, installmentsJson = ?,
          fiscalConfigJson = ?, aliquotaIpi = ?, aliquotaFrete = ?, aliquotaIcmsEntrada = ?,
          aliquotaCustoFixo = ?, aliquotaIcmsSaida = ?, aliquotaPisCofinsIr = ?,
          itemsJson = ?, separationDistributionJson = ?, paymentConfigJson = ?, updatedAt = ?
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
        order.header.formaPagamento || 'Boleto',
        order.header.previsaoPagamento || '',
        order.header.tipoFrete || 'CIF',
        Number(order.header.valorFrete) || 0,
        Number(order.header.descontoComercialTotal) || 0,
        order.header.descontoComercialTipo || '%',
        order.header.isDraft ? 1 : 0,
        dataPedido,
        dataEmissao,
        order.header.dataEntregaPrevista || '',
        Number(order.header.percentualDescontoOff) || 0,
        order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100,
        order.header.observacoes || '',
        order.header.status || 'Em Cotação',
        order.header.separationStatus || 'Pendente',
        totalLiquido,
        totalPecas,
        installmentsJson,
        fiscalConfigJson,
        aliquotaIpi,
        aliquotaFrete,
        aliquotaIcmsEntrada,
        aliquotaCustoFixo,
        aliquotaIcmsSaida,
        aliquotaPisCofinsIr,
        itemsJson,
        separationJson,
        paymentConfigJson,
        now,
        targetId
      ]);
    } else {
      const sql = `
        INSERT INTO purchase_orders (
          id, numeroPedido, fornecedor, supplierId, aliquotaSt,
          vendedor, contatoVendedor, condicaoPagamento, formaPagamento,
          previsaoPagamento, tipoFrete, valorFrete, descontoComercialTotal,
          descontoComercialTipo, isDraft, dataPedido, dataEmissao, dataEntregaPrevista,
          percentualDescontoOff, percentualNota, observacoes, status,
          separationStatus, totalLiquido, totalPecas, installmentsJson,
          fiscalConfigJson, aliquotaIpi, aliquotaFrete, aliquotaIcmsEntrada,
          aliquotaCustoFixo, aliquotaIcmsSaida, aliquotaPisCofinsIr,
          itemsJson, separationDistributionJson, paymentConfigJson, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `;
      await execute(sql, [
        targetId,
        order.header.numeroPedido,
        order.header.fornecedor,
        order.header.supplierId || null,
        Number(order.header.aliquotaSt) || 0,
        order.header.vendedor || '',
        order.header.contatoVendedor || '',
        order.header.condicaoPagamento || '30/60/90 Dias',
        order.header.formaPagamento || 'Boleto',
        order.header.previsaoPagamento || '',
        order.header.tipoFrete || 'CIF',
        Number(order.header.valorFrete) || 0,
        Number(order.header.descontoComercialTotal) || 0,
        order.header.descontoComercialTipo || '%',
        order.header.isDraft ? 1 : 0,
        dataPedido,
        dataEmissao,
        order.header.dataEntregaPrevista || '',
        Number(order.header.percentualDescontoOff) || 0,
        order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100,
        order.header.observacoes || '',
        order.header.status || 'Em Cotação',
        order.header.separationStatus || 'Pendente',
        totalLiquido,
        totalPecas,
        installmentsJson,
        fiscalConfigJson,
        aliquotaIpi,
        aliquotaFrete,
        aliquotaIcmsEntrada,
        aliquotaCustoFixo,
        aliquotaIcmsSaida,
        aliquotaPisCofinsIr,
        itemsJson,
        separationJson,
        paymentConfigJson,
        order.header.createdAt || now,
        now
      ]);
    }

    // Persistência relacional normalizada nas tabelas order_items e order_installments
    try {
      await execute("DELETE FROM order_items WHERE orderId = ?", [targetId]);
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const itemId = `it_${targetId}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
        const packVal = Number(item.qtdNoPacote !== undefined ? item.qtdNoPacote : (item.qtdPorPacote || 1)) || 1;
        await execute(`
          INSERT INTO order_items (
            id, orderId, codigoInterno, codigoFornecedor, codigoBarras, codigo, descricao, fotoUrl,
            qtdNoPacote, qtdPorPacote, qtdPacotes, qtdTotalUnidades, precoUnitario, valorTotalBruto,
            percentualDesconto, valorDescontoItem, valorTotalLiquido,
            pdvAlvo, custoLoja, custoFornecedor, despesasPdvUnit, creditoIcmsUnit, custoRealEfetivo, margemRealUnit, margemPercentual,
            qtdReservaEstoque, separacaoManual, separacaoLojasJson, ruptura, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          targetId,
          item.codigoInterno || item.codigo || '',
          item.codigoFornecedor || '',
          item.codigoBarras || item.eanBarcode || '',
          item.codigo || item.codigoInterno || '',
          item.descricao || '',
          item.fotoUrl || '',
          packVal,
          packVal,
          Number(item.qtdPacotes !== undefined ? item.qtdPacotes : 0) || 0,
          Number(item.qtdTotalUnidades) || 0,
          Number(item.precoUnitario) || 0,
          Number(item.valorTotalBruto) || 0,
          Number(item.percentualDesconto) || 0,
          Number(item.valorDescontoItem) || 0,
          Number(item.valorTotalLiquido !== undefined ? item.valorTotalLiquido : item.valorTotalBruto) || 0,
          Number(item.pdvAlvo) || 0,
          Number(item.custoLoja) || 0,
          Number(item.custoFornecedor) || 0,
          Number(item.despesasPdvUnit) || 0,
          Number(item.creditoIcmsUnit) || 0,
          Number(item.custoRealEfetivo) || 0,
          Number(item.margemRealUnit) || 0,
          Number(item.margemPercentual) || 0,
          Number(item.qtdReservaEstoque) || 0,
          item.separacaoManual ? 1 : 0,
          JSON.stringify(item.separacaoLojas || {}),
          item.ruptura ? 1 : 0,
          now,
          now
        ]);
      }

      await execute("DELETE FROM order_installments WHERE orderId = ?", [targetId]);
      for (let instIdx = 0; instIdx < installments.length; instIdx++) {
        const inst = installments[instIdx];
        const instId = `inst_${targetId}_${instIdx}_${Math.random().toString(36).substring(2, 7)}`;
        await execute(`
          INSERT INTO order_installments (
            id, orderId, numeroParcela, totalParcelas, dataVencimento, valor,
            valorOriginal, status, dataPagamento, observacao, documentoRef,
            isBoletoFrete, tipoTitulo, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          instId,
          targetId,
          Number(inst.numeroParcela) || (instIdx + 1),
          Number(inst.totalParcelas) || installments.length,
          inst.dataVencimento || '',
          Number(inst.valor) || 0,
          Number(inst.valorOriginal) || Number(inst.valor) || 0,
          inst.status || 'A Vencer',
          inst.dataPagamento || null,
          inst.observacao || '',
          inst.documentoRef || '',
          inst.isBoletoFrete ? 1 : 0,
          inst.tipoTitulo || (inst.isBoletoFrete ? 'frete' : 'mercadoria'),
          inst.createdAt || now,
          now
        ]);
      }

      // Persistência relacional de avarias registradas
      if (order.inspection && Array.isArray(order.inspection.avarias)) {
        await execute("DELETE FROM order_avarias WHERE orderId = ?", [targetId]);
        for (let avIdx = 0; avIdx < order.inspection.avarias.length; avIdx++) {
          const av = order.inspection.avarias[avIdx];
          const avId = `av_${targetId}_${avIdx}_${Math.random().toString(36).substring(2, 7)}`;
          await execute(`
            INSERT INTO order_avarias (
              id, orderId, itemId, codigoProduto, descricaoProduto, storeId, nomeLoja,
              quantidade, unidadeMedida, custoUnitario, valorPrejuizoTotal, motivo,
              conferente, dataRegistro, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            avId,
            targetId,
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

    return await this.findById(targetId);
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

    // 1. Carrega itens com proteção absoluta contra perda de dados:
    let jsonItems = [];
    if (r.itemsJson) {
      try { jsonItems = JSON.parse(r.itemsJson) || []; } catch (e) { jsonItems = []; }
    }

    try {
      const dbItems = await queryAll("SELECT * FROM order_items WHERE orderId = ?", [r.id]);
      if (dbItems && dbItems.length >= jsonItems.length && dbItems.length > 0) {
        items = dbItems.map(it => ({
          id: it.id,
          codigoInterno: it.codigoInterno,
          codigoFornecedor: it.codigoFornecedor,
          codigoBarras: it.codigoBarras || '',
          codigo: it.codigo,
          descricao: it.descricao,
          fotoUrl: it.fotoUrl,
          qtdNoPacote: it.qtdNoPacote !== undefined ? it.qtdNoPacote : (it.qtdPorPacote || 1),
          qtdPacotes: it.qtdPacotes !== undefined ? it.qtdPacotes : 0,
          qtdTotalUnidades: it.qtdTotalUnidades,
          precoUnitario: it.precoUnitario,
          valorTotalBruto: it.valorTotalBruto,
          percentualDesconto: it.percentualDesconto || 0,
          valorDescontoItem: it.valorDescontoItem || 0,
          valorTotalLiquido: it.valorTotalLiquido !== undefined ? it.valorTotalLiquido : it.valorTotalBruto,
          pdvAlvo: it.pdvAlvo,
          custoLoja: it.custoLoja || 0,
          custoFornecedor: it.custoFornecedor || 0,
          despesasPdvUnit: it.despesasPdvUnit,
          creditoIcmsUnit: it.creditoIcmsUnit,
          custoRealEfetivo: it.custoRealEfetivo,
          margemRealUnit: it.margemRealUnit,
          margemPercentual: it.margemPercentual,
          qtdReservaEstoque: it.qtdReservaEstoque,
          separacaoManual: it.separacaoManual === 1,
          separacaoLojas: it.separacaoLojasJson ? JSON.parse(it.separacaoLojasJson) : {},
          ruptura: it.ruptura === 1 || it.ruptura === true
        }));
      } else if (jsonItems.length > 0) {
        items = jsonItems;
      } else if (dbItems && dbItems.length > 0) {
        items = dbItems.map(it => ({
          id: it.id,
          codigoInterno: it.codigoInterno,
          codigoFornecedor: it.codigoFornecedor,
          codigoBarras: it.codigoBarras || '',
          codigo: it.codigo,
          descricao: it.descricao,
          fotoUrl: it.fotoUrl,
          qtdNoPacote: it.qtdNoPacote !== undefined ? it.qtdNoPacote : (it.qtdPorPacote || 1),
          qtdPacotes: it.qtdPacotes !== undefined ? it.qtdPacotes : 0,
          qtdTotalUnidades: it.qtdTotalUnidades,
          precoUnitario: it.precoUnitario,
          valorTotalBruto: it.valorTotalBruto,
          percentualDesconto: it.percentualDesconto || 0,
          valorDescontoItem: it.valorDescontoItem || 0,
          valorTotalLiquido: it.valorTotalLiquido !== undefined ? it.valorTotalLiquido : it.valorTotalBruto,
          pdvAlvo: it.pdvAlvo,
          custoLoja: it.custoLoja || 0,
          custoFornecedor: it.custoFornecedor || 0,
          despesasPdvUnit: it.despesasPdvUnit,
          creditoIcmsUnit: it.creditoIcmsUnit,
          custoRealEfetivo: it.custoRealEfetivo,
          margemRealUnit: it.margemRealUnit,
          margemPercentual: it.margemPercentual,
          qtdReservaEstoque: it.qtdReservaEstoque,
          separacaoManual: it.separacaoManual === 1,
          separacaoLojas: it.separacaoLojasJson ? JSON.parse(it.separacaoLojasJson) : {},
          ruptura: it.ruptura === 1 || it.ruptura === true
        }));
      }
    } catch {
      items = jsonItems;
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
          documentoRef: ins.documentoRef,
          isBoletoFrete: ins.isBoletoFrete === 1,
          tipoTitulo: ins.tipoTitulo || (ins.isBoletoFrete === 1 ? 'frete' : 'mercadoria')
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

    let parsedFiscal = null;
    if (r.fiscalConfigJson) {
      try { parsedFiscal = JSON.parse(r.fiscalConfigJson); } catch {}
    }
    if (!parsedFiscal) {
      parsedFiscal = {
        ipiAliquota: r.aliquotaIpi || 0,
        aliquotaSt: r.aliquotaSt || 0,
        freteAliquota: r.aliquotaFrete || 0,
        creditoEntradaICMS: r.aliquotaIcmsEntrada !== undefined ? r.aliquotaIcmsEntrada : 12,
        custosFixos: r.aliquotaCustoFixo !== undefined ? r.aliquotaCustoFixo : 26,
        icmsAliquota: r.aliquotaIcmsSaida !== undefined ? r.aliquotaIcmsSaida : 19.5,
        pisCofinsAliquota: r.aliquotaPisCofinsIr !== undefined ? r.aliquotaPisCofinsIr : 6
      };
    }

    let paymentConfig = {};
    if (r.paymentConfigJson) {
      try {
        paymentConfig = JSON.parse(r.paymentConfigJson) || {};
      } catch (e) {}
    }

    // Fallback para pedidos antigos: se não houver datasVencimentoPersonalizadas salvas, reconstrói a partir de installments
    if (!paymentConfig.datasVencimentoPersonalizadas && Array.isArray(installments) && installments.length > 0) {
      const customDates = {};
      installments.forEach(inst => {
        if (inst.numeroParcela && inst.dataVencimento) {
          const key = inst.isFrete ? 'frete' : String(inst.numeroParcela);
          customDates[key] = inst.dataVencimento;
        }
      });
      if (Object.keys(customDates).length > 0) {
        paymentConfig.datasVencimentoPersonalizadas = customDates;
      }
    }

    return {
      header: {
        id: r.id,
        numeroPedido: r.numeroPedido,
        fornecedor: r.fornecedor,
        supplierId: r.supplierId,
        aliquotaSt: r.aliquotaSt,
        vendedor: r.vendedor,
        contatoVendedor: r.contatoVendedor,
        condicaoPagamento: r.condicaoPagamento,
        formaPagamento: r.formaPagamento || 'Boleto',
        previsaoPagamento: r.previsaoPagamento || '',
        tipoFrete: r.tipoFrete || 'CIF',
        valorFrete: r.valorFrete || 0,
        descontoComercialTotal: r.descontoComercialTotal || 0,
        descontoComercialTipo: r.descontoComercialTipo || '%',
        isDraft: r.isDraft === 1,
        dataPedido: r.dataPedido || r.dataEmissao || (r.createdAt ? r.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        dataEmissao: r.dataEmissao || r.dataPedido || (r.createdAt ? r.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        dataEntregaPrevista: r.dataEntregaPrevista,
        percentualDescontoOff: r.percentualDescontoOff,
        percentualNota: r.percentualNota !== undefined ? r.percentualNota : 100,
        observacoes: r.observacoes,
        status: r.status,
        separationStatus: r.separationStatus,
        ...paymentConfig,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      },
      fiscalConfig: parsedFiscal,
      items,
      installments,
      inspection,
      separationDistribution
    };
  }

  async getNextNumeroPedido() {
    const rows = await queryAll("SELECT numeroPedido FROM purchase_orders");
    let maxNum = 0;
    rows.forEach(r => {
      const match = r.numeroPedido && r.numeroPedido.match(/PED-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `PED-${String(maxNum + 1).padStart(4, '0')}`;
  }

  async duplicate(id) {
    const original = await this.findById(id);
    if (!original) throw new Error('Pedido não encontrado para duplicação');
    const newNumero = await this.getNextNumeroPedido();
    const newId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const duplicatedItems = (original.items || []).map(item => ({
      ...item,
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderId: newId,
      qtdReservaEstoque: 0,
      separacaoLojas: {}
    }));

    // Duplicar parcelas/títulos com as exatas condições do pedido original
    const duplicatedInstallments = (original.installments || []).map(inst => ({
      ...inst,
      id: `inst_${newId}_${inst.numeroParcela || 1}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      orderId: newId,
      numeroPedido: newNumero,
      fornecedor: original.header?.fornecedor || inst.fornecedor,
      status: 'A Vencer',
      dataPagamento: null,
      updatedAt: now
    }));

    const duplicatedOrder = {
      header: {
        ...original.header,
        id: newId,
        numeroPedido: newNumero,
        dataPedido: today,
        dataEmissao: today,
        status: 'Em Cotação',
        separationStatus: 'Pendente',
        isDraft: true,
        createdAt: now,
        updatedAt: now
      },
      fiscalConfig: original.fiscalConfig,
      items: duplicatedItems,
      installments: duplicatedInstallments,
      inspection: null,
      separationDistribution: null
    };

    return await this.save(duplicatedOrder);
  }
}

module.exports = new OrderRepository();
