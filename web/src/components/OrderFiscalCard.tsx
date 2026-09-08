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
  AlertTriangle
} from 'lucide-react';
import { FiscalConfig } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG } from '../shared/constants';
import { calculateItemFiscal, normalizeRateToDecimal } from '../shared/fiscalEngine';
import { formatCurrency, handleCurrencyInput } from '../utils/masks';

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
  samplePdv = 12.00
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [simPreco, setSimPreco] = useState<number>(averageItemPrice > 0 ? averageItemPrice : 7.00);
  const [simPdv, setSimPdv] = useState<number>(samplePdv > 0 ? samplePdv : 12.00);

  // Normalização das alíquotas ativas em percentual (0 a 100)
  const ipiPct = Number(((normalizeRateToDecimal(fiscalConfig.ipiAliquota, 0)) * 100).toFixed(2));
  const stPct = Number(((normalizeRateToDecimal(fiscalConfig.aliquotaSt !== undefined ? fiscalConfig.aliquotaSt : aliquotaStHeader, 0)) * 100).toFixed(2));
  const fretePct = Number(((normalizeRateToDecimal(fiscalConfig.freteAliquota, 0)) * 100).toFixed(2));

  const icmsEntradaPct = Number(((normalizeRateToDecimal(fiscalConfig.creditoEntradaICMS, 0.12)) * 100).toFixed(2));
  const custoFixoPct = Number(((normalizeRateToDecimal(fiscalConfig.custosFixos, 0.26)) * 100).toFixed(2));
  const icmsSaidaPct = Number(((normalizeRateToDecimal(fiscalConfig.icmsAliquota, 0.195)) * 100).toFixed(2));
  const pisCofinsPct = Number(((normalizeRateToDecimal(fiscalConfig.pisCofinsAliquota, 0.06)) * 100).toFixed(2));

  // Valor em R$ calculado do frete a partir da alíquota e do total de mercadorias
  const freteValorCalculado = valorFreteHeader !== undefined && valorFreteHeader > 0
    ? valorFreteHeader
    : (totalMercadorias > 0 && fretePct > 0 ? Number((totalMercadorias * (fretePct / 100)).toFixed(2)) : 0);

  // Handler para campos de porcentagem usando handleCurrencyInput (2 casas decimais)
  const handleRateChange = (
    field: keyof FiscalConfig,
    inputValue: string,
    isST: boolean = false
  ) => {
    const { value } = handleCurrencyInput(inputValue);
    const decimalValue = value / 100;
    
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

  // Aplicar Preset da Simulação 1 do Excel
  const applyPreset1 = () => {
    const p1: FiscalConfig = {
      ipiAliquota: 0.05,
      aliquotaSt: 0.18,
      freteAliquota: 0.035,
      creditoEntradaICMS: 0.12,
      custosFixos: 0.26,
      icmsAliquota: 0.19, // no excel 19% dá exatamente 2.28 para 12
      pisCofinsAliquota: 0.06
    };
    onChangeFiscalConfig(p1);
    if (onUpdateHeaderSt) onUpdateHeaderSt(18);
    if (onUpdateHeaderFrete) {
      onUpdateHeaderFrete(totalMercadorias > 0 ? Number((totalMercadorias * 0.035).toFixed(2)) : 0);
    }
    setSimPreco(7.00);
    setSimPdv(12.00);
  };

  // Aplicar Preset da Simulação 2 do Excel
  const applyPreset2 = () => {
    const p2: FiscalConfig = {
      ipiAliquota: 0.035,
      aliquotaSt: 0.00,
      freteAliquota: 0.00,
      creditoEntradaICMS: 0.04,
      custosFixos: 0.20,
      icmsAliquota: 0.11,
      pisCofinsAliquota: 0.03
    };
    onChangeFiscalConfig(p2);
    if (onUpdateHeaderSt) onUpdateHeaderSt(0);
    if (onUpdateHeaderFrete) onUpdateHeaderFrete(0);
    setSimPreco(7.00);
    setSimPdv(12.00);
  };

  // Restaurar padrão global
  const handleResetDefaults = () => {
    onChangeFiscalConfig(DEFAULT_FISCAL_CONFIG);
    if (onUpdateHeaderSt) onUpdateHeaderSt(0);
    if (onUpdateHeaderFrete) onUpdateHeaderFrete(0);
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
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Personalize IPI, ST, Frete, ICMS Entrada/Saída, Custo Fixo e PIS/COFINS
            </p>
          </div>
        </div>

        {/* Indicadores resumidos quando fechado */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
              📥 Custo Fornecedor: <strong className="text-emerald-600">+{(ipiPct + stPct + fretePct).toFixed(1)}%</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
              📤 Saída: <strong className="text-blue-600">{(custoFixoPct + icmsSaidaPct + pisCofinsPct).toFixed(1)}%</strong> PDV
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 font-semibold text-emerald-700 dark:text-emerald-300">
              Custo Loja: R$ {simResult.custoLoja.toFixed(2)}
            </span>
          </div>

          <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* CONTEÚDO EXPANDIDO: DUAS PARTES (ENTRADA E SAÍDA) */}
      {isOpen && (
        <div className="p-5 border-t border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800 space-y-5 animate-in fade-in duration-200">
          
          {/* BARRA DE PRESETS RÁPIDOS */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Atalhos do Modelo da Planilha:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyPreset1}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition"
              >
                📊 Simulação 1 (IPI 5%, ST 18%, CF 26%)
              </button>
              <button
                type="button"
                onClick={applyPreset2}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition"
              >
                📊 Simulação 2 (IPI 3.5%, ST 0%, CF 20%)
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                title="Restaurar padrões das configurações gerais"
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Padrão Geral
              </button>
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
                  Encargos: +{(ipiPct + stPct + fretePct).toFixed(2)}%
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
                      value={ipiPct > 0 ? ipiPct.toFixed(2).replace('.', ',') : '0,00'}
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
                      value={stPct > 0 ? stPct.toFixed(2).replace('.', ',') : '0,00'}
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
                      value={fretePct > 0 ? fretePct.toFixed(2).replace('.', ',') : '0,00'}
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
                  <span>{ipiPct.toFixed(2)}% ({simPreco.toFixed(2)} × {ipiPct}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.ipiUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ST</span>
                  <span>{stPct.toFixed(2)}% ({simPreco.toFixed(2)} × {stPct}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.stUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>FRETE</span>
                  <span>{fretePct.toFixed(2)}% ({simPreco.toFixed(2)} × {fretePct}%)</span>
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
                  Custos s/ PDV: {(custoFixoPct + icmsSaidaPct + pisCofinsPct).toFixed(2)}%
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
                      value={icmsEntradaPct > 0 ? icmsEntradaPct.toFixed(2).replace('.', ',') : '0,00'}
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
                      value={custoFixoPct > 0 ? custoFixoPct.toFixed(2).replace('.', ',') : '0,00'}
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
                      value={icmsSaidaPct > 0 ? icmsSaidaPct.toFixed(2).replace('.', ',') : '0,00'}
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
                      value={pisCofinsPct > 0 ? pisCofinsPct.toFixed(2).replace('.', ',') : '0,00'}
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
                  <span>{icmsEntradaPct.toFixed(2)}% ({simPreco.toFixed(2)} - {icmsEntradaPct}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.baseIcmsEntrada.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>CUSTO FIXO</span>
                  <span>{custoFixoPct.toFixed(2)}% ({simPdv.toFixed(2)} × {custoFixoPct}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.custoFixoUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>CUSTO REAL (ENCARGOS ENTRADA)</span>
                  <span>(IPI + ST + Frete da Parte 1)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.custoRealEntrada.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>ICMS SAÍDA</span>
                  <span>{icmsSaidaPct.toFixed(2)}% ({simPdv.toFixed(2)} × {icmsSaidaPct}%)</span>
                  <strong className="text-slate-800 dark:text-slate-200">R$ {simResult.icmsSaidaUnit.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>PIS, COFINS, IR</span>
                  <span>{pisCofinsPct.toFixed(2)}% ({simPdv.toFixed(2)} × {pisCofinsPct}%)</span>
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
                    {simResult.margemPercentual.toFixed(2)}% ({formatCurrency(simResult.margemRealUnit, true)})
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
