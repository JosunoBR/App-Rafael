import { OrderItem, FiscalConfig, StoreConfig } from '../shared/types';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';
import { isBlankItem } from '../shared/orderCalculationEngine';

/**
 * Verifica se um item de pedido está totalmente em branco (re-exporta fonte única do motor de cálculo)
 */
export const isOrderItemBlank = isBlankItem;
export { isBlankItem };

/**
 * Cria um novo item de pedido limpo e em branco
 */
export function createBlankOrderItem(fiscalConfig?: FiscalConfig, storeConfigs?: StoreConfig[]): OrderItem {
  const item: OrderItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    codigo: '',
    codigoInterno: '',
    codigoFornecedor: '',
    descricao: '',
    qtdTotalUnidades: 0,
    precoUnitario: 0,
    valorTotalBruto: 0,
    percentualDesconto: 0,
    valorDescontoItem: 0,
    valorTotalLiquido: 0,
    pdvAlvo: 12.0
  };

  if (fiscalConfig) {
    const fiscalRes = calculateItemFiscal(item.precoUnitario, item.pdvAlvo, fiscalConfig);
    item.despesasPdvUnit = fiscalRes.despesasPdvUnit;
    item.creditoIcmsUnit = fiscalRes.creditoIcmsUnit;
    item.custoRealEfetivo = fiscalRes.custoRealEfetivo;
    item.margemRealUnit = fiscalRes.margemRealUnit;
    item.margemPercentual = fiscalRes.margemPercentual;
  }

  if (storeConfigs) {
    const sepRes = calculateAutomaticSeparation(item.qtdTotalUnidades, storeConfigs);
    item.separacaoLojas = sepRes.allocations;
    item.qtdReservaEstoque = sepRes.reserveStock;
  }

  return item;
}

/**
 * Garante que a lista de itens termine sempre com exatamente 1 linha em branco no final
 */
export function ensureTrailingBlankItem(
  items: OrderItem[], 
  fiscalConfig?: FiscalConfig, 
  storeConfigs?: StoreConfig[]
): OrderItem[] {
  if (!items || items.length === 0) {
    return [createBlankOrderItem(fiscalConfig, storeConfigs)];
  }

  const lastItem = items[items.length - 1];
  if (!isOrderItemBlank(lastItem)) {
    return [...items, createBlankOrderItem(fiscalConfig, storeConfigs)];
  }

  // Remove itens em branco intermediários duplicados se houver
  let cleaned = [...items];
  while (cleaned.length > 1 && isOrderItemBlank(cleaned[cleaned.length - 1]) && isOrderItemBlank(cleaned[cleaned.length - 2])) {
    cleaned.pop();
  }

  return cleaned;
}

/**
 * Gera automaticamente o próximo código sequencial de produto interno (ex: PRD-051)
 */
export function generateNextProductCode(
  products: { codigoInterno?: string; codigo?: string }[] = [], 
  items: OrderItem[] = []
): string {
  const allCodes = [
    ...products.map(p => p.codigoInterno || p.codigo || ''),
    ...items.map(i => i.codigoInterno || i.codigo || '')
  ];

  let maxNum = 0;
  allCodes.forEach(code => {
    const match = code.match(/(?:PRD|PRE|PROD)-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  const nextNum = maxNum > 0 ? maxNum + 1 : (products.length + 1);
  return `PRD-${String(nextNum).padStart(3, '0')}`;
}
