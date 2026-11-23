import React from 'react';
import { 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  TrendingUp, 
  Trophy 
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
 * ESTILO 4: DASHBOARD CLÁSSICO (Grid de 3 Cards)
 * O layout com o grid tradicional de 3 cartões retangulares
 * preservado para referência e comparação direta.
 */
export const StoreGoalsClassicGrid: React.FC<StyleProps> = ({
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
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#080E1C] text-slate-900 dark:text-white border border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-xl space-y-4 transition-colors">
      
      {/* BARRA SUPERIOR: NAVEGAÇÃO DE MÊS & LOJA */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
            {goalData.lojaNome}
          </span>

          {urgentReturned && (
            <button
              type="button"
              onClick={() => onSelectDay(urgentReturned.data)}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 hover:bg-rose-100 dark:hover:bg-rose-500/30 transition cursor-pointer flex items-center gap-1.5 animate-pulse"
              title="Clique para corrigir o caixa devolvido pelo financeiro"
            >
              <AlertTriangle className="w-3 h-3 text-rose-500 dark:text-rose-400" />
              <span>Dia {urgentReturned.data.split('-')[2]}/{urgentReturned.data.split('-')[1]} devolvido</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
            {formatMonthTitle(goalData.mesAno)}
          </span>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CABEÇALHO DO BLOCO: TROFÉU + TÍTULO + STATUS + VALOR REALIZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-[#065F46] flex items-center justify-center text-emerald-700 dark:text-[#34D399] shadow-inner shrink-0">
            <Trophy className="w-4 h-4" />
          </div>

          <h2 className="text-xs sm:text-sm md:text-base font-black tracking-wider text-slate-900 dark:text-slate-100 uppercase">
            EVOLUÇÃO DE METAS DO MÊS
          </h2>

          {isSuperMetaHit ? (
            <span className="px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse">
              🏆 Supermeta Conquistada!
            </span>
          ) : isMetaHit ? (
            <span className="px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-100 dark:bg-[#064E3B] text-amber-800 dark:text-[#34D399] border border-amber-300 dark:border-[#059669]/40">
              META BATIDA! MIRANDO SUPERMETA
            </span>
          ) : (
            <span className="px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700/40">
              EM BUSCA DA META
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm self-end sm:self-auto">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">Realizado:</span>
          <span className="text-slate-900 dark:text-white font-extrabold text-sm sm:text-base">
            {formatMoney(currentSales)}
          </span>
          {onTriggerConfetti && isMetaHit && (
            <button
              type="button"
              onClick={onTriggerConfetti}
              title="Comemorar Conquista de Metas!"
              className="p-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 transition cursor-pointer text-xs"
            >
              🎉
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE PROGRESSO EM CÁPSULA */}
      <div className="space-y-1.5 pt-1">
        <div className="relative w-full h-11 sm:h-12 bg-slate-100 dark:bg-[#060D1A] rounded-full border border-slate-300/80 dark:border-slate-700/60 p-1 overflow-hidden shadow-inner flex items-center">
          
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden flex items-center justify-end ${
              isMetaHit
                ? 'bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#FBBF24] animate-pulse-gold'
                : 'bg-gradient-to-r from-[#00E676] via-[#00C853] to-[#00DF81]'
            }`}
            style={{ width: `${Math.max(4, displayPercentage)}%` }}
          >
            <StoreProgressBarParticles />

            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              <div 
                className="h-full w-1/2 animate-shimmer-beam"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.38) 50%, transparent 100%)'
                }}
              />
            </div>

            {displayPercentage >= 15 && (
              <span className="relative z-30 pr-3 sm:pr-4 text-white text-xs sm:text-sm font-black tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] whitespace-nowrap select-none">
                {formattedPercentage}% da {isMetaHit ? 'Supermeta' : 'Meta'}
              </span>
            )}
          </div>

          {/* Marcador Luminoso da Meta Base */}
          {isMetaHit && (
            <div 
              className="absolute top-0 bottom-0 pointer-events-none z-30 flex items-center"
              style={{ left: `${metaPosPercent}%` }}
              title={`Marco da Meta: ${formatMoney(meta)}`}
            >
              <div className="h-full w-[2px] bg-white/75 dark:bg-white/85 shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
            </div>
          )}
        </div>

        {/* Legenda Inferior Abaixo da Barra */}
        <div className="flex items-center justify-between px-2 text-[11px] sm:text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">
            R$ 0,00
          </span>
          <span className="text-emerald-600 dark:text-[#00DF81] font-bold">
            Meta: {formatMoney(meta)} ({isMetaHit ? '100.0%' : formattedPercentage + '%'})
          </span>
          <span className="text-amber-600 dark:text-[#F59E0B] font-bold flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-500 dark:text-[#F59E0B]" />
            Supermeta: {formatMoney(superMeta)}
          </span>
        </div>
      </div>

      {/* GRID DOS 3 CARDS INFERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-2">
        
        {/* CARD 1: ALVO SUPERMETA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-[#091224] border border-amber-300/80 dark:border-[#F59E0B]/50 shadow-xs dark:shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-[#F59E0B]">
              ALVO SUPERMETA
            </span>
            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-[#F59E0B]">
              <Target className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-[#FEF08A] tracking-tight">
              {formatMoney(superMeta)}
            </div>
          </div>

          <div className="text-xs font-semibold text-amber-700/90 dark:text-amber-500/80">
            Meta base: {formatMoney(meta)}
          </div>
        </div>

        {/* CARD 2: FALTA P/ SUPERMETA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#091224] border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              FALTA P/ SUPERMETA
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-[#064E3B] text-emerald-800 dark:text-[#34D399] border border-emerald-300 dark:border-[#059669]/40">
              {formattedPercentage}% batido
            </span>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatMoney(faltaSuperMeta)}
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Faltam {formatMoney(faltaMeta)} p/ Meta Base
          </div>
        </div>

        {/* CARD 3: MÉDIA DIÁRIA NECESSÁRIA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-[#091224] border border-emerald-300/80 dark:border-emerald-500/40 shadow-xs dark:shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-[#10B981]">
              MÉDIA DIÁRIA NECESSÁRIA
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-800/60 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-[#34D399] tracking-tight">
              {formatMoney(goalData.mediaDiariaNecessaria)} <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400/80">/ dia</span>
            </div>
          </div>

          <div className="text-xs font-semibold text-emerald-700/90 dark:text-emerald-500/80">
            Calculado para {goalData.diasUteisRestantes} dias úteis restantes
          </div>
        </div>

      </div>

      {/* COMISSÕES NO RODAPÉ DO PAINEL (0,1% E 0,3%) */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-[#1E293B] flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">Comissão Meta (0,1%):</span>
          <span className="font-bold text-emerald-700 dark:text-[#34D399]">{formatMoney(comissaoMeta)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">Comissão Super Meta (0,3%):</span>
          <span className="font-bold text-amber-700 dark:text-[#FBBF24]">{formatMoney(comissaoSuperMeta)}</span>
        </div>
      </div>

    </div>
  );
};
