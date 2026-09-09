import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  RotateCcw, 
  HelpCircle,
  FileSpreadsheet,
  Percent,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Bookmark,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { FiscalConfig, FiscalPreset } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_FISCAL_PRESETS } from '../shared/constants';
import { calculateItemFiscal, normalizeRateToDecimal } from '../shared/fiscalEngine';
import { formatCurrency, handleCurrencyInput, handleOneDecimalInput } from '../utils/masks';

interface OrderFiscalCardProps {
  fiscalConfig: FiscalConfig;
  onChangeFiscalConfig: (newConfig: FiscalConfig) => void;
  aliquotaStHeader?: number;
  onUpdateHeaderSt?: (newSt: number) => void;
  valorFreteHeader?: number;
  onUpdateHeaderFrete?: (newFrete: number) => void;
  totalMercadorias?: number;
  averageItemPrice?: number;
  samplePdv?: number;
  fiscalPresets?: FiscalPreset[];
  onSaveFiscalPreset?: (preset: FiscalPreset) => Promise<any> | void;
  onDeleteFiscalPreset?: (presetId: string) => Promise<any> | void;
}

export const OrderFiscalCard: React.FC<OrderFiscalCardProps> = ({
  fiscalConfig,
  onChangeFiscalConfig,
  aliquotaStHeader,
  onUpdateHeaderSt,
  valorFreteHeader,
  onUpdateHeaderFrete,
  totalMercadorias = 0,
  averageItemPrice = 7.00,
  samplePdv = 12.00,
  fiscalPresets = [],
  onSaveFiscalPreset,
  onDeleteFiscalPreset
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [simPreco, setSimPreco] = useState<number>(averageItemPrice > 0 ? averageItemPrice : 7.00);
  const [simPdv, setSimPdv] = useState<number>(samplePdv > 0 ? samplePdv : 12.00);

  // Normalização das alíquotas ativas em percentual com 1 casa decimal (0 a 100)
  const ipiPct = Number(((normalizeRateToDecimal(fiscalConfig.ipiAliquota, 0)) * 100).toFixed(1));
  const stPct = Number(((normalizeRateToDecimal(fiscalConfig.aliquotaSt !== undefined ? fiscalConfig.aliquotaSt : aliquotaStHeader, 0)) * 100).toFixed(1));
  const fretePct = Number(((normalizeRateToDecimal(fiscalConfig.freteAliquota, 0)) * 100).toFixed(1));

  const icmsEntradaPct = Number(((normalizeRateToDecimal(fiscalConfig.creditoEntradaICMS, 0.12)) * 100).toFixed(1));
  const custoFixoPct = Number(((normalizeRateToDecimal(fiscalConfig.custosFixos, 0.26)) * 100).toFixed(1));
  const icmsSaidaPct = Number(((normalizeRateToDecimal(fiscalConfig.icmsAliquota, 0.195)) * 100).toFixed(1));
  const pisCofinsPct = Number(((normalizeRateToDecimal(fiscalConfig.pisCofinsAliquota, 0.06)) * 100).toFixed(1));

  // Valor em R$ calculado do frete a partir da alíquota e do total de mercadorias
  const freteValorCalculado = valorFreteHeader !== undefined && valorFreteHeader > 0
    ? valorFreteHeader
    : (totalMercadorias > 0 && fretePct > 0 ? Number((totalMercadorias * (fretePct / 100)).toFixed(2)) : 0);

  // Handler para campos de porcentagem usando handleOneDecimalInput (1 casa decimal)
  const handleRateChange = (
    field: keyof FiscalConfig,
    inputValue: string,
    isST: boolean = false
  ) => {
    const { value } = handleOneDecimalInput(inputValue);
    const decimalValue = Number((value / 100).toFixed(4));
    
    const updated: FiscalConfig = {
      ...fiscalConfig,
      [field]: decimalValue
    };

    if (isST) {
      updated.aliquotaSt = decimalValue;
      if (onUpdateHeaderSt) {
        onUpdateHeaderSt(value); // sincroniza o header
      }
    }

    if (field === 'freteAliquota' && onUpdateHeaderFrete) {
      const calcFrete = totalMercadorias > 0 ? Number((totalMercadorias * decimalValue).toFixed(2)) : 0;
      onUpdateHeaderFrete(calcFrete);
    }

    onChangeFiscalConfig(updated);
  };

  // Cálculo da simulação em tempo real
  const simResult = useMemo(() => {
    return calculateItemFiscal(simPreco, simPdv, fiscalConfig);
  }, [simPreco, simPdv, fiscalConfig]);

  // Lista de modelos fiscais disponíveis (mescla defaults com os do banco)
  const presetsList = useMemo(() => {
    if (fiscalPresets && fiscalPresets.length > 0) return fiscalPresets;
    return DEFAULT_FISCAL_PRESETS;
  }, [fiscalPresets]);

  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_fiscal_padrao');
  const [presetInputValue, setPresetInputValue] = useState<string>('Padrão Geral');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionFeedback({ text, type });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Aplicar modelo fiscal ao pedido atual
  const handleApplyPreset = (targetPreset: FiscalPreset) => {
    const updated: FiscalConfig = {
      ipiAliquota: targetPreset.ipiAliquota,
      aliquotaSt: targetPreset.aliquotaSt,
      freteAliquota: targetPreset.freteAliquota,
      creditoEntradaICMS: targetPreset.creditoEntradaICMS,
      custosFixos: targetPreset.custosFixos,
      icmsAliquota: targetPreset.icmsAliquota,
      pisCofinsAliquota: targetPreset.pisCofinsAliquota
    };

    onChangeFiscalConfig(updated);

    if (onUpdateHeaderSt) {
      const stPerc = Number(((targetPreset.aliquotaSt || 0) * 100).toFixed(1));
      onUpdateHeaderSt(stPerc);
    }

    if (onUpdateHeaderFrete) {
      const fretePerc = targetPreset.freteAliquota || 0;
      const calcFrete = totalMercadorias > 0 ? Number((totalMercadorias * fretePerc).toFixed(2)) : 0;
      onUpdateHeaderFrete(calcFrete);
    }

    setSelectedPresetId(targetPreset.id);
    setPresetInputValue(targetPreset.name);
    setIsPresetDropdownOpen(false);
    showFeedback(`Modelo fiscal "${targetPreset.name}" aplicado ao pedido!`, 'success');
  };

  // Salvar alíquotas atualmente configuradas como um modelo no banco
  const handleSaveCurrentPreset = async () => {
    const name = presetInputValue.trim();
    if (!name) {
      showFeedback('Por favor, digite um nome para o modelo fiscal antes de salvar.', 'error');
      return;
    }
    if (!onSaveFiscalPreset) return;

    const existingPreset = presetsList.find(p => p.name.trim().toLowerCase() === name.toLowerCase());

    const newPreset: FiscalPreset = {
      id: existingPreset ? existingPreset.id : ('preset_fisc_' + Date.now()),
      name,
      description: `IPI ${ipiPct}% • ST ${stPct}% • Frete ${fretePct}% • CF ${custoFixoPct}% • ICMS ${icmsSaidaPct}%`,
      ipiAliquota: normalizeRateToDecimal(fiscalConfig.ipiAliquota, 0),
      aliquotaSt: normalizeRateToDecimal(fiscalConfig.aliquotaSt !== undefined ? fiscalConfig.aliquotaSt : aliquotaStHeader, 0),
      freteAliquota: normalizeRateToDecimal(fiscalConfig.freteAliquota, 0),
      creditoEntradaICMS: normalizeRateToDecimal(fiscalConfig.creditoEntradaICMS, 0.12),
      custosFixos: normalizeRateToDecimal(fiscalConfig.custosFixos, 0.26),
      icmsAliquota: normalizeRateToDecimal(fiscalConfig.icmsAliquota, 0.195),
      pisCofinsAliquota: normalizeRateToDecimal(fiscalConfig.pisCofinsAliquota, 0.06),
      isDefault: existingPreset ? existingPreset.isDefault : false,
      createdAt: existingPreset ? existingPreset.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await onSaveFiscalPreset(newPreset);
      setSelectedPresetId(newPreset.id);
      setPresetInputValue(newPreset.name);
      setIsPresetDropdownOpen(false);
      showFeedback(`⭐ Modelo fiscal "${newPreset.name}" salvo no banco com sucesso!`, 'success');
    } catch (err: any) {
      showFeedback(`Erro ao salvar modelo: ${err.message}`, 'error');
    }
  };

  // Excluir modelo específico direto
  const handleDeletePresetDirect = async (presetId: string, presetName: string) => {
    if (!onDeleteFiscalPreset) return;
    if (!window.confirm(`Tem certeza que deseja excluir o modelo fiscal "${presetName}"?`)) return;

    try {
      await onDeleteFiscalPreset(presetId);
      const defaultP = presetsList.find(p => p.isDefault) || presetsList[0];
      if (defaultP) {
        setSelectedPresetId(defaultP.id);
        setPresetInputValue(defaultP.name);
      }
      showFeedback(`Modelo fiscal "${presetName}" excluído com sucesso.`, 'info');
    } catch (err: any) {
      showFeedback(`Erro ao excluir modelo: ${err.message}`, 'error');
    }
  };

  // Excluir modelo customizado atualmente selecionado
  const handleDeleteSelectedPreset = async () => {
    const targetPreset = presetsList.find(p => p.id === selectedPresetId || p.name.trim().toLowerCase() === presetInputValue.trim().toLowerCase());
    if (!targetPreset) {
      showFeedback('Nenhum modelo selecionado para exclusão.', 'info');
      return;
    }
    if (targetPreset.isDefault) {
      showFeedback('O modelo oficial "Padrão Geral" não pode ser excluído.', 'info');
      return;
    }
    await handleDeletePresetDirect(targetPreset.id, targetPreset.name);
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-6 overflow-hidden transition-all">
      {/* CABEÇALHO RETRÁTIL DO CARD */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition cursor-pointer text-left select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Engenharia Fiscal & Margem do Pedido
              </span>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/50">
                Individual por Pedido
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Personalize IPI, ST, Frete, ICMS Entrada/Saída, Custo Fixo e PIS/COFINS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60">
              Encargos Entrada: +{(ipiPct + stPct + fretePct).toFixed(1)}%
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60">
              Custos s/ PDV: {(icmsSaidaPct + custoFixoPct + pisCofinsPct).toFixed(1)}%
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-200">
              Custo Loja: {formatCurrency(simResult.custoLoja)}
            </span>
          </div>

          <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* CONTEÚDO EXPANDIDO: DUAS PARTES (ENTRADA E SAÍDA) */}
      {isOpen && (
        <div className="p-5 border-t border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800 space-y-4 animate-in fade-in duration-200">
          
          {/* BARRA DE FEEDBACK DE AÇÃO */}
          {actionFeedback && (
            <div className={`p-3 px-4 rounded-xl border flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in duration-200 ${
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
              <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* BARRA DE MODELOS & PRESETS FISCAIS */}
          <div className="bg-slate-50/90 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            
            {/* Esquerda: Ícone, Título e Contador de Modelos */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    MODELOS FISCAIS
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {presetsList.length} {presetsList.length === 1 ? 'modelo' : 'modelos'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Configure as alíquotas e salve modelos reutilizáveis no banco de dados
                </p>
              </div>
            </div>

            {/* Direita: Seletor de Modelo, Dropdown, Aplicar, Salvar e Excluir */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Modelo:</span>
              <div className="relative min-w-[200px] sm:w-56">
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type="text"
                    value={presetInputValue}
                    onChange={(e) => {
                      setPresetInputValue(e.target.value);
                      setIsPresetDropdownOpen(true);
                    }}
                    onFocus={() => setIsPresetDropdownOpen(true)}
                    placeholder="Nome do modelo..."
                    className="w-full text-xs font-bold px-2.5 py-1.5 bg-transparent text-slate-900 dark:text-white outline-hidden truncate"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 transition cursor-pointer shrink-0"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown de Modelos com Botão de Lixeira para Cada Item Salvo */}
                {isPresetDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsPresetDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-30 max-h-60 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800">
                      {presetsList.map(p => (
                        <div
                          key={p.id}
                          className={`px-3 py-2 text-xs font-bold flex items-center justify-between transition ${
                            selectedPresetId === p.id 
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div 
                            onClick={() => handleApplyPreset(p)}
                            className="flex-1 truncate cursor-pointer mr-2"
                            title="Clique para aplicar este modelo"
                          >
                            <span>{p.name}</span>
                            {p.description && (
                              <span className="block text-[10px] font-normal text-slate-400 truncate">
                                {p.description}
                              </span>
                            )}
                          </div>

                          {p.isDefault ? (
                            <span className="text-[10px] text-amber-500 font-extrabold ml-2 shrink-0 select-none">
                              ⭐ Padrão Rede
                            </span>
                          ) : (
                            onDeleteFiscalPreset && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePresetDirect(p.id, p.name);
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer shrink-0 ml-1"
                                title={`Excluir modelo "${p.name}"`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Botão Aplicar */}
              <button
                type="button"
                onClick={() => {
                  const target = presetsList.find(p => p.id === selectedPresetId || p.name.trim().toLowerCase() === presetInputValue.trim().toLowerCase());
                  if (target) {
                    handleApplyPreset(target);
                  } else {
                    showFeedback('Selecione um modelo da lista para aplicar.', 'info');
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                title="Aplicar modelo selecionado ao pedido atual"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aplicar</span>
              </button>

              {/* Botão Salvar no Banco SQLite */}
              {onSaveFiscalPreset && (
                <button
                  type="button"
                  onClick={handleSaveCurrentPreset}
                  disabled={!presetInputValue.trim()}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition cursor-pointer disabled:opacity-50"
                  title="Salvar alíquotas configuradas neste card como um modelo no banco de dados"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
              )}

              {/* Botão Excluir Visível */}
              {onDeleteFiscalPreset && !Boolean(presetsList.find(p => (p.id === selectedPresetId || p.name.trim().toLowerCase() === presetInputValue.trim().toLowerCase()) && p.isDefault)) && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedPreset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition cursor-pointer shadow-xs"
                  title="Excluir o modelo customizado selecionado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              )}
            </div>
          </div>

          {/* GRID DE DUAS PARTES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ========================================================= */}
            {/* PARTE 1: IMPOSTOS + CUSTOS DE ENTRADA (Custo Real Fornecedor) */}
            {/* ========================================================= */}
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/40">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    1. CUSTO REAL FORNECEDOR (ENTRADA)
                  </h4>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-medium">
                    Valor do item acrescenta IPI, ST e Frete (Desembolso Compra / Boletos)
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-300/40">
                  Encargos: +{(ipiPct + stPct + fretePct).toFixed(1)}%
                </span>
              </div>

              {/* INPUTS DE ENTRADA */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    IPI (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={ipiPct > 0 ? ipiPct.toFixed(1).replace('.', ',') : '0,0'}
                      onChange={(e) => handleRateChange('ipiAliquota', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ST (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={stPct > 0 ? stPct.toFixed(1).replace('.', ',') : '0,0'}
                      onChange={(e) => handleRateChange('aliquotaSt', e.target.value, true)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      FRETE (%)
                    </label>
                    {freteValorCalculado > 0 && (
                      <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                        = R$ {freteValorCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={fretePct > 0 ? fretePct.toFixed(1).replace('.', ',') : '0,0'}
                      onChange={(e) => handleRateChange('freteAliquota', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Gera boleto frete 10d após entrega
                  </p>
                </div>
              </div>

              {/* SIMULAÇÃO AO VIVO DA ENTRADA */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <span>SIMULAÇÃO ENTRADA</span>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-slate-500">VALOR PRODUTO:</span>
                    <input
                      type="number"
                      step="0.10"
                      value={simPreco}
                      onChange={(e) => setSimPreco(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1 py-0.5 text-right font-bold text-emerald-600 bg-slate-50 dark:bg-slate-800 border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>IPI</span>
                  <span>{ipiPct.toFixed(1)}% ({simPreco.toFixed(2)} × {ipiPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.ipiUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ST</span>
                  <span>{stPct.toFixed(1)}% ({simPreco.toFixed(2)} × {stPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.stUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>FRETE</span>
                  <span>{fretePct.toFixed(1)}% ({simPreco.toFixed(2)} × {fretePct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.freteUnit.toFixed(2)}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                  <span className="text-emerald-900 dark:text-emerald-300">TOTAL CUSTO REAL (ENCARGOS):</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    R$ {simResult.custoRealEntrada.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Custo Fornecedor (Produto + Encargos):</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    R$ {simResult.custoFornecedor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* PARTE 2: IMPOSTOS + CUSTOS DE SAÍDA (Custo Loja) */}
            {/* ========================================================= */}
            <div className="rounded-xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/10 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60 dark:border-blue-800/40">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                    2. FORMAÇÃO DO CUSTO LOJA (CUSTO & MARGEM)
                  </h4>
                  <p className="text-[10px] text-blue-700/80 dark:text-blue-400 font-medium">
                    Desconta ICMS Entrada do produto e soma custos incidentes sobre o PDV
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md border border-blue-300/40">
                  Custos s/ PDV: {(custoFixoPct + icmsSaidaPct + pisCofinsPct).toFixed(1)}%
                </span>
              </div>

              {/* INPUTS DE SAÍDA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="Crédito de ICMS de Entrada a descontar do produto">
                    ICMS Entrada (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={icmsEntradaPct > 0 ? icmsEntradaPct.toFixed(1).replace('.', ',') : '0,0'}
                      onChange={(e) => handleRateChange('creditoEntradaICMS', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Desconta do item
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="Custo fixo proporcional multiplicado por PDV">
                    Custo Fixo (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={custoFixoPct > 0 ? custoFixoPct.toFixed(1).replace('.', ',') : '0,0'}
                      onChange={(e) => handleRateChange('custosFixos', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    s/ PDV
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="ICMS de Saída na ponta multiplicado por PDV">
                    ICMS Saída (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={icmsSaidaPct > 0 ? icmsSaidaPct.toFixed(1).replace('.', ',') : '0,0'}
                      onChange={(e) => handleRateChange('icmsAliquota', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    s/ PDV
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1" title="PIS, COFINS, IR multiplicado por PDV">
                    PIS/COF/IR (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pisCofinsPct > 0 ? pisCofinsPct.toFixed(1).replace('.', ',') : '0,0'}
                      onChange={(e) => handleRateChange('pisCofinsAliquota', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    s/ PDV
                  </p>
                </div>
              </div>

              {/* SIMULAÇÃO AO VIVO DA SAÍDA */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-blue-200/60 dark:border-blue-800/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <span>SIMULAÇÃO CUSTO LOJA</span>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-slate-500">PDV ALVO:</span>
                    <input
                      type="number"
                      step="0.50"
                      value={simPdv}
                      onChange={(e) => setSimPdv(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1 py-0.5 text-right font-bold text-blue-600 bg-slate-50 dark:bg-slate-800 border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ICMS ENTRADA</span>
                  <span>{icmsEntradaPct.toFixed(1)}% ({simPreco.toFixed(2)} - {icmsEntradaPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.baseIcmsEntrada.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>CUSTO FIXO</span>
                  <span>{custoFixoPct.toFixed(1)}% ({simPdv.toFixed(2)} × {custoFixoPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.custoFixoUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>CUSTO REAL (ENCARGOS ENTRADA)</span>
                  <span>(IPI + ST + Frete da Parte 1)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.custoRealEntrada.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ICMS SAÍDA</span>
                  <span>{icmsSaidaPct.toFixed(1)}% ({simPdv.toFixed(2)} × {icmsSaidaPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.icmsSaidaUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>PIS, COFINS, IR</span>
                  <span>{pisCofinsPct.toFixed(1)}% ({simPdv.toFixed(2)} × {pisCofinsPct.toFixed(1)}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.pisCofinsUnit.toFixed(2)}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                  <span className="text-blue-900 dark:text-blue-300">TOTAL CUSTO LOJA:</span>
                  <span className="text-blue-700 dark:text-blue-400 font-mono text-sm">
                    R$ {simResult.custoLoja.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Margem Real Estimada:</span>
                  <span className={`font-mono font-bold ${simResult.margemPercentual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {simResult.margemPercentual.toFixed(1)}% ({formatCurrency(simResult.margemRealUnit, true)})
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
