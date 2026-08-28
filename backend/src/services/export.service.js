const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
const autoTableModule = require('jspdf-autotable');
const autoTable = autoTableModule.default || autoTableModule;

function getAvariaUnits(quantidade, unidadeMedida, qtdPorPacote = 1) {
  const qtd = Number(quantidade) || 0;
  if (unidadeMedida === 'pacotes' || unidadeMedida === 'cx' || unidadeMedida === 'caixa') {
    return qtd * (Number(qtdPorPacote) || 1);
  }
  return qtd;
}

class ExportService {
  generateExcel(order, activeStores = []) {
    const wb = XLSX.utils.book_new();

    const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');

    // 1. ABA 1: CABEÇALHO & ITENS DO PEDIDO
    const headerInfo = [
      ['RELATÓRIO OFICIAL DE PEDIDO DE COMPRA - REDE MEGA 12'],
      [],
      ['Número do Pedido:', order.header?.numeroPedido || '', 'Status:', order.header?.status || 'Em Cotação'],
      ['Fornecedor:', order.header?.fornecedor || '', 'Vendedor:', order.header?.vendedor || ''],
      ['Contato Vendedor:', order.header?.contatoVendedor || '', 'Condição Pagto:', order.header?.condicaoPagamento || ''],
      ['Data Emissão:', order.header?.dataEmissao || '', 'Entrega Prevista:', order.header?.dataEntregaPrevista || ''],
      ['Desconto OFF (%):', `${order.header?.percentualDescontoOff || 0}%`, 'Alíquota ST (%):', `${order.header?.aliquotaSt || 0}%`],
      ['% NOTA:', `${order.header?.percentualNota !== undefined ? order.header.percentualNota : 100}%`],
      ['Observações:', order.header?.observacoes || ''],
      []
    ];

    const itemsHeaders = [
      'Código', 'Descrição', 'Qtd Pacotes', 'Qtd p/ Pacote', 'Total Peças',
      'Preço Unitário (R$)', 'Preço Pacote (R$)', 'Custo Bruto (R$)', 'Valor ST (R$)',
      'Desconto (R$)', 'Custo Líquido Total (R$)', 'PDV Alvo (R$)', 'Margem (%)'
    ];

    const itemsRows = (order.items || []).map(item => [
      item.codigo || '',
      item.descricao || '',
      item.qtdPacotes || 0,
      item.qtdPorPacote || 1,
      item.qtdTotalUnidades || 0,
      item.precoUnitario || 0,
      item.precoPacote || 0,
      item.custoBrutoTotal || 0,
      item.valorStTotal || 0,
      item.valorDescontoTotal || 0,
      item.custoLiquidoTotalComDesconto || item.custoLiquidoTotal || 0,
      item.pdvAlvo || 0,
      `${Number(item.margemPercentual || 0).toFixed(1)}%`
    ]);

    const totalUnidades = (order.items || []).reduce((acc, i) => acc + (Number(i.qtdTotalUnidades) || 0), 0);
    const totalLiquido = (order.items || []).reduce((acc, i) => acc + (Number(i.custoLiquidoTotalComDesconto || i.custoLiquidoTotal) || 0), 0);

    const footerSummary = [
      [],
      ['TOTAIS DO PEDIDO', '', '', '', totalUnidades, '', '', '', '', '', totalLiquido]
    ];

    const wsItems = XLSX.utils.aoa_to_sheet([...headerInfo, itemsHeaders, ...itemsRows, ...footerSummary]);
    XLSX.utils.book_append_sheet(wb, wsItems, 'PEDIDO');

    // 2. ABA 2: GRADE DE SEPARAÇÃO POR LOJA
    const storeNames = activeStores.map(s => s.name);
    const separacaoHeaders = ['Código', 'Descrição', 'Total Comprado', ...storeNames];
    const separacaoRows = (order.items || []).map(item => {
      const storeAllocations = activeStores.map(s => item.separacaoLojas?.[s.id] || 0);
      return [
        item.codigo || '',
        item.descricao || '',
        item.qtdTotalUnidades || 0,
        ...storeAllocations
      ];
    });

    const wsSeparacao = XLSX.utils.aoa_to_sheet([['GRADE DE SEPARAÇÃO (LOJAS)'], [], separacaoHeaders, ...separacaoRows]);
    XLSX.utils.book_append_sheet(wb, wsSeparacao, 'SEPARACAO');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Pedido_${numeroPedido}_${cleanFornecedor}.xlsx`;

    return { buffer, filename };
  }

  generatePdf(order, customStores = []) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const stores = (order.storeConfigs && order.storeConfigs.length > 0) ? order.storeConfigs : (customStores || []);
    const activeStores = stores.filter(s => s.active);

    const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');

    // Mapear Avarias do Pedido
    const avariasList = (order.inspection?.possuiAvarias && order.inspection?.avarias) ? order.inspection.avarias : [];
    const avariasMap = new Map();
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

      return [
        `${item.codigo || ''}\n${item.descricao || ''}`,
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
    let finalY = (doc.lastAutoTable?.finalY || 140) + 6;

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
    doc.text('✓ Pagamento Parte Especial somen via depósitos', 195, noticeY + 23.5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.text('Pedidos seguem conf. cópia da empresa.', 195, noticeY + 29);
    doc.text('Se algo estiver em desacordo, favor informar.', 195, noticeY + 33);

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `Romaneio_${numeroPedido}_${cleanFornecedor}.pdf`;

    return { buffer, filename };
  }
}

module.exports = new ExportService();
