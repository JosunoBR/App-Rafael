import React, { useState, useMemo } from 'react';
import { 
  FolderOpen, 
  Search, 
  Trash2, 
  FileSpreadsheet, 
  ArrowRight, 
  Boxes, 
  PlusCircle,
  PackageCheck,
  Check,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Truck,
  X,
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';
import { calculateOrderTotals } from '../shared/orderCalculationEngine';
import { exportOrderToExcel } from '../utils/excelExporter';
import { toBrDate } from '../utils/masks';
import { PurchaseControlCard } from './PurchaseControlCard';
import { DeleteOrderConfirmModal } from './DeleteOrderConfirmModal';
import { OrderRollbackModal } from './OrderRollbackModal';
import { User } from '../shared/types';
import { canConfirmReceipt, canAuthorizeFinancialRelease, canEditSpecificOrder, canRollbackOrderStatus } from '../shared/permissions';

interface OrderHistoryPageProps {
  orders: PurchaseOrder[];
  currentUser?: User;
  onSelectOrder: (order: PurchaseOrder) => void;
  onDeleteOrder?: (orderId: string, authPayload?: { directorEmail?: string; directorPassword?: string; reason?: string }) => Promise<void> | void;
  onNewOrder: () => void;
  onUpdateOrderStatus?: (order: PurchaseOrder, newStatus: string) => void;
  onNavigateToSeparation?: (order: PurchaseOrder) => void;
  onConfirmReceipt?: (order: PurchaseOrder) => void;
  onAuthorizeFinancial?: (order: PurchaseOrder) => void;
  onRollbackSuccess?: (updatedOrder: PurchaseOrder) => void;
}

type SortField = 'numero' | 'fornecedor' | 'data' | 'itens' | 'pecas' | 'valor' | 'frete' | 'status';
type SortDirection = 'asc' | 'desc' | null;

interface ColumnFilters {
  numero: string;
  fornecedor: string;
  data: string;
  frete: string;
  status: string;
}

const getOrderFreteModalidade = (ord: PurchaseOrder): 'CIF' | 'FOB' | 'Retira' => {
  const explicit = ord.header?.tipoFrete;
  if (explicit === 'FOB' || explicit === 'Retira' || explicit === 'CIF') {
    return explicit;
  }
  const rawFrete = Number(ord.header?.valorFrete ?? ord.header?.valorFreteGlobal ?? 0);
  return rawFrete > 0 ? 'FOB' : 'CIF';
};

const getFreteBadgeClass = (frete: 'CIF' | 'FOB' | 'Retira') => {
  switch (frete) {
    case 'CIF':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    case 'FOB':
      return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    case 'Retira':
      return 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

export const OrderHistoryPage: React.FC<OrderHistoryPageProps> = ({
  orders,
  currentUser,
  onSelectOrder,
  onDeleteOrder,
  onNewOrder,
  onUpdateOrderStatus,
  onNavigateToSeparation,
  onConfirmReceipt,
  onAuthorizeFinancial,
  onRollbackSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('todos');
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [orderToRollback, setOrderToRollback] = useState<PurchaseOrder | null>(null);

  // Ordenação e Filtros por Coluna
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<SortField | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    numero: '',
    fornecedor: '',
    data: '',
    frete: '',
    status: ''
  });

  const handleOpenOrder = (ord: PurchaseOrder) => {
    setOpeningOrderId(ord.header.id);
    const isTransf = ord.header?.supplierId === 'cd_matriz' || 
      String(ord.header?.numeroPedido || '').startsWith('CD-') || 
      String(ord.header?.id || '').startsWith('order_transf_cd_') ||
      (ord.header?.fornecedor && ord.header.fornecedor.toLowerCase().includes('transferência'));

    if (isTransf && onNavigateToSeparation) {
      onNavigateToSeparation(ord);
      return;
    }
    onSelectOrder(ord);
  };

  // Alterna a ordenação de uma coluna (asc -> desc -> limpa)
  const handleSortToggle = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortField(null);
      setSortDirection(null);
    }
  };

  // Fornecedores únicos para o filtro de coluna
  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(o => {
      const fn = (o.header?.fornecedor || '').trim();
      if (fn) {
        map.set(fn, (map.get(fn) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  // Contagem por modalidade de frete
  const freteCounts = useMemo(() => {
    const counts = { CIF: 0, FOB: 0, Retira: 0 };
    orders.forEach(o => {
      const mod = getOrderFreteModalidade(o);
      if (mod in counts) counts[mod]++;
    });
    return counts;
  }, [orders]);

  // Processamento e ordenação dos pedidos
  const processedOrders = useMemo(() => {
    let result = orders.filter(o => {


      // 1. Visibilidade por Perfil (ex: Faturamento vê a partir de Aprovados)
      if (currentUser?.role === 'faturamento') {
        const raw = o.header.status || 'Em Cotação';
        if (raw === 'Em Cotação' || raw === 'Rascunho') return false;
      }

      // 2. Busca Global
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSearch = 
          o.header.numeroPedido.toLowerCase().includes(q) ||
          o.header.fornecedor.toLowerCase().includes(q) ||
          (o.header.vendedor && o.header.vendedor.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 3. Aba de Status
      const rawStatus = o.header.status || 'Em Cotação';
      const currentStatus = (rawStatus === 'Em Distribuição') ? 'Em Separação' : (rawStatus === 'Rascunho' ? 'Em Cotação' : rawStatus);
      if (selectedStatusTab !== 'todos' && currentStatus !== selectedStatusTab) {
        return false;
      }

      // 4. Filtro da Coluna: Número
      if (columnFilters.numero.trim()) {
        if (!o.header.numeroPedido.toLowerCase().includes(columnFilters.numero.toLowerCase())) {
          return false;
        }
      }

      // 5. Filtro da Coluna: Fornecedor / Representante
      if (columnFilters.fornecedor.trim()) {
        const qFornec = columnFilters.fornecedor.toLowerCase();
        const matchesFornec = 
          o.header.fornecedor.toLowerCase().includes(qFornec) ||
          (o.header.vendedor && o.header.vendedor.toLowerCase().includes(qFornec));
        if (!matchesFornec) return false;
      }

      // 6. Filtro da Coluna: Data
      if (columnFilters.data.trim()) {
        const qData = columnFilters.data.trim();
        const formattedDate = toBrDate(o.header.dataPedido || o.header.createdAt);
        const rawDate = String(o.header.dataPedido || '');
        if (!formattedDate.includes(qData) && !rawDate.includes(qData)) {
          return false;
        }
      }

      // 7. Filtro da Coluna: Frete
      if (columnFilters.frete && columnFilters.frete !== 'todos') {
        const modalidade = getOrderFreteModalidade(o);
        if (modalidade !== columnFilters.frete) {
          return false;
        }
      }

      // 8. Filtro da Coluna: Status
      if (columnFilters.status && columnFilters.status !== 'todos') {
        if (currentStatus !== columnFilters.status) {
          return false;
        }
      }

      return true;
    });

    // Ordenação
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'numero':
            cmp = (a.header.numeroPedido || '').localeCompare(b.header.numeroPedido || '', undefined, { numeric: true });
            break;
          case 'fornecedor':
            cmp = (a.header.fornecedor || '').localeCompare(b.header.fornecedor || '');
            break;
          case 'data': {
            const dateA = new Date(a.header.dataPedido || a.header.createdAt || 0).getTime();
            const dateB = new Date(b.header.dataPedido || b.header.createdAt || 0).getTime();
            cmp = dateA - dateB;
            break;
          }
          case 'itens': {
            const itensA = calculateOrderTotals(a).validItemsCount;
            const itensB = calculateOrderTotals(b).validItemsCount;
            cmp = itensA - itensB;
            break;
          }
          case 'pecas': {
            const pecasA = calculateOrderTotals(a).totalPecas;
            const pecasB = calculateOrderTotals(b).totalPecas;
            cmp = pecasA - pecasB;
            break;
          }
          case 'valor': {
            const valA = calculateOrderTotals(a).totalGeral;
            const valB = calculateOrderTotals(b).totalGeral;
            cmp = valA - valB;
            break;
          }
          case 'frete': {
            const freteA = getOrderFreteModalidade(a);
            const freteB = getOrderFreteModalidade(b);
            cmp = freteA.localeCompare(freteB);
            break;
          }
          case 'status': {
            const statA = a.header.status || 'Em Cotação';
            const statB = b.header.status || 'Em Cotação';
            cmp = statA.localeCompare(statB);
            break;
          }
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [orders, searchTerm, selectedStatusTab, columnFilters, sortField, sortDirection]);

  const totalPedidos = orders.length;

  const countByStatus: Record<string, number> = {
    todos: orders.filter(o => currentUser?.role !== 'faturamento' || (o.header.status !== 'Em Cotação' && o.header.status !== 'Rascunho')).length,
    'Em Cotação': orders.filter(o => (o.header.status || 'Em Cotação') === 'Em Cotação' || o.header.status === 'Rascunho').length,
    'Aprovado': orders.filter(o => o.header.status === 'Aprovado').length,
    'Em Separação': orders.filter(o => o.header.status === 'Em Separação' || o.header.status === 'Em Distribuição').length,
    'Faturamento': orders.filter(o => o.header.status === 'Faturamento').length,
    'Finalizado': orders.filter(o => o.header.status === 'Finalizado').length
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Finalizado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Faturamento':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Em Separação':
      case 'Em Distribuição':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'Aprovado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Em Cotação':
      default:
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
  };

  const hasActiveColumnFilters = Boolean(
    columnFilters.numero ||
    columnFilters.fornecedor ||
    columnFilters.data ||
    columnFilters.frete ||
    columnFilters.status
  );

  const handleClearAllColumnFilters = () => {
    setColumnFilters({
      numero: '',
      fornecedor: '',
      data: '',
      frete: '',
      status: ''
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header da Página */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Histórico & Arquivo de Pedidos
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                {totalPedidos} {totalPedidos === 1 ? 'Pedido' : 'Pedidos'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Arquivo central de compras salvas no banco de dados SQLite com controle de status e romaneios
            </p>
          </div>
        </div>

        <button
          onClick={onNewOrder}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Criar Novo Pedido
        </button>
      </div>

      {/* 2. Card de Controle de Compras (Filtros por Mês, Ano etc., Médias, Extremos e Navegação) */}
      <PurchaseControlCard
        orders={orders}
        onSelectOrder={onSelectOrder}
      />

      {/* 3. Abas de Status da Esteira Operacional Oficial (5 Etapas) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedStatusTab('todos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'todos'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>Todos os Pedidos</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 dark:bg-white/20">
            {countByStatus.todos}
          </span>
        </button>

        {currentUser?.role !== 'faturamento' && (
          <button
            onClick={() => setSelectedStatusTab('Em Cotação')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              selectedStatusTab === 'Em Cotação'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50'
            }`}
          >
            <span>🟡 1. Em Cotação</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {countByStatus['Em Cotação']}
            </span>
          </button>
        )}

        <button
          onClick={() => setSelectedStatusTab('Aprovado')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Aprovado'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-50'
          }`}
        >
          <span>🔵 2. Aprovados</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Aprovado']}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('Em Separação')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Em Separação'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50'
          }`}
        >
          <span>🟣 3. Separação</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Em Separação'] || 0}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('Faturamento')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Faturamento'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50'
          }`}
        >
          <span>🟠 4. Faturamento</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Faturamento'] || 0}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('Finalizado')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            selectedStatusTab === 'Finalizado'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50'
          }`}
        >
          <span>🟢 5. Finalizados</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {countByStatus['Finalizado'] || 0}
          </span>
        </button>
      </div>

      {/* 4. Tabela de Pedidos Salvos */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
        
        {/* Barra Superior: Busca Global e Status dos Filtros */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número (ex: PED-0001), fornecedor ou vendedor..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Exibindo <strong className="text-slate-900 dark:text-white font-mono">{processedOrders.length}</strong> de <strong className="font-mono">{orders.length}</strong> pedidos
            </span>
            {(sortField || hasActiveColumnFilters) && (
              <button
                onClick={() => {
                  setSortField(null);
                  setSortDirection(null);
                  handleClearAllColumnFilters();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 transition cursor-pointer"
                title="Limpar todas as ordenações e filtros de coluna"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Resetar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Chips de Filtros Ativos */}
        {(hasActiveColumnFilters || searchTerm) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs border-t border-slate-100 dark:border-slate-700/50">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">Filtros ativos:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                Busca: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-500 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {columnFilters.numero && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800">
                Nº: {columnFilters.numero}
                <button onClick={() => setColumnFilters(p => ({ ...p, numero: '' }))} className="hover:text-rose-500 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {columnFilters.fornecedor && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800">
                Fornecedor: {columnFilters.fornecedor}
                <button onClick={() => setColumnFilters(p => ({ ...p, fornecedor: '' }))} className="hover:text-rose-500 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {columnFilters.data && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800">
                Data: {columnFilters.data}
                <button onClick={() => setColumnFilters(p => ({ ...p, data: '' }))} className="hover:text-rose-500 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {columnFilters.frete && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800">
                Frete: {columnFilters.frete}
                <button onClick={() => setColumnFilters(p => ({ ...p, frete: '' }))} className="hover:text-rose-500 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {columnFilters.status && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800">
                Status: {columnFilters.status}
                <button onClick={() => setColumnFilters(p => ({ ...p, status: '' }))} className="hover:text-rose-500 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Backdrop para fechar dropdowns de filtro abertos */}
        {activeFilterDropdown && (
          <div 
            className="fixed inset-0 z-30 bg-transparent" 
            onClick={() => setActiveFilterDropdown(null)} 
          />
        )}

        {/* Tabela de Pedidos com Filtro nos Títulos das Colunas */}
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                
                {/* 1. PEDIDO / NÚMERO */}
                <th className="py-3 px-4 whitespace-nowrap min-w-[130px] relative">
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleSortToggle('numero')}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
                      title="Clique para ordenar por número do pedido"
                    >
                      <span>Pedido / Número</span>
                      {sortField === 'numero' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterDropdown(activeFilterDropdown === 'numero' ? null : 'numero');
                      }}
                      className={`p-1 rounded-md transition cursor-pointer relative ${
                        columnFilters.numero ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 ring-1 ring-indigo-400/50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                      title="Filtrar por número do pedido"
                    >
                      <Filter className="w-3 h-3" />
                      {columnFilters.numero && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                    </button>
                  </div>

                  {/* Popover de Filtro: Número */}
                  {activeFilterDropdown === 'numero' && (
                    <div className="absolute top-full left-4 mt-2 z-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px] normal-case text-slate-800 dark:text-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span>Filtrar Pedido</span>
                        {columnFilters.numero && (
                          <button onClick={() => setColumnFilters(p => ({ ...p, numero: '' }))} className="text-[10px] text-rose-500 hover:underline cursor-pointer">
                            Limpar
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={columnFilters.numero}
                        onChange={(e) => setColumnFilters(p => ({ ...p, numero: e.target.value }))}
                        placeholder="Ex: PED-140..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden"
                      />
                      <div className="flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          onClick={() => { setSortField('numero'); setSortDirection('asc'); }}
                          className={`flex-1 py-1 text-[11px] rounded-md font-semibold cursor-pointer ${sortField === 'numero' && sortDirection === 'asc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                        >
                          A → Z
                        </button>
                        <button
                          onClick={() => { setSortField('numero'); setSortDirection('desc'); }}
                          className={`flex-1 py-1 text-[11px] rounded-md font-semibold cursor-pointer ${sortField === 'numero' && sortDirection === 'desc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                        >
                          Z → A
                        </button>
                      </div>
                    </div>
                  )}
                </th>

                {/* 2. FORNECEDOR */}
                <th className="py-3 px-3 min-w-[210px] relative">
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleSortToggle('fornecedor')}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
                      title="Clique para ordenar por fornecedor"
                    >
                      <span>Fornecedor</span>
                      {sortField === 'fornecedor' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterDropdown(activeFilterDropdown === 'fornecedor' ? null : 'fornecedor');
                      }}
                      className={`p-1 rounded-md transition cursor-pointer relative ${
                        columnFilters.fornecedor ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 ring-1 ring-indigo-400/50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                      title="Filtrar por fornecedor"
                    >
                      <Filter className="w-3 h-3" />
                      {columnFilters.fornecedor && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                    </button>
                  </div>

                  {/* Popover de Filtro: Fornecedor */}
                  {activeFilterDropdown === 'fornecedor' && (
                    <div className="absolute top-full left-3 mt-2 z-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-w-[250px] max-w-[300px] normal-case text-slate-800 dark:text-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span>Filtrar Fornecedor</span>
                        {columnFilters.fornecedor && (
                          <button onClick={() => setColumnFilters(p => ({ ...p, fornecedor: '' }))} className="text-[10px] text-rose-500 hover:underline cursor-pointer">
                            Limpar
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={columnFilters.fornecedor}
                        onChange={(e) => setColumnFilters(p => ({ ...p, fornecedor: e.target.value }))}
                        placeholder="Digitar nome ou rep..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-700/40 text-xs">
                        {uniqueSuppliers
                          .filter(s => !columnFilters.fornecedor || s.name.toLowerCase().includes(columnFilters.fornecedor.toLowerCase()))
                          .map(s => (
                            <button
                              key={s.name}
                              onClick={() => {
                                setColumnFilters(p => ({ ...p, fornecedor: s.name }));
                                setActiveFilterDropdown(null);
                              }}
                              className="w-full text-left py-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded flex items-center justify-between cursor-pointer transition"
                            >
                              <span className="truncate font-medium">{s.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 ml-2 shrink-0">{s.count}</span>
                            </button>
                          ))}
                      </div>
                      <div className="flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          onClick={() => { setSortField('fornecedor'); setSortDirection('asc'); }}
                          className={`flex-1 py-1 text-[11px] rounded-md font-semibold cursor-pointer ${sortField === 'fornecedor' && sortDirection === 'asc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                        >
                          A → Z
                        </button>
                        <button
                          onClick={() => { setSortField('fornecedor'); setSortDirection('desc'); }}
                          className={`flex-1 py-1 text-[11px] rounded-md font-semibold cursor-pointer ${sortField === 'fornecedor' && sortDirection === 'desc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                        >
                          Z → A
                        </button>
                      </div>
                    </div>
                  )}
                </th>

                {/* 3. DATA */}
                <th className="py-3 px-3 whitespace-nowrap min-w-[115px] relative">
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleSortToggle('data')}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
                      title="Clique para ordenar por data"
                    >
                      <span>Data</span>
                      {sortField === 'data' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterDropdown(activeFilterDropdown === 'data' ? null : 'data');
                      }}
                      className={`p-1 rounded-md transition cursor-pointer relative ${
                        columnFilters.data ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 ring-1 ring-indigo-400/50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                      title="Filtrar por data"
                    >
                      <Filter className="w-3 h-3" />
                      {columnFilters.data && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                    </button>
                  </div>

                  {/* Popover de Filtro: Data */}
                  {activeFilterDropdown === 'data' && (
                    <div className="absolute top-full left-3 mt-2 z-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-w-[210px] normal-case text-slate-800 dark:text-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span>Filtrar por Data</span>
                        {columnFilters.data && (
                          <button onClick={() => setColumnFilters(p => ({ ...p, data: '' }))} className="text-[10px] text-rose-500 hover:underline cursor-pointer">
                            Limpar
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={columnFilters.data}
                        onChange={(e) => setColumnFilters(p => ({ ...p, data: e.target.value }))}
                        placeholder="Ex: 15/09 ou 2026..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden"
                      />
                      <div className="flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          onClick={() => { setSortField('data'); setSortDirection('desc'); }}
                          className={`flex-1 py-1 text-[11px] rounded-md font-semibold cursor-pointer ${sortField === 'data' && sortDirection === 'desc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                        >
                          Recentes
                        </button>
                        <button
                          onClick={() => { setSortField('data'); setSortDirection('asc'); }}
                          className={`flex-1 py-1 text-[11px] rounded-md font-semibold cursor-pointer ${sortField === 'data' && sortDirection === 'asc' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                        >
                          Antigos
                        </button>
                      </div>
                    </div>
                  )}
                </th>

                {/* 4. ITENS */}
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[75px]">
                  <button
                    onClick={() => handleSortToggle('itens')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition mx-auto"
                    title="Clique para ordenar por quantidade de itens"
                  >
                    <span>Itens</span>
                    {sortField === 'itens' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                </th>

                {/* 5. VOLUME PEÇAS */}
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[115px]">
                  <button
                    onClick={() => handleSortToggle('pecas')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition ml-auto"
                    title="Clique para ordenar por volume de peças"
                  >
                    <span>Volume Peças</span>
                    {sortField === 'pecas' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                </th>

                {/* 6. VALOR TOTAL (R$) */}
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[135px]">
                  <button
                    onClick={() => handleSortToggle('valor')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition ml-auto"
                    title="Clique para ordenar por valor total"
                  >
                    <span>Valor Total (R$)</span>
                    {sortField === 'valor' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                </th>

                {/* 7. FRETE (NOVA COLUNA SOLICITADA) */}
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[115px] relative">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleSortToggle('frete')}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
                      title="Clique para ordenar por modalidade de frete"
                    >
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Frete</span>
                      {sortField === 'frete' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterDropdown(activeFilterDropdown === 'frete' ? null : 'frete');
                      }}
                      className={`p-1 rounded-md transition cursor-pointer relative ${
                        columnFilters.frete ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 ring-1 ring-indigo-400/50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                      title="Filtrar por modalidade de frete"
                    >
                      <Filter className="w-3 h-3" />
                      {columnFilters.frete && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                    </button>
                  </div>

                  {/* Popover de Filtro: Frete */}
                  {activeFilterDropdown === 'frete' && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-w-[190px] normal-case text-slate-800 dark:text-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span>Modalidade Frete</span>
                        {columnFilters.frete && (
                          <button onClick={() => setColumnFilters(p => ({ ...p, frete: '' }))} className="text-[10px] text-rose-500 hover:underline cursor-pointer">
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <button
                          onClick={() => { setColumnFilters(p => ({ ...p, frete: '' })); setActiveFilterDropdown(null); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer font-medium transition ${!columnFilters.frete ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'}`}
                        >
                          <span>Todos</span>
                          <span className="font-mono text-[10px] text-slate-400">{orders.length}</span>
                        </button>
                        <button
                          onClick={() => { setColumnFilters(p => ({ ...p, frete: 'CIF' })); setActiveFilterDropdown(null); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer font-bold transition ${columnFilters.frete === 'CIF' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-emerald-700 dark:text-emerald-400'}`}
                        >
                          <span>CIF (Fornecedor)</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">{freteCounts.CIF}</span>
                        </button>
                        <button
                          onClick={() => { setColumnFilters(p => ({ ...p, frete: 'FOB' })); setActiveFilterDropdown(null); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer font-bold transition ${columnFilters.frete === 'FOB' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-amber-700 dark:text-amber-400'}`}
                        >
                          <span>FOB (Comprador)</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">{freteCounts.FOB}</span>
                        </button>
                        <button
                          onClick={() => { setColumnFilters(p => ({ ...p, frete: 'Retira' })); setActiveFilterDropdown(null); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer font-bold transition ${columnFilters.frete === 'Retira' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-sky-700 dark:text-sky-400'}`}
                        >
                          <span>Retira</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">{freteCounts.Retira}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </th>

                {/* 8. STATUS */}
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[135px] relative">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleSortToggle('status')}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
                      title="Clique para ordenar por status"
                    >
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterDropdown(activeFilterDropdown === 'status' ? null : 'status');
                      }}
                      className={`p-1 rounded-md transition cursor-pointer relative ${
                        columnFilters.status ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 ring-1 ring-indigo-400/50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                      title="Filtrar por status"
                    >
                      <Filter className="w-3 h-3" />
                      {columnFilters.status && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                    </button>
                  </div>

                  {/* Popover de Filtro: Status */}
                  {activeFilterDropdown === 'status' && (
                    <div className="absolute top-full right-0 mt-2 z-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-w-[210px] normal-case text-slate-800 dark:text-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span>Filtrar Status</span>
                        {columnFilters.status && (
                          <button onClick={() => setColumnFilters(p => ({ ...p, status: '' }))} className="text-[10px] text-rose-500 hover:underline cursor-pointer">
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <button
                          onClick={() => { setColumnFilters(p => ({ ...p, status: '' })); setActiveFilterDropdown(null); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer font-medium transition ${!columnFilters.status ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'}`}
                        >
                          <span>Todos</span>
                          <span className="font-mono text-[10px] text-slate-400">{orders.length}</span>
                        </button>
                        {(['Em Cotação', 'Aprovado', 'Em Distribuição', 'Finalizado'] as const).map(st => (
                          <button
                            key={st}
                            onClick={() => { setColumnFilters(p => ({ ...p, status: st })); setActiveFilterDropdown(null); }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs font-semibold transition ${columnFilters.status === st ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'}`}
                          >
                            <span>{st}</span>
                            <span className="font-mono text-[10px] text-slate-500">{countByStatus[st] || 0}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </th>

                {/* 9. AVANÇAR ESTEIRA */}
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[280px]">Avançar Esteira</th>

                {/* 10. AÇÕES */}
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[120px]">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {processedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-1" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Nenhum pedido encontrado</p>
                      <p className="text-xs text-slate-400">Tente ajustar a busca ou os filtros aplicados nas colunas.</p>
                      {(hasActiveColumnFilters || searchTerm) && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            handleClearAllColumnFilters();
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Limpar todos os filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                processedOrders.map((ord) => {
                  const totals = calculateOrderTotals(ord);
                  const totalPedido = totals.totalGeral;
                  const totalPecas = totals.totalPecas;
                  const statusAtual = ord.header.status || 'Em Cotação';
                  const modalidadeFrete = getOrderFreteModalidade(ord);
                  const rawFreteVal = Number(ord.header?.valorFrete ?? ord.header?.valorFreteGlobal ?? 0);

                  return (
                    <tr key={ord.header.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                      
                      {/* Pedido / Número */}
                      <td 
                        className="py-3.5 px-4 font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                        onClick={() => handleOpenOrder(ord)}
                        title={canEditSpecificOrder(currentUser?.role, ord.header.status) ? "Clique para editar este pedido" : "Clique para visualizar este pedido"}
                      >
                        <span className="underline decoration-dotted underline-offset-4">{ord.header.numeroPedido}</span>
                      </td>

                      {/* Fornecedor */}
                      <td 
                        className="py-3.5 px-3 cursor-pointer hover:text-emerald-600 transition"
                        onClick={() => handleOpenOrder(ord)}
                        title={canEditSpecificOrder(currentUser?.role, ord.header.status) ? "Clique para editar este pedido" : "Clique para visualizar este pedido"}
                      >
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition">
                          {ord.header.fornecedor}
                        </div>
                        {ord.header.vendedor && (
                          <div className="text-[11px] text-slate-400">
                            Rep: {ord.header.vendedor}
                          </div>
                        )}
                      </td>

                      {/* Data */}
                      <td className="py-3.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                        {toBrDate(ord.header.dataPedido || ord.header.createdAt)}
                      </td>

                      {/* Itens */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {totals.validItemsCount}
                      </td>

                      {/* Volume Peças */}
                      <td className="py-3.5 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {totalPecas.toLocaleString('pt-BR')} un
                      </td>

                      {/* Valor Total */}
                      <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        R$ {totalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Modalidade Frete (NOVA COLUNA) */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold border uppercase tracking-wider ${getFreteBadgeClass(modalidadeFrete)}`}>
                          <Truck className="w-3 h-3" />
                          <span>{modalidadeFrete}</span>
                        </span>
                        {modalidadeFrete === 'FOB' && rawFreteVal > 0 && (
                          <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                            R$ {rawFreteVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusBadgeClass(statusAtual)}`}>
                          {statusAtual}
                        </span>
                        {/* Badges de Recebimento e Boletos */}
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          {ord.header.recebidoMatriz ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Recebido em: {toBrDate(ord.header.dataRecebimentoMatriz || '')}
                            </span>
                          ) : (statusAtual !== 'Em Cotação' && statusAtual !== 'Rascunho') ? (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              Aguardando entrega
                            </span>
                          ) : null}
                          {ord.header.recebidoMatriz && (
                            ord.header.boletosLiberados ? (
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                💳 Boletos liberados
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400">
                                🔒 Boletos retidos
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Botão de Avanço Rápido de Status da Esteira */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-grid grid-cols-[100px_160px] gap-2 items-center justify-center text-center">
                          {/* Coluna 1: Ação da Esteira (Largura fixa e alinhada com cores suaves) */}
                          <div className="w-[100px] flex items-center justify-center">
                            {statusAtual === 'Em Cotação' && onUpdateOrderStatus && (
                              <button
                                onClick={() => onUpdateOrderStatus(ord, 'Aprovado')}
                                className="w-full h-7 px-2 bg-blue-50/90 hover:bg-blue-100/90 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-98"
                                title="Aprovar este pedido e encaminhar para a distribuição do Depósito"
                              >
                                <span>✓ Aprovar</span>
                                <ArrowRight className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                              </button>
                            )}
                            {statusAtual === 'Aprovado' && (
                              <button
                                onClick={() => onNavigateToSeparation ? onNavigateToSeparation(ord) : onSelectOrder(ord)}
                                className="w-full h-7 px-2 bg-blue-50/90 hover:bg-blue-100/90 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-98"
                                title="Abrir matriz de rateio por loja no Depósito"
                              >
                                <Boxes className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                <span>Distribuir CD</span>
                              </button>
                            )}
                            {(statusAtual === 'Em Separação' || statusAtual === 'Em Distribuição') && (
                              <button
                                onClick={() => onNavigateToSeparation ? onNavigateToSeparation(ord) : onSelectOrder(ord)}
                                className="w-full h-7 px-2 bg-purple-50/90 hover:bg-purple-100/90 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 rounded-lg text-[11px] font-semibold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                                title="Conferir separação física na Doca e liberar p/ Faturamento"
                              >
                                <PackageCheck className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                                <span>Separar Doca</span>
                              </button>
                            )}
                            {statusAtual === 'Faturamento' && (
                              <span className="w-full h-7 text-amber-700 dark:text-amber-300 text-[10.5px] font-medium inline-flex items-center justify-center gap-1 border border-amber-200/60 dark:border-amber-800/40 rounded-lg bg-amber-50/40 dark:bg-amber-950/20">
                                <CreditCard className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Faturamento
                              </span>
                            )}
                            {statusAtual === 'Finalizado' && (
                              <span className="w-full h-7 text-slate-500 dark:text-slate-400 text-[11px] font-medium inline-flex items-center justify-center gap-1 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-lg">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Concluído
                              </span>
                            )}
                          </div>

                          {/* Coluna 2: Ação de Recebimento Físico / Financeiro (Largura fixa com cores suaves) */}
                          <div className="w-[160px] flex items-center justify-center">
                            {!ord.header.recebidoMatriz && ord.header.status !== 'Finalizado' && onConfirmReceipt && canConfirmReceipt(currentUser?.role, ord.header.status) ? (
                              <button
                                onClick={() => onConfirmReceipt(ord)}
                                className="w-full h-7 px-2 bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg text-[10.5px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-98"
                                title="Registrar a entrega física do fornecedor na Matriz"
                              >
                                <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Confirmar Recebimento</span>
                              </button>
                            ) : !ord.header.boletosLiberados && onAuthorizeFinancial && canAuthorizeFinancialRelease(currentUser?.role, ord.header.status) ? (
                              <button
                                onClick={() => onAuthorizeFinancial(ord)}
                                className="w-full h-7 px-2 bg-amber-50/90 hover:bg-amber-100/90 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 rounded-lg text-[10.5px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-98"
                                title="Liberar os boletos no Contas a Pagar e finalizar o pedido"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>Liberar Boletos</span>
                              </button>
                            ) : ord.header.boletosLiberados ? (
                              <span className="w-full h-7 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-medium inline-flex items-center justify-center gap-1 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Boletos Liberados ✓
                              </span>
                            ) : ord.header.recebidoMatriz ? (
                              <span className="w-full h-7 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-medium inline-flex items-center justify-center gap-1 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Recebido Matriz ✓
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          <button
                            onClick={() => handleOpenOrder(ord)}
                            disabled={openingOrderId === ord.header.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 active:scale-95 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                            title={canEditSpecificOrder(currentUser?.role, ord.header.status) ? "Abrir este pedido para edição" : "Visualizar detalhes do pedido (Somente leitura)"}
                          >
                            {openingOrderId === ord.header.id ? (
                              <>
                                <span className="inline-block w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                <span>Abrindo...</span>
                              </>
                            ) : (
                              <>
                                <span>{canEditSpecificOrder(currentUser?.role, ord.header.status) ? 'Editar' : 'Visualizar'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => exportOrderToExcel(ord)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                            title="Exportar Planilha Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          {/* Botão de Retrocesso (Diretoria) para pedidos além de Cotação */}
                          {canRollbackOrderStatus(currentUser) && statusAtual !== 'Em Cotação' && statusAtual !== 'Rascunho' && (
                            <button
                              onClick={() => setOrderToRollback(ord)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                              title="Retroceder etapa deste pedido (Diretoria)"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {onDeleteOrder && (
                            <button
                              onClick={() => setOrderToDelete(ord)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Excluir este pedido com senha de Diretoria"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal Seguro de Confirmação com Senha de Diretoria e Auditoria */}
      <DeleteOrderConfirmModal
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        order={orderToDelete}
        currentUser={currentUser}
        onConfirm={async (authPayload) => {
          if (orderToDelete && onDeleteOrder) {
            await onDeleteOrder(orderToDelete.id || orderToDelete.header.id, authPayload);
            setOrderToDelete(null);
          }
        }}
      />

      {/* Modal de Retrocesso Seguro de Status (Diretoria) */}
      <OrderRollbackModal
        isOpen={Boolean(orderToRollback)}
        onClose={() => setOrderToRollback(null)}
        order={orderToRollback}
        onSuccess={(updatedOrder) => {
          if (onRollbackSuccess) {
            onRollbackSuccess(updatedOrder);
          } else if (onUpdateOrderStatus) {
            onUpdateOrderStatus(updatedOrder, updatedOrder.header.status);
          }
          setOrderToRollback(null);
        }}
      />

    </div>
  );
};
