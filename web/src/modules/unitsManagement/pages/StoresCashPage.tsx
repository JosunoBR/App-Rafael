import React, { useState } from 'react';
import {
  Banknote,
  Search,
  Receipt,
  Calendar,
  Building2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  FileText,
  DollarSign,
  Download,
  ShieldAlert,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { User } from '../../../shared/types';
import { StoreCashBalance } from '../types/unitsCash.types';
import { INITIAL_STORES_CASH_BALANCES } from '../mock/unitsCashMockData';
import { StoreDailyExpensesModal } from '../components/StoreDailyExpensesModal';
import { formatCurrency } from '../../../utils/masks';

interface StoresCashPageProps {
  currentUser?: User;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StoresCashPage: React.FC<StoresCashPageProps> = ({
  currentUser: _currentUser,
  showToast
}) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try {
      return sessionStorage.getItem('mega12_stores_cash_month') || '2026-11';
    } catch {
      return '2026-11';
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingStore, setInspectingStore] = useState<StoreCashBalance | null>(null);

  React.useEffect(() => {
    try {
      sessionStorage.setItem('mega12_stores_cash_month', selectedMonth);
    } catch {}
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  /**
   * NOTA DE ARQUITETURA PARA O BACKEND:
   * A lista abaixo é dinâmica e deve ser carregada via endpoint (ex: `GET /api/units/cash-balances?month=2026-11`).
   * No backend, cada registro deve ser gerado a partir do somatório de:
   *  + Fundo fixo de troco cadastrado para a filial
   *  + Vendas em dinheiro (meiosPagamento.dinheiro) dos fechamentos diários aprovados
   *  - Total de despesas pagas em dinheiro registradas pelo caixa da loja
   *  - Total de sangrias informadas e conferidas
   *  = Montante Acumulado Atual em Caixa (Espécie)
   */
  const [storesCash] = useState<StoreCashBalance[]>(INITIAL_STORES_CASH_BALANCES);

  // Filtro de Busca
  const filteredStores = storesCash.filter(store => {
    if (searchTerm.trim() === '') return true;
    const q = searchTerm.toLowerCase();
    return (
      store.lojaNome.toLowerCase().includes(q) ||
      store.lojaCodigo.includes(q) ||
      store.cidade.toLowerCase().includes(q) ||
      store.responsavel.toLowerCase().includes(q)
    );
  });

  // Totais Consolidados da Rede
  const totalFundoRede = storesCash.reduce((acc, s) => acc + s.fundoDeCaixa, 0);
  const totalEntradasRede = storesCash.reduce((acc, s) => acc + s.totalEntradasDinheiro, 0);
  const totalDespesasRede = storesCash.reduce((acc, s) => acc + s.totalDespesas, 0);
  const totalSangriasRede = storesCash.reduce((acc, s) => acc + s.totalSangrias, 0);
  const totalMontanteEmCaixaRede = storesCash.reduce((acc, s) => acc + s.saldoAtualEmCaixa, 0);

  const lojasComAlertaSangria = storesCash.filter(s => s.alertaSangria).length;

  const handleExportReport = () => {
    if (showToast) {
      showToast('Relatório consolidado de caixa e gastos das unidades gerado!', 'success');
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto space-y-6 pb-14 animate-in fade-in duration-200">
      
      {/* 1. CABEÇALHO DA PÁGINA DE CAIXA */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Controle de Caixa das Unidades
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Dinheiro Físico em Espécie
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {storesCash.length} Unidades Cadastradas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Acompanhamento em tempo real do montante de dinheiro retido em caixa (Entradas - Despesas - Sangrias)
              </p>
            </div>
          </div>

          {/* Seletor de Período e Exportação */}
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedMonth === '2026-11' ? 'Novembro / 2026' : selectedMonth === '2026-12' ? 'Dezembro / 2026' : selectedMonth}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleExportReport}
              className="px-4 py-2 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exportar Extrato</span>
            </button>
          </div>
        </div>

        {/* Informações de Apoio & Alertas de Sangria */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              Lista Dinâmica Integrada ao Cadastro
            </span>
            <span>•</span>
            <span>Atualização instantânea a cada fechamento diário enviado pelas unidades</span>
          </div>

          {lojasComAlertaSangria > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{lojasComAlertaSangria} lojas com saldo &gt; R$ 3.000 (sugestão de sangria/depósito)</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. CARDS DE KPI CONSOLIDADOS DO CAIXA DA REDE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Montante Acumulado Total em Caixa */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
              Montante em Caixa (Rede)
            </span>
            <Banknote className="w-5 h-5 text-white/90" />
          </div>
          <div className="text-2xl lg:text-3xl font-black tracking-tight font-mono">
            {formatCurrency(totalMontanteEmCaixaRede)}
          </div>
          <p className="text-[11px] text-emerald-100 font-medium mt-1">
            Dinheiro físico disponível nas 20 lojas
          </p>
        </div>

        {/* Card 2: Entradas em Dinheiro no Mês */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Entradas Dinheiro
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(totalEntradasRede)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Vendas em espécie no mês
          </p>
        </div>

        {/* Card 3: Total Despesas Pagas pelo Caixa */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Despesas Pagas (Caixa)
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            - {formatCurrency(totalDespesasRede)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Gastos operacionais das lojas
          </p>
        </div>

        {/* Card 4: Total de Sangrias Realizadas */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sangrias / Depósitos
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            - {formatCurrency(totalSangriasRede)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Retiradas depositadas em banco
          </p>
        </div>

        {/* Card 5: Fundo de Caixa Fixo (Troco) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fundo Fixo (Troco)
            </span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-700 dark:text-slate-300 font-mono">
            {formatCurrency(totalFundoRede)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Troco permanente distribuído
          </p>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por unidade, cidade ou gerente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
            {filteredStores.length} de {storesCash.length} Unidades
          </span>
        </div>
      </div>

      {/* 4. TABELA GERAL DO CAIXA DAS UNIDADES */}
      <div className="rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Unidade / Loja</th>
                <th className="py-3.5 px-3">Responsável</th>
                <th className="py-3.5 px-3 text-right">Troco Fixo</th>
                <th className="py-3.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">Entradas (+)</th>
                <th className="py-3.5 px-3 text-right font-bold text-rose-500">Despesas (-)</th>
                <th className="py-3.5 px-3 text-right font-bold text-amber-500">Sangrias (-)</th>
                <th className="py-3.5 px-4 text-right font-black text-emerald-700 dark:text-emerald-400 text-xs">Montante Acumulado (=)</th>
                <th className="py-3.5 px-3 text-center">Status / Aporte</th>
                <th className="py-3.5 px-4 text-center">Detalhamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredStores.map(store => {
                const isHighBalance = store.alertaSangria;

                return (
                  <tr
                    key={store.lojaId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group"
                  >
                    {/* Unidade */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-black shrink-0">
                          {store.lojaCodigo}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {store.lojaNome}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {store.cidade}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Responsável */}
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-300">
                      {store.responsavel}
                    </td>

                    {/* Troco Fixo */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(store.fundoDeCaixa)}
                    </td>

                    {/* Entradas em Dinheiro */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      + {formatCurrency(store.totalEntradasDinheiro)}
                    </td>

                    {/* Despesas Pagas */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      - {formatCurrency(store.totalDespesas)}
                    </td>

                    {/* Sangrias */}
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                      - {formatCurrency(store.totalSangrias)}
                    </td>

                    {/* Montante Acumulado em Caixa */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-block px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                        <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                          {formatCurrency(store.saldoAtualEmCaixa)}
                        </span>
                      </div>
                    </td>

                    {/* Status / Alerta de Sangria */}
                    <td className="py-3.5 px-3 text-center">
                      {isHighBalance ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse" title="Saldo alto em loja. Sugere-se realizar sangria e depósito.">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Fazer Sangria</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          Regular
                        </span>
                      )}
                    </td>

                    {/* Ações: Ver Gastos por Dia */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setInspectingStore(store)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition cursor-pointer flex items-center gap-1.5 mx-auto active:scale-95 shadow-2xs"
                        title="Ver lista de todos os gastos e despesas separados por dia"
                      >
                        <Receipt className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Ver Gastos por Dia</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Linha de Totais da Rede no Rodapé */}
            <tfoot>
              <tr className="bg-slate-100/90 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 font-black text-xs text-slate-900 dark:text-white">
                <td colSpan={2} className="py-4 px-4 uppercase tracking-wider">
                  Total Consolidado da Rede ({filteredStores.length} Lojas)
                </td>
                <td className="py-4 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                  {formatCurrency(totalFundoRede)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  + {formatCurrency(totalEntradasRede)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                  - {formatCurrency(totalDespesasRede)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                  - {formatCurrency(totalSangriasRede)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(totalMontanteEmCaixaRede)}
                </td>
                <td colSpan={2} className="py-4 px-4 text-right text-slate-400 text-[11px] font-normal">
                  Soma de numerário físico apurado
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. MODAL BOX DE GASTOS SEPARADOS POR DIA */}
      <StoreDailyExpensesModal
        isOpen={Boolean(inspectingStore)}
        onClose={() => setInspectingStore(null)}
        store={inspectingStore}
      />

    </div>
  );
};
