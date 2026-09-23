import React, { useState } from 'react';
import { 
  FileEdit, 
  CheckCircle2, 
  Boxes, 
  PackageCheck, 
  CheckCheck, 
  Receipt,
  ChevronRight,
  Truck, 
  CreditCard,
  History,
  ShieldCheck,
  User as UserIcon,
  Clock,
  RotateCcw
} from 'lucide-react';
import { PurchaseOrder, User, OrderStatus } from '../shared/types';
import { OrderRollbackModal } from './OrderRollbackModal';
import { 
  canManagePipelineDistribution, 
  canConfirmReceipt, 
  canAuthorizeFinancialRelease,
  canApproveOrder,
  canManageFaturamento,
  canRollbackOrderStatus
} from '../shared/permissions';

interface OrderPipelineStepperProps {
  order: PurchaseOrder;
  currentUser?: User | null;
  onApproveOrder?: (order: PurchaseOrder) => void;
  onSendToDistribution?: (order: PurchaseOrder) => void;
  onOpenDistribution?: (order: PurchaseOrder) => void;
  onReleaseToSeparation?: (order: PurchaseOrder) => void;
  onOpenSeparation?: (order: PurchaseOrder) => void;
  onSendToFaturamento?: (order: PurchaseOrder) => void;
  onFinalizeSeparation?: (order: PurchaseOrder) => void;
  onConfirmReceipt?: (order: PurchaseOrder) => void;
  onAuthorizeFinancial?: (order: PurchaseOrder) => void;
  onViewAuditLogs?: (order: PurchaseOrder) => void;
  onRollbackSuccess?: (updatedOrder: PurchaseOrder) => void;
}

export const OrderPipelineStepper: React.FC<OrderPipelineStepperProps> = ({
  order,
  currentUser,
  onApproveOrder,
  onSendToDistribution,
  onOpenDistribution,
  onReleaseToSeparation,
  onOpenSeparation,
  onSendToFaturamento,
  onFinalizeSeparation,
  onConfirmReceipt,
  onAuthorizeFinancial,
  onViewAuditLogs,
  onRollbackSuccess
}) => {
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const currentStatus = order.header.status || 'Em Cotação';
  const role = currentUser?.role || 'diretoria';

  // Definição das 5 etapas oficiais da esteira:
  // 1. Cotação -> 2. Aprovado -> 3. Separação -> 4. Faturamento -> 5. Finalizado
  const getStepIndex = (status: string) => {
    switch (status) {
      case 'Rascunho':
      case 'Em Cotação':
        return 0;
      case 'Aprovado':
        return 1;
      case 'Em Distribuição': // Retrocompatibilidade temporária caso algum resquício exista
      case 'Em Separação':
        return 2;
      case 'Faturamento':
        return 3;
      case 'Finalizado':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs px-4 py-3 mb-5 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Lado Esquerdo: Barra Visual dos 5 Passos da Esteira */}
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500">
            <span>ESTEIRA:</span>
            <span className="px-2 py-0.5 rounded-lg font-mono font-extrabold text-[11px] bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {order?.header?.numeroPedido || 'PED-0001'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 1. Cotação */}
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex > 0 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 0 ? 'text-amber-700 dark:text-amber-300 font-black' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex > 0 ? 'bg-emerald-600 text-white' : currentIndex === 0 ? 'bg-amber-600 text-white ring-2 ring-amber-300 dark:ring-amber-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {currentIndex > 0 ? '✓' : '1'}
              </span>
              <span>1. Cotação</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 2. Aprovado */}
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex > 1 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 1 ? 'text-blue-700 dark:text-blue-300 font-black' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex > 1 ? 'bg-emerald-600 text-white' : currentIndex === 1 ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {currentIndex > 1 ? '✓' : '2'}
              </span>
              <span>2. Aprovado</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 3. Separação */}
            <div className={`flex items-center gap-1.5 text-xs font-bold ${currentIndex > 2 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 2 ? 'text-purple-700 dark:text-purple-300 font-black' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex > 2 ? 'bg-emerald-600 text-white' : currentIndex === 2 ? 'bg-purple-600 text-white ring-2 ring-purple-300 dark:ring-purple-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {currentIndex > 2 ? '✓' : '3'}
              </span>
              <span>3. Separação</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 4. Faturamento */}
            <div className={`flex items-center gap-1.5 text-xs font-bold ${currentIndex > 3 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 3 ? 'text-amber-700 dark:text-amber-300 font-black' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex > 3 ? 'bg-emerald-600 text-white' : currentIndex === 3 ? 'bg-amber-600 text-white ring-2 ring-amber-300 dark:ring-amber-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {currentIndex > 3 ? '✓' : '4'}
              </span>
              <span>4. Faturamento</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 5. Finalizado */}
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex >= 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {currentIndex >= 4 ? '✓' : '5'}
              </span>
              <span>5. Finalizado</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Ações rápidas de esteira e recebimento */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          
          {/* Botão de Histórico / Auditoria da Esteira */}
          <button
            onClick={() => {
              if (onViewAuditLogs) onViewAuditLogs(order);
              else setShowAuditTrail(!showAuditTrail);
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
            title="Ver histórico de auditoria deste pedido"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Auditoria</span>
          </button>

          {/* Botão de Retrocesso de Etapa (Exclusivo Diretoria para pedidos além de Cotação) */}
          {canRollbackOrderStatus(currentUser) && currentIndex > 0 && (
            <button
              type="button"
              onClick={() => setShowRollbackModal(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 transition flex items-center gap-1 cursor-pointer active:scale-98"
              title="Retroceder o status deste pedido na esteira (Ação restrita à Diretoria)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden sm:inline">Retroceder</span>
            </button>
          )}

          {/* Confirmar Recebimento Físico na Matriz:
              Disponível na Etapa 3 (Separação) ou além para quem tiver permissão */}
          {!order.header.recebidoMatriz && order.header.status !== 'Finalizado' && onConfirmReceipt && canConfirmReceipt(currentUser?.role, order.header.status) && (
            <button
              onClick={() => onConfirmReceipt(order)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
              title="Registrar a entrega física do fornecedor na Matriz"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Confirmar Recebimento</span>
            </button>
          )}

          {/* Tag informativa de recebido na Matriz */}
          {order.header.recebidoMatriz && (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Recebido Matriz ✓</span>
            </span>
          )}

          {/* AÇÃO ETAPA 1 -> 2: Aprovar Pedido */}
          {currentIndex === 0 && onApproveOrder && canApproveOrder(currentUser?.role) && (
            <button
              onClick={() => onApproveOrder(order)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aprovar Pedido</span>
            </button>
          )}

          {/* AÇÃO ETAPA 2 (Aprovados): Depósito acessa para fazer a Distribuição / Enviar p/ Separação */}
          {currentIndex === 1 && (onOpenDistribution || onSendToDistribution || onReleaseToSeparation) && (role === 'deposito' || role === 'diretoria' || role === 'comprador') && (
            <button
              onClick={() => {
                if (onOpenDistribution) onOpenDistribution(order);
                else if (onSendToDistribution) onSendToDistribution(order);
                else if (onReleaseToSeparation) onReleaseToSeparation(order);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Acessar tela de rateio entre as 20 lojas e enviar para a Separação"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Distribuir Lojas</span>
            </button>
          )}

          {/* AÇÃO ETAPA 3 (Separação): Separação efetua a conferência física e libera para Faturamento */}
          {currentIndex === 2 && (onOpenSeparation || onSendToFaturamento || onFinalizeSeparation) && (role === 'separacao' || role === 'deposito' || role === 'diretoria') && (
            <button
              onClick={() => {
                if (onOpenSeparation) onOpenSeparation(order);
                else if (onSendToFaturamento) onSendToFaturamento(order);
                else if (onFinalizeSeparation) onFinalizeSeparation(order);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Acessar conferência de doca / apontamento de avarias e liberar para Faturamento"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Conferir Doca & Liberar p/ Faturamento</span>
            </button>
          )}

          {/* AÇÃO ETAPA 4 (Faturamento): Faturamento confere e libera os boletos */}
          {currentIndex === 3 && (
            <div className="flex items-center gap-1.5">
              {!order.header.boletosLiberados && onAuthorizeFinancial && canAuthorizeFinancialRelease(currentUser?.role, order.header.status) && (
                <button
                  onClick={() => onAuthorizeFinancial(order)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                  title="Liberar os boletos no Contas a Pagar e finalizar o pedido"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Liberar Boletos & Finalizar</span>
                </button>
              )}
            </div>
          )}

          {/* ETAPA 5: Pedido Finalizado */}
          {currentIndex === 4 && (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Pedido Finalizado ✓</span>
            </span>
          )}
        </div>
      </div>

      {/* Rastreio Rápido de Auditoria Expansível */}
      {showAuditTrail && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-400 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <UserIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">Aprovação:</span>
              <span>{order.header.aprovadoPor || 'Pendente'} {order.header.dataAprovacao ? `(${new Date(order.header.dataAprovacao).toLocaleDateString('pt-BR')})` : ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <Boxes className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">Distribuição CD:</span>
              <span>{order.header.distribuidoPor || 'Pendente'} {order.header.dataDistribuicao ? `(${new Date(order.header.dataDistribuicao).toLocaleDateString('pt-BR')})` : ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <PackageCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">Separação / Doca:</span>
              <span>{order.header.separadoPor || 'Pendente'} {order.header.dataSeparacao ? `(${new Date(order.header.dataSeparacao).toLocaleDateString('pt-BR')})` : ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">Finalização:</span>
              <span>{order.header.finalizadoPor || 'Pendente'} {order.header.dataFinalizacao ? `(${new Date(order.header.dataFinalizacao).toLocaleDateString('pt-BR')})` : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Retrocesso Seguro de Status (Diretoria) */}
      <OrderRollbackModal
        isOpen={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
        order={order}
        onSuccess={(updatedOrder) => {
          if (onRollbackSuccess) {
            onRollbackSuccess(updatedOrder);
          }
        }}
      />
    </div>
  );
};
