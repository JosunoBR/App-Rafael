const path = require('path');
const fs = require('fs');
const { getDatabase, flushDatabaseToDisk, queryAll, execute } = require('../src/config/database');

async function reconcile() {
  const isApply = process.argv.includes('--apply');
  console.log('===============================================================');
  console.log(`🧹 CONCILIAÇÃO ASSISTIDA DE DUPLICIDADES FINANCEIRAS [${isApply ? 'MODO EXECUÇÃO' : 'MODO DRY-RUN'}]`);
  console.log('===============================================================');

  const db = await getDatabase();

  // 1. Localizar grupos de duplicidade com mesma descrição, valor, vencimento e loja
  const rows = await queryAll(`
    SELECT 
      id,
      descricao,
      valor,
      dataVencimento,
      lojaNome,
      storeId,
      documentoRef,
      status,
      valorPago,
      dataPagamento,
      comprovanteArquivo,
      createdAt,
      orderId,
      parcelaNumero,
      parcelaTotal,
      parcelaDesc
    FROM financial_entries
    ORDER BY UPPER(TRIM(descricao)) ASC, valor ASC, dataVencimento ASC, createdAt ASC
  `);

  // Agrupar por chave canônica
  const groups = new Map();
  for (const r of rows) {
    const desc = String(r.descricao || '').trim().toUpperCase();
    const val = Number(r.valor || 0).toFixed(2);
    const venc = String(r.dataVencimento || '').trim();
    const loja = String(r.lojaNome || r.storeId || 'ALS').trim().toUpperCase();
    const key = `${desc}__${val}__${venc}__${loja}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(r);
  }

  const suspiciousGroups = [];
  for (const [key, list] of groups.entries()) {
    if (list.length > 1) {
      suspiciousGroups.push({ key, list });
    }
  }

  console.log(`Encontrados ${suspiciousGroups.length} grupos com registros de mesma chave (descrição, valor, vencimento, loja).\n`);

  const confirmedClonesToRemove = [];
  const manualReviewGroups = [];

  for (const grp of suspiciousGroups) {
    const list = grp.list;

    // Verificar se são clones criados com pequena diferença de tempo
    // Critério de clone automático:
    // 1) Criados com diferença <= 120 segundos entre si OU gerados na mesma importação (mesmo prefixo de timestamp fin_imp_...)
    // 2) Documentos idênticos (ou ambos sem documento)
    let isAutomaticClone = false;

    // Ordenar de forma que o melhor registro fique no topo (para ser mantido)
    // Prioridade para manter:
    // 1. Status 'Pago'
    // 2. Com comprovante anexado
    // 3. Com orderId associado
    // 4. Mais antigo (menor createdAt)
    list.sort((a, b) => {
      if (a.status === 'Pago' && b.status !== 'Pago') return -1;
      if (b.status === 'Pago' && a.status !== 'Pago') return 1;
      if (a.comprovanteArquivo && !b.comprovanteArquivo) return -1;
      if (b.comprovanteArquivo && !a.comprovanteArquivo) return 1;
      if (a.orderId && !b.orderId) return -1;
      if (b.orderId && !a.orderId) return 1;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

    const keeper = list[0];
    const others = list.slice(1);

    for (const candidate of others) {
      const keeperTime = new Date(keeper.createdAt || 0).getTime();
      const candTime = new Date(candidate.createdAt || 0).getTime();
      const diffSecs = Math.abs(candTime - keeperTime) / 1000;

      const sameDoc = (String(keeper.documentoRef || '').trim().toUpperCase() === String(candidate.documentoRef || '').trim().toUpperCase());
      const bothNoDoc = (!keeper.documentoRef && !candidate.documentoRef);

      // Se foi criado com menos de 120s de diferença e tem o mesmo documento ou ambos sem doc
      if ((diffSecs <= 120 || isNaN(diffSecs)) && (sameDoc || bothNoDoc)) {
        confirmedClonesToRemove.push({
          removeId: candidate.id,
          keepId: keeper.id,
          descricao: candidate.descricao,
          valor: candidate.valor,
          vencimento: candidate.dataVencimento,
          loja: candidate.lojaNome,
          diffSecs: Math.round(diffSecs),
          candidateCreatedAt: candidate.createdAt,
          keeperCreatedAt: keeper.createdAt,
          status: candidate.status
        });
      } else {
        manualReviewGroups.push({
          keeper,
          candidate,
          reason: `Documentos diferentes (${keeper.documentoRef || 'S/N'} vs ${candidate.documentoRef || 'S/N'}) ou diferença temporal alta (${Math.round(diffSecs)}s)`
        });
      }
    }
  }

  console.log(`---------------------------------------------------------------`);
  console.log(`📋 RESUMO DA ANÁLISE:`);
  console.log(`  • Clones Confirmados para Remoção: ${confirmedClonesToRemove.length}`);
  console.log(`  • Casos para Revisão Manual (Preservados): ${manualReviewGroups.length}`);
  console.log(`---------------------------------------------------------------\n`);

  if (confirmedClonesToRemove.length > 0) {
    console.log(`🔎 DETALHES DOS CLONES CONFIRMADOS:`);
    confirmedClonesToRemove.forEach((c, idx) => {
      console.log(`  [${idx + 1}] Remover: ${c.removeId} | Manter: ${c.keepId}`);
      console.log(`      Descrição: "${c.descricao}" | R$ ${c.valor} | Venc: ${c.vencimento} | Loja: ${c.loja}`);
      console.log(`      Diferença de Criação: ${c.diffSecs}s (${c.candidateCreatedAt} vs ${c.keeperCreatedAt}) | Status: ${c.status}\n`);
    });
  }

  if (manualReviewGroups.length > 0) {
    console.log(`⚠️ CASOS MANTIDOS (NÃO REMOVIDOS AUTOMATICAMENTE):`);
    manualReviewGroups.forEach((m, idx) => {
      console.log(`  [${idx + 1}] Chave: "${m.keeper.descricao}" | R$ ${m.keeper.valor} | Venc: ${m.keeper.dataVencimento}`);
      console.log(`      IDs: ${m.keeper.id} vs ${m.candidate.id}`);
      console.log(`      Motivo da Preservação: ${m.reason}\n`);
    });
  }

  if (isApply) {
    if (confirmedClonesToRemove.length === 0) {
      console.log('✔ Nenhum clone confirmado para remover. Nenhuma alteração efetuada.');
      return;
    }

    console.log('🛡️ Criando backup de segurança pré-conciliação...');
    const dataDir = path.resolve(__dirname, '../data');
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `mega12_pre_reconciliation_${Date.now()}.db`);
    fs.copyFileSync(path.join(dataDir, 'mega12.db'), backupPath);
    console.log(`✔ Backup salvo em: ${backupPath}`);

    console.log(`🗑️ Removendo ${confirmedClonesToRemove.length} registros duplicados confirmados...`);
    db.run("BEGIN TRANSACTION;");
    try {
      for (const item of confirmedClonesToRemove) {
        db.run("DELETE FROM financial_entries WHERE id = ?", [item.removeId]);
      }
      db.run("COMMIT;");
      flushDatabaseToDisk();
      console.log(`===============================================================`);
      console.log(`🎉 CONCILIAÇÃO EXECUTADA COM SUCESSO! Removidos: ${confirmedClonesToRemove.length} registros.`);
      console.log(`===============================================================`);
    } catch (err) {
      try { db.run("ROLLBACK;"); } catch (_) {}
      console.error('❌ Erro durante a conciliação:', err);
    }
  } else {
    console.log('===============================================================');
    console.log('ℹ️ Para aplicar as remoções dos clones confirmados com backup automático,');
    console.log('   execute o comando com o parâmetro: --apply');
    console.log('   Exemplo: node scripts/reconcile_financial_duplicates.js --apply');
    console.log('===============================================================');
  }
}

reconcile().catch(console.error);
