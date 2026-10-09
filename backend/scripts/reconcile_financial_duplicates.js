const path = require('path');
const fs = require('fs');
const { getDatabase, flushDatabaseToDisk, queryAll, execute } = require('../src/config/database');

function normalizeForma(val) {
  if (!val) return 'BOLETO';
  const clean = String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  if (clean.includes('DEP')) return 'DEPOSITO';
  if (clean.includes('PIX') || clean.includes('DINHEIRO')) return 'DINHEIRO';
  if (clean.includes('CHEQUE')) return 'CHEQUE';
  if (clean.includes('BOLETO')) return 'BOLETO';
  return clean;
}

function normalizeParcela(r) {
  const num = parseInt(r.parcelaNumero, 10);
  const total = parseInt(r.parcelaTotal, 10);

  if (r.parcelaDesc) {
    const desc = String(r.parcelaDesc).trim().toUpperCase();
    const descNorm = desc.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (descNorm === 'UNICA' || descNorm === '1/1') return '1/1';
    if (/^\d+\/\d+$/.test(descNorm)) return descNorm;
    if (!isNaN(num) && !isNaN(total) && total > 1) return `${num}/${total}`;
    return descNorm;
  }

  if (!isNaN(num) && !isNaN(total) && total > 0) {
    return `${num}/${total}`;
  }
  if (!isNaN(num) && num > 0) {
    return `${num}/1`;
  }
  return '1/1';
}

async function reconcile() {
  const isApply = process.argv.includes('--apply');
  console.log('=============================================================================');
  console.log(`🧹 CONCILIAÇÃO INTELIGENTE DE DUPLICIDADES FINANCEIRAS [${isApply ? 'MODO EXECUÇÃO' : 'MODO DRY-RUN'}]`);
  console.log('   Critérios analisados: Descrição, Valor, Vencimento, Loja, Parcela e Forma de Pgto');
  console.log('=============================================================================\n');

  const db = await getDatabase();

  // 1. Obter todos os lançamentos
  const rows = await queryAll(`
    SELECT 
      id,
      descricao,
      valor,
      dataVencimento,
      lojaNome,
      storeId,
      documentoRef,
      formaPagamento,
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

  // 2. Agrupamento considerando: Descrição + Valor + Vencimento + Loja + Parcela
  // Nota: Deixando a Parcela na chave de agrupamento, títulos com parcelas distintas
  // (ex: 6/7 e 7/7 de MM PASSERINI) NUNCA serão agrupados juntos!
  const groups = new Map();
  for (const r of rows) {
    const desc = String(r.descricao || '').trim().toUpperCase();
    const val = Number(r.valor || 0).toFixed(2);
    const venc = String(r.dataVencimento || '').trim();
    const loja = String(r.lojaNome || r.storeId || 'ALS').trim().toUpperCase();
    const parc = normalizeParcela(r);
    const key = `${desc}__${val}__${venc}__${loja}__${parc}`;

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

  console.log(`Encontrados ${suspiciousGroups.length} grupos com concorrência na mesma parcela (mesma descrição, valor, vencimento, loja e parcela).\n`);

  const confirmedClonesToRemove = [];
  const crossPaymentConflicts = [];
  const manualReviewOther = [];

  for (const grp of suspiciousGroups) {
    const list = grp.list;

    // Ordenar para definir o registro prioritário a manter:
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
      const sameForma = normalizeForma(keeper.formaPagamento) === normalizeForma(candidate.formaPagamento);
      const sameParc = normalizeParcela(keeper) === normalizeParcela(candidate);

      // CASO 1: Clone Exato Confirmado
      // Mesma parcela + Mesma forma de pagamento + Mesmo documento (ou ambos sem doc) + Criados juntos (diffSecs <= 120s ou ambos sem timestamp válido)
      if (sameParc && sameForma && (sameDoc || bothNoDoc) && (diffSecs <= 120 || isNaN(diffSecs))) {
        confirmedClonesToRemove.push({
          removeId: candidate.id,
          keepId: keeper.id,
          descricao: candidate.descricao,
          valor: candidate.valor,
          vencimento: candidate.dataVencimento,
          loja: candidate.lojaNome || 'ALS',
          formaPagamento: candidate.formaPagamento || 'BOLETO',
          parcela: normalizeParcela(candidate),
          diffSecs: Math.round(diffSecs),
          candidateCreatedAt: candidate.createdAt,
          keeperCreatedAt: keeper.createdAt,
          status: candidate.status,
          candidateDoc: candidate.documentoRef || 'S/N',
          keeperDoc: keeper.documentoRef || 'S/N'
        });
      } 
      // CASO 2: Conflito Cruzado de Forma de Pagamento (ex: BOLETO vs DEPÓSITO com sufixo /E)
      else if (sameParc && !sameForma) {
        crossPaymentConflicts.push({
          keeper,
          candidate,
          reason: `Formas de pagamento divergentes para a mesma parcela (${normalizeForma(keeper.formaPagamento)} doc "${keeper.documentoRef || 'S/N'}" vs ${normalizeForma(candidate.formaPagamento)} doc "${candidate.documentoRef || 'S/N'}")`
        });
      } 
      // CASO 3: Mesma parcela e mesma forma, porém com documentos distintos ou diferença temporal alta
      else {
        let reason = '';
        if (!sameDoc && !bothNoDoc) {
          reason = `Documentos diferentes ("${keeper.documentoRef || 'S/N'}" vs "${candidate.documentoRef || 'S/N'}")`;
        } else {
          reason = `Diferença temporal elevada entre os cadastros (${Math.round(diffSecs)}s)`;
        }
        manualReviewOther.push({
          keeper,
          candidate,
          reason
        });
      }
    }
  }

  console.log(`-----------------------------------------------------------------------------`);
  console.log(`📋 RESUMO DA ANÁLISE DETALHADA:`);
  console.log(`  1. Clones Confirmados (Mesma Parcela + Mesma Forma + Mesmo Doc): ${confirmedClonesToRemove.length}`);
  console.log(`  2. Conflitos Cruzados de Forma de Pgto (BOLETO vs DEPÓSITO /E): ${crossPaymentConflicts.length}`);
  console.log(`  3. Outros Casos de Revisão Manual (Docs diferentes / Tempo alto): ${manualReviewOther.length}`);
  console.log(`-----------------------------------------------------------------------------\n`);

  if (confirmedClonesToRemove.length > 0) {
    console.log(`🔎 [1] DETALHES DOS CLONES CONFIRMADOS (CANDIDATOS À EXCLUSÃO):`);
    confirmedClonesToRemove.forEach((c, idx) => {
      console.log(`  [${idx + 1}] Remover: ID ${c.removeId} | Manter: ID ${c.keepId}`);
      console.log(`      Descrição: "${c.descricao}" | R$ ${Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Venc: ${c.vencimento} | Loja: ${c.loja}`);
      console.log(`      Parcela: ${c.parcela} | Forma: ${c.formaPagamento} | Doc: "${c.candidateDoc}" | Status: ${c.status}`);
      console.log(`      Diferença de Criação: ${c.diffSecs}s (${c.candidateCreatedAt} vs ${c.keeperCreatedAt})\n`);
    });
  } else {
    console.log(`✔ [1] Nenhum clone idêntico (mesma parcela + mesma forma + mesmo doc) encontrado.\n`);
  }

  if (crossPaymentConflicts.length > 0) {
    console.log(`⚠️ [2] CONFLITOS CRUZADOS DE FORMA DE PAGAMENTO (PRESERVADOS PARA REVISÃO):`);
    console.log(`   (Ocorrências onde a mesma parcela consta como BOLETO e como DEPÓSITO/E na importação)\n`);
    crossPaymentConflicts.forEach((m, idx) => {
      console.log(`  [${idx + 1}] Chave: "${m.keeper.descricao}" | R$ ${Number(m.keeper.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Venc: ${m.keeper.dataVencimento} | Parcela: ${normalizeParcela(m.keeper)}`);
      console.log(`      • Registro A (Mantido): ID ${m.keeper.id}`);
      console.log(`        Doc: "${m.keeper.documentoRef || 'S/N'}" | Forma: ${m.keeper.formaPagamento || 'BOLETO'} | Status: ${m.keeper.status} | Criado: ${m.keeper.createdAt}`);
      console.log(`      • Registro B (Candidato): ID ${m.candidate.id}`);
      console.log(`        Doc: "${m.candidate.documentoRef || 'S/N'}" | Forma: ${m.candidate.formaPagamento || 'BOLETO'} | Status: ${m.candidate.status} | Criado: ${m.candidate.createdAt}`);
      console.log(`      👉 Motivo: ${m.reason}\n`);
    });
  }

  if (manualReviewOther.length > 0) {
    console.log(`⚠️ [3] OUTROS CASOS PARA REVISÃO MANUAL:`);
    manualReviewOther.forEach((m, idx) => {
      console.log(`  [${idx + 1}] Chave: "${m.keeper.descricao}" | R$ ${Number(m.keeper.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Venc: ${m.keeper.dataVencimento} | Parcela: ${normalizeParcela(m.keeper)}`);
      console.log(`      • Registro A: ID ${m.keeper.id} | Doc: "${m.keeper.documentoRef || 'S/N'}" | Forma: ${m.keeper.formaPagamento} | Status: ${m.keeper.status}`);
      console.log(`      • Registro B: ID ${m.candidate.id} | Doc: "${m.candidate.documentoRef || 'S/N'}" | Forma: ${m.candidate.formaPagamento} | Status: ${m.candidate.status}`);
      console.log(`      👉 Motivo: ${m.reason}\n`);
    });
  }

  if (isApply) {
    if (confirmedClonesToRemove.length === 0) {
      console.log('✔ Nenhum clone confirmado para remover. Nenhuma alteração efetuada no banco de dados.');
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
      console.log(`=============================================================================`);
      console.log(`🎉 CONCILIAÇÃO EXECUTADA COM SUCESSO! Removidos: ${confirmedClonesToRemove.length} registros.`);
      console.log(`=============================================================================`);
    } catch (err) {
      try { db.run("ROLLBACK;"); } catch (_) {}
      console.error('❌ Erro durante a conciliação:', err);
    }
  } else {
    console.log('=============================================================================');
    console.log('ℹ️ Para aplicar as remoções dos clones confirmados com backup automático,');
    console.log('   execute o comando com o parâmetro: --apply');
    console.log('   Exemplo: node scripts/reconcile_financial_duplicates.js --apply');
    console.log('=============================================================================');
  }
}

reconcile().catch(console.error);
