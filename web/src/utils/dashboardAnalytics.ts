import { PurchaseOrder, OrderItem } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_STORES } from '../shared/constants';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';

export interface DashboardFilter {
  periodPreset: '30d' | 'trimestre' | 'semestre' | 'ano' | 'tudo' | 'custom';
  startDate?: string;
  endDate?: string;
  supplierId?: string; // 'all' ou id específico
}

export interface ItemRanking {
  codigo?: string;
  descricao: string;
  totalPecas: number;
  totalInvestimento: number;
  faturamentoPdv: number;
  lucroReal: number;
  margemMedia: number;
  pedidosCount: number;
}

export interface SupplierRanking {
  id: string;
  razaoSocial: string;
  pedidosCount: number;
  totalInvestimento: number;
  totalPecas: number;
  totalLucro: number;
  aliquotaStMedia: number;
}

export interface PeriodSummary {
  periodoLabel: string;
  totalInvestido: number;
  faturamentoPdv: number;
  lucroReal: number;
  margemPercentual: number;
  totalPecas: number;
  pedidosCount: number;
}

export interface MonthlyChartData {
  mesLabel: string; // Ex: 'Jan/26', 'Fev/26'
  mesIndex: number; // 0 a 11
  ano: number;
  investimentoCompra: number;
  faturamentoPdv: number;
  lucroReal: number;
  totalPecas: number;
}

export interface DashboardMetrics {
  totalInvestido: number;
  totalPecas: number;
  faturamentoPdv: number;
  lucroReal: number;
  margemMedia: number;
  pedidosCount: number;
  ticketMedio: number;
  topItems: ItemRanking[];
  topSuppliers: SupplierRanking[];
  quarterlySummary: PeriodSummary[]; // Q1, Q2, Q3, Q4
  semesterSummary: PeriodSummary[];  // S1, S2
  annualSummary: PeriodSummary[];    // Anual
  monthlyData: MonthlyChartData[];
  clusterAllocation: { A: number; B: number; C: number; total: number };
}

/**
 * Cria pedidos de demonstração históricos caso o usuário queira ver o dashboard preenchido com dados ricos de 2026.
 */
export function generateSeedOrders(): PurchaseOrder[] {
  const fiscal = DEFAULT_FISCAL_CONFIG;
  const stores = DEFAULT_STORES;

  const mockItemsPool = [
    { codigo: 'BAZ-001', descricao: 'Pote Hermético Quadrado 1.5L', qtdPorPacote: 12, qtdPacotes: 100, preco: 4.85, pdv: 12.00 },
    { codigo: 'BAZ-002', descricao: 'Organizador Multiuso Acrílico', qtdPorPacote: 24, qtdPacotes: 60, preco: 6.50, pdv: 16.90 },
    { codigo: 'ALU-101', descricao: 'Conjunto Panelas Antiaderente 5 Peças', qtdPorPacote: 4, qtdPacotes: 80, preco: 68.00, pdv: 149.90 },
    { codigo: 'BAZ-003', descricao: 'Cesto Organizador Trançado Médio', qtdPorPacote: 18, qtdPacotes: 90, preco: 8.20, pdv: 19.90 },
    { codigo: 'VID-040', descricao: 'Jogo de Copos Vidro Diamond 6un', qtdPorPacote: 6, qtdPacotes: 150, preco: 14.50, pdv: 34.90 },
    { codigo: 'BAZ-004', descricao: 'Cabide de Veludo Slim Preto 10un', qtdPorPacote: 20, qtdPacotes: 120, preco: 12.80, pdv: 29.90 },
    { codigo: 'BAZ-005', descricao: 'Garrafa Térmica Inox 1L', qtdPorPacote: 12, qtdPacotes: 75, preco: 22.00, pdv: 49.90 },
    { codigo: 'LIM-010', descricao: 'Mop Giratório com Balde 13L', qtdPorPacote: 4, qtdPacotes: 110, preco: 38.50, pdv: 89.90 }
  ];

  const seedOrders: PurchaseOrder[] = [
    // Trimestre 1 / 2026 (Jan/Fev/Mar)
    createMockOrder('PED-0001', 'Plásticos & Utilidades do Brasil Ltda', 'Carlos Andrade', '2026-01-15', 5.0, 0, [
      mockItemsPool[0], mockItemsPool[1], mockItemsPool[3]
    ]),
    createMockOrder('PED-0002', 'Indústria Metalúrgica Alumínios União Ltda', 'Roberto Lima', '2026-02-10', 8.0, 12.0, [
      mockItemsPool[2], mockItemsPool[6]
    ]),
    createMockOrder('PED-0003', 'Distribuidora Paranaense de Bazar S/A', 'Mariana Souza', '2026-03-20', 3.0, 7.5, [
      mockItemsPool[4], mockItemsPool[5]
    ]),

    // Trimestre 2 / 2026 (Abr/Mai/Jun)
    createMockOrder('PED-0004', 'Plásticos & Utilidades do Brasil Ltda', 'Carlos Andrade', '2026-04-18', 6.0, 0, [
      mockItemsPool[0], mockItemsPool[3], mockItemsPool[7]
    ]),
    createMockOrder('PED-0005', 'Distribuidora Paranaense de Bazar S/A', 'Mariana Souza', '2026-05-22', 4.0, 7.5, [
      mockItemsPool[1], mockItemsPool[4], mockItemsPool[5]
    ]),
    createMockOrder('PED-0006', 'Indústria Metalúrgica Alumínios União Ltda', 'Roberto Lima', '2026-06-14', 5.0, 12.0, [
      mockItemsPool[2], mockItemsPool[6]
    ]),

    // Trimestre 3 / 2026 (Jul/Ago)
    createMockOrder('PED-0007', 'Plásticos & Utilidades do Brasil Ltda', 'Carlos Andrade', '2026-07-10', 5.0, 0, [
      mockItemsPool[0], mockItemsPool[1], mockItemsPool[7]
    ]),
    createMockOrder('PED-0008', 'Distribuidora Paranaense de Bazar S/A', 'Mariana Souza', '2026-08-15', 5.0, 7.5, [
      mockItemsPool[3], mockItemsPool[4], mockItemsPool[5]
    ])
  ];

  return seedOrders;
}

function createMockOrder(
  numeroPedido: string, 
  fornecedor: string, 
  vendedor: string, 
  dataPedido: string, 
  descontoOff: number, 
  stAliquota: number,
  rawItems: any[]
): PurchaseOrder {
  const fiscal = DEFAULT_FISCAL_CONFIG;
  const stores = DEFAULT_STORES;

  const items: OrderItem[] = rawItems.map((raw, idx) => {
    const qtdTotalUnidades = raw.qtdPorPacote * raw.qtdPacotes;
    const valorTotalBruto = qtdTotalUnidades * raw.preco;
    const fiscalRes = calculateItemFiscal(raw.preco, raw.pdv, fiscal);
    const sep = calculateAutomaticSeparation(qtdTotalUnidades, stores);

    return {
      id: `item_${numeroPedido}_${idx}`,
      codigo: raw.codigo,
      descricao: raw.descricao,
      qtdPorPacote: raw.qtdPorPacote,
      qtdPacotes: raw.qtdPacotes,
      qtdTotalUnidades,
      precoUnitario: raw.preco,
      valorTotalBruto,
      pdvAlvo: raw.pdv,
      despesasPdvUnit: fiscalRes.despesasPdvUnit,
      creditoIcmsUnit: fiscalRes.creditoIcmsUnit,
      custoRealEfetivo: fiscalRes.custoRealEfetivo,
      margemRealUnit: fiscalRes.margemRealUnit,
      margemPercentual: fiscalRes.margemPercentual,
      separacaoLojas: sep.allocations,
      separacaoManual: false
    };
  });

  return {
    header: {
      id: 'order_' + numeroPedido,
      numeroPedido,
      fornecedor,
      vendedor,
      condicaoPagamento: '30/60/90 Dias',
      dataPedido,
      dataEntregaPrevista: dataPedido,
      percentualDescontoOff: descontoOff,
      aliquotaSt: stAliquota,
      observacoesDescarga: 'Descarga no CD.',
      valorFreteGlobal: 0,
      valorOutrasDespesasGlobal: 0,
      status: 'Aprovado',
      createdAt: dataPedido + 'T12:00:00.000Z',
      updatedAt: dataPedido + 'T12:00:00.000Z'
    },
    items,
    fiscalConfig: fiscal,
    storeConfigs: stores
  };
}

/**
 * Calcula todas as métricas analíticas e agregações do dashboard com filtros de período e fornecedor.
 */
export function calculateDashboardMetrics(
  allOrders: PurchaseOrder[],
  filter: DashboardFilter
): DashboardMetrics {
  const now = new Date();
  const currentYear = now.getFullYear();

  // 1. Filtrar pedidos por data e fornecedor
  const filteredOrders = allOrders.filter(order => {
    // Filtro de fornecedor
    if (filter.supplierId && filter.supplierId !== 'all') {
      const matchSup = order.header.supplierId === filter.supplierId || 
        order.header.fornecedor.toLowerCase().includes(filter.supplierId.toLowerCase());
      if (!matchSup) return false;
    }

    const orderDate = new Date(order.header.dataPedido || order.header.createdAt);
    if (isNaN(orderDate.getTime())) return true;

    if (filter.periodPreset === '30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      return orderDate >= thirtyDaysAgo;
    }

    if (filter.periodPreset === 'trimestre') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const orderQuarter = Math.floor(orderDate.getMonth() / 3);
      return orderDate.getFullYear() === currentYear && orderQuarter === currentQuarter;
    }

    if (filter.periodPreset === 'semestre') {
      const currentSemester = now.getMonth() < 6 ? 0 : 1;
      const orderSemester = orderDate.getMonth() < 6 ? 0 : 1;
      return orderDate.getFullYear() === currentYear && orderSemester === currentSemester;
    }

    if (filter.periodPreset === 'ano') {
      return orderDate.getFullYear() === currentYear;
    }

    if (filter.periodPreset === 'custom' && filter.startDate && filter.endDate) {
      const start = new Date(filter.startDate);
      const end = new Date(filter.endDate + 'T23:59:59');
      return orderDate >= start && orderDate <= end;
    }

    return true; // 'tudo'
  });

  // 2. Acumuladores globais
  let totalInvestido = 0;
  let totalPecas = 0;
  let faturamentoPdv = 0;
  let custoRealTotal = 0;
  let totalStValor = 0;
  const clusterAllocation = { A: 0, B: 0, C: 0, total: 0 };

  const itemsMap: Record<string, ItemRanking> = {};
  const suppliersMap: Record<string, SupplierRanking> = {};

  // 3. Processar cada pedido
  filteredOrders.forEach(order => {
    const totalBrutoPedido = order.items.reduce((a, b) => a + (b.valorTotalBruto || 0), 0);
    const descontoOff = (totalBrutoPedido * (order.header.percentualDescontoOff || 0)) / 100;
    const subtotalAposDesconto = totalBrutoPedido - descontoOff;
    const stAliquota = order.header.aliquotaSt || 0;
    const stValorPedido = (subtotalAposDesconto * stAliquota) / 100;
    const pedidoInvestimentoLiquido = subtotalAposDesconto + stValorPedido + (order.header.valorFreteGlobal || 0);

    totalInvestido += pedidoInvestimentoLiquido;
    totalStValor += stValorPedido;

    // Fornecedor ranking
    const supKey = order.header.fornecedor || 'Não identificado';
    if (!suppliersMap[supKey]) {
      suppliersMap[supKey] = {
        id: order.header.supplierId || supKey,
        razaoSocial: supKey,
        pedidosCount: 0,
        totalInvestimento: 0,
        totalPecas: 0,
        totalLucro: 0,
        aliquotaStMedia: stAliquota
      };
    }
    suppliersMap[supKey].pedidosCount += 1;
    suppliersMap[supKey].totalInvestimento += pedidoInvestimentoLiquido;

    // Itens
    order.items.forEach(item => {
      totalPecas += item.qtdTotalUnidades || 0;
      const itemFaturamento = (item.qtdTotalUnidades || 0) * (item.pdvAlvo || 0);
      const itemCustoReal = (item.qtdTotalUnidades || 0) * (item.custoRealEfetivo || 0);
      faturamentoPdv += itemFaturamento;
      custoRealTotal += itemCustoReal;

      suppliersMap[supKey].totalPecas += item.qtdTotalUnidades || 0;
      suppliersMap[supKey].totalLucro += (itemFaturamento - itemCustoReal);

      // Agregação de item
      const itemKey = item.descricao.trim().toLowerCase();
      if (!itemsMap[itemKey]) {
        itemsMap[itemKey] = {
          codigo: item.codigo,
          descricao: item.descricao,
          totalPecas: 0,
          totalInvestimento: 0,
          faturamentoPdv: 0,
          lucroReal: 0,
          margemMedia: 0,
          pedidosCount: 0
        };
      }
      itemsMap[itemKey].totalPecas += item.qtdTotalUnidades;
      itemsMap[itemKey].totalInvestimento += item.valorTotalBruto;
      itemsMap[itemKey].faturamentoPdv += itemFaturamento;
      itemsMap[itemKey].lucroReal += (itemFaturamento - itemCustoReal);
      itemsMap[itemKey].pedidosCount += 1;

      // Clusters
      if (item.separacaoLojas) {
        order.storeConfigs?.forEach(store => {
          const qtd = item.separacaoLojas?.[store.id] || 0;
          if (store.cluster === 'A') clusterAllocation.A += qtd;
          if (store.cluster === 'B') clusterAllocation.B += qtd;
          if (store.cluster === 'C') clusterAllocation.C += qtd;
          clusterAllocation.total += qtd;
        });
      }
    });
  });

  const lucroReal = faturamentoPdv - custoRealTotal - totalStValor;
  const margemMedia = faturamentoPdv > 0 ? (lucroReal / faturamentoPdv) * 100 : 0;
  const pedidosCount = filteredOrders.length;
  const ticketMedio = pedidosCount > 0 ? totalInvestido / pedidosCount : 0;

  // Top Items ordenados por quantidade de peças
  const topItems = Object.values(itemsMap).map(i => ({
    ...i,
    margemMedia: i.faturamentoPdv > 0 ? (i.lucroReal / i.faturamentoPdv) * 100 : 0
  })).sort((a, b) => b.totalPecas - a.totalPecas);

  // Top Fornecedores ordenados por volume financeiro
  const topSuppliers = Object.values(suppliersMap).sort((a, b) => b.totalInvestimento - a.totalInvestimento);

  // 4. Agregações por Trimestre, Semestre e Anual (de todos os pedidos do ano analisado)
  const baseYearOrders = allOrders.filter(o => {
    const d = new Date(o.header.dataPedido || o.header.createdAt);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
  });

  const quarters = [
    { label: '1º Trimestre (Jan - Mar)', months: [0, 1, 2] },
    { label: '2º Trimestre (Abr - Jun)', months: [3, 4, 5] },
    { label: '3º Trimestre (Jul - Set)', months: [6, 7, 8] },
    { label: '4º Trimestre (Out - Dez)', months: [9, 10, 11] }
  ];

  const quarterlySummary: PeriodSummary[] = quarters.map(q => {
    const qOrders = baseYearOrders.filter(o => {
      const d = new Date(o.header.dataPedido || o.header.createdAt);
      return q.months.includes(d.getMonth());
    });
    return summarizeOrdersGroup(q.label, qOrders);
  });

  const semesters = [
    { label: '1º Semestre (Jan - Jun)', months: [0, 1, 2, 3, 4, 5] },
    { label: '2º Semestre (Jul - Dez)', months: [6, 7, 8, 9, 10, 11] }
  ];

  const semesterSummary: PeriodSummary[] = semesters.map(s => {
    const sOrders = baseYearOrders.filter(o => {
      const d = new Date(o.header.dataPedido || o.header.createdAt);
      return s.months.includes(d.getMonth());
    });
    return summarizeOrdersGroup(s.label, sOrders);
  });

  const annualSummary: PeriodSummary[] = [
    summarizeOrdersGroup(`Ano Consolidado (${currentYear})`, baseYearOrders)
  ];

  // 5. Dados mensais para o gráfico de evolução
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyData: MonthlyChartData[] = monthNames.map((mesLabel, mesIndex) => {
    const mOrders = baseYearOrders.filter(o => {
      const d = new Date(o.header.dataPedido || o.header.createdAt);
      return d.getMonth() === mesIndex;
    });

    let mInvest = 0;
    let mFat = 0;
    let mCusto = 0;
    let mPecas = 0;

    mOrders.forEach(o => {
      const bruto = o.items.reduce((a, b) => a + (b.valorTotalBruto || 0), 0);
      const desc = (bruto * (o.header.percentualDescontoOff || 0)) / 100;
      const stVal = ((bruto - desc) * (o.header.aliquotaSt || 0)) / 100;
      mInvest += (bruto - desc + stVal + (o.header.valorFreteGlobal || 0));

      o.items.forEach(i => {
        mPecas += i.qtdTotalUnidades || 0;
        mFat += (i.qtdTotalUnidades || 0) * (i.pdvAlvo || 0);
        mCusto += (i.qtdTotalUnidades || 0) * (i.custoRealEfetivo || 0);
      });
    });

    return {
      mesLabel: `${mesLabel}/${String(currentYear).slice(2)}`,
      mesIndex,
      ano: currentYear,
      investimentoCompra: mInvest,
      faturamentoPdv: mFat,
      lucroReal: Math.max(0, mFat - mCusto),
      totalPecas: mPecas
    };
  });

  return {
    totalInvestido,
    totalPecas,
    faturamentoPdv,
    lucroReal,
    margemMedia,
    pedidosCount,
    ticketMedio,
    topItems,
    topSuppliers,
    quarterlySummary,
    semesterSummary,
    annualSummary,
    monthlyData,
    clusterAllocation
  };
}

function summarizeOrdersGroup(label: string, orders: PurchaseOrder[]): PeriodSummary {
  let invest = 0;
  let fat = 0;
  let custo = 0;
  let pecas = 0;
  let stVal = 0;

  orders.forEach(o => {
    const bruto = o.items.reduce((a, b) => a + (b.valorTotalBruto || 0), 0);
    const desc = (bruto * (o.header.percentualDescontoOff || 0)) / 100;
    const st = ((bruto - desc) * (o.header.aliquotaSt || 0)) / 100;
    stVal += st;
    invest += (bruto - desc + st + (o.header.valorFreteGlobal || 0));

    o.items.forEach(i => {
      pecas += i.qtdTotalUnidades || 0;
      fat += (i.qtdTotalUnidades || 0) * (i.pdvAlvo || 0);
      custo += (i.qtdTotalUnidades || 0) * (i.custoRealEfetivo || 0);
    });
  });

  const lucro = fat - custo - stVal;
  const margem = fat > 0 ? (lucro / fat) * 100 : 0;

  return {
    periodoLabel: label,
    totalInvestido: invest,
    faturamentoPdv: fat,
    lucroReal: lucro,
    margemPercentual: margem,
    totalPecas: pecas,
    pedidosCount: orders.length
  };
}
