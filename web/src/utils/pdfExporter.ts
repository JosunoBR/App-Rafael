import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, StoreConfig } from '../shared/types';
import { DEFAULT_STORES } from '../shared/constants';
import { LOGO_MEGA12_BASE64 } from '../assets/logoBase64';

function formatCurrency(val: number | string): string {
  const num = Number(val) || 0;
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formata a condição de pagamento para exibição na proposta comercial,
 * incluindo o período (ex: "de 15 em 15 dias", "de 7 em 7 dias", "de 30 em 30 dias")
 * para que não haja margem de dúvida ou confusão para o fornecedor.
 */
export function formatPaymentConditionDisplay(cond?: string): string {
  if (!cond || !cond.trim()) return 'A Combinar';

  let text = cond.trim();

  // Se já contém a especificação de período explícita, retorna
  if (/de\s+\d+\s+em\s+\d+\s+dias/i.test(text)) {
    return text;
  }

  // Substitui grupos entre parênteses: ex: "(15/30/45 Dias)" -> "(15/30/45 Dias - de 15 em 15 dias)"
  text = text.replace(/\(([\d\/]+)\s*Dias\)/gi, (m: string, slashGroup: string) => {
    const nums = slashGroup.split('/').map((n: string) => parseInt(n, 10)).filter((n: number) => !isNaN(n));
    if (nums.length >= 2) {
      const step = nums[1] - nums[0];
      if (step > 0) return `(${slashGroup} Dias - de ${step} em ${step} dias)`;
    }
    return m;
  });

  // Se não estava entre parênteses: ex: "15/30/45 Dias" -> "15/30/45 Dias (de 15 em 15 dias)"
  if (!/de\s+\d+\s+em\s+\d+\s+dias/i.test(text)) {
    text = text.replace(/(\b\d+(?:\/\d+)+\b)\s*Dias?/gi, (m: string, slashGroup: string) => {
      const nums = slashGroup.split('/').map((n: string) => parseInt(n, 10)).filter((n: number) => !isNaN(n));
      if (nums.length >= 2) {
        const step = nums[1] - nums[0];
        if (step > 0) return `${slashGroup} Dias (de ${step} em ${step} dias)`;
      }
      return m;
    });
  }

  return text;
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
// Formato: A4 Paisagem (Landscape) | Layout Oficial (Imagem 2)
// =========================================================================
export function exportCommercialOrderPDF(rawOrder: PurchaseOrder) {
  const order: PurchaseOrder = {
    ...rawOrder,
    items: (rawOrder.items || []).filter(it => Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoInterno?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0))
  };

  const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Pedido_${numeroPedido}_${cleanFornecedor}.pdf`;

  // Geração Local Direta via jsPDF em Paisagem (Layout Oficial Mega 12)
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
    doc.text('ALS 10 BAZAR E BRINQUEDOS LTDA  •  AUTORIZAÇÃO OFICIAL DE FORNECIMENTO', 33, 18.5);

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

    // Cálculo do Desconto Comercial
    const offValue = Number(order.header?.percentualDescontoOff || 0);
    let totalBrutoMercadorias = 0;
    let totalDescontoItens = 0;
    (order.items || []).forEach(item => {
      const pack = Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1;
      const pacotes = Number(item.qtdPacotes) || 0;
      const pecas = Number(item.qtdTotalUnidades) || (pacotes * pack);
      const precoUnit = Number(item.precoUnitario) || 0;
      const valorBruto = Number(item.valorTotalBruto) || (pecas * precoUnit);
      const valorLiquido = Number(item.valorTotalLiquido) || valorBruto;
      totalBrutoMercadorias += valorBruto;
      if (item.valorDescontoItem !== undefined && Number(item.valorDescontoItem) > 0) {
        totalDescontoItens += Number(item.valorDescontoItem);
      } else if (valorBruto > valorLiquido) {
        totalDescontoItens += (valorBruto - valorLiquido);
      }
    });

    let descontoComercialTexto = 'R$ 0,00';
    if (order.header?.descontoComercialTotal !== undefined && Number(order.header.descontoComercialTotal) > 0) {
      if (order.header.descontoComercialTipo === '%') {
        const valR = (totalBrutoMercadorias * Number(order.header.descontoComercialTotal)) / 100;
        descontoComercialTexto = `${Number(order.header.descontoComercialTotal)}% (${formatCurrency(valR)})`;
      } else {
        descontoComercialTexto = formatCurrency(Number(order.header.descontoComercialTotal));
      }
    } else if (totalDescontoItens > 0) {
      descontoComercialTexto = formatCurrency(totalDescontoItens);
    } else if (offValue > 0 && totalBrutoMercadorias > 0) {
      const valOff = (totalBrutoMercadorias * offValue) / 100;
      descontoComercialTexto = formatCurrency(valOff);
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Razão Social: ALS 10 BAZAR E BRINQUEDOS LTDA', 13, cardY + 7.8);
    doc.text('CNPJ: 37.144.240/0001-70       IE: 90847822-35', 13, cardY + 11.3);
    doc.text('End. Entrega: Av. José Galiciolli, 152 – BR153 – Centro – Irati – PR (CEP: 84500-009)', 13, cardY + 14.8);
    doc.text('E-mail para Boletos e XML: als.conecta@gmail.com', 13, cardY + 18.3);
    doc.text('Compras: (55) 9 9659-6315 (Rafael)  |  Faturamento: (55) 9 99691-0247 (Ketlyn)', 13, cardY + 21.8);
    doc.text('Financeiro: (55) 9 3618-5609 (Bruna)', 13, cardY + 25.3);

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
    doc.setFont('helvetica', 'normal');
    doc.text(`Fornecedor: ${fornecedorNome}`, card2X + 3, cardY + 7.8);
    doc.text(`Vendedor: ${vendedor}  |  Contato: ${contatoVendedor}`, card2X + 3, cardY + 10.9);

    // Porcentagem OFF posicionada entre Vendedor e Desconto Comercial
    doc.text(`% OFF (Desconto Negociado): ${offValue}%`, card2X + 3, cardY + 14.0);

    // Desconto Comercial posicionado abaixo do OFF
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.setFont('helvetica', 'bold');
    doc.text(`Desconto Comercial: ${descontoComercialTexto}`, card2X + 3, cardY + 17.1);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`Condição de Pagto: ${condicaoPagamento}`, card2X + 3, cardY + 20.2);
    doc.text(`Forma de Pagto: ${formaPagamento}`, card2X + 3, cardY + 23.3);
    doc.text(`Tipo de Frete: ${tipoFrete}`, card2X + 3, cardY + 26.4);

    // =========================================================================
    // 4. TABELA DE ITENS (SEM Código Interno e SEM Desconto)
    // =========================================================================
    const headCols = [
      '#',
      'Ref. Fornecedor',
      'Descrição do Produto',
      'Qtd/Cx',
      'Qtd Cx',
      'Total Peças',
      'Preço Unit.',
      'IPI',
      'Valor Total'
    ];

    let totalVolumesGeral = 0;
    let totalPecasGeral = 0;
    let subtotalGeral = 0;
    let totalIpiGeral = 0;
    let somaPrecoUnitario = 0;

    const filteredItems = (order.items || []).filter(it =>
      Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0)
    );

    const bodyRows = filteredItems.map((item, idx) => {
      const refFornec = item.codigoFornecedor || (item as any).referencia || item.codigo || '-';
      const pack = Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1;
      const pacotes = Number(item.qtdPacotes) || 0;
      const pecas = Number(item.qtdTotalUnidades) || (pacotes * pack);
      const precoUnit = Number(item.precoUnitario) || 0;
      const valorTotal = Number(item.valorTotalLiquido) || Number(item.valorTotalBruto) || (pecas * precoUnit);

      // Determinação da alíquota e do valor de IPI do item
      const ipiAliq = item.aliquotaIpi !== undefined && item.aliquotaIpi !== null
        ? Number(item.aliquotaIpi)
        : (item.fiscalOverride?.ipiAliquota !== undefined && item.fiscalOverride?.ipiAliquota !== null
            ? Number(item.fiscalOverride.ipiAliquota)
            : (order.header?.aliquotaIpi !== undefined && order.header?.aliquotaIpi !== null
                ? Number(order.header.aliquotaIpi)
                : (order.fiscalConfig?.ipiAliquota !== undefined && order.fiscalConfig?.ipiAliquota !== null
                    ? Number(order.fiscalConfig.ipiAliquota)
                    : 0)));

      const valorIpi = item.valorIpi !== undefined && item.valorIpi !== null && Number(item.valorIpi) > 0
        ? Number(item.valorIpi)
        : (item.ipiUnitario !== undefined && item.ipiUnitario !== null && Number(item.ipiUnitario) > 0
            ? Number(item.ipiUnitario) * pecas
            : (valorTotal * (ipiAliq / 100)));

      totalVolumesGeral += pacotes;
      totalPecasGeral += pecas;
      subtotalGeral += valorTotal;
      totalIpiGeral += valorIpi;
      somaPrecoUnitario += precoUnit;

      const ipiDisplay = valorIpi > 0
        ? (ipiAliq > 0 ? `${formatCurrency(valorIpi)} (${ipiAliq}%)` : formatCurrency(valorIpi))
        : (ipiAliq > 0 ? `${ipiAliq}%` : 'R$ 0,00');

      return [
        String(idx + 1),
        refFornec,
        item.descricao || 'Produto sem descrição',
        String(pack),
        pacotes.toLocaleString('pt-BR'),
        pecas.toLocaleString('pt-BR') + ' un',
        formatCurrency(precoUnit),
        ipiDisplay,
        formatCurrency(valorTotal)
      ];
    });

    const precoMedioGeral = totalPecasGeral > 0
      ? (subtotalGeral / totalPecasGeral)
      : (bodyRows.length > 0 ? (somaPrecoUnitario / bodyRows.length) : 0);

    // Linha de Totais da Tabela (com colSpan elegante para 9 colunas)
    const footerRow = [
      {
        content: `TOTAIS DO PEDIDO (${bodyRows.length} itens)`,
        colSpan: 4,
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
        content: formatCurrency(precoMedioGeral),
        styles: { halign: 'right', fontStyle: 'bold' }
      },
      {
        content: formatCurrency(totalIpiGeral),
        styles: { halign: 'right', fontStyle: 'bold' }
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
        1: { cellWidth: 28, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
        2: { cellWidth: 110, halign: 'left', fontStyle: 'bold' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
        6: { cellWidth: 23, halign: 'right' },
        7: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] }, // IPI
        8: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        if (data.row.index === bodyRows.length) {
          data.cell.styles.fillColor = [209, 250, 229]; // Emerald-100 (Barra verde de totais)
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
    if (observacoes) {
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'italic');
      doc.text(`Obs: ${observacoes.substring(0, 115)}`, 13, finalY + 27.2);
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

    const totalGeralComIpi = subtotalGeral + totalIpiGeral;
    const labelTotalGeral = totalIpiGeral > 0
      ? `TOTAL DO PEDIDO C/ IPI (${bodyRows.length} ITENS | ${totalVolumesGeral.toLocaleString('pt-BR')} CX):`
      : `TOTAL GERAL DO PEDIDO (${bodyRows.length} ITENS | ${totalVolumesGeral.toLocaleString('pt-BR')} CX | ${totalPecasGeral.toLocaleString('pt-BR')} UN):`;
    doc.text(labelTotalGeral, rightX + 6, finalY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(totalIpiGeral > 0 ? 9.5 : 11);
    const textoValorTotal = totalIpiGeral > 0
      ? `${formatCurrency(totalGeralComIpi)} (Líq: ${formatCurrency(subtotalGeral)} + IPI: ${formatCurrency(totalIpiGeral)})`
      : formatCurrency(subtotalGeral);
    doc.text(textoValorTotal, rightX + 6, finalY + 13);

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

  // Geração Local Direta via jsPDF em Paisagem (20 Lojas)
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

    const status = order.header?.status || 'Aprovado';
    const dataEmissao = order.header?.dataEmissao || new Date().toLocaleDateString('pt-BR');
    const dataEntrega = order.header?.dataEntregaPrevista || 'A Combinar';
    const fornecedorNome = (order.header?.fornecedor || 'FORNECEDOR NÃO INFORMADO').toUpperCase();
    const vendedor = order.header?.vendedor || 'N/A';
    const contatoVendedor = order.header?.contatoVendedor || 'S/ Contato';
    const condicaoPagamento = formatPaymentConditionDisplay(order.header?.condicaoPagamento);
    const formaPagamento = order.header?.formaPagamento || 'Boleto Bancário';
    const tipoFrete = order.header?.tipoFrete || 'CIF (Por conta do Fornecedor)';

    // =========================================================================
    // 1. CABEÇALHO SUPERIOR (Logo Oficial + Título + Badge do Pedido)
    // =========================================================================
    if (LOGO_MEGA12_BASE64) {
      try {
        doc.addImage(LOGO_MEGA12_BASE64, 'PNG', 10, 6, 20, 20);
      } catch (err) {
        console.warn('Erro ao inserir logo no PDF do romaneio local:', err);
      }
    }

    // Título e Identidade da Loja
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('MEGA 12 • ROMANEIO DE SEPARAÇÃO E EXPEDIÇÃO (20 LOJAS)', 33, 12);

    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.setFontSize(8);
    doc.text('ALS 10 BAZAR E BRINQUEDOS LTDA  •  CONFERÊNCIA OFICIAL DE DOCA & EXPEDIÇÃO', 33, 18.5);

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
    // 3. CARD DE DADOS: FORNECEDOR & CONDIÇÕES COMERCIAIS
    // =========================================================================
    const cardY = 35.5;
    const cardH = 20;
    const cardW = 277;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFillColor(241, 245, 249);
    doc.rect(10.2, cardY + 0.2, cardW - 0.4, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('DADOS DO FORNECEDOR & CONDIÇÕES COMERCIAIS:', 13, cardY + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    // Coluna 1 (Esquerda)
    const offValue = Number(order.header?.percentualDescontoOff || 0);
    doc.text(`Fornecedor: ${fornecedorNome}`, 13, cardY + 8.5);
    doc.text(`Vendedor: ${vendedor}  |  Contato: ${contatoVendedor}`, 13, cardY + 12.3);
    doc.text(`% OFF (Desconto Negociado): ${offValue}%`, 13, cardY + 16.1);

    // Coluna 2 (Direita)
    const col2X = 150;
    doc.text(`Condição de Pagto: ${condicaoPagamento}`, col2X, cardY + 8.5);
    doc.text(`Forma de Pagto: ${formaPagamento}`, col2X, cardY + 12.3);
    doc.text(`Tipo de Frete: ${tipoFrete}`, col2X, cardY + 16.1);

    // =========================================================================
    // 4. TABELA DE SEPARAÇÃO (20 LOJAS)
    // =========================================================================
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
      startY: 58,
      margin: { left: 10, right: 10, bottom: 14, top: 12 },
      head: [headCols],
      body: [...bodyRows, footerRow],
      theme: 'grid',
      styles: { 
        fontSize: 5.5, 
        cellPadding: 0.8, 
        halign: 'center', 
        valign: 'middle',
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [15, 23, 42], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold', 
        fontSize: 5.8,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
        1: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'center', cellWidth: 12 },
        2: { fillColor: [254, 243, 199], fontStyle: 'bold', halign: 'center', textColor: [146, 64, 14], cellWidth: 12 },
        3: { fillColor: [236, 253, 245], fontStyle: 'bold', halign: 'center', textColor: [6, 95, 70], cellWidth: 12 }
      },
      didParseCell: (data) => {
        if (data.row.index === bodyRows.length) {
          data.cell.styles.fillColor = [209, 250, 229];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [6, 78, 59];
        }
      }
    });

    // =========================================================================
    // 5. CONFERÊNCIA DE RECEBIMENTO & EXPEDIÇÃO DE DOCA
    // =========================================================================
    const pageHeight = doc.internal.pageSize.height || 210;
    let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : 140;

    const confBoxHeight = 22;
    if (finalY + confBoxHeight > pageHeight - 12) {
      doc.addPage();
      finalY = 14;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, finalY, 277, confBoxHeight, 1.5, 1.5, 'FD');

    // Cabeçalho da conferência
    doc.setFillColor(241, 245, 249);
    doc.rect(10.2, finalY + 0.2, 276.6, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('CONFERÊNCIA DE RECEBIMENTO & EXPEDIÇÃO DE DOCA (ALS 10 / MEGA 12):', 13, finalY + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Conferente Responsável: ${order.inspection?.conferente || '____________________________________'}`, 13, finalY + 9.5);
    doc.text(`Apontamento de Avarias: ${order.inspection?.possuiAvarias ? `SIM (${avariasList.length} ocorrências • ${totalAvariasGeral} peças descontadas)` : '[  ] NÃO HOUVE AVARIAS    [  ] COM AVARIAS APONTADAS'}`, 130, finalY + 9.5);

    // Linhas de Assinatura
    const sigY = finalY + 16.5;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(13, sigY, 90, sigY);
    doc.line(103, sigY, 180, sigY);
    doc.line(193, sigY, 274, sigY);

    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURA CONFERENTE / DOCA', 15, sigY + 3.5);
    doc.text('ASSINATURA MOTORISTA / TRANSPORTADORA', 105, sigY + 3.5);
    doc.text('SUPERVISÃO / RECEBIMENTO MEGA 12', 195, sigY + 3.5);

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
      doc.text('Rede Mega 12 • Sistema de Gestão de Compras & Distribuição (ALS 10 Bazar e Brinquedos Ltda)', 10, 206.5);
      doc.text(`Romaneio: ${numeroPedido}  |  Página ${i} de ${totalPages}`, 240, 206.5);
    }

    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF local do romaneio:', err);
    throw err;
  }
}
