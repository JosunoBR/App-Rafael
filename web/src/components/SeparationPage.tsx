import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Store, 
  UserCheck, 
  ShieldAlert, 
  ArrowRight, 
  PackageCheck, 
  Plus, 
  Minus, 
  Trash2, 
  AlertOctagon,
  Warehouse,
  RotateCcw,
  Ban,
  Maximize2,
  Boxes,
  Image as ImageIcon,
  Eye,
  X
} from 'lucide-react';
import { PurchaseOrder, StoreConfig, OrderItem, AvariaRecord, OrderInspection } from '../shared/types';
import { calculateBoxesSeparation, validateSeparation } from '../shared/separationEngine';
import { SeparationMatrixModal } from './SeparationMatrixModal';

interface SeparationPageProps {
  order: PurchaseOrder;
  orders?: PurchaseOrder[];
  stores: StoreConfig[];
  onExportPDF: () => void;
  onExportExcel: () => void;
  onLoadMockOrder: () => void;
  onNavigateToOrders: () => void;
  onNavigateToHistory?: () => void;
  onChangeOrder?: (updatedOrder: PurchaseOrder) => void;
  onSelectOrder?: (order: PurchaseOrder) => void;
  onFinalizeOrder?: (order: PurchaseOrder) => void;
}

// Função para converter qualquer unidade de medida em unidades reais de peças
export function convertAvariaToUnits(quantidade: number, unidadeMedida: string = 'UN', qtdPorPacote: number = 1): number {
  const q = Number(quantidade) || 0;
  const pack = Number(qtdPorPacote) || 1;

  switch (unidadeMedida) {
    case 'CX':
    case 'PCT':
      return q * pack; // 1 CX / PCT = X peças da embalagem
    case 'PAR':
      return q * 2;    // 1 PAR = 2 peças
    case 'JG':
      return q * pack; // 1 JG = conjunto completo
    case 'UN':
    default:
      return q;        // 1 UN = 1 peça
  }
}

export const SeparationPage: React.FC<SeparationPageProps> = ({
  order,
  orders = [],
  stores,
  onExportPDF,
  onExportExcel,
  onLoadMockOrder,
  onNavigateToOrders,
  onNavigateToHistory,
  onChangeOrder,
  onSelectOrder,
  onFinalizeOrder
}) => {
  const activeStores = stores.filter(s => s.active);

  // Filtrar pedidos que estão com status Em Separação ou Aprovados para conferência
  const pendingSeparationOrders = orders.filter(o => o.header.status === 'Em Separação' || o.header.status === 'Aprovado');

  const isCurrentFinalized = order.header.status === 'Finalizado';
  const [viewArchivedReadOnly, setViewArchivedReadOnly] = useState(false);

  // Se o pedido atual for finalizado mas existirem outros pendentes, seleciona automaticamente o primeiro pendente
  useEffect(() => {
    if (isCurrentFinalized && pendingSeparationOrders.length > 0 && onSelectOrder && !viewArchivedReadOnly) {
      onSelectOrder(pendingSeparationOrders[0]);
    }
  }, [isCurrentFinalized, pendingSeparationOrders, onSelectOrder, viewArchivedReadOnly]);

  // Estados do Apontamento de Doca
  const [conferente, setConferente] = useState(order.inspection?.conferente || '');
  const [possuiAvarias, setPossuiAvarias] = useState<'nao' | 'sim'>(order.inspection?.possuiAvarias ? 'sim' : 'nao');
  const [observacoesDoca, setObservacoesDoca] = useState(order.inspection?.observacoesDoca || '');
  
  // Modal de Detalhes de Separação
  const [modalItem, setModalItem] = useState<OrderItem | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Lista de avarias registradas
  const [avariasList, setAvariasList] = useState<AvariaRecord[]>(() => {
    if (order.inspection?.avarias && order.inspection.avarias.length > 0) {
      return order.inspection.avarias;
    }
    return [
      {
        id: 'avaria_1',
        itemId: order.items[0]?.id || '',
        storeId: activeStores[0]?.id || 'pg_centro',
        quantidade: 1,
        unidadeMedida: 'CX',
        motivo: '1 caixa danificada na descarga'
      }
    ];
  });

  // Agrupamento de lojas por Cluster
  const clusterA = activeStores.filter(s => s.cluster === 'A');
  const clusterB = activeStores.filter(s => s.cluster === 'B');
  const clusterC = activeStores.filter(s => s.cluster === 'C');

  // Mapa de Deduções de Avarias por [itemId_storeId]
  const avariasMap = useMemo(() => {
    const map = new Map<string, { totalDeductedUnits: number; records: AvariaRecord[] }>();

    if (possuiAvarias === 'sim') {
      avariasList.forEach(av => {
        const itemRef = order.items.find(i => i.id === av.itemId);
        const pack = itemRef?.qtdPorPacote || 1;
        const units = convertAvariaToUnits(av.quantidade, av.unidadeMedida, pack);

        const key = `${av.itemId}_${av.storeId}`;
        const existing = map.get(key) || { totalDeductedUnits: 0, records: [] };
        existing.totalDeductedUnits += units;
        existing.records.push(av);
        map.set(key, existing);
      });
    }

    return map;
  }, [avariasList, possuiAvarias, order.items]);

  // Total de Peças Avariadas (em Unidades Reais convertidas)
  const totalPecasAvariadasUnidades = useMemo(() => {
    if (possuiAvarias !== 'sim') return 0;
    return avariasList.reduce((sum, av) => {
      const itemRef = order.items.find(i => i.id === av.itemId);
      const pack = itemRef?.qtdPorPacote || 1;
      return sum + convertAvariaToUnits(av.quantidade, av.unidadeMedida, pack);
    }, 0);
  }, [avariasList, possuiAvarias, order.items]);

  // Status de cada item: Caixas Compradas, Caixas nas Lojas, Caixas no Estoque CD e Validação
  const itemStatusList = useMemo(() => {
    return order.items.map(item => {
      const pack = Math.max(1, item.qtdPorPacote || 1);
      const allocatedUnits = activeStores.reduce((acc, store) => acc + (Number(item.separacaoLojas?.[store.id]) || 0), 0);
      const totalCompradoUnits = Number(item.qtdTotalUnidades) || 0;
      const reserveStockUnits = Math.max(0, totalCompradoUnits - allocatedUnits);
      
      const totalCompradoBoxes = Number(item.qtdPacotes) || Math.ceil(totalCompradoUnits / pack);
      const allocatedBoxes = allocatedUnits / pack;
      const reserveStockBoxes = reserveStockUnits / pack;

      const isOverAllocated = allocatedUnits > totalCompradoUnits;
      const excessUnits = isOverAllocated ? allocatedUnits - totalCompradoUnits : 0;
      const excessBoxes = isOverAllocated ? excessUnits / pack : 0;

      return {
        item,
        pack,
        allocatedUnits,
        allocatedBoxes,
        reserveStockUnits,
        reserveStockBoxes,
        totalCompradoUnits,
        totalCompradoBoxes,
        isOverAllocated,
        excessUnits,
        excessBoxes,
        isBalanced: !isOverAllocated
      };
    });
  }, [order.items, activeStores]);

  // Totais Gerais em Caixas e Peças
  const totalCaixasGeral = order.items.reduce((acc, item) => acc + (item.qtdPacotes || 0), 0);
  const totalPecasGeralBruto = order.items.reduce((acc, item) => acc + (item.qtdTotalUnidades || 0), 0);
  
  const totalPecasDistribuidoLojasBruto = itemStatusList.reduce((acc, s) => acc + s.allocatedUnits, 0);
  const totalCaixasDistribuidoLojasBruto = itemStatusList.reduce((acc, s) => acc + s.allocatedBoxes, 0);
  
  const totalPecasDistribuidoLojasLiquido = Math.max(0, totalPecasDistribuidoLojasBruto - totalPecasAvariadasUnidades);
  const totalPecasGuardadasEstoque = itemStatusList.reduce((acc, s) => acc + s.reserveStockUnits, 0);
  const totalCaixasGuardadasEstoque = itemStatusList.reduce((acc, s) => acc + s.reserveStockBoxes, 0);
  
  const percentualEstoque = totalPecasGeralBruto > 0 ? Math.round((totalPecasGuardadasEstoque / totalPecasGeralBruto) * 100) : 0;
  const hasAnyOverAllocation = itemStatusList.some(s => s.isOverAllocated);

  // Sincronizar inspeção e avarias com o pedido principal no SQLite
  useEffect(() => {
    if (!onChangeOrder) return;

    const detailedAvarias: AvariaRecord[] = avariasList.map(av => {
      const itemRef = order.items.find(i => i.id === av.itemId);
      const storeRef = activeStores.find(s => s.id === av.storeId);
      const custo = itemRef?.custoRealEfetivo || itemRef?.precoUnitario || 0;
      const pack = itemRef?.qtdPorPacote || 1;
      const units = convertAvariaToUnits(av.quantidade, av.unidadeMedida, pack);
      const perdaTotal = units * custo;

      return {
        ...av,
        codigoProduto: itemRef?.codigo || '',
        descricaoProduto: itemRef?.descricao || '',
        nomeLoja: storeRef?.name || '',
        unidadeMedida: av.unidadeMedida || 'CX',
        custoUnitario: custo,
        valorPrejuizoTotal: perdaTotal
      };
    });

    const totalLoss = detailedAvarias.reduce((acc, a) => acc + (a.valorPrejuizoTotal || 0), 0);

    const updatedInspection: OrderInspection = {
      conferente,
      possuiAvarias: possuiAvarias === 'sim',
      observacoesDoca,
      avarias: possuiAvarias === 'sim' ? detailedAvarias : [],
      totalPrejuizoAvarias: totalLoss
    };

    onChangeOrder({
      ...order,
      inspection: updatedInspection
    });
  }, [conferente, possuiAvarias, observacoesDoca, avariasList]);

  // Handlers para Edição Direta em Caixas
  const handleUpdateStoreAllocationBoxes = (item: OrderItem, storeId: string, rawBoxes: number) => {
    if (!onChangeOrder) return;
    const pack = Math.max(1, item.qtdPorPacote || 1);
    const boxes = Math.max(0, Math.floor(rawBoxes || 0));
    const unitValue = boxes * pack;

    const updatedItems = order.items.map(it => {
      if (it.id !== item.id) return it;

      const currentAlloc = { ...(it.separacaoLojas || {}) };
      currentAlloc[storeId] = unitValue;

      const newSumUnits = Object.values(currentAlloc).reduce((a, b) => a + (Number(b) || 0), 0);
      const calculatedReserve = Math.max(0, it.qtdTotalUnidades - newSumUnits);

      return {
        ...it,
        separacaoLojas: currentAlloc,
        separacaoManual: true,
        qtdReservaEstoque: calculatedReserve
      };
    });

    onChangeOrder({
      ...order,
      items: updatedItems
    });
  };

  const handleUpdateItemReserveBoxes = (item: OrderItem, rawBoxes: number) => {
    if (!onChangeOrder) return;
    const pack = Math.max(1, item.qtdPorPacote || 1);
    const safeBoxes = Math.max(0, Math.min(item.qtdPacotes, Math.floor(rawBoxes || 0)));

    const boxSep = calculateBoxesSeparation(item.qtdPacotes, pack, stores, safeBoxes);

    const updatedItems = order.items.map(it => {
      if (it.id !== item.id) return it;
      return {
        ...it,
        separacaoLojas: boxSep.allocations,
        qtdReservaEstoque: boxSep.reserveStock,
        separacaoManual: false
      };
    });

    onChangeOrder({
      ...order,
      items: updatedItems
    });
  };

  const handleAutoRateioItem = (itemId: string) => {
    if (!onChangeOrder) return;
    const itemToUpdate = order.items.find(i => i.id === itemId);
    if (!itemToUpdate) return;

    const pack = Math.max(1, itemToUpdate.qtdPorPacote || 1);
    const currentReserveBoxes = itemToUpdate.qtdReservaEstoque !== undefined 
      ? Math.floor(itemToUpdate.qtdReservaEstoque / pack)
      : undefined;

    const boxSep = calculateBoxesSeparation(itemToUpdate.qtdPacotes, pack, stores, currentReserveBoxes);

    const updatedItems = order.items.map(it => {
      if (it.id !== itemId) return it;
      return {
        ...it,
        separacaoLojas: boxSep.allocations,
        qtdReservaEstoque: boxSep.reserveStock,
        separacaoManual: false
      };
    });

    onChangeOrder({
      ...order,
      items: updatedItems
    });
  };

  const handleZeroAllStoresForItem = (itemId: string) => {
    if (!onChangeOrder) return;
    const itemToUpdate = order.items.find(i => i.id === itemId);
    if (!itemToUpdate) return;

    const emptyAllocations: Record<string, number> = {};
    stores.forEach(s => { emptyAllocations[s.id] = 0; });

    const updatedItems = order.items.map(it => {
      if (it.id !== itemId) return it;
      return {
        ...it,
        separacaoLojas: emptyAllocations,
        qtdReservaEstoque: it.qtdTotalUnidades,
        separacaoManual: true
      };
    });

    onChangeOrder({
      ...order,
      items: updatedItems
    });
  };

  const handleApplyGlobalReservePercent = (percent: number) => {
    if (!onChangeOrder) return;

    const updatedItems = order.items.map(item => {
      const pack = Math.max(1, item.qtdPorPacote || 1);
      const reserveBoxes = Math.round((item.qtdPacotes * percent) / 100);
      const boxSep = calculateBoxesSeparation(item.qtdPacotes, pack, stores, reserveBoxes);
      return {
        ...item,
        separacaoLojas: boxSep.allocations,
        qtdReservaEstoque: boxSep.reserveStock,
        separacaoManual: false
      };
    });

    onChangeOrder({
      ...order,
      items: updatedItems
    });
  };

  const handleSaveModalSeparation = (itemId: string, allocations: Record<string, number>, isManual: boolean, qtdReservaEstoque?: number) => {
    if (!onChangeOrder) return;

    const updatedItems = order.items.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        separacaoLojas: allocations,
        separacaoManual: isManual,
        qtdReservaEstoque: qtdReservaEstoque
      };
    });

    onChangeOrder({
      ...order,
      items: updatedItems
    });
  };

  // Handlers para Avarias
  const handleAddAvaria = () => {
    const defaultItem = order.items[0];

    const newRecord: AvariaRecord = {
      id: 'avaria_' + Date.now(),
      itemId: defaultItem?.id || '',
      storeId: activeStores[0]?.id || 'pg_centro',
      quantidade: 1,
      unidadeMedida: 'CX',
      motivo: 'Caixa danificada na descarga'
    };
    setAvariasList(prev => [...prev, newRecord]);
    setPossuiAvarias('sim');
  };

  const handleUpdateAvaria = (id: string, field: keyof AvariaRecord, value: any) => {
    setAvariasList(prev => prev.map(av => {
      if (av.id !== id) return av;
      return { ...av, [field]: value };
    }));
  };

  const handleStepQuantity = (id: string, delta: number) => {
    setAvariasList(prev => prev.map(av => {
      if (av.id !== id) return av;
      const newQty = Math.max(1, (Number(av.quantidade) || 1) + delta);
      return { ...av, quantidade: newQty };
    }));
  };

  const handleRemoveAvaria = (id: string) => {
    setAvariasList(prev => {
      const updated = prev.filter(av => av.id !== id);
      if (updated.length === 0) setPossuiAvarias('nao');
      return updated;
    });
  };

  // Se o pedido não tiver itens cadastrados:
  if (!order.items || order.items.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Boxes className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Nenhum Item para Separação
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            Este pedido ainda não possui itens cadastrados para geração do romaneio e rateio das 20 lojas.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={onNavigateToOrders}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Ir para Cotação & Adicionar Itens</span>
            </button>

            {onNavigateToHistory && (
              <button
                onClick={onNavigateToHistory}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-teal-500" />
                <span>Ver Histórico de Separações</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Banner Informativo quando visualizando pedido já finalizado */}
      {isCurrentFinalized && (
        <div className="p-3.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Modo de Visualização: Este pedido ({order.header.numeroPedido}) foi FINALIZADO e está arquivado no Histórico de Separações.
            </span>
          </div>

          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition flex items-center gap-1 cursor-pointer self-end sm:self-auto"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Voltar ao Histórico</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Header do Romaneio */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                Separação & Romaneio 20 Lojas
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                  {order.header.numeroPedido}
                </span>
                
                {/* Badge de Status Oficial */}
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border shadow-xs ${
                  order.header.status === 'Finalizado'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                    : order.header.status === 'Em Separação'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                }`}>
                  {order.header.status || 'Em Separação'}
                </span>

                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  📦 Volumes (Caixas)
                </span>
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Fornecedor: <span className="font-semibold text-slate-700 dark:text-slate-300">{order.header.fornecedor}</span></span>
                {pendingSeparationOrders.length > 1 && onSelectOrder && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="font-bold text-purple-600 dark:text-purple-400">Alternar Pedido:</span>
                    <select
                      value={order.header.id || order.header.numeroPedido}
                      onChange={(e) => {
                        const found = pendingSeparationOrders.find(o => (o.header.id || o.header.numeroPedido) === e.target.value);
                        if (found) onSelectOrder(found);
                      }}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {pendingSeparationOrders.map(o => (
                        <option key={o.header.id || o.header.numeroPedido} value={o.header.id || o.header.numeroPedido}>
                          {o.header.numeroPedido} - {o.header.fornecedor}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onLoadMockOrder}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition shadow-xs"
            title="Carregar pedido de exemplo com 20 itens de presentes"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>20 Itens Teste</span>
          </button>

          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition shadow-xs"
            title="Exportar pasta de trabalho Excel com 3 abas incluindo caixas e peças"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={onExportPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition"
            title="Gerar Romaneio PDF Paisagem A4 com tabela das 20 lojas e volumes"
          >
            <FileText className="w-4 h-4" />
            <span>Romaneio PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Controle Global de Estoque (CD / Matriz) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 dark:border-amber-700/50 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
            <Warehouse className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
              Controle Global de Estoque Central / CD Matriz:
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Padrão: 10% retido no CD em caixas fechadas • 90% rateado nas lojas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Reter em Estoque:</span>
          {[0, 10, 20, 30].map(pct => (
            <button
              key={pct}
              onClick={() => handleApplyGlobalReservePercent(pct)}
              className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition shadow-xs flex items-center gap-1 ${
                pct === 10
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 ring-2 ring-amber-400/30'
                  : 'bg-white dark:bg-slate-800 border border-amber-300/80 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-amber-950/80 text-amber-900 dark:text-amber-200'
              }`}
              title={`Aplicar ${pct}% de retenção em estoque para todos os produtos`}
            >
              {pct === 0 ? '0% (Tudo Lojas)' : pct === 10 ? '⭐ 10% (Padrão)' : `${pct}% no CD`}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Cards de Resumo Operacional (Caixas em Destaque com Peças Embaixo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Status da Grade */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status dos Volumes</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              {!hasAnyOverAllocation ? '100% Válido (Caixas Fechadas)' : 'Excedente Detectado'}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {!hasAnyOverAllocation 
                ? `${totalCaixasDistribuidoLojasBruto} cx lojas • ${totalCaixasGuardadasEstoque} cx no CD`
                : 'Alguma linha ultrapassou o total comprado'}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl ${!hasAnyOverAllocation ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-rose-100 dark:bg-rose-950 text-rose-600'}`}>
            {!hasAnyOverAllocation ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
        </div>

        {/* Total Distribuído para as Lojas */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Enviado às Lojas</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono flex items-baseline gap-2">
            <span>{totalCaixasDistribuidoLojasBruto} cx</span>
            <span className="text-xs font-normal text-slate-400">
              ({totalPecasDistribuidoLojasLiquido.toLocaleString('pt-BR')} peças)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {totalCaixasGeral.toLocaleString('pt-BR')} caixas compradas no pedido
          </span>
        </div>

        {/* Total Guardado em Estoque CD */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Guardado no Estoque (CD)</span>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono flex items-baseline gap-2">
            <span>{totalCaixasGuardadasEstoque} cx</span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
              {percentualEstoque}% retido
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {totalPecasGuardadasEstoque.toLocaleString('pt-BR')} peças em estoque central
          </span>
        </div>

        {/* Atalho Voltar */}
        <div 
          onClick={onNavigateToOrders}
          className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs cursor-pointer hover:border-emerald-500 transition group flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Voltar para Edição</span>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span>Editar Pedido & Cotação</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <Store className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 4. Tabela Interativa da Matriz de Separação (20 Lojas) */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        
        {/* Cabeçalho da Tabela */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-2">
                Grade de Separação & Expedição por Caixas (20 Lojas)
              </h3>
              <p className="text-[11px] text-slate-400">
                Digite o número de caixas inteiras para cada filial. O equivalente em peças é calculado e exibido embaixo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {possuiAvarias === 'sim' && (
              <div className="flex items-center gap-1.5 bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-300/40 text-amber-200 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span>Amarelo = Avaria Descontada</span>
              </div>
            )}
            <span className="text-slate-400 font-mono font-medium">
              Rede Mega 12 • Matriz
            </span>
          </div>
        </div>

        {/* Tabela Scrollável */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Linha 1 de Cabeçalho: Clusters */}
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-center font-extrabold text-[11px]">
                <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-20 min-w-[230px]">
                  Dados do Produto
                </th>
                <th className="py-2.5 px-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700 min-w-[80px]" title="Total de caixas compradas ao fornecedor">
                  Total Cx
                </th>
                <th className="py-2.5 px-2 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700 min-w-[95px]" title="Caixas guardadas no Depósito Central / Matriz">
                  Estoque CD (Cx)
                </th>
                <th className="py-2.5 px-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 min-w-[80px]" title="Soma de caixas enviadas para todas as lojas">
                  Lojas (Cx)
                </th>
                <th colSpan={clusterA.length} className="py-2 px-2 bg-blue-100/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-r border-slate-200 dark:border-slate-700">
                  CLUSTER A ({clusterA.length} Lojas • 51.3%)
                </th>
                <th colSpan={clusterB.length} className="py-2 px-2 bg-slate-100 dark:bg-slate-900/70 text-slate-900 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                  CLUSTER B ({clusterB.length} Lojas • 35.9%)
                </th>
                <th colSpan={clusterC.length} className="py-2 px-2 bg-teal-100/70 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300 border-r border-slate-200 dark:border-slate-700">
                  CLUSTER C ({clusterC.length} Lojas / CD • 12.8%)
                </th>
                <th className="py-2.5 px-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-center min-w-[80px]">
                  Ações
                </th>
              </tr>

              {/* Linha 2 de Cabeçalho: Nomes das Lojas */}
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">
                  Descrição / Código
                </th>
                <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/50">
                  Comprado
                </th>
                <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                  CD Central
                </th>
                <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80">
                  Distribuído
                </th>
                {activeStores.map(store => (
                  <th 
                    key={store.id} 
                    className={`py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 min-w-[65px] whitespace-nowrap ${
                      store.cluster === 'A' ? 'bg-blue-50/50 dark:bg-blue-950/20' : 
                      store.cluster === 'B' ? 'bg-slate-50 dark:bg-slate-900/30' : 
                      'bg-teal-50/50 dark:bg-teal-950/20'
                    }`}
                  >
                    {store.name.replace('Ponta Grossa ', 'PG ').replace('Depósito Central', 'CD Central')}
                  </th>
                ))}
                <th className="py-2 px-2 text-center bg-slate-50 dark:bg-slate-900">
                  Opções
                </th>
              </tr>
            </thead>

            {/* Linhas de Produtos */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {order.items.map((item, idx) => {
                const status = itemStatusList[idx];
                const pack = status.pack;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    
                    {/* 1. Descrição e Código com Foto */}
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-800 z-10">
                      <div className="flex items-center gap-2.5">
                        {/* Foto Miniatura */}
                        <div 
                          className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center cursor-pointer shadow-xs"
                          onClick={() => item.fotoUrl && setZoomedImage({ url: item.fotoUrl, title: item.descricao })}
                          title={item.fotoUrl ? "Clique para ver a foto ampliada" : "Sem foto"}
                        >
                          {item.fotoUrl ? (
                            <img src={item.fotoUrl} alt="" className="w-full h-full object-cover hover:scale-110 transition" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={item.descricao}>
                            {item.descricao}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.codigoInterno || item.codigo || 'S/ CÓD'}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{item.qtdPacotes} cx</span>
                            <span>×</span>
                            <span>{item.qtdPorPacote} un</span>
                            {item.separacaoManual && (
                              <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-sans font-semibold text-[9px]">
                                Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Total Comprado (Caixas em destaque + Peças embaixo) */}
                    <td className="py-2.5 px-2 text-center font-mono font-extrabold border-r border-slate-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                      <div className="text-xs">
                        {item.qtdPacotes} cx
                      </div>
                      <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                        {item.qtdTotalUnidades.toLocaleString('pt-BR')} un
                      </div>
                    </td>

                    {/* 3. Coluna Estoque CD (Guardado) - Editável em Caixas */}
                    <td className="py-1.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-amber-950/20">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={item.qtdPacotes}
                            value={status.reserveStockBoxes}
                            onChange={(e) => handleUpdateItemReserveBoxes(item, parseFloat(e.target.value) || 0)}
                            className="w-14 px-1 py-1 text-center font-mono font-extrabold text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 focus:ring-2 focus:ring-amber-500 outline-hidden"
                            title="Quantidade de caixas que ficará guardada no Estoque Central"
                          />
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            cx
                          </span>
                        </div>
                        <span className="text-[9px] text-amber-700/80 dark:text-amber-400 font-mono mt-0.5">
                          = {status.reserveStockUnits} un
                        </span>
                      </div>
                    </td>

                    {/* 4. Total Distribuído para Lojas */}
                    <td className={`py-2.5 px-2 text-center font-mono font-extrabold border-r border-slate-200 dark:border-slate-700 ${
                      status.isOverAllocated 
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 ring-1 ring-rose-400' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}>
                      <div className="text-xs">
                        {status.allocatedBoxes} cx
                      </div>
                      <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                        {status.allocatedUnits.toLocaleString('pt-BR')} un
                      </div>
                      {status.isOverAllocated && (
                        <div className="text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          +{status.excessBoxes} cx excedente
                        </div>
                      )}
                    </td>

                    {/* 5. Células de Cada Loja - Editáveis em Caixas com Peças Embaixo */}
                    {activeStores.map(store => {
                      const rawAllocUnits = item.separacaoLojas?.[store.id] || 0;
                      const rawAllocBoxes = rawAllocUnits / pack;
                      
                      const avariaInfo = avariasMap.get(`${item.id}_${store.id}`);
                      const hasAvaria = avariaInfo !== undefined && avariaInfo.totalDeductedUnits > 0;
                      const deductedUnits = hasAvaria ? avariaInfo.totalDeductedUnits : 0;
                      const effectiveUnits = Math.max(0, rawAllocUnits - deductedUnits);
                      const effectiveBoxes = effectiveUnits / pack;

                      return (
                        <td 
                          key={store.id} 
                          className={`py-1.5 px-1 text-center font-mono border-r transition ${
                            hasAvaria
                              ? 'bg-amber-100/90 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400/60'
                              : 'border-slate-100 dark:border-slate-700/50'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={rawAllocBoxes}
                              onChange={(e) => handleUpdateStoreAllocationBoxes(item, store.id, parseFloat(e.target.value) || 0)}
                              className={`w-12 px-1 py-1 text-center font-mono font-bold text-xs rounded-md border outline-hidden transition ${
                                rawAllocBoxes > 0
                                  ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500'
                                  : 'border-dashed border-slate-200 dark:border-slate-700 bg-transparent text-slate-300 dark:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:text-slate-900'
                              }`}
                              title={`Loja: ${store.name} (${store.cluster}) • ${rawAllocBoxes} caixas (${rawAllocUnits} peças)`}
                            />

                            {rawAllocBoxes > 0 && (
                              <span className="text-[8.5px] text-slate-400 font-mono mt-0.5">
                                {rawAllocUnits} un
                              </span>
                            )}

                            {hasAvaria && (
                              <span 
                                className="text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/90 px-1 py-0.2 rounded-sm mt-0.5 border border-rose-300 dark:border-rose-800 whitespace-nowrap"
                                title={`Original: ${rawAllocBoxes} cx • Avaria: -${deductedUnits} un (Efetivo: ${effectiveBoxes} cx)`}
                              >
                                {effectiveBoxes} cx
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* 6. Ações por Linha */}
                    <td className="py-1.5 px-2 text-center bg-slate-50/50 dark:bg-slate-900/40">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAutoRateioItem(item.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition"
                          title="Recalcular rateio em caixas fechadas para este produto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleZeroAllStoresForItem(item.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                          title="Zerar envio para todas as lojas (guardar 100% no estoque)"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalItem(item)}
                          className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition"
                          title="Abrir grade de clusters em tela cheia"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>

            {/* Linha de Totais Gerais por Loja */}
            <tfoot>
              <tr className="bg-emerald-100 dark:bg-emerald-950 border-t-2 border-emerald-500 font-extrabold text-xs text-emerald-950 dark:text-emerald-200">
                <td className="py-3 px-3 border-r border-emerald-200 dark:border-emerald-800 sticky left-0 bg-emerald-100 dark:bg-emerald-950 z-10 uppercase">
                  Total Geral (Volumes / Caixas)
                </td>
                <td className="py-3 px-2 text-center border-r border-emerald-200 dark:border-emerald-800 font-mono text-sm">
                  <div>{totalCaixasGeral} cx</div>
                  <div className="text-[9px] font-normal text-emerald-800 dark:text-emerald-400">
                    {totalPecasGeralBruto.toLocaleString('pt-BR')} un
                  </div>
                </td>
                <td className="py-3 px-2 text-center border-r border-emerald-200 dark:border-emerald-800 font-mono text-xs text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-950/60">
                  <div>{totalCaixasGuardadasEstoque} cx</div>
                  <div className="text-[9px] font-normal text-amber-800 dark:text-amber-300">
                    {totalPecasGuardadasEstoque.toLocaleString('pt-BR')} un
                  </div>
                </td>
                <td className="py-3 px-2 text-center border-r border-emerald-200 dark:border-emerald-800 font-mono text-sm">
                  <div>{totalCaixasDistribuidoLojasBruto} cx</div>
                  <div className="text-[9px] font-normal text-emerald-800 dark:text-emerald-400">
                    {totalPecasDistribuidoLojasLiquido.toLocaleString('pt-BR')} un
                  </div>
                </td>
                {activeStores.map(store => {
                  const somaLojaUnidades = order.items.reduce((acc, item) => acc + (Number(item.separacaoLojas?.[store.id]) || 0), 0);
                  const somaLojaCaixas = order.items.reduce((acc, item) => {
                    const pack = Math.max(1, item.qtdPorPacote || 1);
                    return acc + ((Number(item.separacaoLojas?.[store.id]) || 0) / pack);
                  }, 0);

                  return (
                    <td key={store.id} className="py-3 px-2 text-center font-mono border-r border-emerald-200 dark:border-emerald-800">
                      <div>
                        {somaLojaCaixas} cx
                      </div>
                      <div className="text-[9px] font-normal text-emerald-800/80 dark:text-emerald-400">
                        {somaLojaUnidades} un
                      </div>
                    </td>
                  );
                })}
                <td className="py-3 px-2 text-center font-mono text-emerald-800 dark:text-emerald-300 text-[10px]">
                  OK
                </td>
              </tr>
            </tfoot>

          </table>
        </div>
      </div>

      {/* 5. Bloco de Apontamento de Doca & Registro de Avarias */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Apontamento de Doca & Conferência Física de Galpão
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registro operacional de avarias com dedução automática por unidade de medida (CX, PCT, UN, JG, PAR)
              </p>
            </div>
          </div>

          {possuiAvarias === 'sim' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
              {avariasList.length} {avariasList.length === 1 ? 'Ocorrência' : 'Ocorrências'} ({totalPecasAvariadasUnidades} peças descontadas na grade)
            </span>
          )}
        </div>

        {/* Campos Principais de Conferência */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Conferente Responsável
            </label>
            <input 
              type="text" 
              value={conferente}
              onChange={(e) => setConferente(e.target.value)}
              placeholder="Nome do conferente..." 
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-hidden font-medium"
            />
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Possui Avarias ou Divergências?
            </label>
            <select 
              value={possuiAvarias}
              onChange={(e) => setPossuiAvarias(e.target.value as 'nao' | 'sim')}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-hidden font-bold cursor-pointer"
            >
              <option value="nao">✅ NÃO - Carga íntegra e 100% conferida</option>
              <option value="sim">⚠️ SIM - Apontar avarias / peças faltantes</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Observações Gerais de Doca
            </label>
            <input 
              type="text" 
              value={observacoesDoca}
              onChange={(e) => setObservacoesDoca(e.target.value)}
              placeholder="Ex: Entregue sem paletização padrão..." 
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-hidden"
            />
          </div>
        </div>

        {/* Tabela de Lançamento de Avarias */}
        {possuiAvarias === 'sim' && (
          <div className="p-4 rounded-xl border-2 border-amber-300/80 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Grade de Avarias por Produto e Loja de Dedução
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-400">
                  Ao apontar avaria em <b>CX</b> ou <b>PCT</b>, o sistema desconta a caixa e multiplica pelo número de peças da embalagem!
                </p>
              </div>

              <button
                onClick={handleAddAvaria}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Ocorrência
              </button>
            </div>

            <div className="space-y-2">
              {avariasList.map((av) => {
                const selectedItem = order.items.find(i => i.id === av.itemId) || order.items[0];
                const packSize = selectedItem?.qtdPorPacote || 1;
                const convertedTotal = convertAvariaToUnits(av.quantidade, av.unidadeMedida, packSize);

                return (
                  <div 
                    key={av.id} 
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 flex-1 items-center">
                      
                      {/* 1. Produto com Avaria */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Produto com Avaria
                        </label>
                        <select
                          value={av.itemId}
                          onChange={(e) => handleUpdateAvaria(av.id, 'itemId', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-hidden truncate"
                        >
                          {order.items.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.codigo ? `[${item.codigo}] ` : ''}{item.descricao} (Emb: {item.qtdPorPacote} un)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Loja de Dedução */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Loja de Dedução
                        </label>
                        <select
                          value={av.storeId}
                          onChange={(e) => handleUpdateAvaria(av.id, 'storeId', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-hidden"
                        >
                          {activeStores.map(store => (
                            <option key={store.id} value={store.id}>
                              {store.name} ({store.cluster})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 3. Quantidade com Botões [+] / [-] */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Quantidade
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(av.id, -1)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
                            title="Diminuir"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={av.quantidade}
                            onChange={(e) => handleUpdateAvaria(av.id, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-1.5 py-1 text-center font-mono font-extrabold rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleStepQuantity(av.id, 1)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
                            title="Aumentar"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 4. Unidade de Medida */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Unidade de Medida
                        </label>
                        <select
                          value={av.unidadeMedida || 'CX'}
                          onChange={(e) => handleUpdateAvaria(av.id, 'unidadeMedida', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-hidden cursor-pointer text-emerald-700 dark:text-emerald-400"
                        >
                          <option value="CX">CX (Caixa Fechada • {packSize} un)</option>
                          <option value="PCT">PCT (Pacote • {packSize} un)</option>
                          <option value="UN">UN (Unidade Individual)</option>
                          <option value="JG">JG (Jogo / Kit • {packSize} un)</option>
                          <option value="PAR">PAR (Par • 2 un)</option>
                        </select>
                      </div>

                    </div>

                    {/* Descrição do Motivo & Excluir */}
                    <div className="flex items-center gap-2 md:w-80">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={av.motivo}
                          onChange={(e) => handleUpdateAvaria(av.id, 'motivo', e.target.value)}
                          placeholder="Motivo / Descrição da avaria..."
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                        />
                        <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                          = {convertedTotal} peças descontadas da loja
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveAvaria(av.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition shrink-0"
                        title="Remover ocorrência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Rodapé da Conferência de Doca: Botão Salvar e Finalizar Separação */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {order.header.status === 'Finalizado' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Este pedido já foi finalizado e conferido.
              </span>
            ) : (
              <span>Ao clicar em finalizar, o status do pedido mudará para <b>Finalizado</b> e a conferência será arquivada.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {order.header.status !== 'Finalizado' && (
              <button
                type="button"
                onClick={() => {
                  const finalized: PurchaseOrder = {
                    ...order,
                    header: {
                      ...order.header,
                      status: 'Finalizado',
                      updatedAt: new Date().toISOString()
                    },
                    inspection: {
                      conferente: conferente || 'Conferente de Doca',
                      dataConferencia: new Date().toISOString(),
                      possuiAvarias: avariasList.length > 0,
                      observacoesDoca: observacoesDoca,
                      avarias: avariasList
                    }
                  };
                  if (onChangeOrder) onChangeOrder(finalized);
                  if (onFinalizeOrder) onFinalizeOrder(finalized);
                }}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar & Finalizar Separação</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Separação em Detalhes */}
      {modalItem && (
        <SeparationMatrixModal
          item={modalItem}
          stores={stores}
          isOpen={!!modalItem}
          onClose={() => setModalItem(null)}
          onSaveSeparation={handleSaveModalSeparation}
        />
      )}

      {/* Modal: Zoom da Foto do Produto */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.title} 
              className="max-h-[65vh] w-auto mx-auto object-contain rounded-2xl" 
            />
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {zoomedImage.title}
              </span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
