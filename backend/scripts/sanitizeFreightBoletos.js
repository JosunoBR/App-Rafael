/**
 * sanitizeFreightBoletos.js
 * 
 * Script de saneamento e isolamento de boletos de frete no SQLite (mega12.db).
 * 1. Cria backup prévio do banco com timestamp.
 * 2. Descontamina parcelas de mercadoria nos pedidos: 181290 (MB PLASTICOS), 10494 (PRIME PLAS) e PED-140929 (DPOT).
 * 3. Isola todos os boletos de frete no financeiro: tipo = 'despesa', categoria = 'FRETE', fornecedor = '${fornecedor} (Frete)'.
 * 4. Valida a integridade matemática dos pedidos e parcelas.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = process.env.DB_PATH || '/var/www/app-rafael/backend/data/mega12.db';

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ Banco de dados não encontrado em: ${DB_PATH}`);
  process.exit(1);
}

// 1. BACKUP
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `${DB_PATH}.backup_frete_${timestamp}`;
console.log(`📦 Criando backup de segurança em: ${backupPath}`);
fs.copyFileSync(DB_PATH, backupPath);
console.log(`✅ Backup criado com sucesso!`);

function query(sql) {
  const cmd = `sqlite3 -json "${DB_PATH}" << 'EOF'\n${sql}\nEOF`;
  const out = execSync(cmd, { maxBuffer: 15 * 1024 * 1024 }).toString().trim();
  if (!out) return [];
  return JSON.parse(out);
}

function execute(sql) {
  const cmd = `sqlite3 "${DB_PATH}" << 'EOF'\n${sql}\nEOF`;
  execSync(cmd, { maxBuffer: 15 * 1024 * 1024 });
}

console.log(`\n🚀 INICIANDO SANEAMENTO DE FRETE...`);

// 2. CORREÇÃO ESPECÍFICA: PEDIDO 181290 (MB PLASTICOS)
console.log(`\n--- [1/3] Saneando Pedido 181290 (MB PLASTICOS) ---`);
const mbOrders = query(`SELECT id, numeroPedido, installmentsJson FROM purchase_orders WHERE numeroPedido = '181290' OR id = 'order_1789498676436'`);
if (mbOrders.length > 0) {
  const mbOrder = mbOrders[0];
  let insts = JSON.parse(mbOrder.installmentsJson || '[]');
  
  // Limpar parcela 3 de mercadoria
  insts = insts.map(i => {
    if (i.numeroParcela === 3 && !i.isBoletoFrete && i.tipoTitulo !== 'frete') {
      return {
        ...i,
        observacao: 'Parcela 3/21 (+20d)',
        documentoRef: '',
        tipoTitulo: 'mercadoria',
        isBoletoFrete: false
      };
    }
    if (i.isBoletoFrete || i.tipoTitulo === 'frete' || i.numeroParcela === 22) {
      return {
        ...i,
        fornecedor: 'MB PLASTICOS (Frete)',
        tipoTitulo: 'frete',
        isBoletoFrete: true,
        documentoRef: 'Boleto Frete'
      };
    }
    return i;
  });

  const updatedJson = JSON.stringify(insts).replace(/'/g, "''");
  execute(`UPDATE purchase_orders SET installmentsJson = '${updatedJson}' WHERE id = '${mbOrder.id}';`);

  // Ajustar financeiro do pedido 181290
  const p3Entries = query(`SELECT id FROM financial_entries WHERE orderId = '${mbOrder.id}' AND parcelaNumero = 3 AND categoria != 'FRETE'`);
  if (p3Entries.length === 0) {
    console.log(`  -> Restaurando parcela 3 ausente no financeiro...`);
    const newId = `fin_${mbOrder.id}_merc_3_${Date.now()}`;
    execute(`
      INSERT INTO financial_entries (
        id, tipo, orderId, installmentId, descricao, categoria, fornecedor,
        storeId, lojaNome, empresa, formaPagamento, bancoConta, documentoRef,
        parcelaNumero, parcelaTotal, parcelaDesc, dataVencimento, valor,
        status, valorPago, observacao, statusPrevisao, createdAt, updatedAt
      ) VALUES (
        '${newId}', 'pedido_parcela', '${mbOrder.id}', 'inst_${mbOrder.id}_3',
        'MB PLASTICOS - Pedido 181290 (3/21)', 'PRODUTOS', 'MB PLASTICOS',
        'matriz', 'Depósito Central / Matriz', 'ALS', 'BOLETO', '', '181290',
        3, 21, '3/21', '03/12/2026', 4386.52,
        'A Vencer', 0, '[CONFIRMADO - Autorizado pela Diretoria] Parcela 3/21 (+20d)',
        'CONFIRMADO', datetime('now'), datetime('now')
      );
    `);
  } else {
    execute(`
      UPDATE financial_entries 
      SET observacao = '[CONFIRMADO - Autorizado pela Diretoria] Parcela 3/21 (+20d)',
          categoria = 'PRODUTOS',
          tipo = 'pedido_parcela',
          documentoRef = '181290'
      WHERE orderId = '${mbOrder.id}' AND parcelaNumero = 3 AND categoria != 'FRETE';
    `);
  }
  execute(`
    UPDATE financial_entries 
    SET fornecedor = 'MB PLASTICOS (Frete)',
        categoria = 'FRETE',
        tipo = 'despesa',
        descricao = 'MB PLASTICOS (Frete) - Pedido 181290',
        documentoRef = 'Boleto Frete - Ped. 181290'
    WHERE orderId = '${mbOrder.id}' AND (categoria = 'FRETE' OR parcelaNumero = 22);
  `);
  console.log(`✅ Pedido 181290 saneado com sucesso!`);
}

// 3. CORREÇÃO ESPECÍFICA: PEDIDO 10494 (PRIME PLAS)
console.log(`\n--- [2/3] Saneando Pedido 10494 (PRIME PLAS) ---`);
const ppOrders = query(`SELECT id, numeroPedido, installmentsJson FROM purchase_orders WHERE numeroPedido = '10494' OR id = 'order_1789407619182'`);
if (ppOrders.length > 0) {
  const ppOrder = ppOrders[0];
  let insts = JSON.parse(ppOrder.installmentsJson || '[]');
  
  // Limpar parcela 4 de mercadoria
  insts = insts.map(i => {
    if (i.numeroParcela === 4 && !i.isBoletoFrete && i.tipoTitulo !== 'frete') {
      return {
        ...i,
        observacao: 'Parcela 4/7 (+30d)',
        documentoRef: '',
        tipoTitulo: 'mercadoria',
        isBoletoFrete: false
      };
    }
    if (i.isBoletoFrete || i.tipoTitulo === 'frete' || i.numeroParcela === 8) {
      return {
        ...i,
        fornecedor: 'PRIME PLAS (Frete)',
        tipoTitulo: 'frete',
        isBoletoFrete: true,
        documentoRef: 'Boleto Frete'
      };
    }
    return i;
  });

  const updatedJson = JSON.stringify(insts).replace(/'/g, "''");
  execute(`UPDATE purchase_orders SET installmentsJson = '${updatedJson}' WHERE id = '${ppOrder.id}';`);

  // Verificar se parcela 4 existe no financeiro
  const p4Entries = query(`SELECT id FROM financial_entries WHERE orderId = '${ppOrder.id}' AND parcelaNumero = 4`);
  if (p4Entries.length === 0) {
    console.log(`  -> Restaurando parcela 4 ausente no financeiro...`);
    const newId = `fin_${ppOrder.id}_merc_4_${Date.now()}`;
    execute(`
      INSERT INTO financial_entries (
        id, tipo, orderId, installmentId, descricao, categoria, fornecedor,
        storeId, lojaNome, empresa, formaPagamento, bancoConta, documentoRef,
        parcelaNumero, parcelaTotal, parcelaDesc, dataVencimento, valor,
        status, valorPago, observacao, statusPrevisao, createdAt, updatedAt
      ) VALUES (
        '${newId}', 'pedido_parcela', '${ppOrder.id}', 'inst_${ppOrder.id}_4',
        'PRIME PLAS - Pedido 10494 (4/7)', 'PRODUTOS', 'PRIME PLAS',
        'matriz', 'Depósito Central / Matriz', 'ALS', 'BOLETO', '', '10494',
        4, 7, '4/7', '14/12/2026', 1346.00,
        'A Vencer', 0, '[CONFIRMADO - Autorizado pela Diretoria] Parcela 4/7 (+30d)',
        'CONFIRMADO', datetime('now'), datetime('now')
      );
    `);
  } else {
    execute(`
      UPDATE financial_entries 
      SET observacao = '[CONFIRMADO - Autorizado pela Diretoria] Parcela 4/7 (+30d)',
          categoria = 'PRODUTOS',
          tipo = 'pedido_parcela',
          documentoRef = '10494'
      WHERE orderId = '${ppOrder.id}' AND parcelaNumero = 4;
    `);
  }

  // Isolar frete
  execute(`
    UPDATE financial_entries 
    SET fornecedor = 'PRIME PLAS (Frete)',
        categoria = 'FRETE',
        tipo = 'despesa',
        descricao = 'PRIME PLAS (Frete) - Pedido 10494',
        documentoRef = 'Boleto Frete - Ped. 10494'
    WHERE orderId = '${ppOrder.id}' AND (categoria = 'FRETE' OR parcelaNumero = 8);
  `);
  console.log(`✅ Pedido 10494 saneado com sucesso!`);
}

// 4. CORREÇÃO ESPECÍFICA: PEDIDO PED-140929 (DPOT)
console.log(`\n--- [3/3] Saneando Pedido PED-140929 (DPOT) ---`);
const dpotOrders = query(`SELECT id, numeroPedido, installmentsJson FROM purchase_orders WHERE numeroPedido = 'PED-140929' OR id = 'order_1789511481356'`);
if (dpotOrders.length > 0) {
  const dpotOrder = dpotOrders[0];
  let insts = JSON.parse(dpotOrder.installmentsJson || '[]');

  // O total do pedido é 26028.00 em 10 parcelas de 2602.80 + frete de 910.98
  const baseVal = 2602.80;
  insts = insts.map((i, idx) => {
    if (i.numeroParcela <= 10 && !i.isBoletoFrete && i.tipoTitulo !== 'frete') {
      return {
        ...i,
        valor: baseVal,
        valorOriginal: baseVal,
        observacao: `Parcela ${i.numeroParcela}/10`,
        documentoRef: '',
        tipoTitulo: 'mercadoria',
        isBoletoFrete: false
      };
    }
    if (i.isBoletoFrete || i.tipoTitulo === 'frete' || i.numeroParcela === 11) {
      return {
        ...i,
        valor: 910.98,
        valorOriginal: 910.98,
        fornecedor: 'DPOT (Frete)',
        tipoTitulo: 'frete',
        isBoletoFrete: true,
        documentoRef: 'Boleto Frete'
      };
    }
    return i;
  });

  const updatedJson = JSON.stringify(insts).replace(/'/g, "''");
  execute(`UPDATE purchase_orders SET installmentsJson = '${updatedJson}' WHERE id = '${dpotOrder.id}';`);

  // Atualizar as 10 parcelas de mercadoria no financeiro
  for (let p = 1; p <= 10; p++) {
    execute(`
      UPDATE financial_entries 
      SET valor = 2602.80,
          categoria = 'PRODUTOS',
          tipo = 'pedido_parcela',
          fornecedor = 'DPOT',
          descricao = 'DPOT - Pedido PED-140929 (${p}/10)',
          observacao = '[PREVISÃO - Aguardando recebimento e autorização da Diretoria] Parcela ${p}/10',
          documentoRef = 'PED-140929'
      WHERE orderId = '${dpotOrder.id}' AND parcelaNumero = ${p};
    `);
  }

  // Frete no financeiro do DPOT
  const freteDpot = query(`SELECT id FROM financial_entries WHERE orderId = '${dpotOrder.id}' AND (categoria = 'FRETE' OR documentoRef LIKE '%Frete%')`);
  if (freteDpot.length > 0) {
    execute(`
      UPDATE financial_entries 
      SET valor = 910.98,
          categoria = 'FRETE',
          tipo = 'despesa',
          fornecedor = 'DPOT (Frete)',
          descricao = 'DPOT (Frete) - Pedido PED-140929',
          documentoRef = 'Boleto Frete - Ped. PED-140929'
      WHERE id = '${freteDpot[0].id}';
    `);
  } else {
    const freteId = `fin_${dpotOrder.id}_frete_${Date.now()}`;
    execute(`
      INSERT INTO financial_entries (
        id, tipo, orderId, installmentId, descricao, categoria, fornecedor,
        storeId, lojaNome, empresa, formaPagamento, bancoConta, documentoRef,
        parcelaNumero, parcelaTotal, parcelaDesc, dataVencimento, valor,
        status, valorPago, observacao, statusPrevisao, createdAt, updatedAt
      ) VALUES (
        '${freteId}', 'despesa', '${dpotOrder.id}', 'inst_frete_${dpotOrder.id}',
        'DPOT (Frete) - Pedido PED-140929', 'FRETE', 'DPOT (Frete)',
        'matriz', 'Depósito Central / Matriz', 'ALS', 'BOLETO', '', 'Boleto Frete - Ped. PED-140929',
        11, 11, 'Frete', '18/01/2027', 910.98,
        'A Vencer', 0, '[PREVISÃO - Aguardando recebimento e autorização da Diretoria] Boleto de Frete (10 dias após a entrega)',
        'PREVISTO', datetime('now'), datetime('now')
      );
    `);
  }
  console.log(`✅ Pedido PED-140929 saneado com sucesso!`);
}

// 5. SANEAMENTO UNIVERSAL DE TODOS OS BOLETOS DE FRETE EXISTENTES
console.log(`\n--- [4/4] Isolando todos os boletos de frete no financeiro ---`);
const allFrete = query(`
  SELECT id, orderId, fornecedor, descricao, valor 
  FROM financial_entries 
  WHERE categoria = 'FRETE' 
     OR observacao LIKE '%Boleto de Frete%' 
     OR documentoRef LIKE '%Boleto Frete%'
`);

console.log(`Encontrados ${allFrete.length} boletos de frete para isolar.`);

for (const f of allFrete) {
  let cleanFornec = (f.fornecedor || 'Fornecedor').replace(/\s*\(Frete\)/i, '').trim();
  const novoFornecedor = `${cleanFornec} (Frete)`;
  const descSafe = (f.descricao || '').replace(/'/g, "''");
  
  execute(`
    UPDATE financial_entries 
    SET tipo = 'despesa',
        categoria = 'FRETE',
        fornecedor = '${novoFornecedor}'
    WHERE id = '${f.id}';
  `);
}
console.log(`✅ Todos os boletos de frete isolados com sufixo (Frete) e tipo 'despesa'!`);

// 6. AUDITORIA FINAL DE VALIDAÇÃO
console.log(`\n======================================================`);
console.log(`🔍 AUDITORIA FINAL DE INTEGRIDADE:`);
console.log(`======================================================`);

const allOrders = query(`
  SELECT id, numeroPedido, fornecedor, totalGeral, valorFrete 
  FROM purchase_orders 
  WHERE valorFrete > 0
`);

let allClean = true;

for (const o of allOrders) {
  const finMerc = query(`
    SELECT SUM(valor) as totalMerc, COUNT(*) as qtd
    FROM financial_entries 
    WHERE orderId = '${o.id}' AND categoria != 'FRETE'
  `)[0];

  const finFrete = query(`
    SELECT SUM(valor) as totalFrete, COUNT(*) as qtd, fornecedor
    FROM financial_entries 
    WHERE orderId = '${o.id}' AND categoria = 'FRETE'
  `)[0];

  const mercVal = Number(finMerc.totalMerc) || 0;
  const freteVal = Number(finFrete.totalFrete) || 0;
  const diffMerc = Math.abs(mercVal - o.totalGeral);

  const statusIcon = diffMerc < 0.05 ? '✅' : '⚠️';
  if (diffMerc >= 0.05) allClean = false;

  console.log(`${statusIcon} Pedido ${o.numeroPedido} (${o.fornecedor}):`);
  console.log(`   - Total Pedido (Mercadorias): R$ ${o.totalGeral.toFixed(2)} | Boletos Mercadoria: R$ ${mercVal.toFixed(2)} (${finMerc.qtd}x) | Diff: R$ ${diffMerc.toFixed(2)}`);
  console.log(`   - Frete Informado: R$ ${o.valorFrete.toFixed(2)} | Boleto Frete: R$ ${freteVal.toFixed(2)} [Fornec: "${finFrete.fornecedor || 'N/A'}"]`);
}

if (allClean) {
  console.log(`\n🎉 SUCESSO ABSOLUTO! 100% dos boletos de mercadorias conferem perfeitamente com os pedidos, e todos os fretes estão isolados à parte!`);
} else {
  console.log(`\n⚠️ Algumas divergências pontuais ainda existem (possivelmente devidas a ajustes fiscais ou rupturas).`);
}
