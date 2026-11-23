import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Receipt,
  RotateCcw,
  Send
} from 'lucide-react';
import { StoreGoalRow } from '../types/goalsExecutive.types';
import { formatCurrency } from '../../../utils/masks';

interface GoalsCalculatorTableProps {
  stores: StoreGoalRow[];
  onUpdateMeta: (lojaId: string, novaMeta: number) => void;
  onApplyMassAdjustment: (percentual: number) => void;
  onResetToSpreadsheet: () => void;
  onPublishGoals: () => void;
  onOpenStoreCosts: (store: StoreGoalRow) => void;
}

export const GoalsCalculatorTable: React.FC<GoalsCalculatorTableProps> = ({
  stores,
  onUpdateMeta,
  onApplyMassAdjustment,
  onResetToSpreadsheet,
  onPublishGoals,
  onOpenStoreCosts
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInputId, setEditingInputId] = useState<string | null>(null);
  const [editingInputValue, setEditingInputValue] = useState<string>('');

  const filteredStores = stores.filter(s => {
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return s.lojaNome.toLowerCase().includes(term) || s.cidade.toLowerCase().includes(term);
    }
    return true;
  });

  // Totais consolidados do grid filtrado
  const totalVendasAnterior = filteredStores.reduce((acc, s) => acc + s.vendasAnoAnterior, 0);
  const totalPE = filteredStores.reduce((acc, s) => acc + s.pontoEquilibrio, 0);
  const totalMeta = filteredStores.reduce((acc, s) => acc + s.metaNormal, 0);
  const totalSuperMeta = filteredStores.reduce((acc, s) => acc + s.superMeta, 0);
  const totalComissaoMeta = filteredStores.reduce((acc, s) => acc + s.valorComissaoMeta, 0);
  const totalComissaoSuper = filteredStores.reduce((acc, s) => acc + s.valorComissaoSuper, 0);
  const totalCupons = filteredStores.reduce((acc, s) => acc + s.quantidadeVendasProjetada, 0);

  // Conversão segura de string digitada pelo usuário para centavos/número float
  const handleInputChange = (lojaId: string, rawVal: string) => {
    // Permite digitação com números e converte
    const digitsOnly = rawVal.replace(/\D/g, '');
    const numValue = (parseInt(digitsOnly, 10) || 0) / 100;
    setEditingInputValue(formatCurrency(numValue));
    onUpdateMeta(lojaId, numValue);
  };

  const handleStartEdit = (store: StoreGoalRow) => {
    setEditingInputId(store.lojaId);
    setEditingInputValue(formatCurrency(store.metaNormal));
  };

  const handleFinishEdit = () => {
    setEditingInputId(null);
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Ações Executivas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Lado Esquerdo: Busca e Totalizador */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar loja ou cidade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
            Tabela Geral • {filteredStores.length} Lojas
          </span>
        </div>

        {/* Lado Direito: Ações em Massa & Publicação */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reajustes em Massa */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Simular:
            </span>
            <button
              onClick={() => onApplyMassAdjustment(0.05)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
              title="Aumentar 5% nas metas"
            >
              +5%
            </button>
            <button
              onClick={() => onApplyMassAdjustment(0.10)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition cursor-pointer"
              title="Aumentar 10% nas metas"
            >
              +10%
            </button>
            <button
              onClick={onResetToSpreadsheet}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Restaurar valores da planilha VENDAS ANUAL ALS"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botão de Publicação para a Rede */}
          <button
            onClick={onPublishGoals}
            className="px-4 py-2 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-2 transition cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publicar Metas na Rede</span>
          </button>
        </div>

      </div>

      {/* Grid / Tabela da Calculadora de Metas */}
      <div className="rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Loja / Unidade</th>
                <th className="py-3 px-3 text-right">Vendas 2025</th>
                <th className="py-3 px-3 text-right">P.E. (31%)</th>
                <th className="py-3 px-4 text-right min-w-[160px]">Meta Normal (R$)</th>
                <th className="py-3 px-3 text-right">Supermeta (+10%)</th>
                <th className="py-3 px-3 text-right">Comissões (Meta / Super)</th>
                <th className="py-3 px-3 text-right">Ticket & Cupons</th>
                <th className="py-3 px-3 text-center">Margem / PE</th>
                <th className="py-3 px-3 text-center">Custos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredStores.map(store => {
                const isEditing = editingInputId === store.lojaId;
                const margemSobrePE = store.pontoEquilibrio > 0 
                  ? ((store.metaNormal - store.pontoEquilibrio) / store.pontoEquilibrio) * 100 
                  : 0;

                return (
                  <tr
                    key={store.lojaId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group"
                  >
                    {/* Loja / Unidade */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {store.lojaNome}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {store.cidade}
                        </div>
                      </div>
                    </td>

                    {/* Vendas 2025 */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(store.vendasAnoAnterior)}
                    </td>

                    {/* Ponto de Equilíbrio (PE / 31%) */}
                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(store.pontoEquilibrio)}
                    </td>

                    {/* Meta Normal (Campo Editável com Máscara BRL) */}
                    <td className="py-2 px-4 text-right">
                      {isEditing ? (
                        <div className="relative inline-block w-full">
                          <input
                            type="text"
                            autoFocus
                            value={editingInputValue}
                            onChange={e => handleInputChange(store.lojaId, e.target.value)}
                            onBlur={handleFinishEdit}
                            onKeyDown={e => e.key === 'Enter' && handleFinishEdit()}
                            className="w-full py-1.5 px-3 text-right font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 rounded-xl text-emerald-700 dark:text-emerald-300 focus:outline-none shadow-sm"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(store)}
                          className="w-full py-1.5 px-3 text-right font-mono font-bold text-xs rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                          title="Clique para editar a meta desta loja"
                        >
                          {formatCurrency(store.metaNormal)}
                        </button>
                      )}
                    </td>

                    {/* Supermeta (+10%) */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          +10%
                        </span>
                        <span>{formatCurrency(store.superMeta)}</span>
                      </div>
                    </td>

                    {/* Comissões Estimadas */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div className="flex items-center justify-end gap-1.5 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Comissão na Meta">
                          {formatCurrency(store.valorComissaoMeta)}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">/</span>
                        <span className="text-amber-500 font-bold" title="Comissão na Supermeta">
                          {formatCurrency(store.valorComissaoSuper)}
                        </span>
                      </div>
                    </td>

                    {/* Ticket & Cupons */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(store.ticketMedioProjetado)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ~{store.quantidadeVendasProjetada.toLocaleString('pt-BR')} cupons
                      </div>
                    </td>

                    {/* Margem sobre o PE */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        margemSobrePE >= 15
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : margemSobrePE >= 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {margemSobrePE >= 0 ? `+${margemSobrePE.toFixed(0)}% PE` : `${margemSobrePE.toFixed(0)}% PE`}
                      </span>
                    </td>

                    {/* Botão para Ver Custos Fixos */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => onOpenStoreCosts(store)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Ver custos fixos e detalhamento de despesas"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Linha de Totais Fixada no Rodapé */}
            <tfoot>
              <tr className="bg-slate-100/80 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 font-black text-xs text-slate-900 dark:text-white">
                <td className="py-4 px-4 uppercase tracking-wider">
                  Total Geral ({filteredStores.length} Lojas)
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  {formatCurrency(totalVendasAnterior)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalPE)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(totalMeta)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalSuperMeta)}
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(totalComissaoMeta)}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-amber-500 font-bold">{formatCurrency(totalComissaoSuper)}</span>
                  </div>
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  ~{totalCupons.toLocaleString('pt-BR')} cupons
                </td>
                <td className="py-4 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                    +{totalPE > 0 ? (((totalMeta - totalPE) / totalPE) * 100).toFixed(1) : 0}% PE
                  </span>
                </td>
                <td className="py-4 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
