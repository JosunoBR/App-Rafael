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
  FileCheck
} from 'lucide-react';
import { PurchaseOrder, User, OrderItem } from '../shared/types';
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
  const currentTotal = orderTotals.totalGeral;

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

  const diferenca = Number((parsedNfValue - currentTotal).toFixed(2));
  const percentualDiferenca = currentTotal > 0 ? Number(((diferenca / currentTotal) * 100).toFixed(2)) : 0;
  const isModified = parsedNfValue > 0 && Math.abs(diferenca) >= 0.01;

  // Itens que possuem preço original salvo (permitindo restauração)
  const hasOriginals = useMemo(() => {
    return (order.items || []).some(it => it.precoUnitarioOriginal !== undefined && it.precoUnitarioOriginal > 0) ||
           Boolean(order.header.ajusteFiscalDiferenca && Math.abs(order.header.ajusteFiscalDiferenca) > 0.005);
  }, [order.items, order.header.ajusteFiscalDiferenca]);

  // Itens elegíveis para prévia
  const activeItems = useMemo(() => {
    return (order.items || []).filter(it => !isBlankItem(it) && !it.ruptura && Number(it.qtdTotalUnidades || 0) > 0);
  }, [order.items]);

  // Simulação de prévia do rateio com preços unitários estritamente em 2 casas decimais
  const previewCalculation = useMemo(() => {
    if (!isModified || currentTotal <= 0) {
      return { previewItems: [], novoTotalProdutos: currentTotal, diferencaResidual: 0 };
    }
    const ratio = parsedNfValue / currentTotal;
    let novoTotalProdutos = 0;

    const allMapped = activeItems.map(it => {
      const pecas = Number(it.qtdTotalUnidades) || 1;
      // Preço unitário sempre arredondado a 2 casas decimais (centavos normais)
      const novoPreco = Number((it.precoUnitario * ratio).toFixed(2));
      const novoTotal = Number((pecas * novoPreco).toFixed(2));
      const diffUnit = Number((novoPreco - it.precoUnitario).toFixed(2));
      novoTotalProdutos += novoTotal;
      return {
        id: it.id,
        codigo: it.codigoInterno || it.codigo || it.codigoFornecedor || '-',
        descricao: it.descricao,
        pecas,
        precoAtual: it.precoUnitario,
        novoPreco,
        diffUnit,
        totalAtual: it.valorTotalLiquido || it.valorTotalBruto,
        novoTotal
      };
    });

    novoTotalProdutos = Number(novoTotalProdutos.toFixed(2));
    const diferencaResidual = Number((parsedNfValue - novoTotalProdutos).toFixed(2));

    return {
      previewItems: allMapped.slice(0, 8),
      novoTotalProdutos,
      diferencaResidual
    };
  }, [isModified, parsedNfValue, currentTotal, activeItems]);

  const { previewItems, novoTotalProdutos, diferencaResidual } = previewCalculation;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite apenas dígitos
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setRawInput('');
      return;
    }
    const val = parseInt(digits, 10) / 100;
    setRawInput(val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleCopyCurrentTotal = () => {
    setRawInput(currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
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
                  Ajustado em {order.header.ajusteFiscalData ? new Date(order.header.ajusteFiscalData).toLocaleDateString('pt-BR') : 'Data N/D'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Aguardando NF
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ajuste do valor unitário dos produtos decorrente de alterações de preço na entrega para igualar ao valor exato da NF e liberar os boletos.
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

          {hasOriginals && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRestoreOriginals}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 active:scale-95 disabled:opacity-50 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Preços Originais
            </button>
          )}
        </div>
      </div>

      {/* EXPLICAÇÃO RETRÁTIL */}
      {showHelp && (
        <div className="my-3 rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
            <div className="space-y-1">
              <p className="font-semibold">Como o sistema distribui a diferença da NF?</p>
              <p>
                1. Digite o <strong>Valor Total da Nota Fiscal</strong> entregue pelo fornecedor.
              </p>
              <p>
                2. Se a NF for <strong>maior</strong> que o pedido, o acréscimo é distribuído proporcionalmente no valor de cada item ativo, aumentando os preços unitários.
              </p>
              <p>
                3. Se a NF for <strong>menor</strong>, a diferença é descontada proporcionalmente dos produtos.
              </p>
              <p>
                4. Ao concluir, o pedido atinge rigorosamente o total da NF e as <strong>parcelas/boletos do faturamento são atualizados automaticamente</strong> com os novos valores, permitindo a liberação sem nenhuma divergência financeira.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GRID DE COMPARAÇÃO */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* CARD 1: VALOR ATUAL DO PEDIDO */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Total Atual do Pedido
            </span>
            <div className="mt-1 text-2xl font-black text-slate-800 dark:text-slate-100">
              {formatCurrency(currentTotal)}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{orderTotals.totalPecas} peças totais</span>
            <span>{activeItems.length} produtos ativos</span>
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
                  onClick={handleCopyCurrentTotal}
                  className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  title="Preencher com o total atual do pedido"
                >
                  Copiar Total
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
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2 pl-10 pr-3 text-lg font-black text-indigo-950 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-100 dark:focus:bg-slate-900"
              />
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Informe o valor faturado impresso na NF do fornecedor.
          </div>
        </div>

        {/* CARD 3: DIFERENÇA APURADA */}
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
                3. Diferença Apurada
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

            <div className="mt-1 text-2xl font-black">
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
              <span className="text-slate-500">Digite o valor da NF para calcular o rateio.</span>
            ) : Math.abs(diferenca) < 0.005 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Valores 100% conciliados! Nenhuma diferença.
              </span>
            ) : diferenca > 0 ? (
              <span>Acréscimo: os produtos sofreram aumento no fornecedor.</span>
            ) : (
              <span>Desconto: os produtos sofreram redução no fornecedor.</span>
            )}
          </div>
        </div>
      </div>

      {/* AÇÕES E PRÉVIA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100/60 pt-4 dark:border-indigo-900/40">
        <div className="flex items-center gap-2">
          {isModified && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>{showPreview ? 'Ocultar Prévia por Produto' : `Ver Prévia do Rateio (${activeItems.length} produtos)`}</span>
              {showPreview ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}

          {order.header.ajusteFiscalDiferenca !== undefined && Math.abs(order.header.ajusteFiscalDiferenca) > 0.005 && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Último ajuste: {order.header.ajusteFiscalDiferenca > 0 ? '+' : ''}{formatCurrency(order.header.ajusteFiscalDiferenca)} 
              {order.header.ajusteFiscalUsuario ? ` por ${order.header.ajusteFiscalUsuario}` : ''}
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
            <span>Distribuir Ajuste nos Produtos</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* TABELA DE PRÉVIA DO RATEIO (SE ABERTO) */}
      {showPreview && isModified && (
        <div className="mt-4 overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm dark:border-indigo-900/50 dark:bg-slate-900">
          <div className="border-b border-indigo-50 bg-indigo-50/50 px-4 py-2.5 dark:border-indigo-950 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              Amostra do Rateio nos Itens de Maior Valor ({previewItems.length} de {activeItems.length} produtos):
            </span>
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              <span>Novo Total dos Produtos: <strong className="text-indigo-700 dark:text-indigo-300">{formatCurrency(novoTotalProdutos)}</strong></span>
              {Math.abs(diferencaResidual) >= 0.01 && (
                <span className="ml-2 font-medium text-amber-700 dark:text-amber-400">
                  (Diferença de {formatCurrency(Math.abs(diferencaResidual))} decorrente de centavos exatos a 2 casas)
                </span>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/90 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2 text-center">Peças</th>
                  <th className="px-3 py-2 text-right">Preço Atual</th>
                  <th className="px-3 py-2 text-right">Novo Preço</th>
                  <th className="px-3 py-2 text-right">Variação Unit.</th>
                  <th className="px-3 py-2 text-right">Novo Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewItems.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-slate-600 dark:text-slate-400">{p.codigo}</td>
                    <td className="max-w-xs truncate px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200" title={p.descricao}>{p.descricao}</td>
                    <td className="px-3 py-1.5 text-center text-slate-600 dark:text-slate-400">{p.pecas}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-slate-600 dark:text-slate-400">{formatCurrency(p.precoAtual)}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-indigo-700 dark:text-indigo-300">
                      {formatCurrency(p.novoPreco)}
                    </td>
                    <td className={`px-3 py-1.5 text-right font-semibold ${p.diffUnit > 0 ? 'text-amber-600' : 'text-sky-600'}`}>
                      {p.diffUnit > 0 ? '+' : ''}{formatCurrency(p.diffUnit)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-slate-800 dark:text-slate-100">{formatCurrency(p.novoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
