import { FinancialEntry } from '../shared/types';
import { toBrDate } from './masks';

/**
 * Utilitário de Exportação Financeira (Excel/CSV e Relatório PDF)
 * Rede Mega 12 — Gestão Financeira & Contas a Pagar
 */

function formatMoneyCsv(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  return Number(val).toFixed(2).replace('.', ',');
}

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporta lançamentos selecionados ou filtrados para planilha (.csv compatível 100% com Excel BR)
 */
export function exportFinancialToExcel(
  entries: FinancialEntry[],
  filtersDescription: string = 'Lançamentos Financeiros'
): void {
  if (!entries || entries.length === 0) {
    alert('Nenhum lançamento selecionado para exportação.');
    return;
  }

  // BOM para o Excel interpretar acentos em UTF-8 corretamente
  let csvContent = '\uFEFF';

  // Cabeçalho institucional do relatório
  csvContent += `REDE MEGA 12 - RELATÓRIO FINANCEIRO & CONTAS A PAGAR\n`;
  csvContent += `Filtros / Seleção: ${filtersDescription.replace(/;/g, ' - ')}\n`;
  csvContent += `Data de Emissão: ${new Date().toLocaleString('pt-BR')}\n`;
  csvContent += `Total de Registros: ${entries.length}\n\n`;

  // Cabeçalhos de coluna
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

  // Linhas de dados
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
      item.parcelaDesc || 'Única',
      item.status,
      formatMoneyCsv(valorNum),
      item.dataPagamento ? toBrDate(item.dataPagamento) : '—',
      isPaid ? formatMoneyCsv(valorPagoNum > 0 ? valorPagoNum : valorNum) : '—',
      item.observacao || ''
    ];

    csvContent += row.map(val => escapeCsvField(val)).join(';') + '\n';
  });

  // Linha de Totais no rodapé
  csvContent += '\n';
  csvContent += `;;;;;;;;SUBTOTAIS:;${escapeCsvField(formatMoneyCsv(totalLancado))};;${escapeCsvField(formatMoneyCsv(totalPago))};${escapeCsvField(`Em Aberto: R$ ${formatMoneyCsv(totalAberto)}`)}\n`;

  // Disparar download no navegador
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
