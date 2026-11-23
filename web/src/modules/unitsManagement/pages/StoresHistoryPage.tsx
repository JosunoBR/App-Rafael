import React from 'react';
import {
  FileSpreadsheet,
  Building2,
  Calendar
} from 'lucide-react';
import { User } from '../../../shared/types';
import { MultiYearSalesMatrix } from '../../goalsExecutive/components/MultiYearSalesMatrix';
import { INITIAL_EXECUTIVE_STORES } from '../../goalsExecutive/mock/goalsExecutiveMockData';

interface StoresHistoryPageProps {
  currentUser?: User;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StoresHistoryPage: React.FC<StoresHistoryPageProps> = () => {
  return (
    <div className="max-w-[1700px] mx-auto space-y-6 pb-14 animate-in fade-in duration-200">
      {/* 1. CABEÇALHO DO HISTÓRICO DE VENDAS */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/25">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Histórico de Vendas
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3" />
                  Diretoria & Root • Planilha ALS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Multianual 2021 a 2026
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Matriz consolidada de vendas anuais e acompanhamento de crescimento YoY por unidade física
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Base Oficial: VENDAS ANUAL ALS.xlsx</span>
            </div>
          </div>
        </div>

        {/* Informações Rápidas */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            20 Unidades Monitoradas
          </span>
          <span>•</span>
          <span>Comparativo direto ano a ano com cálculo automático de evolução percentual</span>
        </div>
      </div>

      {/* 2. TABELA GERAL DO HISTÓRICO MULTIANUAL */}
      <MultiYearSalesMatrix stores={INITIAL_EXECUTIVE_STORES} />
    </div>
  );
};
