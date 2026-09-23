import React, { useState } from 'react';
import { X, PackageCheck, FileText, Calendar, User, CreditCard, ShieldCheck, Truck, AlertTriangle } from 'lucide-react';
import { PurchaseOrder, User as UserType } from '../shared/types';
import { canAuthorizeFinancialRelease } from '../shared/permissions';

interface ReceiptConfirmationModalProps {
  order: PurchaseOrder;
  currentUser?: UserType | null;
  onConfirm: (data: {
    dataRecebimento: string;
    recebidoPor: string;
    numeroNotaFiscal: string;
    autorizarBoletos: boolean;
  }) => void;
  onClose: () => void;
}

export const ReceiptConfirmationModal: React.FC<ReceiptConfirmationModalProps> = ({
  order,
  currentUser,
  onConfirm,
  onClose
}) => {
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('');
  const [autorizarBoletos, setAutorizarBoletos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDiretoria = currentUser?.role === 'diretoria';
  const totalPecas = order.items?.reduce((s, it) => s + (it.qtdTotalUnidades || 0), 0) || 0;
  const totalVolumes = order.items?.reduce((s, it) => s + (it.qtdPacotes || 0), 0) || 0;
  const isStatusBlocked = order.header.status === 'Em Cotação' || order.header.status === 'Rascunho' || order.header.status === 'Aprovado';

  const handleSubmit = async () => {
    if (isStatusBlocked) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        dataRecebimento,
        recebidoPor: currentUser?.nome || 'Operador',
        numeroNotaFiscal,
        autorizarBoletos: isDiretoria && autorizarBoletos
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <PackageCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-sm">Confirmar Recebimento na Matriz</h2>
              <p className="text-white/80 text-xs">Registrar entrega física do fornecedor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bloqueio de status anterior à distribuição */}
        {isStatusBlocked && (
          <div className="m-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Recebimento Bloqueado:</p>
              <p>Pedidos em "{order.header.status || 'Em Cotação'}" não podem ter o recebimento confirmado. O pedido precisa ser aprovado e encaminhado para Distribuição.</p>
            </div>
          </div>
        )}

        {/* Resumo do Pedido */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pedido</span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">{order.header.numeroPedido}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Fornecedor</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{order.header.fornecedor}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Peças</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{totalPecas.toLocaleString('pt-BR')} un</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Volumes</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">{totalVolumes.toLocaleString('pt-BR')} vol</p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="px-6 py-5 space-y-4">
          {/* Data do Recebimento */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Data do Recebimento Físico
            </label>
            <input
              type="date"
              value={dataRecebimento}
              onChange={(e) => setDataRecebimento(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Número da NF */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Número da Nota Fiscal
            </label>
            <input
              type="text"
              value={numeroNotaFiscal}
              onChange={(e) => setNumeroNotaFiscal(e.target.value)}
              placeholder="Ex: 12345, 67890..."
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Recebido Por (Exibição) */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <User className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">Recebido por:</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{currentUser?.nome || 'Operador'}</span>
          </div>

          {/* Autorização de Boletos (Apenas Diretoria) */}
          {isDiretoria && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Governança Financeira (Diretoria)</span>
              </div>

              {/* Preview de parcelas */}
              {order.installments && order.installments.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Prévia dos Boletos</span>
                  {order.installments.filter(i => !i.isBoletoFrete).map((inst, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-900/40">
                      <span className="text-slate-600 dark:text-slate-400">
                        {inst.numeroParcela}ª parcela
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        R$ {Number(inst.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autorizarBoletos}
                  onChange={(e) => setAutorizarBoletos(e.target.checked)}
                  className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                />
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Autorizar e despachar boletos para o Contas a Pagar
                </span>
              </label>

              {!autorizarBoletos && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Boletos ficarão com status "retidos" até autorização posterior.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!dataRecebimento || isSubmitting || isStatusBlocked}
            className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                <span>Confirmar Recebimento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
