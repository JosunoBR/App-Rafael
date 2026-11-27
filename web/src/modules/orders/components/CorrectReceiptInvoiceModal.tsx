import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Lock, Save, X } from 'lucide-react';
import { PurchaseOrder, User } from '../../../shared/types';

interface CorrectReceiptInvoiceModalProps {
  order: PurchaseOrder | null;
  currentUser?: User;
  onClose: () => void;
  onConfirm: (payload: {
    numeroNotaFiscal: string;
    motivo: string;
    password: string;
    expectedVersion?: number;
  }) => Promise<void>;
}

export const CorrectReceiptInvoiceModal: React.FC<CorrectReceiptInvoiceModalProps> = ({
  order,
  currentUser,
  onClose,
  onConfirm
}) => {
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('');
  const [motivo, setMotivo] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setNumeroNotaFiscal(order.header.numeroNotaFiscal || '');
      setMotivo('');
      setPassword('');
      setIsSubmitting(false);
    }
  }, [order]);

  if (!order) return null;

  const isUnchanged = numeroNotaFiscal.trim() === (order.header.numeroNotaFiscal || '').trim();
  const canSubmit = Boolean(numeroNotaFiscal.trim() && motivo.trim() && password.trim() && !isUnchanged && !isSubmitting);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        numeroNotaFiscal: numeroNotaFiscal.trim(),
        motivo: motivo.trim(),
        password: password.trim(),
        expectedVersion: order.header.version
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-600 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-sm font-extrabold text-white">Corrigir NF recebida</h2>
              <p className="text-xs text-indigo-100">Pedido {order.header.numeroPedido}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white" title="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>A alteração será registrada na auditoria e não retrocederá a esteira do pedido. O valor da NF e os boletos permanecerão inalterados.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">NF atual</label>
              <input value={order.header.numeroNotaFiscal || '—'} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" />
            </div>
            <div>
              <label htmlFor="correct-receipt-nf" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Nova NF *</label>
              <input id="correct-receipt-nf" autoFocus value={numeroNotaFiscal} onChange={(event) => setNumeroNotaFiscal(event.target.value)} maxLength={50} required disabled={isSubmitting} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-mono text-slate-900 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
          </div>

          <div>
            <label htmlFor="correct-receipt-reason" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Justificativa *</label>
            <textarea id="correct-receipt-reason" value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={500} required disabled={isSubmitting} rows={3} placeholder="Ex.: fornecedor cancelou a NF anterior e emitiu uma nova nota." className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>

          <div>
            <label htmlFor="correct-receipt-password" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"><Lock className="h-3.5 w-3.5 text-slate-500" /> Senha de confirmação *</label>
            <input id="correct-receipt-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} placeholder={`Senha de ${currentUser?.nome || 'usuário'}`} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={!canSubmit} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{isSubmitting ? 'Salvando...' : 'Salvar correção'}</button>
        </div>
      </form>
    </div>
  );
};
