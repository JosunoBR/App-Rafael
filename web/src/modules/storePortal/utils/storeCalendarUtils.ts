/**
 * UTILITÁRIO DE CALENDÁRIO COMERCIAL DA LOJA (MEGA 12)
 * Regra do App:
 * - Domingos são sempre desconsiderados e desabilitados.
 * - Feriados Nacionais/Municipais são informados. Feriados onde a loja trabalha
 *   normal não precisam ser alterados (contam como dias úteis com lançamentos).
 * - A unidade marca a caixa de seleção apenas nos feriados em que NÃO HAVERÁ EXPEDIENTE.
 * - Ao marcar, o dia é desconsiderado dos cálculos de meta e o lançamento é desabilitado.
 */

import { MarkedHoliday } from '../types/storePortal.types';

// Mapa de Feriados Nacionais (Fixos e Móveis de Referência)
export const BRAZILIAN_HOLIDAYS_MAP: Record<string, string> = {
  // Feriados Nacionais Fixos Anuais (MM-DD)
  '01-01': 'Confraternização Universal',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '09-07': 'Independência do Brasil',
  '10-12': 'N. Sra. Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '11-20': 'Consciência Negra',
  '12-25': 'Natal',

  // Feriados Móveis de 2026 (YYYY-MM-DD)
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-04-03': 'Sexta-feira Santa',
  '2026-04-05': 'Páscoa',
  '2026-06-04': 'Corpus Christi'
};

export interface StoreDayStatus {
  isSunday: boolean;
  isHoliday: boolean; // Verdadeiro se houver feriado previsto ou marcado
  isHolidayCandidate: boolean; // Há feriado previsto no calendário (nacional ou municipal)
  candidateHolidayName?: string;
  isHolidayMarked: boolean; // Loja marcou "Sem Expediente" (dia fechado)
  markedHolidayInfo?: MarkedHoliday;
  holidayName?: string;
  isWorkingDay: boolean; // Segunda a Sábado e NÃO (domingo ou feriado marcado como fechado)
}

/**
 * Identifica o status comercial de um dia específico
 */
export function getStoreDayStatus(
  dateStr: string,
  markedHolidays: Record<string, MarkedHoliday> = {},
  customHolidays = BRAZILIAN_HOLIDAYS_MAP
): StoreDayStatus {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // 0 = Domingo
  const isSunday = date.getDay() === 0;

  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const candidateHolidayName = customHolidays[dateStr] || customHolidays[mmdd] || markedHolidays[dateStr]?.holidayName;
  const isHolidayCandidate = Boolean(candidateHolidayName);

  const markedHolidayInfo = markedHolidays[dateStr];
  const isHolidayMarked = Boolean(markedHolidayInfo);
  const holidayName = markedHolidayInfo?.holidayName || candidateHolidayName;

  // Um dia só deixa de ser dia útil se for Domingo ou se for Feriado Marcado como Sem Expediente
  const isWorkingDay = !isSunday && !isHolidayMarked;

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
 * - Exclui rigorosamente domingos e feriados marcados como "Sem Expediente"
 * - No mês corrente: conta de hoje (inclusive) até o fim do mês
 * - Em mês futuro: conta todos os dias úteis do mês
 * - Em mês passado: zero dias restantes
 */
export function calculateMonthWorkingDays(
  selectedMonth: string, // YYYY-MM
  referenceDateStr?: string, // YYYY-MM-DD (padrão: hoje)
  markedHolidays: Record<string, MarkedHoliday> = {},
  customHolidays = BRAZILIAN_HOLIDAYS_MAP
): MonthWorkingDaysCalculation {
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayDay = today.getDate();

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
