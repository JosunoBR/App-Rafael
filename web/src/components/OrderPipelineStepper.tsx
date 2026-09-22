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
  Clock
} from 'lucide-react';
import { PurchaseOrder, User, OrderStatus } from '../shared/types';
import { 
  canManagePipelineDistribution, 
  canConfirmReceipt, 
  canAuthorizeFinancialRelease,
  canApproveOrder,
  canManageFaturamento
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
  onViewAuditLogs
}) => {
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const currentStatus = order.header.status || 'Em Cotação';
  const role = currentUser?.role || 'diretoria';

  // Definição das 5 etapas unificadas da esteira
  // 1. Cotação -> 2. Aprovado -> 3. Distribuição & Separação (Unificado) -> 4. Faturamento -> 5. Finalizado
  const getStepIndex = (status: string) => {
    switch (status) {
      case 'Rascunho':
      case 'Em Cotação':
        return 0;
      case 'Aprovado':
        return 1;
      case 'Em Distribuição':
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

  // Sub-estado dentro de Distribuição & Separação
  const isDistribuicao = currentStatus === 'Em Distribuição';
  const isSeparacao = currentStatus === 'Em Separação';

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
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex > 0 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 0 ? 'text-emerald-700 dark:text-emerald-300 font-black' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex > 0 ? 'bg-emerald-600 text-white' : currentIndex === 0 ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 dark:ring-emerald-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
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

            {/* 3. Distribuição & Separação (Unificados) */}
            <div className={`flex items-center gap-1.5 text-xs font-bold ${currentIndex > 2 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 2 ? 'text-indigo-700 dark:text-indigo-300 font-black' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex > 2 ? 'bg-emerald-600 text-white' : currentIndex === 2 ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {currentIndex > 2 ? '✓' : '3'}
              </span>
              <div className="flex flex-col">
                <span className="flex items-center gap-1">
                  <span>3. Distribuição & Separação</span>
                  {currentIndex === 2 && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-tight ${isSeparacao ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'}`}>
                      {isSeparacao ? 'Separação' : 'Distribuição'}
                    </span>
                  )}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
            </div>

            {/* 4. Faturamento */}
            <div className={`flex items-center gap-1 text-xs font-bold ${currentIndex > 3 ? 'text-emerald-600 dark:text-emerald-400' : currentIndex === 3 ? 'text-amber-700 dark:text-amber-300 font-black' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentIndex > 3 ? 'bg-emerald-600 text-white' : currentIndex === 3 ? 'bg-amber-600 text-white ring-2 ring-amber-300 dark:ring-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
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

          {/* Confirmar Recebimento Físico na Matriz:
              Bloqueado para 'Em Cotação', 'Rascunho' e 'Aprovado'.
              Liberado a partir de Distribuição & Separação para frente */}
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

          {/* AÇÃO ETAPA 2 -> 3: Enviar para Distribuição */}
          {currentIndex === 1 && (onSendToDistribution || onOpenDistribution) && canManagePipelineDistribution(currentUser?.role) && (
            <button
              onClick={() => {
                if (onSendToDistribution) onSendToDistribution(order);
                else if (onOpenDistribution) onOpenDistribution(order);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Enviar p/ Distribuição</span>
            </button>
          )}

          {/* AÇÃO ETAPA 3 (Distribuição) -> 3 (Separação): Concluir Distribuição e Liberar para Separação */}
          {currentIndex === 2 && isDistribuicao && onReleaseToSeparation && canManagePipelineDistribution(currentUser?.role) && (
            <button
              onClick={() => onReleaseToSeparation(order)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Concluir rateio entre as lojas e liberar acesso para a equipe de Separação"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Liberar p/ Separação</span>
            </button>
          )}

          {/* AÇÃO ETAPA 3 (Separação) -> 4 (Faturamento): Concluir Separação e Enviar p/ Faturamento */}
          {currentIndex === 2 && isSeparacao && onSendToFaturamento && (role === 'separacao' || role === 'deposito' || role === 'diretoria') && (
            <button
              onClick={() => onSendToFaturamento(order)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Concluir conferência física e encaminhar para o Faturamento"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Enviar p/ Faturamento</span>
            </button>
          )}

          {/* AÇÃO ETAPA 4 -> 5: Faturamento (Liberar Boletos / Finalizar Pedido) */}
          {currentIndex === 3 && (
            <div className="flex items-center gap-1.5">
              {!order.header.boletosLiberados && onAuthorizeFinancial && canAuthorizeFinancialRelease(currentUser?.role) && (
                <button
                  onClick={() => onAuthorizeFinancial(order)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50/90 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                  title="Autorizar o envio dos boletos deste pedido para o Contas a Pagar"
                >
                  <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Liberar Boletos</span>
                </button>
              )}

              {onFinalizeSeparation && canManageFaturamento(currentUser?.role) && (
                <button
                  onClick={() => onFinalizeSeparation(order)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Finalizar pedido na esteira operacional"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Finalizar Pedido</span>
                </button>
              )}
            </div>
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
    </div>
  );
};
