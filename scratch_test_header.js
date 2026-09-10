const XLSX = require('./backend/node_modules/xlsx');
const path = require('path');

const filePath = 'C:/Users/Josué/Downloads/VR VAROES 100726.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

function isBuyerData(val) {
  const str = String(val || '').trim();
  if (!str) return false;
  if (str.includes('37.144.240/0001-70') || str.replace(/\D/g, '') === '37144240000170') return true;
  if (str.toLowerCase().includes('als.conecta@gmail.com')) return true;
  if (str.includes('9136-5009')) return true;
  if (/^Rafael\s*\(55\)/i.test(str)) return true;
  if (/^Bruna\s*\(55\)/i.test(str)) return true;
  return false;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function extractHeader(matrix) {
  let numeroPedido = '';
  let fornecedorNome = '';
  let cnpj = '';
  let email = '';
  let telefoneEmpresa = '';
  let telefoneContato = '';
  let vendedor = '';
  let telefoneVendedor = '';
  let condicaoPagamento = '';
  let percentualDescontoOff = 0;
  let dataPedidoVal = null;
  let dataEntregaVal = null;
  const observacoesList = [];
  let tipoFrete = 'Retira';

  // 1. Linha 3 do Excel (índice 2): FORNECEDOR (Col A/B), DATA ENTREGA (Col H/I)
  const rowExcel3 = matrix[2] || [];
  const cellA3 = String(rowExcel3[0] || '').trim();
  if (cellA3.toUpperCase().startsWith('FORNECEDOR:')) {
    const ext = cellA3.replace(/^FORNECEDOR:\s*/i, '').trim();
    if (ext) fornecedorNome = ext;
    else if (rowExcel3[1]) fornecedorNome = String(rowExcel3[1]).trim();
  }

  // Contato do fornecedor em Col E..G (índices 4..6)
  for (let c = 4; c <= 6; c++) {
    const contactVal = String(rowExcel3[c] || '').trim();
    if (contactVal && !isBuyerData(contactVal)) {
      if (contactVal.includes('@')) email = contactVal;
      else telefoneEmpresa = contactVal;
      break;
    }
  }

  // 2. Linha 4 do Excel (índice 3): VENDEDOR (Col A/B) e CONTATO DO VENDEDOR (Col E..G)
  const rowExcel4 = matrix[3] || [];
  const cellA4 = String(rowExcel4[0] || '').trim();
  if (cellA4.toUpperCase().startsWith('VENDEDOR:')) {
    const ext = cellA4.replace(/^VENDEDOR:\s*/i, '').trim();
    if (ext) vendedor = ext;
    else if (rowExcel4[1]) vendedor = String(rowExcel4[1]).trim();
  }

  for (let c = 4; c <= 6; c++) {
    const contactVal = String(rowExcel4[c] || '').trim();
    if (contactVal && !isBuyerData(contactVal)) {
      telefoneVendedor = contactVal;
      break;
    }
  }

  // 3. Linha 5 do Excel (índice 4): COND. PAG. (Col A/B)
  const rowExcel5 = matrix[4] || [];
  const cellA5 = String(rowExcel5[0] || '').trim();
  if (cellA5.toUpperCase().startsWith('COND. PAG.')) {
    const ext = cellA5.replace(/^COND\.\s*PAG\.\s*:?\s*/i, '').trim();
    if (ext) condicaoPagamento = ext;
    else if (rowExcel5[1]) condicaoPagamento = String(rowExcel5[1]).trim();
  }

  // Varredura das primeiras 12 linhas:
  // Colunas 0..8 são do pedido e fornecedor.
  // Colunas 9+ são da seção de observações da nossa empresa.
  for (let r = 0; r < Math.min(matrix.length, 12); r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (!cellVal) continue;
      const upper = cellVal.toUpperCase();

      // Tratamento da seção de Observações (Colunas >= 9 ou linha de OBSERVAÇÕES)
      if (c >= 9) {
        // Ignora dados da nossa empresa compradora
        if (!isBuyerData(cellVal)) {
          // Ignora o título "OBSERVAÇÕES:"
          if (!upper.startsWith('OBSERVAÇÕES') && !upper.startsWith('OBSERVACOES')) {
            if (!observacoesList.includes(cellVal)) {
              observacoesList.push(cellVal);
            }
          }
        }
        continue; // NUNCA extrair fornecedor/CNPJ/email/vendedor das colunas >= 9
      }

      // N° PEDIDO
      if (upper.includes('N° PEDIDO') || upper.includes('NUMERO PEDIDO') || upper.includes('Nº PEDIDO')) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell && !nextCell.toUpperCase().includes('FORNECEDOR') && !nextCell.toUpperCase().includes('CONTATO')) {
          numeroPedido = nextCell;
        }
      }

      // FORNECEDOR (se não pego na linha 3)
      if (!fornecedorNome && upper.startsWith('FORNECEDOR:')) {
        const extracted = cellVal.replace(/^FORNECEDOR:\s*/i, '').trim();
        if (extracted) fornecedorNome = extracted;
        else if (row[c + 1]) fornecedorNome = String(row[c + 1]).trim();
      }

      // VENDEDOR (se não pego na linha 4)
      if (!vendedor && upper.startsWith('VENDEDOR:')) {
        const extracted = cellVal.replace(/^VENDEDOR:\s*/i, '').trim();
        if (extracted) vendedor = extracted;
        else if (row[c + 1]) vendedor = String(row[c + 1]).trim();
      }

      // COND. PAG.
      if (!condicaoPagamento && (upper.startsWith('COND. PAG.') || upper.startsWith('CONDICAO PAG') || upper.startsWith('COND. PAGAMENTO'))) {
        let extracted = cellVal.replace(/^COND\.\s*PAG\.\s*:?\s*/i, '').trim();
        if (!extracted && row[c + 1]) extracted = String(row[c + 1]).trim();
        if (extracted) condicaoPagamento = extracted;
      }

      // % OFF
      if (upper === '% OFF' || upper === 'DESCONTO OFF' || upper === '%OFF') {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        const offCandidate = (parseNumber(nextColVal) > 0) ? nextColVal : ((parseNumber(nextRowVal) > 0) ? nextRowVal : 0);
        const parsedOff = parseNumber(offCandidate);
        if (parsedOff > 0) {
          percentualDescontoOff = parsedOff <= 1 ? parsedOff * 100 : parsedOff;
        }
      }

      // DATA PEDIDO
      if (upper.includes('DATA PEDIDO')) {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        dataPedidoVal = nextColVal !== undefined && nextColVal !== '' ? nextColVal : nextRowVal;
      }

      // DATA ENTREGA
      if (upper.includes('DATA ENTREGA')) {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        dataEntregaVal = nextColVal !== undefined && nextColVal !== '' ? nextColVal : nextRowVal;
      }

      // FRETE
      if (upper.startsWith('FRETE')) {
        const freteText = cellVal.replace(/^FRETE\s*:?\s*/i, '').trim() || String(row[c + 1] || '').trim().toUpperCase();
        if (freteText.includes('FOB')) tipoFrete = 'FOB';
        else if (freteText.includes('CIF')) tipoFrete = 'CIF';
        else tipoFrete = 'Retira';
      }

      // CNPJ (apenas nas colunas de fornecedor e que não seja da nossa empresa)
      const cnpjMatch = cellVal.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
      if (cnpjMatch && !cnpj && !isBuyerData(cnpjMatch[0])) {
        cnpj = cnpjMatch[0];
      }

      // Email do fornecedor
      const emailMatch = cellVal.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (emailMatch && !email && !isBuyerData(emailMatch[0])) {
        email = emailMatch[0];
      }

      // Telefone da empresa fornecedora
      const phoneMatch = cellVal.match(/\(?\d{2}\)?\s*9?\.?\s*\d{4,5}[-\s]?\d{4}/);
      if (phoneMatch && !telefoneEmpresa && !isBuyerData(phoneMatch[0]) && phoneMatch[0] !== telefoneVendedor) {
        telefoneEmpresa = phoneMatch[0].trim();
      }
    }
  }

  return {
    numeroPedido,
    fornecedorNome,
    vendedor,
    telefoneVendedor,
    telefoneEmpresa,
    email,
    cnpj,
    condicaoPagamento,
    percentualDescontoOff,
    tipoFrete,
    observacoes: observacoesList.join(', ')
  };
}

console.log('Result:', extractHeader(matrix));
