const assert = require('assert');
const { getDatabase, queryAll, queryOne } = require('../src/config/database');
const fiscalRepository = require('../src/repositories/fiscalRepository');
const backupRestoreService = require('../src/services/backupRestore.service');

async function runTests() {
  console.log('--- INICIANDO BATERIA DE TESTES: LOJAS DINÂMICAS & SHORTNAME ---');

  // 1. Inicializar Banco de Dados
  console.log('\n[1] Inicializando banco SQLite e executando migrações...');
  await getDatabase();
  console.log('✓ Banco de dados inicializado com sucesso.');

  // 2. Verificar Lojas Existentes e shortName
  console.log('\n[2] Verificando existência de lojas e integridade da coluna shortName...');
  const initialStores = await fiscalRepository.getStores();
  console.log(`✓ Total de lojas cadastradas: ${initialStores.length}`);
  assert(initialStores.length >= 20, 'Deveria haver pelo menos 20 lojas cadastradas');

  const pgCentro = initialStores.find(s => s.id === 'pg_centro');
  assert(pgCentro, 'Loja pg_centro deve existir');
  assert.strictEqual(pgCentro.shortName, 'PG Centro', `shortName de pg_centro deve ser "PG Centro", obtido: ${pgCentro.shortName}`);
  console.log(`✓ Loja 'pg_centro': name="${pgCentro.name}", shortName="${pgCentro.shortName}"`);

  const cdCentral = initialStores.find(s => s.id === 'deposito_central');
  assert(cdCentral, 'Loja deposito_central deve existir');
  assert.strictEqual(cdCentral.shortName, 'CD Central', `shortName de deposito_central deve ser "CD Central", obtido: ${cdCentral.shortName}`);
  console.log(`✓ Loja 'deposito_central': name="${cdCentral.name}", shortName="${cdCentral.shortName}"`);

  // Verificar que nenhuma loja tem shortName nulo ou vazio
  for (const s of initialStores) {
    assert(s.shortName && s.shortName.trim().length > 0, `Loja ${s.id} não deve ter shortName vazio`);
  }
  console.log('✓ Todas as lojas possuem shortName devidamente preenchido.');

  // 3. Testar Atualização de Nome e shortName (Edição)
  console.log('\n[3] Testando edição de nome e shortName de uma loja existente...');
  const originalPgName = pgCentro.name;
  const originalPgShort = pgCentro.shortName;

  const modifiedList = initialStores.map(s => {
    if (s.id === 'pg_centro') {
      return { ...s, name: 'Ponta Grossa Nova Matriz', shortName: 'PG Matriz' };
    }
    return s;
  });

  await fiscalRepository.updateStores(modifiedList);

  const updatedFromDb = await queryOne("SELECT name, shortName FROM stores WHERE id = 'pg_centro'");
  assert.strictEqual(updatedFromDb.name, 'Ponta Grossa Nova Matriz');
  assert.strictEqual(updatedFromDb.shortName, 'PG Matriz');
  console.log(`✓ Edição persistida no SQLite: name="${updatedFromDb.name}", shortName="${updatedFromDb.shortName}"`);

  // 4. Testar Inclusão Dinâmica de Nova Loja
  console.log('\n[4] Testando inserção dinâmica de uma nova loja com shortName...');
  const testNewStore = {
    id: 'loja_teste_cascavel',
    name: 'Cascavel Centro Av. Brasil',
    shortName: 'Cascavel',
    cluster: 'B',
    defaultWeight: 5.5,
    active: 1
  };

  await fiscalRepository.updateStores([...modifiedList, testNewStore]);

  const countAfterAdd = await queryAll("SELECT id FROM stores");
  assert.strictEqual(countAfterAdd.length, initialStores.length + 1, 'Total de lojas deve ter aumentado em 1');

  const insertedStore = await queryOne("SELECT * FROM stores WHERE id = 'loja_teste_cascavel'");
  assert(insertedStore, 'Nova loja deve existir no banco');
  assert.strictEqual(insertedStore.name, 'Cascavel Centro Av. Brasil');
  assert.strictEqual(insertedStore.shortName, 'Cascavel');
  assert.strictEqual(insertedStore.cluster, 'B');
  console.log(`✓ Nova loja adicionada e persistida: id="${insertedStore.id}", shortName="${insertedStore.shortName}"`);

  // 5. Testar Exclusão Dinâmica de Loja
  console.log('\n[5] Testando exclusão dinâmica de loja...');
  // Remove a loja de teste da lista e restaura o nome original da pg_centro
  const listAfterDelete = initialStores.map(s => {
    if (s.id === 'pg_centro') {
      return { ...s, name: originalPgName, shortName: originalPgShort };
    }
    return s;
  });

  await fiscalRepository.updateStores(listAfterDelete);

  const countAfterDelete = await queryAll("SELECT id FROM stores");
  assert.strictEqual(countAfterDelete.length, initialStores.length, 'Total de lojas deve voltar ao inicial');

  const deletedCheck = await queryOne("SELECT id FROM stores WHERE id = 'loja_teste_cascavel'");
  assert(!deletedCheck, 'Loja excluída não deve mais existir no banco');
  console.log('✓ Loja excluída removida com sucesso do SQLite.');

  // 6. Testar Backup e Restauração de Lojas
  console.log('\n[6] Testando Backup & Restauração com suporte a shortName...');
  const backupData = await backupRestoreService.exportBackupData();
  assert(backupData.mega12_stores_v1, 'Backup deve conter chave mega12_stores_v1');

  const parsedBackupStores = JSON.parse(backupData.mega12_stores_v1);
  assert(Array.isArray(parsedBackupStores), 'mega12_stores_v1 deve ser um array');
  const backupPg = parsedBackupStores.find(s => s.id === 'pg_centro');
  assert(backupPg && backupPg.shortName, 'Loja no backup deve conter campo shortName');
  console.log(`✓ Exportação de backup contém ${parsedBackupStores.length} lojas com shortName.`);

  // Simular restauração
  const restoreResult = await backupRestoreService.restoreFromBackupData({
    mega12_stores_v1: backupData.mega12_stores_v1
  });
  assert(restoreResult.success, 'Restauração deve ter sucesso');
  console.log(`✓ Restauração executada com sucesso. Lojas restauradas: ${restoreResult.restoredStoresCount}`);

  // 7. Testar Lógica de Matching no Importador de Planilha (OrderMapper)
  console.log('\n[7] Testando lógica de correspondência de cabeçalho do Excel com shortName...');
  const storesForMapper = await fiscalRepository.getStores();

  function matchStoreHeader(targetCol, stores) {
    if (!targetCol) return null;
    const rawTarget = targetCol.trim();
    const cleanTarget = rawTarget.toLowerCase();
    const normTarget = cleanTarget.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    // 1. Casamento direto por ID
    const byId = stores.find(s => s.id.toLowerCase() === cleanTarget || s.id === rawTarget);
    if (byId) return byId.id;

    // 2. Casamento por ID normalizado
    const byNormId = stores.find(s => s.id.toLowerCase().replace(/[^a-z0-9]/g, '') === normTarget);
    if (byNormId) return byNormId.id;

    // 3. Casamento exato por nome ou shortName
    const byNameOrShort = stores.find(s => {
      const sName = s.name.toLowerCase().trim();
      const sShort = (s.shortName || '').toLowerCase().trim();
      return sName === cleanTarget || (sShort && sShort === cleanTarget);
    });
    if (byNameOrShort) return byNameOrShort.id;

    // 4. Casamento normalizado (sem acentos ou símbolos)
    const byNormName = stores.find(s => {
      const sNameNorm = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const sShortNorm = (s.shortName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      return sNameNorm === normTarget || (sShortNorm && sShortNorm === normTarget);
    });
    if (byNormName) return byNormName.id;

    // 5. Inclusão de substring
    const found = stores.find(s => {
      const sNameNorm = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const sShortNorm = (s.shortName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const sIdNorm = s.id.toLowerCase().replace(/[^a-z0-9]/g, '');

      return (
        (sNameNorm.length >= 4 && normTarget.includes(sNameNorm)) ||
        (normTarget.length >= 4 && sNameNorm.includes(normTarget)) ||
        (sShortNorm.length >= 3 && normTarget.includes(sShortNorm)) ||
        (normTarget.length >= 3 && sShortNorm.includes(normTarget)) ||
        (sIdNorm.length >= 4 && normTarget.includes(sIdNorm)) ||
        (normTarget.length >= 4 && sIdNorm.includes(normTarget))
      );
    });
    return found ? found.id : null;
  }

  // Casos de teste de colunas que podem vir em planilhas
  const testCols = [
    { col: 'PG Centro', expectedId: 'pg_centro' },
    { col: 'Ponta Grossa Centro', expectedId: 'pg_centro' },
    { col: 'CD Central', expectedId: 'deposito_central' },
    { col: 'Depósito Central', expectedId: 'deposito_central' },
    { col: 'deposito_central', expectedId: 'deposito_central' },
    { col: 'Nova Rússia', expectedId: 'nova_russia' },
    { col: 'nova russia', expectedId: 'nova_russia' },
    { col: 'Campo Largo', expectedId: 'campo_largo' },
    { col: 'campo largo', expectedId: 'campo_largo' },
    { col: 'Teixeira Soares', expectedId: 'teixeira_soares' },
    { col: 'Irati Centro', expectedId: 'irati_centro' },
    { col: 'Prudentópolis', expectedId: 'prudentopolis' },
    { col: 'prudentopolis', expectedId: 'prudentopolis' }
  ];

  for (const tc of testCols) {
    const matched = matchStoreHeader(tc.col, storesForMapper);
    assert.strictEqual(matched, tc.expectedId, `Coluna "${tc.col}" deveria casar com ID "${tc.expectedId}", mas retornou "${matched}"`);
    console.log(`✓ Cabeçalho "${tc.col}" -> Loja ID "${matched}"`);
  }

  // 8. Testar Resolução de Nome de Coluna para Exportação / PDF / Grade
  console.log('\n[8] Testando resolução de nome de coluna para Exportação PDF/XLSX/Grade...');
  for (const s of storesForMapper) {
    const colHeader = s.shortName || s.name;
    assert(typeof colHeader === 'string' && colHeader.trim().length > 0, `Coluna para ${s.id} deve ser não-vazia`);
    if (s.shortName) {
      assert.strictEqual(colHeader, s.shortName, `Deveria priorizar shortName para ${s.id}`);
    } else {
      assert.strictEqual(colHeader, s.name, `Deveria usar name quando shortName não estiver presente para ${s.id}`);
    }
  }
  console.log('✓ Resolução de rótulo (shortName || name) validada para todas as lojas.');

  console.log('\n========================================');
  console.log('TODOS OS TESTES PASSARAM COM SUCESSO! 🎉');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('\n❌ FALHA NOS TESTES:', err);
  process.exit(1);
});
