const xlsx = require('../web/node_modules/xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'PLANILHA DE PAGAMENTO AGOSTO.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['AGOSTO'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const classifications = new Set();
const paymentMethods = new Set();
const stores = new Set();
let totalEntries = 0;
let totalAmount = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const dia = row[0];
  const valor = row[1];
  const desc = row[3];
  const forma = row[4];
  const classif = row[5];
  const loja = row[6];
  const nf = row[7];
  const parcela = row[8];
  const obs = row[9];

  if (desc || valor) {
    if (forma) paymentMethods.add(forma.toString().trim());
    if (classif) classifications.add(classif.toString().trim());
    if (loja) stores.add(loja.toString().trim());
    if (typeof valor === 'number') {
      totalEntries++;
      totalAmount += valor;
    }
  }
}

console.log('Total entries com valor:', totalEntries);
console.log('Total Amount somado:', totalAmount.toFixed(2));
console.log('Formas de Pagamento encontradas:', Array.from(paymentMethods));
console.log('Classificações encontradas:', Array.from(classifications));
console.log('Lojas encontradas:', Array.from(stores));

// Verificar se há outras tabelas ou resumos no lado direito da planilha
console.log('\nVerificando colunas além da coluna 9 (J):');
for (let i = 0; i < 20; i++) {
  const row = data[i];
  const extraCols = row.slice(10).filter(c => c !== '');
  if (extraCols.length > 0) {
    console.log(`Row ${i+1} extra:`, extraCols);
  }
}
