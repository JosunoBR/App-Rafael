import * as XLSX from 'xlsx';
import { 
  ExcelImportHeader, 
  ExcelImportRawItem, 
  ExcelImportFiscalParams, 
  ParsedExcelOrder 
} from './types';
import { parseExcelDate } from './excelDateHelper';

/**
 * Realiza a leitura e extração estruturada dos dados da planilha de pedido do Excel.
 */
export function parseOrderExcelFile(
  dataBuffer: ArrayBuffer, 
  fileName: string
): ParsedExcelOrder {
  const workbook = XLSX.read(dataBuffer, { type: 'array' });

  // 1. Identificar a aba comercial do pedido
  const sheetName = findCommercialSheet(workbook);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Não foi possível localizar a aba de itens comerciais no arquivo ${fileName}`);
  }

  // Obter dados da planilha como matriz bidimensional
  const sheetMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    raw: true, 
    defval: '' 
  });

  // 2. Extrair Cabeçalho do Pedido
  const header = extractHeaderFromMatrix(sheetMatrix);

  // Se não encontrou número de pedido, gera sugestão baseada no fornecedor e data
  if (!header.numeroPedido) {
    const cleanFornec = header.fornecedorNome ? header.fornecedorNome.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : 'FORNEC';
    const digits = header.dataPedido.replace(/\D/g, '');
    const dateStamp = digits.length >= 8 ? `${digits.slice(0, 4)}${digits.slice(6, 8)}` : digits;
    header.numeroPedido = `PED-${cleanFornec}-${dateStamp}`;
  }

  // 3. Localizar e extrair a tabela de produtos/itens
  const items = extractItemsFromMatrix(sheetMatrix);

  // 4. Extrair parâmetros fiscais (se houver aba "LIMITE DE PRECO" ou similar)
  const fiscalParams = extractFiscalParams(workbook);

  // 5. Extrair grade de separação de lojas (se houver aba "SEPARACAO")
  const storeAllocations = extractStoreSeparation(workbook);

  // 6. Totais consolidados
  const totalItens = items.length;
  const totalPecas = items.reduce((sum, item) => sum + (item.qtdTotalUnidades || 0), 0);
  const valorTotalGeral = items.reduce((sum, item) => sum + (item.valorTotalBruto || 0), 0);

  return {
    fileName,
    sheetName,
    header,
    items,
    fiscalParams,
    storeAllocations,
    totalItens,
    totalPecas,
    valorTotalGeral
  };
}

/**
 * Encontra a aba comercial do pedido (ignora abas acessórias como SEPARACAO, CALCULADORA, LIMITE DE PRECO).
 */
function findCommercialSheet(workbook: XLSX.WorkBook): string {
  const ignoredNames = ['SEPARACAO', 'SEPARAÇÃO', 'LIMITE DE PRECO', 'LIMITE DE PREÇO', 'CALCULADORA', 'GRAFICO', 'RESUMO'];
  
  // Se tiver apenas 1 aba
  if (workbook.SheetNames.length === 1) {
    return workbook.SheetNames[0];
  }

  // Procura primeira aba que não esteja na lista de ignoradas
  for (const name of workbook.SheetNames) {
    const upper = name.trim().toUpperCase();
    if (!ignoredNames.includes(upper)) {
      return name;
    }
  }

  return workbook.SheetNames[0];
}

/**
 * Extrai os dados do cabeçalho da matriz de células da planilha comercial.
 */
function extractHeaderFromMatrix(matrix: any[][]): ExcelImportHeader {
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
  let dataPedidoVal: any = null;
  let dataEntregaVal: any = null;
  const observacoesList: string[] = [];
  let tipoFrete: 'CIF' | 'FOB' | 'Retira' = 'Retira';

  // 1. Extração prioritária por linhas específicas conhecidas da planilha padrão
  // Linha 3 do Excel (índice 2): FORNECEDOR, DATA ENTREGA, E-mail e Telefone da Empresa
  const rowExcel3 = matrix[2] || [];
  for (let c = 0; c < rowExcel3.length; c++) {
    const val = String(rowExcel3[c] || '').trim();
    if (!val) continue;

    if (val.toUpperCase().startsWith('FORNECEDOR:')) {
      const ext = val.replace(/^FORNECEDOR:\s*/i, '').trim();
      if (ext) fornecedorNome = ext;
      else if (rowExcel3[c + 1]) fornecedorNome = String(rowExcel3[c + 1]).trim();
    }

    if (val.includes('@') && !email) {
      const emailMatch = val.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (emailMatch) email = emailMatch[0];
    }

    const phoneMatch = val.match(/\(?\d{2}\)?\s*9?\.?\s*\d{4,5}[-\s]?\d{4}/);
    if (phoneMatch && !telefoneEmpresa) {
      telefoneEmpresa = phoneMatch[0].trim();
    }
  }

  // Linha 5 do Excel (índice 4): PROGRAMAÇÃO com nome do vendedor e contato
  const rowExcel5 = matrix[4] || [];
  for (let c = 0; c < rowExcel5.length; c++) {
    const val = String(rowExcel5[c] || '').trim();
    if (!val) continue;

    const phoneMatch = val.match(/(\(?\d{2}\)?\s*9?\.?\s*\d{4,5}[-\s]?\d{4})/);
    if (phoneMatch) {
      telefoneVendedor = phoneMatch[0].trim();
      const namePart = val.replace(phoneMatch[0], '').replace(/[()\-:]/g, '').trim();
      if (namePart && !vendedor) {
        vendedor = namePart;
      }
    }
  }

  // 2. Varredura geral das primeiras 12 linhas para consolidar campos ou capturar em layouts variantes
  for (let r = 0; r < Math.min(matrix.length, 12); r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (!cellVal) continue;

      const upper = cellVal.toUpperCase();

      // N° PEDIDO
      if (upper.includes('N° PEDIDO') || upper.includes('NUMERO PEDIDO') || upper.includes('Nº PEDIDO')) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell && !nextCell.toUpperCase().includes('FORNECEDOR')) {
          numeroPedido = nextCell;
        }
      }

      // FORNECEDOR (se ainda não capturado)
      if (!fornecedorNome && upper.startsWith('FORNECEDOR:')) {
        const extracted = cellVal.replace(/^FORNECEDOR:\s*/i, '').trim();
        if (extracted) {
          fornecedorNome = extracted;
        } else if (row[c + 1]) {
          fornecedorNome = String(row[c + 1]).trim();
        }
      }

      // VENDEDOR / PROGRAMAÇÃO (se não capturado na linha 5)
      if (!vendedor && (upper.startsWith('PROGRAMAÇÃO') || upper.startsWith('PROGRAMACAO') || upper.startsWith('VENDEDOR:'))) {
        const raw = cellVal.replace(/^(PROGRAMA[ÇC][ÃA]O|VENDEDOR):\s*/i, '').trim() || String(row[c + 1] || '').trim() || String(row[c + 2] || '').trim();
        const phoneMatch = raw.match(/(\(?\d{2}\)?\s*9?\.?\s*\d{4,5}[-\s]?\d{4})/);
        if (phoneMatch) {
          telefoneVendedor = phoneMatch[1].trim();
          vendedor = raw.replace(phoneMatch[0], '').replace(/[()\-:]/g, '').trim();
        } else if (raw) {
          vendedor = raw;
        }
      }

      // COND. PAG.
      if (upper.startsWith('COND. PAG.') || upper.startsWith('CONDICAO PAG') || upper.startsWith('COND. PAGAMENTO')) {
        let extracted = cellVal.replace(/^COND\.\s*PAG\.\s*:?\s*/i, '').trim();
        if (!extracted && row[c + 1]) {
          extracted = String(row[c + 1]).trim();
        }
        if (extracted) {
          condicaoPagamento = extracted;
        }
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
        const nextRowVal = matrix[r + 1]?.[c];
        const nextColVal = row[c + 1];
        dataPedidoVal = nextRowVal !== undefined && nextRowVal !== '' ? nextRowVal : nextColVal;
      }

      // DATA ENTREGA
      if (upper.includes('DATA ENTREGA')) {
        const nextRowVal = matrix[r + 1]?.[c];
        const nextColVal = row[c + 1];
        dataEntregaVal = nextRowVal !== undefined && nextRowVal !== '' ? nextRowVal : nextColVal;
      }

      // OBSERVAÇÃO
      if (upper.startsWith('OBSERVAÇÃO:') || upper.startsWith('OBSERVACAO:')) {
        const obs = cellVal.replace(/^OBSERVA[ÇC][ÃA]O:\s*/i, '').trim() || String(row[c + 1] || '').trim();
        if (obs && !observacoesList.includes(obs)) {
          observacoesList.push(obs);
        }
      }

      // FRETE
      if (upper.startsWith('FRETE')) {
        const freteText = cellVal.replace(/^FRETE\s*:?\s*/i, '').trim() || String(row[c + 1] || '').trim().toUpperCase();
        if (freteText.includes('FOB')) tipoFrete = 'FOB';
        else if (freteText.includes('CIF')) tipoFrete = 'CIF';
        else tipoFrete = 'Retira';
      }

      // CNPJ na célula (formato XX.XXX.XXX/XXXX-XX)
      const cnpjMatch = cellVal.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
      if (cnpjMatch && !cnpj) {
        cnpj = cnpjMatch[0];
      }

      // Email na célula (se não achou)
      const emailMatch = cellVal.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (emailMatch && !email) {
        email = emailMatch[0];
      }

      // Telefone da empresa
      const phoneMatch = cellVal.match(/\(?\d{2}\)?\s*9?\.?\s*\d{4,5}[-\s]?\d{4}/);
      if (phoneMatch && !telefoneEmpresa && phoneMatch[0] !== telefoneVendedor) {
        telefoneEmpresa = phoneMatch[0].trim();
      }

      // Textos adicionais como observação operacional
      if (upper.includes('DESCARREGAMENTO') || upper.includes('DESCARGA') || upper.includes('PALETE') || upper.includes('BOLETOS E PEDIDOS')) {
        if (!observacoesList.includes(cellVal)) {
          observacoesList.push(cellVal);
        }
      }
    }
  }

  // Fallbacks e formatações de dados
  const dataPedido = parseExcelDate(dataPedidoVal, 0);
  const dataEntregaPrevista = parseExcelDate(dataEntregaVal, 15);

  telefoneContato = telefoneEmpresa || telefoneVendedor || '';
  const contatoVendedor = telefoneVendedor || telefoneContato || email || '';

  return {
    numeroPedido,
    fornecedorNome: fornecedorNome || 'FORNECEDOR IMPORTADO',
    cnpj,
    email,
    telefoneContato,
    telefoneEmpresa,
    vendedor,
    telefoneVendedor,
    contatoVendedor,
    condicaoPagamento: condicaoPagamento || '30/60/90 Dias',
    percentualDescontoOff,
    dataPedido,
    dataEntregaPrevista,
    observacoes: observacoesList.join(' | '),
    tipoFrete
  };
}

/**
 * Localiza a linha do cabeçalho da tabela de itens e extrai os produtos.
 */
function extractItemsFromMatrix(matrix: any[][]): ExcelImportRawItem[] {
  let headerRowIndex = -1;
  let colMap: Record<string, number> = {};

  // Procurar a linha onde estão as colunas (CODIGO, DESCRICAO, VALOR TOTAL...)
  for (let r = 0; r < Math.min(matrix.length, 20); r++) {
    const row = matrix[r] || [];
    const rowText = row.map(c => String(c).toUpperCase().trim());
    
    if (rowText.includes('CODIGO') || rowText.includes('CÓDIGO') || rowText.includes('DESCRICAO') || rowText.includes('DESCRIÇÃO') || rowText.some(t => t.includes('REFER'))) {
      headerRowIndex = r;
      row.forEach((cell, c) => {
        const clean = String(cell).toUpperCase().trim();
        if (clean.includes('CODIGO') || clean.includes('CÓDIGO') || clean.includes('REFER')) colMap['codigo'] = c;
        else if (clean.includes('DESCRICAO') || clean.includes('DESCRIÇÃO')) colMap['descricao'] = c;
        else if (clean === 'NCM') colMap['ncm'] = c;
        else if (clean === 'EAN' || clean.includes('BARRAS') || clean.includes('BARCODE')) colMap['ean'] = c;
        else if (clean.includes('EMBALAGEM') || clean.includes('QTD NO PEC') || clean.includes('CX') || clean.includes('QTD/CX') || clean.includes('QTD PACOTE')) colMap['embalagem'] = c;
        else if (clean.includes('PACOTES') || clean.includes('QTD DE PEC') || clean.includes('QTD CX')) colMap['pacotes'] = c;
        else if (clean.includes('R$ UNIT') || clean === 'UNIT' || clean.includes('PRECO UNIT') || clean.includes('VALOR UNIT')) colMap['unit'] = c;
        else if (clean.includes('TOTAL UNIDADE') || clean.includes('TOTAL UNIDADES') || clean.includes('QTD UNI') || clean === 'UNIDADES') colMap['unidades'] = c;
        else if (clean.includes('VALOR TOTAL') || clean === 'TOTAL R$' || clean === 'TOTAL') colMap['total'] = c;
        else if (clean === 'PDV' || clean.includes('PDV SUGERIDO') || clean.includes('VENDA')) colMap['pdv'] = c;
        else if (clean.includes('CUSTO TOTAL')) colMap['custoTotal'] = c;
        else if (clean === 'MARGEM' || clean.includes('MARGEM')) colMap['margem'] = c;
      });

      // Se a coluna de preço unitário não tiver título na planilha mas estiver entre unidades e valor total
      if (colMap['unit'] === undefined && colMap['unidades'] !== undefined && colMap['total'] !== undefined && colMap['total'] - colMap['unidades'] === 2) {
        colMap['unit'] = colMap['unidades'] + 1;
      }
      break;
    }
  }

  // Se não achou pelos nomes das colunas, usa o layout padrão observado em CONECTA 210726.xlsx
  if (headerRowIndex === -1) {
    headerRowIndex = 7; // Linha 8
    colMap = {
      codigo: 0,
      descricao: 1,
      embalagem: 5,
      pacotes: 6,
      unidades: 7,
      unit: 8,
      total: 9
    };
  }

  const items: ExcelImportRawItem[] = [];

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    
    const codigoRaw = String(row[colMap['codigo'] ?? 0] || '').trim();
    const descRaw = String(row[colMap['descricao'] ?? 1] || '').trim();

    // Se a descrição indicar resumo de total ou for linha vazia, encerra a leitura de itens
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
    
    // Qtd total de unidades (se não informado, calcula pacotes * embalagem)
    let qtdTotalUnidades = parseNumber(row[colMap['unidades'] ?? 9]);
    if (!qtdTotalUnidades && qtdPacotes > 0) {
      qtdTotalUnidades = qtdPacotes * qtdNoPacote;
    }

    // Se quantidade for 0 ou negativa, ignora o item conforme regra do sistema
    if (qtdTotalUnidades <= 0 && qtdPacotes <= 0) {
      continue;
    }

    const valorTotalBruto = parseNumber(row[colMap['total'] ?? 10]) || (qtdTotalUnidades * precoUnitario);
    const pdvSugerido = parseNumber(row[colMap['pdv'] ?? 11]) || 12.00;
    const ncm = String(row[colMap['ncm'] ?? 2] || '').trim();
    const eanBarcode = String(row[colMap['ean'] ?? 4] || '').trim();
    const custoTotalInformado = parseNumber(row[colMap['custoTotal'] ?? 12]);
    const margemInformada = parseNumber(row[colMap['margem'] ?? 13]);

    items.push({
      rowNumber: r + 1,
      codigo: codigoRaw || `ITEM-${items.length + 1}`,
      descricao: descRaw,
      ncm: ncm || undefined,
      eanBarcode: eanBarcode || undefined,
      qtdNoPacote,
      qtdPacotes,
      qtdTotalUnidades: Math.round(qtdTotalUnidades),
      precoUnitario,
      valorTotalBruto,
      pdvSugerido,
      custoTotalInformado: custoTotalInformado || undefined,
      margemInformada: margemInformada || undefined
    });
  }

  return items;
}

/**
 * Extrai parâmetros fiscais se houver aba de configuração fiscal como "LIMITE DE PRECO".
 */
function extractFiscalParams(workbook: XLSX.WorkBook): ExcelImportFiscalParams | undefined {
  const fiscalSheetName = workbook.SheetNames.find(n => {
    const up = n.toUpperCase();
    return up.includes('LIMITE DE PRECO') || up.includes('LIMITE DE PREÇO') || up.includes('PARAMETROS');
  });

  if (!fiscalSheetName) return undefined;

  const worksheet = workbook.Sheets[fiscalSheetName];
  if (!worksheet) return undefined;

  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
  const params: ExcelImportFiscalParams = {};

  for (const row of matrix) {
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toUpperCase().trim();
      const val = parseNumber(row[c + 1]);

      if (cell.includes('ICMS') && !cell.includes('CREDITO') && !cell.includes('CRÉDITO')) {
        params.icmsAliquota = val <= 1 ? val : val / 100;
      } else if (cell.includes('IPI')) {
        params.ipiAliquota = val <= 1 ? val : val / 100;
      } else if (cell.includes('PIS') || cell.includes('COFINS')) {
        params.pisCofinsAliquota = val <= 1 ? val : val / 100;
      } else if (cell.includes('FIXOS') || cell.includes('CUSTOS FIXOS')) {
        params.custosFixos = val <= 1 ? val : val / 100;
      } else if (cell.includes('CREDITO') || cell.includes('CRÉDITO')) {
        params.creditoEntradaICMS = val <= 1 ? val : val / 100;
      }
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Extrai alocações de lojas da aba "SEPARACAO", se presente e preenchida.
 */
function extractStoreSeparation(workbook: XLSX.WorkBook): Record<string, Record<string, number>> | undefined {
  const sepSheetName = workbook.SheetNames.find(n => {
    const up = n.toUpperCase();
    return up.includes('SEPARACAO') || up.includes('SEPARAÇÃO');
  });

  if (!sepSheetName) return undefined;

  const worksheet = workbook.Sheets[sepSheetName];
  if (!worksheet) return undefined;

  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
  if (matrix.length < 8) return undefined;

  // Localizar linha de cabeçalho das lojas (linha com "LOJA" ou códigos de lojas)
  let headerRow = -1;
  let storeCols: { name: string; col: number }[] = [];
  let codCol = 0;

  for (let r = 0; r < Math.min(matrix.length, 12); r++) {
    const row = matrix[r] || [];
    const storesFound: { name: string; col: number }[] = [];
    
    row.forEach((cell, c) => {
      const txt = String(cell).trim();
      const up = txt.toUpperCase();
      if (up.includes('CODIGO') || up.includes('CÓDIGO')) {
        codCol = c;
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

  if (headerRow === -1 || storeCols.length === 0) return undefined;

  const allocations: Record<string, Record<string, number>> = {};
  storeCols.forEach(sc => {
    allocations[sc.name] = {};
  });

  let totalAllocated = 0;

  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const itemCode = String(row[codCol] || '').trim();
    if (!itemCode || itemCode.toUpperCase().startsWith('TOTAL')) continue;

    storeCols.forEach(sc => {
      const qty = parseNumber(row[sc.col]);
      if (qty > 0) {
        allocations[sc.name][itemCode] = qty;
        totalAllocated += qty;
      }
    });
  }

  return totalAllocated > 0 ? allocations : undefined;
}

/**
 * Converte valor de célula para número com segurança (trata vírgulas, moedas e strings).
 */
function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  // Remove "R$", "%", espaços
  str = str.replace(/R\$\s?|\s|%/g, '');

  // Trata formato brasileiro (1.234,56 -> 1234.56)
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}
