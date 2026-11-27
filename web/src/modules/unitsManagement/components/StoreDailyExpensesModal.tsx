import React, { useState } from 'react';
import {
  X,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileText,
  Eye,
  Tag,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StoreCashBalance, StoreExpenseRecord, ExpenseCategory } from '../types/unitsCash.types';
import { formatCurrency } from '../../../utils/masks';

interface StoreDailyExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreCashBalance | null;
}

export const StoreDailyExpensesModal: React.FC<StoreDailyExpensesModalProps> = ({
  isOpen,
  onClose,
  store
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<StoreExpenseRecord | null>(null);

  if (!isOpen || !store) return null;

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'limpeza':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">Limpeza</span>;
      case 'correios':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Correios / Malote</span>;
      case 'transporte':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">Transporte</span>;
      case 'alimentacao':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800">Alimentação</span>;
      case 'manutencao':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">Manutenção</span>;
      case 'escritorio':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">Escritório</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Outros</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className="w-full max-w-3xl bg-white dark:bg-[#0B132B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-md shadow-rose-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center text-xs font-black">
                  {store.lojaCodigo}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Gastos & Despesas de Caixa • {store.lojaNome}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {store.cidade} • Responsável: <span className="font-semibold text-slate-700 dark:text-slate-300">{store.responsavel}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CARDS RESUMO DO CAIXA DA LOJA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 shrink-0">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Fundo Fixo (Troco)
            </span>
            <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 font-mono">
              {formatCurrency(store.fundoDeCaixa)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Entradas Dinheiro
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(store.totalEntradasDinheiro)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Despesas Pagas
            </span>
            <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(store.totalDespesas)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block mb-1">
              Montante Acumulado
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(store.saldoAtualEmCaixa)}
            </span>
          </div>
        </div>

        {/* CORPO: LISTA DE GASTOS SEPARADOS POR DIA */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Histórico Diário de Gastos & Entradas (Novembro/2026)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {store.movimentacoes.length} dias registrados
            </span>
          </div>

          {store.movimentacoes.map(dia => {
            const temDespesas = dia.despesas.length > 0;

            return (
              <div
                key={dia.data}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs"
              >
                {/* CABEÇALHO DO DIA */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white">
                      {dia.dataFormatada}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {dia.diaSemana}
                    </span>
                  </div>

                  {/* Saldo e Movimentação do Dia */}
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Dinheiro recebido no dia">
                      + {formatCurrency(dia.entradaDinheiro)}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold" title="Gastos pagos pelo caixa no dia">
                      - {formatCurrency(dia.totalDespesas)}
                    </span>
                    {dia.sangriaDia && dia.sangriaDia > 0 ? (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-amber-500 font-bold" title="Depósitos e vales para funcionários">
                          Sangria: - {formatCurrency(dia.sangriaDia)}
                        </span>
                      </>
                    ) : null}
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg" title="Saldo líquido retido no dia">
                      = {formatCurrency(dia.saldoLiquidoDia)}
                    </span>
                  </div>
                </div>

                {/* LISTAGEM DOS GASTOS DO DIA */}
                <div className="p-3.5">
                  {temDespesas ? (
                    <div className="space-y-2.5">
                      {dia.despesas.map((despesa, idx) => (
                        <div
                          key={despesa.id || idx}
                          className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-500 shrink-0 mt-0.5">
                              <Receipt className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {despesa.tipo === 'deposito' || despesa.tipo === 'vale_funcionario' ? <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">{despesa.tipo === 'vale_funcionario' ? 'Vale funcionário' : 'Depósito'}</span> : getCategoryBadge(despesa.categoria)}
                                {despesa.hora && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3" />
                                    {despesa.hora}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {despesa.descricao}
                              </p>
                              {despesa.comprovanteNome && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceipt(despesa)}
                                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>{despesa.comprovanteNome}</span>
                                  <Eye className="w-2.5 h-2.5 ml-0.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                              - {formatCurrency(despesa.valor)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2.5 text-center text-xs text-slate-400 font-medium">
                      Nenhum gasto ou despesa informado neste dia.
                    </div>
                  )}

                  {/* Memorando do Fechamento do Dia (se houver) */}
                  {dia.memorando && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <span className="font-bold">Observação da Gerente:</span>
                      <span>"{dia.memorando}"</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL INTERNO DE PREVIEW DE COMPROVANTE */}
        {selectedReceipt && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-indigo-50/40 dark:bg-indigo-950/30 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Visualizando Comprovante Anexo: <span className="font-mono">{selectedReceipt.comprovanteNome}</span> ({formatCurrency(selectedReceipt.valor)})
              </span>
            </div>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Fechar Preview
            </button>
          </div>
        )}

        {/* RODAPÉ DO MODAL */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Extrato oficial sincronizado com os fechamentos de caixa da unidade.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
