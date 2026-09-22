import React, { useState, useEffect } from 'react';
import { X, History, User, Clock, CheckCircle2, Boxes, PackageCheck, Receipt, CheckCheck, Truck, ShieldCheck, FileText } from 'lucide-react';
import { DistributionAuditLog, PurchaseOrder } from '../shared/types';
import { fetchDistributionAuditLogs } from '../utils/api';

interface OrderAuditModalProps {
  order: PurchaseOrder;
  onClose: () => void;
}

export const OrderAuditModal: React.FC<OrderAuditModalProps> = ({ order, onClose }) => {
  const [logs, setLogs] = useState<DistributionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchDistributionAuditLogs(order.header.id || order.header.numeroPedido);
        if (isMounted) {
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Erro ao buscar logs da esteira:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [order]);

  const getActionBadge = (acao: string) => {
    switch (acao) {
      case 'ENVIO_DISTRIBUICAO':
        return {
          label: 'Envio para Distribuição',
          icon: Boxes,
          color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300'
        };
      case 'LIBERADO_SEPARACAO':
        return {
          label: 'Distribuição Concluída / Liberado Separação',
          icon: PackageCheck,
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300'
        };
      case 'CONFERENCIA_SEPARACAO':
        return {
          label: 'Separação & Conferência Concluída',
          icon: Receipt,
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
        };
      case 'FINALIZACAO_PEDIDO':
        return {
          label: 'Pedido Finalizado',
          icon: CheckCheck,
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
        };
      default:
        return {
          label: acao,
          icon: ShieldCheck,
          color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-emerald-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-sm flex items-center gap-2">
                Trilha de Auditoria da Esteira
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                  {order.header.numeroPedido}
                </span>
              </h2>
              <p className="text-white/80 text-xs truncate max-w-md">
                {order.header.fornecedor} • Status atual: <b>{order.header.status || 'Em Cotação'}</b>
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

        {/* Resumo da Entrega e Liberações Fixadas */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Recebido Matriz</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {order.header.recebidoMatriz ? `✓ Sim (${order.header.dataRecebimentoMatriz || ''})` : 'Não recebido'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Boletos Liberados</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {order.header.boletosLiberados ? '✓ Autorizados' : 'Pendente Diretoria'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Distribuição CD</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {order.header.distribuidoPor || (order.header.liberadoPorDeposito ? `✓ ${order.header.liberadoPorDeposito}` : 'Pendente')}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Separação / Doca</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {order.header.separadoPor || 'Pendente'}
            </span>
          </div>
        </div>

        {/* Timeline de Registros */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-medium">Carregando histórico da esteira...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nenhum evento registrado ainda na esteira.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Conforme o pedido passar pelas etapas (Distribuição, Separação, Faturamento e Finalização), os operadores e ações serão registrados aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {logs.map((log) => {
                const badge = getActionBadge(log.acao);
                const BadgeIcon = badge.icon;
                const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '';

                // Lojas afetadas
                let lojasList: string[] = [];
                if (log.lojasAfetadasJson) {
                  try {
                    lojasList = typeof log.lojasAfetadasJson === 'string' ? JSON.parse(log.lojasAfetadasJson) : log.lojasAfetadasJson;
                  } catch {}
                }

                return (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-white bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950 text-[10px] font-bold shadow-sm">
                      •
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-tight border ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
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
                        {log.totalPecasDistribuidas && Number(log.totalPecasDistribuidas) > 0 ? (
                          <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 ml-auto">
                            {Number(log.totalPecasDistribuidas).toLocaleString('pt-BR')} peças distribuídas
                          </span>
                        ) : null}
                      </div>

                      {lojasList.length > 0 && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold">Lojas atendidas ({lojasList.length}):</span>{' '}
                          <span className="font-mono text-slate-500">{lojasList.join(', ')}</span>
                        </div>
                      )}

                      {log.observacoes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          "{log.observacoes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
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
