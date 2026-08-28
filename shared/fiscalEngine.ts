import { FiscalConfig, OrderItem, OrderItemFiscalOverride } from './types';
import { DEFAULT_FISCAL_CONFIG } from './constants';

export interface FiscalCalculationResult {
  percentualDespesasPdv: number; // e.g. 0.40 (40%)
  percentualCreditoEntrada: number; // e.g. 0.195 (19.5%)
  despesasPdvUnit: number;
  creditoIcmsUnit: number;
  custoRealEfetivo: number;
  margemRealUnit: number;
  margemPercentual: number;
  isLucrativo: boolean;
  statusMargem: 'excelente' | 'boa' | 'apertada' | 'prejuizo';
}

/**
 * Calcula o custo real efetivo e a margem de um item baseado no preço de compra e no PDV pretendido.
 */
export function calculateItemFiscal(
  precoCompra: number,
  pdvAlvo: number,
  globalConfig: FiscalConfig = DEFAULT_FISCAL_CONFIG,
  override?: OrderItemFiscalOverride
): FiscalCalculationResult {
  const icms = override?.useCustomFiscal && override.icmsAliquota !== undefined 
    ? override.icmsAliquota 
    : globalConfig.icmsAliquota;

  const ipi = override?.useCustomFiscal && override.ipiAliquota !== undefined 
    ? override.ipiAliquota 
    : globalConfig.ipiAliquota;

  const pisCofins = override?.useCustomFiscal && override.pisCofinsAliquota !== undefined 
    ? override.pisCofinsAliquota 
    : globalConfig.pisCofinsAliquota;

  const custosFixos = override?.useCustomFiscal && override.custosFixos !== undefined 
    ? override.custosFixos 
    : globalConfig.custosFixos;

  const creditoEntrada = override?.useCustomFiscal && override.creditoEntradaICMS !== undefined 
    ? override.creditoEntradaICMS 
    : globalConfig.creditoEntradaICMS;

  const percentualDespesasPdv = icms + ipi + pisCofins + custosFixos;
  const percentualCreditoEntrada = creditoEntrada;

  const despesasPdvUnit = Number((pdvAlvo * percentualDespesasPdv).toFixed(4));
  const creditoIcmsUnit = Number((precoCompra * percentualCreditoEntrada).toFixed(4));
  const custoRealEfetivo = Number((precoCompra + despesasPdvUnit - creditoIcmsUnit).toFixed(4));
  const margemRealUnit = Number((pdvAlvo - custoRealEfetivo).toFixed(4));
  const margemPercentual = pdvAlvo > 0 ? Number(((margemRealUnit / pdvAlvo) * 100).toFixed(2)) : 0;

  let statusMargem: 'excelente' | 'boa' | 'apertada' | 'prejuizo' = 'boa';
  if (margemPercentual >= 25) {
    statusMargem = 'excelente';
  } else if (margemPercentual >= 15) {
    statusMargem = 'boa';
  } else if (margemPercentual > 0) {
    statusMargem = 'apertada';
  } else {
    statusMargem = 'prejuizo';
  }

  return {
    percentualDespesasPdv,
    percentualCreditoEntrada,
    despesasPdvUnit,
    creditoIcmsUnit,
    custoRealEfetivo,
    margemRealUnit,
    margemPercentual,
    isLucrativo: margemRealUnit > 0,
    statusMargem
  };
}

/**
 * Calcula o Preço Máximo de Compra para atingir uma margem percentual alvo desejada no PDV.
 */
export function calculateMaxPurchasePrice(
  pdvAlvo: number,
  margemAlvoPercentual: number = 20, // 20% de margem desejada
  globalConfig: FiscalConfig = DEFAULT_FISCAL_CONFIG,
  override?: OrderItemFiscalOverride
): number {
  const icms = override?.useCustomFiscal && override.icmsAliquota !== undefined 
    ? override.icmsAliquota 
    : globalConfig.icmsAliquota;
  const ipi = override?.useCustomFiscal && override.ipiAliquota !== undefined 
    ? override.ipiAliquota 
    : globalConfig.ipiAliquota;
  const pisCofins = override?.useCustomFiscal && override.pisCofinsAliquota !== undefined 
    ? override.pisCofinsAliquota 
    : globalConfig.pisCofinsAliquota;
  const custosFixos = override?.useCustomFiscal && override.custosFixos !== undefined 
    ? override.custosFixos 
    : globalConfig.custosFixos;
  const creditoEntrada = override?.useCustomFiscal && override.creditoEntradaICMS !== undefined 
    ? override.creditoEntradaICMS 
    : globalConfig.creditoEntradaICMS;

  const totalDespesas = icms + ipi + pisCofins + custosFixos;
  const margemDecimal = margemAlvoPercentual / 100;

  // Custo Real = Compra * (1 - creditoEntrada) + PDV * totalDespesas
  // Margem = PDV - Custo Real
  // PDV * (1 - margemDecimal - totalDespesas) = Compra * (1 - creditoEntrada)
  // Compra = [PDV * (1 - margemDecimal - totalDespesas)] / (1 - creditoEntrada)
  const divisor = (1 - creditoEntrada);
  if (divisor <= 0) return 0;

  const maxCompra = (pdvAlvo * (1 - margemDecimal - totalDespesas)) / divisor;
  return Math.max(0, Number(maxCompra.toFixed(2)));
}
