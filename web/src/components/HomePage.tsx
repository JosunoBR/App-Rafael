import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  PackageCheck, 
  Warehouse, 
  Boxes, 
  History, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Search,
  ShieldAlert,
  Smartphone,
  Calendar,
  Package,
  Layers,
  FileEdit,
  ExternalLink,
  Store,
  Sparkles,
  AlertCircle,
  Truck,
  CreditCard
} from 'lucide-react';
import { PurchaseOrder, User, Supplier, StoreConfig, CentralStockItem, Product } from '../shared/types';
import { LOGO_MEGA12_BASE64 } from '../assets/logoBase64';
import { ActiveNavTab, canAccessTab, canCreateOrEditOrders, canAuthorizeFinancialRelease, canConfirmReceipt } from '../shared/permissions';
import { toBrDate } from '../utils/masks';

interface HomePageProps {
  currentUser: User;
  savedOrders: PurchaseOrder[];
  draftOrder: PurchaseOrder | null;
  suppliers: Supplier[];
  products?: Product[];
  stores: StoreConfig[];
  centralStock?: CentralStockItem[];
  onNavigate: (tab: ActiveNavTab) => void;
  onNewOrder: () => void;
  onContinueDraft: () => void;
  onDiscardDraft: () => void;
  onSelectOrder: (order: PurchaseOrder) => void;
  onSwitchViewMode: (mode: 'desktop' | 'mobile_purchases' | 'mobile_separation') => void;
  onConfirmReceipt?: (order: PurchaseOrder) => void;
  onAuthorizeFinancial?: (order: PurchaseOrder) => void;
}

type TabFilter = 'todos' | 'Em Cotação' | 'Aprovado' | 'Em Distribuição' | 'Em Separação' | 'Finalizado';

export const HomePage: React.FC<HomePageProps> = ({
  currentUser,
  savedOrders,
  draftOrder,
  suppliers,
  products = [],
  stores,
  centralStock = [],
  onNavigate,
  onNewOrder,
  onContinueDraft,
  onDiscardDraft,
  onSelectOrder,
  onSwitchViewMode,
  onConfirmReceipt,
  onAuthorizeFinancial
}) => {
  const [activeTab, setActiveTab] = useState<TabFilter>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const canAccessOrders = canCreateOrEditOrders(currentUser.role);
  const canAccessStock = canAccessTab(currentUser.role, 'stock');

  // Saudação dinâmica por horário
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Papel formatado para exibição executiva
  const getRoleLabel = () => {
    switch (currentUser.role) {
      case 'diretoria':
        return 'Diretoria Executiva';
      case 'comprador':
        return 'Central de Compras';
      case 'deposito':
        return 'Depósito Central CD';
      case 'separacao':
        return 'Conferência de Doca';
      default:
        return 'Operação';
    }
  };

  // Verifica se há rascunho em aberto
  const hasValidDraft = Boolean(
    draftOrder && (
      (draftOrder.items && draftOrder.items.length > 0) || 
      (draftOrder.header.fornecedor && draftOrder.header.fornecedor.trim() !== '')
    )
  );

  const draftItemCount = draftOrder?.items?.length || 0;
  const draftTotalVal = draftOrder?.items?.reduce((sum, it) => sum + (it.valorTotalBruto || 0), 0) || 0;

  // --- Indicadores Consolidados (Pulse KPIs) ---
  // 1. Pedidos em Fluxo Ativo
  const pedidosEmFluxo = useMemo(() => {
    return savedOrders.filter(o => o.header.status !== 'Finalizado');
  }, [savedOrders]);

  const valorTotalEmFluxo = useMemo(() => {
    return pedidosEmFluxo.reduce((sum, ord) => {
      return sum + (ord.items?.reduce((s, it) => s + (it.valorTotalBruto || 0), 0) || 0);
    }, 0);
  }, [pedidosEmFluxo]);

  // 2. Pedidos na Doca / Separação
  const pedidosNaDoca = useMemo(() => {
    return savedOrders.filter(o => o.header.status === 'Em Separação' || o.header.status === 'Aprovado');
  }, [savedOrders]);

  const totalPecasNaDoca = useMemo(() => {
    return pedidosNaDoca.reduce((acc, ord) => {
      return acc + (ord.items?.reduce((s, it) => s + (it.qtdTotalUnidades || 0), 0) || 0);
    }, 0);
  }, [pedidosNaDoca]);

  // 3. Acuracidade & Avarias da Doca
  const { pedidosComAvarias, totalPecasAvariadas } = useMemo(() => {
    let countAvarias = 0;
    const comAvariaList: PurchaseOrder[] = [];

    savedOrders.forEach(ord => {
      if (ord.inspection?.possuiAvarias && ord.inspection.avarias && ord.inspection.avarias.length > 0) {
        comAvariaList.push(ord);
        ord.inspection.avarias.forEach(av => {
          const pack = ord.items?.find(it => it.id === av.itemId)?.qtdNoPacote || 1;
          const units = (av.unidadeMedida === 'CX' || av.unidadeMedida === 'PCT') ? (av.quantidade * pack) : av.quantidade;
          countAvarias += (Number(units) || 0);
        });
      }
    });

    return { pedidosComAvarias: comAvariaList, totalPecasAvariadas: countAvarias };
  }, [savedOrders]);

  // 4. Estoque Central CD
  const totalUnidadesEstoqueCD = useMemo(() => {
    return centralStock.reduce((acc, it) => acc + (it.saldoUnidades || 0), 0);
  }, [centralStock]);

  // Contagens por status da Esteira Operacional
  const countByStatus = useMemo(() => {
    return {
      todos: savedOrders.length,
      'Em Cotação': savedOrders.filter(o => (o.header.status || 'Em Cotação') === 'Em Cotação' || o.header.status === 'Rascunho').length,
      'Aprovado': savedOrders.filter(o => o.header.status === 'Aprovado').length,
      'Em Distribuição': savedOrders.filter(o => o.header.status === 'Em Distribuição').length,
      'Em Separação': savedOrders.filter(o => o.header.status === 'Em Separação').length,
      'Finalizado': savedOrders.filter(o => o.header.status === 'Finalizado').length,
    };
  }, [savedOrders]);

  // Pedidos recebidos fisicamente na matriz aguardando liberação de boletos pela Diretoria
  const pedidosAguardandoBoletos = useMemo(() => {
    return savedOrders.filter(o => o.header.recebidoMatriz && !o.header.boletosLiberados);
  }, [savedOrders]);

  // Pedidos aprovados aguardando recebimento físico na Matriz
  const pedidosAguardandoEntrega = useMemo(() => {
    return savedOrders.filter(o => 
      (o.header.status === 'Aprovado' || o.header.status === 'Em Distribuição') && 
      !o.header.recebidoMatriz &&
      o.header.supplierId !== 'cd_matriz'
    );
  }, [savedOrders]);

  // Filtragem da Fila de Pedidos
  const filteredOrders = useMemo(() => {
    let list = [...savedOrders];

    if (!canAccessOrders) {
      list = list.filter(o => 
        o.header.status === 'Em Separação' || 
        o.header.status === 'Aprovado' || 
        o.header.status === 'Em Distribuição' || 
        o.header.status === 'Finalizado'
      );
    }

    if (activeTab !== 'todos') {
      if (activeTab === 'Em Cotação') {
        list = list.filter(o => (o.header.status || 'Em Cotação') === 'Em Cotação' || o.header.status === 'Rascunho');
      } else {
        list = list.filter(o => o.header.status === activeTab);
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o => 
        o.header.numeroPedido.toLowerCase().includes(q) || 
        (o.header.fornecedor && o.header.fornecedor.toLowerCase().includes(q))
      );
    }

    return list;
  }, [savedOrders, canAccessOrders, activeTab, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Finalizado':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Em Separação':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'Em Distribuição':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      case 'Aprovado':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'Cancelado':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
  };

  const getActionButtonLabel = (status: string) => {
    if (status === 'Em Separação' || status === 'Aprovado') return 'Conferir Doca';
    if (status === 'Em Distribuição') return 'Distribuir CD';
    if (status === 'Finalizado') return 'Ver Romaneio';
    return canAccessOrders ? 'Abrir Cotação' : 'Visualizar';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header do Cockpit Executivo */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-10 w-56 h-56 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/90 border border-emerald-500/30 p-2 shadow-inner shrink-0 flex items-center justify-center">
              <img src={LOGO_MEGA12_BASE64} alt="Rede Mega 12" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cockpit Operacional
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {getRoleLabel()}
                </span>
                <span className="text-xs text-slate-400 hidden sm:flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {getGreeting()}, <span className="text-emerald-400">{(currentUser.nome || 'Usuário').replace(/\s*\([^)]*\)/g, '').trim()}</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Centro de comando unificado da Rede Mega 12 • Acompanhamento em tempo real de compras, estoque e doca.
              </p>
            </div>
          </div>

          {/* Ação Primária em Destaque */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {currentUser.role === 'deposito' ? (
              <button
                onClick={() => onNavigate('stock')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Warehouse className="w-4 h-4" />
                <span>Estoque Central CD</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : canAccessOrders ? (
              <button
                onClick={onNewOrder}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Nova Cotação de Compras</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onNavigate('separation')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs shadow-md shadow-teal-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Conferência de Doca</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Barra Executiva de KPIs (Pulse Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Pedidos em Fluxo */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pedidos no Fluxo</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {pedidosEmFluxo.length} <span className="text-xs font-normal text-slate-400">pedidos</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {canAccessOrders && valorTotalEmFluxo > 0
                ? `R$ ${valorTotalEmFluxo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em andamento`
                : `${countByStatus['Em Cotação']} em cotação • ${countByStatus['Em Separação']} na doca`}
            </p>
          </div>
        </div>

        {/* KPI 2: Cargas na Doca */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Doca & Separação</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {pedidosNaDoca.length} <span className="text-xs font-normal text-slate-400">cargas</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {totalPecasNaDoca > 0 
                ? `${totalPecasNaDoca.toLocaleString('pt-BR')} peças em conferência` 
                : 'Aguardando liberação de compras'}
            </p>
          </div>
        </div>

        {/* KPI 3: Acuracidade de Doca / Avarias */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Acuracidade de Doca</span>
            <div className={`w-8 h-8 rounded-xl ${pedidosComAvarias.length > 0 ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'} flex items-center justify-center`}>
              {pedidosComAvarias.length > 0 ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black font-mono ${pedidosComAvarias.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {pedidosComAvarias.length > 0 ? `${totalPecasAvariadas} un` : '100%'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {pedidosComAvarias.length > 0 
                ? `${pedidosComAvarias.length} pedido(s) com apontamento` 
                : 'Zero divergências críticas registradas'}
            </p>
          </div>
        </div>

        {/* KPI 4: Estoque Central CD */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Estoque Central CD</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {totalUnidadesEstoqueCD.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {centralStock.length} SKUs cadastrados no depósito
            </p>
          </div>
        </div>

      </div>

      {/* Alerta de Governança Financeira (Exclusivo Diretoria) */}
      {canAuthorizeFinancialRelease(currentUser?.role) && pedidosAguardandoBoletos.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                  Boletos Pendentes de Autorização
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                  {pedidosAguardandoBoletos.length} pedido(s)
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Mercadorias recebidas fisicamente na Matriz aguardando autorização da Diretoria para liberar os títulos no Contas a Pagar.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>Ver no Histórico</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Área Principal do Cockpit: Fila de Trabalho (65%) + Central de Alertas (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA DA ESQUERDA (8 / 12): Fila de Trabalho & Pedidos Inteligente */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          
          {/* Cabeçalho da Fila de Trabalho com Abas */}
          <div className="p-5 border-b border-slate-200/90 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Fila Operacional de Pedidos
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Acompanhe e despache pedidos conforme cada estágio do fluxo.
                </p>
              </div>

              {/* Busca Rápida */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por nº ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Esteira Operacional de Pedidos (Padrão Oficial Mega 12) */}
            <div className="flex flex-wrap items-center gap-2 pt-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('todos')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'todos'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <span>Todos os Pedidos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/20 dark:bg-white/20">
                  {countByStatus.todos}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Em Cotação')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'Em Cotação'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                }`}
              >
                <span>🟡 1. Em Cotação (Compras)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/20">
                  {countByStatus['Em Cotação']}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Aprovado')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'Aprovado'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                }`}
              >
                <span>🔵 2. Aprovados</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/20">
                  {countByStatus['Aprovado']}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Em Distribuição')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'Em Distribuição'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                }`}
              >
                <span>🟣 3. Em Distribuição (CD)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/20">
                  {countByStatus['Em Distribuição']}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Em Separação')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'Em Separação'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                }`}
              >
                <span>📦 4. Em Separação (Doca)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/20">
                  {countByStatus['Em Separação']}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Finalizado')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'Finalizado'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <span>🟢 5. Finalizados</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/20">
                  {countByStatus['Finalizado']}
                </span>
              </button>
            </div>
          </div>

          {/* Conteúdo da Tabela */}
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Boxes className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum pedido encontrado nesta visualização
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm ? 'Tente ajustar os termos da pesquisa.' : 'Alterne as abas acima para conferir os outros estágios.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Nº Pedido</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-center">Peças</th>
                    {canAccessOrders && <th className="py-3 px-4 text-right">Valor Total</th>}
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredOrders.slice(0, 6).map((ord) => {
                    const totalVal = ord.items?.reduce((sum, it) => sum + (it.valorTotalBruto || 0), 0) || 0;
                    const totalPecas = ord.items?.reduce((sum, it) => sum + (it.qtdTotalUnidades || 0), 0) || 0;

                    return (
                      <tr 
                        key={ord.header.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                        onClick={() => onSelectOrder(ord)}
                      >
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {ord.header.numeroPedido}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100 max-w-[180px] truncate">
                          {ord.header.fornecedor || 'Fornecedor não informado'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {toBrDate(ord.header.dataPedido) || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {totalPecas.toLocaleString('pt-BR')}
                        </td>
                        {canAccessOrders && (
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.8 rounded-full text-[10px] font-extrabold border ${getStatusBadge(ord.header.status)}`}>
                            {ord.header.status}
                          </span>
                          <div className="mt-1 flex flex-col items-center gap-0.5">
                            {ord.header.recebidoMatriz ? (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                ✓ Recebido Matriz
                              </span>
                            ) : (ord.header.status === 'Aprovado' || ord.header.status === 'Em Distribuição') && ord.header.supplierId !== 'cd_matriz' ? (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                Aguardando entrega
                              </span>
                            ) : null}
                            {ord.header.recebidoMatriz && !ord.header.boletosLiberados && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                🔒 Boletos retidos
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {!ord.header.recebidoMatriz && ord.header.status !== 'Finalizado' && onConfirmReceipt && canConfirmReceipt(currentUser?.role) && (
                              <button
                                onClick={() => onConfirmReceipt(ord)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs transition cursor-pointer inline-flex items-center gap-1 active:scale-98"
                                title="Confirmar o recebimento físico da mercadoria na Matriz"
                              >
                                <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Receber</span>
                              </button>
                            )}
                            {ord.header.recebidoMatriz && !ord.header.boletosLiberados && onAuthorizeFinancial && canAuthorizeFinancialRelease(currentUser?.role) && (
                              <button
                                onClick={() => onAuthorizeFinancial(ord)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50/90 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs transition cursor-pointer inline-flex items-center gap-1 active:scale-98"
                                title="Liberar boletos para o Contas a Pagar"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Liberar Boletos</span>
                              </button>
                            )}
                            <button
                              onClick={() => onSelectOrder(ord)}
                              className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            >
                              <span>{getActionButtonLabel(ord.header.status)}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Rodapé da Tabela */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Exibindo até 6 pedidos mais recentes • Total de {filteredOrders.length} pedido(s)
            </span>
            <button
              onClick={() => onNavigate(canAccessTab(currentUser.role, 'history') ? 'history' : 'separationHistory')}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Acessar Arquivo & Histórico Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* COLUNA DA DIREITA (4 / 12): Central de Pendências, Auditoria & Atividade */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card 1: Rascunho Não Salvo (se houver) */}
          {hasValidDraft && canAccessOrders && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-950/40 dark:to-amber-900/10 border border-amber-300 dark:border-amber-700/60 shadow-xs relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Rascunho Pendente
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                    Você possui uma cotação em aberto não concluída.
                  </h3>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 space-y-0.5">
                    {draftOrder?.header.fornecedor && (
                      <div>Fornecedor: <b>{draftOrder.header.fornecedor}</b></div>
                    )}
                    <div>Total de Itens: <b>{draftItemCount}</b></div>
                    {draftTotalVal > 0 && (
                      <div>Valor: <b className="text-emerald-600 dark:text-emerald-400">R$ {draftTotalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={onContinueDraft}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Continuar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={onDiscardDraft}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition cursor-pointer"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Alertas de Avarias de Doca (se houver) */}
          {pedidosComAvarias.length > 0 ? (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 shadow-xs">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                <ShieldAlert className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Apontamentos de Doca ({pedidosComAvarias.length})
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Identificamos <b>{totalPecasAvariadas} peças avariadas</b> registradas durante a conferência que geraram desconto na separação.
              </p>

              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {pedidosComAvarias.slice(0, 3).map(ord => (
                  <div 
                    key={ord.header.id}
                    onClick={() => onSelectOrder(ord)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{ord.header.numeroPedido}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{ord.header.fornecedor}</div>
                    </div>
                    <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
                      {ord.inspection?.avarias?.length || 0} avaria(s)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Operação Regular
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Nenhuma anomalia ou avaria crítica pendente. Todos os romaneios em andamento estão conformes.
              </p>
            </div>
          )}

          {/* Card 3: Visão Geral da Rede & Dispositivos Móveis */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-indigo-500" />
                Rede de Lojas
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {stores.length} filiais ativas
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-teal-500" />
                Fornecedores Homologados
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {suppliers.length} ativos
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-purple-500" />
                Produtos Cadastrados
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {products.length} itens
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
