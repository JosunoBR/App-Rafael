import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Trophy, 
  Calendar,
  AlertTriangle
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
 * ESTILO 1: HERO WIDGET INTEGRADO (Estilo Apple / Fintech Premium)
 * Design moderno, arejado e contínuo.
 * Elimina o grid de caixinhas duras; as métricas fluem de forma integrada
 * abaixo de uma barra protagonista ampla e luminosa.
 */
export const StoreGoalsHeroWidget: React.FC<StyleProps> = ({
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

  const comissaoMeta = currentSales * 0.001;
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
    <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white to-slate-50/70 dark:from-[#0B132B] dark:to-[#070D1F] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-6 transition-all">
      
      {/* 1. TOPO: SAUDAÇÃO + NAVEGAÇÃO DE MÊS LIMPA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {goalData.lojaNome}
            </h2>
            {urgentReturned && (
              <button
                type="button"
                onClick={() => onSelectDay(urgentReturned.data)}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 hover:bg-rose-100 transition cursor-pointer flex items-center gap-1 animate-pulse"
                title="Conferência pendente"
              >
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                <span>Dia {urgentReturned.data.split('-')[2]}/{urgentReturned.data.split('-')[1]} devolvido</span>
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Ritmo sugerido: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(goalData.mediaDiariaNecessaria)} / dia</span> ({goalData.diasUteisRestantes} dias úteis restantes)
          </p>
        </div>

        {/* Seletor de Mês Estilo Pill Flutuante */}
        <div className="inline-flex items-center gap-1 self-start sm:self-auto p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shadow-2xs"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {formatMonthTitle(goalData.mesAno)}
          </span>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shadow-2xs"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. BARRA HERO EM DESTAQUE PROTAGONISTA */}
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

          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 text-xs">Vendido até hoje:</span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {formatMoney(currentSales)}
            </span>
            {onTriggerConfetti && isMetaHit && (
              <button
                type="button"
                onClick={onTriggerConfetti}
                title="Comemorar!"
                className="p-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:scale-110 transition cursor-pointer text-xs"
              >
                🎉
              </button>
            )}
          </div>
        </div>

        {/* Cápsula Fluida do Hero */}
        <div className="relative w-full h-12 sm:h-14 bg-slate-100 dark:bg-[#060D1A] rounded-full border border-slate-300/80 dark:border-slate-700/60 p-1.5 shadow-inner flex items-center">
          
          {/* Preenchimento Dinâmico */}
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

            {/* Shimmer Beam */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              <div 
                className="h-full w-1/2 animate-shimmer-beam"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.42) 50%, transparent 100%)'
                }}
              />
            </div>

            {/* Rótulo de Porcentagem Fluido */}
            {displayPercentage >= 15 && (
              <span className="relative z-30 pr-4 text-white text-xs sm:text-sm font-black tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] whitespace-nowrap select-none">
                {formattedPercentage}% da {isMetaHit ? 'Supermeta' : 'Meta'}
              </span>
            )}
          </div>

          {/* Marcador Luminoso da Meta Base */}
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

      {/* 3. FITA DE MÉTRICAS INTEGRADA (SEM CAIXAS DURA / DESIGN DE FINTECH) */}
      <div className="pt-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-4 px-4 sm:px-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200/60 dark:divide-slate-800">
          
          {/* Métrica 1: Alvo Supermeta */}
          <div className="pt-2 sm:pt-0 sm:pr-4 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span>Alvo Supermeta</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatMoney(superMeta)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Meta base: {formatMoney(meta)}
            </div>
          </div>

          {/* Métrica 2: Falta p/ Conquistar */}
          <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Falta p/ Supermeta</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatMoney(faltaSuperMeta)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {faltaMeta === 0 ? 'Meta Base Conquistada' : `Faltam ${formatMoney(faltaMeta)} p/ Meta`}
            </div>
          </div>

          {/* Métrica 3: Ritmo Diário */}
          <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ritmo Diário</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
              {formatMoney(goalData.mediaDiariaNecessaria)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Por dia nos {goalData.diasUteisRestantes} dias úteis
            </div>
          </div>

          {/* Métrica 4: Comissões Previstas */}
          <div className="pt-2 sm:pt-0 sm:pl-4 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Comissões Loja</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white pt-1">
              Meta: <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(comissaoMeta)}</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Super: <span className="text-amber-600 dark:text-amber-400">{formatMoney(comissaoSuperMeta)}</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
