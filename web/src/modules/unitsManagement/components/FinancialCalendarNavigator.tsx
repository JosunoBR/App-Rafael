import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Palmtree,
  CalendarDays,
  Sparkles,
  Filter
} from 'lucide-react';
import { StoreDailyClosingSummary, StoreHolidayRequest } from '../types/unitsManagement.types';
import { BRAZILIAN_HOLIDAYS_MAP } from '../../storePortal/utils/storeCalendarUtils';

interface FinancialCalendarNavigatorProps {
  selectedDate: string; // YYYY-MM-DD
  selectedMonth: string; // YYYY-MM
  onSelectDate: (dateStr: string) => void;
  onSelectMonth: (monthStr: string) => void;
  viewMode: 'day' | 'month';
  onChangeViewMode: (mode: 'day' | 'month') => void;
  closings: StoreDailyClosingSummary[];
  holidayRequests?: StoreHolidayRequest[];
}

export const FinancialCalendarNavigator: React.FC<FinancialCalendarNavigatorProps> = ({
  selectedDate,
  selectedMonth,
  onSelectDate,
  onSelectMonth,
  viewMode,
  onChangeViewMode,
  closings,
  holidayRequests = []
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Parsing do mês atual do navegador
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

  // Data de referência do sistema: 23/11/2026
  const TODAY_STR = '2026-11-23';

  // Nomes dos meses em português
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Formatação de data por extenso
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = [
        'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
        'Quinta-feira', 'Sexta-feira', 'Sábado'
      ][dateObj.getDay()];
      const monthName = MONTH_NAMES[m - 1];
      return {
        dayOfWeek,
        dayNumber: d,
        monthName,
        year: y,
        fullText: `${dayOfWeek}, ${String(d).padStart(2, '0')} de ${monthName} de ${y}`
      };
    } catch {
      return {
        dayOfWeek: 'Dia',
        dayNumber: 23,
        monthName: 'Novembro',
        year: 2026,
        fullText: selectedDate
      };
    }
  }, [selectedDate]);

  // Navegação de dias (+1 / -1)
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const prevDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    onSelectDate(prevDateStr);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (newMonthStr !== selectedMonth) {
      onSelectMonth(newMonthStr);
    }
    if (viewMode !== 'day') {
      onChangeViewMode('day');
    }
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    onSelectDate(nextDateStr);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (newMonthStr !== selectedMonth) {
      onSelectMonth(newMonthStr);
    }
    if (viewMode !== 'day') {
      onChangeViewMode('day');
    }
  };

  const handleGoToday = () => {
    onSelectDate(TODAY_STR);
    onSelectMonth('2026-11');
    onChangeViewMode('day');
  };

  // Navegação de mês (+1 / -1)
  const handlePrevMonth = () => {
    const prevDate = new Date(year, month - 1, 1);
    const newMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    onSelectMonth(newMonthStr);
    // Seleciona o primeiro dia do mês anterior
    onSelectDate(`${newMonthStr}-01`);
  };

  const handleNextMonth = () => {
    const nextDate = new Date(year, month + 1, 1);
    const newMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    onSelectMonth(newMonthStr);
    // Seleciona o primeiro dia do próximo mês
    onSelectDate(`${newMonthStr}-01`);
  };

  // Estatísticas e contagens agregadas por dia no mês selecionado
  const dailyMetrics = useMemo(() => {
    const map: Record<string, {
      total: number;
      aguardando: number;
      aprovado: number;
      devolvido: number;
      pendente: number;
      holidayName?: string;
    }> = {};

    closings.forEach(c => {
      if (!map[c.data]) {
        map[c.data] = { total: 0, aguardando: 0, aprovado: 0, devolvido: 0, pendente: 0 };
      }
      map[c.data].total++;
      if (c.status === 'aguardando') map[c.data].aguardando++;
      if (c.status === 'aprovado') map[c.data].aprovado++;
      if (c.status === 'devolvido') map[c.data].devolvido++;
      if (c.status === 'pendente') map[c.data].pendente++;
    });

    // Mapeia feriados
    holidayRequests.forEach(h => {
      if (h.status === 'aprovado') {
        if (!map[h.data]) {
          map[h.data] = { total: 0, aguardando: 0, aprovado: 0, devolvido: 0, pendente: 0 };
        }
        map[h.data].holidayName = h.holidayName;
      }
    });

    return map;
  }, [closings, holidayRequests]);

  // Células do calendário mensal
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const cells: (string | null)[] = [];
    // Espaços vazios antes do dia 1
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      cells.push(`${selectedMonth}-${dayStr}`);
    }
    return cells;
  }, [year, month, selectedMonth]);

  // Resumo do mês selecionado
  const monthStats = useMemo(() => {
    const monthClosings = closings.filter(c => c.data.startsWith(selectedMonth));
    return {
      total: monthClosings.length,
      aguardando: monthClosings.filter(c => c.status === 'aguardando').length,
      aprovado: monthClosings.filter(c => c.status === 'aprovado').length,
      devolvido: monthClosings.filter(c => c.status === 'devolvido').length
    };
  }, [closings, selectedMonth]);

  return (
    <div className="space-y-3">
      {/* 1. BARRA PRINCIPAL DE NAVEGAÇÃO DE DATAS */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Lado Esquerdo: Controles de Dia (< Dia >) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-2xs"
            title="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Botão de Exibição da Data Selecionada */}
          <div className="flex-1 sm:flex-initial flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300">
            <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-black flex items-center gap-1.5 flex-wrap">
                <span>{formattedSelectedDate.fullText}</span>
                {selectedDate === TODAY_STR && (
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950">
                    Hoje
                  </span>
                )}
              </div>
              <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                {viewMode === 'day' ? 'Filtrando conferência por este dia' : 'Visualizando mês consolidado'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-2xs"
            title="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {selectedDate !== TODAY_STR && (
            <button
              type="button"
              onClick={handleGoToday}
              className="px-3 py-2 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Voltar para a data de hoje (23/11/2026)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Hoje</span>
            </button>
          )}
        </div>

        {/* Lado Direito: Abertura do Calendário Mensal e Toggle de Visão */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Alternar: Dia Específico vs Mês Completo */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => onChangeViewMode('day')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Dia</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode('month')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Mês Todo</span>
            </button>
          </div>

          {/* Botão de Expandir / Recolher Calendário Mensal */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen(prev => !prev)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 shadow-2xs ${
              isCalendarOpen
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-amber-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>{isCalendarOpen ? 'Recolher Calendário' : 'Calendário Mensal'}</span>
          </button>
        </div>
      </div>

      {/* 2. PAINEL EXPANSÍVEL: CALENDÁRIO MENSAL COMPLETO (GRADE DE DIAS) */}
      {isCalendarOpen && (
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#0B132B] border border-amber-500/30 dark:border-amber-500/20 shadow-xl shadow-amber-500/5 space-y-4 animate-in fade-in zoom-in-98 duration-150">
          
          {/* Topo do Calendário: Navegador de Mês & KPIs Rápidos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{MONTH_NAMES[month]} de {year}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {monthStats.total} fechamentos
                </span>
              </h3>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Legenda Resumida */}
            <div className="flex items-center gap-3 text-[11px] font-bold flex-wrap">
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{monthStats.aguardando} Aguardando</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{monthStats.aprovado} Aprovados</span>
              </span>
              {monthStats.devolvido > 0 && (
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{monthStats.devolvido} Ajustes</span>
                </span>
              )}
            </div>
          </div>

          {/* Grade de 7 Colunas (Dom a Sáb) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Cabeçalhos dos Dias da Semana */}
            {WEEK_DAYS.map((wd, idx) => (
              <div
                key={wd}
                className={`py-1.5 text-center text-[10px] font-black uppercase tracking-wider ${
                  idx === 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
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
                    className="h-16 sm:h-20 rounded-2xl bg-slate-50/40 dark:bg-slate-900/20 border border-transparent"
                  />
                );
              }

              const dayNumber = parseInt(dateStr.split('-')[2], 10);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === TODAY_STR;
              const [y, m, d] = dateStr.split('-').map(Number);
              const cellDate = new Date(y, m - 1, d);
              const isSunday = cellDate.getDay() === 0;

              const metrics = dailyMetrics[dateStr];
              const hasAguardando = Boolean(metrics && metrics.aguardando > 0);
              const hasDevolvido = Boolean(metrics && metrics.devolvido > 0);
              const hasAprovado = Boolean(metrics && metrics.aprovado > 0);
              const holidayName = metrics?.holidayName || BRAZILIAN_HOLIDAYS_MAP[dateStr] || BRAZILIAN_HOLIDAYS_MAP[`${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`];

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    onSelectDate(dateStr);
                    onChangeViewMode('day');
                  }}
                  className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-2xl border transition cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 dark:bg-amber-500/20'
                      : isToday
                      ? 'bg-amber-50/50 dark:bg-slate-900 border-amber-300 dark:border-amber-700/60'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Topo da Célula: Dia & Status de Hoje */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-black font-mono ${
                      isSelected
                        ? 'text-amber-600 dark:text-amber-400'
                        : isSunday
                        ? 'text-rose-500'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {dayNumber}
                    </span>

                    {isToday && (
                      <span className="w-2 h-2 rounded-full bg-amber-500" title="Hoje" />
                    )}

                    {holidayName && (
                      <span title={`Feriado: ${holidayName}`}>
                        <Palmtree className="w-3 h-3 text-amber-500" />
                      </span>
                    )}
                  </div>

                  {/* Indicadores de Fechamento do Dia */}
                  <div className="space-y-0.5">
                    {hasAguardando && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-black bg-amber-500 text-slate-950 animate-pulse">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span>{metrics.aguardando}</span>
                      </span>
                    )}

                    {hasDevolvido && !hasAguardando && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-black bg-rose-600 text-white">
                        <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                        <span>{metrics.devolvido}</span>
                      </span>
                    )}

                    {hasAprovado && !hasAguardando && !hasDevolvido && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                        <span className="hidden sm:inline">100% OK</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Clique em qualquer dia para carregar imediatamente a fila de fechamentos daquela data.</span>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="text-xs font-bold text-amber-600 hover:text-amber-500 cursor-pointer"
            >
              Fechar Calendário
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
