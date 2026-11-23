import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Trophy,
  CheckCircle,
  Flame,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { StoreGoalData, DailyCashClosing } from '../../types/storePortal.types';
import { StoreProgressBarParticles } from '../StoreProgressBarParticles';

interface StyleProps {
  goalData: StoreGoalData;
  closings: Record<string, DailyCashClosing>;
  onSelectDay: (dateStr: string) => void;
  selectedMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTriggerConfetti?: () => void;
  urgentReturned: DailyCashClosing | null;
}

/**
 * ESTILO 2: SPLIT HORIZON (Termômetro Gamificado de 2 Estágios)
 * A barra é dividida fisicamente em dois blocos contíguos:
 * Fase 1 (Meta Base) + Fase 2 (Zona de Bônus / Supermeta).
 * Chips orgânicos flutuantes abaixo, sem caixas quadradas duras.
 */
export const StoreGoalsSplitHorizon: React.FC<StyleProps> = ({
  goalData,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onTriggerConfetti,
  urgentReturned
}) => {
  const meta = goalData.metaNormal || 1;
  const superMeta = goalData.superMeta || 1;
  const currentSales = goalData.acumuladoVendido || 0;

  const isMetaHit = currentSales >= meta;

  // Porcentagem da Fase 1 (Meta Base): 0 a 100%
  const phase1Percent = Math.min(100, Math.max(0, (currentSales / meta) * 100));

  // Porcentagem da Fase 2 (Zona Supermeta): do que passou da meta até a supermeta
  const superSpan = Math.max(1, superMeta - meta);
  const phase2Progress = Math.max(0, currentSales - meta);
  const phase2Percent = Math.min(100, Math.max(0, (phase2Progress / superSpan) * 100));

  const formatMoney = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const faltaSuperMeta = Math.max(0, superMeta - currentSales);
  const comissaoSuperMeta = currentSales * 0.003;

  const formatMonthTitle = (mesAno: string) => {
    try {
      const [ano, mes] = mesAno.split('-');
      const d = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const mesNome = d.toLocaleDateString('pt-BR', { month: 'long' });
      return `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${ano}`;
    } catch {
      return mesAno;
    }
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#070E1E] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">

      {/* 1. TOPO: HEADER GAMIFICADO COM NAVEGAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {goalData.lojaNome}
            </h2>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Jornada de Metas do Mês
            </div>
          </div>
          {urgentReturned && (
            <button
              type="button"
              onClick={() => onSelectDay(urgentReturned.data)}
              className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 animate-pulse cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Dia {urgentReturned.data.split('-')[2]}/{urgentReturned.data.split('-')[1]} devolvido</span>
            </button>
          )}
        </div>

        {/* Mês & Realizado */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={onPrevMonth}
              className="p-1 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-500" />
              {formatMonthTitle(goalData.mesAno)}
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              className="p-1 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Vendido</div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {formatMoney(currentSales)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. O TERMÔMETRO DE 2 ESTÁGIOS CONECTADOS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Estágio 1: Meta Base ({formatMoney(meta)})
          </span>
          <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Estágio 2: Supermeta ({formatMoney(superMeta)})
          </span>
        </div>

        {/* Trilha Dupla Conectada */}
        <div className="grid grid-cols-12 gap-1.5 p-1 rounded-full bg-slate-100 dark:bg-[#060D1A] border border-slate-300/80 dark:border-slate-700/60 shadow-inner">

          {/* BLOCO 1: META BASE (ocupa 8 colunas) */}
          <div className="col-span-8 relative h-11 sm:h-12 rounded-l-full rounded-r-lg bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden flex items-center">
            <div
              className="h-full rounded-l-full transition-all duration-1000 ease-out bg-gradient-to-r from-emerald-500 to-emerald-600 relative overflow-hidden flex items-center justify-end pr-3"
              style={{ width: `${phase1Percent}%` }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="h-full w-1/2 animate-shimmer-beam bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
              {phase1Percent >= 30 && (
                <span className="relative z-10 text-white text-xs font-black drop-shadow-xs">
                  {phase1Percent.toFixed(0)}%
                </span>
              )}
            </div>
            {isMetaHit && (
              <span className="absolute left-3 text-[10px] font-black uppercase text-white drop-shadow-sm flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-300" /> Batida!
              </span>
            )}
          </div>

          {/* BLOCO 2: ZONA SUPERMETA / BÔNUS (ocupa 4 colunas) */}
          <div className="col-span-4 relative h-11 sm:h-12 rounded-r-full rounded-l-lg bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden flex items-center">
            <div
              className={`h-full rounded-r-full transition-all duration-1000 ease-out relative overflow-hidden flex items-center justify-end pr-3 ${isMetaHit
                ? 'bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#FBBF24] animate-pulse-gold'
                : 'bg-transparent'
                }`}
              style={{ width: `${isMetaHit ? Math.max(10, phase2Percent) : 0}%` }}
            >
              {isMetaHit && <StoreProgressBarParticles />}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="h-full w-1/2 animate-shimmer-beam bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              {isMetaHit && (
                <span className="relative z-10 text-white text-xs font-black drop-shadow-sm">
                  {phase2Percent.toFixed(0)}%
                </span>
              )}
            </div>
            {!isMetaHit && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                Zona Bônus
              </span>
            )}
          </div>

        </div>

        {/* Mensagem Gamificada de Status */}
        {onTriggerConfetti && isMetaHit && (
          <div className="flex items-center justify-end text-xs pt-1 px-1">
            <button
              type="button"
              onClick={onTriggerConfetti}
              className="text-amber-600 dark:text-amber-400 hover:scale-105 font-bold transition cursor-pointer text-xs flex items-center gap-1"
            >
              🎉 Celebrar
            </button>
          </div>
        )}
      </div>

      {/* 3. CHIPS ORGÂNICOS FLUTUANTES (SEM CAIXAS QUADRADAS DE IA) */}
      <div className="flex items-center gap-2.5 flex-wrap pt-1">

        {/* Chip 1: Falta */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
          <span className="text-slate-600 dark:text-slate-300">Falta p/ Super:</span>
          <span className="font-extrabold text-slate-900 dark:text-white">{formatMoney(faltaSuperMeta)}</span>
        </div>

        {/* Chip 3: Ritmo */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-xs">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-slate-600 dark:text-slate-300">Ritmo Diário:</span>
          <span className="font-extrabold text-emerald-800 dark:text-emerald-300">{formatMoney(goalData.mediaDiariaNecessaria)}/dia</span>
          <span className="text-[10px] text-slate-400">({goalData.diasUteisRestantes}d)</span>
        </div>

        {/* Chip 4: Comissão Prevista */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 text-xs ml-auto">
          <Trophy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span className="text-slate-600 dark:text-slate-300">Comissão Prevista:</span>
          <span className="font-extrabold text-purple-900 dark:text-purple-300">{formatMoney(comissaoSuperMeta)}</span>
        </div>

      </div>

    </div>
  );
};
