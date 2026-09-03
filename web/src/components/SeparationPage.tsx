import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
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
  X,
  Bookmark,
  BookmarkPlus,
  Layers,
  ChevronDown
} from 'lucide-react';
import { PurchaseOrder, StoreConfig, OrderItem, AvariaRecord, OrderInspection, User, SeparationPreset } from '../shared/types';
import { calculateAutomaticSeparation, validateSeparation, applySeparationPreset, extractPresetFromAllocations } from '../shared/separationEngine';
import { SeparationMatrixModal } from './SeparationMatrixModal';
import { OrderPipelineStepper } from './OrderPipelineStepper';

interface SeparationPageProps {
  order: PurchaseOrder;
  orders?: PurchaseOrder[];
  stores: StoreConfig[];
  presets?: SeparationPreset[];
  currentUser?: User | null;
  onExportPDF: () => void;
  onExportExcel?: () => void;
  onLoadMockOrder?: () => void;
  onNavigateToOrders: () => void;
  onNavigateToHistory?: () => void;
  onChangeOrder?: (updatedOrder: PurchaseOrder) => void;
  onSelectOrder?: (order: PurchaseOrder) => void;
  onFinalizeOrder?: (order: PurchaseOrder) => void;
  onReleaseToSeparation?: (order: PurchaseOrder) => void;
  onApproveOrder?: (order: PurchaseOrder) => void;
  onSavePreset?: (preset: SeparationPreset) => Promise<any> | void;
  onDeletePreset?: (id: string) => Promise<any> | void;
}

import { convertAvariaToUnits } from '../utils/avariaUtils';

export const SeparationPage: React.FC<SeparationPageProps> = ({
  order,
  orders = [],
  stores,
  currentUser,
  onExportPDF,
  onExportExcel,
  onLoadMockOrder,
  onNavigateToOrders,
  onNavigateToHistory,
  onChangeOrder,
  onSelectOrder,
  onFinalizeOrder,
  onReleaseToSeparation,
  onApproveOrder,
  presets = [],
  onSavePreset,
  onDeletePreset
}) => {
  const activeStores = stores.filter(s => s.active);

  // Estados de Modelos / Presets de Separação (Saves)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => presets[0]?.id || 'preset_default_clusters');
  const [presetInputValue, setPresetInputValue] = useState<string>(() => presets[0]?.name || 'Padrão Rede (Clusters A, B e C)');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setActionFeedback({ text, type });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Sincronizar preset selecionado se lista mudar sem perder o texto se o usuário estiver digitando
  useEffect(() => {
    if (presets.length > 0) {
      const current = presets.find(p => p.id === selectedPresetId);
      if (current) {
        setPresetInputValue(current.name);
      } else {
        setSelectedPresetId(presets[0].id);
        setPresetInputValue(presets[0].name);
      }
    }
  }, [presets]);

  // Aplicar Preset em Todos os Itens do Pedido
  const handleApplyPresetToAll = (presetId?: string, customPreset?: SeparationPreset) => {
    const pId = presetId || selectedPresetId;
    const targetPreset = customPreset || presets.find(p => p.id === pId) || presets[0];
    if (!targetPreset || !onChangeOrder) return;

    const updatedItems = order.items.map(it => {
      // Itens em branco sem quantidade permanecem inalterados
      if (!it.codigo && !it.descricao && (!it.qtdTotalUnidades || it.qtdTotalUnidades <= 0)) {
        return it;
      }

      const res = applySeparationPreset(it.qtdTotalUnidades || 0, targetPreset, stores);
      return {
        ...it,
        separacaoLojas: res.allocations,
        qtdReservaEstoque: res.reserveStock,
        separacaoManual: true
      };
    });

    onChangeOrder({
      ...order,
      items: updatedItems
    });

    const activeCount = updatedItems.filter(i => (i.qtdTotalUnidades || 0) > 0).length;
    showFeedback(`⭐ Modelo "${targetPreset.name}" aplicado a todos os ${activeCount} produtos!`, 'success');
  };

  // Selecionar um preset existente a partir da lista
  const handleSelectPreset = (preset: SeparationPreset) => {
    setSelectedPresetId(preset.id);
    setPresetInputValue(preset.name);
    setIsPresetDropdownOpen(false);
    handleApplyPresetToAll(preset.id, preset);
  };

  // Salvar as proporções da 1ª linha de produtos diretamente no banco (SQLite) com o nome digitado
  const handleDirectSavePreset = async () => {
    const name = presetInputValue.trim();
    if (!name) {
      showFeedback('Por favor, digite o nome do modelo para salvar.', 'error');
      return;
    }
    if (!onSavePreset) return;

    // A primeira linha de produtos com quantidade (ou o primeiro item) como referência
    const firstItem = order.items.find(it => it.qtdTotalUnidades > 0) || order.items[0];
    if (!firstItem) {
      showFeedback('Nenhum produto encontrado no pedido para servir de referência.', 'error');
      return;
    }

    const { storeWeights, reserveStockPercent } = extractPresetFromAllocations(
      firstItem.separacaoLojas || {},
      firstItem.qtdTotalUnidades,
      firstItem.qtdReservaEstoque || 0,
      stores
    );

    const existingPreset = presets.find(p => p.name.trim().toLowerCase() === name.toLowerCase());

    const newPreset: SeparationPreset = {
      id: existingPreset ? existingPreset.id : ('preset_' + Date.now()),
      name: name,
      description: `Referência: 1ª linha (${firstItem.descricao})`,
      storeWeights,
      reserveStockPercent,
      isDefault: existingPreset ? existingPreset.isDefault : false,
      createdAt: existingPreset ? existingPreset.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const saved = await onSavePreset(newPreset);
      const targetId = saved?.id || newPreset.id;
      const finalPreset = saved || newPreset;
      setSelectedPresetId(targetId);
      setPresetInputValue(finalPreset.name);
      setIsPresetDropdownOpen(false);
      handleApplyPresetToAll(targetId, finalPreset);
      showFeedback(`⭐ Modelo "${finalPreset.name}" salvo no SQLite e aplicado a todos os itens!`, 'success');
    } catch (err: any) {
      showFeedback(`Erro ao salvar modelo: ${err.message}`, 'error');
    }
  };

  // Excluir preset customizado do SQLite
  const handleDeleteSelectedPreset = async () => {
    const targetPreset = presets.find(p => p.id === selectedPresetId) || presets.find(p => p.name.toLowerCase() === presetInputValue.trim().toLowerCase());
    if (!targetPreset || targetPreset.isDefault || !onDeletePreset) return;
    if (!window.confirm(`Tem certeza que deseja remover o modelo "${targetPreset.name}" do banco de dados?`)) return;

    try {
      await onDeletePreset(targetPreset.id);
      const remaining = presets.filter(p => p.id !== targetPreset.id);
      const fallback = remaining[0] || { id: 'preset_default_clusters', name: 'Padrão Rede (Clusters A, B e C)' };
      setSelectedPresetId(fallback.id);
      setPresetInputValue(fallback.name);
      showFeedback(`Modelo "${targetPreset.name}" excluído.`, 'info');
    } catch (err: any) {
      showFeedback(`Erro ao remover: ${err.message}`, 'error');
    }
  };

  // Filtrar pedidos que estão com status Aprovados ou Em Separação para o depósito
  const availableDepositOrders = useMemo(() => {
    const list = orders.filter(o => o.header.status === 'Aprovado' || o.header.status === 'Em Separação');
    const currentId = order.header.id || order.header.numeroPedido;
    if (currentId && !list.some(o => (o.header.id || o.header.numeroPedido) === currentId)) {
      return [order, ...list];
    }
    return list;
  }, [orders, order]);
  const pendingSeparationOrders = availableDepositOrders;

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
        unidadeMedida: 'UN',
        motivo: '1 unidade avariada na conferência'
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

  // Status de cada item: Unidades Compradas, Unidades nas Lojas, Unidades no Estoque CD e Validação
  const itemStatusList = useMemo(() => {
    return order.items.map(item => {
      const allocatedUnits = activeStores.reduce((acc, store) => acc + (Number(item.separacaoLojas?.[store.id]) || 0), 0);
      const totalCompradoUnits = Number(item.qtdTotalUnidades) || 0;
      const reserveStockUnits = Math.max(0, totalCompradoUnits - allocatedUnits);

      const isOverAllocated = allocatedUnits > totalCompradoUnits;
      const excessUnits = isOverAllocated ? allocatedUnits - totalCompradoUnits : 0;

      return {
        item,
        allocatedUnits,
        reserveStockUnits,
        totalCompradoUnits,
        isOverAllocated,
        excessUnits,
        isBalanced: !isOverAllocated
      };
    });
  }, [order.items, activeStores]);

  // Totais Gerais em Peças
  const totalPecasGeralBruto = order.items.reduce((acc, item) => acc + (item.qtdTotalUnidades || 0), 0);
  const totalPecasDistribuidoLojasBruto = itemStatusList.reduce((acc, s) => acc + s.allocatedUnits, 0);
  const totalPecasDistribuidoLojasLiquido = Math.max(0, totalPecasDistribuidoLojasBruto - totalPecasAvariadasUnidades);
  const totalPecasGuardadasEstoque = itemStatusList.reduce((acc, s) => acc + s.reserveStockUnits, 0);
  
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

  // Handlers para Edição Direta em Unidades
  const handleUpdateStoreAllocationUnits = (item: OrderItem, storeId: string, rawUnits: number) => {
    if (!onChangeOrder) return;
    const units = Math.max(0, Math.floor(rawUnits || 0));

    const updatedItems = order.items.map(it => {
      if (it.id !== item.id) return it;

      const currentAlloc = { ...(it.separacaoLojas || {}) };
      currentAlloc[storeId] = units;

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

  const handleUpdateItemReserveUnits = (item: OrderItem, rawReserveUnits: number) => {
    if (!onChangeOrder) return;
    const safeUnits = Math.max(0, Math.min(item.qtdTotalUnidades, Math.floor(rawReserveUnits || 0)));

    const sep = calculateAutomaticSeparation(item.qtdTotalUnidades, stores, safeUnits);

    const updatedItems = order.items.map(it => {
      if (it.id !== item.id) return it;
      return {
        ...it,
        separacaoLojas: sep.allocations,
        qtdReservaEstoque: sep.reserveStock,
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

    const sep = calculateAutomaticSeparation(itemToUpdate.qtdTotalUnidades, stores, itemToUpdate.qtdReservaEstoque);

    const updatedItems = order.items.map(it => {
      if (it.id !== itemId) return it;
      return {
        ...it,
        separacaoLojas: sep.allocations,
        qtdReservaEstoque: sep.reserveStock,
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
      const reserveUnits = Math.round((item.qtdTotalUnidades * percent) / 100);
      const sep = calculateAutomaticSeparation(item.qtdTotalUnidades, stores, reserveUnits);
      return {
        ...item,
        separacaoLojas: sep.allocations,
        qtdReservaEstoque: sep.reserveStock,
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
            Este pedido ainda não possui itens cadastrados para geração do romaneio e rateio das lojas.
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
      
      {/* Esteira Operacional Visual do Pedido */}
      <OrderPipelineStepper
        order={order}
        currentUser={currentUser}
        onApproveOrder={onApproveOrder}
        onReleaseToSeparation={onReleaseToSeparation}
        onOpenSeparation={(ord) => {
          if (onSelectOrder) onSelectOrder(ord);
        }}
        onFinalizeSeparation={onFinalizeOrder}
      />

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
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
                <span>Separação & Romaneio</span>

                {/* Dropdown Seletor de Pedidos Disponíveis para o Depósito */}
                <div className="relative inline-flex items-center">
                  <select
                    value={order.header.id || order.header.numeroPedido}
                    onChange={(e) => {
                      const found = availableDepositOrders.find(o => (o.header.id || o.header.numeroPedido) === e.target.value);
                      if (found && onSelectOrder) onSelectOrder(found);
                    }}
                    className="appearance-none bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-mono font-black text-xs px-2.5 py-1 pr-6 rounded-xl shadow-xs cursor-pointer outline-hidden transition focus:ring-2 focus:ring-emerald-500"
                    title="Alternar entre pedidos disponíveis para o depósito"
                  >
                    {availableDepositOrders.map(o => (
                      <option 
                        key={o.header.id || o.header.numeroPedido} 
                        value={o.header.id || o.header.numeroPedido}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-sans font-bold"
                      >
                        {o.header.numeroPedido} {o.header.fornecedor ? `• ${o.header.fornecedor}` : ''} ({o.header.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-300 pointer-events-none absolute right-1.5" />
                </div>
              </h2>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition cursor-pointer"
            title="Gerar Romaneio PDF Paisagem A4 com tabela de separação e volumes"
          >
            <FileText className="w-4 h-4" />
            <span>Romaneio PDF</span>
          </button>
        </div>
      </div>

      {/* 3. Barra Unificada de Resumo Operacional (KPIs Compactos em 1 Linha) */}
      <div className="bg-white dark:bg-slate-800/90 py-2.5 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-wrap md:flex-nowrap items-center justify-between gap-3 text-xs">
        
        {/* Métricas Unificadas */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          
          {/* Status dos Volumes */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg shrink-0 ${!hasAnyOverAllocation ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'}`}>
              {!hasAnyOverAllocation ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Status</span>
              <span className={`text-xs font-black leading-tight ${!hasAnyOverAllocation ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {!hasAnyOverAllocation ? '100% Válido' : 'Excedente'}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />

          {/* Total Lojas */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Enviado às Lojas</span>
              <div className="flex items-baseline gap-1.5 leading-tight">
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {totalPecasDistribuidoLojasLiquido.toLocaleString('pt-BR')} un
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  de {totalPecasGeralBruto.toLocaleString('pt-BR')} un
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />

          {/* Retido CD */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Estoque CD</span>
              <div className="flex items-baseline gap-1.5 leading-tight">
                <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                  {totalPecasGuardadasEstoque.toLocaleString('pt-BR')} un
                </span>
                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded-md">
                  {percentualEstoque}%
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Atalho Voltar para Edição */}
        <button 
          onClick={onNavigateToOrders}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 transition cursor-pointer shrink-0 ml-auto md:ml-0"
          title="Voltar para a tela de cotação e pedidos"
        >
          <span>Editar Pedido</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

      </div>

      {/* Barra de Feedback / Notificação */}
      {actionFeedback && (
        <div className={`p-3.5 px-4 rounded-2xl border flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in duration-200 ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200' 
            : actionFeedback.type === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
            : 'bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-200'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{actionFeedback.text}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3.5. Barra Unificada de Modelos de Rateio & Estoque CD (1 Linha) */}
      <div className="bg-white dark:bg-slate-800/90 py-2.5 px-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs flex items-center justify-between gap-3 flex-nowrap relative z-20 overflow-visible bg-linear-to-r from-indigo-50/40 via-white to-transparent dark:from-indigo-950/20 dark:via-slate-800/90 dark:to-slate-800/90">
        
        {/* Esquerda: Ícone + Título + Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide whitespace-nowrap">
              Modelos & CD
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 whitespace-nowrap">
              {presets.length} {presets.length === 1 ? 'modelo' : 'modelos'}
            </span>
          </div>
        </div>

        {/* Direita: Reter no CD + Combobox de Modelos + Ações (Tudo na mesma linha) */}
        <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
          
          {/* Botões de Retenção de Estoque no CD Matriz */}
          <div className="flex items-center gap-1 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-700/50 p-0.5 sm:p-1 rounded-xl shrink-0">
            <div className="flex items-center gap-1 px-1.5 text-amber-700 dark:text-amber-300">
              <Warehouse className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-bold whitespace-nowrap hidden sm:inline">Reter no CD:</span>
            </div>
            {[0, 10, 20, 30].map(pct => {
              const isSelected = percentualEstoque === pct;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyGlobalReservePercent(pct)}
                  className={`px-2 h-7 text-[11px] font-extrabold rounded-lg transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-xs font-black ring-1 ring-amber-400/40'
                      : 'text-amber-900 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/60'
                  }`}
                  title={`Aplicar ${pct}% de retenção em estoque central para todos os produtos`}
                >
                  {pct === 0 ? '0%' : pct === 10 ? '⭐ 10%' : `${pct}%`}
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden md:block" />

          {/* Seletor de Modelo Digitável */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap relative z-30">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap hidden md:inline">
              Modelo:
            </span>

            {/* Input Digitável com Datalist e Dropdown */}
            <div className="relative w-44 sm:w-56">
              <div className="flex items-center h-8 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-white dark:bg-slate-900 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                  list="presets-datalist"
                  type="text"
                  value={presetInputValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPresetInputValue(val);
                    const matched = presets.find(p => p.name.toLowerCase() === val.trim().toLowerCase());
                    if (matched) {
                      setSelectedPresetId(matched.id);
                      handleApplyPresetToAll(matched.id, matched);
                    }
                  }}
                  onFocus={() => setIsPresetDropdownOpen(true)}
                  placeholder="Digite ou escolha..."
                  className="w-full text-xs font-bold px-2.5 py-1 bg-transparent text-slate-900 dark:text-white outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer shrink-0"
                  title="Ver lista de modelos salvos"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Datalist nativo do navegador para autocomplete instantâneo */}
              <datalist id="presets-datalist">
                {presets.map(p => (
                  <option key={p.id} value={p.name}>
                    {p.isDefault ? '⭐ Padrão Rede' : 'Customizado'}
                  </option>
                ))}
              </datalist>

              {/* Menu Suspenso com os Modelos Salvos */}
              {isPresetDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsPresetDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-2xl z-50 max-h-64 overflow-y-auto py-1">
                    {presets.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleSelectPreset(p);
                          setIsPresetDropdownOpen(false);
                        }}
                        className={`px-3 py-2 text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                          selectedPresetId === p.id 
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {p.isDefault && (
                          <span className="text-[10px] text-amber-500 font-extrabold ml-2 shrink-0">
                            ⭐ Padrão Rede
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Botão Aplicar Modelo Selecionado a Todos os Itens */}
            <button
              type="button"
              onClick={() => handleApplyPresetToAll()}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shrink-0 whitespace-nowrap"
              title="Aplicar a distribuição deste modelo a todos os itens do pedido"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Aplicar</span>
            </button>

            {/* Botão Salvar Modelo com o nome digitado */}
            {onSavePreset && (
              <button
                type="button"
                onClick={handleDirectSavePreset}
                disabled={!presetInputValue.trim()}
                className="inline-flex items-center gap-1 px-3 h-8 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                title="Salvar o modelo com o nome digitado diretamente no banco de dados SQLite"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            )}

            {/* Botão Excluir Modelo Customizado */}
            {onDeletePreset && presets.find(p => (p.id === selectedPresetId || p.name.toLowerCase() === presetInputValue.trim().toLowerCase()) && !p.isDefault) && (
              <button
                type="button"
                onClick={handleDeleteSelectedPreset}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center justify-center shrink-0"
                title="Excluir este modelo customizado do banco de dados"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 4. Tabela Interativa da Matriz de Separação */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* Cabeçalho da Tabela Compacto e Limpo */}
        <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <PackageCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Grade de Distribuição
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
              Cluster A: 51.3%
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 font-bold border border-slate-500/20">
              Cluster B: 35.9%
            </span>
            <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/20">
              Cluster C: 12.8%
            </span>
            {possuiAvarias === 'sim' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Amarelo = Avaria</span>
              </span>
            )}
          </div>
        </div>

        {/* Tabela Scrollável */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Linha 1 de Cabeçalho: Agrupamentos Visuais */}
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-center font-bold text-[10px] uppercase tracking-wider">
                <th rowSpan={2} className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-800 sticky left-0 z-20 min-w-[220px]">
                  Dados do Produto
                </th>
                <th colSpan={3} className="py-1.5 px-2 bg-slate-100/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-800">
                  Balanço Geral
                </th>
                <th colSpan={clusterA.length} className="py-1.5 px-2 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-r border-b border-slate-200 dark:border-slate-800">
                  Cluster A ({clusterA.length} Lojas • 51.3%)
                </th>
                <th colSpan={clusterB.length} className="py-1.5 px-2 bg-slate-50/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800">
                  Cluster B ({clusterB.length} Lojas • 35.9%)
                </th>
                <th colSpan={clusterC.length} className="py-1.5 px-2 bg-teal-50/50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-r border-b border-slate-200 dark:border-slate-800">
                  Cluster C ({clusterC.length} Lojas / CD • 12.8%)
                </th>
                <th rowSpan={2} className="py-2.5 px-2 bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-center min-w-[75px]">
                  Ações
                </th>
              </tr>

              {/* Linha 2 de Cabeçalho: Colunas e Nomes das Lojas */}
              <tr className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 min-w-[70px]" title="Total comprado">
                  Comprado
                </th>
                <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 min-w-[75px]" title="Guardado no CD">
                  Estoque CD
                </th>
                <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 min-w-[70px]" title="Distribuído para lojas">
                  Lojas
                </th>
                {activeStores.map(store => (
                  <th 
                    key={store.id} 
                    className={`py-2 px-1.5 text-center border-r border-slate-200 dark:border-slate-800 min-w-[58px] sm:min-w-[62px] whitespace-nowrap text-[11px] font-semibold ${
                      store.cluster === 'A' ? 'bg-blue-50/20 dark:bg-blue-950/10' : 
                      store.cluster === 'B' ? 'bg-slate-50/30 dark:bg-slate-900/20' : 
                      'bg-teal-50/20 dark:bg-teal-950/10'
                    }`}
                  >
                    <span className="truncate max-w-[65px] block mx-auto" title={`${store.name} (${store.cluster})`}>
                      {store.name.replace('Ponta Grossa ', 'PG ').replace('Depósito Central', 'CD Central')}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Linhas de Produtos */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {order.items.map((item, idx) => {
                const status = itemStatusList[idx];

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group">
                    
                    {/* 1. Descrição e Código com Foto */}
                    <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 transition z-10">
                      <div className="flex items-center gap-2.5">
                        {/* Foto Miniatura */}
                        <div 
                          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shrink-0 flex items-center justify-center cursor-pointer shadow-2xs"
                          onClick={() => item.fotoUrl && setZoomedImage({ url: item.fotoUrl, title: item.descricao })}
                          title={item.fotoUrl ? "Clique para ver a foto ampliada" : "Sem foto"}
                        >
                          {item.fotoUrl ? (
                            <img src={item.fotoUrl} alt="" className="w-full h-full object-cover hover:scale-110 transition" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[200px]" title={item.descricao}>
                            {item.descricao}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.codigoInterno || item.codigo || 'S/ CÓD'}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{item.qtdTotalUnidades.toLocaleString('pt-BR')}</span>
                            {item.separacaoManual && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[9px] border border-amber-500/20">
                                Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Total Comprado */}
                    <td className="py-2 px-2 text-center font-mono font-bold text-xs border-r border-slate-100 dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400">
                      <div>
                        {item.qtdTotalUnidades.toLocaleString('pt-BR')}
                      </div>
                    </td>

                    {/* 3. Coluna Estoque CD (Guardado) */}
                    <td className="py-1 px-1.5 text-center border-r border-slate-100 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-950/10">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          min="0"
                          max={item.qtdTotalUnidades}
                          value={status.reserveStockUnits}
                          onChange={(e) => handleUpdateItemReserveUnits(item, parseFloat(e.target.value) || 0)}
                          className="w-14 h-7 text-center font-mono font-bold text-xs rounded-lg border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 focus:ring-2 focus:ring-amber-500 outline-hidden transition"
                          title="Quantidade guardada no Estoque Central (CD)"
                        />
                      </div>
                    </td>

                    {/* 4. Total Distribuído para Lojas */}
                    <td className={`py-2 px-2 text-center font-mono font-bold text-xs border-r border-slate-100 dark:border-slate-800 ${
                      status.isOverAllocated 
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black' 
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      <div>
                        {status.allocatedUnits.toLocaleString('pt-BR')}
                      </div>
                      {status.isOverAllocated && (
                        <div className="text-[9px] font-bold text-rose-600 dark:text-rose-400">
                          +{status.excessUnits}
                        </div>
                      )}
                    </td>

                    {/* 5. Células de Cada Loja - Editáveis */}
                    {activeStores.map(store => {
                      const rawAllocUnits = item.separacaoLojas?.[store.id] || 0;
                      
                      const avariaInfo = avariasMap.get(`${item.id}_${store.id}`);
                      const hasAvaria = avariaInfo !== undefined && avariaInfo.totalDeductedUnits > 0;
                      const deductedUnits = hasAvaria ? avariaInfo.totalDeductedUnits : 0;
                      const effectiveUnits = Math.max(0, rawAllocUnits - deductedUnits);

                      return (
                        <td 
                          key={store.id} 
                          className={`py-1 px-1 text-center font-mono border-r transition ${
                            hasAvaria
                              ? 'bg-amber-100/80 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700/80'
                              : 'border-slate-100 dark:border-slate-800/60'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={rawAllocUnits}
                              onChange={(e) => handleUpdateStoreAllocationUnits(item, store.id, parseFloat(e.target.value) || 0)}
                              className={`w-12 sm:w-13 h-7 text-center font-mono font-bold text-xs rounded-lg border transition outline-hidden ${
                                rawAllocUnits > 0
                                  ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500'
                                  : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-transparent text-slate-300 dark:text-slate-600 hover:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:text-slate-900 dark:focus:text-white'
                              }`}
                              title={`${store.name} (${store.cluster}) • ${rawAllocUnits}`}
                            />

                            {hasAvaria && (
                              <span 
                                className="text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/90 px-1 py-0.2 rounded-sm mt-0.5 border border-rose-300 dark:border-rose-800 whitespace-nowrap"
                                title={`Original: ${rawAllocUnits} • Avaria: -${deductedUnits} (Efetivo: ${effectiveUnits})`}
                              >
                                {effectiveUnits}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* 6. Ações por Linha */}
                    <td className="py-1.5 px-1.5 text-center bg-slate-50/40 dark:bg-slate-900/30">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAutoRateioItem(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                          title="Recalcular rateio deste produto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleZeroAllStoresForItem(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                          title="Zerar lojas (guardar 100% no estoque CD)"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalItem(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                          title="Abrir detalhes em tela cheia"
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
              <tr className="bg-slate-100/80 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
                <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-slate-100/95 dark:bg-slate-900/95 z-10 uppercase text-[11px] font-black tracking-wider">
                  Total Geral
                </td>
                <td className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  <div>{totalPecasGeralBruto.toLocaleString('pt-BR')}</div>
                </td>
                <td className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20">
                  <div>{totalPecasGuardadasEstoque.toLocaleString('pt-BR')}</div>
                </td>
                <td className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                  <div>{totalPecasDistribuidoLojasLiquido.toLocaleString('pt-BR')}</div>
                </td>
                {activeStores.map(store => {
                  const somaLojaUnidades = order.items.reduce((acc, item) => acc + (Number(item.separacaoLojas?.[store.id]) || 0), 0);

                  return (
                    <td key={store.id} className="py-2.5 px-1.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {somaLojaUnidades.toLocaleString('pt-BR')}
                      </div>
                    </td>
                  );
                })}
                <td className="py-2.5 px-2 text-center font-mono text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                  OK
                </td>
              </tr>
            </tfoot>

          </table>
        </div>
      </div>

      {/* 5. Bloco de Apontamento de Doca & Registro de Avarias (Compacto em 1 Linha) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs space-y-3 transition-all text-xs">
        
        {/* Barra de Controles Principais */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
          
          {/* Lado Esquerdo: Identificador + 3 Campos Alinhados */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 min-w-0">
            
            {/* Ícone e Título Sutil */}
            <div className="flex items-center gap-1.5 shrink-0 text-slate-700 dark:text-slate-300 font-extrabold mr-1">
              <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Doca:</span>
            </div>

            {/* 1. Conferente */}
            <div className="w-full sm:w-44 shrink-0">
              <input 
                type="text" 
                value={conferente}
                onChange={(e) => setConferente(e.target.value)}
                placeholder="Nome do conferente..." 
                className="w-full h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                title="Conferente responsável na doca"
              />
            </div>

            {/* 2. Possui Avarias */}
            <div className="w-full sm:w-56 shrink-0">
              <select 
                value={possuiAvarias}
                onChange={(e) => setPossuiAvarias(e.target.value as 'nao' | 'sim')}
                className={`w-full h-8 px-2.5 text-xs font-bold rounded-xl border outline-hidden cursor-pointer transition ${
                  possuiAvarias === 'sim'
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <option value="nao">✅ Sem Avarias (100% Íntegra)</option>
                <option value="sim">⚠️ Apontar Avarias / Faltas</option>
              </select>
            </div>

            {/* 3. Observações Gerais */}
            <div className="flex-1 min-w-[160px] w-full">
              <input 
                type="text" 
                value={observacoesDoca}
                onChange={(e) => setObservacoesDoca(e.target.value)}
                placeholder="Observações da doca (opcional)..." 
                className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden placeholder:text-slate-400"
              />
            </div>

          </div>

          {/* Lado Direito: Botão Salvar / Finalizar */}
          <div className="shrink-0 ml-auto lg:ml-0 flex items-center gap-2">
            {order.header.status === 'Finalizado' ? (
              <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Finalizado</span>
              </span>
            ) : (
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
                  showFeedback('✅ Separação e conferência finalizadas com sucesso!', 'success');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition cursor-pointer shrink-0"
                title="Salvar apontamento e finalizar separação"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finalizar Separação</span>
              </button>
            )}
          </div>

        </div>

        {/* Grade Expansível de Avarias (Aparece somente se selecionado "SIM") */}
        {possuiAvarias === 'sim' && (
          <div className="p-3.5 rounded-xl border border-amber-300/80 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20 space-y-2.5 mt-2 animate-in fade-in duration-150">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-amber-950 dark:text-amber-300">
                  Ocorrências de Avaria por Produto
                </h4>
                {avariasList.length > 0 && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                    ({totalPecasAvariadasUnidades} un descontadas)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddAvaria}
                className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Ocorrência</span>
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
                    className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 flex-1 items-center">
                      
                      {/* Produto */}
                      <div className="sm:col-span-4">
                        <select
                          value={av.itemId}
                          onChange={(e) => handleUpdateAvaria(av.id, 'itemId', e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold outline-hidden truncate"
                        >
                          {order.items.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.codigo ? `[${item.codigo}] ` : ''}{item.descricao} (Emb: {item.qtdPorPacote} un)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Loja */}
                      <div className="sm:col-span-3">
                        <select
                          value={av.storeId}
                          onChange={(e) => handleUpdateAvaria(av.id, 'storeId', e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold outline-hidden"
                        >
                          {activeStores.map(store => (
                            <option key={store.id} value={store.id}>
                              {store.name} ({store.cluster})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantidade */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(av.id, -1)}
                            className="w-7 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={av.quantidade}
                            onChange={(e) => handleUpdateAvaria(av.id, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full h-8 px-1 text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(av.id, 1)}
                            className="w-7 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Unidade */}
                      <div className="sm:col-span-3">
                        <select
                          value={av.unidadeMedida || 'UN'}
                          onChange={(e) => handleUpdateAvaria(av.id, 'unidadeMedida', e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-hidden cursor-pointer text-emerald-700 dark:text-emerald-400"
                        >
                          <option value="UN">UN (Individual)</option>
                          <option value="PCT">PCT ({packSize} un)</option>
                          <option value="CX">CX ({packSize} un)</option>
                          <option value="JG">JG ({packSize} un)</option>
                          <option value="PAR">PAR (2 un)</option>
                        </select>
                      </div>

                    </div>

                    {/* Motivo & Excluir */}
                    <div className="flex items-center gap-2 md:w-72">
                      <input
                        type="text"
                        value={av.motivo}
                        onChange={(e) => handleUpdateAvaria(av.id, 'motivo', e.target.value)}
                        placeholder="Motivo da avaria..."
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden"
                      />
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap">
                        -{convertedTotal} un
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAvaria(av.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition shrink-0 cursor-pointer"
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

      </div>

      {/* Modal de Separação em Detalhes */}
      {modalItem && (
        <SeparationMatrixModal
          item={modalItem}
          stores={stores}
          presets={presets}
          isOpen={!!modalItem}
          onClose={() => setModalItem(null)}
          onSaveSeparation={handleSaveModalSeparation}
          onSavePreset={onSavePreset}
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
