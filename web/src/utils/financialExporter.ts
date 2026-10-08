import ExcelJS from 'exceljs';
import { FinancialEntry } from '../shared/types';
import { toBrDate } from './masks';

/**
 * Utilitário de Exportação Financeira (Planilha Excel .xlsx nativa e Relatório PDF)
 * Rede Mega 12 — Gestão Financeira & Contas a Pagar
 */

function formatMoneyCsv(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  return Number(val).toFixed(2).replace('.', ',');
}

/**
 * Escapa campos CSV. Se o texto for um indicativo numérico/fração como parcelas "09/10",
 * formata como fórmula de texto ="09/10" para impedir que o Excel converta em data ("09/out").
 */
function escapeCsvField(field: any, isTextOnly: boolean = false): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).trim();
  
  // 🛡️ Proteção contra auto-conversão do Excel para data (ex: "09/10", "1/5")
  if (isTextOnly || /^\d{1,2}\/\d{1,2}$/.test(str)) {
    return `="""${str.replace(/"/g, '""')}"""`;
  }
  
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exporta lançamentos selecionados ou filtrados diretamente para planilha nativa Excel (.xlsx)
 * 🛡️ Garante que a coluna "Parcela" (ex: 09/10) seja tratada estritamente como texto puro,
 * sem que o Microsoft Excel faça conversão arbitrária para data (ex: 09/out).
 */
export async function exportFinancialToExcel(
  entries: FinancialEntry[],
  filtersDescription: string = 'Lançamentos Financeiros'
): Promise<void> {
  if (!entries || entries.length === 0) {
    alert('Nenhum lançamento selecionado para exportação.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rede Mega 12';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Contas a Pagar', {
    views: [{ showGridLines: true }]
  });

  // Configuração das larguras de coluna
  ws.columns = [
    { key: 'vencimento', width: 14 },     // A: Vencimento
    { key: 'situacao', width: 14 },       // B: Situação
    { key: 'descricao', width: 44 },      // C: Descrição / Favorecido
    { key: 'categoria', width: 22 },      // D: Categoria
    { key: 'loja', width: 18 },           // E: Loja / Unidade
    { key: 'formaPgto', width: 16 },      // F: Forma Pgto
    { key: 'doc', width: 18 },            // G: NF / Documento
    { key: 'parcela', width: 14 },        // H: Parcela (Texto)
    { key: 'status', width: 16 },         // I: Status
    { key: 'valorLancado', width: 20 },   // J: Valor Lançado (R$)
    { key: 'dataPgto', width: 16 },       // K: Data Pagamento
    { key: 'valorPago', width: 20 },      // L: Valor Pago (R$)
    { key: 'observacoes', width: 36 }     // M: Observações
  ];

  // ===========================================================================
  // 1. CABEÇALHO INSTITUCIONAL REDE MEGA 12
  // ===========================================================================
  ws.mergeCells('A1:M1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'REDE MEGA 12 — GESTÃO FINANCEIRA & CONTAS A PAGAR';
  titleCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:M2');
  const filterCell = ws.getCell('A2');
  filterCell.value = `Filtros / Seleção: ${filtersDescription.replace(/;/g, ' - ')}`;
  filterCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF334155' } };
  filterCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  filterCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 20;

  ws.mergeCells('A3:M3');
  const metaCell = ws.getCell('A3');
  metaCell.value = `Data de Emissão: ${new Date().toLocaleString('pt-BR')}  |  Total de Registros: ${entries.length}`;
  metaCell.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF64748B' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(3).height = 18;

  // Linha 4 em branco
  ws.getRow(4).height = 10;

  // ===========================================================================
  // 2. CABEÇALHOS DAS COLUNAS
  // ===========================================================================
  const headerTitles = [
    'Vencimento',
    'Situação',
    'Descrição / Favorecido',
    'Categoria',
    'Loja / Unidade',
    'Forma Pgto',
    'NF / Documento',
    'Parcela',
    'Status',
    'Valor Lançado (R$)',
    'Data Pagamento',
    'Valor Pago (R$)',
    'Observações'
  ];

  const headerRow = ws.getRow(5);
  headerRow.height = 24;

  headerTitles.forEach((title, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = title;
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate 800
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
    // Alinhamentos
    if (colIdx === 2 || colIdx === 3 || colIdx === 12) {
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    } else if (colIdx === 9 || colIdx === 11) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  // ===========================================================================
  // 3. LINHAS DE DADOS
  // ===========================================================================
  const borderThin = {
    top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } }
  };

  let totalLancado = 0;
  let totalPago = 0;
  let totalAberto = 0;
  const startDataRow = 6;

  entries.forEach((item, index) => {
    const rowIndex = startDataRow + index;
    const row = ws.getRow(rowIndex);
    row.height = 22;

    const valorNum = Number(item.valor) || 0;
    const valorPagoNum = item.valorPago !== undefined && item.valorPago !== null ? Number(item.valorPago) : 0;
    const isPaid = item.status === 'Pago';
    const isPrevisto = (item.statusPrevisao || 'CONFIRMADO').toUpperCase() === 'PREVISTO';

    totalLancado += valorNum;
    if (isPaid) {
      totalPago += (valorPagoNum > 0 ? valorPagoNum : valorNum);
    } else {
      totalAberto += valorNum;
    }

    const isEven = index % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    // 1: Vencimento
    const cellVenc = row.getCell(1);
    cellVenc.value = toBrDate(item.dataVencimento);
    cellVenc.alignment = { vertical: 'middle', horizontal: 'center' };

    // 2: Situação
    const cellSit = row.getCell(2);
    cellSit.value = isPrevisto ? 'Previsão' : 'Confirmado';
    cellSit.alignment = { vertical: 'middle', horizontal: 'center' };
    cellSit.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isPrevisto ? 'FF1D4ED8' : 'FF15803D' } };

    // 3: Descrição / Favorecido
    const cellDesc = row.getCell(3);
    cellDesc.value = item.descricao + (item.recorrente ? ' (Recorrente 6M)' : '');
    cellDesc.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // 4: Categoria
    const cellCat = row.getCell(4);
    cellCat.value = item.categoria || 'Geral';
    cellCat.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // 5: Loja / Unidade
    const cellLoja = row.getCell(5);
    cellLoja.value = item.lojaNome || item.empresa || 'ALS';
    cellLoja.alignment = { vertical: 'middle', horizontal: 'center' };

    // 6: Forma Pgto
    const cellForma = row.getCell(6);
    cellForma.value = item.formaPagamento || 'Boleto';
    cellForma.alignment = { vertical: 'middle', horizontal: 'center' };

    // 7: NF / Documento
    const cellDoc = row.getCell(7);
    cellDoc.value = item.documentoRef || '—';
    cellDoc.alignment = { vertical: 'middle', horizontal: 'center' };

    // 🛡️ 8: PARCELA — Explicitamente string com numFmt '@' para prevenir que o Excel trate "09/10" como data
    const cellParc = row.getCell(8);
    const parcelaText = String(item.parcelaDesc || 'Única');
    cellParc.value = parcelaText;
    cellParc.numFmt = '@'; // Formato de Texto Puro
    cellParc.alignment = { vertical: 'middle', horizontal: 'center' };
    cellParc.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFB45309' } }; // Destaque âmbar

    // 9: Status
    const cellStatus = row.getCell(9);
    cellStatus.value = item.status;
    cellStatus.alignment = { vertical: 'middle', horizontal: 'center' };
    const statusColor = isPaid ? 'FF16A34A' : item.status === 'Em Atraso' ? 'FFE11D48' : 'FFD97706';
    cellStatus.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: statusColor } };

    // 10: Valor Lançado (R$) - Numérico com formato monetário oficial do Excel
    const cellVal = row.getCell(10);
    cellVal.value = valorNum;
    cellVal.numFmt = '"R$" #,##0.00';
    cellVal.alignment = { vertical: 'middle', horizontal: 'right' };
    cellVal.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };

    // 11: Data Pagamento
    const cellDataPgto = row.getCell(11);
    cellDataPgto.value = item.dataPagamento ? toBrDate(item.dataPagamento) : '—';
    cellDataPgto.alignment = { vertical: 'middle', horizontal: 'center' };

    // 12: Valor Pago (R$) - Numérico
    const cellValPago = row.getCell(12);
    if (isPaid) {
      cellValPago.value = valorPagoNum > 0 ? valorPagoNum : valorNum;
      cellValPago.numFmt = '"R$" #,##0.00';
      cellValPago.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF16A34A' } };
    } else {
      cellValPago.value = null;
      cellValPago.numFmt = '"R$" #,##0.00';
    }
    cellValPago.alignment = { vertical: 'middle', horizontal: 'right' };

    // 13: Observações
    const cellObs = row.getCell(13);
    cellObs.value = item.observacao || '';
    cellObs.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Aplica bordas e cor de fundo a todas as 13 células da linha
    for (let c = 1; c <= 13; c++) {
      const cell = row.getCell(c);
      cell.border = borderThin;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      if (!cell.font) {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
      }
    }
  });

  // ===========================================================================
  // 4. LINHA DE SUBTOTAIS (CONTÁBIL)
  // ===========================================================================
  const endDataRow = startDataRow + entries.length - 1;
  const totalRowIndex = endDataRow + 1;
  const totalRow = ws.getRow(totalRowIndex);
  totalRow.height = 26;

  // Mescla A até I para o rótulo "SUBTOTAIS:"
  ws.mergeCells(`A${totalRowIndex}:I${totalRowIndex}`);
  const totalLabelCell = ws.getCell(`A${totalRowIndex}`);
  totalLabelCell.value = 'SUBTOTAIS:';
  totalLabelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Total Valor Lançado com fórmula SUM
  const totalLancadoCell = ws.getCell(`J${totalRowIndex}`);
  totalLancadoCell.value = {
    formula: `SUM(J${startDataRow}:J${endDataRow})`,
    result: totalLancado
  };
  totalLancadoCell.numFmt = '"R$" #,##0.00';
  totalLancadoCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totalLancadoCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Célula intermediária K
  const totalSpacerK = ws.getCell(`K${totalRowIndex}`);
  totalSpacerK.value = '';

  // Total Valor Pago com fórmula SUM
  const totalPagoCell = ws.getCell(`L${totalRowIndex}`);
  totalPagoCell.value = {
    formula: `SUM(L${startDataRow}:L${endDataRow})`,
    result: totalPago
  };
  totalPagoCell.numFmt = '"R$" #,##0.00';
  totalPagoCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF16A34A' } };
  totalPagoCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Resumo de "Em Aberto" na coluna M
  const totalAbertoCell = ws.getCell(`M${totalRowIndex}`);
  totalAbertoCell.value = `Em Aberto: R$ ${formatMoneyCsv(totalAberto)}`;
  totalAbertoCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
  totalAbertoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Estilização contábil (dupla borda inferior) para a linha de totais
  const borderTotal = {
    top: { style: 'thin' as const, color: { argb: 'FF475569' } },
    bottom: { style: 'double' as const, color: { argb: 'FF0F172A' } },
    left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } }
  };

  for (let c = 1; c <= 13; c++) {
    const cell = totalRow.getCell(c);
    cell.border = borderTotal;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }

  // ===========================================================================
  // 5. DOWNLOAD DO ARQUIVO .XLSX
  // ===========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nowStr = new Date().toISOString().substring(0, 10);
  link.href = url;
  link.download = `financeiro_mega12_${nowStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 500);
}

/**
 * Fallback / Alternativa para exportação em CSV (mantendo proteção de fórmula para parcelas)
 */
export function exportFinancialToCsv(
  entries: FinancialEntry[],
  filtersDescription: string = 'Lançamentos Financeiros'
): void {
  if (!entries || entries.length === 0) {
    alert('Nenhum lançamento selecionado para exportação.');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += `REDE MEGA 12 - RELATÓRIO FINANCEIRO & CONTAS A PAGAR\n`;
  csvContent += `Filtros / Seleção: ${filtersDescription.replace(/;/g, ' - ')}\n`;
  csvContent += `Data de Emissão: ${new Date().toLocaleString('pt-BR')}\n`;
  csvContent += `Total de Registros: ${entries.length}\n\n`;

  const headers = [
    'Vencimento',
    'Situação',
    'Descrição / Favorecido',
    'Categoria',
    'Loja / Unidade',
    'Forma Pgto',
    'NF / Documento',
    'Parcela',
    'Status',
    'Valor Lançado (R$)',
    'Data Pagamento',
    'Valor Pago (R$)',
    'Observações'
  ];
  csvContent += headers.map(h => escapeCsvField(h)).join(';') + '\n';

  let totalLancado = 0;
  let totalPago = 0;
  let totalAberto = 0;

  entries.forEach(item => {
    const valorNum = Number(item.valor) || 0;
    const valorPagoNum = item.valorPago !== undefined && item.valorPago !== null ? Number(item.valorPago) : 0;
    const isPaid = item.status === 'Pago';

    totalLancado += valorNum;
    if (isPaid) {
      totalPago += (valorPagoNum > 0 ? valorPagoNum : valorNum);
    } else {
      totalAberto += valorNum;
    }

    const row = [
      toBrDate(item.dataVencimento),
      (item.statusPrevisao || 'CONFIRMADO').toUpperCase() === 'PREVISTO' ? 'Previsão' : 'Confirmado',
      item.descricao + (item.recorrente ? ' (Recorrente 6M)' : ''),
      item.categoria,
      item.lojaNome || item.empresa || 'ALS',
      item.formaPagamento,
      item.documentoRef || '—',
      escapeCsvField(item.parcelaDesc || 'Única', true), // 🛡️ Força ="09/10" para não converter em data
      item.status,
      formatMoneyCsv(valorNum),
      item.dataPagamento ? toBrDate(item.dataPagamento) : '—',
      isPaid ? formatMoneyCsv(valorPagoNum > 0 ? valorPagoNum : valorNum) : '—',
      item.observacao || ''
    ];

    csvContent += row.map((val, idx) => idx === 7 ? val : escapeCsvField(val)).join(';') + '\n';
  });

  csvContent += '\n';
  csvContent += `;;;;;;;;SUBTOTAIS:;${escapeCsvField(formatMoneyCsv(totalLancado))};;${escapeCsvField(formatMoneyCsv(totalPago))};${escapeCsvField(`Em Aberto: R$ ${formatMoneyCsv(totalAberto)}`)}\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nowStr = new Date().toISOString().substring(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `financeiro_mega12_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gera relatório visual corporativo pronto para visualização e impressão em PDF
 */
export function exportFinancialToPdf(
  entries: FinancialEntry[],
  filtersDescription: string = 'Lançamentos Financeiros',
  metaDiaria?: number
): void {
  if (!entries || entries.length === 0) {
    alert('Nenhum lançamento selecionado para exportação.');
    return;
  }

  let totalLancado = 0;
  let totalPago = 0;
  let totalAberto = 0;

  entries.forEach(item => {
    const val = Number(item.valor) || 0;
    const pago = item.valorPago !== undefined && item.valorPago !== null ? Number(item.valorPago) : 0;
    totalLancado += val;
    if (item.status === 'Pago') {
      totalPago += (pago > 0 ? pago : val);
    } else {
      totalAberto += val;
    }
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita pop-ups no navegador para gerar o relatório PDF.');
    return;
  }

  const tableRowsHtml = entries.map((item, idx) => {
    const isPaid = item.status === 'Pago';
    const isPrevisto = (item.statusPrevisao || 'CONFIRMADO').toUpperCase() === 'PREVISTO';
    const valorNum = Number(item.valor) || 0;
    const valorPagoNum = item.valorPago !== undefined && item.valorPago !== null ? Number(item.valorPago) : 0;

    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 7px 8px; font-weight: 700; font-family: monospace;">${toBrDate(item.dataVencimento)}</td>
        <td style="padding: 7px 8px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; background: ${isPrevisto ? '#dbeafe; color: #1d4ed8;' : '#dcfce7; color: #15803d;'}">
            ${isPrevisto ? 'PREVISÃO' : 'CONFIRMADO'}
          </span>
        </td>
        <td style="padding: 7px 8px; font-weight: 600; color: #0f172a;">
          ${item.descricao}
          ${item.recorrente ? '<span style="font-size: 8px; font-weight: 800; color: #d97706; margin-left: 4px;">[6M]</span>' : ''}
          ${item.observacao ? `<div style="font-size: 9px; color: #64748b; font-weight: normal;">${item.observacao}</div>` : ''}
        </td>
        <td style="padding: 7px 8px; font-size: 10px; color: #475569;">${item.categoria}</td>
        <td style="padding: 7px 8px; font-size: 10px; color: #334155;">${item.lojaNome || item.empresa || 'ALS'}</td>
        <td style="padding: 7px 8px; font-size: 10px; font-family: monospace;">${item.formaPagamento}</td>
        <td style="padding: 7px 8px; font-size: 10px; font-family: monospace; color: #64748b;">${item.documentoRef || '—'}</td>
        <td style="padding: 7px 8px; font-size: 10px; font-weight: 700; color: #b45309;">${item.parcelaDesc || 'Única'}</td>
        <td style="padding: 7px 8px; font-size: 10px;">
          <span style="font-weight: 700; color: ${isPaid ? '#16a34a' : item.status === 'Em Atraso' ? '#e11d48' : '#d97706'};">
            ${item.status}
          </span>
        </td>
        <td style="padding: 7px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">
          R$ ${valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 7px 8px; text-align: right; font-family: monospace; font-size: 10px; color: ${isPaid ? '#16a34a' : '#94a3b8'};">
          ${isPaid ? (valorPagoNum > 0 ? valorPagoNum : valorNum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Relatório Financeiro & Contas a Pagar - Rede Mega 12</title>
      <style>
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          background: #f8fafc;
          font-size: 11px;
        }
        .container {
          max-width: 100%;
          margin: 0 auto;
          background: #ffffff;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }
        .card {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .card-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 4px;
        }
        .card-value {
          font-size: 16px;
          font-weight: 800;
          font-family: monospace;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }
        th {
          background: #0f172a;
          color: #ffffff;
          padding: 8px;
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
        }
        th.text-right { text-align: right; }
        .footer {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 9.5px;
          color: #64748b;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 14px; display: flex; justify-content: flex-end; gap: 8px;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
          🖨️ Imprimir / Salvar como PDF
        </button>
      </div>

      <div class="container">
        <div class="header">
          <div>
            <h1 style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a;">REDE MEGA 12</h1>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569; font-weight: 600;">
              Relatório Gerencial de Contas a Pagar & Fluxo Financeiro
            </p>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">
              <strong>Filtros / Escopo:</strong> ${filtersDescription}
            </p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 700; color: #0f172a;">Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
            <div style="font-size: 10px; color: #64748b;">Total de Títulos: <strong>${entries.length}</strong></div>
          </div>
        </div>

        <div class="cards">
          <div class="card" style="border-left: 4px solid #b45309;">
            <div class="card-label">Volume Total Lançado</div>
            <div class="card-value">R$ ${totalLancado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="card" style="border-left: 4px solid #16a34a;">
            <div class="card-label" style="color: #16a34a;">Total Liquidado (Pago)</div>
            <div class="card-value" style="color: #16a34a;">R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="card" style="border-left: 4px solid #2563eb;">
            <div class="card-label" style="color: #2563eb;">Saldo em Aberto</div>
            <div class="card-value">R$ ${totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="card" style="border-left: 4px solid #6366f1;">
            <div class="card-label">Meta Diária Fixada</div>
            <div class="card-value">${metaDiaria ? `R$ ${metaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definida'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Situação</th>
              <th>Favorecido / Descrição</th>
              <th>Categoria</th>
              <th>Loja / Unidade</th>
              <th>Forma Pgto</th>
              <th>NF / Doc</th>
              <th>Parcela</th>
              <th>Status</th>
              <th class="text-right">Valor Lançado</th>
              <th class="text-right">Valor Pago</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Rede Mega 12 • Sistema Integrado de Compras & Gestão Financeira Corporativa</div>
          <div>Página 1 de 1</div>
        </div>
      </div>
      <script>
        window.onload = function() {
          // Permite pré-visualizar ou imprimir diretamente
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
