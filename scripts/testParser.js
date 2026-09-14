const fs = require('fs');
const XLSX = require('../web/node_modules/xlsx');

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim().replace(/R\$\s?|\s|%/g, '');
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseExcelDate(val, defaultDaysAhead = 0) {
  if (!val) {
    const d = new Date();
    d.setDate(d.getDate() + defaultDaysAhead);
    return d.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const epoch = new Date((val - 25569) * 86400 * 1000);
    return epoch.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return str;
}

function isBuyerCompanyData(val) {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  if (!str) return false;
  if (str.includes('37.144.240/0001-70') || str.replace(/\D/g, '') === '37144240000170') return true;
  if (/als\.conecta@gmail\.com/i.test(str) || /@mega12\./i.test(str)) return true;
  if (str.includes('9136-5009') || str.replace(/\D/g, '').includes('42991365009')) return true;
  if (/^Rafael\s*\(?55\)?/i.test(str) || str.includes('9659-6315') || str.replace(/\D/g, '').includes('55996596315')) return true;
  if (/^Bruna\s*\(?55\)?/i.test(str) || str.includes('3618-5609') || str.replace(/\D/g, '').includes('55936185609')) return true;
  if (/^PEDIDO DE COMPRA/i.test(str)) return true;
  return false;
}

function testParse(filename) {
  console.log(`\n======================================================`);
  console.log(`TESTANDO ARQUIVO: ${filename}`);
  console.log(`======================================================`);

  const fileBuffer = fs.readFileSync(filename);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  // 1. Identificar a aba comercial do pedido
  const ignoredNames = ['SEPARACAO', 'SEPARAÇÃO', 'LIMITE DE PRECO', 'LIMITE DE PREÇO', 'CALCULADORA', 'GRAFICO', 'RESUMO', 'INSTRUCOES DE PREENCHIMENTO', 'PARAMETROS FISCAIS'];
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const upper = name.trim().toUpperCase();
    if (!ignoredNames.some(ign => upper.includes(ign))) {
      sheetName = name;
      break;
    }
  }

  console.log(`Aba Comercial Identificada: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });

  // 2. Extrair Cabeçalho
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
  let percentualNota = undefined;
  let dataPedidoVal = null;
  let dataEntregaVal = null;
  const observacoesList = [];
  let tipoFrete = 'Retira';

  let tableHeaderRowIndex = -1;
  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r] || [];
    const rowText = row.map(c => String(c).toUpperCase().trim());
    if (rowText.some(t => t.includes('CODIGO') || t.includes('CÓDIGO') || t.includes('DESCRICAO') || t.includes('DESCRIÇÃO') || t.includes('REFER'))) {
      tableHeaderRowIndex = r;
      break;
    }
  }
  const maxHeaderRow = tableHeaderRowIndex !== -1 ? tableHeaderRowIndex : 15;

  // Legado linha 3
  const rowExcel3 = matrix[2] || [];
  const cellA3 = String(rowExcel3[0] || '').trim();
  if (cellA3.toUpperCase().startsWith('FORNECEDOR:')) {
    const ext = cellA3.replace(/^FORNECEDOR:\s*/i, '').trim();
    if (ext && !isBuyerCompanyData(ext)) fornecedorNome = ext;
    else if (rowExcel3[1] && !isBuyerCompanyData(rowExcel3[1])) fornecedorNome = String(rowExcel3[1]).trim();
  }
  for (let c = 4; c <= 6; c++) {
    const contactVal = String(rowExcel3[c] || '').trim();
    if (contactVal && !isBuyerCompanyData(contactVal)) {
      if (contactVal.includes('@')) email = contactVal;
      else telefoneEmpresa = contactVal;
      break;
    }
  }

  // Legado linha 4
  const rowExcel4 = matrix[3] || [];
  const cellA4 = String(rowExcel4[0] || '').trim();
  if (cellA4.toUpperCase().startsWith('VENDEDOR:')) {
    const ext = cellA4.replace(/^VENDEDOR:\s*/i, '').trim();
    if (ext && !isBuyerCompanyData(ext)) vendedor = ext;
    else if (rowExcel4[1] && !isBuyerCompanyData(rowExcel4[1])) vendedor = String(rowExcel4[1]).trim();
  }
  for (let c = 4; c <= 6; c++) {
    const contactVal = String(rowExcel4[c] || '').trim();
    if (contactVal && !isBuyerCompanyData(contactVal)) {
      telefoneVendedor = contactVal;
      break;
    }
  }

  // Legado linha 5
  const rowExcel5 = matrix[4] || [];
  const cellA5 = String(rowExcel5[0] || '').trim();
  if (cellA5.toUpperCase().startsWith('COND. PAG.')) {
    const ext = cellA5.replace(/^COND\.\s*PAG\.\s*:?\s*/i, '').trim();
    if (ext) condicaoPagamento = ext;
    else if (rowExcel5[1]) condicaoPagamento = String(rowExcel5[1]).trim();
  }

  // Varredura
  for (let r = 0; r < maxHeaderRow; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (!cellVal) continue;
      const upper = cellVal.toUpperCase();
      const nextCellVal = String(row[c + 1] || '').trim();

      if (upper.includes('N° PEDIDO') || upper.includes('NUMERO PEDIDO') || upper.includes('Nº PEDIDO') || upper.startsWith('Nº PEDIDO:') || upper.startsWith('N° PEDIDO:')) {
        let extNum = cellVal.replace(/^N[°º]\s*PEDIDO:?\s*/i, '').trim();
        if (!extNum && nextCellVal && !nextCellVal.toUpperCase().includes('FORNECEDOR') && !nextCellVal.toUpperCase().includes('CONTATO')) {
          extNum = nextCellVal;
        }
        if (extNum && !isBuyerCompanyData(extNum)) numeroPedido = extNum;
      }

      if (upper === 'FORNECEDOR:' || upper === 'RAZÃO SOCIAL:' || upper === 'RAZAO SOCIAL:' || upper.startsWith('FORNECEDOR:')) {
        let extracted = cellVal.replace(/^(FORNECEDOR|RAZÃO SOCIAL|RAZAO SOCIAL):?\s*/i, '').trim();
        if (!extracted && nextCellVal) extracted = nextCellVal;
        if (extracted && !isBuyerCompanyData(extracted)) {
          if (c >= 6 || !fornecedorNome) fornecedorNome = extracted;
        }
      }

      if (upper === 'VENDEDOR:' || upper.startsWith('VENDEDOR:')) {
        let extracted = cellVal.replace(/^VENDEDOR:\s*/i, '').trim();
        if (!extracted && nextCellVal) extracted = nextCellVal;
        if (extracted && !isBuyerCompanyData(extracted)) vendedor = extracted;
      }

      if (upper.includes('WHATSAPP') || upper.includes('FONE') || upper.includes('CONTATO DO VENDEDOR')) {
        if (nextCellVal && !isBuyerCompanyData(nextCellVal)) telefoneVendedor = nextCellVal;
      }

      if (upper.includes('E-MAIL VENDAS') || upper.includes('EMAIL COMERCIAL') || upper.includes('E-MAIL:')) {
        if (nextCellVal && !isBuyerCompanyData(nextCellVal)) email = nextCellVal;
      }

      if (upper.startsWith('COND. PAG') || upper.startsWith('CONDICAO PAG') || upper.startsWith('COND. PAGAMENTO')) {
        let extracted = cellVal.replace(/^COND\.\s*PAG\w*\.?\s*:?\s*/i, '').trim();
        if (!extracted && nextCellVal) extracted = nextCellVal;
        if (extracted) condicaoPagamento = extracted;
      }

      if (upper === '% NOTA' || upper === '% NOTA:' || upper === '% NOTA FISCAL' || upper === '% NF' || upper === 'NOTA FISCAL %' || upper === '% FATURADO') {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        const notaCandidate = (parseNumber(nextColVal) > 0) ? nextColVal : ((parseNumber(nextRowVal) > 0) ? nextRowVal : 0);
        const parsedNota = parseNumber(notaCandidate);
        if (parsedNota > 0) percentualNota = parsedNota <= 1 ? parsedNota * 100 : parsedNota;
      }

      if (upper === '% OFF' || upper === '% OFF:' || upper === 'DESCONTO OFF' || upper === '%OFF' || upper === 'DESC. COMERCIAL' || upper === 'DESCONTO COMERCIAL') {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        const offCandidate = (parseNumber(nextColVal) > 0) ? nextColVal : ((parseNumber(nextRowVal) > 0) ? nextRowVal : 0);
        const parsedOff = parseNumber(offCandidate);
        if (parsedOff > 0) percentualDescontoOff = parsedOff <= 1 ? parsedOff * 100 : parsedOff;
      }

      if (upper.includes('DATA PEDIDO')) {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        dataPedidoVal = (nextColVal !== undefined && nextColVal !== '') ? nextColVal : nextRowVal;
      }

      if (upper === 'ENTREGA:' || upper.includes('DATA ENTREGA') || upper.includes('PREVISÃO DE ENTREGA') || upper.includes('PREVISAO DE ENTREGA')) {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        dataEntregaVal = (nextColVal !== undefined && nextColVal !== '') ? nextColVal : nextRowVal;
      }

      if (upper.includes('FRETE')) {
        const freteText = cellVal.replace(/^TIPO\s*FRETE:?\s*|^FRETE:?\s*/i, '').trim() || String(row[c + 1] || '').trim().toUpperCase();
        if (freteText.includes('FOB')) tipoFrete = 'FOB';
        else if (freteText.includes('CIF')) tipoFrete = 'CIF';
        else if (freteText.includes('RETIRA')) tipoFrete = 'Retira';
      }

      const cnpjMatch = cellVal.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
      if (cnpjMatch && !cnpj && !isBuyerCompanyData(cnpjMatch[0])) cnpj = cnpjMatch[0];
      if (nextCellVal) {
        const nextCnpjMatch = nextCellVal.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
        if (nextCnpjMatch && !cnpj && !isBuyerCompanyData(nextCnpjMatch[0])) cnpj = nextCnpjMatch[0];
      }

      const emailMatch = cellVal.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (emailMatch && !email && !isBuyerCompanyData(emailMatch[0])) email = emailMatch[0];
      if (nextCellVal) {
        const nextEmailMatch = nextCellVal.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
        if (nextEmailMatch && !email && !isBuyerCompanyData(nextEmailMatch[0])) email = nextEmailMatch[0];
      }

      const phoneMatch = cellVal.match(/\(?\d{2}\)?\s*9?\.?\s*\d{4,5}[-\s]?\d{4}/);
      if (phoneMatch && !telefoneEmpresa && !isBuyerCompanyData(phoneMatch[0]) && phoneMatch[0] !== telefoneVendedor) {
        telefoneEmpresa = phoneMatch[0].trim();
      }

      if (upper.startsWith('OBSERVAÇÕES') || upper.startsWith('OBSERVACOES') || upper.startsWith('OBSERVAÇÃO') || upper.startsWith('OBSERVACAO')) {
        let obsText = cellVal.replace(/^OBSERVA[ÇC][ÕO0]ES?:?\s*/i, '').trim();
        if (!obsText && nextCellVal) obsText = nextCellVal;
        if (obsText && !isBuyerCompanyData(obsText) && !observacoesList.includes(obsText)) {
          observacoesList.push(obsText);
        }
      }
    }
  }

  const dataPedido = parseExcelDate(dataPedidoVal, 0);
  const dataEntregaPrevista = parseExcelDate(dataEntregaVal, 15);
  telefoneContato = telefoneEmpresa || telefoneVendedor || '';

  console.log('Cabeçalho Extraído:');
  console.log({
    numeroPedido: numeroPedido || 'AUTO-GERADO',
    fornecedorNome: fornecedorNome || 'NÃO IDENTIFICADO',
    cnpj: cnpj || 'N/A',
    vendedor: vendedor || 'N/A',
    telefoneVendedor: telefoneVendedor || 'N/A',
    email: email || 'N/A',
    condicaoPagamento: condicaoPagamento || 'N/A',
    tipoFrete,
    dataPedido,
    dataEntregaPrevista,
    percentualDescontoOff,
    percentualNota: percentualNota !== undefined ? percentualNota : '100%'
  });

  // 3. Extrair Itens
  let colMap = {};
  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r] || [];
    const rowText = row.map(c => String(c).toUpperCase().trim());
    if (rowText.some(t => t.includes('CODIGO') || t.includes('CÓDIGO') || t.includes('DESCRICAO') || t.includes('DESCRIÇÃO') || t.includes('REFER'))) {
      tableHeaderRowIndex = r;
      row.forEach((cell, c) => {
        const clean = String(cell).toUpperCase().trim();
        if (clean.includes('FORNECEDOR') && (clean.includes('COD') || clean.includes('CÓD') || clean.includes('REF'))) colMap['codigoFornecedor'] = c;
        else if (clean.includes('INTERNO') || clean.includes('PRD')) colMap['codigoInterno'] = c;
        else if (clean.includes('EAN') || clean.includes('BARRAS') || clean.includes('BARCODE')) colMap['ean'] = c;
        else if (clean.includes('CODIGO') || clean.includes('CÓDIGO') || clean.includes('REFER')) colMap['codigo'] = c;
        else if (clean.includes('DESCRICAO') || clean.includes('DESCRIÇÃO')) colMap['descricao'] = c;
        else if (clean === 'NCM' || clean.includes('NCM')) colMap['ncm'] = c;
        else if (clean === 'UNID.' || clean === 'UNID' || clean.includes('UNIDADE DE MEDIDA') || clean === 'UM') colMap['unidade'] = c;
        else if (clean.includes('EMBALAGEM') || clean.includes('QTD/CX') || clean.includes('QTD NO PAC') || clean.includes('QTD NO PEC') || clean.includes('QTD POR PACOTE') || clean.includes('UN/CX') || clean.includes('UN/PAC') || clean === 'EMB' || clean === 'CX') colMap['embalagem'] = c;
        else if (clean.includes('PACOTES') || clean.includes('QTD CX') || clean.includes('QTD DE PEC') || clean.includes('QTD CAIXA')) colMap['pacotes'] = c;
        else if (clean.includes('R$ UNIT') || clean === 'UNIT' || clean.includes('PRECO UNIT') || clean.includes('PREÇO UNIT') || clean.includes('VALOR UNIT')) colMap['unit'] = c;
        else if (clean.includes('TOTAL PEÇAS') || clean.includes('TOTAL PECAS') || clean.includes('TOTAL UNIDADE') || clean.includes('TOTAL UNIDADES') || clean.includes('QTD UNI') || clean === 'UNIDADES') colMap['unidades'] = c;
        else if (clean.includes('VALOR IPI') || clean.includes('TOTAL IPI')) colMap['valorIpi'] = c;
        else if (clean.includes('% IPI') || clean === 'IPI' || clean.includes('ALIQ IPI')) colMap['ipi'] = c;
        else if (clean.includes('VALOR TOTAL') || clean === 'TOTAL R$' || clean === 'TOTAL') colMap['total'] = c;
        else if (clean === 'PDV' || clean.includes('PDV SUGERIDO') || clean.includes('VENDA')) colMap['pdv'] = c;
        else if (clean.includes('CUSTO TOTAL')) colMap['custoTotal'] = c;
        else if (clean.includes('MARGEM')) colMap['margem'] = c;
      });

      if (colMap['codigo'] === undefined) {
        colMap['codigo'] = colMap['codigoFornecedor'] ?? colMap['codigoInterno'] ?? 0;
      }
      if (colMap['unit'] === undefined && colMap['unidades'] !== undefined && colMap['total'] !== undefined && colMap['total'] - colMap['unidades'] === 2) {
        colMap['unit'] = colMap['unidades'] + 1;
      }
      break;
    }
  }

  if (tableHeaderRowIndex === -1) {
    tableHeaderRowIndex = 7;
    colMap = { codigo: 0, descricao: 1, embalagem: 5, pacotes: 6, unidades: 7, unit: 8, total: 9 };
  }

  const items = [];
  for (let r = tableHeaderRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const codFornecRaw = colMap['codigoFornecedor'] !== undefined ? String(row[colMap['codigoFornecedor']] || '').trim() : '';
    const codInternoRaw = colMap['codigoInterno'] !== undefined ? String(row[colMap['codigoInterno']] || '').trim() : '';
    const codigoRaw = String(row[colMap['codigo'] ?? 0] || '').trim() || codFornecRaw || codInternoRaw;
    const descRaw = String(row[colMap['descricao'] ?? 1] || '').trim();

    if (!descRaw && !codigoRaw) continue;
    const upperDesc = descRaw.toUpperCase();
    const upperCod = codigoRaw.toUpperCase();
    if (upperDesc.startsWith('TOTAL') || upperCod.startsWith('TOTAL') || upperDesc.startsWith('RESUMO') ||
        upperCod.startsWith('POSSUI AVARIAS') || upperDesc.startsWith('POSSUI AVARIAS') ||
        upperCod.startsWith('PREÇO MÉDIO') || upperDesc.startsWith('PREÇO MÉDIO') ||
        upperCod.startsWith('**') || upperDesc.startsWith('**')) {
      break;
    }

    const qtdNoPacote = parseNumber(row[colMap['embalagem'] ?? 6]) || 1;
    const qtdPacotes = parseNumber(row[colMap['pacotes'] ?? 7]) || 0;
    const precoUnitario = parseNumber(row[colMap['unit'] ?? 8]);
    let qtdTotalUnidades = parseNumber(row[colMap['unidades'] ?? 9]);
    if (!qtdTotalUnidades && qtdPacotes > 0) {
      qtdTotalUnidades = qtdPacotes * qtdNoPacote;
    }
    if (qtdTotalUnidades <= 0 && qtdPacotes <= 0) continue;

    const valorTotalBruto = parseNumber(row[colMap['total'] ?? 10]) || (qtdTotalUnidades * precoUnitario);
    const pdvSugerido = parseNumber(row[colMap['pdv'] ?? 11]) || 12.00;
    const ncm = String(row[colMap['ncm'] ?? 2] || '').trim();
    const eanBarcode = String(row[colMap['ean'] ?? 4] || '').trim();
    const unidadeMedida = colMap['unidade'] !== undefined ? String(row[colMap['unidade']] || '').trim() : undefined;
    const aliquotaIpiRaw = colMap['ipi'] !== undefined ? parseNumber(row[colMap['ipi']]) : undefined;
    const aliquotaIpi = aliquotaIpiRaw !== undefined ? (aliquotaIpiRaw <= 1 ? aliquotaIpiRaw * 100 : aliquotaIpiRaw) : undefined;
    const valorIpi = colMap['valorIpi'] !== undefined ? parseNumber(row[colMap['valorIpi']]) : undefined;

    items.push({
      codigo: codigoRaw,
      codigoFornecedor: codFornecRaw || codigoRaw,
      codigoInterno: codInternoRaw || undefined,
      descricao: descRaw,
      unidadeMedida,
      ncm: ncm || undefined,
      eanBarcode: eanBarcode || undefined,
      qtdNoPacote,
      qtdPacotes,
      qtdTotalUnidades: Math.round(qtdTotalUnidades),
      precoUnitario,
      aliquotaIpi,
      valorIpi,
      valorTotalBruto,
      pdvSugerido
    });
  }

  console.log(`Total de Itens Válidos Extraídos: ${items.length}`);
  console.log('Amostra dos 2 primeiros itens:', items.slice(0, 2));

  // 4. Teste de Separação de Lojas
  const sepSheetName = workbook.SheetNames.find(n => {
    const up = n.toUpperCase();
    return up.includes('SEPARACAO') || up.includes('SEPARAÇÃO');
  });

  if (sepSheetName) {
    const sepWs = workbook.Sheets[sepSheetName];
    const sepMatrix = XLSX.utils.sheet_to_json(sepWs, { header: 1, raw: true, defval: '' });
    let headerRow = -1;
    let storeCols = [];
    let sepCodCol = 0;

    for (let r = 0; r < Math.min(sepMatrix.length, 12); r++) {
      const row = sepMatrix[r] || [];
      const rowText = row.map(c => String(c).toUpperCase().trim());
      if (rowText.some(t => t.includes('CLUSTER'))) continue;

      const storesFound = [];
      row.forEach((cell, c) => {
        const txt = String(cell).trim();
        const up = txt.toUpperCase();
        if (up.includes('CODIGO') || up.includes('CÓDIGO')) {
          sepCodCol = c;
        } else if (c >= 5 && txt && !up.includes('TOTAL') && !up.includes('CONFER') && !up.includes('STATUS') && !up.includes('AUDITORIA')) {
          storesFound.push({ name: txt, col: c });
        } else if (up.includes('LOJA') || up.startsWith('LJ') || /^\d{2}\s*-\s*[A-Z]+/.test(txt)) {
          storesFound.push({ name: txt, col: c });
        }
      });

      if (storesFound.length >= 3) {
        headerRow = r;
        storeCols = storesFound;
        break;
      }
    }

    console.log(`Lojas encontradas na aba Separação: ${storeCols.length} filiais`);
    if (storeCols.length > 0) {
      console.log(`Primeiras 5 lojas detectadas:`, storeCols.slice(0, 5).map(s => s.name));
    }
  }

  console.log(`✅ Sucesso na leitura de ${filename}!`);
}

// Executar testes nos arquivos
try {
  testParse('Planilha_Modelo_Importacao_Pedido_Mega12.xlsx');
  testParse('CONECTA 210726.xlsx');
  testParse('VR VAROES 100726.xlsx');
  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
} catch (e) {
  console.error('❌ Falha nos testes:', e);
  process.exit(1);
}
