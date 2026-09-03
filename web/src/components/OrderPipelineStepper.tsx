import React from 'react';
import { 
  FileEdit, 
  CheckCircle2, 
  Boxes, 
  PackageCheck, 
  CheckCheck, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Truck, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { PurchaseOrder, User, OrderStatus } from '../shared/types';

interface OrderPipelineStepperProps {
  order: PurchaseOrder;
  currentUser?: User | null;
  onApproveOrder?: (order: PurchaseOrder) => void;
  onOpenDistribution?: (order: PurchaseOrder) => void;
  onReleaseToSeparation?: (order: PurchaseOrder) => void;
  onOpenSeparation?: (order: PurchaseOrder) => void;
  onFinalizeSeparation?: (order: PurchaseOrder) => void;
}

export const OrderPipelineStepper: React.FC<OrderPipelineStepperProps> = ({
  order,
  currentUser,
  onApproveOrder,
  onOpenDistribution,
  onReleaseToSeparation,
  onOpenSeparation,
  onFinalizeSeparation
}) => {
  const currentStatus = order.header.status || 'Em Cotação';
  const role = currentUser?.role || 'diretoria';

  // Definição das 4 etapas principais da esteira
  const steps = [
    {
      id: 'Em Cotação',
      label: '1. Cotação',
      description: 'Elaboração e negociação comercial',
      icon: FileEdit
    },
    {
      id: 'Aprovado',
      label: '2. Aprovado',
      description: 'Aguardando rateio de filiais no CD',
      icon: Boxes
    },
    {
      id: 'Em Separação',
      label: '3. Separação',
      description: 'Conferência física e paletização na doca',
      icon: PackageCheck
    },
    {
      id: 'Finalizado',
      label: '4. Finalizado',
      description: 'Conferido, despachado e baixado',
      icon: CheckCheck
    }
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'Rascunho':
      case 'Em Cotação':
        return 0;
      case 'Aprovado':
        return 1;
      case 'Em Separação':
      case 'Conferido':
        return 2;
      case 'Finalizado':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs px-4 py-2 mb-3 transition-all flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 text-xs">
      
      {/* Lado Esquerdo: Tag da Esteira + 4 Etapas em 1 Linha */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-0.5">
        
        {/* Identificador Sutil da Esteira */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Esteira:</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
            {order.header.numeroPedido || 'PED-NOVO'}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

        {/* 4 Etapas Compactas */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {steps.map((step, idx) => {
            const isPast = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <React.Fragment key={step.id}>
                <div 
                  className={`flex items-center gap-1.5 shrink-0 px-1 py-0.5 rounded-md transition ${
                    isCurrent 
                      ? 'text-slate-900 dark:text-white font-extrabold' 
                      : isPast 
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                        : 'text-slate-400 dark:text-slate-500 font-medium'
                  }`}
                  title={step.description}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] ${
                    isPast 
                      ? 'bg-emerald-500 text-white' 
                      : isCurrent 
                        ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-3 h-3" /> : (idx + 1)}
                  </div>

                  <span className="text-xs whitespace-nowrap">{step.label}</span>

                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Etapa Atual" />
                  )}
                </div>

                {idx < steps.length - 1 && (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${idx < currentIndex ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

      </div>

      {/* Lado Direito: Botão de Ação Compacto da Próxima Etapa */}
      <div className="flex items-center gap-2 shrink-0 ml-auto lg:ml-0">
        
        {/* AÇÃO 1: Comprador / Diretoria Aprovando Cotação */}
        {currentIndex === 0 && (role === 'diretoria' || role === 'deposito') && onApproveOrder && (
          <button
            type="button"
            onClick={() => onApproveOrder(order)}
            className="h-8 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
            title="Aprovar este pedido e encaminhar para a distribuição do Depósito Central"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Aprovar Pedido</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {/* AÇÃO 2: Depósito / CD Distribuindo e Liberando para Doca */}
        {currentIndex === 1 && (
          <div className="flex items-center gap-2">
            {onOpenDistribution && (
              <button
                type="button"
                onClick={() => onOpenDistribution(order)}
                className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Abrir a matriz de distribuição para ajustar rateio ou reserva"
              >
                <Boxes className="w-3.5 h-3.5 text-blue-500" />
                <span>Revisar Rateio</span>
              </button>
            )}
            {onReleaseToSeparation && (
              <button
                type="button"
                onClick={() => onReleaseToSeparation(order)}
                className="h-8 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm shadow-purple-500/20 transition flex items-center gap-1.5 cursor-pointer"
                title="Confirmar distribuição e liberar para os conferentes da doca separarem fisicamente"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Liberar para Separação da Doca</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* AÇÃO 3: Separação / Doca Conferindo e Finalizando */}
        {currentIndex === 2 && (
          <div className="flex items-center gap-2">
            {onOpenSeparation && (
              <button
                type="button"
                onClick={() => onOpenSeparation(order)}
                className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Abrir tela de conferência física na doca"
              >
                <PackageCheck className="w-3.5 h-3.5 text-purple-500" />
                <span>Conferência Doca</span>
              </button>
            )}
            {onFinalizeSeparation && (
              <button
                type="button"
                onClick={() => onFinalizeSeparation(order)}
                className="h-8 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
                title="Concluir a separação física, despachar para as lojas e arquivar pedido"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Concluir Separação</span>
              </button>
            )}
          </div>
        )}

        {/* AÇÃO 4: Pedido Concluído / Finalizado */}
        {currentIndex === 3 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 h-8 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Finalizado & Despachado</span>
          </div>
        )}

      </div>
    </div>
  );
};
