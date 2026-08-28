import { StoreConfig } from './types';
import { DEFAULT_STORES, DEFAULT_RESERVE_STOCK_PERCENT } from './constants';

export interface SeparationResult {
  allocations: Record<string, number>; // Em unidades
  allocationsBoxes?: Record<string, number>; // Em caixas / volumes
  totalAllocated: number; // Em unidades
  totalAllocatedBoxes?: number; // Em caixas
  reserveStock: number; // Quantidade guardada no Estoque Central / CD / Matriz (em unidades)
  reserveStockBoxes?: number; // Guardada em caixas
  targetTotal: number; // Em unidades
  targetTotalBoxes?: number; // Em caixas
  isBalanced: boolean;  // Se não ultrapassou o total
  isOverAllocated: boolean; // Se ultrapassou o total comprado
  difference: number;   // Saldo guardado em estoque (unidades)
  differenceBoxes?: number;
  clusterTotals: {
    A: number;
    B: number;
    C: number;
  };
  clusterTotalsBoxes?: {
    A: number;
    B: number;
    C: number;
  };
}

/**
 * Rateio por Caixas / Volumes Fechados (Padrão Operacional de Galpão)
 */
export function calculateBoxesSeparation(
  totalBoxes: number,
  packSize: number = 1,
  stores: StoreConfig[] = DEFAULT_STORES,
  reserveBoxes?: number
): SeparationResult {
  const safePackSize = Math.max(1, packSize || 1);
  const defaultReserve = Math.round(totalBoxes * DEFAULT_RESERVE_STOCK_PERCENT);
  const actualReserve = reserveBoxes !== undefined ? reserveBoxes : defaultReserve;
  const safeReserveBoxes = Math.max(0, Math.min(totalBoxes, Math.floor(actualReserve || 0)));
  const boxesToDistribute = Math.max(0, totalBoxes - safeReserveBoxes);

  const activeStores = stores.filter(s => s.active);
  const totalWeight = activeStores.reduce((acc, s) => acc + s.defaultWeight, 0);

  const allocationsBoxes: Record<string, number> = {};
  const allocationsUnits: Record<string, number> = {};
  stores.forEach(s => { 
    allocationsBoxes[s.id] = 0; 
    allocationsUnits[s.id] = 0; 
  });

  if (boxesToDistribute <= 0 || totalWeight <= 0 || activeStores.length === 0) {
    return {
      allocations: allocationsUnits,
      allocationsBoxes,
      totalAllocated: 0,
      totalAllocatedBoxes: 0,
      reserveStock: totalBoxes * safePackSize,
      reserveStockBoxes: totalBoxes,
      targetTotal: totalBoxes * safePackSize,
      targetTotalBoxes: totalBoxes,
      isBalanced: true,
      isOverAllocated: false,
      difference: totalBoxes * safePackSize,
      differenceBoxes: totalBoxes,
      clusterTotals: { A: 0, B: 0, C: 0 },
      clusterTotalsBoxes: { A: 0, B: 0, C: 0 }
    };
  }

  const remainders: { storeId: string; cluster: string; weight: number; remainder: number; originalIndex: number }[] = [];
  let sumIntegers = 0;

  activeStores.forEach((store, index) => {
    const exactQuota = (store.defaultWeight / totalWeight) * boxesToDistribute;
    const integerPart = Math.floor(exactQuota);
    const remainder = exactQuota - integerPart;

    allocationsBoxes[store.id] = integerPart;
    sumIntegers += integerPart;

    remainders.push({
      storeId: store.id,
      cluster: store.cluster,
      weight: store.defaultWeight,
      remainder,
      originalIndex: index
    });
  });

  let leftover = boxesToDistribute - sumIntegers;

  const clusterOrder: Record<string, number> = { A: 3, B: 2, C: 1 };
  remainders.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 0.000001) {
      return b.remainder - a.remainder;
    }
    const clusterDiff = (clusterOrder[b.cluster] || 0) - (clusterOrder[a.cluster] || 0);
    if (clusterDiff !== 0) return clusterDiff;
    return b.weight - a.weight;
  });

  let rIdx = 0;
  while (leftover > 0 && remainders.length > 0) {
    const item = remainders[rIdx % remainders.length];
    allocationsBoxes[item.storeId] += 1;
    leftover -= 1;
    rIdx++;
  }

  const clusterTotals = { A: 0, B: 0, C: 0 };
  const clusterTotalsBoxes = { A: 0, B: 0, C: 0 };

  stores.forEach(s => {
    const cx = allocationsBoxes[s.id] || 0;
    const un = cx * safePackSize;
    allocationsUnits[s.id] = un;

    if (s.cluster === 'A') {
      clusterTotalsBoxes.A += cx;
      clusterTotals.A += un;
    }
    if (s.cluster === 'B') {
      clusterTotalsBoxes.B += cx;
      clusterTotals.B += un;
    }
    if (s.cluster === 'C') {
      clusterTotalsBoxes.C += cx;
      clusterTotals.C += un;
    }
  });

  const totalAllocatedBoxes = Object.values(allocationsBoxes).reduce((a, b) => a + b, 0);
  const totalAllocated = totalAllocatedBoxes * safePackSize;
  const reserveStockBoxes = Math.max(0, totalBoxes - totalAllocatedBoxes);
  const reserveStock = reserveStockBoxes * safePackSize;

  return {
    allocations: allocationsUnits,
    allocationsBoxes,
    totalAllocated,
    totalAllocatedBoxes,
    reserveStock,
    reserveStockBoxes,
    targetTotal: totalBoxes * safePackSize,
    targetTotalBoxes: totalBoxes,
    isBalanced: totalAllocatedBoxes <= totalBoxes,
    isOverAllocated: totalAllocatedBoxes > totalBoxes,
    difference: (totalBoxes * safePackSize) - totalAllocated,
    differenceBoxes: totalBoxes - totalAllocatedBoxes,
    clusterTotals,
    clusterTotalsBoxes
  };
}

/**
 * Rateio por Unidades (Compatibilidade e Modo Detalhado)
 */
export function calculateAutomaticSeparation(
  totalQuantity: number,
  stores: StoreConfig[] = DEFAULT_STORES,
  reserveQuantity?: number
): SeparationResult {
  const defaultReserve = Math.round(totalQuantity * DEFAULT_RESERVE_STOCK_PERCENT);
  const actualReserve = reserveQuantity !== undefined ? reserveQuantity : defaultReserve;
  const safeReserve = Math.max(0, Math.min(totalQuantity, Math.floor(actualReserve || 0)));
  const quantityToDistribute = Math.max(0, totalQuantity - safeReserve);

  if (quantityToDistribute <= 0) {
    const emptyAllocations: Record<string, number> = {};
    stores.forEach(s => { emptyAllocations[s.id] = 0; });
    return {
      allocations: emptyAllocations,
      totalAllocated: 0,
      reserveStock: totalQuantity,
      targetTotal: totalQuantity,
      isBalanced: true,
      isOverAllocated: false,
      difference: totalQuantity,
      clusterTotals: { A: 0, B: 0, C: 0 }
    };
  }

  const activeStores = stores.filter(s => s.active);
  const totalWeight = activeStores.reduce((acc, s) => acc + s.defaultWeight, 0);

  if (totalWeight <= 0 || activeStores.length === 0) {
    const fallbackAllocations: Record<string, number> = {};
    stores.forEach(s => { fallbackAllocations[s.id] = 0; });
    return {
      allocations: fallbackAllocations,
      totalAllocated: 0,
      reserveStock: totalQuantity,
      targetTotal: totalQuantity,
      isBalanced: true,
      isOverAllocated: false,
      difference: totalQuantity,
      clusterTotals: { A: 0, B: 0, C: 0 }
    };
  }

  const allocations: Record<string, number> = {};
  const remainders: { storeId: string; cluster: string; weight: number; remainder: number; originalIndex: number }[] = [];
  let sumIntegers = 0;

  stores.forEach(s => { allocations[s.id] = 0; });

  activeStores.forEach((store, index) => {
    const exactQuota = (store.defaultWeight / totalWeight) * quantityToDistribute;
    const integerPart = Math.floor(exactQuota);
    const remainder = exactQuota - integerPart;

    allocations[store.id] = integerPart;
    sumIntegers += integerPart;

    remainders.push({
      storeId: store.id,
      cluster: store.cluster,
      weight: store.defaultWeight,
      remainder,
      originalIndex: index
    });
  });

  let leftover = quantityToDistribute - sumIntegers;

  const clusterOrder: Record<string, number> = { A: 3, B: 2, C: 1 };
  remainders.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 0.000001) {
      return b.remainder - a.remainder;
    }
    const clusterDiff = (clusterOrder[b.cluster] || 0) - (clusterOrder[a.cluster] || 0);
    if (clusterDiff !== 0) return clusterDiff;
    return b.weight - a.weight;
  });

  let rIdx = 0;
  while (leftover > 0 && remainders.length > 0) {
    const item = remainders[rIdx % remainders.length];
    allocations[item.storeId] += 1;
    leftover -= 1;
    rIdx++;
  }

  const clusterTotals = { A: 0, B: 0, C: 0 };
  stores.forEach(s => {
    const qtd = allocations[s.id] || 0;
    if (s.cluster === 'A') clusterTotals.A += qtd;
    if (s.cluster === 'B') clusterTotals.B += qtd;
    if (s.cluster === 'C') clusterTotals.C += qtd;
  });

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const reserveStock = Math.max(0, totalQuantity - totalAllocated);

  return {
    allocations,
    totalAllocated,
    reserveStock,
    targetTotal: totalQuantity,
    isBalanced: totalAllocated <= totalQuantity,
    isOverAllocated: totalAllocated > totalQuantity,
    difference: totalQuantity - totalAllocated,
    clusterTotals
  };
}

export function validateSeparation(
  allocations: Record<string, number>,
  targetTotal: number,
  stores: StoreConfig[] = DEFAULT_STORES
): SeparationResult {
  let totalAllocated = 0;
  const clusterTotals = { A: 0, B: 0, C: 0 };

  stores.forEach(s => {
    const qtd = Number(allocations[s.id]) || 0;
    totalAllocated += qtd;
    if (s.cluster === 'A') clusterTotals.A += qtd;
    if (s.cluster === 'B') clusterTotals.B += qtd;
    if (s.cluster === 'C') clusterTotals.C += qtd;
  });

  const reserveStock = Math.max(0, targetTotal - totalAllocated);
  const isOverAllocated = totalAllocated > targetTotal;

  return {
    allocations,
    totalAllocated,
    reserveStock,
    targetTotal,
    isBalanced: !isOverAllocated,
    isOverAllocated,
    difference: targetTotal - totalAllocated,
    clusterTotals
  };
}
