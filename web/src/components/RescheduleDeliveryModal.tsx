import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  Building2,
  DollarSign,
  FileText,
  Sparkles
} from 'lucide-react';
import { PurchaseOrder, PaymentInstallment } from '../shared/types';
import { toBrDate, toIsoDate } from '../utils/masks';
import { addDaysToDate, getDaysDifference, getInstallmentStatus } from '../utils/installments';

interface RescheduleDeliveryModalProps {
  isOpen: boolean;
  order: PurchaseOrder | null;
  onClose: () => void;
  onConfirm: (
    order: PurchaseOrder,
    newDate: string,
    adjustBoletos: boolean,
    reason?: string
  ) => Promise<void> | void;
}

const QUICK_DAYS = [
  { label: '+3 dias', days: 3 },
  { label: '+7 dias (1 sem)', days: 7 },
  { label: '+15 dias', days: 15 },
  { label: '+30 dias (1 mês)', days: 30 }
];

const QUICK_REASONS = [
  'Atraso no faturamento',
  'Atraso na transportadora / logística',
  'Falta de matéria-prima no fabricante',
  'Solicitação interna da loja / CD',
  'Acordo de prorrogação com fornecedor'
];

export const RescheduleDeliveryModal: React.FC<RescheduleDeliveryModalProps> = ({
  isOpen,
  order,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !order) return null;

  const currentDeliveryDate = order.header.dataEntregaPrevista || order.header.dataPedido || new Date().toISOString().split('T')[0];
  const currentIso = toIsoDate(currentDeliveryDate);

  const [newDate, setNewDate] = useState<string>('');
  const [adjustBoletos, setAdjustBoletos] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializa a data quando o modal abre
  useEffect(() => {
    if (order) {
      setNewDate(toIsoDate(order.header.dataEntregaPrevista || ''));
      setAdjustBoletos(true);
      setReason('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [order, isOpen]);

  // Diferença em dias
  const diffDays = useMemo(() => {
    if (!newDate || !currentIso) return 0;
    return getDaysDifference(currentIso, newDate);
  }, [currentIso, newDate]);

  // Análise dos Boletos / Parcelas
  const installmentAnalysis = useMemo(() => {
    const list = order.installments || [];
    const paidList: PaymentInstallment[] = [];
    const pendingList: Array<{
      original: PaymentInstallment;
      newDue: string;
      newStatus: string;
    }> = [];

    list.forEach(inst => {
      const isPaid = inst.status === 'Pago' || !!inst.dataPagamento;
      if (isPaid) {
        paidList.push(inst);
      } else {
        const origIso = toIsoDate(inst.dataVencimento);
        const newDue = (diffDays !== 0 && adjustBoletos) ? addDaysToDate(origIso, diffDays) : origIso;
        const newStatus = getInstallmentStatus(newDue, inst.dataPagamento);
        pendingList.push({
          original: inst,
          newDue,
          newStatus
        });
      }
    });

    return {
      paidCount: paidList.length,
      pendingCount: pendingList.length,
      pendingList
    };
  }, [order, diffDays, adjustBoletos]);

  const handleQuickAddDays = (days: number) => {
    const base = newDate ? newDate : currentIso;
    const calculated = addDaysToDate(base, days);
    setNewDate(calculated);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setErrorMessage('Por favor, selecione uma data válida de entrega.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onConfirm(order, newDate, adjustBoletos, reason);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao reprogramar a entrega do pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Reprogramar Entrega
                <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {order.header.numeroPedido}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                Fornecedor: <strong className="text-slate-700 dark:text-slate-200">{order.header.fornecedor}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Comparativo: Data Atual vs Nova Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card Data Atual */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Previsão Atual
              </span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-mono font-black text-slate-800 dark:text-slate-100">
                  {toBrDate(currentIso) || 'Não informada'}
                </span>
              </div>
            </div>

            {/* Card Nova Data */}
            <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  Nova Previsão
                </span>
                {diffDays !== 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    diffDays > 0 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {diffDays > 0 ? `+${diffDays} dias` : `${diffDays} dias`}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Atalhos rápidos de prorrogação */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              Atalhos de Prorrogação Rápida:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DAYS.map(q => (
                <button
                  key={q.days}
                  type="button"
                  onClick={() => handleQuickAddDays(q.days)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opção Inteligente de Boletos */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={adjustBoletos}
                onChange={(e) => setAdjustBoletos(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Ajustar automaticamente os vencimentos dos boletos em aberto
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {diffDays !== 0 && adjustBoletos
                    ? `Os vencimentos dos boletos em aberto serão deslocados em ${diffDays > 0 ? '+' : ''}${diffDays} dias.`
                    : 'Mantém os prazos negociados sincronizados com a chegada da mercadoria.'}
                </span>
              </div>
            </label>

            {/* Resumo das Parcelas Afetadas */}
            {installmentAnalysis.pendingCount > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Parcelas em Aberto ({installmentAnalysis.pendingCount}):</span>
                  {installmentAnalysis.paidCount > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-normal">
                      <ShieldCheck className="w-3 h-3" />
                      {installmentAnalysis.paidCount} paga(s) mantida(s)
                    </span>
                  )}
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {installmentAnalysis.pendingList.map(({ original, newDue }) => (
                    <div 
                      key={original.id}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-slate-600 dark:text-slate-400">
                        {original.observacao || `Parc. ${original.numeroParcela}`} (R$ {original.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-400 line-through">{toBrDate(original.dataVencimento)}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className={diffDays !== 0 && adjustBoletos ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}>
                          {toBrDate(newDue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Motivo do Reagendamento / Trilha de Auditoria */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Motivo do Reagendamento (Opcional / Auditoria):
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {QUICK_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition ${
                    reason === r
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Fornecedor confirmou que o carregamento atrasou na fábrica..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Rodapé com botões de ação */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newDate}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-sm hover:shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Nova Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
