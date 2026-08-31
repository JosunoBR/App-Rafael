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
      label: '1. Cotação & Compras',
      description: 'Elaboração e negociação comercial',
      icon: FileEdit,
      badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
    },
    {
      id: 'Aprovado',
      label: '2. Aprovado / Depósito',
      description: 'Aguardando rateio das 20 lojas no CD',
      icon: Boxes,
      badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'Em Separação',
      label: '3. Separação & Doca',
      description: 'Conferência física e paletização',
      icon: PackageCheck,
      badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800'
    },
    {
      id: 'Finalizado',
      label: '4. Finalizado',
      description: 'Conferido, despachado e baixado',
      icon: CheckCheck,
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 mb-5 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Lado Esquerdo: Barra Visual da Esteira de Etapas */}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            {steps.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;
              const StepIcon = step.icon;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isPast 
                        ? 'bg-emerald-500 text-white shadow-xs' 
                        : isCurrent 
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/80 shadow-md font-bold' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className={`text-xs font-bold ${
                        isCurrent 
                          ? 'text-slate-900 dark:text-white' 
                          : isPast 
                            ? 'text-slate-700 dark:text-slate-300' 
                            : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {step.label}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
                        {isCurrent ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Etapa Atual
                          </span>
                        ) : step.description}
                      </div>
                    </div>
                  </div>

                  {idx < steps.length - 1 && (
                    <div className={`flex-1 min-w-[24px] max-w-[60px] h-0.5 rounded-full hidden md:block ${
                      idx < currentIndex 
                        ? 'bg-emerald-500' 
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Lado Direito: Botão de Ação Contextual da Próxima Etapa */}
        <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
          
          {/* AÇÃO 1: Comprador / Diretoria Aprovando Cotação */}
          {currentIndex === 0 && (role === 'diretoria' || role === 'deposito') && onApproveOrder && (
            <button
              type="button"
              onClick={() => onApproveOrder(order)}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
              title="Aprovar este pedido e encaminhar para a distribuição do Depósito Central"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Aprovar Pedido (Encaminhar ao Depósito)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* AÇÃO 2: Depósito / CD Distribuindo e Liberando para Doca */}
          {currentIndex === 1 && (
            <div className="flex items-center gap-2">
              {onOpenDistribution && (
                <button
                  type="button"
                  onClick={() => onOpenDistribution(order)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Abrir a matriz de distribuição das 20 lojas para ajustar rateio ou reserva"
                >
                  <Boxes className="w-3.5 h-3.5 text-blue-500" />
                  <span>Revisar Rateio (20 Lojas)</span>
                </button>
              )}
              {onReleaseToSeparation && (
                <button
                  type="button"
                  onClick={() => onReleaseToSeparation(order)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20 transition flex items-center gap-2 cursor-pointer"
                  title="Confirmar distribuição e liberar para os conferentes da doca separarem fisicamente"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Liberar para Separação da Doca</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Abrir tela de conferência física na doca"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-purple-500" />
                  <span>Conferência na Doca</span>
                </button>
              )}
              {onFinalizeSeparation && (
                <button
                  type="button"
                  onClick={() => onFinalizeSeparation(order)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
                  title="Concluir a separação física, despachar para as lojas e arquivar pedido"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Concluir Separação & Despachar</span>
                </button>
              )}
            </div>
          )}

          {/* AÇÃO 4: Pedido Concluído / Finalizado */}
          {currentIndex === 3 && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Pedido Finalizado & Despachado</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
