import React from 'react';
import { AlertTriangle, Check, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { MergeFieldConflict } from '../utils/orderMerge';

interface OrderConflictResolutionModalProps {
  isOpen: boolean;
  conflicts: MergeFieldConflict[];
  remoteModifier?: string | null;
  onResolve: (resolutions: Record<string, 'local' | 'remote'>) => void;
  onCancel: () => void;
}

export const OrderConflictResolutionModal: React.FC<OrderConflictResolutionModalProps> = ({
  isOpen,
  conflicts,
  remoteModifier,
  onResolve,
  onCancel
}) => {
  const [choices, setChoices] = React.useState<Record<string, 'local' | 'remote'>>({});

  React.useEffect(() => {
    // Por padrão, prioriza a digitação local do usuário para garantir segurança dos dados
    const initial: Record<string, 'local' | 'remote'> = {};
    conflicts.forEach((c, index) => {
      initial[`${c.identifier || c.field}_${index}`] = 'local';
    });
    setChoices(initial);
  }, [conflicts]);

  if (!isOpen || conflicts.length === 0) return null;

  const handleChoose = (key: string, choice: 'local' | 'remote') => {
    setChoices(prev => ({ ...prev, [key]: choice }));
  };

  const handleApply = () => {
    onResolve(choices);
  };

  const handleChooseAll = (choice: 'local' | 'remote') => {
    const updated: Record<string, 'local' | 'remote'> = {};
    conflicts.forEach((c, index) => {
      updated[`${c.identifier || c.field}_${index}`] = choice;
    });
    setChoices(updated);
  };

  const formatVal = (val: any) => {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'boolean') return val ? 'Sim / Ativo' : 'Não / Inativo';
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch { return String(val); }
    }
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Alteração Simultânea Detectada
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {remoteModifier 
                ? `${remoteModifier} salvou dados que coincidem com campos que você também alterou na tela.` 
                : 'Identificamos alterações simultâneas em campos específicos deste pedido.'}
              <br />
              Escolha abaixo qual versão deseja preservar para cada item:
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            {conflicts.length} {conflicts.length === 1 ? 'conflito encontrado' : 'conflitos encontrados'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleChooseAll('local')}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Manter todas as minhas
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button
              onClick={() => handleChooseAll('remote')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Usar todas do colega
            </button>
          </div>
        </div>

        {/* Conflict List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {conflicts.map((conflict, index) => {
            const key = `${conflict.identifier || conflict.field}_${index}`;
            const selected = choices[key] || 'local';

            return (
              <div 
                key={key} 
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3"
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {conflict.domain === 'items' ? 'Produto' : 'Financeiro'}
                  </span>
                  <span>{conflict.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Minha Digitação (Local) */}
                  <div 
                    onClick={() => handleChoose(key, 'local')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      selected === 'local'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        <span>Minha Digitação</span>
                        {selected === 'local' && <Check className="w-4 h-4" />}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
                        {formatVal(conflict.localValue)}
                      </div>
                    </div>
                  </div>

                  {/* Versão do Servidor (Remote) */}
                  <div 
                    onClick={() => handleChoose(key, 'remote')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      selected === 'remote'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                        <span>{remoteModifier || 'Versão do Colega'}</span>
                        {selected === 'remote' && <Check className="w-4 h-4" />}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
                        {formatVal(conflict.remoteValue)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer hover:scale-102"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar e Prosseguir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
