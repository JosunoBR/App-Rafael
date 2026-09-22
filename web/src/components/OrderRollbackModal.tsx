import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  Building2, 
  Boxes, 
  PackageCheck, 
  Receipt 
} from 'lucide-react';
import { PurchaseOrder, OrderStatus } from '../shared/types';
import { rollbackOrderStatusApi } from '../utils/api';

interface OrderRollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onSuccess: (updatedOrder: PurchaseOrder) => void;
}

interface RollbackOption {
  status: OrderStatus;
  label: string;
  step: string;
  icon: React.ElementType;
  description: string;
  impactWarning: string;
  colorClass: string;
}

const ALL_ROLLBACK_OPTIONS: RollbackOption[] = [
  {
    status: 'Faturamento',
    label: '4. Faturamento',
    step: 'Etapa 4',
    icon: Receipt,
    description: 'Reabre o pedido para conferência fiscal e manipulação de boletos.',
    impactWarning: 'Remove a data de finalização e mantém o pedido aberto na etapa de conferência de boletos.',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  },
  {
    status: 'Em Separação',
    label: '3. Em Separação',
    step: 'Etapa 3 - Fase 2',
    icon: PackageCheck,
    description: 'Devolve o pedido para a conferência física e apontamento de avarias na doca.',
    impactWarning: 'Desfaz a conclusão da separação para permitir que a equipe de conferência revise as peças e avarias.',
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
  },
  {
    status: 'Em Distribuição',
    label: '3. Em Distribuição',
    step: 'Etapa 3 - Fase 1',
    icon: Boxes,
    description: 'Devolve o pedido para rateio de grade entre as lojas e estoque central do CD.',
    impactWarning: 'Desfaz a liberação da separação (oculta do app mobile). Se houve reserva para o estoque central do CD, o saldo será estornado.',
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:border-indigo-800/60 dark:text-indigo-300 dark:border-indigo-800'
  },
  {
    status: 'Aprovado',
    label: '2. Aprovado',
    step: 'Etapa 2',
    icon: CheckCircle2,
    description: 'Retorna o pedido para o fechamento comercial aprovado.',
    impactWarning: 'Revoga a confirmação de recebimento físico na Matriz e a liberação de boletos no financeiro.',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
  },
  {
    status: 'Em Cotação',
    label: '1. Em Cotação',
    step: 'Etapa 1',
    icon: Building2,
    description: 'Reabre o pedido comercial para edição de itens, fornecedor, preços e prazos.',
    impactWarning: 'Destrava o pedido para o Comprador. Revoga aprovação, confirmação de recebimento na Matriz e autorizações financeiras.',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  }
];

export const OrderRollbackModal: React.FC<OrderRollbackModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess
}) => {
  const [selectedTarget, setSelectedTarget] = useState<OrderStatus>('Em Cotação');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStatus = order?.header?.status || 'Em Cotação';

  // Obter opções anteriores válidas baseado no status atual
  const availableOptions = ALL_ROLLBACK_OPTIONS.filter(opt => {
    const rankMap: Record<string, number> = {
      'Em Cotação': 0,
      'Rascunho': 0,
      'Aprovado': 1,
      'Em Distribuição': 2,
      'Em Separação': 2.5,
      'Faturamento': 3,
      'Finalizado': 4
    };
    const currentRank = rankMap[currentStatus] ?? 0;
    const optRank = rankMap[opt.status] ?? 0;
    return optRank < currentRank;
  });

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMessage(null);
      if (availableOptions.length > 0) {
        setSelectedTarget(availableOptions[0].status);
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const selectedOption = availableOptions.find(o => o.status === selectedTarget) || availableOptions[0];
  const isReasonValid = reason.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReasonValid || !selectedOption) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const orderId = order.header.id || order.id || '';
      const res = await rollbackOrderStatusApi(orderId, {
        targetStatus: selectedOption.status,
        reason: reason.trim()
      });

      if (res.success && res.order) {
        onSuccess(res.order);
        onClose();
      } else {
        setErrorMessage(res.message || 'Falha ao retroceder status do pedido.');
      }
    } catch (err: any) {
      console.error('Erro no retrocesso do pedido:', err);
      setErrorMessage(err.message || 'Erro inesperado ao retroceder status. Verifique com o suporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Retroceder Etapa do Pedido
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {order.header.numeroPedido || 'S/N'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ação restrita à <strong className="text-rose-600 dark:text-rose-400">Diretoria</strong> com registro de auditoria imutável
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Alerta de Erro */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-800 dark:text-rose-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="block font-bold">Não foi possível retroceder:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Estado Atual */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">Status Atual na Esteira:</span>
            <span className="font-bold px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100">
              {currentStatus}
            </span>
          </div>

          {/* Seleção do Destino */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Selecione para qual etapa deseja retornar:
            </label>
            {availableOptions.length === 0 ? (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
                Este pedido já está na primeira etapa da esteira ({currentStatus}) e não pode ser retrocedido.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {availableOptions.map(option => {
                  const Icon = option.icon;
                  const isSelected = selectedTarget === option.status;
                  return (
                    <button
                      key={option.status}
                      type="button"
                      onClick={() => setSelectedTarget(option.status)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                        isSelected 
                          ? `${option.colorClass} ring-2 ring-rose-500/50 shadow-xs font-semibold` 
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/80 dark:bg-slate-900/60 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{option.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                            {option.step}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Caixa de Impacto e Alertas da Etapa Selecionada */}
          {selectedOption && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Impactos operacionais desta ação:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                {selectedOption.impactWarning}
              </p>
              <div className="pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40 text-[10px] text-amber-700/80 dark:text-amber-400/80">
                🔒 <strong>Segurança Financeira:</strong> Se houver boletos com baixa/pagamento efetuado, o sistema impedirá a ação automaticamente.
              </div>
            </div>
          )}

          {/* Justificativa Obrigatória */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Justificativa Obrigatória do Retrocesso</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-mono ${reason.trim().length >= 10 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                {reason.trim().length} / mín. 10 caracteres
              </span>
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Descreva detalhadamente o motivo do retrocesso (ex: Erro na contagem física na doca; Necessidade de renegociação de preços com o fornecedor; etc.)..."
              rows={3}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
              disabled={loading}
              required
            />
          </div>

          {/* Rodapé / Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !isReasonValid || availableOptions.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirmar Retrocesso</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
