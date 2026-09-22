import React, { useState, useEffect } from 'react';
import { X, History, User, Clock, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, FileText } from 'lucide-react';
import { FinancialAuditLog } from '../shared/types';
import { fetchFinancialAuditLogs } from '../utils/api';

interface FinancialAuditModalProps {
  entryId?: string;
  orderId?: string;
  entryDescription?: string;
  onClose: () => void;
}

export const FinancialAuditModal: React.FC<FinancialAuditModalProps> = ({
  entryId,
  orderId,
  entryDescription,
  onClose
}) => {
  const [logs, setLogs] = useState<FinancialAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadLogs = async () => {
      setLoading(true);
      try {
        const data = await fetchFinancialAuditLogs({ entryId, orderId });
        if (isMounted) {
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Erro ao buscar logs de auditoria financeira:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadLogs();
    return () => {
      isMounted = false;
    };
  }, [entryId, orderId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-sm flex items-center gap-2">
                Trilha de Auditoria do Boleto / Lançamento
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                  {logs.length} registros
                </span>
              </h2>
              <p className="text-white/80 text-xs truncate max-w-md">
                {entryDescription || (orderId ? `Pedido ${orderId}` : 'Histórico de alterações e baixas')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-medium">Carregando trilha de auditoria...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nenhum evento de alteração registrado para este item.</p>
              <p className="text-[11px] text-slate-400 mt-1">Quaisquer edições em datas de vencimento, valores ou baixas serão registradas com carimbo de usuário.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {logs.map((log) => {
                const isPaid = log.acao?.includes('BAIXA');
                const isUpdate = log.acao?.includes('UPDATE');
                const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '';

                return (
                  <div key={log.id} className="relative group">
                    {/* Bullet marker */}
                    <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm ${
                      isPaid 
                        ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950' 
                        : isUpdate 
                        ? 'bg-purple-600 ring-4 ring-purple-100 dark:ring-purple-950' 
                        : 'bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-950'
                    }`}>
                      {isPaid ? '✓' : '•'}
                    </div>

                    {/* Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isPaid 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}>
                          {log.acao}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dateStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.usuarioNome}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                          {log.usuarioRole}
                        </span>
                      </div>

                      {log.campoAlterado && (
                        <div className="text-xs bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Campo <b>{log.campoAlterado}</b>:</span>
                          <span className="line-through text-rose-500 font-mono text-[11px]">{log.valorAnterior || '(vazio)'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px]">{log.valorNovo}</span>
                        </div>
                      )}

                      {log.observacao && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                          "{log.observacao}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
