const xlsx = require('../web/node_modules/xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'PLANILHA DE PAGAMENTO AGOSTO.xlsx');
const workbook = xlsx.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n=================== SHEET: ${sheetName} (Rows: ${data.length}) ===================`);
  // Print first 25 rows
  for (let i = 0; i < Math.min(data.length, 30); i++) {
    const row = data[i];
    if (row.some(cell => cell !== '')) {
      console.log(`Row ${i + 1}:`, JSON.stringify(row));
    }
  }
});
