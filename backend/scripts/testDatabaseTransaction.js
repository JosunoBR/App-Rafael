const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mega12-transaction-'));
process.env.DB_DIR = testDbDir;
process.env.DB_FILENAME = 'transaction-test.db';

const database = require('../src/config/database');
const orderService = require('../src/services/order.service');

async function run() {
  await database.getDatabase();

  await assert.rejects(
    database.withTransaction(async () => {
      await database.execute(
        'INSERT INTO suppliers (id, razaoSocial, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
        ['sup_rollback', 'Fornecedor Rollback', new Date().toISOString(), new Date().toISOString()]
      );
      throw new Error('falha simulada');
    }),
    /falha simulada/
  );
  assert.equal(await database.queryOne('SELECT id FROM suppliers WHERE id = ?', ['sup_rollback']), null);

  await database.withTransaction(async () => {
    await database.execute(
      'INSERT INTO suppliers (id, razaoSocial, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      ['sup_commit', 'Fornecedor Commit', new Date().toISOString(), new Date().toISOString()]
    );
  });
  assert.equal((await database.queryOne('SELECT id FROM suppliers WHERE id = ?', ['sup_commit']))?.id, 'sup_commit');

  const makeOrder = (id, numeroPedido, supplierId, fornecedor) => ({
    id,
    header: {
      id,
      numeroPedido,
      fornecedor,
      supplierId,
      vendedor: '',
      condicaoPagamento: '30 Dias',
      formaPagamento: 'Boleto',
      dataPedido: '',
      dataEmissao: '',
      dataEntregaPrevista: '',
      percentualDescontoOff: 5,
      aplicarDescontoOff: false,
      importadoDePlanilha: true,
      percentualNota: 100,
      valorFreteGlobal: 0,
      valorOutrasDespesasGlobal: 0,
      status: 'Em Cotação',
      isDraft: true
    },
    items: [{
      id: `${id}_item_1`, codigo: 'PRD-9001', codigoInterno: 'PRD-9001', codigoFornecedor: 'REF-9001',
      descricao: 'Produto integração', qtdNoPacote: 1, qtdPacotes: 2, qtdTotalUnidades: 2,
      precoUnitario: 10, valorTotalBruto: 20, valorTotalLiquido: 20
    }],
    installments: [],
    fiscalConfig: {
      ipiAliquota: 0, aliquotaSt: 0, freteAliquota: 0, creditoEntradaICMS: 0.12,
      custosFixos: 0.26, icmsAliquota: 0.195, pisCofinsAliquota: 0.06
    }
  });
  const currentUser = { id: 'usr_test', nome: 'Teste', role: 'comprador', permissions: { 'orders:create': true } };
  const imported = await orderService.importOrderPackage({
    supplier: { id: 'sup_import', razaoSocial: 'Fornecedor Importação' },
    products: [{
      id: 'prod_import', codigo: 'PRD-9001', codigoInterno: 'PRD-9001', codigoFornecedor: 'REF-9001',
      descricao: 'Produto integração', supplierId: 'sup_import', nomeFornecedor: 'Fornecedor Importação'
    }],
    order: makeOrder('po_import', 'PED-IMPORT-TESTE', 'sup_import', 'Fornecedor Importação')
  }, currentUser);
  assert.equal(imported.order.header.importadoDePlanilha, true);
  assert.equal(imported.order.header.dataPedido, '');
  assert.equal((await database.queryOne('SELECT COUNT(*) AS total FROM purchase_orders WHERE id = ?', ['po_import'])).total, 1);

  await assert.rejects(
    orderService.importOrderPackage({
      supplier: { id: 'sup_import_rollback', razaoSocial: 'Fornecedor que deve reverter' },
      products: [{ id: 'prod_invalid', codigo: 'PRD-9002', descricao: '' }],
      order: makeOrder('po_import_rollback', 'PED-IMPORT-ROLLBACK', 'sup_import_rollback', 'Fornecedor que deve reverter')
    }, currentUser),
    /descrição/
  );
  assert.equal(await database.queryOne('SELECT id FROM suppliers WHERE id = ?', ['sup_import_rollback']), null);
  assert.equal(await database.queryOne('SELECT id FROM purchase_orders WHERE id = ?', ['po_import_rollback']), null);

  database.flushDatabaseToDisk();
  fs.rmSync(testDbDir, { recursive: true, force: true });
  console.log('✓ Banco e importação: commit e rollback transacionais aprovados.');
}

run().catch(error => {
  database.flushDatabaseToDisk();
  console.error(error);
  process.exitCode = 1;
});
