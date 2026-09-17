const fs = require('fs');
const path = require('path');
const { getDatabase, saveDatabaseToDisk, dbPath, queryAll, queryOne, execute } = require('../src/config/database');

async function repair() {
  console.log('Iniciando rotina de reparação dos pedidos no SQLite...');

  // 1. Criar backup preventivo antes da reparação
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const preRepairBackup = path.join(backupDir, `mega12_pre_repair_${dateStr}.db`);
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, preRepairBackup);
    console.log(`✔ Backup preventivo pré-reparação criado: ${path.basename(preRepairBackup)}`);
  }

  const db = await getDatabase();

  // 2. Carregar backup JSON do Mac do Rafael se existir para cruzar informações de alta fidelidade
  let backupOrdersMap = new Map();
  const backupJsonPath = path.resolve(__dirname, '../../backup_rafael_mac_1789591462570.json');
  if (fs.existsSync(backupJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(backupJsonPath, 'utf8'));
      const orders = typeof data['mega12_saved_orders_v1'] === 'string' ? JSON.parse(data['mega12_saved_orders_v1']) : data['mega12_saved_orders_v1'];
      if (Array.isArray(orders)) {
        orders.forEach(o => {
          if (o?.header?.numeroPedido) {
            backupOrdersMap.set(o.header.numeroPedido.trim().toUpperCase(), o);
          }
        });
        console.log(`✔ ${backupOrdersMap.size} pedidos carregados do backup JSON para referência.`);
      }
    } catch (e) {
      console.warn('Aviso ao ler backup JSON:', e.message);
    }
  }

  // 3. Atualizar pedidos existentes no SQLite
  const existingOrders = await queryAll("SELECT * FROM purchase_orders");
  console.log(`Analisando ${existingOrders.length} pedidos existentes no banco...`);

  for (const row of existingOrders) {
    const num = (row.numeroPedido || '').trim().toUpperCase();
    const backupOrder = backupOrdersMap.get(num);

    let installments = [];
    try {
      installments = JSON.parse(row.installmentsJson || '[]');
    } catch {}
    if (installments.length === 0 && backupOrder?.installments) {
      installments = backupOrder.installments;
    }

    // 3.1 Identificar e recuperar Frete
    let valorFrete = Number(row.valorFrete) || 0;
    let tipoFrete = row.tipoFrete || 'CIF';

    const freteInst = installments.find(i => i.isBoletoFrete || i.tipoTitulo === 'frete');
    if (freteInst && Number(freteInst.valor) > 0) {
      valorFrete = Number(freteInst.valor);
    } else if (backupOrder?.header?.valorFrete && Number(backupOrder.header.valorFrete) > 0) {
      valorFrete = Number(backupOrder.header.valorFrete);
    }

    if (backupOrder?.header?.tipoFrete) {
      tipoFrete = backupOrder.header.tipoFrete;
    }
    if (valorFrete > 0 && (!tipoFrete || tipoFrete.toUpperCase().includes('CIF'))) {
      tipoFrete = 'FOB';
    } else if (!tipoFrete) {
      tipoFrete = 'CIF';
    }

    // 3.2 Identificar e recuperar Condições e Prazos Compostos
    const condStr = (row.condicaoPagamento || backupOrder?.header?.condicaoPagamento || '').trim();
    const condLower = condStr.toLowerCase();
    const isComposite = (condLower.includes('depósito') || condLower.includes('deposito')) && (condLower.includes('boleto') || condLower.includes('cheque'));

    let paymentConfig = {};
    try {
      if (row.paymentConfigJson) paymentConfig = JSON.parse(row.paymentConfigJson) || {};
    } catch {}

    if (backupOrder?.header) {
      const bh = backupOrder.header;
      if (bh.prazoDias) paymentConfig.prazoDias = bh.prazoDias;
      if (bh.parcelasCount) paymentConfig.parcelasCount = bh.parcelasCount;
      if (bh.depositoParcelasCount) paymentConfig.depositoParcelasCount = bh.depositoParcelasCount;
      if (bh.depositoPrazoDias) paymentConfig.depositoPrazoDias = bh.depositoPrazoDias;
      if (bh.saldoParcelasCount) paymentConfig.saldoParcelasCount = bh.saldoParcelasCount;
      if (bh.saldoPrazoDias) paymentConfig.saldoPrazoDias = bh.saldoPrazoDias;
      if (bh.percentualEntrada !== undefined) paymentConfig.percentualEntrada = bh.percentualEntrada;
      if (bh.valorEntradaAVista !== undefined) paymentConfig.valorEntradaAVista = bh.valorEntradaAVista;
      if (bh.isEntradaProporcional !== undefined) paymentConfig.isEntradaProporcional = bh.isEntradaProporcional;
      if (bh.datasVencimentoPersonalizadas) paymentConfig.datasVencimentoPersonalizadas = bh.datasVencimentoPersonalizadas;
    }

    if (isComposite) {
      if (!paymentConfig.prazoDias || paymentConfig.prazoDias === '30') {
        paymentConfig.prazoDias = 'deposito_e_boleto';
      }
      if (!paymentConfig.depositoParcelasCount || !paymentConfig.saldoParcelasCount) {
        const xMatches = [...condStr.matchAll(/(\d+)x/gi)];
        if (xMatches.length >= 2) {
          if (!paymentConfig.depositoParcelasCount) paymentConfig.depositoParcelasCount = parseInt(xMatches[0][1], 10);
          if (!paymentConfig.saldoParcelasCount) paymentConfig.saldoParcelasCount = parseInt(xMatches[1][1], 10);
        }
      }
    }

    const finalFormaPgto = (backupOrder?.header?.formaPagamento) || (isComposite ? 'Boleto / Depósito' : (row.formaPagamento || 'Boleto'));
    const paymentConfigJson = JSON.stringify(paymentConfig);

    // Atualiza o registro no banco SQLite
    await execute(`
      UPDATE purchase_orders SET
        tipoFrete = ?,
        valorFrete = ?,
        formaPagamento = ?,
        paymentConfigJson = ?,
        installmentsJson = ?
      WHERE id = ?
    `, [
      tipoFrete,
      valorFrete,
      finalFormaPgto,
      paymentConfigJson,
      JSON.stringify(installments),
      row.id
    ]);

    // Assegura que order_installments esteja sincronizado
    if (installments.length > 0) {
      await execute("DELETE FROM order_installments WHERE orderId = ?", [row.id]);
      const now = new Date().toISOString();
      for (let idx = 0; idx < installments.length; idx++) {
        const inst = installments[idx];
        const instId = `inst_${row.id}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await execute(`
          INSERT OR REPLACE INTO order_installments (
            id, orderId, numeroParcela, totalParcelas, dataVencimento, valor,
            valorOriginal, status, dataPagamento, observacao, documentoRef,
            isBoletoFrete, tipoTitulo, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          instId,
          row.id,
          Number(inst.numeroParcela) || (idx + 1),
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
    }

    console.log(`✔ Pedido ${num} atualizado: Frete = ${tipoFrete} (R$ ${valorFrete.toFixed(2)}), Forma = ${finalFormaPgto}, Prazo = ${paymentConfig.prazoDias || 'N/A'}`);
  }

  // 4. Reidratar PED-140933 se ausente no SQLite
  const p33Check = await queryOne("SELECT id FROM purchase_orders WHERE numeroPedido = 'PED-140933'");
  if (!p33Check && backupOrdersMap.has('PED-140933')) {
    const ord33 = backupOrdersMap.get('PED-140933');
    const orderRepo = require('../src/repositories/orderRepository');
    const restored = await orderRepo.save(ord33);
    console.log(`✔ Pedido PED-140933 reidratado com sucesso no SQLite! ID: ${restored.header.id}`);
  }

  saveDatabaseToDisk();
  console.log('✔ Reparação e sincronização do SQLite concluída com sucesso!');
}

repair().catch(err => {
  console.error('Erro na reparação do banco:', err);
  process.exit(1);
});
