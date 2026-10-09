import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { createServer } from 'vite';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '..');
const projectDir = path.resolve(webDir, '..');

const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: key => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: key => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
  key: index => Array.from(memoryStorage.keys())[index] ?? null,
  get length() { return memoryStorage.size; }
};

const server = await createServer({ root: webDir, server: { middlewareMode: true }, appType: 'custom' });

try {
  const { parseOrderExcelFile } = await server.ssrLoadModule('/src/modules/excelImporter/orderExcelParser.ts');
  const { mapParsedExcelToOrder } = await server.ssrLoadModule('/src/modules/excelImporter/orderMapper.ts');
  const { analyzeCatalogProducts } = await server.ssrLoadModule('/src/modules/excelImporter/catalogSyncService.ts');
  const { calculateOrderTotals } = await server.ssrLoadModule('/src/shared/orderCalculationEngine.ts');
  const { DEFAULT_FISCAL_CONFIG, DEFAULT_STORES } = await server.ssrLoadModule('/src/shared/constants.ts');

  const modelPath = path.join(projectDir, 'Planilha_Modelo_Importacao_Pedido_Mega12.xlsx');
  const modelWorkbook = XLSX.read(fs.readFileSync(modelPath), { type: 'buffer' });
  const commercialSheet = modelWorkbook.Sheets['PEDIDO COMERCIAL'];
  const separationSheet = modelWorkbook.Sheets['SEPARACAO POR LOJA'];
  const setCell = (sheet, address, value) => {
    sheet[address] = { t: typeof value === 'number' ? 'n' : 's', v: value };
  };
  setCell(commercialSheet, 'F6', 'FORNECEDOR MODELO LTDA');
  setCell(commercialSheet, 'F7', '12.345.678/0001-90');
  setCell(commercialSheet, 'F8', 'VENDEDOR TESTE');
  setCell(commercialSheet, 'F9', '(42) 99999-0000');
  setCell(commercialSheet, 'F10', 'vendas@fornecedor.test');
  setCell(commercialSheet, 'B13', 'PED-MODELO-001');
  setCell(commercialSheet, 'D13', '09/10/2026');
  setCell(commercialSheet, 'F13', '24/10/2026');
  setCell(commercialSheet, 'B14', '30/60/90 Dias');
  setCell(commercialSheet, 'D14', '5%');
  setCell(commercialSheet, 'F14', 'Pedido de teste automatizado');
  setCell(commercialSheet, 'B17', 'REF-001');
  setCell(commercialSheet, 'C17', 'PRODUTO MODELO');
  setCell(commercialSheet, 'D17', 'UN');
  setCell(commercialSheet, 'E17', 3);
  setCell(commercialSheet, 'F17', 10);
  setCell(commercialSheet, 'G17', 30);
  setCell(commercialSheet, 'H17', 9);
  setCell(separationSheet, 'B5', 'REF-001');
  setCell(separationSheet, 'E5', 5);
  setCell(separationSheet, 'F5', 23);
  setCell(separationSheet, 'G5', 2);
  const modelBuffer = XLSX.write(modelWorkbook, { type: 'buffer', bookType: 'xlsx' });
  const parsed = parseOrderExcelFile(modelBuffer, path.basename(modelPath));

  assert.equal(parsed.items.length, 1, 'o modelo preenchido deve conter um item');
  assert.equal(parsed.totalPecas, 30, 'a quantidade total do modelo deve ser preservada');
  assert.equal(parsed.valorTotalGeral, 270, 'o preço líquido do modelo deve ser preservado');
  assert.equal(parsed.fiscalParams?.creditoEntradaICMS, 0.12, 'ICMS de entrada deve ser lido corretamente');
  assert.equal(parsed.fiscalParams?.icmsAliquota, 0.195, 'ICMS de saída deve ser lido corretamente');
  assert.equal(parsed.fiscalParams?.custosFixos, 0.26, 'custos fixos devem ser lidos corretamente');
  assert.equal(parsed.fiscalParams?.pisCofinsAliquota, 0.06, 'PIS/COFINS deve ser lido corretamente');
  assert.equal(parsed.fiscalParams?.aliquotaSt, 0, 'ST zero deve ser preservado');
  assert.equal(parsed.storeAllocations?.['RESERVA CD']?.['REF-001'], 5, 'a coluna RESERVA CD deve ser extraída explicitamente');

  const supplier = {
    id: 'sup_teste',
    razaoSocial: parsed.header.fornecedorNome || 'Fornecedor Teste',
    cnpj: parsed.header.cnpj
  };
  const catalog = analyzeCatalogProducts(parsed.items, [], supplier);
  const order = mapParsedExcelToOrder(
    parsed,
    supplier,
    catalog.statusList,
    DEFAULT_STORES,
    DEFAULT_FISCAL_CONFIG,
    'PED-TESTE-IMPORT'
  );
  const totals = calculateOrderTotals(order);
  assert.equal(order.header.aplicarDescontoOff, false, 'OFF importado deve ser apenas histórico');
  assert.equal(totals.totalGeral, 270, 'o OFF histórico não pode descontar novamente o preço líquido');
  assert.equal(order.installments.reduce((sum, installment) => sum + Number(installment.valor || 0), 0), 270);
  assert.equal(order.fiscalConfig.creditoEntradaICMS, 0.12);
  assert.equal(order.fiscalConfig.icmsAliquota, 0.195);
  assert.equal(order.items[0].qtdReservaEstoque, 5, 'RESERVA CD deve alimentar o estoque reservado, não a loja Reserva');
  assert.equal(order.items[0].separacaoLojas?.reserva || 0, 2, 'a loja Reserva deve continuar distinta da RESERVA CD');

  const workbookWithoutDates = XLSX.read(modelBuffer, { type: 'buffer', cellDates: false });
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  for (const sheetName of workbookWithoutDates.SheetNames) {
    const sheet = workbookWithoutDates.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const label = normalize(sheet[address]?.v);
        if (label.includes('DATA DO PEDIDO') || label.includes('DATA DE ENTREGA') || label.includes('PREVISAO DE ENTREGA')) {
          for (let offset = 1; offset <= 2; offset++) delete sheet[XLSX.utils.encode_cell({ r: row, c: col + offset })];
        }
      }
    }
  }
  delete workbookWithoutDates.Sheets['PEDIDO COMERCIAL'].D13;
  delete workbookWithoutDates.Sheets['PEDIDO COMERCIAL'].F13;
  const noDateBuffer = XLSX.write(workbookWithoutDates, { type: 'buffer', bookType: 'xlsx' });
  const parsedWithoutDates = parseOrderExcelFile(noDateBuffer, 'modelo-sem-datas.xlsx');
  assert.equal(parsedWithoutDates.header.dataPedido, '');
  assert.equal(parsedWithoutDates.header.dataEntregaPrevista, '');
  const noDateCatalog = analyzeCatalogProducts(parsedWithoutDates.items, [], supplier);
  const noDateOrder = mapParsedExcelToOrder(parsedWithoutDates, supplier, noDateCatalog.statusList, DEFAULT_STORES, DEFAULT_FISCAL_CONFIG, 'PED-SEM-DATA');
  assert.deepEqual(noDateOrder.installments, [], 'planilha sem datas não deve criar vencimentos fictícios');

  const reorderedWorkbook = XLSX.read(modelBuffer, { type: 'buffer' });
  reorderedWorkbook.SheetNames = [...reorderedWorkbook.SheetNames].reverse();
  const reorderedBuffer = XLSX.write(reorderedWorkbook, { type: 'buffer', bookType: 'xlsx' });
  const reordered = parseOrderExcelFile(reorderedBuffer, 'modelo-reordenado.xlsx');
  assert.equal(reordered.items.length, parsed.items.length, 'a escolha da aba não pode depender da ordem das abas');
  assert.equal(reordered.valorTotalGeral, parsed.valorTotalGeral);

  for (const legacyName of ['CONECTA 210726.xlsx', 'MATRIZ.xlsx', 'VR VAROES 100726.xlsx']) {
    const legacy = parseOrderExcelFile(fs.readFileSync(path.join(projectDir, legacyName)), legacyName);
    const descriptions = legacy.items.map(item => normalize(item.descricao));
    assert.ok(!descriptions.some(desc => /CONFERENTE|MANDAR EXPOSITOR|PEDIDO FATURAR|ASSINATURA/.test(desc)), `${legacyName} não pode importar controles de rodapé como produtos`);
  }

  const cjs = parseOrderExcelFile(
    fs.readFileSync(path.join(projectDir, 'Planilha_Importacao_CJS_QUADROS.xlsx')),
    'Planilha_Importacao_CJS_QUADROS.xlsx'
  );
  assert.equal(cjs.items.length, 33);
  assert.equal(cjs.totalPecas, 6228);
  assert.equal(Number(cjs.valorTotalGeral.toFixed(2)), 40375.2);

  const baseRawItem = {
    rowNumber: 1,
    codigo: 'ABC-01',
    codigoFornecedor: 'ABC-01',
    descricao: 'Produto compartilhado',
    qtdNoPacote: 1,
    qtdPacotes: 1,
    qtdTotalUnidades: 1,
    precoUnitario: 10,
    valorTotalBruto: 10,
    pdvSugerido: 20
  };
  const supplierAProduct = {
    id: 'prod_a', codigo: 'PRD-0001', codigoInterno: 'PRD-0001', codigoFornecedor: 'ABC-01',
    descricao: 'Produto compartilhado', supplierId: 'sup_a', nomeFornecedor: 'Fornecedor A', precoUnitarioPadrao: 10
  };
  const supplierB = { id: 'sup_b', razaoSocial: 'Fornecedor B' };
  const crossSupplier = analyzeCatalogProducts([baseRawItem], [supplierAProduct], supplierB);
  assert.equal(crossSupplier.statusList[0].status, 'new', 'código de outro fornecedor não pode ser reassociado');
  assert.notEqual(crossSupplier.statusList[0].assignedCode, supplierAProduct.codigo);

  const explicitInternal = analyzeCatalogProducts(
    [{ ...baseRawItem, codigoInterno: 'PRD-0001' }],
    [supplierAProduct],
    supplierB
  );
  assert.equal(explicitInternal.statusList[0].assignedCode, 'PRD-0001');
  assert.equal(explicitInternal.existingToUpdate.length, 0, 'código interno global não pode transferir produto para outro fornecedor');

  const supplierBProduct = { ...supplierAProduct, id: 'prod_b', codigo: 'PRD-0002', codigoInterno: 'PRD-0002', supplierId: 'sup_b', nomeFornecedor: 'Fornecedor B' };
  const sameSupplier = analyzeCatalogProducts([baseRawItem], [supplierAProduct, supplierBProduct], supplierB);
  assert.equal(sameSupplier.statusList[0].assignedCode, 'PRD-0002', 'produto do mesmo fornecedor deve ser reutilizado');

  const duplicateRows = analyzeCatalogProducts(
    [baseRawItem, { ...baseRawItem, rowNumber: 2, qtdTotalUnidades: 2, valorTotalBruto: 20 }],
    [],
    supplierB
  );
  assert.equal(duplicateRows.newProducts.length, 1, 'linhas repetidas no lote devem criar um único produto');
  assert.equal(duplicateRows.statusList[0].assignedCode, duplicateRows.statusList[1].assignedCode);

  console.log('✓ Importação Excel: verificações de regressão aprovadas.');
} finally {
  await server.close();
}
