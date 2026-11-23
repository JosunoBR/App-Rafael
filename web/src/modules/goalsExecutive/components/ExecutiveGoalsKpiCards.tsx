import React from 'react';
import {
  Target,
  Zap,
  Scale,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import { formatCurrency } from '../../../utils/masks';

interface ExecutiveGoalsKpiCardsProps {
  metaGlobal: number;
  superMetaGlobal: number;
  pontoEquilibrioGlobal: number;
  totalComissaoMeta: number;
  totalComissaoSuper: number;
  ticketMedioMedio: number;
  totalCuponsPrevistos: number;
  lojasPublicadasCount: number;
  totalLojas: number;
}

export const ExecutiveGoalsKpiCards: React.FC<ExecutiveGoalsKpiCardsProps> = ({
  metaGlobal,
  superMetaGlobal,
  pontoEquilibrioGlobal,
  totalComissaoMeta,
  totalComissaoSuper,
  ticketMedioMedio,
  totalCuponsPrevistos,
  lojasPublicadasCount,
  totalLojas
}) => {
  const margemSeguranca = pontoEquilibrioGlobal > 0 
    ? ((metaGlobal - pontoEquilibrioGlobal) / pontoEquilibrioGlobal) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Meta Global Consolidada */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Meta Global da Rede
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(metaGlobal)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            {lojasPublicadasCount}/{totalLojas} Publicadas
          </span>
          <span className="font-medium">
            Média: {formatCurrency(metaGlobal / (totalLojas || 20))}
          </span>
        </div>
      </div>

      {/* 2. Supermeta Global (+10%) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-amber-200/80 dark:border-amber-900/60 shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase">
              Supermeta Rede (+10%)
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
          {formatCurrency(superMetaGlobal)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            + {formatCurrency(superMetaGlobal - metaGlobal)}
          </span>
          <span className="font-medium text-[11px]">
            Bônus Máximo da Rede
          </span>
        </div>
      </div>

      {/* 3. Ponto de Equilíbrio Consolidado (31%) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            P.E. Consolidado (31%)
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(pontoEquilibrioGlobal)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            Folga: +{margemSeguranca.toFixed(1)}%
          </span>
          <span className="text-slate-400 text-[11px]">
            Acima dos Custos
          </span>
        </div>
      </div>

      {/* 4. Previsão de Comissões e Cupons */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Comissões Estimadas
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalComissaoMeta)}
          </span>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-sm font-bold text-amber-500" title="Supermeta">
            {formatCurrency(totalComissaoSuper)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <Users className="w-3 h-3 text-slate-400" />
            TM: {formatCurrency(ticketMedioMedio)}
          </span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            ~{totalCuponsPrevistos.toLocaleString('pt-BR')} cupons
          </span>
        </div>
      </div>
    </div>
  );
};
