import { PurchaseOrder, StoreConfig, OrderItem } from '../shared/types';
import { DEFAULT_STORES } from '../shared/constants';
import { calculateAutomaticSeparation } from '../shared/separationEngine';
import { toBrDate } from './masks';
import { parseDeliveryDate } from './deliveryAlerts';

export interface MovementsFilter {
  year: number;
  month: number | 'all'; // 1-12 ou 'all'
  storeId: string | 'all';
  statusScope: 'all' | 'delivered' | 'pending';
}

export interface StoreMovementStat {
  storeId: string;
  storeName: string;
  cluster: string;
  defaultWeight: number; // % esperado conforme configuração da rede
  pecasEntregues: number;
  pecasPrevistas: number;
  totalPecas: number;
  valorEntregue: number;
  valorPrevisto: number;
  totalValor: number;
  sharePercent: number; // % real do total de peças da rede
  desvioPercentual: number; // Diferença em relação à meta esperada
  statusEquilibrio: 'equilibrada' | 'superavit' | 'deficit';
  monthlyPecas: number[]; // 12 meses (índices 0-11)
  pecasVendidas?: number; // Informado pelo usuário para comparação
  saldoSuprimento?: number; // pecasEntregues - pecasVendidas
  taxaSuprimentoPercent?: number; // (pecasEntregues / pecasVendidas) * 100
}

export interface SupplierProductMovementDetail {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  isDelivered: boolean;
  orderDateBr: string;
  dateType: 'Recebido' | 'Previsão';
  itemId: string;
  productDescription: string;
  productCode: string;
  productBarcode?: string;
  photoUrl?: string;
  quantidadeLoja: number;
  quantidadeTotalPedido: number;
  storeName?: string;
  isRuptura?: boolean;
}

export interface SupplierReliabilityMetrics {
  taxaPontualidade: number; // 0 a 100%
  pedidosNoPrazo: number;
  pedidosAtrasados: number;
  mediaDiasAtraso: number; // dias médios quando atrasa
  taxaRuptura: number; // % de peças canceladas/cortadas pelo fornecedor
  pecasCortadas: number;
  nivelConfiabilidade: 'excelente' | 'atencao' | 'critico';
  labelConfiabilidade: string;
}

export interface SupplierMovementSummary {
  supplierName: string;
  pecas: number;
  pecasEntregues: number;
  pecasPrevistas: number;
  totalPecas: number;
  totalProdutosDistintos: number;
  pedidosCount: number;
  produtos: SupplierProductMovementDetail[];
  reliability: SupplierReliabilityMetrics;
  valor?: number;
}

export interface ProductMovementsMetrics {
  totalPecasEntregues: number;
  totalPecasPrevistas: number;
  totalPecasReservaCD: number;
  totalPecasGeral: number;
  valorTotalEntregue: number;
  valorTotalPrevisto: number;
  valorTotalGeral: number;
  pedidosEntreguesCount: number;
  pedidosPrevistosCount: number;
  lojaMaisAbastecida: { name: string; pecas: number; share: number } | null;
  lojaMenosAbastecida: { name: string; pecas: number; share: number } | null;
  indiceEquilibrioRede: number; // 0 a 100%
  storeStats: StoreMovementStat[];
  monthlyGlobal: Array<{
    mes: string;
    mesIndex: number;
    entregues: number;
    previstas: number;
    total: number;
  }>;
  topSuppliersToStores: SupplierMovementSummary[];
  isFilteredByStore: boolean;
  filteredStoreName?: string;
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Extrai data segura do pedido considerando recebimento, entrega ou emissão
 */
export function getMovementOrderDate(order: PurchaseOrder): Date | null {
  if (!order || !order.header) return null;
  const raw = order.header.dataRecebimentoMatriz || 
              order.header.dataEntregaPrevista || 
              order.header.dataPedido || 
              order.header.dataEmissao || 
              order.header.createdAt;
  if (!raw) return null;

  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const dt = new Date(str.split('T')[0] + 'T12:00:00Z');
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    const dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

export interface AvailableMovementsPeriod {
  years: number[];
  monthsByYear: Record<number, number[]>;
}

/**
 * Retorna dinamicamente apenas os anos e meses que possuem pedidos com movimentação real de peças
 */
export function getAvailableMovementsPeriods(orders: PurchaseOrder[]): AvailableMovementsPeriod {
  const yearsMap = new Map<number, Set<number>>();

  (orders || []).forEach(order => {
    if (!order || !order.header) return;

    // Apenas pedidos que possuem peças válidas
    const items = (order.items || []).filter(i => {
      const pecas = Number(i.qtdTotalUnidades) || ((Number(i.qtdNoPacote) || 1) * (Number(i.qtdPacotes) || 0)) || 0;
      return pecas > 0 && !i.ruptura;
    });
    if (items.length === 0) return;

    const dt = getMovementOrderDate(order);
    if (!dt) return;

    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1; // 1 a 12

    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) {
      if (!yearsMap.has(y)) {
        yearsMap.set(y, new Set());
      }
      yearsMap.get(y)!.add(m);
    }
  });

  const currentYear = new Date().getFullYear();
  let years = Array.from(yearsMap.keys()).sort((a, b) => b - a);

  // Se não houver nenhum pedido com data, mantém o ano atual
  if (years.length === 0) {
    years = [currentYear];
  }

  const monthsByYear: Record<number, number[]> = {};
  years.forEach(y => {
    const monthsSet = yearsMap.get(y);
    monthsByYear[y] = monthsSet ? Array.from(monthsSet).sort((a, b) => a - b) : [];
  });

  return {
    years,
    monthsByYear
  };
}

/**
 * Calcula todas as métricas analíticas de movimentação de produtos e equilíbrio entre lojas
 */
export function calculateProductMovementsMetrics(
  orders: PurchaseOrder[],
  stores: StoreConfig[] = DEFAULT_STORES,
  filter: MovementsFilter,
  salesByStore: Record<string, number> = {}
): ProductMovementsMetrics {
  const activeStores = stores && stores.length > 0 ? stores : DEFAULT_STORES;
  const storeMap = new Map<string, StoreConfig>();
  activeStores.forEach(s => storeMap.set(s.id, s));

  // Estrutura de acúmulo por loja
  const storeAccumulator = new Map<string, {
    entregues: number;
    previstas: number;
    valorEntregue: number;
    valorPrevisto: number;
    monthlyPecas: number[];
  }>();

  activeStores.forEach(s => {
    storeAccumulator.set(s.id, {
      entregues: 0,
      previstas: 0,
      valorEntregue: 0,
      valorPrevisto: 0,
      monthlyPecas: Array(12).fill(0)
    });
  });

  const monthlyGlobalMap = Array.from({ length: 12 }, (_, i) => ({
    mes: MONTH_NAMES_SHORT[i],
    mesIndex: i,
    entregues: 0,
    previstas: 0,
    total: 0
  }));

  const suppliersMap = new Map<string, {
    pecasEntregues: number;
    pecasPrevistas: number;
    totalPecas: number;
    pedidosSet: Set<string>;
    produtos: SupplierProductMovementDetail[];
    pedidosNoPrazo: number;
    pedidosAtrasados: number;
    totalDiasAtraso: number;
    totalPecasSolicitadas: number;
    pecasCortadas: number;
  }>();

  let globalPecasEntregues = 0;
  let globalPecasPrevistas = 0;
  let storeFilteredPecasEntregues = 0;
  let storeFilteredPecasPrevistas = 0;
  let storeFilteredPedidosEntreguesSet = new Set<string>();
  let storeFilteredPedidosPrevistosSet = new Set<string>();
  let valorTotalEntregue = 0;
  let valorTotalPrevisto = 0;
  let totalPecasReservaCD = 0;
  let globalPedidosEntreguesCount = 0;
  let globalPedidosPrevistosCount = 0;

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // Processa cada pedido
  orders.forEach(order => {
    if (!order || !order.header) return;

    // Ignora rascunhos sem itens
    const items = (order.items || []).filter(i => {
      const pecas = Number(i.qtdTotalUnidades) || ((Number(i.qtdNoPacote) || 1) * (Number(i.qtdPacotes) || 0)) || 0;
      return pecas > 0 && !i.ruptura;
    });
    if (items.length === 0) return;

    const dt = getMovementOrderDate(order);
    if (!dt) return;
    const orderYear = dt.getUTCFullYear();
    const orderMonthIndex = dt.getUTCMonth(); // 0 a 11
    const orderMonth = orderMonthIndex + 1; // 1 a 12

    // Filtro de Ano
    if (filter.year && orderYear !== filter.year) return;

    // Filtro de Mês
    if (filter.month !== 'all' && orderMonth !== filter.month) return;

    // Determina se o pedido já foi fisicamente entregue/separado ou se ainda está previsto
    const st = order.header.status;
    const isDelivered = st === 'Em Separação' || st === 'Faturamento' || st === 'Finalizado' || 
                        order.header.separacaoConcluida === true || order.header.recebidoMatriz === true;

    // Filtro de Escopo
    if (filter.statusScope === 'delivered' && !isDelivered) return;
    if (filter.statusScope === 'pending' && isDelivered) return;

    if (isDelivered) {
      globalPedidosEntreguesCount++;
    } else {
      globalPedidosPrevistosCount++;
    }

    const fornecedorNome = order.header.fornecedor || 'Fornecedor Diversos';
    if (!suppliersMap.has(fornecedorNome)) {
      suppliersMap.set(fornecedorNome, {
        pecasEntregues: 0,
        pecasPrevistas: 0,
        totalPecas: 0,
        pedidosSet: new Set(),
        produtos: [],
        pedidosNoPrazo: 0,
        pedidosAtrasados: 0,
        totalDiasAtraso: 0,
        totalPecasSolicitadas: 0,
        pecasCortadas: 0
      });
    }
    const supAcc = suppliersMap.get(fornecedorNome)!;

    const orderNumber = order.id ? (order.id.startsWith('ord_') ? order.id.replace('ord_', '') : order.id.slice(-6)) : 'S/N';
    const orderKey = order.id || orderNumber;

    // Avaliação de prazo de entrega do pedido
    const dataPrevista = parseDeliveryDate(order.header.dataEntregaPrevista);
    let isOrderLate = false;
    let daysLate = 0;

    if (dataPrevista) {
      if (isDelivered) {
        const dataReal = parseDeliveryDate(order.header.dataRecebimentoMatriz || order.header.dataFinalizacao || order.header.updatedAt);
        if (dataReal) {
          const diffMs = dataReal.getTime() - dataPrevista.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            isOrderLate = true;
            daysLate = diffDays;
          }
        }
      } else {
        const diffMs = todayMidnight.getTime() - dataPrevista.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          isOrderLate = true;
          daysLate = diffDays;
        }
      }
    }

    if (!supAcc.pedidosSet.has(orderKey)) {
      if (isOrderLate) {
        supAcc.pedidosAtrasados++;
        supAcc.totalDiasAtraso += daysLate;
      } else {
        supAcc.pedidosNoPrazo++;
      }
    }

    // Contabiliza peças solicitadas e rupturas do pedido
    (order.items || []).forEach(it => {
      const pecasIt = Number(it.qtdTotalUnidades) || ((Number(it.qtdNoPacote) || 1) * (Number(it.qtdPacotes) || 0)) || 0;
      supAcc.totalPecasSolicitadas += pecasIt;
      if (it.ruptura) {
        supAcc.pecasCortadas += pecasIt;
      }
    });
    const rawDate = isDelivered 
      ? (order.header.dataRecebimentoMatriz || order.header.dataEntregaPrevista || order.header.dataPedido || order.header.createdAt)
      : (order.header.dataEntregaPrevista || order.header.dataPedido || order.header.createdAt);
    const dateBr = toBrDate(rawDate) || 'A definir';
    const dateType: 'Recebido' | 'Previsão' = isDelivered ? 'Recebido' : 'Previsão';

    // Processa os itens do pedido
    items.forEach(item => {
      const pecasTotalItem = Number(item.qtdTotalUnidades) || ((Number(item.qtdNoPacote) || 1) * (Number(item.qtdPacotes) || 0)) || 0;
      const precoUnit = Number(item.precoUnitario) || 0;
      const valorTotalItem = Number(item.valorTotalLiquido) || Number(item.valorTotalBruto) || (pecasTotalItem * precoUnit);

      // Reserva de CD / Matriz
      const reserva = Number(item.qtdReservaEstoque || 0);
      totalPecasReservaCD += reserva;

      // Rateio por Loja: se houver separação já gravada no item, usa ela; senão, calcula automática
      let storeAllocation: Record<string, number> = {};
      if (item.separacaoLojas && Object.keys(item.separacaoLojas).length > 0) {
        storeAllocation = item.separacaoLojas;
      } else {
        const auto = calculateAutomaticSeparation(pecasTotalItem, activeStores, reserva);
        storeAllocation = auto.allocations;
      }

      // Distribui as peças para cada loja na visão da rede
      Object.entries(storeAllocation).forEach(([storeId, qtdPecas]) => {
        const pecas = Math.max(0, Number(qtdPecas) || 0);
        if (pecas <= 0) return;

        const proporcaoValor = pecasTotalItem > 0 ? (pecas / pecasTotalItem) * valorTotalItem : 0;

        let acc = storeAccumulator.get(storeId);
        if (!acc) {
          acc = {
            entregues: 0,
            previstas: 0,
            valorEntregue: 0,
            valorPrevisto: 0,
            monthlyPecas: Array(12).fill(0)
          };
          storeAccumulator.set(storeId, acc);
        }

        if (isDelivered) {
          acc.entregues += pecas;
          acc.valorEntregue += proporcaoValor;
          globalPecasEntregues += pecas;
          valorTotalEntregue += proporcaoValor;
          monthlyGlobalMap[orderMonthIndex].entregues += pecas;
        } else {
          acc.previstas += pecas;
          acc.valorPrevisto += proporcaoValor;
          globalPecasPrevistas += pecas;
          valorTotalPrevisto += proporcaoValor;
          monthlyGlobalMap[orderMonthIndex].previstas += pecas;
        }

        acc.monthlyPecas[orderMonthIndex] += pecas;
        monthlyGlobalMap[orderMonthIndex].total += pecas;
      });

      // Cálculo específico para Fornecedor no escopo selecionado (Loja específica ou Rede)
      let pecasDoItemParaEscopo = 0;
      if (filter.storeId === 'all') {
        pecasDoItemParaEscopo = Math.max(0, pecasTotalItem - reserva);
      } else {
        pecasDoItemParaEscopo = Math.max(0, Number(storeAllocation[filter.storeId]) || 0);
      }

      if (pecasDoItemParaEscopo > 0) {
        supAcc.totalPecas += pecasDoItemParaEscopo;
        if (isDelivered) {
          supAcc.pecasEntregues += pecasDoItemParaEscopo;
          storeFilteredPecasEntregues += pecasDoItemParaEscopo;
          storeFilteredPedidosEntreguesSet.add(order.id || orderNumber);
        } else {
          supAcc.pecasPrevistas += pecasDoItemParaEscopo;
          storeFilteredPecasPrevistas += pecasDoItemParaEscopo;
          storeFilteredPedidosPrevistosSet.add(order.id || orderNumber);
        }
        supAcc.pedidosSet.add(order.id || orderNumber);

        supAcc.produtos.push({
          orderId: order.id || '',
          orderNumber,
          orderStatus: st,
          isDelivered,
          orderDateBr: dateBr,
          dateType,
          itemId: item.id || '',
          productDescription: item.descricao || 'Produto sem descrição',
          productCode: item.codigoInterno || item.codigo || item.codigoFornecedor || '-',
          productBarcode: item.codigoBarras,
          photoUrl: item.fotoUrl,
          quantidadeLoja: pecasDoItemParaEscopo,
          quantidadeTotalPedido: pecasTotalItem,
          storeName: filter.storeId !== 'all' ? (storeMap.get(filter.storeId)?.name || 'Filial') : 'Todas as Lojas'
        });
      }
    });
  });

  const globalTotalPecasGeral = globalPecasEntregues + globalPecasPrevistas;
  const globalValorTotalGeral = valorTotalEntregue + valorTotalPrevisto;

  // Monta estatísticas compiladas por loja
  let maxPecasLoja = -1;
  let minPecasLoja = Infinity;
  let lojaMaisAbastecida: { name: string; pecas: number; share: number } | null = null;
  let lojaMenosAbastecida: { name: string; pecas: number; share: number } | null = null;

  const totalStoresWeight = activeStores.reduce((acc, s) => acc + (s.defaultWeight || 5), 0) || 100;

  const storeStats: StoreMovementStat[] = activeStores.map(store => {
    const acc = storeAccumulator.get(store.id) || {
      entregues: 0,
      previstas: 0,
      valorEntregue: 0,
      valorPrevisto: 0,
      monthlyPecas: Array(12).fill(0)
    };

    const totalPecas = acc.entregues + acc.previstas;
    const totalValor = acc.valorEntregue + acc.valorPrevisto;
    const sharePercent = globalTotalPecasGeral > 0 ? (totalPecas / globalTotalPecasGeral) * 100 : 0;

    // Meta esperada da loja conforme cluster
    const defaultWeight = store.defaultWeight || Number(((1 / activeStores.length) * 100).toFixed(2));
    const metaEsperadaShare = (defaultWeight / totalStoresWeight) * 100;

    // Desvio Percentual (ex: recebeu 4% mas esperava 6.41% -> desvio = -37.6%)
    const desvioPercentual = metaEsperadaShare > 0 
      ? Number((((sharePercent - metaEsperadaShare) / metaEsperadaShare) * 100).toFixed(1))
      : 0;

    let statusEquilibrio: 'equilibrada' | 'superavit' | 'deficit' = 'equilibrada';
    if (desvioPercentual < -20) {
      statusEquilibrio = 'deficit'; // Alerta de baixo abastecimento (ex: Nova Rússia)
    } else if (desvioPercentual > 25) {
      statusEquilibrio = 'superavit'; // Alerta de loja cheia
    }

    // Comparativo com Vendas informadas
    const pecasVendidas = salesByStore[store.id] !== undefined ? salesByStore[store.id] : undefined;
    const saldoSuprimento = pecasVendidas !== undefined ? (acc.entregues - pecasVendidas) : undefined;
    const taxaSuprimentoPercent = pecasVendidas !== undefined && pecasVendidas > 0 
      ? Number(((acc.entregues / pecasVendidas) * 100).toFixed(1))
      : undefined;

    // Rastreia maior e menor
    if (totalPecas > maxPecasLoja) {
      maxPecasLoja = totalPecas;
      lojaMaisAbastecida = { name: store.name, pecas: totalPecas, share: Number(sharePercent.toFixed(1)) };
    }
    if (totalPecas < minPecasLoja && globalTotalPecasGeral > 0) {
      minPecasLoja = totalPecas;
      lojaMenosAbastecida = { name: store.name, pecas: totalPecas, share: Number(sharePercent.toFixed(1)) };
    }

    return {
      storeId: store.id,
      storeName: store.name,
      cluster: store.cluster,
      defaultWeight,
      pecasEntregues: acc.entregues,
      pecasPrevistas: acc.previstas,
      totalPecas,
      valorEntregue: acc.valorEntregue,
      valorPrevisto: acc.valorPrevisto,
      totalValor,
      sharePercent: Number(sharePercent.toFixed(1)),
      desvioPercentual,
      statusEquilibrio,
      monthlyPecas: acc.monthlyPecas,
      pecasVendidas,
      saldoSuprimento,
      taxaSuprimentoPercent
    };
  });

  // Ordena lojas decrescente por total de peças
  storeStats.sort((a, b) => b.totalPecas - a.totalPecas);

  // Cálculo do Índice de Equilíbrio da Rede (0 a 100%)
  // Mede quão próxima a distribuição real está da meta teórica dos clusters
  let somaDesviosAbsolutos = 0;
  storeStats.forEach(s => {
    somaDesviosAbsolutos += Math.min(100, Math.abs(s.desvioPercentual));
  });
  const desvioMedio = storeStats.length > 0 ? somaDesviosAbsolutos / storeStats.length : 0;
  const indiceEquilibrioRede = Math.max(0, Math.min(100, Math.round(100 - (desvioMedio * 0.8))));

  // Top Fornecedores que abastecem as lojas (com Termômetro de Confiabilidade & Pontualidade)
  const topSuppliersToStores: SupplierMovementSummary[] = Array.from(suppliersMap.entries())
    .filter(([_, data]) => data.totalPecas > 0)
    .map(([supplierName, data]) => {
      const produtosDistintos = new Set(data.produtos.map(p => `${p.productCode}__${p.productDescription}`));
      
      const totalPedidosAvaliados = data.pedidosNoPrazo + data.pedidosAtrasados;
      const taxaPontualidade = totalPedidosAvaliados > 0 
        ? Math.round((data.pedidosNoPrazo / totalPedidosAvaliados) * 100) 
        : 100;
      const mediaDiasAtraso = data.pedidosAtrasados > 0 
        ? Math.round(data.totalDiasAtraso / data.pedidosAtrasados) 
        : 0;
      const taxaRuptura = data.totalPecasSolicitadas > 0 
        ? Math.round((data.pecasCortadas / data.totalPecasSolicitadas) * 100) 
        : 0;

      let nivelConfiabilidade: 'excelente' | 'atencao' | 'critico' = 'excelente';
      let labelConfiabilidade = 'Fornecedor Pontual';

      if (taxaPontualidade >= 85 && taxaRuptura <= 5) {
        nivelConfiabilidade = 'excelente';
        labelConfiabilidade = 'Alta Confiabilidade';
      } else if (taxaPontualidade >= 60 && taxaRuptura <= 15) {
        nivelConfiabilidade = 'atencao';
        labelConfiabilidade = mediaDiasAtraso > 0 ? `Atraso médio: ${mediaDiasAtraso}d` : 'Atenção a Prazos';
      } else {
        nivelConfiabilidade = 'critico';
        labelConfiabilidade = taxaRuptura > 15 ? `Alto Corte (${taxaRuptura}%)` : `Frequente Atraso (${mediaDiasAtraso}d)`;
      }

      return {
        supplierName,
        pecas: data.totalPecas,
        pecasEntregues: data.pecasEntregues,
        pecasPrevistas: data.pecasPrevistas,
        totalPecas: data.totalPecas,
        totalProdutosDistintos: produtosDistintos.size,
        pedidosCount: data.pedidosSet.size,
        produtos: data.produtos.sort((a, b) => b.quantidadeLoja - a.quantidadeLoja),
        reliability: {
          taxaPontualidade,
          pedidosNoPrazo: data.pedidosNoPrazo,
          pedidosAtrasados: data.pedidosAtrasados,
          mediaDiasAtraso,
          taxaRuptura,
          pecasCortadas: data.pecasCortadas,
          nivelConfiabilidade,
          labelConfiabilidade
        }
      };
    })
    .sort((a, b) => b.totalPecas - a.totalPecas);

  const isFilteredByStore = filter.storeId !== 'all';
  const filteredStoreName = isFilteredByStore ? storeMap.get(filter.storeId)?.name : undefined;

  const totalPecasEntregues = isFilteredByStore ? storeFilteredPecasEntregues : globalPecasEntregues;
  const totalPecasPrevistas = isFilteredByStore ? storeFilteredPecasPrevistas : globalPecasPrevistas;
  const totalPecasGeral = totalPecasEntregues + totalPecasPrevistas;
  const valorTotalGeral = valorTotalEntregue + valorTotalPrevisto;
  const pedidosEntreguesCount = isFilteredByStore ? storeFilteredPedidosEntreguesSet.size : globalPedidosEntreguesCount;
  const pedidosPrevistosCount = isFilteredByStore ? storeFilteredPedidosPrevistosSet.size : globalPedidosPrevistosCount;

  return {
    totalPecasEntregues,
    totalPecasPrevistas,
    totalPecasReservaCD,
    totalPecasGeral,
    valorTotalEntregue,
    valorTotalPrevisto,
    valorTotalGeral,
    pedidosEntreguesCount,
    pedidosPrevistosCount,
    lojaMaisAbastecida,
    lojaMenosAbastecida,
    indiceEquilibrioRede,
    storeStats,
    monthlyGlobal: monthlyGlobalMap,
    topSuppliersToStores,
    isFilteredByStore,
    filteredStoreName
  };
}
