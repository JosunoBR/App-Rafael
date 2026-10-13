import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Bookmark,
  Search,
  ArrowLeft,
  Save,
  Sparkles,
  Warehouse,
  Store as StoreIcon,
  RotateCcw,
  Percent,
  CheckCircle2,
  AlertCircle,
  Copy
} from 'lucide-react';
import { StoreConfig, SeparationPreset } from '../shared/types';

interface SeparationPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreConfig[];
  presets: SeparationPreset[];
  onSavePreset?: (preset: SeparationPreset) => Promise<any> | void;
  onDeletePreset?: (id: string) => Promise<any> | void;
  onSelectPreset?: (preset: SeparationPreset) => void;
  firstRowAllocations?: {
    storeWeights: Record<string, number>;
    reserveStockPercent: number;
  };
}

export const SeparationPresetsModal: React.FC<SeparationPresetsModalProps> = ({
  isOpen,
  onClose,
  stores,
  presets,
  onSavePreset,
  onDeletePreset,
  onSelectPreset,
  firstRowAllocations
}) => {
  // Modo de visualização: 'list' (listagem) ou 'form' (cadastro/edição)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPreset, setEditingPreset] = useState<SeparationPreset | null>(null);

  // Estados do formulário de criação/edição
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReservePercent, setFormReservePercent] = useState<number>(10);
  const [formStoreWeights, setFormStoreWeights] = useState<Record<string, number>>({});
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lojas ativas ordenadas por cluster e nome
  const activeStores = useMemo(() => {
    return stores.filter(s => s.active);
  }, [stores]);

  // Agrupamento de lojas por Cluster (A, B, C)
  const storesByCluster = useMemo(() => {
    const map: Record<string, StoreConfig[]> = { A: [], B: [], C: [], Outros: [] };
    activeStores.forEach(s => {
      if (s.cluster === 'A' || s.cluster === 'B' || s.cluster === 'C') {
        map[s.cluster].push(s);
      } else {
        map['Outros'].push(s);
      }
    });
    return map;
  }, [activeStores]);

  // Soma atual das porcentagens das lojas no formulário
  const currentTotalStorePercent = useMemo(() => {
    const sum = Object.values(formStoreWeights).reduce((acc, val) => acc + (Number(val) || 0), 0);
    return Number(sum.toFixed(2));
  }, [formStoreWeights]);

  // Reset ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setViewMode('list');
      setEditingPreset(null);
      setErrorMsg(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  // Iniciar formulário para novo padrão
  const handleStartNewPreset = () => {
    setEditingPreset(null);
    setFormName('');
    setFormDescription('');
    setFormReservePercent(10);
    setFormIsDefault(false);
    setErrorMsg(null);

    // Inicializa com os pesos padrão atuais das lojas
    const initialWeights: Record<string, number> = {};
    activeStores.forEach(s => {
      initialWeights[s.id] = Number(s.defaultWeight) || 0;
    });
    setFormStoreWeights(initialWeights);
    setViewMode('form');
  };

  // Iniciar edição de um padrão existente
  const handleStartEditPreset = (preset: SeparationPreset) => {
    setEditingPreset(preset);
    setFormName(preset.name);
    setFormDescription(preset.description || '');
    setFormReservePercent(Number(preset.reserveStockPercent) || 0);
    setFormIsDefault(Boolean(preset.isDefault));
    setErrorMsg(null);

    const weights: Record<string, number> = {};
    activeStores.forEach(s => {
      weights[s.id] = preset.storeWeights?.[s.id] !== undefined
        ? Number(preset.storeWeights[s.id])
        : 0;
    });
    setFormStoreWeights(weights);
    setViewMode('form');
  };

  // Importar proporções da 1ª linha do pedido para o formulário
  const handleImportFromFirstRow = () => {
    if (!firstRowAllocations) return;
    setFormReservePercent(firstRowAllocations.reserveStockPercent);
    const newWeights: Record<string, number> = {};
    activeStores.forEach(s => {
      newWeights[s.id] = firstRowAllocations.storeWeights?.[s.id] !== undefined
        ? Number(firstRowAllocations.storeWeights[s.id])
        : 0;
    });
    setFormStoreWeights(newWeights);
  };

  // Distribuir 100% igualmente entre as lojas ativas
  const handleDistributeEqually = () => {
    if (activeStores.length === 0) return;
    const basePct = Number((100 / activeStores.length).toFixed(2));
    const remainder = Number((100 - basePct * activeStores.length).toFixed(2));
    const newWeights: Record<string, number> = {};
    activeStores.forEach((s, idx) => {
      newWeights[s.id] = idx === 0 ? Number((basePct + remainder).toFixed(2)) : basePct;
    });
    setFormStoreWeights(newWeights);
  };

  // Zerar todas as lojas
  const handleResetAllWeights = () => {
    const newWeights: Record<string, number> = {};
    activeStores.forEach(s => { newWeights[s.id] = 0; });
    setFormStoreWeights(newWeights);
  };

  // Alterar percentual de uma loja individual
  const handleStoreWeightChange = (storeId: string, value: string) => {
    const parsed = parseFloat(value.replace(',', '.')) || 0;
    setFormStoreWeights(prev => ({
      ...prev,
      [storeId]: Math.max(0, Math.min(100, parsed))
    }));
  };

  // Salvar formulário
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setErrorMsg('Informe o nome do padrão de distribuição.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const presetToSave: SeparationPreset = {
        id: editingPreset ? editingPreset.id : `preset_${Date.now()}`,
        name: cleanName,
        description: formDescription.trim() || undefined,
        reserveStockPercent: Number(formReservePercent) || 0,
        storeWeights: formStoreWeights,
        isDefault: formIsDefault,
        createdAt: editingPreset ? editingPreset.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (onSavePreset) {
        await onSavePreset(presetToSave);
      }
      setViewMode('list');
      setEditingPreset(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao salvar o padrão no banco.');
    } finally {
      setSaving(false);
    }
  };

  // Excluir padrão com confirmação
  const handleDelete = async (preset: SeparationPreset) => {
    if (preset.isDefault) {
      alert('O padrão principal da rede não pode ser excluído.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja remover o padrão "${preset.name}"?`)) {
      return;
    }
    try {
      await onDeletePreset?.(preset.id);
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir padrão.');
    }
  };

  // Filtragem de padrões por busca
  const filteredPresets = useMemo(() => {
    if (!searchTerm.trim()) return presets;
    const term = searchTerm.toLowerCase();
    return presets.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.description && p.description.toLowerCase().includes(term))
    );
  }, [presets, searchTerm]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            {viewMode === 'form' && (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer mr-1"
                title="Voltar para lista de padrões"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{viewMode === 'list' ? 'Padrões de Distribuição (Lojas & CD)' : (editingPreset ? 'Editar Padrão de Distribuição' : 'Novo Padrão de Distribuição')}</span>
                {viewMode === 'list' && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {presets.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {viewMode === 'list' 
                  ? 'Cadastre e selecione os modelos com as porcentagens das 20 lojas e retenção de CD' 
                  : 'Defina os percentuais de cada filial e a reserva do Estoque Central'}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto p-5">
          {viewMode === 'list' ? (
            /* =================== MODO 1: LISTAGEM DE PADRÕES =================== */
            <div className="space-y-4">
              {/* Barra de Ações Superiores */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar padrão por nome..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  {firstRowAllocations && (
                    <button
                      type="button"
                      onClick={() => {
                        handleStartNewPreset();
                        handleImportFromFirstRow();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition cursor-pointer"
                      title="Criar novo padrão aproveitando as porcentagens da 1ª linha da grade"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar da Grade Atual</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStartNewPreset}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Novo Padrão</span>
                  </button>
                </div>
              </div>

              {/* Lista de Cards de Padrões */}
              {filteredPresets.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Bookmark className="w-10 h-10 mx-auto opacity-40 mb-2" />
                  <p className="text-sm font-bold">Nenhum padrão encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">Clique em "Cadastrar Novo Padrão" para cadastrar as porcentagens das lojas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPresets.map(preset => {
                    const activeCount = Object.values(preset.storeWeights || {}).filter(w => Number(w) > 0).length;
                    return (
                      <div
                        key={preset.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          preset.isDefault
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{preset.name}</span>
                              {preset.isDefault && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                  ⭐ Padrão Rede
                                </span>
                              )}
                            </h4>
                          </div>

                          {preset.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                              {preset.description}
                            </p>
                          )}

                          {/* Pills de Detalhes */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Warehouse className="w-3 h-3 text-amber-500" />
                              <span>Reter {preset.reserveStockPercent}% no CD</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <StoreIcon className="w-3 h-3 text-slate-500" />
                              <span>{activeCount} filiais c/ rateio</span>
                            </span>
                          </div>
                        </div>

                        {/* Ações do Card */}
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditPreset(preset)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="Editar porcentagens deste padrão"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!preset.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDelete(preset)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Excluir este padrão"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {onSelectPreset && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectPreset(preset);
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shadow-2xs"
                              title="Aplicar este padrão a todos os produtos do pedido"
                            >
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Aplicar no Pedido</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* =================== MODO 2: FORMULÁRIO DE CADASTRO/EDIÇÃO =================== */
            <form onSubmit={handleSaveForm} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Padrão *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Rateio Litoral + CD 20%, Distribuição Padrão..."
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição / Finalidade (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ex: Usado para compras de verão com maior foco no litoral"
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Retenção no Centro de Distribuição / CD */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Reter no Estoque Central / CD (%):
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">
                      (As filiais recebem o saldo restante de 100% - CD)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {[0, 10, 15, 20, 30].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setFormReservePercent(pct)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        formReservePercent === pct
                          ? 'bg-amber-500 text-white font-extrabold shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <div className="relative w-20">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formReservePercent}
                      onChange={(e) => setFormReservePercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-full pl-2.5 pr-6 py-1 text-xs font-mono font-bold rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-2 top-1 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
              </div>

              {/* Seção das Porcentagens das 20 Lojas */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <StoreIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Porcentagem por Loja (20 Filiais)
                    </span>
                    
                    {/* Badge da Soma Total */}
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-extrabold flex items-center gap-1 ${
                      Math.abs(currentTotalStorePercent - 100) < 0.01
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}>
                      {Math.abs(currentTotalStorePercent - 100) < 0.01 ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Total: 100.0% (Equilibrado)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Total: {currentTotalStorePercent}% ({currentTotalStorePercent < 100 ? `Faltam ${(100 - currentTotalStorePercent).toFixed(1)}%` : `Excede ${(currentTotalStorePercent - 100).toFixed(1)}%`})</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Botões Rápidos de Distribuição */}
                  <div className="flex items-center gap-1.5">
                    {firstRowAllocations && (
                      <button
                        type="button"
                        onClick={handleImportFromFirstRow}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                        title="Puxar porcentagens exatas da 1ª linha aberta na grade"
                      >
                        Copiar da Grade
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDistributeEqually}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                      title="Dividir 100% igualmente entre todas as filiais"
                    >
                      Dividir Igualmente
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAllWeights}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition cursor-pointer"
                      title="Zerar todos os valores"
                    >
                      Zerar
                    </button>
                  </div>
                </div>

                {/* Grid das Lojas agrupadas por Cluster */}
                <div className="space-y-3">
                  {(['A', 'B', 'C'] as const).map(clusterKey => {
                    const clusterStores = storesByCluster[clusterKey] || [];
                    if (clusterStores.length === 0) return null;
                    const clusterSum = clusterStores.reduce((acc, s) => acc + (Number(formStoreWeights[s.id]) || 0), 0);

                    return (
                      <div key={clusterKey} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Cluster {clusterKey} ({clusterStores.length} Lojas)
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            Subtotal: {clusterSum.toFixed(1)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {clusterStores.map(store => {
                            const val = formStoreWeights[store.id] !== undefined ? formStoreWeights[store.id] : 0;
                            return (
                              <div
                                key={store.id}
                                className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs"
                              >
                                <div className="truncate min-w-0 pr-1">
                                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {store.shortName || store.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                    {store.id}
                                  </div>
                                </div>

                                <div className="relative w-16 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={val === 0 ? '' : val}
                                    placeholder="0"
                                    onChange={(e) => handleStoreWeightChange(store.id, e.target.value)}
                                    className="w-full pl-1.5 pr-4 py-1 text-xs font-mono font-bold text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-indigo-500"
                                  />
                                  <span className="absolute right-1 top-1 text-[10px] font-bold text-slate-400 pointer-events-none">%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botões do Rodapé do Formulário */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Salvando no Banco...' : 'Salvar Padrão no Banco'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
