import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_BASE_URL } from './config';
import { PurchaseOrder, StoreConfig } from '../shared/types';
import { DEFAULT_STORES } from '../shared/constants';
import { LOGO_MEGA12_BASE64 } from '../assets/logoBase64';

function formatCurrency(val: number | string): string {
  const num = Number(val) || 0;
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formata a condição de pagamento para exibição enxuta na proposta (ex: 45/60/75/90/105/120 Dias -> 45 a 120 Dias)
 */
export function formatPaymentConditionDisplay(cond?: string): string {
  if (!cond || !cond.trim()) return 'A Combinar';

  const slashPattern = /(\d+)(?:\/\d+)+/g;
  return cond.replace(slashPattern, (match) => {
    const parts = match.split('/');
    if (parts.length >= 2) {
      return `${parts[0]} a ${parts[parts.length - 1]}`;
    }
    return match;
  });
}

function getAvariaUnits(quantidade: number, unidadeMedida?: string, qtdPorPacote: number = 1): number {
  const qtd = Number(quantidade) || 0;
  const um = (unidadeMedida || 'UN').toUpperCase();
  if (um === 'PACOTES' || um === 'CX' || um === 'CAIXA' || um === 'PCT') {
    return qtd * (Number(qtdPorPacote) || 1);
  }
  return qtd;
}

// =========================================================================
// 1. EXPORTAÇÃO DO PEDIDO DE COMPRA COMERCIAL (PROPOSTA PARA FORNECEDOR)
// Formato: A4 Retrato (Portrait) | SEM NENHUMA LOJA | Foco Comercial Puro
// =========================================================================
export function exportCommercialOrderPDF(rawOrder: PurchaseOrder) {
  const order: PurchaseOrder = {
    ...rawOrder,
    items: (rawOrder.items || []).filter(it => Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoInterno?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0))
  };

  const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Pedido_${numeroPedido}_${cleanFornecedor}.pdf`;

  // 1. Download via Backend
  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_BASE_URL}/export/pdf?type=order`;
    form.target = '_self';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify({ order, type: 'order' });

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
    }, 1500);

    return true;
  } catch (backendErr) {
    console.warn('Fallback para download PDF local do pedido:', backendErr);
  }

  // 2. Geração Local via jsPDF (Fallback Completo em Paisagem)
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const rawNum = order.header?.numeroPedido || 'PED-0001';
    const numeroPedido = String(rawNum).replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
    const status = order.header?.status || 'Aprovado';
    const dataEmissao = order.header?.dataEmissao || new Date().toLocaleDateString('pt-BR');
    const dataEntrega = order.header?.dataEntregaPrevista || 'A Combinar';
    const fornecedorNome = (order.header?.fornecedor || 'FORNECEDOR NÃO INFORMADO').toUpperCase();
    const vendedor = order.header?.vendedor || 'N/A';
    const contatoVendedor = order.header?.contatoVendedor || 'S/ Contato';
    const condicaoPagamento = formatPaymentConditionDisplay(order.header?.condicaoPagamento);
    const formaPagamento = order.header?.formaPagamento || 'Boleto Bancário';
    const tipoFrete = order.header?.tipoFrete || 'CIF (Por conta do Fornecedor)';
    const observacoes = order.header?.observacoes || order.header?.observacoesDescarga || '';

    // =========================================================================
    // 1. CABEÇALHO SUPERIOR (Logo Oficial + Título + Badge do Pedido)
    // =========================================================================
    if (LOGO_MEGA12_BASE64) {
      try {
        doc.addImage(LOGO_MEGA12_BASE64, 'PNG', 10, 6, 20, 20);
      } catch (err) {
        console.warn('Erro ao inserir logo no PDF comercial local:', err);
      }
    }

    // Título e Identidade da Loja
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('MEGA 12 • PEDIDO DE COMPRA COMERCIAL', 33, 12);

    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.setFontSize(8);
    doc.text('ALS 10 BAZAR E BRINQUEDOS LTDA  •  AUTORIZAÇÃO OFICIAL DE FORNECIMENTO', 33, 17.5);

    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Documento oficial para faturamento, separação e expedição de mercadorias', 33, 22);

    // Badge do Pedido (Canto Superior Direito)
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(205, 5.5, 82, 20, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`PEDIDO Nº ${numeroPedido}`, 209, 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Emissão: ${dataEmissao}  |  Status: ${status}`, 209, 16);

    doc.setTextColor(253, 224, 71); // Yellow-300
    doc.setFont('helvetica', 'bold');
    doc.text(`Previsão de Entrega: ${dataEntrega}`, 209, 21);

    // =========================================================================
    // 2. BANNER DE ALERTA OBRIGATÓRIO (Âmbar/Amarelo Oficial ALS 10)
    // =========================================================================
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(245, 158, 11); // Amber-500
    doc.setLineWidth(0.3);
    doc.roundedRect(10, 27, 277, 6.5, 1, 1, 'FD');

    doc.setTextColor(146, 64, 14); // Amber-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('! ATENÇÃO OBRIGATÓRIA: AGENDAR ENTREGA COM ROBERTA: (42) 9 9136-5009  |  DESCARREGAMENTO POR CONTA DO FORNECEDOR', 14, 31.5);

    // =========================================================================
    // 3. CARDS DE DADOS: COMPRADOR & FORNECEDOR (Lado a Lado)
    // =========================================================================
    const cardY = 35.5;
    const cardH = 28.5;
    const cardW = 136;

    // Card 1: Comprador / Faturamento (Esquerda)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFillColor(241, 245, 249);
    doc.rect(10.2, cardY + 0.2, cardW - 0.4, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('DADOS DA EMPRESA COMPRADORA & FATURAMENTO:', 13, cardY + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Razão Social: ALS 10 BAZAR E BRINQUEDOS LTDA', 13, cardY + 8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('CNPJ: 37.144.240/0001-70       IE: 90847822-35', 13, cardY + 12.3);
    doc.setFont('helvetica', 'bold');
    doc.text('End. Entrega: Av. José Galiciolli, 152 – BR153 – Centro – Irati – PR (CEP: 84500-009)', 13, cardY + 16.1);
    doc.setTextColor(5, 150, 105);
    doc.text('E-mail para Boletos e XML: als.conecta@gmail.com', 13, cardY + 19.9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text('Compras: (55) 9 9659-6315 (Rafael)  |  Faturamento: (55) 9 99691-0247 (Ketlyn)', 13, cardY + 23.7);
    doc.text('Financeiro: (55) 9 3618-5609 (Bruna)', 13, cardY + 27.2);

    // Card 2: Fornecedor & Comercial (Direita)
    const card2X = 151;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(card2X, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFillColor(241, 245, 249);
    doc.rect(card2X + 0.2, cardY + 0.2, cardW - 0.4, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('DADOS DO FORNECEDOR & CONDIÇÕES COMERCIAIS:', card2X + 3, cardY + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`Fornecedor: ${fornecedorNome}`, card2X + 3, cardY + 8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vendedor: ${vendedor}  |  Contato: ${contatoVendedor}`, card2X + 3, cardY + 12.3);
    doc.text(`Condição de Pagto: ${condicaoPagamento}`, card2X + 3, cardY + 16.1);
    doc.text(`Forma de Pagto: ${formaPagamento}`, card2X + 3, cardY + 19.9);
    doc.text(`Tipo de Frete: ${tipoFrete}`, card2X + 3, cardY + 23.7);
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(`Previsão de Entrega: ${dataEntrega}`, card2X + 3, cardY + 27.2);

    // =========================================================================
    // 4. TABELA DE ITENS (SEM Código Interno e SEM Desconto)
    // =========================================================================
    const headCols = [
      '#',
      'Cód. Barras (EAN)',
      'Ref. Fornecedor',
      'Descrição do Produto',
      'Qtd/Cx',
      'Qtd Cx',
      'Total Peças',
      'Preço Unit.',
      'Valor Total'
    ];

    let totalVolumesGeral = 0;
    let totalPecasGeral = 0;
    let subtotalGeral = 0;

    const filteredItems = (order.items || []).filter(it =>
      Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0)
    );

    const bodyRows = filteredItems.map((item, idx) => {
      const codBarras = item.codigoBarras || (item as any).eanBarcode || '-';
      const refFornec = item.codigoFornecedor || (item as any).referencia || item.codigo || '-';
      const pack = Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1;
      const pacotes = Number(item.qtdPacotes) || 0;
      const pecas = Number(item.qtdTotalUnidades) || (pacotes * pack);
      const precoUnit = Number(item.precoUnitario) || 0;
      const valorTotal = Number(item.valorTotalLiquido) || Number(item.valorTotalBruto) || (pecas * precoUnit);

      totalVolumesGeral += pacotes;
      totalPecasGeral += pecas;
      subtotalGeral += valorTotal;

      return [
        String(idx + 1),
        codBarras,
        refFornec,
        item.descricao || 'Produto sem descrição',
        String(pack),
        pacotes.toLocaleString('pt-BR'),
        pecas.toLocaleString('pt-BR') + ' un',
        formatCurrency(precoUnit),
        formatCurrency(valorTotal)
      ];
    });

    // Linha de Totais da Tabela (com colSpan elegante)
    const footerRow = [
      {
        content: `TOTAIS DO PEDIDO (${bodyRows.length} itens)`,
        colSpan: 5,
        styles: { halign: 'left', fontStyle: 'bold' }
      },
      {
        content: totalVolumesGeral.toLocaleString('pt-BR') + ' cx',
        styles: { halign: 'center', fontStyle: 'bold' }
      },
      {
        content: totalPecasGeral.toLocaleString('pt-BR') + ' un',
        styles: { halign: 'center', fontStyle: 'bold' }
      },
      {
        content: '',
        styles: { halign: 'right' }
      },
      {
        content: formatCurrency(subtotalGeral),
        styles: { halign: 'right', fontStyle: 'bold' }
      }
    ];

    autoTable(doc, {
      startY: 66,
      head: [headCols],
      body: [...bodyRows, footerRow],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.2,
        halign: 'center',
        valign: 'middle',
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 28, halign: 'center', textColor: [71, 85, 105] },
        2: { cellWidth: 25, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
        3: { cellWidth: 110, halign: 'left', fontStyle: 'bold' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        if (data.row.index === bodyRows.length) {
          data.cell.styles.fillColor = [209, 250, 229]; // Emerald-100
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [6, 78, 59]; // Emerald-900
        }
      },
      margin: { top: 12, bottom: 12, left: 10, right: 10 }
    });

    // =========================================================================
    // 5. BLOCO INFERIOR: REGRAS OPERACIONAIS & RESUMO FINANCEIRO / ASSINATURAS
    // =========================================================================
    let finalY = ((doc as any).lastAutoTable?.finalY || 160) + 4;
    const pageHeight = doc.internal.pageSize.height || 210;

    if (finalY + 34 > pageHeight - 12) {
      doc.addPage();
      finalY = 12;
    }

    const bottomCardH = 32;

    // Bloco Esquerdo: Instruções Mandatórias da Loja (ALS 10)
    const leftW = 165;
    doc.setFillColor(254, 242, 242); // Red-50
    doc.setDrawColor(239, 68, 68); // Red-500
    doc.setLineWidth(0.3);
    doc.roundedRect(10, finalY, leftW, bottomCardH, 1.5, 1.5, 'FD');

    doc.setTextColor(153, 27, 27); // Red-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('REGRAS MANDATÓRIAS DE RECEBIMENTO & FATURAMENTO (REDE MEGA 12 / ALS 10):', 13, finalY + 4);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('1. Boletos NÃO devem exceder o valor de R$ 9.999,00 por título.', 13, finalY + 8);
    doc.text('2. Boletos e arquivo XML da Nota Fiscal devem ser enviados para: als.conecta@gmail.com.', 13, finalY + 11.8);
    doc.text('3. Pagamento de Parte Especial exclusivamente via depósitos bancários autorizados.', 13, finalY + 15.6);
    doc.text('4. Os pedidos seguem espelho oficial da empresa. Favor conferir e avisar imediatamente se houver desacordo.', 13, finalY + 19.4);
    doc.text('5. Descarregamento no local de entrega sob responsabilidade do fornecedor / transportadora.', 13, finalY + 23.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('6. AGENDAMENTO OBRIGATÓRIO DE ENTREGA COM ROBERTA: (42) 9 9136-5009', 13, finalY + 27);
    if (observacoes) {
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'italic');
      doc.text(`Obs: ${observacoes.substring(0, 115)}`, 13, finalY + 30.2);
    }

    // Bloco Direito: Resumo Financeiro & Assinaturas
    const rightX = 179;
    const rightW = 108;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightX, finalY, rightW, bottomCardH, 1.5, 1.5, 'FD');

    // Destaque do Valor Total
    doc.setFillColor(5, 150, 105); // Emerald-600
    doc.roundedRect(rightX + 3, finalY + 3, rightW - 6, 12, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(`TOTAL GERAL DO PEDIDO (${bodyRows.length} ITENS | ${totalVolumesGeral.toLocaleString('pt-BR')} CX | ${totalPecasGeral.toLocaleString('pt-BR')} UN):`, rightX + 6, finalY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(formatCurrency(subtotalGeral), rightX + 6, finalY + 13);

    // Linhas de Assinatura
    const sigY = finalY + 23;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(rightX + 5, sigY, rightX + 48, sigY);
    doc.line(rightX + 56, sigY, rightX + 102, sigY);

    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('ALS 10 / MEGA 12 (COMPRADOR)', rightX + 7, sigY + 3.5);
    doc.text('ACEITE DO FORNECEDOR', rightX + 61, sigY + 3.5);

    // =========================================================================
    // 6. RODAPÉ DE PÁGINA EM TODAS AS PÁGINAS
    // =========================================================================
    const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : ((doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1);
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(10, 203, 287, 203);

      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Rede Mega 12 • Sistema de Gestão de Compras (ALS 10 Bazar e Brinquedos Ltda)', 10, 206.5);
      doc.text(`Pedido: ${numeroPedido}  |  Página ${i} de ${totalPages}`, 250, 206.5);
    }

    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF comercial do pedido local:', err);
    throw err;
  }
}

// =========================================================================
// 2. EXPORTAÇÃO DO ROMANEIO DE SEPARAÇÃO (PARA DOCA & 20 LOJAS)
// Formato: A4 Paisagem (Landscape) | GRADE DAS 20 LOJAS, AVARIAS E DOCA
// =========================================================================
export function exportRomaneioPDF(rawOrder: PurchaseOrder, fallbackStores?: StoreConfig[]) {
  const order: PurchaseOrder = {
    ...rawOrder,
    items: (rawOrder.items || []).filter(it => Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoInterno?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0))
  };

  const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Romaneio_${numeroPedido}_${cleanFornecedor}.pdf`;

  // 1. Download via Backend
  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_BASE_URL}/export/pdf?type=separation`;
    form.target = '_self';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify({ order, stores: fallbackStores, type: 'separation' });

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
    }, 1500);

    return true;
  } catch (backendErr) {
    console.warn('Fallback para download PDF de separação local:', backendErr);
  }

  // 2. Fallback de Contingência Local via jsPDF
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const storesList = (order.storeConfigs && order.storeConfigs.length > 0) 
      ? order.storeConfigs 
      : (fallbackStores && fallbackStores.length > 0 ? fallbackStores : DEFAULT_STORES);

    const activeStores = storesList.filter(s => s.active);

    // Mapear Avarias do Pedido
    const avariasList = (order.inspection?.possuiAvarias && order.inspection?.avarias) ? order.inspection.avarias : [];
    const avariasMap = new Map<string, number>();
    let totalAvariasGeral = 0;
    avariasList.forEach(a => {
      const item = (order.items || []).find(i => i.id === a.itemId);
      const pack = item?.qtdPorPacote || 1;
      const units = getAvariaUnits(a.quantidade, a.unidadeMedida, pack);
      const key = `${a.itemId}_${a.storeId}`;
      avariasMap.set(key, (avariasMap.get(key) || 0) + units);
      totalAvariasGeral += units;
    });

    // Cabeçalho Principal (Verde Esmeralda)
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 297, 18, 'F');

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('MEGA 12 - ROMANEIO DE SEPARAÇÃO E EXPEDIÇÃO (20 LOJAS)', 14, 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    doc.text(`Emissão: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`, 225, 12);

    // Bloco de Informações do Pedido
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nº Pedido: ${order.header?.numeroPedido || 'PED-0001'}`, 14, 25);
    doc.text(`Fornecedor: ${order.header?.fornecedor || 'Fornecedor'}`, 70, 25);
    doc.text(`Status: ${order.header?.status || 'Aprovado'}`, 175, 25);
    doc.text(`Data Prevista: ${order.header?.dataEntregaPrevista || 'A definir'}`, 235, 25);

    doc.setFont('helvetica', 'normal');
    doc.text(`Condição: ${order.header?.condicaoPagamento || '30/60/90 Dias'}`, 14, 30);
    doc.text(`Vendedor: ${order.header?.vendedor || 'N/A'} (${order.header?.contatoVendedor || 'S/ Contato'})`, 70, 30);
    doc.text(`Desconto: ${order.header?.percentualDescontoOff || 0}% OFF`, 175, 30);
    doc.text(`ST: ${order.header?.aliquotaSt || 0}%`, 235, 30);

    // Colunas da Tabela
    const headCols = [
      'Cód / Descrição', 
      'Total Compra',
      'Estoque CD',
      'Total Lojas', 
      ...activeStores.map(s => s.name.replace('Ponta Grossa ', 'PG ').replace('Depósito Central', 'CD Central').replace('Prudentópolis', 'Prudentóp.'))
    ];

    const bodyRows = (order.items || []).map(item => {
      let totalItemAvarias = 0;
      let rawAllocTotal = 0;
      const storeCols = activeStores.map(s => {
        const rawAlloc = item.separacaoLojas?.[s.id] || 0;
        rawAllocTotal += rawAlloc;
        const avUnits = avariasMap.get(`${item.id}_${s.id}`) || 0;
        totalItemAvarias += avUnits;
        const effective = Math.max(0, rawAlloc - avUnits);

        if (avUnits > 0) {
          return `${effective} (-${avUnits})`;
        }
        return effective > 0 ? effective.toLocaleString('pt-BR') : '-';
      });

      const reserveCD = Math.max(0, (Number(item.qtdTotalUnidades) || 0) - rawAllocTotal);
      const totalLiquidoLojas = Math.max(0, rawAllocTotal - totalItemAvarias);
      const codIdent = item.codigoInterno || item.codigo || '';

      return [
        `${codIdent}\n${item.descricao || ''}`,
        Number(item.qtdTotalUnidades || 0).toLocaleString('pt-BR'),
        reserveCD > 0 ? reserveCD.toLocaleString('pt-BR') : '-',
        totalLiquidoLojas > 0 ? totalLiquidoLojas.toLocaleString('pt-BR') : '-',
        ...storeCols
      ];
    });

    // Totais do Rodapé
    const totaisLojas = activeStores.map(s => {
      const somaLoja = (order.items || []).reduce((acc, item) => {
        const raw = item.separacaoLojas?.[s.id] || 0;
        const avUnits = avariasMap.get(`${item.id}_${s.id}`) || 0;
        return acc + Math.max(0, raw - avUnits);
      }, 0);
      return somaLoja > 0 ? somaLoja.toLocaleString('pt-BR') : '0';
    });

    const totalGeralCompra = (order.items || []).reduce((acc, item) => acc + (Number(item.qtdTotalUnidades) || 0), 0);
    const totalGeralEstoque = (order.items || []).reduce((acc, item) => {
      const raw = activeStores.reduce((sum, s) => sum + (Number(item.separacaoLojas?.[s.id]) || 0), 0);
      return acc + Math.max(0, (Number(item.qtdTotalUnidades) || 0) - raw);
    }, 0);
    const totalGeralPecasEfetivas = totaisLojas.reduce((acc, val) => acc + (parseInt(val.replace(/\D/g, '')) || 0), 0);
    const footerRow = [
      'TOTAL GERAL EFETIVO', 
      totalGeralCompra.toLocaleString('pt-BR'),
      totalGeralEstoque.toLocaleString('pt-BR'),
      totalGeralPecasEfetivas.toLocaleString('pt-BR'), 
      ...totaisLojas
    ];

    autoTable(doc, {
      startY: 35,
      head: [headCols],
      body: [...bodyRows, footerRow],
      theme: 'grid',
      styles: { fontSize: 5.5, cellPadding: 0.8, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.0 },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 38 },
        1: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'center' },
        2: { fillColor: [254, 243, 199], fontStyle: 'bold', halign: 'center', textColor: [146, 64, 14] },
        3: { fillColor: [236, 253, 245], fontStyle: 'bold', halign: 'center', textColor: [6, 95, 70] }
      },
      didParseCell: (data) => {
        if (data.row.index === bodyRows.length) {
          data.cell.styles.fillColor = [209, 250, 229];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [6, 78, 59];
        }
      }
    });

    const pageHeight = doc.internal.pageSize.height || 210;
    let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 140;

    if (finalY + 68 > pageHeight) {
      doc.addPage();
      finalY = 12;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, finalY, 269, 16, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFERÊNCIA DE RECEBIMENTO & EXPEDIÇÃO DE DOCA:', 18, finalY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.text(`Conferente: ${order.inspection?.conferente || '____________________________________'}`, 18, finalY + 11.5);
    doc.text(`Avarias: ${order.inspection?.possuiAvarias ? `SIM (${avariasList.length} ocorrências • ${totalAvariasGeral} peças descontadas)` : '[  ] NÃO   [  ] SIM'}`, 135, finalY + 11.5);
    doc.text('Assinatura Motorista: ____________________________________', 195, finalY + 11.5);

    // COMUNICADO OFICIAL DA EMPRESA
    const noticeY = finalY + 19;
    
    doc.setFillColor(185, 28, 28);
    doc.roundedRect(14, noticeY, 269, 6.5, 1.5, 1.5, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('!  FAVOR SEGUIR DADOS COM ATENÇÃO PARA MELHOR SEGUIMENTO DO PEDIDO', 18, noticeY + 4.5);

    doc.setDrawColor(239, 68, 68);
    doc.setFillColor(254, 242, 242);
    doc.rect(14, noticeY + 6.5, 269, 38, 'FD');

    // Coluna 1: Endereço de Entrega & Dados Fiscais
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ENDEREÇO DE ENTREGA (ATUALIZADO):', 18, noticeY + 11);
    doc.setFont('helvetica', 'normal');
    doc.text('Razão Social: ALS 10 Bazar e Brinquedos Ltda', 18, noticeY + 15.5);
    doc.text('CNPJ: 37.144.240/0001-70  |  IE: 90847822-35', 18, noticeY + 19.5);
    doc.text('End: AV. JOSÉ GALICIOLLI, 152 – BR153 – Centro', 18, noticeY + 23.5);
    doc.text('CEP 84500-009  IRATI – PR', 18, noticeY + 27.5);
    doc.text('E-mail: als.conecta@gmail.com', 18, noticeY + 31.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCARREGAMENTO POR CONTA DO FORNECEDOR', 18, noticeY + 36.5);

    // Coluna 2: Contatos da Empresa
    doc.setFont('helvetica', 'bold');
    doc.text('CONTATOS & SETORES:', 115, noticeY + 11);
    doc.setFont('helvetica', 'normal');
    doc.text('• Compras: (55) 9 9659-6315 / Rafael', 115, noticeY + 15.5);
    doc.text('• Faturamento: (55) 9 99691-0247 / Ketlyn', 115, noticeY + 19.5);
    doc.text('• Financeiro: (55) 9 3618-5609 / Bruna', 115, noticeY + 23.5);
    doc.setFont('helvetica', 'bold');
    doc.text('AGENDAR ENTREGA COM ROBERTA:', 115, noticeY + 28.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('Tel / WhatsApp: (42) 9 9136-5009', 115, noticeY + 33);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text('Atualizar e-mail p/ evitar transtornos', 115, noticeY + 37);

    // Coluna 3: Regras Importantes de Boletos e Pagamento
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('REGRAS IMPORTANTES:', 195, noticeY + 11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('✓ Boletos NÃO devem exceder R$ 9.999,00', 195, noticeY + 15.5);
    doc.setFont('helvetica', 'normal');
    doc.text('✓ Boletos devem ser enviados via e-mail', 195, noticeY + 19.5);
    doc.text('✓ Pagamento Parte Especial somente via depósitos', 195, noticeY + 23.5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.text('Pedidos seguem conf. cópia da empresa.', 195, noticeY + 29);
    doc.text('Se algo estiver em desacordo, favor informar.', 195, noticeY + 33);

    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF local do romaneio:', err);
    throw err;
  }
}
