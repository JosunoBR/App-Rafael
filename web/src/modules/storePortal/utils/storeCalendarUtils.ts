import { nationalHolidays } from '../../../shared/nationalHolidays';
/** Calendário operacional: domingos e feriados nacionais são automáticos.
 * Fechamentos adicionais da rede ou da unidade só descontam dias após aprovação.
 */

import { MarkedHoliday } from '../types/storePortal.types';

export interface StoreDayStatus {
  isSunday: boolean;
  isHoliday: boolean; // Verdadeiro se houver feriado previsto ou marcado
  isHolidayCandidate: boolean; // Há feriado previsto no calendário (nacional ou municipal)
  candidateHolidayName?: string;
  isHolidayMarked: boolean; // Loja marcou "Sem Expediente" (dia fechado)
  markedHolidayInfo?: MarkedHoliday;
  holidayName?: string;
  isWorkingDay: boolean; // Segunda a sábado, exceto feriados nacionais e fechamentos marcados
}

/**
 * Identifica o status comercial de um dia específico
 */
export function getStoreDayStatus(
  dateStr: string,
  markedHolidays: Record<string, MarkedHoliday> = {},
  customHolidays: Record<string, string> = {}
): StoreDayStatus {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // 0 = Domingo
  const isSunday = date.getDay() === 0;

  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const nationalHolidayName = nationalHolidays(year)[mmdd];
  const candidateHolidayName = nationalHolidayName || customHolidays[dateStr] || customHolidays[mmdd] || markedHolidays[dateStr]?.holidayName;
  const isHolidayCandidate = Boolean(candidateHolidayName);

  const markedHolidayInfo = markedHolidays[dateStr]?.status === 'aprovado' ? markedHolidays[dateStr] : undefined;
  const isHolidayMarked = Boolean(markedHolidayInfo);
  const holidayName = markedHolidayInfo?.holidayName || candidateHolidayName;

  // Domingos, feriados nacionais e fechamentos adicionais marcados não são dias úteis
  const isNationalHoliday = Boolean(nationalHolidayName);
  const isWorkingDay = !isSunday && !isNationalHoliday && !isHolidayMarked;

  return {
    isSunday,
    isHoliday: isHolidayCandidate || isHolidayMarked,
    isHolidayCandidate,
    candidateHolidayName,
    isHolidayMarked,
    markedHolidayInfo,
    holidayName,
    isWorkingDay
  };
}

export interface MonthWorkingDaysCalculation {
  totalDaysInMonth: number;
  totalWorkingDays: number;
  remainingWorkingDays: number;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
}

/**
 * Calcula os dias úteis operacionais do mês e os dias úteis restantes
 * - Exclui domingos, feriados nacionais e feriados marcados como "Sem Expediente"
 * - No mês corrente: conta de hoje (inclusive) até o fim do mês
 * - Em mês futuro: conta todos os dias úteis do mês
 * - Em mês passado: zero dias restantes
 */
export function calculateMonthWorkingDays(
  selectedMonth: string, // YYYY-MM
  referenceDateStr?: string, // YYYY-MM-DD (padrão: hoje)
  markedHolidays: Record<string, MarkedHoliday> = {},
  customHolidays: Record<string, string> = {}
): MonthWorkingDaysCalculation {
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const reference = referenceDateStr ?? new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const currentMonthStr = reference.slice(0, 7);
  const todayDay = Number(reference.slice(8, 10));

  const isCurrentMonth = selectedMonth === currentMonthStr;
  const isPastMonth = selectedMonth < currentMonthStr;
  const isFutureMonth = selectedMonth > currentMonthStr;

  let refDay = 1;
  if (isCurrentMonth) {
    if (referenceDateStr && referenceDateStr.startsWith(selectedMonth)) {
      refDay = parseInt(referenceDateStr.split('-')[2]);
    } else {
      refDay = todayDay;
    }
  }

  let totalWorkingDays = 0;
  let remainingWorkingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const { isWorkingDay } = getStoreDayStatus(dayStr, markedHolidays, customHolidays);

    if (isWorkingDay) {
      totalWorkingDays++;

      if (isCurrentMonth && day >= refDay) {
        remainingWorkingDays++;
      } else if (isFutureMonth) {
        remainingWorkingDays++;
      }
    }
  }

  if (isPastMonth) {
    remainingWorkingDays = 0;
  }

  return {
    totalDaysInMonth: daysInMonth,
    totalWorkingDays,
    remainingWorkingDays,
    isCurrentMonth,
    isPastMonth,
    isFutureMonth
  };
}
