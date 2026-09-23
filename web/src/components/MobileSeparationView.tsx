import React, { useState, useMemo } from 'react';
import { 
  PackageCheck, 
  Store, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Boxes,
  ShieldAlert,
  Save,
  Clock,
  Check,
  X,
  Lock,
  UserCheck,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Truck
} from 'lucide-react';
import { PurchaseOrder, StoreConfig, OrderItem, AvariaRecord, User, StoreItemCheck } from '../shared/types';
import { convertAvariaToUnits } from './SeparationPage';
import { LOGO_MEGA12_BASE64 } from '../assets/logoBase64';

interface MobileSeparationViewProps {
  order: PurchaseOrder;
  orders?: PurchaseOrder[];
  currentUser?: User | null;
  onSelectOrder?: (order: PurchaseOrder) => void;
  onUpdateOrder: (order: PurchaseOrder) => Promise<void> | void;
  onFinalizeOrder?: (order: PurchaseOrder) => void;
}

export const MobileSeparationView: React.FC<MobileSeparationViewProps> = ({
  order,
  orders = [],
  currentUser,
  onSelectOrder,
  onUpdateOrder,
  onFinalizeOrder
}) => {
  // Lista de pedidos aguardando separação física (status 'Em Separação' ou 'Em Distribuição')
  const pendingSeparationOrders = useMemo(() => {
    return orders.filter(o => {
      const isInPipeline = o.header.status === 'Em Separação' || o.header.status === 'Em Distribuição';
      return isInPipeline;
    });
  }, [orders]);

  // Pedido ativo para separação
  const isActiveEligible = (order.header.status === 'Em Distribuição' || order.header.status === 'Em Separação');

  const activeOrder = isActiveEligible ? order : (pendingSeparationOrders[0] || order);

  const isTransfer = activeOrder.header?.supplierId === 'cd_matriz' || 
                     String(activeOrder.header?.numeroPedido || '').startsWith('CD-') || 
                     String(activeOrder.header?.id || '').startsWith('order_transf_cd_') ||
                     Boolean(activeOrder.header?.fornecedor && activeOrder.header.fornecedor.toLowerCase().includes('transferência'));

  const isReceiptPending = !isTransfer && !activeOrder.header.recebidoMatriz;

  const activeStores = useMemo(() => {
    return (activeOrder.storeConfigs || []).filter(s => s.active);
  }, [activeOrder.storeConfigs]);

  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => activeStores[0]?.id || 'pg_centro');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAvariaForm, setShowAvariaForm] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);

  // Estados do formulário de nova avaria
  const [avariaItemId, setAvariaItemId] = useState<string>('');
  const [avariaStoreId, setAvariaStoreId] = useState<string>(selectedStoreId);
  const [avariaQtd, setAvariaQtd] = useState<number>(1);
  const [avariaUnidade, setAvariaUnidade] = useState<'UN' | 'CX' | 'PCT'>('UN');
  const [avariaMotivo, setAvariaMotivo] = useState<string>('Quebra na conferência');
  const [avariaObs, setAvariaObs] = useState<string>('');

  const selectedStore = activeStores.find(s => s.id === selectedStoreId) || activeStores[0];

  // Avarias atuais do pedido
  const avariasList = useMemo(() => {
    return activeOrder.inspection?.avarias || [];
  }, [activeOrder.inspection?.avarias]);

  // Mapa de Deduções de Avarias por [itemId_storeId]
  const avariasMap = useMemo(() => {
    const map = new Map<string, { totalDeductedUnits: number; records: AvariaRecord[] }>();
    avariasList.forEach(av => {
      const itemRef = activeOrder.items.find(i => i.id === av.itemId);
      const pack = itemRef?.qtdPorPacote || 1;
      const units = convertAvariaToUnits(av.quantidade, av.unidadeMedida, pack);

      const key = `${av.itemId}_${av.storeId}`;
      const existing = map.get(key) || { totalDeductedUnits: 0, records: [] };
      existing.totalDeductedUnits += units;
      existing.records.push(av);
      map.set(key, existing);
    });
    return map;
  }, [avariasList, activeOrder.items]);

  // Total de unidades avariadas em todo o pedido
  const totalPecasAvariadasUnidades = useMemo(() => {
    return avariasList.reduce((sum, av) => {
      const itemRef = activeOrder.items.find(i => i.id === av.itemId);
      const pack = itemRef?.qtdPorPacote || 1;
      return sum + convertAvariaToUnits(av.quantidade, av.unidadeMedida, pack);
    }, 0);
  }, [avariasList, activeOrder.items]);

  // Mapa de conferências por item/loja persistido no SQLite
  const conferenciaLojas = useMemo<Record<string, StoreItemCheck>>(() => {
    return activeOrder.inspection?.conferenciaLojas || {};
  }, [activeOrder.inspection?.conferenciaLojas]);

  // Produtos que têm separação alocada para a loja selecionada
  const storeItemsWithAllocations = useMemo(() => {
    return activeOrder.items
      .map(item => {
        const rawAlloc = Number(item.separacaoLojas?.[selectedStoreId]) || 0;
        const avariaKey = `${item.id}_${selectedStoreId}`;
        const avariaInfo = avariasMap.get(avariaKey);
        const avariaUnits = avariaInfo ? avariaInfo.totalDeductedUnits : 0;
        const effectiveUnits = Math.max(0, rawAlloc - avariaUnits);

        const checkKey = `${selectedStoreId}_${item.id}`;
        const checkRecord = conferenciaLojas[checkKey];
        const isChecked = Boolean(checkRecord?.conferido);
        const isCheckedByCurrent = Boolean(isChecked && checkRecord?.conferenteId === currentUser?.id);
        const isCheckedByOther = Boolean(isChecked && checkRecord?.conferenteId && checkRecord.conferenteId !== currentUser?.id);

        return {
          item,
          rawAlloc,
          avariaUnits,
          effectiveUnits,
          checkKey,
          isChecked,
          checkRecord,
          isCheckedByCurrent,
          isCheckedByOther
        };
      })
      .filter(i => i.rawAlloc > 0 || i.avariaUnits > 0);
  }, [activeOrder.items, selectedStoreId, avariasMap, conferenciaLojas, currentUser?.id]);

  // Estatísticas da loja selecionada
  const totalPecasStoreEfetivas = storeItemsWithAllocations.reduce((acc, i) => acc + i.effectiveUnits, 0);
  const totalItensStoreEfetivos = storeItemsWithAllocations.filter(i => i.effectiveUnits > 0);
  const checkedStoreCount = totalItensStoreEfetivos.filter(i => i.isChecked).length;
  const isAllStoreChecked = totalItensStoreEfetivos.length > 0 && checkedStoreCount === totalItensStoreEfetivos.length;

  // Estatísticas Globais de Todas as Lojas do Pedido
  const globalStats = useMemo(() => {
    let totalItemsNeeded = 0;
    let totalItemsChecked = 0;
    let totalUnitsAllocatedBruto = 0;
    let totalUnitsConferidas = 0;

    activeStores.forEach(s => {
      activeOrder.items.forEach(i => {
        const rawAlloc = Number(i.separacaoLojas?.[s.id]) || 0;
        const avariaKey = `${i.id}_${s.id}`;
        const avariaInfo = avariasMap.get(avariaKey);
        const avariaUnits = avariaInfo ? avariaInfo.totalDeductedUnits : 0;
        const effectiveUnits = Math.max(0, rawAlloc - avariaUnits);

        totalUnitsAllocatedBruto += rawAlloc;

        if (effectiveUnits > 0) {
          totalItemsNeeded++;
          const checkKey = `${s.id}_${i.id}`;
          if (conferenciaLojas[checkKey]?.conferido) {
            totalItemsChecked++;
            totalUnitsConferidas += effectiveUnits;
          }
        }
      });
    });

    const isFullyChecked = totalItemsNeeded > 0 && totalItemsChecked === totalItemsNeeded;
    const totalComprado = activeOrder.items.reduce((acc, i) => acc + (i.qtdTotalUnidades || 0), 0);
    const totalReservaCD = activeOrder.items.reduce((acc, i) => acc + (i.qtdReservaEstoque || 0), 0);
    const totalApurado = totalUnitsAllocatedBruto + totalReservaCD;
    const quantidadesBatem = totalApurado === totalComprado;

    return {
      totalItemsNeeded,
      totalItemsChecked,
      totalUnitsAllocatedBruto,
      totalUnitsConferidas,
      isFullyChecked,
      quantidadesBatem,
      totalComprado,
      totalReservaCD,
      percentualGeral: totalItemsNeeded > 0 ? Math.round((totalItemsChecked / totalItemsNeeded) * 100) : 0
    };
  }, [activeStores, activeOrder.items, avariasMap, conferenciaLojas]);

  // Ação de Conferência Concorrente (Vinculada ao usuário logado e persistida no SQLite)
  const handleToggleCheck = async (itemId: string) => {
    if (isSavingAction) return;

    const checkKey = `${selectedStoreId}_${itemId}`;
    const existingCheck = conferenciaLojas[checkKey];

    // Se já conferido por OUTRO usuário, bloqueia alteração
    if (existingCheck?.conferido && existingCheck.conferenteId && existingCheck.conferenteId !== currentUser?.id) {
      alert(`Este produto foi conferido por ${existingCheck.conferenteNome}. Apenas quem conferiu pode alterar esta conferência.`);
      return;
    }

    setIsSavingAction(true);
    try {
      const now = new Date().toISOString();
      const updatedConferencia = { ...conferenciaLojas };

      if (existingCheck?.conferido) {
        // Desmarcar (apenas o próprio autor pode)
        delete updatedConferencia[checkKey];
      } else {
        // Marcar como conferido vinculado ao usuário logado
        updatedConferencia[checkKey] = {
          conferido: true,
          conferenteId: currentUser?.id || 'usr_separador',
          conferenteNome: currentUser?.nome || 'Conferente',
          dataHora: now
        };
      }

      const updatedOrder: PurchaseOrder = {
        ...activeOrder,
        inspection: {
          ...activeOrder.inspection,
          conferente: currentUser?.nome || activeOrder.inspection?.conferente || 'Conferente Doca',
          dataConferencia: now,
          possuiAvarias: avariasList.length > 0,
          avarias: avariasList,
          conferenciaLojas: updatedConferencia
        }
      };

      await onUpdateOrder(updatedOrder);
    } catch (err: any) {
      console.error('Erro ao atualizar conferência do item:', err);
      alert(`Falha ao salvar conferência no banco: ${err.message || 'Erro de conexão'}`);
    } finally {
      setIsSavingAction(false);
    }
  };

  // Registrar Nova Avaria
  const handleSaveAvaria = async () => {
    const targetItemId = avariaItemId || activeOrder.items[0]?.id;
    if (!targetItemId) {
      alert('Selecione um produto para apontar a avaria.');
      return;
    }
    if (avariaQtd <= 0) {
      alert('A quantidade avariada deve ser maior que zero.');
      return;
    }

    const itemRef = activeOrder.items.find(i => i.id === targetItemId);
    const storeRef = activeStores.find(s => s.id === avariaStoreId);

    const custo = itemRef?.custoRealEfetivo || itemRef?.precoUnitario || 0;
    const pack = itemRef?.qtdPorPacote || 1;
    const units = convertAvariaToUnits(avariaQtd, avariaUnidade, pack);
    const loss = units * custo;

    const newAvaria: AvariaRecord = {
      id: `av_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      itemId: targetItemId,
      codigoProduto: itemRef?.codigo || itemRef?.codigoInterno || '',
      descricaoProduto: itemRef?.descricao || '',
      storeId: avariaStoreId,
      nomeLoja: storeRef?.name || '',
      quantidade: avariaQtd,
      unidadeMedida: avariaUnidade,
      custoUnitario: custo,
      valorPrejuizoTotal: loss,
      motivo: avariaMotivo + (avariaObs ? ` - ${avariaObs}` : ''),
      conferente: currentUser?.nome || 'Conferente Doca',
      dataRegistro: new Date().toISOString()
    };

    const updatedAvarias = [...avariasList, newAvaria];
    const totalLoss = updatedAvarias.reduce((acc, a) => acc + (a.valorPrejuizoTotal || 0), 0);

    const updatedOrder: PurchaseOrder = {
      ...activeOrder,
      inspection: {
        ...activeOrder.inspection,
        conferente: currentUser?.nome || activeOrder.inspection?.conferente || 'Conferente Doca',
        dataConferencia: new Date().toISOString(),
        possuiAvarias: true,
        avarias: updatedAvarias,
        totalPrejuizoAvarias: totalLoss,
        conferenciaLojas
      }
    };

    setIsSavingAction(true);
    try {
      await onUpdateOrder(updatedOrder);
      setShowAvariaForm(false);
      setAvariaObs('');
      setAvariaQtd(1);
    } catch (err: any) {
      alert(`Erro ao salvar avaria no banco: ${err.message}`);
    } finally {
      setIsSavingAction(false);
    }
  };

  // Excluir Avaria
  const handleDeleteAvaria = async (avariaId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este apontamento de avaria?')) return;

    const updatedAvarias = avariasList.filter(a => a.id !== avariaId);
    const totalLoss = updatedAvarias.reduce((acc, a) => acc + (a.valorPrejuizoTotal || 0), 0);

    const updatedOrder: PurchaseOrder = {
      ...activeOrder,
      inspection: {
        ...activeOrder.inspection,
        possuiAvarias: updatedAvarias.length > 0,
        avarias: updatedAvarias,
        totalPrejuizoAvarias: totalLoss,
        conferenciaLojas
      }
    };

    setIsSavingAction(true);
    try {
      await onUpdateOrder(updatedOrder);
    } catch (err: any) {
      alert(`Erro ao remover avaria: ${err.message}`);
    } finally {
      setIsSavingAction(false);
    }
  };

  // Finalizar a separação do pedido
  const handleFinalize = async () => {
    if (!globalStats.isFullyChecked) {
      alert('Não é possível finalizar: todos os itens de todas as lojas precisam estar 100% conferidos.');
      return;
    }

    const now = new Date().toISOString();
    const finalizedOrder: PurchaseOrder = {
      ...activeOrder,
      header: {
        ...activeOrder.header,
        status: 'Faturamento',
        separacaoConcluida: true,
        separadoPor: currentUser?.nome || 'Time de Separação',
        dataSeparacao: now,
        updatedAt: now
      },
      inspection: {
        conferente: currentUser?.nome || activeOrder.inspection?.conferente || 'Conferente Doca',
        dataConferencia: now,
        possuiAvarias: avariasList.length > 0,
        observacoesDoca: activeOrder.inspection?.observacoesDoca || 'Separação concluída via Romaneio de Doca.',
        avarias: avariasList,
        totalPrejuizoAvarias: activeOrder.inspection?.totalPrejuizoAvarias || 0,
        conferenciaLojas
      }
    };

    setIsSavingAction(true);
    try {
      await onUpdateOrder(finalizedOrder);
      if (onFinalizeOrder) {
        onFinalizeOrder(finalizedOrder);
      }
      setShowConfirmModal(false);
    } catch (err: any) {
      alert(`Erro ao finalizar separação no banco: ${err.message}`);
    } finally {
      setIsSavingAction(false);
    }
  };

  if (isReceiptPending) {
    return (
      <div className="space-y-4 max-w-xl mx-auto pb-24 animate-in fade-in duration-200">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-center shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Aguardando Recebimento na Matriz
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            O pedido <b>{activeOrder.header.numeroPedido}</b> ({activeOrder.header.fornecedor}) ainda não teve a entrega física confirmada na Matriz. A conferência e separação só podem ser iniciadas após o recebimento da mercadoria.
          </p>
          {pendingSeparationOrders.length > 0 && onSelectOrder && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase">Outros pedidos recebidos na doca:</span>
              <div className="space-y-2">
                {pendingSeparationOrders.map(p => (
                  <button
                    key={p.header.id}
                    onClick={() => onSelectOrder(p)}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                  >
                    <span>{p.header.numeroPedido} - {p.header.fornecedor}</span>
                    <span className="text-emerald-600 font-mono">Separar →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-24 animate-in fade-in duration-200">
      
      {/* 1. Header do Romaneio de Bolso / Doca & Carga */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 text-white rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden border border-purple-900/40">
        
        {/* Topo do Header: Título & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-purple-400/40 bg-slate-950 p-0.5 shrink-0 shadow-sm">
              <img src={LOGO_MEGA12_BASE64} alt="Mega 12" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white block leading-tight">
                Rede Mega 12
              </span>
              <span className="text-[10px] font-semibold text-purple-200 block leading-tight">
                Romaneio de Bolso • Doca & Carga
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 px-3 py-1 rounded-full backdrop-blur-xs">
            {activeOrder.header.status}
          </span>
        </div>

        {/* Seletor de Pedidos para Separar (Sempre visível no app) */}
        <div>
          <label className="text-[10px] text-purple-300 font-extrabold block mb-1 uppercase tracking-wider">
            Escolha o Pedido para Separar:
          </label>
          <select
            value={activeOrder.header.id || activeOrder.header.numeroPedido}
            onChange={(e) => {
              const targetVal = e.target.value;
              const found = orders.find(o => (o.header.id || o.header.numeroPedido) === targetVal);
              if (found && onSelectOrder) onSelectOrder(found);
            }}
            className="w-full p-3 bg-black/50 border border-white/20 rounded-2xl text-white font-bold text-xs outline-hidden cursor-pointer focus:ring-2 focus:ring-purple-400"
          >
            {pendingSeparationOrders.length > 0 ? (
              pendingSeparationOrders.map(o => (
                <option key={o.header.id || o.header.numeroPedido} value={o.header.id || o.header.numeroPedido} className="bg-slate-900 text-white">
                  📦 Pedido {o.header.numeroPedido} • {o.header.fornecedor} ({o.items.length} itens)
                </option>
              ))
            ) : (
              <option value={activeOrder.header.id || activeOrder.header.numeroPedido} className="bg-slate-900 text-white">
                📦 Pedido {activeOrder.header.numeroPedido} • {activeOrder.header.fornecedor} ({activeOrder.header.status})
              </option>
            )}
          </select>
        </div>

        {/* Fornecedor e Total da Carga */}
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white line-clamp-1 uppercase">
            {activeOrder.header.fornecedor || 'FORNECEDOR'}
          </h2>
          <div className="text-xs text-purple-200 font-mono mt-0.5">
            Pedido: <b>{activeOrder.header.numeroPedido}</b> • {globalStats.totalComprado.toLocaleString('pt-BR')} unidades no total da carga
          </div>
        </div>

        {/* Barra de Progresso Global da Conferência */}
        <div className="space-y-1.5 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] text-purple-200 font-bold">
            <span>Progresso da Conferência:</span>
            <span>{globalStats.percentualGeral}% ({globalStats.totalItemsChecked}/{globalStats.totalItemsNeeded} itens)</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${globalStats.percentualGeral}%` }}
            />
          </div>
        </div>

        {/* Seletor de Filial / Caminhão */}
        <div>
          <label className="text-[11px] text-purple-200 font-bold block mb-1">
            Selecione a Filial / Caminhão:
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full p-3.5 bg-black/50 border border-white/20 rounded-2xl text-white font-black text-sm outline-hidden cursor-pointer focus:ring-2 focus:ring-purple-400"
          >
            {activeStores.map(s => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                🏬 {s.name} (Cluster {s.cluster} • Peso {s.defaultWeight})
              </option>
            ))}
          </select>
        </div>

        {/* Resumo da Filial Selecionada */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-center">
          <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-xs border border-white/10">
            <div className="text-[10px] text-purple-300 uppercase font-bold">Carga Desta Loja</div>
            <div className="text-lg font-black font-mono text-white mt-0.5">
              {totalPecasStoreEfetivas.toLocaleString('pt-BR')} un
            </div>
            <div className="text-[10px] text-purple-200 font-mono">
              ({totalPecasStoreEfetivas.toLocaleString('pt-BR')} unidades líquidas)
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-xs border border-white/10 flex flex-col justify-center">
            <div className="text-[10px] text-purple-300 uppercase font-bold">Status Loja</div>
            <div className={`text-xs font-black mt-1 flex items-center justify-center gap-1 ${
              isAllStoreChecked ? 'text-emerald-400' : 'text-amber-300'
            }`}>
              {isAllStoreChecked ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Conferida!</span>
                </>
              ) : (
                <span>{checkedStoreCount}/{totalItensStoreEfetivos.length} conferidos</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Card de Avarias Apontadas na Carga & Doca */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div 
          onClick={() => setShowAvariaForm(!showAvariaForm)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${avariasList.length > 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Apontamento de Avarias ({avariasList.length})
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {totalPecasAvariadasUnidades > 0 
                  ? `${totalPecasAvariadasUnidades} unidades descontadas das lojas` 
                  : 'Nenhuma avaria apontada na carga'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowAvariaForm(!showAvariaForm); }}
              className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 font-bold text-xs flex items-center gap-1 hover:bg-purple-100"
            >
              {showAvariaForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Formulário e Lista de Avarias */}
        {showAvariaForm && (
          <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
            
            {/* Box de Adicionar Nova Avaria */}
            <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl space-y-3">
              <div className="text-xs font-black text-rose-900 dark:text-rose-300 uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Registrar Nova Avaria na Doca</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Produto */}
                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Produto:
                  </label>
                  <select
                    value={avariaItemId || activeOrder.items[0]?.id}
                    onChange={(e) => setAvariaItemId(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {activeOrder.items.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.descricao} ({it.qtdTotalUnidades} un)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Loja de Destino */}
                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Loja Afetada:
                  </label>
                  <select
                    value={avariaStoreId}
                    onChange={(e) => setAvariaStoreId(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {activeStores.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantidade & Unidade */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Quantidade:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={avariaQtd}
                      onChange={(e) => setAvariaQtd(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-center text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Unidade:
                    </label>
                    <select
                      value={avariaUnidade}
                      onChange={(e) => setAvariaUnidade(e.target.value as any)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    >
                      <option value="UN">UN (Peça)</option>
                      <option value="CX">CX (Caixa Master)</option>
                      <option value="PCT">PCT (Pacote)</option>
                    </select>
                  </div>
                </div>

                {/* Motivo */}
                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Motivo:
                  </label>
                  <select
                    value={avariaMotivo}
                    onChange={(e) => setAvariaMotivo(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="Quebra / Avaria Física">Quebra / Avaria Física</option>
                    <option value="Embalagem Rasgada / Danificada">Embalagem Rasgada / Danificada</option>
                    <option value="Produto Molhado">Produto Molhado</option>
                    <option value="Vencimento / Validade Próxima">Vencimento / Validade</option>
                    <option value="Falta de Mercadoria (Diferença NF)">Falta de Mercadoria</option>
                    <option value="Defeito de Fabricação">Defeito de Fabricação</option>
                  </select>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={avariaObs}
                  onChange={(e) => setAvariaObs(e.target.value)}
                  placeholder="Observações complementares da avaria (opcional)..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveAvaria}
                disabled={isSavingAction}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Avaria e Descontar da Loja</span>
              </button>
            </div>

            {/* Lista das Avarias Registradas */}
            {avariasList.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">
                  Avarias Registradas neste Pedido:
                </div>
                {avariasList.map(av => (
                  <div 
                    key={av.id}
                    className="p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {av.descricaoProduto}
                      </div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                        {av.quantidade} {av.unidadeMedida} para <b>{av.nomeLoja}</b> • {av.motivo}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAvaria(av.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Excluir avaria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Check-list de Produtos da Loja Selecionada */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-purple-600" />
            <span>PRODUTOS PARA {selectedStore?.name?.toUpperCase()}</span>
          </h3>
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
            {checkedStoreCount} de {totalItensStoreEfetivos.length} checados
          </span>
        </div>

        {storeItemsWithAllocations.length === 0 ? (
          <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
            Nenhum produto alocado para a loja <b>{selectedStore?.name}</b> neste pedido.
          </div>
        ) : (
          storeItemsWithAllocations.map(({ item, rawAlloc, avariaUnits, effectiveUnits, isChecked, checkRecord, isCheckedByCurrent, isCheckedByOther }) => {
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!isCheckedByOther) {
                    handleToggleCheck(item.id);
                  }
                }}
                className={`p-4 rounded-3xl border transition-all shadow-xs flex items-center justify-between gap-3 ${
                  isCheckedByOther
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 opacity-90 cursor-not-allowed'
                    : isCheckedByCurrent
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 cursor-pointer'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-purple-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Ícone de Status da Conferência */}
                  <div className="mt-0.5 shrink-0">
                    {isCheckedByOther ? (
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 flex items-center justify-center shadow-xs" title={`Conferido por ${checkRecord?.conferenteNome}`}>
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    ) : isCheckedByCurrent ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                  </div>

                  {/* Foto ou Ícone do Produto */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                    {item.fotoUrl ? (
                      <img src={item.fotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Boxes className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  {/* Dados do Produto */}
                  <div className="min-w-0">
                    <div className={`text-xs font-bold leading-tight ${isChecked ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'} line-clamp-2`}>
                      {item.descricao}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {item.codigo && <span>[{item.codigo}]</span>}
                      {item.qtdPorPacote && item.qtdPorPacote > 1 && (
                        <span>• Embalagem: {item.qtdPorPacote} un/cx</span>
                      )}
                    </div>

                    {/* Selo de Conferência Concorrente */}
                    {isCheckedByOther && (
                      <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Conferido por {checkRecord?.conferenteNome}</span>
                      </div>
                    )}
                    {isCheckedByCurrent && (
                      <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300">
                        <UserCheck className="w-2.5 h-2.5" />
                        <span>Conferido por você</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantidade da Loja com Desconto de Avaria */}
                <div className="text-right shrink-0 ml-2">
                  <div className={`text-base font-black font-mono ${effectiveUnits === 0 ? 'text-slate-400 line-through' : 'text-purple-600 dark:text-purple-400'}`}>
                    {effectiveUnits.toLocaleString('pt-BR')} un
                  </div>
                  {avariaUnits > 0 && (
                    <div className="text-[9px] font-bold text-rose-500 font-mono">
                      -{avariaUnits} un avariada{avariaUnits > 1 ? 's' : ''}
                    </div>
                  )}
                  {rawAlloc !== effectiveUnits && (
                    <div className="text-[9px] text-slate-400 font-mono">
                      Orig: {rawAlloc} un
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Botão Prominente de Salvar & Finalizar Separação (Validação Estrita) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            if (globalStats.isFullyChecked) {
              setShowConfirmModal(true);
            }
          }}
          disabled={!globalStats.isFullyChecked || isSavingAction}
          className={`w-full py-4 px-4 font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2 ${
            globalStats.isFullyChecked
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer animate-pulse'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700'
          }`}
        >
          {globalStats.isFullyChecked ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Salvar & Liberar para Faturamento (100% Conferido)</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-slate-400" />
              <span>
                Conferência Pendente ({globalStats.totalItemsChecked}/{globalStats.totalItemsNeeded} itens conferidos)
              </span>
            </>
          )}
        </button>

        {!globalStats.isFullyChecked && (
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
            ⚠️ O pedido só pode ser finalizado após a conferência de <b>100% dos itens</b> de todas as lojas e com as quantidades batendo.
          </p>
        )}
      </div>

      {/* Modal de Confirmação de Finalização */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-white uppercase">
                Concluir Separação do Pedido?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Todas as lojas foram 100% conferidas na doca. O pedido <b>{activeOrder.header.numeroPedido}</b> será encaminhado para o <b>Faturamento</b>.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Conferente Responsável:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser?.nome || 'Conferente'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Peças Conferidas:</span>
                <span className="font-bold text-emerald-600">{globalStats.totalUnitsConferidas.toLocaleString('pt-BR')} un</span>
              </div>
              {totalPecasAvariadasUnidades > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Peças Avariadas:</span>
                  <span className="font-bold text-rose-600">{totalPecasAvariadasUnidades.toLocaleString('pt-BR')} un</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSavingAction}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
