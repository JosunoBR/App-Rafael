import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  Calendar as CalendarIcon,
  HelpCircle,
  FileText,
  Flame,
  Star,
  CheckSquare,
  X,
  Palmtree
} from 'lucide-react';
import { DailyCashClosing, StorePortalStyle, MarkedHoliday } from '../types/storePortal.types';
import { getStoreDayStatus, calculateMonthWorkingDays } from '../utils/storeCalendarUtils';

interface StoreMonthlyCalendarProps {
  selectedMonth: string; // YYYY-MM
  closings: Record<string, DailyCashClosing>;
  markedHolidays?: Record<string, MarkedHoliday>;
  onSelectDay: (dateStr: string) => void;
  onToggleHoliday?: (dateStr: string, holidayName: string, isClosing: boolean) => Promise<void>;
  activeStyle?: StorePortalStyle;
}

export const StoreMonthlyCalendar: React.FC<StoreMonthlyCalendarProps> = ({
  selectedMonth,
  closings,
  markedHolidays = {},
  onSelectDay,
  onToggleHoliday,
  activeStyle = 'hero'
}) => {
  // Estado para o mini-box / modal de confirmação do feriado
  const [confirmModalData, setConfirmModalData] = useState<{
    dateStr: string;
    holidayName: string;
    isCurrentlyMarked: boolean;
  } | null>(null);

  const [holidayBusy, setHolidayBusy] = useState(false);
  const [holidayError, setHolidayError] = useState('');
  const [customHolidayInput, setCustomHolidayInput] = useState<string>('');

  // Parsing do mês selecionado
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // 0-indexed

  // Total de dias no mês
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Primeiro dia da semana do mês (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Data de hoje no formato YYYY-MM-DD
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const formatMoneyShort = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // Monta a grade com os dias
  const calendarCells = [];

  // Espaços vazios antes do dia 1
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }

  // Contagem de feriados marcados como "Sem Expediente" no mês
  let markedHolidayCount = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${selectedMonth}-${dayStr}`;
    calendarCells.push(dateStr);

    const { isHolidayMarked, isSunday } = getStoreDayStatus(dateStr, markedHolidays);
    if (isHolidayMarked && !isSunday) {
      markedHolidayCount++;
    }
  }

  const approvedCount = Object.values(closings).filter(c => c.status === 'aprovado').length;
  const inReviewCount = Object.values(closings).filter(c => c.status === 'em_conferencia').length;
  const returnedCount = Object.values(closings).filter(c => c.status === 'devolvido').length;

  // Cálculo de dias úteis operacionais (desconsiderando domingos e feriados marcados como fechados)
  const { totalWorkingDays, remainingWorkingDays } = calculateMonthWorkingDays(
    selectedMonth,
    todayStr,
    markedHolidays
  );

  // Abertura do box de confirmação do feriado
  const handleOpenHolidayConfirm = (dateStr: string, currentHolidayName: string, isCurrentlyMarked: boolean) => {
    if (!onToggleHoliday) return;
    setHolidayError('');
    setCustomHolidayInput(currentHolidayName || 'Feriado Municipal');
    setConfirmModalData({
      dateStr,
      holidayName: currentHolidayName || 'Feriado Municipal',
      isCurrentlyMarked
    });
  };

  const handleConfirmHolidayAction = async () => {
    if (!confirmModalData || !onToggleHoliday || holidayBusy) return;
    setHolidayBusy(true); setHolidayError('');
    try {
      await onToggleHoliday(confirmModalData.dateStr, customHolidayInput.trim() || confirmModalData.holidayName, !confirmModalData.isCurrentlyMarked);
      setConfirmModalData(null);
    } catch (error) { setHolidayError(error instanceof Error ? error.message : 'Não foi possível enviar a solicitação.'); }
    finally { setHolidayBusy(false); }
  };

  // Formatação de data amigável para o modal
  const formatDateFriendly = (dStr: string) => {
    try {
      const [ano, mes, dia] = dStr.split('-');
      const d = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      return `${dia}/${mes}/${ano} (${diaSemana})`;
    } catch {
      return dStr;
    }
  };

  // Ajuste do container de acordo com o estilo ativo da página
  const getContainerClass = () => {
    switch (activeStyle) {
      case 'hero':
        return 'p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white to-slate-50/70 dark:from-[#0B132B] dark:to-[#070D1F] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-5 transition-all';
      case 'split':
        return 'p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#070E1E] border-2 border-amber-500/20 dark:border-amber-500/30 shadow-xl space-y-5 transition-all';
      case 'erica':
        return 'p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-all';
      case 'classic':
      default:
        return 'p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-all';
    }
  };

  return (
    <div className={getContainerClass()}>
      {/* TÍTULO DO CALENDÁRIO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-2xl ${activeStyle === 'split'
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
            {activeStyle === 'split' ? <Flame className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {activeStyle === 'split'
                ? 'Trilha de Fechamentos do Mês'
                : activeStyle === 'erica'
                  ? 'Lançamento Diário de Vendas'
                  : 'Calendário de Fechamento de Caixa do Mês'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {approvedCount} de {totalWorkingDays} dias úteis concluídos • {remainingWorkingDays} dias úteis restantes
            </p>
          </div>
        </div>

        {/* Resumo de Status Rápido e Legenda de Cores */}
        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
            <CalendarIcon className="w-3 h-3 text-slate-500" />
            {totalWorkingDays} Dias Úteis
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            {approvedCount} Aprovados
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-[11px] font-bold">
            <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            {inReviewCount} Em Análise
          </span>

          {returnedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[11px] font-black animate-pulse">
              <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              {returnedCount} Devolvido
            </span>
          )}
        </div>
      </div>

      {/* GRADE SEMANAL */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {/* Cabeçalho dos Dias da Semana - Domingo sempre em cinza */}
        {WEEK_DAYS.map((wd, idx) => (
          <div
            key={wd}
            className={`text-center py-1.5 text-xs font-black uppercase tracking-wider ${idx === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'
              }`}
          >
            {wd}
          </div>
        ))}

        {/* Células dos Dias */}
        {calendarCells.map((dateStr, idx) => {
          if (!dateStr) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[88px] sm:min-h-[102px] rounded-2xl bg-slate-50/40 dark:bg-slate-900/40 border border-dashed border-slate-200/60 dark:border-slate-800/60 opacity-30"
              />
            );
          }

          const dayNum = parseInt(dateStr.split('-')[2]);
          const closing = closings[dateStr];
          const isToday = dateStr === todayStr;
          const status = closing?.status || 'aberto';
          const isFuture = dateStr > todayStr;
          const {
            isSunday,
            isHolidayCandidate,
            candidateHolidayName,
            isHolidayMarked,
            markedHolidayInfo,
            holidayName
          } = getStoreDayStatus(dateStr, markedHolidays);

          // Canto arredondado conforme o estilo
          const cellRadius = activeStyle === 'classic' ? 'rounded-xl' : 'rounded-2xl';

          // ===============================================================
          // 1. CASO DOMINGO: SEMPRE EM CINZA E COM LANÇAMENTO DESABILITADO
          // ===============================================================
          if (isSunday) {
            return (
              <div
                key={dateStr} data-date={dateStr}
                className={`p-2 sm:p-2.5 min-h-[88px] sm:min-h-[102px] ${cellRadius} border border-slate-200 dark:border-slate-800/70 bg-slate-100/80 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed select-none flex flex-col justify-between text-left shadow-none`}
                title="Domingo - Loja Fechada (Lançamento desabilitado)"
              >
                {/* TOPO: NÚMERO DO DIA */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
                    {dayNum}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                      Hoje
                    </span>
                  )}
                </div>

                {/* CORPO LIMPO */}
                <div className="my-1 min-h-[1.25rem]">
                  {candidateHolidayName && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={candidateHolidayName}>
                      {candidateHolidayName}
                    </div>
                  )}
                </div>

                {/* RODAPÉ: DOMINGO */}
                <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 w-full">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    Domingo
                  </span>
                </div>
              </div>
            );
          }

          // ===============================================================
          // 2. CASO FERIADO MARCADO PELA LOJA COMO "SEM EXPEDIENTE"
          // Visual limpo: apenas número, badge clicável FERIADO, valor se houver e nome do feriado
          // ===============================================================
          if (isHolidayMarked) {
            return (
              <div
                key={dateStr} data-date={dateStr}
                className={`p-2 sm:p-2.5 min-h-[88px] sm:min-h-[102px] ${cellRadius} border-2 border-amber-400/90 dark:border-amber-500/70 bg-amber-50/90 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 flex flex-col justify-between text-left shadow-xs relative overflow-hidden group select-none`}
                title={`Feriado: ${holidayName} (Clique na palavra Feriado para reabrir o dia)`}
              >
                {/* TOPO: NÚMERO DO DIA E BADGE ALARANJADA CLICÁVEL "FERIADO" */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
                    {dayNum}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenHolidayConfirm(dateStr, holidayName || 'Feriado', true);
                    }}
                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 text-amber-900 dark:text-amber-200 border border-amber-500/40 hover:border-amber-500 cursor-pointer transition active:scale-95 shadow-2xs"
                    title="Clique para alterar ou reabrir este feriado"
                  >
                    <span>🏖️ FERIADO</span>
                  </button>
                </div>

                {/* CORPO LIMPO: VALOR SE HOUVER */}
                <div className="my-1 min-h-[1.25rem]">
                  {closing && closing.vendaTotal > 0 && (
                    <div className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-100 truncate">
                      {formatMoneyShort(closing.vendaTotal)}
                    </div>
                  )}
                </div>

                {/* RODAPÉ: NOME DO FERIADO (CLICÁVEL) E ÍCONE DE MEMORANDO */}
                <div className="flex items-center justify-between gap-1 w-full pt-1 border-t border-amber-200/80 dark:border-amber-800/80">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenHolidayConfirm(dateStr, holidayName || 'Feriado', true);
                    }}
                    className="text-[10px] font-black text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 hover:underline truncate cursor-pointer text-left"
                    title="Clique para alterar ou reabrir este feriado"
                  >
                    🏖️ {holidayName}
                  </button>
                  {closing?.memorando ? (
                    <span title="Possui Memorando" className="shrink-0 text-amber-600">
                      <FileText className="w-3 h-3" />
                    </span>
                  ) : markedHolidayInfo?.markedBy ? (
                    <span className="text-[9px] text-amber-600/80 dark:text-amber-400/80 font-semibold shrink-0" title={`Marcado por ${markedHolidayInfo.markedBy}`}>
                      ✓ {markedHolidayInfo.markedBy.split(' ')[0]}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          }

          // ===============================================================
          // 3. CASO DIA COM FERIADO PREVISTO (MAS NÃO MARCADO PELA LOJA)
          // Loja opera normalmente. Clicar na badge do feriado permite marcar o dia
          // ===============================================================
          if (isHolidayCandidate) {
            return (
              <div
                key={dateStr} data-date={dateStr}
                onClick={() => onSelectDay(dateStr)}
                className={`p-2 sm:p-2.5 min-h-[88px] sm:min-h-[102px] ${cellRadius} border-2 border-dashed border-amber-300/90 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/15 hover:border-amber-400 dark:hover:border-amber-500 active:scale-95 transition-all cursor-pointer flex flex-col justify-between text-left shadow-2xs group relative overflow-hidden`}
                title={`Clique para lançar vendas do dia ${dayNum}. Ou clique em '🏖️ ${candidateHolidayName}' para marcar como feriado.`}
              >
                {/* TOPO: NÚMERO DO DIA E BADGE DO FERIADO CANDIDATO CLICÁVEL */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                    {dayNum}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenHolidayConfirm(dateStr, candidateHolidayName || 'Feriado', false);
                    }}
                    className="inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 cursor-pointer transition active:scale-95 shadow-2xs"
                    title="Clique para informar feriado nesta data" aria-label={`Solicitar feriado em ${dateStr}`}
                  >
                    🏖️ {candidateHolidayName}
                  </button>
                </div>

                {/* CORPO: VALOR SE HOUVER */}
                <div className="my-1 min-h-[1.25rem]">
                  {closing && closing.vendaTotal > 0 && (
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {formatMoneyShort(closing.vendaTotal)}
                    </div>
                  )}
                </div>

                {/* RODAPÉ: STATUS DE LANÇAMENTO */}
                <div className="flex items-center justify-between gap-1 w-full pt-1 border-t border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {closing?.status === 'aprovado'
                      ? '✓ Vendas Aprovadas'
                      : isToday
                      ? 'Lançar Hoje'
                      : 'Expediente Normal'}
                  </span>
                  {closing?.memorando && (
                    <span title="Possui Memorando" className="shrink-0 text-slate-400">
                      <FileText className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // ===============================================================
          // 4. DIAS ÚTEIS COMERCIAIS COMUNS (SEGUNDA A SÁBADO)
          // ===============================================================
          let borderClass = 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60';
          let badgeEl = null;

          if (status === 'aprovado') {
            borderClass = 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40';
            badgeEl = (
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Aprovado</span>
              </span>
            );
          } else if (status === 'em_conferencia') {
            borderClass = 'border-sky-300 dark:border-sky-700/80 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/40';
            badgeEl = (
              <span className="flex items-center gap-1 text-[10px] font-black text-sky-700 dark:text-sky-400">
                <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="truncate">Em Análise</span>
              </span>
            );
          } else if (status === 'devolvido') {
            borderClass = 'border-rose-400 dark:border-rose-700 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 ring-2 ring-rose-500/40';
            badgeEl = (
              <span className="flex items-center gap-1 text-[10px] font-black text-rose-700 dark:text-rose-400 animate-pulse">
                <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="truncate">Correção</span>
              </span>
            );
          } else {
            // Aberto (sem fechamento registrado em dia útil)
            if (isToday) {
              borderClass = 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/15';
              badgeEl = (
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">
                  <PlusCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">Fechar Hoje</span>
                </span>
              );
            } else if (!isFuture) {
              borderClass = 'border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/10 hover:border-amber-300';
              badgeEl = (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">Pendente</span>
                </span>
              );
            } else {
              badgeEl = (
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  Aberto
                </span>
              );
            }
          }

          return (
            <div
              key={dateStr} data-date={dateStr}
              onClick={() => onSelectDay(dateStr)}
              className={`p-2 sm:p-2.5 min-h-[88px] sm:min-h-[102px] ${cellRadius} border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-95 shadow-2xs group relative overflow-hidden ${borderClass}`}
              title={`Clique para visualizar ou fechar o caixa do dia ${dateStr}`}
            >
              {/* TOPO DA CÉLULA: NÚMERO DO DIA E BOTAO RAPIDO DE FERIADO LOCAL */}
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs sm:text-sm font-black ${isToday
                    ? 'px-1.5 py-0.5 rounded-lg bg-emerald-600 text-white shadow-2xs'
                    : status === 'devolvido'
                      ? 'text-rose-700 dark:text-rose-400 font-black'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                  {dayNum}
                </span>

                <div className="flex items-center gap-1">
                  {/* Botão sutil para declarar feriado municipal caso a unidade precise */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenHolidayConfirm(dateStr, 'Feriado Municipal', false);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-600 transition"
                    title="Clique para informar feriado nesta data" aria-label={`Solicitar feriado em ${dateStr}`}
                  >
                    <Palmtree className="w-3 h-3" />
                  </button>

                  {isToday && (
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <Star className="w-2.5 h-2.5 fill-current" /> Hoje
                    </span>
                  )}
                </div>
              </div>

              {/* CORPO DA CÉLULA: VALOR REGISTRADO (Se houver) */}
              <div className="my-1 min-h-[1.25rem]">
                {closing && closing.vendaTotal > 0 && (
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {formatMoneyShort(closing.vendaTotal)}
                  </div>
                )}
              </div>

              {/* RODAPÉ DA CÉLULA: STATUS E INDICADOR DE MEMORANDO */}
              <div className="flex items-center justify-between gap-1 w-full pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div className="min-w-0 flex-1 truncate">
                  {badgeEl}
                </div>

                {closing?.memorando && (
                  <span title="Possui Memorando" className="shrink-0 text-slate-400 hover:text-slate-600">
                    <FileText className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =============================================================== */}
      {/* 5. BOX DE CONFIRMAÇÃO DO FERIADO (COMO SOLICITADO PELO USUÁRIO) */}
      {/* =============================================================== */}
      {confirmModalData && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
          onClick={() => setConfirmModalData(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Box */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {confirmModalData.isCurrentlyMarked
                      ? 'Reabrir Expediente da Loja'
                      : 'Confirmar Feriado (Sem Expediente)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatDateFriendly(confirmModalData.dateStr)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Contextual */}
            {confirmModalData.isCurrentlyMarked ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Esta data está aprovada como <strong>Sem Expediente ({confirmModalData.holidayName})</strong>.
                </p>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Após aprovação da reabertura:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                    <li>Se não for domingo ou feriado nacional, o dia voltará a ser computado como <strong>dia útil comercial (+1d)</strong>;</li>
                    <li>O botão de lançamento de caixa será <strong>reabilitado</strong>;</li>
                    <li>A média diária necessária no topo será recalculada automaticamente.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Informe e confirme que a loja <strong>não terá expediente</strong> nesta data:
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Feriado / Ocasião:
                  </label>
                  <input
                    type="text"
                    aria-label="Nome do feriado da unidade" autoFocus maxLength={300}
                    value={customHolidayInput}
                    onChange={(e) => setCustomHolidayInput(e.target.value)}
                    placeholder="Ex: Aniversário da cidade"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🏖️</span>
                    <span>Após aprovação do financeiro:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                    <li>O dia ficará em destaque alaranjado com o selo de <strong>Feriado Fechado</strong>;</li>
                    <li>O lançamento de vendas ficará <strong>desabilitado</strong> (igual ao domingo);</li>
                    <li>O dia será <strong>descontado da meta (-1d útil)</strong>, protegendo o ritmo diário.</li>
                  </ul>
                </div>
              </div>
            )}

            {holidayError && <p role="alert" className="text-xs text-rose-600">{holidayError}</p>}
            {/* Ações do Box */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={holidayBusy || !customHolidayInput.trim()}
                onClick={handleConfirmHolidayAction}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1.5 ${
                  confirmModalData.isCurrentlyMarked
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                }`}
              >
                {confirmModalData.isCurrentlyMarked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Solicitar reabertura</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Solicitar feriado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
