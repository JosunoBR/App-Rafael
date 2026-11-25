import type { DailyCashClosing, StoreGoalData, MarkedHoliday } from '../types/storePortal.types';
// Histórico e metas são carregados do SQLite. Estado inicial vazio até a primeira consulta.
export const INITIAL_MARKED_HOLIDAYS: Record<string, MarkedHoliday> = {};
export const INITIAL_CASH_CLOSINGS: Record<string, DailyCashClosing> = {};
export const INITIAL_STORE_GOAL_DATA: StoreGoalData = {
  lojaId: '', lojaNome: '', mesAno: '', metaNormal: 0, superMeta: 0,
  acumuladoVendido: 0, diasUteisRestantes: 0, mediaDiariaNecessaria: 0, diasOperacionaisMes: 0
};
