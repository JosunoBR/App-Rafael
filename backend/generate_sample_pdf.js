const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTableModule = require('jspdf-autotable');
const autoTable = autoTableModule.default || autoTableModule;
const logoBase64 = require('./src/assets/logoBase64');

function formatCurrency(val) {
  const num = Number(val) || 0;
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateCommercialOrderPdf(order) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const rawNum = order.header?.numeroPedido || '85132909';
  const numeroPedido = String(rawNum).replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'FLASHGOODS').replace(/[^a-zA-Z0-9_-]/g, '_');
  const status = order.header?.status || 'Aprovado';
  const dataEmissao = order.header?.dataEmissao || new Date().toLocaleDateString('pt-BR');
  const dataEntrega = order.header?.dataEntregaPrevista || 'A Combinar';
  const fornecedorNome = (order.header?.fornecedor || 'FLASHGOODS COMÉRCIO DE IMPORTAÇÃO E EXP').toUpperCase();
  const vendedor = order.header?.vendedor || 'SIDALPER REPRESENTAÇÕES LTDA';
  const contatoVendedor = order.header?.contatoVendedor || '(47) 3366-5756 / sidalper@sidalper.com.br';
  const condicaoPagamento = order.header?.condicaoPagamento || '45/60/75/90/105/120 Dias';
  const formaPagamento = order.header?.formaPagamento || 'Boleto Bancário';
  const tipoFrete = order.header?.tipoFrete || 'CIF (Entrega no Depósito Irati)';
  const observacoes = order.header?.observacoes || '';

  // =========================================================================
  // 1. CABEÇALHO SUPERIOR (Logo Oficial + Título + Badge do Pedido)
  // =========================================================================
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 10, 6, 20, 20);
    } catch (err) {
      console.warn('Erro ao inserir logo no PDF:', err);
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

  const bodyRows = (order.items || []).map((item, idx) => {
    const codBarras = item.codigoBarras || item.eanBarcode || '-';
    const refFornec = item.codigoFornecedor || item.referencia || item.codigo || '-';
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

  // Linha de Totais da Tabela
  const footerRow = [
    '',
    `TOTAIS DO PEDIDO (${bodyRows.length} itens)`,
    '',
    '',
    '',
    totalVolumesGeral.toLocaleString('pt-BR') + ' cx',
    totalPecasGeral.toLocaleString('pt-BR') + ' un',
    '',
    formatCurrency(subtotalGeral)
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
        if (data.column.index === 1) {
          data.cell.styles.halign = 'left';
        }
      }
    },
    margin: { left: 10, right: 10 }
  });

  // =========================================================================
  // 5. BLOCO INFERIOR: REGRAS OPERACIONAIS & RESUMO FINANCEIRO / ASSINATURAS
  // =========================================================================
  let finalY = (doc.lastAutoTable?.finalY || 160) + 4;
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
  doc.text(`TOTAL GERAL DO PEDIDO (${(order.items || []).length} ITENS | ${totalVolumesGeral} CX | ${totalPecasGeral} UN):`, rightX + 6, finalY + 7);

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
  const totalPages = doc.internal.getNumberOfPages();
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

  const buffer = Buffer.from(doc.output('arraybuffer'));
  const filename = `Pedido_${numeroPedido}_${cleanFornecedor}.pdf`;

  return { buffer, filename };
}

// Executar com dados de exemplo reais baseados nos modelos
const sampleOrder = {
  header: {
    numeroPedido: '85132909',
    status: 'Aprovado',
    dataEmissao: '06/08/2026',
    dataEntregaPrevista: '20/08/2026',
    fornecedor: 'FLASHGOODS COMERCIO DE IMPORTACAO E EXP',
    vendedor: 'SIDALPER REPRESENTAÇÕES LTDA',
    contatoVendedor: '(47) 3366-5756 / sidalper@sidalper.com.br',
    condicaoPagamento: '45/60/75/90/105/120 Dias',
    formaPagamento: 'Boleto Bancário',
    tipoFrete: 'CIF (Entrega no Depósito Irati)',
    observacoes: 'CLIENTE PAGA PARTE ESPECIAL SOMENTE POR DEPÓSITOS. BOLETOS NÃO DEVEM EXCEDER O VALOR DE R$ 9.999,00.'
  },
  items: [
    { codigoBarras: '7908470605100', codigoFornecedor: 'F5100', descricao: 'GARRAFA 600 ML SPORT PLÁSTICO 7,6 CM X 7,6 CM X 23 CM', qtdNoPacote: 60, qtdPacotes: 12, qtdTotalUnidades: 720, precoUnitario: 6.90, valorTotalLiquido: 4968.00 },
    { codigoBarras: '7908470605295', codigoFornecedor: 'F5108', descricao: 'GARRAFA 650ML PLÁSTICO E AÇO 7 CM X 7 CM X 25 CM', qtdNoPacote: 60, qtdPacotes: 10, qtdTotalUnidades: 600, precoUnitario: 6.90, valorTotalLiquido: 4140.00 },
    { codigoBarras: '7908470605899', codigoFornecedor: 'F5159', descricao: 'GARRAFA 600ML PLÁSTICO PP E PET 7,8CM X 7,3CM X 22 CM', qtdNoPacote: 60, qtdPacotes: 10, qtdTotalUnidades: 600, precoUnitario: 6.90, valorTotalLiquido: 4140.00 },
    { codigoBarras: '7908470606308', codigoFornecedor: 'F5194', descricao: 'GARRAFA 400ML INFANTIL PLÁSTICO PS E PP 6,8CM X 6,8 CM', qtdNoPacote: 60, qtdPacotes: 9, qtdTotalUnidades: 540, precoUnitario: 6.90, valorTotalLiquido: 3726.00 },
    { codigoBarras: '7908470607112', codigoFornecedor: 'F5319', descricao: 'GARRAFA INFANTIL 340ML PLÁSTICO PET E PP 6.5 CM X 18 CM', qtdNoPacote: 60, qtdPacotes: 8, qtdTotalUnidades: 480, precoUnitario: 5.80, valorTotalLiquido: 2784.00 },
    { codigoBarras: '7908470608221', codigoFornecedor: 'F5330', descricao: 'GARRAFA INFANTIL 750 ML PLÁSTICO PP 24 CM X 6.5 CM', qtdNoPacote: 60, qtdPacotes: 6, qtdTotalUnidades: 360, precoUnitario: 5.90, valorTotalLiquido: 2124.00 },
    { codigoBarras: '7908470609334', codigoFornecedor: 'F5336', descricao: 'GARRAFA CAPIVARA 730 ML PLASTICO PP 8,5 CM X 7 CM', qtdNoPacote: 60, qtdPacotes: 9, qtdTotalUnidades: 540, precoUnitario: 5.87, valorTotalLiquido: 3169.80 },
    { codigoBarras: '7908470610445', codigoFornecedor: 'F5341', descricao: 'GARRAFA CAPIVARA 400 ML PLASTICO PC E PP 6,5 CM X 15 CM', qtdNoPacote: 60, qtdPacotes: 12, qtdTotalUnidades: 720, precoUnitario: 6.72, valorTotalLiquido: 4838.40 },
    { codigoBarras: '7908470611556', codigoFornecedor: 'F5392', descricao: 'GARRAFA 700 ML PLASTICO PC 6,9 CM X 6,9 CM X 25 CM', qtdNoPacote: 60, qtdPacotes: 18, qtdTotalUnidades: 1080, precoUnitario: 6.76, valorTotalLiquido: 7300.80 }
  ]
};

const result = generateCommercialOrderPdf(sampleOrder);
const targetPath = path.join(__dirname, '..', 'PDF', 'exemplo_pedido_mega12.pdf');
fs.writeFileSync(targetPath, result.buffer);
console.log('Sample PDF successfully created at:', targetPath, 'Size:', result.buffer.length);
