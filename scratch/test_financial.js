const financialService = require('../backend/src/services/financialService');
const path = require('path');

async function test() {
  console.log('--- Testando Importação da Planilha Real ---');
  const sheetPath = path.resolve(__dirname, '../PLANILHA DE PAGAMENTO AGOSTO.xlsx');
  const result = await financialService.importClientSpreadsheet(sheetPath);
  console.log('Resultado Importação:', result);

  console.log('\n--- Testando Resumo Financeiro ---');
  const summary = await financialService.getSummary({ year: '2026', month: '08' });
  console.log('Total Geral:', summary.totalGeral);
  console.log('Total Entradas:', summary.totalEntries);
  console.log('Categorias:', summary.byCategory);
  console.log('Dias com lançamentos:', summary.dailyList.length);
  console.log('Primeiro dia:', summary.dailyList[0]);
  console.log('Lojas encontradas no resumo:', Object.keys(summary.byStore));
}

test().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
