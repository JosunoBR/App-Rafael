import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { StoreGoalData, DailyCashClosing } from '../../types/storePortal.types';
import { StoreProgressBarParticles } from '../StoreProgressBarParticles';
import { LOGO_MEGA12_BASE64 } from '../../../../assets/logoBase64';

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
 * ESTILO 3: APP ERICA ORIGINAL (Nativo Mobile / Foco em Vendas)
 * Reprodução fiel da ergonomia e leveza do aplicativo da Erica:
 * Saudação grande, logo oficial, barra líquida com comissões nas pontas
 * e UM ÚNICO card suave de faturamento total do mês.
 */
export const StoreGoalsAppErica: React.FC<StyleProps> = ({
  goalData,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onTriggerConfetti: _onTriggerConfetti,
  urgentReturned
}) => {
  const meta = goalData.metaNormal || 1;
  const superMeta = goalData.superMeta || 1;
  const currentSales = goalData.acumuladoVendido || 0;

  const isMetaHit = currentSales >= meta;

  const displayPercentage = !isMetaHit
    ? Math.min(100, Math.max(0, (currentSales / Math.max(1, meta)) * 100))
    : Math.min(100, Math.max(0, (currentSales / Math.max(1, superMeta)) * 100));

  const targetValue = isMetaHit ? superMeta : meta;
  const labelSuffix = isMetaHit ? ' Super Meta' : ' Meta';
  const formattedPercentage = displayPercentage.toFixed(1);

  const formatMoney = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const labelText = `${formatMoney(targetValue)} - ${formattedPercentage}%${labelSuffix}`;
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
    <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-all">
      
      {/* 0. NAVEGAÇÃO POR MESES (Fiel a HomeScreen.kt) */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 transition cursor-pointer flex items-center gap-1 font-bold text-xs"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Mês Anterior</span>
        </button>

        <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
          {formatMonthTitle(goalData.mesAno)}
        </span>

        <button
          type="button"
          onClick={onNextMonth}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 transition cursor-pointer flex items-center gap-1 font-bold text-xs"
        >
          <span className="hidden sm:inline">Próximo Mês</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 1. SAUDAÇÃO & LOGO MEGA 12 (Fiel a HomeScreen.kt) */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Olá, {goalData.lojaNome}
            </h2>
            {urgentReturned && (
              <button
                type="button"
                onClick={() => onSelectDay(urgentReturned.data)}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 animate-pulse cursor-pointer"
              >
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                <span>Devolução</span>
              </button>
            )}
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            venda diária {formatMoney(goalData.mediaDiariaNecessaria)}
          </div>
        </div>

        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-950 p-1.5 border border-emerald-500/30 shadow-md shrink-0 flex items-center justify-center">
          <img 
            src={LOGO_MEGA12_BASE64} 
            alt="Logo Mega 12" 
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
      </div>

      {/* 2. EVOLUTION PROGRESS BAR COM SHIMMER, PARTICLES E COMISSÕES */}
      <div className="space-y-2 pt-1">
        <div className="relative w-full h-11 sm:h-12 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200/90 dark:border-slate-700/60 overflow-hidden shadow-inner p-0.5 flex items-center">
          
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden flex items-center ${
              isMetaHit
                ? 'bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#FBBF24] animate-pulse-gold'
                : 'bg-gradient-to-r from-[#10B981] to-[#059669]'
            }`}
            style={{ width: `${Math.max(5, displayPercentage)}%` }}
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
          </div>

          {/* Marcador de Linha Sutil */}
          {isMetaHit && (
            <div 
              className="absolute top-0 bottom-0 pointer-events-none z-20 w-[2px] bg-white/75 shadow-[0_0_6px_rgba(255,255,255,0.9)]"
              style={{ left: `${metaPosPercent}%` }}
              title={`Marco da Meta: ${formatMoney(meta)}`}
            />
          )}

          {/* Texto Centralizado Fiel ao App Erica */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 px-4">
            <span className="text-white text-xs sm:text-sm font-black tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] text-center truncate">
              {labelText}
            </span>
          </div>
        </div>

        {/* Comissões Fiel a EvolutionProgressBar.kt */}
        <div className="flex items-center justify-between px-1 text-xs font-semibold">
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Comissão Meta (0,1%)
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(comissaoMeta)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Comissão Super Meta (0,3%)
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#F59E0B] dark:text-[#FBBF24]">
              {formatMoney(comissaoSuperMeta)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. UM ÚNICO CARD SUAVE DE TOTAL VENDIDO (Fiel a HomeScreen.kt) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/90 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Total Vendido no Mês
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
            {formatMoney(currentSales)}
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          {faltaMeta > 0 && (
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Falta Meta
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {formatMoney(faltaMeta)}
              </span>
            </div>
          )}

          {faltaSuperMeta > 0 && (
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center sm:justify-end gap-1">
                <Trophy className="w-3 h-3 text-amber-500" />
                Falta Super Meta
              </span>
              <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                {formatMoney(faltaSuperMeta)}
              </span>
            </div>
          )}

          {faltaSuperMeta === 0 && (
            <div className="text-left sm:text-right">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" /> Supermeta Atingida!
              </span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
