export function nationalHolidays(year: number): Record<string, string> {
  const holidays: Record<string, string> = {
    '01-01': 'Confraternização Universal', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho',
    '09-07': 'Independência do Brasil', '10-12': 'Nossa Senhora Aparecida', '11-02': 'Finados',
    '11-15': 'Proclamação da República', '12-25': 'Natal',
  };
  // Lei 14.759/2023, sancionada em dezembro: primeiro 20/11 nacional em 2024.
  if (year >= 2024) holidays['11-20'] = 'Consciência Negra';
  // Gregorian computus; use UTC to keep civil dates stable across time zones.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
  const easterDay = (h + l - 7 * m + 114) % 31 + 1;
  const goodFriday = new Date(Date.UTC(year, easterMonth - 1, easterDay - 2));
  holidays[goodFriday.toISOString().slice(5, 10)] = 'Sexta-feira Santa';
  return holidays;
}

