import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calculator, 
  Percent, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Sliders
} from 'lucide-react';
import { OrderItem, FiscalConfig } from '../shared/types';
import { calculateItemFiscal, calculateMaxPurchasePrice } from '../shared/fiscalEngine';

interface FiscalPanelModalProps {
  item: OrderItem | null;
  globalFiscal: FiscalConfig;
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: (itemId: string, updatedFields: Partial<OrderItem>) => void;
}

export const FiscalPanelModal: React.FC<FiscalPanelModalProps> = ({
  item,
  globalFiscal,
  isOpen,
  onClose,
  onApplyChanges
}) => {
  if (!isOpen || !item) return null;

  const [precoCompra, setPrecoCompra] = useState(item.precoUnitario);
  const [pdvAlvo, setPdvAlvo] = useState(item.pdvAlvo);
  const [useCustom, setUseCustom] = useState(item.fiscalOverride?.useCustomFiscal || false);
  
  const [icms, setIcms] = useState((item.fiscalOverride?.icmsAliquota ?? globalFiscal.icmsAliquota) * 100);
  const [ipi, setIpi] = useState((item.fiscalOverride?.ipiAliquota ?? globalFiscal.ipiAliquota) * 100);
  const [pisCofins, setPisCofins] = useState((item.fiscalOverride?.pisCofinsAliquota ?? globalFiscal.pisCofinsAliquota) * 100);
  const [custosFixos, setCustosFixos] = useState((item.fiscalOverride?.custosFixos ?? globalFiscal.custosFixos) * 100);
  const [creditoEntrada, setCreditoEntrada] = useState((item.fiscalOverride?.creditoEntradaICMS ?? globalFiscal.creditoEntradaICMS) * 100);

  // Meta de margem simulada (ex: 20% ou 25%)
  const [margemMeta, setMargemMeta] = useState(20);

  // Recalcular em tempo real
  const currentFiscalOverride = useCustom ? {
    useCustomFiscal: true,
    icmsAliquota: icms / 100,
    ipiAliquota: ipi / 100,
    pisCofinsAliquota: pisCofins / 100,
    custosFixos: custosFixos / 100,
    creditoEntradaICMS: creditoEntrada / 100
  } : undefined;

  const descPct = item.percentualDesconto || 0;
  const precoCompraEfetivo = precoCompra * (1 - descPct / 100);
  const fiscalResult = calculateItemFiscal(precoCompraEfetivo, pdvAlvo, globalFiscal, currentFiscalOverride);
  const precoMaxSugerido = calculateMaxPurchasePrice(pdvAlvo, margemMeta, globalFiscal, currentFiscalOverride);

  const handleSave = () => {
    const valorBruto = precoCompra * item.qtdTotalUnidades;
    const valorDesc = valorBruto * (descPct / 100);
    const valorLiquido = valorBruto - valorDesc;

    onApplyChanges(item.id, {
      precoUnitario: precoCompra,
      pdvAlvo: pdvAlvo,
      valorTotalBruto: valorBruto,
      percentualDesconto: descPct,
      valorDescontoItem: valorDesc,
      valorTotalLiquido: valorLiquido,
      fiscalOverride: useCustom ? currentFiscalOverride : undefined,
      despesasPdvUnit: fiscalResult.despesasPdvUnit,
      creditoIcmsUnit: fiscalResult.creditoIcmsUnit,
      custoRealEfetivo: fiscalResult.custoRealEfetivo,
      margemRealUnit: fiscalResult.margemRealUnit,
      margemPercentual: fiscalResult.margemPercentual
    });
    onClose();
  };

  const handleResetToGlobal = () => {
    setUseCustom(false);
    setIcms(globalFiscal.icmsAliquota * 100);
    setIpi(globalFiscal.ipiAliquota * 100);
    setPisCofins(globalFiscal.pisCofinsAliquota * 100);
    setCustosFixos(globalFiscal.custosFixos * 100);
    setCreditoEntrada(globalFiscal.creditoEntradaICMS * 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Engenharia Fiscal & Limite de Preço
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {item.descricao} {item.codigo ? `(${item.codigo})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          
          {/* Card Principal de Preços */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Preço de Compra Unitário (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoCompra === 0 ? '' : precoCompra}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPrecoCompra(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 text-base font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
              <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                PDV Alvo / Preço Venda ao Consumidor (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pdvAlvo === 0 ? '' : pdvAlvo}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPdvAlvo(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 text-base font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Simulador de Preço Máximo para Meta de Margem */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/60 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                  Simulador de Preço Máximo de Compra
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Meta:</span>
                <select
                  value={margemMeta}
                  onChange={(e) => setMargemMeta(Number(e.target.value))}
                  className="text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400"
                >
                  <option value={15}>15% Margem</option>
                  <option value={20}>20% Margem</option>
                  <option value={25}>25% Margem</option>
                  <option value={30}>30% Margem</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Para vender a <strong className="text-slate-900 dark:text-white">R$ {pdvAlvo.toFixed(2)}</strong> e garantir <strong className="text-blue-600 dark:text-blue-400">{margemMeta}% de lucro líquido</strong>, você deve pagar no máximo:
            </p>
            <div className="mt-2 text-xl font-extrabold text-blue-700 dark:text-blue-400">
              R$ {precoMaxSugerido.toFixed(2)} / un
            </div>
          </div>

          {/* Painel Fiscal Resultado em Tempo Real */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold tracking-wider uppercase text-emerald-400 flex items-center justify-between">
              <span>Custo Real Efetivo & Margem</span>
              <span className="text-slate-400 text-[11px] font-normal lowercase">fórmulas da matriz</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400">Despesas PDV ({(fiscalResult.percentualDespesasPdv * 100).toFixed(0)}%)</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">
                  + R$ {fiscalResult.despesasPdvUnit.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400">Crédito ICMS ({(fiscalResult.percentualCreditoEntrada * 100).toFixed(1)}%)</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  - R$ {fiscalResult.creditoIcmsUnit.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400">Custo Efetivo Real</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  R$ {fiscalResult.custoRealEfetivo.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400">Margem Real Unitária</div>
                <div className={`text-sm font-bold mt-0.5 ${fiscalResult.isLucrativo ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {fiscalResult.margemRealUnit.toFixed(2)} ({fiscalResult.margemPercentual.toFixed(1)}%)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
              {fiscalResult.statusMargem === 'excelente' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-medium">Margem excelente acima de 25%! Item altamente lucrativo.</span>
                </>
              ) : fiscalResult.statusMargem === 'boa' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-medium">Margem saudável entre 15% e 25%.</span>
                </>
              ) : fiscalResult.statusMargem === 'apertada' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-300 font-medium">Margem apertada abaixo de 15%. Verifique o preço de compra.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-rose-300 font-medium">Prejuízo fiscal! Custo real é superior ao PDV pretendido.</span>
                </>
              )}
            </div>
          </div>

          {/* Toggle e Configurações Fiscais Customizadas deste Item */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Sobrepor Parâmetros Fiscais deste Item
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {useCustom ? (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">ICMS (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={icms === 0 ? '' : icms}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setIcms(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">PIS / COFINS (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={pisCofins === 0 ? '' : pisCofins}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPisCofins(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Custos Fixos PDV (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={custosFixos === 0 ? '' : custosFixos}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCustosFixos(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">IPI (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={ipi === 0 ? '' : ipi}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setIpi(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                    Crédito Entrada ICMS (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={creditoEntrada === 0 ? '' : creditoEntrada}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCreditoEntrada(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 font-bold"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Utilizando os parâmetros padrões da rede: <strong>40% de Despesas PDV</strong> e <strong>19,5% de Crédito ICMS</strong>.
              </p>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 sticky bottom-0">
          <button
            onClick={handleResetToGlobal}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão Global
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition"
            >
              Aplicar no Item
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
