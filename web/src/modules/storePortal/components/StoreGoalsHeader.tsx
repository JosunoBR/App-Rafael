import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Trophy, 
  Flame,
  AlertTriangle,
  Calendar,
  Sparkles
} from 'lucide-react';
import { StoreGoalData, DailyCashClosing } from '../types/storePortal.types';
import { StoreProgressBarParticles } from './StoreProgressBarParticles';

interface StoreGoalsHeaderProps {
  goalData: StoreGoalData;
  closings: Record<string, DailyCashClosing>;
  onSelectDay: (dateStr: string) => void;
  selectedMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTriggerConfetti?: () => void;
}

/**
 * CABEÇALHO OFICIAL DE METAS DA LOJA
 * Fusão aprovada:
 * - Identidade, ritmo e chips orgânicos do Split 2
 * - Barra fluida, contínua e protagonista da Hero (partículas + shimmer + glow)
 */
export const StoreGoalsHeader: React.FC<StoreGoalsHeaderProps> = ({
  goalData,
  closings,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onTriggerConfetti
}) => {
  // Alerta de devolução pendente pelo financeiro (Bruna)
  const returnedDays = Object.values(closings).filter(c => c.status === 'devolvido');
  const urgentReturned = returnedDays.length > 0 ? returnedDays[0] : null;

  const meta = goalData.metaNormal || 1;
  const superMeta = goalData.superMeta || 1;
  const currentSales = goalData.acumuladoVendido || 0;

  const isMetaHit = currentSales >= meta;
  const isSuperMetaHit = currentSales >= superMeta;

  const displayPercentage = !isMetaHit
    ? Math.min(100, Math.max(0, (currentSales / Math.max(1, meta)) * 100))
    : Math.min(100, Math.max(0, (currentSales / Math.max(1, superMeta)) * 100));

  const formattedPercentage = displayPercentage.toFixed(1);

  const formatMoney = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const metaPosPercent = Math.min(100, (meta / superMeta) * 100);
  const faltaMeta = Math.max(0, meta - currentSales);
  const faltaSuperMeta = Math.max(0, superMeta - currentSales);
  const diasRestantes = goalData.diasUteisRestantes || 1;
  const ritmoMeta = faltaMeta > 0 ? faltaMeta / diasRestantes : 0;
  const ritmoSuperMeta = faltaSuperMeta > 0 ? faltaSuperMeta / diasRestantes : 0;

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
    <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#070E1E] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-all">
      
      {/* 1. TOPO: IDENTIDADE GAMIFICADA DA LOJA + SELETOR DE MÊS + TOTAL VENDIDO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-2xs">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {goalData.lojaNome}
              </h2>
              {urgentReturned && (
                <button
                  type="button"
                  onClick={() => onSelectDay(urgentReturned.data)}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 animate-pulse cursor-pointer"
                  title="Conferência pendente"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  <span>Dia {urgentReturned.data.split('-')[2]}/{urgentReturned.data.split('-')[1]} devolvido</span>
                </button>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Jornada de Metas do Mês • {goalData.diasOperacionaisMes || 23} dias úteis
            </div>
          </div>
        </div>

        {/* Lado Direito: Seletor de Mês + Total Realizado */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={onPrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-extrabold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {formatMonthTitle(goalData.mesAno)}
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-right pl-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Vendido</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center justify-end gap-1.5">
              <span>{formatMoney(currentSales)}</span>
              {onTriggerConfetti && isMetaHit && (
                <button
                  type="button"
                  onClick={onTriggerConfetti}
                  title="Celebrar Conquista de Metas!"
                  className="p-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:scale-110 transition cursor-pointer text-xs"
                >
                  🎉
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. A BARRA HERO PROTAGONISTA (FLUIDA, LÍQUIDA, COM SHIMMER E PARTÍCULAS) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-xs">
              Evolução da Meta
            </span>
            {isSuperMetaHit ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse">
                🏆 Supermeta Batida!
              </span>
            ) : isMetaHit ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                ⭐ Meta Batida! Rumo à Supermeta
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Mirando a Meta Base
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Meta:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{formatMoney(meta)}</span>
            <span className="text-slate-400">•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              Supermeta: {formatMoney(superMeta)}
            </span>
          </div>
        </div>

        {/* Cápsula Fluida do Hero */}
        <div className="relative w-full h-12 sm:h-14 bg-slate-100 dark:bg-[#060D1A] rounded-full border border-slate-300/80 dark:border-slate-700/60 p-1.5 shadow-inner flex items-center">
          
          {/* Preenchimento Dinâmico (Verde na Meta, Dourado ao Bater a Meta) */}
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden flex items-center justify-end ${
              isMetaHit
                ? 'bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#FBBF24] animate-pulse-gold'
                : 'bg-gradient-to-r from-[#00E676] via-[#00C853] to-[#00DF81]'
            }`}
            style={{ width: `${Math.max(5, displayPercentage)}%` }}
          >
            {/* Partículas de Fluxo em Canvas */}
            <StoreProgressBarParticles />

            {/* Shimmer Beam (Feixe de Luz Contínuo) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              <div 
                className="h-full w-1/2 animate-shimmer-beam"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.42) 50%, transparent 100%)'
                }}
              />
            </div>

            {/* Rótulo de Porcentagem Fluido e Nítido */}
            {displayPercentage >= 15 && (
              <span className="relative z-30 pr-4 text-white text-xs sm:text-sm font-black tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] whitespace-nowrap select-none">
                {formattedPercentage}% da {isMetaHit ? 'Supermeta' : 'Meta'}
              </span>
            )}
          </div>

          {/* Marcador Luminoso da Meta Base (Linha sutil sem poluir o texto) */}
          {isMetaHit && (
            <div 
              className="absolute top-0 bottom-0 pointer-events-none z-30 flex items-center"
              style={{ left: `${metaPosPercent}%` }}
              title={`Meta Base: ${formatMoney(meta)}`}
            >
              <div className="h-full w-[2.5px] bg-white/80 dark:bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
            </div>
          )}
        </div>
      </div>

      {/* 3. OS CHIPS ORGÂNICOS FLUTUANTES (DO SPLIT 2) */}
      <div className="flex items-center gap-2.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
        
        {/* CARDS DA META BASE (Exibidos enquanto a Meta Base NÃO for batida) */}
        {!isMetaHit && (
          <>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Falta p/ Meta:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatMoney(faltaMeta)}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-xs shadow-2xs">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-600 dark:text-slate-300">Ritmo Meta:</span>
              <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                {formatMoney(ritmoMeta)}/dia
              </span>
              <span className="text-[10px] text-slate-400">({diasRestantes}d úteis)</span>
            </div>
          </>
        )}

        {/* CARDS DA SUPERMETA (Exibidos enquanto a Supermeta NÃO for batida) */}
        {!isSuperMetaHit && (
          <>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-600 dark:text-slate-300">Falta p/ Super:</span>
              <span className="font-extrabold text-amber-900 dark:text-amber-300">
                {formatMoney(faltaSuperMeta)}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-xs shadow-2xs">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-slate-600 dark:text-slate-300">Ritmo Super:</span>
              <span className="font-extrabold text-amber-900 dark:text-amber-300">
                {formatMoney(ritmoSuperMeta)}/dia
              </span>
              <span className="text-[10px] text-slate-400">({diasRestantes}d úteis)</span>
            </div>
          </>
        )}

        {/* MENSAGEM QUANDO AMBAS AS METAS FOREM BATIDAS */}
        {isSuperMetaHit && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-xs shadow-2xs">
            <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="font-black text-amber-900 dark:text-amber-200">
              Todas as Metas Batidas com Sucesso! 🏆
            </span>
          </div>
        )}

        {/* Chip Comissão Prevista (Fixo no canto direito) */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 text-xs ml-auto shadow-2xs">
          <Trophy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span className="text-slate-600 dark:text-slate-300">Comissão Prevista:</span>
          <span className="font-extrabold text-purple-900 dark:text-purple-300">{formatMoney(comissaoSuperMeta)}</span>
        </div>

      </div>

    </div>
  );
};
