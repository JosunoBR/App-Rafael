const { getDatabase, saveDatabaseToDisk } = require('../config/database');

class BackupRestoreService {
  async restoreFromBackupData(rawBackup) {
    if (!rawBackup || typeof rawBackup !== 'object') {
      throw new Error('Formato de backup inválido. Esperado objeto JSON.');
    }

    const db = await getDatabase();
    const now = new Date().toISOString();

    let backup = rawBackup;
    // Se o backup veio envelopado em { backupData: ... }
    if (rawBackup.backupData && typeof rawBackup.backupData === 'object') {
      backup = rawBackup.backupData;
    }

    // Helper para desserializar valores se forem strings JSON
    const parseKey = (key, fallback = null) => {
      const val = backup[key];
      if (!val) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val;
    };

    // 1. Extrair coleções do backup
    const ordersList = parseKey('mega12_saved_orders_v1') || parseKey('mega12_saved_orders') || parseKey('orders') || [];
    const currentOrder = parseKey('mega12_current_order_v1') || parseKey('mega12_current_order') || null;
    const productsList = parseKey('mega12_products_v1') || parseKey('mega12_products') || parseKey('products') || [];
    const suppliersList = parseKey('mega12_suppliers_v1') || parseKey('mega12_suppliers') || parseKey('suppliers') || [];
    const paymentConds = parseKey('mega12_payment_conditions') || parseKey('payment_conditions') || [];

    // 2. Restaurar / Reconstruir Fornecedores
    const supplierMap = new Map();

    // Do array de fornecedores
    if (Array.isArray(suppliersList)) {
      suppliersList.forEach(s => {
        const name = s.razaoSocial || s.nomeFantasia;
        if (name) {
          supplierMap.set(name.toUpperCase().trim(), {
            id: s.id || `sup_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            razaoSocial: name.trim(),
            nomeFantasia: s.nomeFantasia || name.trim(),
            cnpj: s.cnpj || '',
            vendedorPadrao: s.vendedorPadrao || '',
            contatoVendedor: s.contatoVendedor || '',
            condicaoPagamentoPadrao: s.condicaoPagamentoPadrao || '30/60/90 Dias'
          });
        }
      });
    }

    // Dos pedidos
    const allOrdersToScan = [...ordersList];
    if (currentOrder && currentOrder.header?.fornecedor) {
      allOrdersToScan.push(currentOrder);
    }

    allOrdersToScan.forEach(o => {
      const name = o.header?.fornecedor?.trim();
      if (name && !supplierMap.has(name.toUpperCase())) {
        supplierMap.set(name.toUpperCase(), {
          id: o.header.supplierId || `sup_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          razaoSocial: name,
          nomeFantasia: name,
          cnpj: o.header.cnpj || '',
          vendedorPadrao: o.header.vendedor || '',
          contatoVendedor: o.header.contatoVendedor || '',
          condicaoPagamentoPadrao: o.header.condicaoPagamento || '30/60/90 Dias'
        });
      }
    });

    // Dos produtos
    if (Array.isArray(productsList)) {
      productsList.forEach(p => {
        const name = p.nomeFornecedor?.trim();
        if (name && !supplierMap.has(name.toUpperCase())) {
          supplierMap.set(name.toUpperCase(), {
            id: p.supplierId || `sup_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            razaoSocial: name,
            nomeFantasia: name,
            cnpj: '',
            vendedorPadrao: '',
            contatoVendedor: '',
            condicaoPagamentoPadrao: '30/60/90 Dias'
          });
        }
      });
    }

    let restoredSuppliersCount = 0;
    for (const sup of supplierMap.values()) {
      const check = db.exec(`SELECT id FROM suppliers WHERE razaoSocial = ? OR id = ?`, [sup.razaoSocial, sup.id]);
      if (!check[0] || check[0].values.length === 0) {
        db.run(`
          INSERT INTO suppliers (
            id, razaoSocial, nomeFantasia, cnpj, vendedorPadrao, contatoVendedor, 
            condicaoPagamentoPadrao, aliquotaStPadrao, aliquotaIpiPadrao, descontoOffPadrao, 
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
        `, [sup.id, sup.razaoSocial, sup.nomeFantasia, sup.cnpj, sup.vendedorPadrao, sup.contatoVendedor, sup.condicaoPagamentoPadrao, now, now]);
        restoredSuppliersCount++;
      }
    }

    // 3. Restaurar Produtos
    let restoredProductsCount = 0;
    if (Array.isArray(productsList)) {
      for (const prod of productsList) {
        const check = db.exec(`SELECT id FROM products WHERE id = ? OR codigo = ?`, [prod.id || prod.codigo, prod.codigo]);
        const supId = prod.supplierId || (prod.nomeFornecedor ? supplierMap.get(prod.nomeFornecedor.toUpperCase().trim())?.id : '');
        if (!check[0] || check[0].values.length === 0) {
          const prodId = prod.id || `prd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          db.run(`
            INSERT INTO products (
              id, codigo, descricao, categoria, subcategoria, fornecedorPadraoId, fornecedorPadraoNome,
              precoUnitarioPadrao, pdvSugerido, qtdPorPacote, fotoUrl, ncm, eanBarcode, ativo, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            prodId,
            prod.codigo,
            prod.descricao,
            prod.categoria || 'Geral',
            prod.subcategoria || '',
            supId || '',
            prod.nomeFornecedor || '',
            prod.precoUnitarioPadrao || prod.preco || 0,
            prod.pdvSugerido || 12.0,
            prod.qtdPorPacote || prod.pct || 1,
            prod.fotoUrl || '',
            prod.ncm || '',
            prod.eanBarcode || prod.codigoBarras || '',
            1,
            prod.createdAt || now,
            prod.updatedAt || now
          ]);
          restoredProductsCount++;
        }
      }
    }

    // 4. Restaurar Pedidos e Itens
    let restoredOrdersCount = 0;
    let restoredItemsCount = 0;

    const ordersToRestore = Array.isArray(ordersList) ? [...ordersList] : [];
    if (currentOrder && currentOrder.header?.numeroPedido) {
      if (!ordersToRestore.some(o => o.header?.numeroPedido === currentOrder.header.numeroPedido)) {
        ordersToRestore.push(currentOrder);
      }
    }

    for (const ord of ordersToRestore) {
      if (!ord.header?.numeroPedido) continue;
      const num = ord.header.numeroPedido;

      // Verificar se o pedido já existe por número
      const checkNum = db.exec(`SELECT id FROM purchase_orders WHERE numeroPedido = ?`, [num]);
      if (checkNum[0] && checkNum[0].values.length > 0) {
        continue;
      }

      // Garantir id único na tabela
      let orderId = ord.header.id;
      if (orderId) {
        const checkId = db.exec(`SELECT id FROM purchase_orders WHERE id = ?`, [orderId]);
        if (checkId[0] && checkId[0].values.length > 0) {
          orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
      } else {
        orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }

      const itemsJson = JSON.stringify(ord.items || []);
      const installmentsJson = JSON.stringify(ord.installments || []);

      db.run(`
        INSERT INTO purchase_orders (
          id, numeroPedido, fornecedor, supplierId, vendedor, contatoVendedor, 
          condicaoPagamento, dataPedido, dataEmissao, dataEntregaPrevista, 
          percentualDescontoOff, percentualNota, observacoes, status, separationStatus,
          totalLiquido, totalPecas, itemsJson, installmentsJson, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        num,
        ord.header.fornecedor || 'Fornecedor',
        ord.header.supplierId || '',
        ord.header.vendedor || '',
        ord.header.contatoVendedor || '',
        ord.header.condicaoPagamento || '',
        ord.header.dataPedido || now.split('T')[0],
        ord.header.dataEmissao || now.split('T')[0],
        ord.header.dataEntregaPrevista || '',
        ord.header.percentualDescontoOff || 0,
        ord.header.percentualNota || 100,
        ord.header.observacoes || '',
        ord.header.status || 'Em Cotação',
        ord.header.separationStatus || 'Pendente',
        ord.header.totalLiquido || 0,
        ord.header.totalPecas || 0,
        itemsJson,
        installmentsJson,
        ord.header.createdAt || now,
        ord.header.updatedAt || now
      ]);

      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          if (!it.descricao && !it.codigo) continue;
          const itemId = `it_${orderId}_${Math.random().toString(36).slice(2, 8)}`;
          db.run(`
            INSERT INTO order_items (
              id, orderId, codigo, codigoInterno, codigoFornecedor, descricao,
              qtdNoPacote, qtdPacotes, qtdTotalUnidades, precoUnitario, valorTotalBruto,
              valorTotalLiquido, pdvAlvo, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            itemId,
            orderId,
            it.codigo || '',
            it.codigoInterno || it.codigo || '',
            it.codigoFornecedor || '',
            it.descricao || '',
            it.qtdNoPacote || it.qtdPorPacote || 1,
            it.qtdPacotes || 0,
            it.qtdTotalUnidades || 0,
            it.precoUnitario || 0,
            it.valorTotalBruto || 0,
            it.valorTotalLiquido || it.valorTotalBruto || 0,
            it.pdvAlvo || 12.0,
            now,
            now
          ]);
          restoredItemsCount++;
        }
      }

      restoredOrdersCount++;
    }

    // 5. Restaurar Condições de Pagamento
    let restoredConditionsCount = 0;
    if (Array.isArray(paymentConds)) {
      for (const pc of paymentConds) {
        if (!pc.descricao) continue;
        const check = db.exec(`SELECT id FROM payment_conditions WHERE descricao = ?`, [pc.descricao]);
        if (!check[0] || check[0].values.length === 0) {
          db.run(`
            INSERT INTO payment_conditions (
              id, descricao, qtdParcelas, parcelasDiasJson, especie, banco, ativo, padrao, observacao, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            pc.id || `pc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            pc.descricao,
            pc.qtdParcelas || 1,
            JSON.stringify(pc.parcelasDias || []),
            pc.especie || 'Boleto',
            pc.banco || '',
            1,
            pc.padrao ? 1 : 0,
            pc.observacao || '',
            now,
            now
          ]);
          restoredConditionsCount++;
        }
      }
    }

    saveDatabaseToDisk();

    return {
      success: true,
      restoredSuppliersCount,
      restoredProductsCount,
      restoredOrdersCount,
      restoredItemsCount,
      restoredConditionsCount
    };
  }
}

module.exports = new BackupRestoreService();
