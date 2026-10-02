import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Truck,
  Building2,
  Calendar,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Store,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  BarChart3,
  DollarSign,
  Plus,
  RefreshCw,
  Info,
  Activity
} from 'lucide-react';
import { PurchaseOrder, StoreConfig } from '../shared/types';
import { DEFAULT_STORES } from '../shared/constants';
import {
  MovementsFilter,
  calculateProductMovementsMetrics,
  getAvailableMovementsPeriods,
  StoreMovementStat,
  SupplierMovementSummary
} from '../utils/productMovementsAnalytics';
import { StoreSalesInputModal } from './StoreSalesInputModal';
import { SupplierProductsModal } from './SupplierProductsModal';

interface ProductMovementsBIProps {
  orders: PurchaseOrder[];
  stores?: StoreConfig[];
  onNavigateToFinancialBI?: () => void;
  canAccessFinancialBI?: boolean;
  onSelectOrder?: (order: PurchaseOrder) => void;
}

const MONTH_NAMES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

export const ProductMovementsBI: React.FC<ProductMovementsBIProps> = ({
  orders,
  stores = DEFAULT_STORES,
  onNavigateToFinancialBI,
  canAccessFinancialBI = true,
  onSelectOrder
}) => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Períodos dinâmicos extraídos exclusivamente dos pedidos com movimentação real
  const availablePeriods = useMemo(() => {
    return getAvailableMovementsPeriods(orders);
  }, [orders]);

  const availableYears = availablePeriods.years;
  const initialYear = useMemo(() => {
    return availableYears.includes(currentYear) ? currentYear : (availableYears[0] || currentYear);
  }, [availableYears, currentYear]);

  // Filtros principais
  const [filter, setFilter] = useState<MovementsFilter>({
    year: initialYear,
    month: 'all',
    storeId: 'all',
    statusScope: 'all'
  });

  // Garante que o ano selecionado exista na lista de anos com movimentação
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(filter.year)) {
      setFilter(prev => ({
        ...prev,
        year: availableYears[0],
        month: 'all'
      }));
    }
  }, [availableYears, filter.year]);

  // Meses que possuem movimentação no ano selecionado
  const availableMonths = useMemo(() => {
    return availablePeriods.monthsByYear[filter.year] || [];
  }, [availablePeriods, filter.year]);

  // Se o mês selecionado não possuir movimentação no ano ativo, reseta para 'all'
  useEffect(() => {
    if (filter.month !== 'all' && !availableMonths.includes(filter.month)) {
      setFilter(prev => ({ ...prev, month: 'all' }));
    }
  }, [availableMonths, filter.month]);

  // Modal de Vendas informadas
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [salesStorage, setSalesStorage] = useState<Record<string, number>>({});

  // Modal de Detalhes dos Produtos do Fornecedor
  const [selectedSupplierModal, setSelectedSupplierModal] = useState<SupplierMovementSummary | null>(null);

  // Carrega vendas do mês/ano selecionado do LocalStorage
  useEffect(() => {
    const storageKey = `mega12_store_sales_${filter.year}_${filter.month}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        setSalesStorage(JSON.parse(raw));
      } catch {
        setSalesStorage({});
      }
    } else {
      setSalesStorage({});
    }
  }, [filter.year, filter.month]);

  const handleSaveSales = (newSales: Record<string, number>) => {
    setSalesStorage(newSales);
    const storageKey = `mega12_store_sales_${filter.year}_${filter.month}`;
    localStorage.setItem(storageKey, JSON.stringify(newSales));
  };

  // Cálculo das métricas analíticas
  const metrics = useMemo(() => {
    return calculateProductMovementsMetrics(orders, stores, filter, salesStorage);
  }, [orders, stores, filter, salesStorage]);

  // Filtro de loja na tabela se houver seleção
  const displayedStores = useMemo(() => {
    if (filter.storeId === 'all') return metrics.storeStats;
    return metrics.storeStats.filter(s => s.storeId === filter.storeId);
  }, [metrics.storeStats, filter.storeId]);

  // Maior valor para barra de proporção
  const maxStorePecas = useMemo(() => {
    return metrics.storeStats.length > 0 ? Math.max(...metrics.storeStats.map(s => s.totalPecas), 1) : 1;
  }, [metrics.storeStats]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. Barra Superior com Alternância de BI & Filtros Principais */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        
        {/* Linha 1: Alternância entre BI Financeiro e BI de Produtos */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Inteligência de Distribuição & Movimentação
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Supply Chain
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento físico de peças enviadas, previstas e equilíbrio de estoque entre as filiais
              </p>
            </div>
          </div>

          {/* Seletor Tipo Pílula: Financeiro vs Produtos (Apenas exibido se o perfil tiver acesso ao BI Financeiro) */}
          {canAccessFinancialBI && onNavigateToFinancialBI && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold self-start lg:self-auto shadow-2xs">
              <button
                type="button"
                onClick={onNavigateToFinancialBI}
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>BI Financeiro & Compras</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs flex items-center gap-1.5 cursor-default"
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>BI Movimentação & Lojas</span>
              </button>
            </div>
          )}
        </div>

        {/* Linha 2: Filtros de Período, Escopo e Lojas */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Ano Dinâmico (Apenas com movimentação real) */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filter.year}
                onChange={(e) => {
                  const newYear = Number(e.target.value);
                  setFilter(prev => ({ ...prev, year: newYear, month: 'all' }));
                }}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-hidden cursor-pointer"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="dark:bg-slate-900">{yr}</option>
                ))}
              </select>
            </div>

            {/* Mês Dinâmico (Apenas meses que possuem movimentação) */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 font-medium">Mês:</span>
              <select
                value={filter.month}
                onChange={(e) => setFilter(prev => ({ ...prev, month: e.target.value === 'all' ? 'all' : Number(e.target.value) }))}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-hidden cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">
                  {availableMonths.length > 0 ? 'Todos (Ano Inteiro)' : 'Sem Movimentação'}
                </option>
                {availableMonths.map(m => {
                  const monthObj = MONTH_NAMES.find(x => x.value === m);
                  return (
                    <option key={m} value={m} className="dark:bg-slate-900">
                      {monthObj ? monthObj.label : `Mês ${m}`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Escopo da Carga */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={filter.statusScope}
                onChange={(e) => setFilter(prev => ({ ...prev, statusScope: e.target.value as any }))}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-hidden cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">Entregues + Previstas</option>
                <option value="delivered" className="dark:bg-slate-900">Apenas Já Entregues / Despachadas</option>
                <option value="pending" className="dark:bg-slate-900">Apenas Previstas na Esteira</option>
              </select>
            </div>

            {/* Filtro de Loja */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filter.storeId}
                onChange={(e) => setFilter(prev => ({ ...prev, storeId: e.target.value }))}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-hidden cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">Todas as Lojas ({stores.length})</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-900">
                    {s.name} ({s.cluster})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão de Cruzamento com Vendas */}
          <button
            type="button"
            onClick={() => setIsSalesModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200/80 dark:border-slate-700"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Comparar com Vendas das Lojas</span>
          </button>
        </div>
      </div>

      {/* 2. Barra Executiva de KPIs Sóbrios (Pulse Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Peças Já Entregues */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              {metrics.isFilteredByStore ? `Peças Entregues (${metrics.filteredStoreName})` : 'Peças Entregues às Lojas'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {metrics.totalPecasEntregues.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">un</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>{metrics.pedidosEntreguesCount} {metrics.pedidosEntreguesCount === 1 ? 'pedido separado' : 'pedidos separados'}</span>
              <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                {metrics.totalPecasGeral > 0 ? `${((metrics.totalPecasEntregues / metrics.totalPecasGeral) * 100).toFixed(1)}% do total` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Peças Previstas na Esteira */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              {metrics.isFilteredByStore ? `Peças Previstas (${metrics.filteredStoreName})` : 'Peças Previstas a Chegar'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {metrics.totalPecasPrevistas.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">un</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>{metrics.pedidosPrevistosCount} {metrics.pedidosPrevistosCount === 1 ? 'pedido na esteira' : 'pedidos na esteira'}</span>
              <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                {metrics.totalPecasGeral > 0 ? `${((metrics.totalPecasPrevistas / metrics.totalPecasGeral) * 100).toFixed(1)}% pendente` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Reserva Técnica no CD */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estoque Central (CD / Matriz)
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {metrics.totalPecasReservaCD.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">un</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Reserva para suprimento</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">10% padrão</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Índice de Equilíbrio da Rede */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Equilíbrio da Rede
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              metrics.indiceEquilibrioRede >= 80
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                : metrics.indiceEquilibrioRede >= 60
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/60'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/60'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {metrics.indiceEquilibrioRede}%
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {metrics.indiceEquilibrioRede >= 80 ? 'Harmônico' : metrics.indiceEquilibrioRede >= 60 ? 'Desbalanceado' : 'Crítico'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate" title={metrics.lojaMenosAbastecida ? `Menor: ${metrics.lojaMenosAbastecida.name}` : ''}>
              {metrics.lojaMenosAbastecida 
                ? `Menor fluxo: ${metrics.lojaMenosAbastecida.name} (${metrics.lojaMenosAbastecida.share}%)`
                : 'Todas as lojas abastecidas'}
            </div>
          </div>
        </div>

      </div>

      {/* 3. O Gráfico Comparativo de Distribuição Loja a Loja (O "Coração" do BI) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Distribuição de Peças por Loja
              <span className="text-xs font-normal text-slate-400">
                (Comparativo Real vs. Meta de Cluster)
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identifique rapidamente desbalanceamento entre lojas cheias e lojas com baixo abastecimento
            </p>
          </div>

          {/* Legenda Sóbria */}
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 self-start sm:self-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500 inline-block" />
              Entregues
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-700 inline-block" />
              Previstas
            </span>
          </div>
        </div>

        {/* Lista de Barras de Distribuição das Lojas */}
        <div className="space-y-3 pt-1">
          {displayedStores.map(store => {
            const pctEntregue = maxStorePecas > 0 ? (store.pecasEntregues / maxStorePecas) * 100 : 0;
            const pctPrevista = maxStorePecas > 0 ? (store.pecasPrevistas / maxStorePecas) * 100 : 0;

            const isNovaRussia = store.storeId === 'nova_russia';

            return (
              <div 
                key={store.storeId} 
                className={`p-3 rounded-xl border transition ${
                  isNovaRussia
                    ? 'border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Linha Superior: Nome da Loja, Cluster, Share e Farol */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {store.storeName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      Cluster {store.cluster} ({store.defaultWeight}%)
                    </span>
                    {isNovaRussia && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Observada no áudio
                      </span>
                    )}
                  </div>

                  {/* Badges de Farol de Equilíbrio & Vendas */}
                  <div className="flex items-center gap-2 text-xs">
                    {/* Farol de Equilíbrio */}
                    {store.statusEquilibrio === 'deficit' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        Baixo Abastecimento ({store.desvioPercentual}%)
                      </span>
                    )}
                    {store.statusEquilibrio === 'superavit' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        Acima da Média (+{store.desvioPercentual}%)
                      </span>
                    )}
                    {store.statusEquilibrio === 'equilibrada' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Equilibrada
                      </span>
                    )}

                    {/* Vendas Informadas / Saldo */}
                    {store.saldoSuprimento !== undefined && (
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        store.saldoSuprimento >= 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      }`}>
                        {store.saldoSuprimento >= 0 ? `+${store.saldoSuprimento} un vs vendas` : `${store.saldoSuprimento} un déficit`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso Dupla (Entregues + Previstas) */}
                <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  {/* Entregues */}
                  <div
                    style={{ width: `${Math.min(100, pctEntregue)}%` }}
                    className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500"
                    title={`Entregues: ${store.pecasEntregues.toLocaleString('pt-BR')} un`}
                  />
                  {/* Previstas */}
                  <div
                    style={{ width: `${Math.min(100 - pctEntregue, pctPrevista)}%` }}
                    className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500"
                    title={`Previstas: ${store.pecasPrevistas.toLocaleString('pt-BR')} un`}
                  />
                </div>

                {/* Detalhes Numéricos Rodapé da Linha */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                  <span>
                    Entregues: <strong className="text-slate-700 dark:text-slate-200">{store.pecasEntregues.toLocaleString('pt-BR')} un</strong>
                    {store.pecasPrevistas > 0 && (
                      <span className="text-slate-400 ml-1.5">
                        (+{store.pecasPrevistas.toLocaleString('pt-BR')} previstas)
                      </span>
                    )}
                  </span>
                  <span>
                    Total: <strong className="text-slate-900 dark:text-white font-bold">{store.totalPecas.toLocaleString('pt-BR')} un</strong> ({store.sharePercent}% da rede)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Matriz Temporal Mês a Mês (Janeiro a Dezembro) por Loja */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Histórico Mensal de Peças por Loja ({filter.year})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhe a cadência de envio ao longo dos meses para prever sazonalidade e evitar desabastecimento
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-850/50">
                <th className="py-2.5 px-3">Loja</th>
                <th className="py-2.5 px-2 text-center">Cl.</th>
                {MONTH_NAMES.map(m => (
                  <th key={m.value} className="py-2.5 px-2 text-right font-mono font-bold">
                    {m.label.slice(0, 3)}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right font-mono font-black text-slate-800 dark:text-slate-200">
                  Total {filter.year}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {displayedStores.map(store => {
                const totalYear = store.monthlyPecas.reduce((a, b) => a + b, 0);
                const isNovaRussia = store.storeId === 'nova_russia';

                return (
                  <tr 
                    key={store.storeId}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                      isNovaRussia ? 'bg-indigo-50/30 dark:bg-indigo-950/20 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {store.storeName}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500 font-sans text-[11px]">
                      {store.cluster}
                    </td>
                    {store.monthlyPecas.map((qtd, idx) => (
                      <td 
                        key={idx}
                        className={`py-2.5 px-2 text-right ${
                          qtd > 0 
                            ? 'text-slate-800 dark:text-slate-200 font-medium' 
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        {qtd > 0 ? qtd.toLocaleString('pt-BR') : '-'}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {totalYear.toLocaleString('pt-BR')} un
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Fornecedores de Mercadorias (Cards Clicáveis para Detalhamento de Produtos) */}
      {metrics.topSuppliersToStores.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Fornecedores de Mercadorias ({filter.year})
                  {metrics.isFilteredByStore && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 ml-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                      Filial: {metrics.filteredStoreName}
                    </span>
                  )}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clique no card do fornecedor para visualizar a lista completa de produtos enviados, quantidades e datas
              </p>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60">
              {metrics.topSuppliersToStores.length} {metrics.topSuppliersToStores.length === 1 ? 'fornecedor ativo' : 'fornecedores ativos'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.topSuppliersToStores.map(sup => (
              <button
                key={sup.supplierName}
                type="button"
                onClick={() => setSelectedSupplierModal(sup)}
                className="group p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 hover:bg-white dark:bg-slate-850/60 dark:hover:bg-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer relative overflow-hidden active:scale-[0.98]"
              >
                {/* Indicador visual sutil no hover */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-transparent group-hover:bg-emerald-500 transition-colors" />

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate" title={sup.supplierName}>
                      {sup.supplierName}
                    </span>
                    <span className="shrink-0 text-[10px] font-extrabold font-mono px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                      {sup.totalPecas.toLocaleString('pt-BR')} un
                    </span>
                  </div>

                  {/* Detalhamento físico de peças */}
                  <div className="space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Truck className="w-3 h-3 text-emerald-500" />
                        Entregues:
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold">
                        {sup.pecasEntregues.toLocaleString('pt-BR')} un
                      </strong>
                    </div>

                    {sup.pecasPrevistas > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          Na esteira:
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {sup.pecasPrevistas.toLocaleString('pt-BR')} un
                        </span>
                      </div>
                    )}

                    {/* Termômetro de Confiabilidade (Pontualidade & Rupturas) */}
                    {sup.reliability && (
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            sup.reliability.nivelConfiabilidade === 'excelente'
                              ? 'bg-emerald-500'
                              : sup.reliability.nivelConfiabilidade === 'atencao'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`} />
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                            {sup.reliability.taxaPontualidade}% pontual
                          </span>
                        </div>
                        {sup.reliability.taxaRuptura > 0 && (
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 py-0.2 rounded">
                            {sup.reliability.taxaRuptura}% cortes
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé com CTA de Ação */}
                <div className="pt-2.5 mt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono text-[10px]">
                    {sup.totalProdutosDistintos} {sup.totalProdutosDistintos === 1 ? 'produto' : 'produtos'}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
                    Ver produtos <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Detalhamento de Produtos do Fornecedor */}
      <SupplierProductsModal
        isOpen={Boolean(selectedSupplierModal)}
        onClose={() => setSelectedSupplierModal(null)}
        supplier={selectedSupplierModal}
        storeName={metrics.isFilteredByStore ? metrics.filteredStoreName : undefined}
        year={filter.year}
      />

      {/* Modal de Input de Vendas por Loja */}
      <StoreSalesInputModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        year={filter.year}
        month={filter.month}
        stores={stores}
        currentSales={salesStorage}
        onSaveSales={handleSaveSales}
      />

    </div>
  );
};
