const { queryAll, queryOne, execute, flushDatabaseToDisk } = require('/app/backend/src/config/database');

(async () => {
  try {
    console.log('=== INICIANDO MIGRAÇÃO DO LOTE DE JANEIRO 2027 NO RAILWAY ===');

    // 1. Verificação prévia dos 4 lotes
    const b1 = await queryAll("SELECT count(*) as qtd, sum(valor) as total FROM financial_entries WHERE id LIKE 'fin_imp_17906265769%'");
    const b2 = await queryAll("SELECT count(*) as qtd, sum(valor) as total FROM financial_entries WHERE id LIKE 'fin_imp_17906266478%'");
    const b3 = await queryAll("SELECT count(*) as qtd, sum(valor) as total FROM financial_entries WHERE id LIKE 'fin_imp_17906267139%'");
    const b4 = await queryAll("SELECT count(*) as qtd, sum(valor) as total FROM financial_entries WHERE id LIKE 'fin_imp_17906268861%'");

    console.log(`Lote 1 (20:16): ${b1[0].qtd} contas (R$ ${b1[0].total})`);
    console.log(`Lote 2 (20:17): ${b2[0].qtd} contas (R$ ${b2[0].total})`);
    console.log(`Lote 3 (20:18): ${b3[0].qtd} contas (R$ ${b3[0].total})`);
    console.log(`Lote 4 (20:21): ${b4[0].qtd} contas (R$ ${b4[0].total})`);

    if (b4[0].qtd !== 143) {
      throw new Error(`Contagem inesperada para o lote 4: ${b4[0].qtd} (esperado 143). Abortando por segurança.`);
    }

    // 2. Remoção cirúrgica das 3 tentativas duplicadas
    console.log('\n--- Removendo 3 lotes excedentes duplicados ---');
    await execute(`
      DELETE FROM financial_entries 
      WHERE id LIKE 'fin_imp_17906265769%' 
         OR id LIKE 'fin_imp_17906266478%' 
         OR id LIKE 'fin_imp_17906267139%'
    `);
    console.log('Lotes excedentes removidos com sucesso.');

    // 3. Ajustar o ano do Lote 4 de 2026 para 2027
    console.log('\n--- Atualizando Lote 4 para Janeiro de 2027 ---');
    await execute(`
      UPDATE financial_entries 
      SET 
        dataVencimento = REPLACE(dataVencimento, '/2026', '/2027'),
        updatedAt = datetime('now')
      WHERE id LIKE 'fin_imp_17906268861%'
    `);
    console.log('Lote 4 atualizado com sucesso.');

    // 4. Forçar gravação em disco
    console.log('\n--- Persistindo alterações em disco no Railway ---');
    flushDatabaseToDisk();

    // 5. Validação final pós-migração
    console.log('\n=== VALIDAÇÃO PÓS-MIGRAÇÃO ===');
    const migratedBatch = await queryAll(`
      SELECT 
        count(*) as qtd,
        sum(valor) as total,
        min(dataVencimento) as minVenc,
        max(dataVencimento) as maxVenc
      FROM financial_entries 
      WHERE id LIKE 'fin_imp_17906268861%'
    `);
    console.log('Lote migrado no banco:', migratedBatch);

    const jan2027Total = await queryAll(`
      SELECT 
        tipo,
        count(*) as qtd,
        sum(valor) as total
      FROM financial_entries 
      WHERE dataVencimento LIKE '%/01/2027'
      GROUP BY tipo
    `);
    console.log('Total consolidado em Janeiro/2027 no sistema:', jan2027Total);

    const amostra = await queryAll(`
      SELECT id, descricao, valor, dataVencimento, formaPagamento, categoria, lojaNome
      FROM financial_entries 
      WHERE id LIKE 'fin_imp_17906268861%'
      ORDER BY dataVencimento ASC
      LIMIT 5
    `);
    console.log('Amostra de 5 contas em Janeiro/2027:', amostra);

    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
  } catch (err) {
    console.error('Erro na migração:', err);
  }
})();
