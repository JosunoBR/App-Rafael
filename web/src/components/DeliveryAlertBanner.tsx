import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Calendar, 
  DollarSign, 
  Building2,
  Filter,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';
import { getDeliveryAlertsSummary, OrderDeliveryAlert } from '../utils/deliveryAlerts';

interface DeliveryAlertBannerProps {
  orders: PurchaseOrder[];
  onSelectOrder: (order: PurchaseOrder) => void;
  defaultExpanded?: boolean;
  className?: string;
}

export const DeliveryAlertBanner: React.FC<DeliveryAlertBannerProps> = ({
  orders,
  onSelectOrder,
  defaultExpanded = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const summary = useMemo(() => {
    return getDeliveryAlertsSummary(orders);
  }, [orders]);

  if (summary.totalAlerts === 0) {
    return null;
  }

  const hasLate = summary.lateCount > 0;

  return (
    <div 
      className={`rounded-2xl border transition-all shadow-md overflow-hidden ${
        hasLate
          ? 'bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-white dark:from-rose-950/40 dark:via-amber-950/20 dark:to-slate-900 border-rose-300 dark:border-rose-800/80 shadow-rose-500/5'
          : 'bg-gradient-to-r from-amber-500/10 via-blue-500/5 to-white dark:from-amber-950/40 dark:via-blue-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-800/80 shadow-amber-500/5'
      } ${className}`}
    >
      {/* Barra Principal do Banner */}
      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              hasLate 
                ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse' 
                : 'bg-amber-500 text-white shadow-amber-500/30'
            }`}
          >
            {hasLate ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {hasLate
                ? `Atenção: ${summary.lateCount} ${summary.lateCount === 1 ? 'pedido com entrega em atraso' : 'pedidos com entrega em atraso'} pelo fornecedor`
                : `Acompanhamento de Entregas: ${summary.totalAlerts} ${summary.totalAlerts === 1 ? 'pedido com entrega programada' : 'pedidos com entrega programada'}`}
            </h3>
          </div>
        </div>

        {/* Ações Rápidas do Cabeçalho */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">


          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            title={isExpanded ? 'Recolher lista de pedidos' : 'Expandir lista de pedidos'}
          >
            <span>{isExpanded ? 'Recolher' : 'Ver detalhes'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Lista Expansível de Pedidos em Alerta */}
      {isExpanded && (
        <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.alerts.map((alert) => {
              return (
                <div
                  key={alert.orderId}
                  onClick={() => onSelectOrder(alert.order)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:scale-[1.01] ${
                    alert.severity === 'late'
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 hover:border-rose-400'
                      : alert.severity === 'today'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 hover:border-amber-400'
                        : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900/60 hover:border-blue-400'
                  }`}
                  title="Clique para abrir e gerenciar este pedido"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                        {alert.numeroPedido}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${alert.badgeBg} ${alert.badgeText} ${alert.badgeBorder}`}>
                        {alert.label}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {alert.fornecedor}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Previsto: <strong className="text-slate-700 dark:text-slate-300">{alert.dataEntregaPrevistaBr}</strong>
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {alert.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate">Etapa: <strong className="text-slate-600 dark:text-slate-300">{alert.status}</strong></span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5">
                      Abrir Pedido <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
