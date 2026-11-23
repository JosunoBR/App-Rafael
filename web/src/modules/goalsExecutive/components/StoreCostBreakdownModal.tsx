import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  Receipt,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StoreFixedCosts, StoreGoalRow, CustomCostItem } from '../types/goalsExecutive.types';
import { formatCurrency } from '../../../utils/masks';

interface StoreCostBreakdownModalProps {
  store: StoreGoalRow;
  costs?: StoreFixedCosts;
  defaultCosts?: StoreFixedCosts;
  onSaveCosts: (lojaId: string, updatedCosts: StoreFixedCosts) => void;
  onClose: () => void;
}

export const StoreCostBreakdownModal: React.FC<StoreCostBreakdownModalProps> = ({
  store,
  costs,
  defaultCosts,
  onSaveCosts,
  onClose
}) => {
  // Estado inicial dos custos da unidade
  const initialData = useMemo<StoreFixedCosts>(() => {
    if (costs) return JSON.parse(JSON.stringify(costs));
    return {
      lojaId: store.lojaId,
      lojaNome: store.lojaNome,
      aluguel: 0,
      folhaPagamento: 0,
      luz: 0,
      agua: 0,
      internet: 0,
      seguranca: 0,
      sistema: 0,
      honorarios: 0,
      operacional5: 0,
      outrosCustos: [],
      totalCustosFixos: store.custosFixosTotais,
      pontoEquilibrio: store.pontoEquilibrio
    };
  }, [costs, store]);

  const [costsState, setCostsState] = useState<StoreFixedCosts>(initialData);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [newCostName, setNewCostName] = useState('');
  const [newCostValue, setNewCostValue] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Lista dos 9 custos padrões da planilha do Rafael
  const standardFields: {
    key: keyof Omit<StoreFixedCosts, 'lojaId' | 'lojaNome' | 'outrosCustos' | 'totalCustosFixos' | 'pontoEquilibrio'>;
    label: string;
    description: string;
    color: string;
  }[] = [
    { key: 'folhaPagamento', label: 'Folha de Pagamento', description: 'Salários e encargos dos colaboradores', color: 'text-purple-600 dark:text-purple-400' },
    { key: 'aluguel', label: 'Aluguel do Ponto', description: 'Locação predial do ponto comercial', color: 'text-blue-600 dark:text-blue-400' },
    { key: 'operacional5', label: '5% Operacional da Loja', description: 'Custo operacional e fundo de contingência', color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'luz', label: 'Energia Elétrica (Luz)', description: 'Fatura mensal de consumo de energia', color: 'text-amber-600 dark:text-amber-400' },
    { key: 'agua', label: 'Água e Saneamento', description: 'Consumo de água e esgoto', color: 'text-cyan-600 dark:text-cyan-400' },
    { key: 'internet', label: 'Internet / NET Fibra', description: 'Link de dados e telefonia fixa', color: 'text-indigo-600 dark:text-indigo-400' },
    { key: 'seguranca', label: 'Segurança / Alarme', description: 'Monitoramento patrimonial e alarme', color: 'text-rose-600 dark:text-rose-400' },
    { key: 'sistema', label: 'Sistema de Gestão & PDV', description: 'Mensalidade de software e PDV de frente de loja', color: 'text-teal-600 dark:text-teal-400' },
    { key: 'honorarios', label: 'Honorários Contábeis', description: 'Assessoria contábil e fiscal da unidade', color: 'text-slate-600 dark:text-slate-400' }
  ];

  // Função utilitária para converter valor digitado (estilo máscara BRL) para float
  const parseCurrencyInput = (valueStr: string): number => {
    const digitsOnly = valueStr.replace(/\D/g, '');
    return (parseInt(digitsOnly, 10) || 0) / 100;
  };

  // Recálculo dinâmico do total e do P.E.
  const recalculate = (current: StoreFixedCosts): StoreFixedCosts => {
    const standardSum = standardFields.reduce((sum, f) => sum + (Number(current[f.key]) || 0), 0);
    const outrosSum = (current.outrosCustos || []).reduce((sum, o) => sum + (Number(o.valor) || 0), 0);
    const totalCustosFixos = standardSum + outrosSum;
    const pontoEquilibrio = totalCustosFixos > 0 ? Math.round(totalCustosFixos / 0.31) : 0;

    return {
      ...current,
      totalCustosFixos,
      pontoEquilibrio
    };
  };

  // Alteração de um campo padrão
  const handleFieldChange = (
    key: keyof Omit<StoreFixedCosts, 'lojaId' | 'lojaNome' | 'outrosCustos' | 'totalCustosFixos' | 'pontoEquilibrio'>,
    rawVal: string
  ) => {
    const numVal = parseCurrencyInput(rawVal);
    setCostsState(prev => {
      const updated = { ...prev, [key]: numVal };
      return recalculate(updated);
    });
    setHasChanges(true);
  };

  // Adição de custo personalizado
  const handleAddCustomCost = () => {
    if (!newCostName.trim()) return;
    const val = parseCurrencyInput(newCostValue);
    if (val <= 0) return;

    const newItem: CustomCostItem = {
      id: `custom_${Date.now()}`,
      nome: newCostName.trim(),
      valor: val
    };

    setCostsState(prev => {
      const updated = {
        ...prev,
        outrosCustos: [...(prev.outrosCustos || []), newItem]
      };
      return recalculate(updated);
    });

    setNewCostName('');
    setNewCostValue('');
    setIsAddingCustom(false);
    setHasChanges(true);
  };

  // Remoção de custo personalizado
  const handleRemoveCustomCost = (id: string) => {
    setCostsState(prev => {
      const updated = {
        ...prev,
        outrosCustos: (prev.outrosCustos || []).filter(o => o.id !== id)
      };
      return recalculate(updated);
    });
    setHasChanges(true);
  };

  // Restaurar valores padrões da planilha
  const handleResetToDefault = () => {
    if (!defaultCosts) return;
    setCostsState(JSON.parse(JSON.stringify(defaultCosts)));
    setHasChanges(true);
  };

  // Salvar e fechar
  const handleSave = () => {
    onSaveCosts(store.lojaId, costsState);
    onClose();
  };

  const totalCustos = costsState.totalCustosFixos;
  const peCalculado = costsState.pontoEquilibrio;
  const margemPE = peCalculado > 0 ? ((store.metaNormal - peCalculado) / peCalculado) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0B132B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                  {store.lojaNome}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {store.cidade || 'Filial Física'}
                </span>
                {hasChanges && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <AlertCircle className="w-3 h-3" />
                    Valores Editados
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                Estrutura de Custos Fixos & Ponto de Equilíbrio (Fórmula ALS 31%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Card Resumo do P.E. Dinâmico */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-emerald-500/5 to-transparent border border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                Total Custos Fixos
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatCurrency(totalCustos)}
              </div>
              <span className="text-[11px] text-slate-500">
                Soma das despesas mensais da unidade
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                Ponto de Equilíbrio (PE / 31%)
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                {formatCurrency(peCalculado)}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[11px] font-bold ${
                  margemPE >= 15 ? 'text-emerald-600 dark:text-emerald-400' : margemPE >= 0 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  Meta {margemPE >= 0 ? `+${margemPE.toFixed(1)}%` : `${margemPE.toFixed(1)}%`} sobre o PE
                </span>
                <span className="text-[10px] text-slate-400">
                  (Meta: {formatCurrency(store.metaNormal)})
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Despesas Detalhadas e Editáveis */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-500" />
                <span>Composição das Despesas (Valores Editáveis)</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Digite os novos valores para recalcular
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/30 dark:bg-slate-900/40">
              {standardFields.map((field) => {
                const valor = Number(costsState[field.key]) || 0;
                const percent = totalCustos > 0 ? (valor / totalCustos) * 100 : 0;

                return (
                  <div
                    key={field.key}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {field.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {percent.toFixed(1)}% do total
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                        {field.description}
                      </p>
                    </div>

                    {/* Input Editável com máscara BRL */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      <div className="relative">
                        <input
                          type="text"
                          value={formatCurrency(valor)}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          className={`w-32 sm:w-36 py-1.5 px-2.5 text-right font-mono font-bold text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white transition shadow-2xs ${field.color}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Custos Adicionais / Personalizados da Unidade */}
              {(costsState.outrosCustos || []).map((custom) => {
                const percent = totalCustos > 0 ? (custom.valor / totalCustos) * 100 : 0;
                return (
                  <div
                    key={custom.id}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs bg-amber-500/5 hover:bg-amber-500/10 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-700 dark:text-amber-300 truncate">
                          {custom.nome}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {percent.toFixed(1)}% do total
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Despesa Adicional</span>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                        {formatCurrency(custom.valor)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomCost(custom.id)}
                        className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                        title="Remover despesa adicional"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulário / Botão de Adicionar Custo Extra */}
            <div className="mt-3">
              {isAddingCustom ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    placeholder="Nome do gasto (ex: Taxa Condomínio)"
                    value={newCostName}
                    onChange={e => setNewCostName(e.target.value)}
                    className="w-full sm:flex-1 py-1.5 px-3 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={newCostValue}
                    onChange={e => {
                      const num = parseCurrencyInput(e.target.value);
                      setNewCostValue(formatCurrency(num));
                    }}
                    className="w-full sm:w-32 py-1.5 px-3 text-right font-mono text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleAddCustomCost}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(false)}
                      className="px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Outro Custo Fixo / Variável</span>
                </button>
              )}
            </div>
          </div>

          {/* Nota Técnica da Fórmula ALS */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              📐 Como o Ponto de Equilíbrio é calculado no modelo do Rafael:
            </span>
            O P.E. corresponde a <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200">Custos Fixos / 31%</code> (margem de contribuição média do varejo Mega 12). Vendas acima do PE geram lucro operacional para a rede.
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60">
          <div>
            {defaultCosts && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Restaurar os valores originais da planilha"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão da Planilha</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
