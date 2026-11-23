import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Building2,
  BarChart3
} from 'lucide-react';
import { User } from '../../../shared/types';
import { DirectorBiCharts } from '../components/DirectorBiCharts';
import {
  MOCK_STORE_METRICS,
  MOCK_DAILY_PROGRESSION,
  MOCK_PAYMENT_MIX
} from '../mock/unitsMockData';

interface StoresBiPageProps {
  currentUser?: User;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StoresBiPage: React.FC<StoresBiPageProps> = () => {
  const [selectedMonth, setSelectedMonth] = useState('2026-11');

  return (
    <div className="max-w-[1700px] mx-auto space-y-6 pb-14 animate-in fade-in duration-200">
      {/* 1. CABEÇALHO DO BI DAS LOJAS */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  BI das Lojas
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Diretoria & Root • Gestão Estratégica
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Rede Mega 12 • 20 Filiais
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Curva de Evolução Diária da Rede, Comparativo de Vendas vs Metas e Mix de Pagamentos
              </p>
            </div>
          </div>

          {/* Seletor de Mês */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 shadow-2xs">
              <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="2026-11">Novembro / 2026 (Atual)</option>
                <option value="2026-12">Dezembro / 2026 (Natal)</option>
                <option value="2027-01">Janeiro / 2027</option>
                <option value="2027-02">Fevereiro / 2027</option>
              </select>
            </div>
          </div>
        </div>

        {/* Informações Rápidas de Apoio à Gestão */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
            20 Unidades Ativas
          </span>
          <span>•</span>
          <span>Acompanhamento diário em tempo real com base nos fechamentos aprovados</span>
        </div>
      </div>

      {/* 2. GRÁFICOS E RANKINGS DE BI */}
      <DirectorBiCharts
        metrics={MOCK_STORE_METRICS}
        dailyProgression={MOCK_DAILY_PROGRESSION}
        paymentMix={MOCK_PAYMENT_MIX}
        selectedMonth={selectedMonth}
      />
    </div>
  );
};
