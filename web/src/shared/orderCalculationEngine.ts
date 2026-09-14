import { PurchaseOrder, OrderItem, OrderHeader, FiscalConfig } from './types';
import { normalizeRateToDecimal } from './fiscalEngine';

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

  // Faturamento e Médias
  totalGeral: number;              // Total final faturado (Líquido + IPI + ST + Frete + Despesas)
  precoMedio: number;              // Preço médio líquido por peça (Líquido ÷ Peças)
  precoMedioComImpostos: number;   // Preço médio por peça com encargos de entrada (IPI + ST)
}

/**
 * Verifica se uma linha de item de pedido está totalmente vazia
 */
export function isBlankItem(item?: OrderItem | null): boolean {
  if (!item) return true;
  const hasDesc = Boolean(item.descricao && item.descricao.trim() !== '');
  const hasCod = Boolean((item.codigo || item.codigoInterno || item.codigoFornecedor || item.codigoBarras)?.trim());
  const hasQtd = Boolean(item.qtdTotalUnidades && item.qtdTotalUnidades > 0);
  const hasPacotes = Boolean(item.qtdPacotes && item.qtdPacotes > 0);
  const hasPreco = Boolean(item.precoUnitario && item.precoUnitario > 0);
  return !hasDesc && !hasCod && !hasQtd && !hasPacotes && !hasPreco;
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

  // Frete e Despesas Adicionais
  const valorFrete = Number(header?.valorFrete ?? header?.valorFreteGlobal) || 0;
  const valorOutrasDespesas = Number(header?.valorOutrasDespesasGlobal) || 0;

  // Faturamento e Médias
  const totalGeral = Number((valorLiquido + totalIpi + totalSt + valorFrete + valorOutrasDespesas).toFixed(2));
  const precoMedio = totalPecas > 0
    ? Number((valorLiquido / totalPecas).toFixed(2))
    : 0;
  const precoMedioComImpostos = totalPecas > 0
    ? Number(((valorLiquido + totalIpi + totalSt) / totalPecas).toFixed(2))
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
    totalGeral,
    precoMedio,
    precoMedioComImpostos
  };
}
