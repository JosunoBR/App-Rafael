import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_BASE_URL } from './config';
import { PurchaseOrder, StoreConfig } from '../shared/types';
import { DEFAULT_STORES } from '../shared/constants';

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
export function exportCommercialOrderPDF(order: PurchaseOrder) {
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

  // 2. Geração Local via jsPDF (Fallback Completo)
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Cabeçalho Principal (Verde Esmeralda Corporativo)
    doc.setFillColor(5, 150, 105); // Emerald-600
    doc.rect(0, 0, 210, 22, 'F');

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('REDE MEGA 12 - PEDIDO DE COMPRA OFICIAL', 12, 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('PROPOSTA COMERCIAL & AUTORIZAÇÃO DE FORNECIMENTO', 12, 17);

    const now = new Date();
    doc.text(`Emissão: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`, 148, 17);

    // Box 1: Dados do Comprador / Faturamento (Esquerda)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, 26, 90, 38, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA EMPRESA COMPRADORA:', 15, 31);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ALS 10 Bazar e Brinquedos Ltda', 15, 36);
    doc.setFont('helvetica', 'normal');
    doc.text('CNPJ: 37.144.240/0001-70 | IE: 90847822-35', 15, 40.5);
    doc.text('Av. José Galiciolli, 152 – BR153 – Centro', 15, 45);
    doc.text('CEP: 84500-009 – Irati – PR', 15, 49.5);
    doc.text('E-mail: als.conecta@gmail.com', 15, 54);
    doc.text('Compras: (55) 9 9659-6315 (Rafael)', 15, 58.5);

    // Box 2: Dados do Pedido e Fornecedor (Direita)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(108, 26, 90, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DADOS DO PEDIDO & FORNECEDOR:', 111, 31);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nº Pedido: ${order.header?.numeroPedido || 'PED-0001'}`, 111, 36);
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${order.header?.status || 'Aprovado'}`, 160, 36);
    doc.text(`Fornecedor: ${order.header?.fornecedor || 'Fornecedor'}`, 111, 40.5);
    doc.text(`Vendedor / Contato: ${order.header?.vendedor || 'N/A'} (${order.header?.contatoVendedor || 'S/ Contato'})`, 111, 45);
    doc.text(`Condição de Pagto: ${order.header?.condicaoPagamento || '30/60/90 Dias'}`, 111, 49.5);
    doc.text(`Entrega Prevista: ${order.header?.dataEntregaPrevista || 'A combinar'}`, 111, 54);

    const descOff = Number(order.header?.percentualDescontoOff || 0);
    const aliqSt = Number(order.header?.aliquotaSt || 0);
    doc.text(`Desconto: ${descOff > 0 ? `${descOff}% OFF` : 'Sem desconto'} | ST: ${aliqSt > 0 ? `${aliqSt}%` : '0%'}`, 111, 58.5);

    // Tabela de Itens Comercial
    const headCols = [
      '#',
      'Cód. Interno',
      'Ref. Fornec.',
      'Descrição do Produto',
      'Emb. (Pç/Cx)',
      'Qtd Cx',
      'Total Peças',
      'Preço Unit.',
      'Preço Cx.',
      'Total Item'
    ];

    let totalVolumesGeral = 0;
    let totalPecasGeral = 0;
    let subtotalBrutoGeral = 0;

    const bodyRows = (order.items || []).map((item, idx) => {
      const codInterno = item.codigoInterno || item.codigo || `PRD-${idx + 1}`;
      const codFornecedor = item.codigoFornecedor || '-';
      const pack = Number(item.qtdPorPacote) || 1;
      const caixas = Number(item.qtdPacotes) || 0;
      const pecas = Number(item.qtdTotalUnidades) || (caixas * pack);
      const precoUnit = Number(item.precoUnitario) || 0;
      const precoCx = precoUnit * pack;
      const valorTotal = Number(item.valorTotalBruto) || (pecas * precoUnit);

      totalVolumesGeral += caixas;
      totalPecasGeral += pecas;
      subtotalBrutoGeral += valorTotal;

      return [
        String(idx + 1),
        codInterno,
        codFornecedor,
        item.descricao || 'Produto sem descrição',
        String(pack),
        caixas.toLocaleString('pt-BR'),
        pecas.toLocaleString('pt-BR'),
        `R$ ${precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${precoCx.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    const valorDescontoTotal = descOff > 0 ? subtotalBrutoGeral * (descOff / 100) : 0;
    const valorStTotal = aliqSt > 0 ? subtotalBrutoGeral * (aliqSt / 100) : 0;
    const subtotalLiquidoGeral = Math.max(0, subtotalBrutoGeral - valorDescontoTotal + valorStTotal);

    const footerRow = [
      '',
      'TOTAL DO PEDIDO',
      '',
      `${(order.items || []).length} itens`,
      '',
      totalVolumesGeral.toLocaleString('pt-BR') + ' cx',
      totalPecasGeral.toLocaleString('pt-BR') + ' un',
      '',
      '',
      `R$ ${subtotalLiquidoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ];

    autoTable(doc, {
      startY: 68,
      head: [headCols],
      body: [...bodyRows, footerRow],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.2, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
        2: { cellWidth: 20, halign: 'center', textColor: [100, 116, 139] },
        3: { cellWidth: 52, halign: 'left', fontStyle: 'bold' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 18, halign: 'right' },
        9: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
      },
      didParseCell: (data) => {
        if (data.row.index === bodyRows.length) {
          data.cell.styles.fillColor = [209, 250, 229];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [6, 78, 59];
        }
      }
    });

    const pageHeight = doc.internal.pageSize.height || 297;
    let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : 185;

    if (finalY + 70 > pageHeight) {
      doc.addPage();
      finalY = 15;
    }

    // Box de Resumo Financeiro & Condições
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(12, finalY, 186, 24, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO FINANCEIRO DO PEDIDO:', 16, finalY + 5.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Total de Itens: ${(order.items || []).length}`, 16, finalY + 11);
    doc.text(`• Volumes (Caixas): ${totalVolumesGeral.toLocaleString('pt-BR')}`, 16, finalY + 16);
    doc.text(`• Total de Peças: ${totalPecasGeral.toLocaleString('pt-BR')} unidades`, 16, finalY + 21);

    doc.text(`• Subtotal Bruto: R$ ${subtotalBrutoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 75, finalY + 11);
    doc.text(`• Desconto Comercial: ${descOff > 0 ? `${descOff}% (- R$ ${valorDescontoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : 'R$ 0,00'}`, 75, finalY + 16);
    doc.text(`• Impostos / ST: ${valorStTotal > 0 ? `+ R$ ${valorStTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Incluso / Isento'}`, 75, finalY + 21);

    // Destaque do Total Líquido
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(138, finalY + 3, 56, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('VALOR TOTAL LÍQUIDO:', 142, finalY + 8.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${subtotalLiquidoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 142, finalY + 16);

    // Box de Instruções de Entrega e Faturamento
    const noticeY = finalY + 27;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(12, noticeY, 186, 28, 2, 2, 'FD');

    doc.setTextColor(185, 28, 28);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUÇÕES IMPORTANTES DE FATURAMENTO & ENTREGA:', 16, noticeY + 5.5);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Endereço de Entrega: AV. JOSÉ GALICIOLLI, 152 – BR153 – Centro, Irati – PR (CEP: 84500-009).', 16, noticeY + 10.5);
    doc.text('2. Descarregamento por conta do fornecedor / transportadora.', 16, noticeY + 14.5);
    doc.text('3. AGENDAMENTO OBRIGATÓRIO DE ENTREGA com Roberta pelo WhatsApp/Telefone: (42) 9 9136-5009.', 16, noticeY + 18.5);
    doc.text('4. Boletos NÃO devem exceder R$ 9.999,00 por título e devem ser enviados com o XML para als.conecta@gmail.com.', 16, noticeY + 22.5);
    if (order.header?.observacoesDescarga) {
      doc.text(`5. Obs: ${order.header.observacoesDescarga}`, 16, noticeY + 26.5);
    }

    // Assinaturas
    const sigY = noticeY + 34;
    doc.setDrawColor(148, 163, 184);
    doc.line(20, sigY + 8, 90, sigY + 8);
    doc.line(120, sigY + 8, 190, sigY + 8);

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('ALS 10 / REDE MEGA 12 (COMPRADOR)', 30, sigY + 12);
    doc.text('ACEITE DO FORNECEDOR / REPRESENTANTE', 126, sigY + 12);

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
export function exportRomaneioPDF(order: PurchaseOrder, fallbackStores?: StoreConfig[]) {
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
