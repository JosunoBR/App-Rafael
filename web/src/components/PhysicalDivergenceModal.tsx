import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Check, 
  Search, 
  AlertTriangle, 
  RotateCcw, 
  Scale, 
  Package, 
  Boxes, 
  ArrowRight, 
  Store as StoreIcon, 
  Plus, 
  Minus, 
  Loader2, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { PurchaseOrder, StoreConfig, OrderItem, PhysicalDivergenceRecord } from '../shared/types';

interface PhysicalDivergenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  stores: StoreConfig[];
  initialItemId?: string | null;
  onApplyDivergence: (payload: {
    itemId: string;
    novoPack: number;
    novasCaixas: number;
    novasUnidades: number;
    novaGrade: Record<string, number>;
    motivo: string;
    expectedVersion?: number;
  }) => Promise<void>;
  onRevertDivergence: (divergenceId: string) => Promise<void>;
}

export const PhysicalDivergenceModal: React.FC<PhysicalDivergenceModalProps> = ({
  isOpen,
  onClose,
  order,
  stores,
  initialItemId = null,
  onApplyDivergence,
  onRevertDivergence
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Form states for the selected product
  const [novoPack, setNovoPack] = useState<number>(1);
  const [novasCaixas, setNovasCaixas] = useState<number>(0);
  const [motivo, setMotivo] = useState<string>('');
  const [gradeLojas, setGradeLojas] = useState<Record<string, number>>({});
  const [isGradeExpanded, setIsGradeExpanded] = useState<boolean>(true);

  // Loading and action feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const activeStores = useMemo(() => stores.filter(s => s.active), [stores]);

  // Set initial item when opened
  useEffect(() => {
    if (isOpen) {
      if (initialItemId && order.items.some(it => it.id === initialItemId)) {
        setSelectedItemId(initialItemId);
      } else {
        setSelectedItemId(null);
      }
      setSearchTerm('');
      setActionFeedback(null);
    }
  }, [isOpen, initialItemId, order.items]);

  // Currently selected item
  const selectedItem: OrderItem | null = useMemo(() => {
    if (!selectedItemId) return null;
    return order.items.find(it => it.id === selectedItemId) || null;
  }, [selectedItemId, order.items]);

  // Original item values before any adjustments
  const originalValues = useMemo(() => {
    if (!selectedItem) return { pack: 1, caixas: 0, unidades: 0, grade: {} };
    const pack = Number(selectedItem.packOriginal || selectedItem.qtdNoPacote || selectedItem.qtdPorPacote || 1);
    const caixas = Number(selectedItem.qtdPacotesOriginal !== undefined ? selectedItem.qtdPacotesOriginal : (selectedItem.qtdPacotes || 0));
    const unidades = Number(selectedItem.qtdTotalUnidadesOriginal !== undefined ? selectedItem.qtdTotalUnidadesOriginal : (selectedItem.qtdTotalUnidades || (caixas * pack)));
    const grade = selectedItem.separacaoLojasOriginal || selectedItem.separacaoLojas || selectedItem.grade || {};
    return { pack, caixas, unidades, grade };
  }, [selectedItem]);

  // Calculate proportional distribution in UNITS whenever product or novasCaixas / novoPack changes
  const calculateProportional = (targetUnits: number, prevAlloc: Record<string, number>): Record<string, number> => {
    const totalPrevUnits = Object.values(prevAlloc).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const newAlloc: Record<string, number> = {};

    activeStores.forEach(s => { newAlloc[s.id] = 0; });

    if (targetUnits <= 0) {
      return newAlloc;
    }

    // If there were previous allocations, calculate proportionally in UNITS
    if (totalPrevUnits > 0) {
      const remainders: { storeId: string; remainder: number }[] = [];
      let distributedUnits = 0;

      activeStores.forEach(s => {
        const prevUnits = Number(prevAlloc[s.id] || 0);
        const share = prevUnits / totalPrevUnits;
        const exactUnits = targetUnits * share;
        const floorUnits = Math.floor(exactUnits);
        newAlloc[s.id] = floorUnits;
        distributedUnits += floorUnits;
        remainders.push({ storeId: s.id, remainder: exactUnits - floorUnits });
      });

      // Distribute remaining units to stores with largest remainder (Hare-Niemeyer method)
      remainders.sort((a, b) => b.remainder - a.remainder);
      let left = targetUnits - distributedUnits;
      let i = 0;
      while (left > 0 && remainders.length > 0) {
        const sId = remainders[i % remainders.length].storeId;
        newAlloc[sId] = (newAlloc[sId] || 0) + 1;
        left--;
        i++;
      }
    } else {
      // Fallback: distribute units evenly among active stores
      const unitsPerStore = Math.floor(targetUnits / activeStores.length);
      let left = targetUnits % activeStores.length;
      activeStores.forEach((s, idx) => {
        const u = unitsPerStore + (idx < left ? 1 : 0);
        newAlloc[s.id] = u;
      });
    }

    return newAlloc;
  };

  // Populate form when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      const currentPack = Number(selectedItem.qtdNoPacote || selectedItem.qtdPorPacote || 1);
      const currentCaixas = Number(selectedItem.qtdPacotes || 0);
      setNovoPack(currentPack);
      setNovasCaixas(currentCaixas);
      setMotivo('');

      const baseAlloc = selectedItem.separacaoLojasOriginal || selectedItem.separacaoLojas || selectedItem.grade || {};
      const targetUnits = currentCaixas * currentPack;
      setGradeLojas(calculateProportional(targetUnits, baseAlloc));
    }
  }, [selectedItem]);

  // Recalculate grade when user changes novoPack or novasCaixas in the form
  const handleBoxesChange = (newBoxes: number) => {
    const val = Math.max(0, newBoxes);
    setNovasCaixas(val);
    if (selectedItem) {
      const baseAlloc = selectedItem.separacaoLojasOriginal || selectedItem.separacaoLojas || {};
      const targetUnits = val * novoPack;
      setGradeLojas(calculateProportional(targetUnits, baseAlloc));
    }
  };

  const handlePackChange = (newPack: number) => {
    const val = Math.max(1, newPack);
    setNovoPack(val);
    if (selectedItem) {
      const baseAlloc = selectedItem.separacaoLojasOriginal || selectedItem.separacaoLojas || {};
      const targetUnits = novasCaixas * val;
      setGradeLojas(calculateProportional(targetUnits, baseAlloc));
    }
  };

  // Calculated metrics
  const novasUnidadesCalculadas = novasCaixas * novoPack;
  const totalAlocadoGrade = Object.values(gradeLojas).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const totalCaixasAlocadas = novoPack > 0 ? totalAlocadoGrade / novoPack : 0;
  const isBalanced = totalAlocadoGrade === novasUnidadesCalculadas;

  // Filter products for search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return order.items;
    const term = searchTerm.toLowerCase().trim();
    return order.items.filter(it => {
      const desc = (it.descricao || '').toLowerCase();
      const codInt = (it.codigoInterno || it.codigo || '').toLowerCase();
      const codForn = (it.codigoFornecedor || '').toLowerCase();
      return desc.includes(term) || codInt.includes(term) || codForn.includes(term);
    });
  }, [order.items, searchTerm]);

  // Active divergences on this order
  const historicoDivergencias: PhysicalDivergenceRecord[] = useMemo(() => {
    return order.header.divergenciasFisicas || [];
  }, [order.header.divergenciasFisicas]);

  const handleSaveItemDivergence = async () => {
    if (!selectedItem) return;
    if (novoPack <= 0) {
      setActionFeedback({ text: 'O pack precisa ser maior que zero.', type: 'error' });
      return;
    }
    if (novasCaixas < 0) {
      setActionFeedback({ text: 'A quantidade de caixas não pode ser negativa.', type: 'error' });
      return;
    }
    if (!motivo.trim()) {
      setActionFeedback({ text: 'Por favor, informe o motivo da divergência para auditoria.', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      await onApplyDivergence({
        itemId: selectedItem.id,
        novoPack,
        novasCaixas,
        novasUnidades: novasUnidadesCalculadas,
        novaGrade: gradeLojas,
        motivo: motivo.trim(),
        expectedVersion: order.header.version
      });

      setActionFeedback({ 
        text: `Divergência de "${selectedItem.descricao}" aplicada e sincronizada com a doca.`, 
        type: 'success' 
      });

      // Clear selection and fields so the user can adjust another item right away
      setSelectedItemId(null);
      setSearchTerm('');
      setMotivo('');
    } catch (err: any) {
      console.error('Erro ao aplicar divergência física:', err);
      setActionFeedback({ text: err.message || 'Erro ao aplicar divergência física.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevert = async (divId: string) => {
    try {
      setRevertingId(divId);
      await onRevertDivergence(divId);
      setActionFeedback({ text: 'Ajuste revertido aos valores originais com sucesso.', type: 'success' });
    } catch (err: any) {
      console.error('Erro ao reverter divergência:', err);
      setActionFeedback({ text: err.message || 'Erro ao reverter divergência.', type: 'error' });
    } finally {
      setRevertingId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header - Padrão do Sistema */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Ajuste de Divergência Física de Carga
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                  Doca vs. Pedido/NF
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Pedido <span className="font-bold text-slate-700 dark:text-slate-300">#{order.header.numeroPedido}</span> • {order.header.fornecedor}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action feedback banner */}
        {actionFeedback && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
            actionFeedback.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}>
            <span>{actionFeedback.text}</span>
            <button 
              type="button" 
              onClick={() => setActionFeedback(null)} 
              className="hover:underline ml-2 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin bg-white dark:bg-slate-900">
          
          {/* 1. SELEÇÃO DE PRODUTO */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-500" />
              1. Selecionar Produto ({order.items.length} itens no pedido)
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por descrição, código interno ou referência de fábrica..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List of matching products (compact selector) */}
            <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/40 scrollbar-thin">
              {filteredItems.length === 0 ? (
                <div className="p-3.5 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Nenhum produto encontrado com os termos pesquisados.
                </div>
              ) : (
                filteredItems.map(item => {
                  const isSelected = selectedItemId === item.id;
                  const hasDivergence = !!item.divergenciaFisicaAtiva;
                  const itemPack = Number(item.qtdNoPacote || item.qtdPorPacote || 1);
                  const itemBoxes = Number(item.qtdPacotes || 0);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setActionFeedback(null);
                      }}
                      className={`w-full p-3 text-left flex items-center justify-between gap-3 text-xs transition cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-l-4 border-indigo-600' 
                          : 'hover:bg-white dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white truncate">
                            {item.descricao}
                          </span>
                          {hasDivergence && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 font-mono">
                              <Scale className="w-2.5 h-2.5" />
                              Ajustado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono">Cód: {item.codigoInterno || item.codigo || '-'}</span>
                          <span>Ref: {item.codigoFornecedor || '-'}</span>
                          <span>Atual: <strong className="text-slate-700 dark:text-slate-300">{itemBoxes} cx</strong> (Pack {itemPack}) = <strong>{item.qtdTotalUnidades} un</strong></span>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="p-1 rounded-full bg-indigo-600 text-white shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0">
                          Selecionar
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. FORMULÁRIO DE AJUSTE (ATIVO QUANDO PRODUTO SELECIONADO) */}
          {selectedItem && (
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-4 animate-in fade-in duration-150">
              
              {/* Product Title Bar */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Produto em Edição
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {selectedItem.descricao}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cód: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedItem.codigoInterno || selectedItem.codigo || '-'}</span> • Ref: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedItem.codigoFornecedor || '-'}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItemId(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline"
                >
                  Trocar produto
                </button>
              </div>

              {/* Comparison Box: Original vs Realidade Física */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left Card: Dados Originais do Pedido */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Original (NF / Pedido)
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Base</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Pack Orig.</span>
                      <strong className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {originalValues.pack} un
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Caixas Orig.</span>
                      <strong className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {originalValues.caixas} cx
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Total Peças</span>
                      <strong className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {originalValues.unidades} un
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right Card: Novos Dados Físicos Reais (Doca) */}
                <div className="p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-500" />
                      Físico Real na Doca
                    </span>
                    <span className="text-[10px] uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-200 dark:border-indigo-800">
                      Ajustar
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Novo Pack
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={novoPack}
                        onChange={e => handlePackChange(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 text-xs font-extrabold text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Novas Caixas
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={novasCaixas}
                        onChange={e => handleBoxesChange(parseInt(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-xs font-extrabold text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center flex flex-col justify-center border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Novas Peças</span>
                      <strong className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {novasUnidadesCalculadas} un
                      </strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Differentials Alert Pill */}
              {(novasCaixas !== originalValues.caixas || novoPack !== originalValues.pack) && (
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      Diferença: <strong className="text-slate-900 dark:text-white">{novasCaixas - originalValues.caixas} cx</strong> ({novasUnidadesCalculadas - originalValues.unidades} peças)
                      {novoPack !== originalValues.pack && ` • Pack alterado: ${originalValues.pack} ➔ ${novoPack} un/cx`}
                    </span>
                  </div>
                  <span className="font-bold text-[10px] uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                    {novasCaixas < originalValues.caixas ? 'Falta de Carga' : 'Ajuste de Pack'}
                  </span>
                </div>
              )}

              {/* Motive & Justification */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Motivo da Divergência (Auditoria e Faturamento)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Obrigatório</span>
                </label>

                <input
                  type="text"
                  placeholder="Ex: Fabricante alterou o pack de fábrica e faltaram 8 caixas no palete..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                />
              </div>

              {/* Store Distribution Preview & Fine-Tuning */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div 
                  className="p-3.5 bg-slate-100/90 dark:bg-slate-800 flex items-center justify-between cursor-pointer select-none border-b border-slate-200 dark:border-slate-700"
                  onClick={() => setIsGradeExpanded(!isGradeExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <StoreIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Prévia da Distribuição por Loja ({activeStores.length} filiais)
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isBalanced 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}>
                      {isBalanced 
                        ? `Rateado: ${totalAlocadoGrade} un (${Number(totalCaixasAlocadas.toFixed(1))} cx)` 
                        : `Diferença: ${totalAlocadoGrade - novasUnidadesCalculadas > 0 ? '+' : ''}${totalAlocadoGrade - novasUnidadesCalculadas} un`}
                    </span>
                  </div>

                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                    {isGradeExpanded ? 'Recolher' : 'Expandir e Ajustar'}
                  </span>
                </div>

                {isGradeExpanded && (
                  <div className="p-3.5 bg-white dark:bg-slate-900">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      Cotas recalculadas proporcionalmente por <strong className="text-slate-700 dark:text-slate-200">unidade</strong>. Ajuste a quantidade por filial se desejar (as caixas são apenas informativas):
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin">
                      {activeStores.map(store => {
                        const units = gradeLojas[store.id] || 0;
                        const boxes = novoPack > 0 ? (units / novoPack) : 0;
                        const formattedBoxes = Number.isInteger(boxes)
                          ? `${boxes} cx`
                          : `~${boxes.toFixed(1).replace('.', ',')} cx`;

                        return (
                          <div 
                            key={store.id} 
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate" title={store.name}>
                                {store.name}
                              </span>
                              <span 
                                className="text-[10px] font-mono text-slate-400 dark:text-slate-400 shrink-0 font-medium" 
                                title={`Equivalente informativo: ${boxes.toFixed(2)} caixas`}
                              >
                                {formattedBoxes}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1 mt-2">
                              <button
                                type="button"
                                disabled={units <= 0}
                                onClick={() => {
                                  const updated = { ...gradeLojas, [store.id]: Math.max(0, units - 1) };
                                  setGradeLojas(updated);
                                }}
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 cursor-pointer transition shrink-0"
                                title="Diminuir 1 unidade"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <div className="flex items-center justify-center gap-0.5 flex-1 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={units === 0 ? '' : units}
                                  placeholder="0"
                                  onFocus={e => e.target.select()}
                                  onChange={e => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setGradeLojas({ ...gradeLojas, [store.id]: val });
                                  }}
                                  className="w-14 h-7 text-center font-extrabold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                  title="Quantidade em unidades desta filial"
                                />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">un</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...gradeLojas, [store.id]: units + 1 };
                                  setGradeLojas(updated);
                                }}
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer transition shrink-0"
                                title="Aumentar 1 unidade"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemId(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar este item
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !isBalanced || !motivo.trim()}
                  onClick={handleSaveItemDivergence}
                  className="px-5 py-2.5 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Ajuste do Item</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* 3. LISTA DE AJUSTES REALIZADOS NESTA CARGA */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-500" />
                Histórico de Divergências nesta Carga ({historicoDivergencias.length})
              </h3>
              {historicoDivergencias.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  Sincronizado automaticamente com o App da Doca
                </span>
              )}
            </div>

            {historicoDivergencias.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-slate-50/40 dark:bg-slate-800/20">
                Nenhuma divergência física registrada até o momento nesta carga.
              </div>
            ) : (
              <div className="space-y-2.5">
                {historicoDivergencias.map((divRec) => {
                  const isReverting = revertingId === divRec.id;
                  const isApplied = divRec.status === 'aplicado';

                  return (
                    <div
                      key={divRec.id}
                      className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        isApplied 
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700' 
                          : 'bg-slate-50/40 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-50'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-slate-900 dark:text-white font-extrabold">
                            {divRec.descricao}
                          </strong>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isApplied 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {isApplied ? 'Ativo' : 'Revertido'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
                          <span>
                            Original: <span className="line-through">{divRec.qtdPacotesOriginal} cx</span> (Pack {divRec.packOriginal}) = {divRec.qtdTotalUnidadesOriginal} un
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>
                            Físico: <strong className="text-slate-900 dark:text-white font-bold">{divRec.qtdPacotesNovo} cx</strong> (Pack {divRec.packNovo}) = <strong>{divRec.qtdTotalUnidadesNovo} un</strong>
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          "{divRec.motivo}" • <span className="font-semibold text-slate-600 dark:text-slate-400">{divRec.registradoPor}</span> ({new Date(divRec.dataRegistro).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })})
                        </p>
                      </div>

                      {isApplied && (
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isReverting}
                            onClick={() => handleRevert(divRec.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                            title="Desfazer e restaurar quantidades originais do pedido"
                          >
                            {isReverting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>Reverter</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Bottom Actions / Footer - Padrão do Sistema */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between sticky bottom-0 z-10">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Divergências confirmadas ajustam as cotas no app dos separadores em tempo real.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
