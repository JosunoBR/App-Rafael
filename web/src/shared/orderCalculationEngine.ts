import { PurchaseOrder, OrderItem, OrderHeader, FiscalConfig } from './types';
import { normalizeRateToDecimal, calculateItemFiscal } from './fiscalEngine';

export interface OrderTotalsResult {
  // Quantidades
  validItemsCount: number;
  rupturasCount: number;
  totalVolumes: number;            // Total de caixas / embalagens / fardos
  totalPecas: number;              // Total de unidades / peças (descontando rupturas)

  // Mercadorias & Descontos
  valorBruto: number;              // Soma de qtdTotalUnidades × precoUnitario
  valorDescontoItens: number;      // Soma dos descontos aplicados nos itens
  valorDescontoTotal: number;      // Total consolidado de descontos comerciais
  descontoPercentualMedio: number;  // % médio de desconto comercial
  valorLiquido: number;            // Total líquido das mercadorias (Bruto - Desconto)

  // Impostos & Encargos Adicionais
  totalIpi: number;                // Valor total de IPI
  totalSt: number;                 // Valor total de Substituição Tributária (ST)
  valorFrete: number;              // Frete destacado do pedido
  valorOutrasDespesas: number;     // Despesas acessórias adicionais

  // Ajuste Fiscal da NF (Conciliação da Nota Fiscal no Total)
  totalComercialSemAjuste: number; // Total antes do ajuste fiscal: Bruto + IPI - Desconto
  ajusteFiscalValor: number;       // Diferença aplicada direto no valor final (+ acréscimo ou - desconto)
  valorNotaFiscalEntregue?: number; // Valor da NF informada

  // Faturamento e Médias
  totalGeral: number;              // Total final faturado (totalComercialSemAjuste + ajusteFiscalValor)
  precoMedio: number;              // Preço médio líquido por peça (Líquido ÷ Peças)
  precoMedioComImpostos: number;   // Preço médio por peça com encargos de entrada (IPI + ST)

  // Margem Geral Ponderada
  margemMediaPercentual: number;   // % de margem líquida média ponderada do pedido
  margemMediaValor: number;        // R$ de margem média líquida por peça
}

/**
 * Verifica se uma linha de item de pedido está totalmente vazia
 */
export function isBlankItem(item?: OrderItem | null): boolean {
  if (!item) return true;
  const hasDesc = Boolean(item.descricao && item.descricao.trim() !== '');
  const hasCod = Boolean((item.codigo || item.codigoInterno || item.codigoFornecedor || item.codigoBarras)?.trim());
  const hasFoto = Boolean(item.fotoUrl && item.fotoUrl.trim() !== '');
  const hasQtd = Boolean(item.qtdTotalUnidades && item.qtdTotalUnidades > 0);
  const hasPacotes = Boolean(item.qtdPacotes && item.qtdPacotes > 0);
  const hasPreco = Boolean(item.precoUnitario && item.precoUnitario > 0);
  return !hasDesc && !hasCod && !hasFoto && !hasQtd && !hasPacotes && !hasPreco;
}

/**
 * Calcula de forma unificada e precisa todas as métricas financeiras de um pedido.
 * Esta é a FONTE ÚNICA DA VERDADE (Single Source of Truth) para telas, relatórios, PDFs e exportações.
 */
export function calculateOrderTotals(
  orderOrItems: PurchaseOrder | OrderItem[],
  optionalHeader?: Partial<OrderHeader>,
  optionalFiscal?: FiscalConfig
): OrderTotalsResult {
  let items: OrderItem[] = [];
  let header: Partial<OrderHeader> | undefined = optionalHeader;
  let fiscal: FiscalConfig | undefined = optionalFiscal;

  if (Array.isArray(orderOrItems)) {
    items = orderOrItems;
  } else if (orderOrItems && typeof orderOrItems === 'object') {
    items = orderOrItems.items || [];
    header = orderOrItems.header || optionalHeader;
    fiscal = orderOrItems.fiscalConfig || optionalFiscal;
  }

  const offGlobal = Math.max(0, Math.min(100, Number(header?.percentualDescontoOff) || 0));
  const defaultGlobalIpiPct = normalizeRateToDecimal(fiscal?.ipiAliquota) * 100;
  const defaultGlobalStPct = normalizeRateToDecimal(fiscal?.aliquotaSt) * 100;
  const headerIpiPct = header?.aliquotaIpi !== undefined && header.aliquotaIpi !== null && Number(header.aliquotaIpi) > 0
    ? Number(header.aliquotaIpi)
    : defaultGlobalIpiPct;
  const headerStPct = header?.aliquotaSt !== undefined && header.aliquotaSt !== null && Number(header.aliquotaSt) > 0
    ? Number(header.aliquotaSt)
    : defaultGlobalStPct;

  let validItemsCount = 0;
  let rupturasCount = 0;
  let totalVolumes = 0;
  let totalPecas = 0;
  let valorBruto = 0;
  let somaDescontoItens = 0;
  let totalIpi = 0;
  let totalSt = 0;
  let somaPdvTotal = 0;
  let somaMargemRealTotal = 0;
  let pecasComPdv = 0;

  items.forEach(it => {
    if (isBlankItem(it)) return;
    validItemsCount++;

    if (it.ruptura) {
      rupturasCount++;
      return;
    }

    const pack = Number(it.qtdNoPacote) || Number(it.qtdPorPacote) || 1;
    const pacotes = Number(it.qtdPacotes) || 0;
    const pecas = Number(it.qtdTotalUnidades) || (pacotes * pack) || 0;
    const precoUnit = Number(it.precoUnitario) || 0;
    const bruto = Number(it.valorTotalBruto) || (pecas * precoUnit);

    // Determinação do Desconto Comercial do Item
    const hasItemDesc = it.percentualDesconto !== undefined && it.percentualDesconto !== null && it.percentualDesconto > 0;
    const descPct = hasItemDesc
      ? Math.max(0, Math.min(100, Number(it.percentualDesconto)))
      : offGlobal;

    const valorDesc = (it.valorDescontoItem !== undefined && it.valorDescontoItem !== null && it.valorDescontoItem > 0)
      ? Number(it.valorDescontoItem)
      : (descPct > 0 ? Number((bruto * (descPct / 100)).toFixed(2)) : 0);

    const liquidoItem = (it.valorTotalLiquido !== undefined && it.valorTotalLiquido !== null && hasItemDesc)
      ? Number(it.valorTotalLiquido)
      : Math.max(0, Number((bruto - valorDesc).toFixed(2)));

    // Determinação da alíquota e do valor de IPI do item
    const ipiAliq = (it.aliquotaIpi !== undefined && it.aliquotaIpi !== null && it.aliquotaIpi > 0)
      ? Number(it.aliquotaIpi)
      : (it.fiscalOverride?.useCustomFiscal && it.fiscalOverride?.ipiAliquota !== undefined
          ? Number(it.fiscalOverride.ipiAliquota)
          : headerIpiPct);

    const ipiVal = (it.valorIpi !== undefined && it.valorIpi !== null && Number(it.valorIpi) > 0)
      ? Number(it.valorIpi)
      : (it.ipiUnitario !== undefined && it.ipiUnitario !== null && Number(it.ipiUnitario) > 0
          ? Number((Number(it.ipiUnitario) * pecas).toFixed(2))
          : (ipiAliq > 0 ? Number((liquidoItem * (ipiAliq / 100)).toFixed(2)) : 0));

    // Determinação de ST do item
    const stAliq = (it.fiscalOverride?.useCustomFiscal && it.fiscalOverride?.aliquotaSt !== undefined)
      ? Number(it.fiscalOverride.aliquotaSt)
      : headerStPct;

    const stVal = (it.stUnitario !== undefined && it.stUnitario !== null && Number(it.stUnitario) > 0)
      ? Number((Number(it.stUnitario) * pecas).toFixed(2))
      : (stAliq > 0 ? Number((liquidoItem * (stAliq / 100)).toFixed(2)) : 0);

    // Apuração de Margem Ponderada do Item
    const pdv = Number(it.pdvAlvo) || 0;
    if (pdv > 0 && pecas > 0) {
      const precoCompraEfetivo = precoUnit * (1 - descPct / 100);
      const fiscalRes = calculateItemFiscal(precoCompraEfetivo, pdv, fiscal, it.fiscalOverride);
      somaPdvTotal += pdv * pecas;
      somaMargemRealTotal += fiscalRes.margemRealUnit * pecas;
      pecasComPdv += pecas;
    }

    totalVolumes += pacotes;
    totalPecas += pecas;
    valorBruto += bruto;
    somaDescontoItens += valorDesc;
    totalIpi += ipiVal;
    totalSt += stVal;
  });

  valorBruto = Number(valorBruto.toFixed(2));
  totalIpi = Number(totalIpi.toFixed(2));
  totalSt = Number(totalSt.toFixed(2));

  // Consolidação de Descontos Globais do Pedido (se informado em R$ ou % no Header)
  let valorDescontoTotal = somaDescontoItens;
  const headerDescTotal = Number(header?.descontoComercialTotal) || 0;
  if (somaDescontoItens === 0 && headerDescTotal > 0) {
    valorDescontoTotal = headerDescTotal;
  }
  valorDescontoTotal = Number(Math.min(valorBruto, Math.max(0, valorDescontoTotal)).toFixed(2));

  const valorLiquido = Number(Math.max(0, valorBruto - valorDescontoTotal).toFixed(2));
  const descontoPercentualMedio = valorBruto > 0
    ? Number(((valorDescontoTotal / valorBruto) * 100).toFixed(2))
    : 0;

  // Frete e Despesas Adicionais (informativos/rastreabilidade)
  const rawValorFrete = Number(header?.valorFrete ?? header?.valorFreteGlobal) || 0;
  const isCif = String(header?.tipoFrete || (rawValorFrete > 0 ? 'FOB' : 'CIF')).toUpperCase().includes('CIF') && rawValorFrete <= 0;
  const valorFrete = isCif ? 0 : rawValorFrete;
  const valorOutrasDespesas = Number(header?.valorOutrasDespesasGlobal) || 0;

  // Regra Oficial Central: Total (Bruto) + IPI - Desconto Comercial = Total Comercial Base
  // Frete não é considerado no Total Comercial das mercadorias.
  const totalComercialSemAjuste = Number((valorBruto + totalIpi - valorDescontoTotal).toFixed(2));

  // 🛡️ Ajuste Fiscal da Entrega (Conciliação da Nota Fiscal no Total):
  // O acréscimo ou desconto é lançado DIRETAMENTE no valor final do pedido, sem alterar os produtos.
  let ajusteFiscalValor = 0;
  let finalTotalGeral = totalComercialSemAjuste;

  const rawNf = Number(header?.valorNotaFiscalEntregue);
  const rawDiff = header?.ajusteFiscalDiferenca !== undefined && header?.ajusteFiscalDiferenca !== null
    ? Number(header.ajusteFiscalDiferenca)
    : undefined;

  if (rawNf > 0) {
    finalTotalGeral = Number(rawNf.toFixed(2));
    ajusteFiscalValor = Number((finalTotalGeral - totalComercialSemAjuste).toFixed(2));
  } else if (rawDiff !== undefined && Math.abs(rawDiff) > 0.005) {
    ajusteFiscalValor = Number(rawDiff.toFixed(2));
    finalTotalGeral = Number((totalComercialSemAjuste + ajusteFiscalValor).toFixed(2));
  }

  const totalGeral = finalTotalGeral;
  const precoMedio = totalPecas > 0
    ? Number((valorLiquido / totalPecas).toFixed(2))
    : 0;
  const precoMedioComImpostos = totalPecas > 0
    ? Number(((valorLiquido + totalIpi + totalSt) / totalPecas).toFixed(2))
    : 0;

  const margemMediaPercentual = somaPdvTotal > 0
    ? Number(((somaMargemRealTotal / somaPdvTotal) * 100).toFixed(1))
    : 0;
  const margemMediaValor = pecasComPdv > 0
    ? Number((somaMargemRealTotal / pecasComPdv).toFixed(2))
    : 0;

  return {
    validItemsCount,
    rupturasCount,
    totalVolumes,
    totalPecas,
    valorBruto,
    valorDescontoItens: Number(somaDescontoItens.toFixed(2)),
    valorDescontoTotal,
    descontoPercentualMedio,
    valorLiquido,
    totalIpi,
    totalSt,
    valorFrete: Number(valorFrete.toFixed(2)),
    valorOutrasDespesas: Number(valorOutrasDespesas.toFixed(2)),
    totalComercialSemAjuste,
    ajusteFiscalValor,
    valorNotaFiscalEntregue: rawNf > 0 ? rawNf : undefined,
    totalGeral,
    precoMedio,
    precoMedioComImpostos,
    margemMediaPercentual,
    margemMediaValor
  };
}

/**
 * Calcula a alíquota e o valor exato de IPI de um item individual do pedido,
 * respeitando estritamente a cascata unificada: item -> fiscalOverride -> header -> fiscalConfig.
 */
export function calculateItemIpi(
  it: OrderItem,
  header?: Partial<OrderHeader>,
  fiscal?: FiscalConfig
): { ipiAliq: number; valorIpi: number } {
  const pack = Number(it.qtdNoPacote) || Number(it.qtdPorPacote) || 1;
  const pacotes = Number(it.qtdPacotes) || 0;
  const pecas = Number(it.qtdTotalUnidades) || (pacotes * pack);
  const preco = Number(it.precoUnitario) || 0;
  const bruto = Number(it.valorTotalBruto) || (pecas * preco);

  const descPct = Math.max(0, Math.min(100, Number(it.percentualDesconto) || 0));
  const hasItemDesc = descPct > 0 || Boolean(it.valorDescontoItem && Number(it.valorDescontoItem) > 0);
  const valorDesc = (it.valorDescontoItem !== undefined && it.valorDescontoItem !== null && Number(it.valorDescontoItem) > 0)
    ? Number(it.valorDescontoItem)
    : (descPct > 0 ? Number((bruto * (descPct / 100)).toFixed(2)) : 0);

  const liquidoItem = (it.valorTotalLiquido !== undefined && it.valorTotalLiquido !== null && hasItemDesc)
    ? Number(it.valorTotalLiquido)
    : Math.max(0, Number((bruto - valorDesc).toFixed(2)));

  const defaultGlobalIpiPct = normalizeRateToDecimal(fiscal?.ipiAliquota) * 100;
  const headerIpiPct = header?.aliquotaIpi !== undefined && header.aliquotaIpi !== null && Number(header.aliquotaIpi) > 0
    ? Number(header.aliquotaIpi)
    : defaultGlobalIpiPct;

  const ipiAliq = (it.aliquotaIpi !== undefined && it.aliquotaIpi !== null && Number(it.aliquotaIpi) > 0)
    ? Number(it.aliquotaIpi)
    : (it.fiscalOverride?.useCustomFiscal && it.fiscalOverride?.ipiAliquota !== undefined
        ? Number(it.fiscalOverride.ipiAliquota)
        : headerIpiPct);

  const valorIpi = (it.valorIpi !== undefined && it.valorIpi !== null && Number(it.valorIpi) > 0)
    ? Number(it.valorIpi)
    : (it.ipiUnitario !== undefined && it.ipiUnitario !== null && Number(it.ipiUnitario) > 0
        ? Number((Number(it.ipiUnitario) * pecas).toFixed(2))
        : (ipiAliq > 0 ? Number((liquidoItem * (ipiAliq / 100)).toFixed(2)) : 0));

  return { ipiAliq, valorIpi };
}

export interface FiscalAdjustmentResult {
  updatedItems: OrderItem[];
  diferencaTotal: number;
  percentualVariacao: number;
  totalAnterior: number;
  novoTotal: number;
  diferencaResidualNf?: number;
}

/**
 * 🛡️ Aplica a conciliação do Ajuste Fiscal da NF DIRETAMENTE no valor final do pedido.
 * REGRA MANDATÓRIA: Os produtos NÃO sofrem acréscimo nem desconto em seus preços unitários.
 * A diferença é lançada estritamente no total final do pedido (recalculando as parcelas/boletos).
 */
export function distributeFiscalAdjustmentToItems(
  items: OrderItem[],
  targetNfValue: number,
  header?: Partial<OrderHeader>,
  fiscal?: FiscalConfig
): FiscalAdjustmentResult {
  // Limpa qualquer alteração prévia de preços de itens caso venham de versões anteriores
  const pristineItems: OrderItem[] = items.map(it => {
    if (it.precoUnitarioOriginal !== undefined || it.valorTotalBrutoOriginal !== undefined) {
      const origPrice = it.precoUnitarioOriginal !== undefined ? it.precoUnitarioOriginal : it.precoUnitario;
      const clone = { ...it, precoUnitario: origPrice };
      delete clone.precoUnitarioOriginal;
      delete clone.valorTotalBrutoOriginal;
      return clone;
    }
    return { ...it };
  });

  const baseHeader = { ...header, valorNotaFiscalEntregue: undefined, ajusteFiscalDiferenca: undefined };
  const currentTotals = calculateOrderTotals(pristineItems, baseHeader, fiscal);
  const totalBase = currentTotals.totalComercialSemAjuste;
  const targetVal = Number(Math.max(0, targetNfValue).toFixed(2));

  if (totalBase <= 0 || targetVal <= 0) {
    return {
      updatedItems: pristineItems,
      diferencaTotal: 0,
      percentualVariacao: 0,
      totalAnterior: totalBase,
      novoTotal: totalBase,
      diferencaResidualNf: 0
    };
  }

  const diferencaTotal = Number((targetVal - totalBase).toFixed(2));
  const percentualVariacao = totalBase > 0 ? Number(((diferencaTotal / totalBase) * 100).toFixed(2)) : 0;

  return {
    updatedItems: pristineItems, // Produtos permanecem 100% inalterados!
    diferencaTotal,
    percentualVariacao,
    totalAnterior: totalBase,
    novoTotal: targetVal,
    diferencaResidualNf: 0
  };
}

/**
 * Restaura os preços unitários e valores originais dos itens antes de qualquer Ajuste Fiscal
 */
export function restoreOriginalItemPrices(
  items: OrderItem[],
  header?: Partial<OrderHeader>,
  fiscal?: FiscalConfig
): FiscalAdjustmentResult {
  const currentTotals = calculateOrderTotals(items, header, fiscal);
  const totalAnterior = currentTotals.totalGeral;

  const restoredItems: OrderItem[] = items.map(it => {
    if (it.precoUnitarioOriginal === undefined && it.valorTotalBrutoOriginal === undefined) {
      return { ...it };
    }

    const pack = Number(it.qtdNoPacote) || Number(it.qtdPorPacote) || 1;
    const pacotes = Number(it.qtdPacotes) || 0;
    const pecas = Number(it.qtdTotalUnidades) || (pacotes * pack);

    const origPrice = it.precoUnitarioOriginal !== undefined ? it.precoUnitarioOriginal : it.precoUnitario;
    const origBruto = it.valorTotalBrutoOriginal !== undefined 
      ? it.valorTotalBrutoOriginal 
      : Number((pecas * origPrice).toFixed(2));

    const descPct = Math.max(0, Math.min(100, Number(it.percentualDesconto) || 0));
    const origDesc = descPct > 0 ? Number((origBruto * (descPct / 100)).toFixed(2)) : (it.valorDescontoItem || 0);
    const origLiquido = Math.max(0, Number((origBruto - origDesc).toFixed(2)));

    const clone = { ...it };
    clone.precoUnitario = origPrice;
    clone.valorTotalBruto = origBruto;
    clone.valorDescontoItem = origDesc;
    clone.valorTotalLiquido = origLiquido;
    delete clone.precoUnitarioOriginal;
    delete clone.valorTotalBrutoOriginal;

    return clone;
  });

  const finalTotals = calculateOrderTotals(restoredItems, header, fiscal);
  const diferencaTotal = Number((finalTotals.totalGeral - totalAnterior).toFixed(2));
  const percentualVariacao = totalAnterior > 0 ? Number(((diferencaTotal / totalAnterior) * 100).toFixed(2)) : 0;

  return {
    updatedItems: restoredItems,
    diferencaTotal,
    percentualVariacao,
    totalAnterior,
    novoTotal: finalTotals.totalGeral
  };
}
