import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Layers,
  HelpCircle,
  FileCheck,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import { PurchaseOrder, User } from '../shared/types';
import { OrderTotalsResult, isBlankItem } from '../shared/orderCalculationEngine';
import { formatCurrency } from '../utils/masks';

interface OrderFiscalAdjustmentCardProps {
  order: PurchaseOrder;
  orderTotals: OrderTotalsResult;
  currentUser: User | null;
  onApplyAdjustment: (targetNfValue: number) => void;
  onRestoreOriginals: () => void;
  disabled?: boolean;
}

export const OrderFiscalAdjustmentCard: React.FC<OrderFiscalAdjustmentCardProps> = ({
  order,
  orderTotals,
  currentUser,
  onApplyAdjustment,
  onRestoreOriginals,
  disabled = false
}) => {
  // Total base comercial sem ajuste fiscal (Produtos + IPI - Desconto Comercial)
  const baseTotal = orderTotals.totalComercialSemAjuste;
  const currentFinalTotal = orderTotals.totalGeral;

  // Valor da NF informado pelo usuário
  const initialNfValue = order.header.valorNotaFiscalEntregue && order.header.valorNotaFiscalEntregue > 0
    ? order.header.valorNotaFiscalEntregue
    : 0;

  const [rawInput, setRawInput] = useState<string>(
    initialNfValue > 0 ? initialNfValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
  );
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Sincroniza se o pedido mudar
  useEffect(() => {
    if (order.header.valorNotaFiscalEntregue && order.header.valorNotaFiscalEntregue > 0) {
      setRawInput(order.header.valorNotaFiscalEntregue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setRawInput('');
    }
  }, [order.header.id, order.header.valorNotaFiscalEntregue]);

  // Converte texto em número float
  const parsedNfValue = useMemo(() => {
    if (!rawInput) return 0;
    const clean = rawInput.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.max(0, num);
  }, [rawInput]);

  // Diferença apurada entre a NF digitada e o total base do pedido
  const diferenca = Number((parsedNfValue - baseTotal).toFixed(2));
  const percentualDiferenca = baseTotal > 0 ? Number(((diferenca / baseTotal) * 100).toFixed(2)) : 0;
  const isModified = parsedNfValue > 0 && Math.abs(diferenca) >= 0.01;

  // Verifica se há ajuste aplicado ou modificações para reversão
  const hasAdjustmentApplied = Boolean(order.header.valorNotaFiscalEntregue && order.header.valorNotaFiscalEntregue > 0) ||
                               Boolean(order.header.ajusteFiscalDiferenca && Math.abs(order.header.ajusteFiscalDiferenca) > 0.005) ||
                               (order.items || []).some(it => it.precoUnitarioOriginal !== undefined);

  // Produtos ativos do pedido
  const activeItems = useMemo(() => {
    return (order.items || []).filter(it => !isBlankItem(it) && !it.ruptura && Number(it.qtdTotalUnidades || 0) > 0);
  }, [order.items]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setRawInput('');
      return;
    }
    const val = parseInt(digits, 10) / 100;
    setRawInput(val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleCopyBaseTotal = () => {
    setRawInput(baseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleClear = () => {
    setRawInput('');
  };

  const handleApply = () => {
    if (parsedNfValue <= 0) return;
    onApplyAdjustment(parsedNfValue);
  };

  return (
    <div className="mt-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-5 shadow-sm transition-all duration-200">
      {/* CABEÇALHO DO CARD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/80 dark:border-indigo-900/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-md shadow-indigo-500/20">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Ajuste Fiscal da Entrega (Conciliação da Nota Fiscal)
              </h3>
              {order.header.valorNotaFiscalEntregue ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <FileCheck className="h-3.5 w-3.5" />
                  NF Conciliada: {formatCurrency(order.header.valorNotaFiscalEntregue)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Aguardando NF
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acréscimo ou desconto aplicado diretamente no <strong>valor final do pedido</strong> para igualar ao valor exato da NF e liberar os boletos, <strong>sem alterar os produtos</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Como funciona o Ajuste Fiscal?"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Como funciona?</span>
          </button>

          {hasAdjustmentApplied && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRestoreOriginals}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 active:scale-95 disabled:opacity-50 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
              title="Remove o ajuste da NF e restaura o total original do pedido"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Valor Original
            </button>
          )}
        </div>
      </div>

      {/* EXPLICAÇÃO RETRÁTIL */}
      {showHelp && (
        <div className="my-3 rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
            <div className="space-y-1.5">
              <p className="font-semibold text-sm">Diretriz Oficial: Ajuste Direto no Total do Pedido</p>
              <p>
                1. <strong>Produtos 100% Inalterados:</strong> O sistema <strong>não desconta nem acrescenta nos produtos</strong>. Os preços unitários, quantidades e margens cadastrados permanecem rigorosamente intactos.
              </p>
              <p>
                2. <strong>Ajuste no Total Final:</strong> Se o valor faturado da NF for diferente do pedido, a diferença é lançada diretamente como um <strong>Acréscimo Fiscal (+)</strong> ou <strong>Desconto Fiscal (-)</strong> no fechamento financeiro do pedido.
              </p>
              <p>
                3. <strong>Atualização Automática dos Boletos:</strong> O total final a pagar e as parcelas/boletos são recalculados automaticamente para bater exatamente com a NF (ao centavo, sem sobras residuais), liberando os títulos com 100% de segurança no Contas a Pagar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GRID DE COMPARAÇÃO */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* CARD 1: VALOR BASE DO PEDIDO */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Total Base do Pedido
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Sem Ajuste
              </span>
            </div>
            <div className="mt-1 text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {formatCurrency(baseTotal)}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{orderTotals.totalPecas} peças</span>
            <span>{activeItems.length} produtos (preços fixos)</span>
          </div>
        </div>

        {/* CARD 2: VALOR DA NOTA FISCAL (INPUT) */}
        <div className="flex flex-col justify-between rounded-xl border border-indigo-200 bg-white p-4 shadow-sm ring-1 ring-indigo-500/20 dark:border-indigo-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="valorNotaFiscalInput" className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                2. Valor da Nota Fiscal (NF)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyBaseTotal}
                  className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  title="Preencher com o total base do pedido"
                >
                  Copiar Base
                </button>
                {rawInput && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="relative mt-1.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="font-semibold text-slate-400">R$</span>
              </div>
              <input
                id="valorNotaFiscalInput"
                type="text"
                disabled={disabled}
                placeholder="0,00"
                value={rawInput}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2 pl-10 pr-3 text-lg font-black font-mono text-indigo-950 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-100 dark:focus:bg-slate-900"
              />
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Digite o valor faturado impresso na NF do fornecedor.
          </div>
        </div>

        {/* CARD 3: AJUSTE DIRETO NO VALOR FINAL */}
        <div className={`flex flex-col justify-between rounded-xl border p-4 shadow-sm transition-all ${
          !parsedNfValue || Math.abs(diferenca) < 0.005
            ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200'
            : diferenca > 0
            ? 'border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200'
            : 'border-sky-200 bg-sky-50/60 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider">
                3. Ajuste Direto no Total
              </span>
              {parsedNfValue > 0 && Math.abs(diferenca) >= 0.005 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  diferenca > 0 
                    ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200' 
                    : 'bg-sky-200 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200'
                }`}>
                  {diferenca > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {percentualDiferenca > 0 ? `+${percentualDiferenca}%` : `${percentualDiferenca}%`}
                </span>
              )}
            </div>

            <div className="mt-1 text-2xl font-black font-mono">
              {parsedNfValue <= 0 ? (
                <span className="text-slate-400">R$ 0,00</span>
              ) : Math.abs(diferenca) < 0.005 ? (
                <span className="text-emerald-700 dark:text-emerald-400">R$ 0,00</span>
              ) : diferenca > 0 ? (
                <span className="text-amber-700 dark:text-amber-400">+ {formatCurrency(diferenca)}</span>
              ) : (
                <span className="text-sky-700 dark:text-sky-400">- {formatCurrency(Math.abs(diferenca))}</span>
              )}
            </div>
          </div>

          <div className="mt-2 text-xs font-medium">
            {parsedNfValue <= 0 ? (
              <span className="text-slate-500">Informe a NF para apurar o acréscimo ou desconto.</span>
            ) : Math.abs(diferenca) < 0.005 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Valores 100% conciliados! Nenhuma diferença.
              </span>
            ) : diferenca > 0 ? (
              <span>Acréscimo fiscal direto no total final do pedido.</span>
            ) : (
              <span>Desconto fiscal direto no total final do pedido.</span>
            )}
          </div>
        </div>
      </div>

      {/* AÇÕES E DEMONSTRATIVO */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100/60 pt-4 dark:border-indigo-900/40">
        <div className="flex items-center gap-3">
          {isModified && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Calculator className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{showPreview ? 'Ocultar Demonstrativo Financeiro' : 'Ver Demonstrativo do Fechamento'}</span>
              {showPreview ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}

          {order.header.ajusteFiscalDiferenca !== undefined && Math.abs(order.header.ajusteFiscalDiferenca) > 0.005 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Ajuste ativo: <strong>{order.header.ajusteFiscalDiferenca > 0 ? '+' : ''}{formatCurrency(order.header.ajusteFiscalDiferenca)}</strong> 
                {order.header.ajusteFiscalUsuario ? ` por ${order.header.ajusteFiscalUsuario}` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || !isModified}
            onClick={handleApply}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95 ${
              isModified && !disabled
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 text-white shadow-indigo-500/25 hover:from-indigo-700 hover:to-sky-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-400 shadow-none dark:bg-slate-800 dark:text-slate-600'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Aplicar Ajuste no Total do Pedido</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* DEMONSTRATIVO FINANCEIRO DETALHADO DO FECHAMENTO */}
      {showPreview && isModified && (
        <div className="mt-4 overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm dark:border-indigo-900/50 dark:bg-slate-900 p-4">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Demonstrativo de Fechamento da Conciliação da NF:
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              Produtos 100% Inalterados ({activeItems.length} itens)
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Bruto das Mercadorias:</span>
                <span className="font-mono font-medium">{formatCurrency(orderTotals.valorBruto)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>(+) IPI dos Produtos:</span>
                <span className="font-mono font-medium">+{formatCurrency(orderTotals.totalIpi)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>(-) Descontos Comerciais:</span>
                <span className="font-mono font-medium">-{formatCurrency(orderTotals.valorDescontoTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-800 dark:text-slate-200 font-bold border-t border-slate-200 dark:border-slate-700 pt-1.5">
                <span>Total Comercial Base:</span>
                <span className="font-mono text-indigo-700 dark:text-indigo-300">{formatCurrency(baseTotal)}</span>
              </div>
            </div>

            <div className="space-y-2 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Total Base do Pedido:</span>
                <span className="font-mono font-medium">{formatCurrency(baseTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{diferenca >= 0 ? '(+) Acréscimo Fiscal no Total:' : '(-) Desconto Fiscal no Total:'}</span>
                <span className={`font-mono ${diferenca >= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-sky-700 dark:text-sky-400'}`}>
                  {diferenca >= 0 ? '+' : '-'}{formatCurrency(Math.abs(diferenca))}
                </span>
              </div>
              <div className="flex justify-between text-indigo-950 dark:text-white font-extrabold border-t border-indigo-200 dark:border-indigo-800 pt-1.5 text-sm">
                <span>Novo Total do Pedido (NF):</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(parsedNfValue)}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                * As parcelas e boletos serão gerados exatamente sobre R$ {parsedNfValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
