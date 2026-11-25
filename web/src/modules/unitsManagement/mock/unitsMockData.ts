import type { StoreDailyClosingSummary, StoreHolidayRequest, StorePerformanceMetric, BiDailyProgression, PaymentMixItem, AnnualStoreMatrixRow } from '../types/unitsManagement.types';

// Dados operacionais vêm do SQLite. Não exibir lançamentos simulados.
export const MOCK_STORES_LIST: never[] = [];
export const INITIAL_DAILY_CLOSINGS: StoreDailyClosingSummary[] = [];
export const INITIAL_HOLIDAY_REQUESTS: StoreHolidayRequest[] = [];
export const MOCK_STORE_METRICS: StorePerformanceMetric[] = [];
export const MOCK_PAYMENT_MIX: PaymentMixItem[] = [];
export const MOCK_ANNUAL_MATRIX: AnnualStoreMatrixRow[] = [];
export const MOCK_DAILY_PROGRESSION: BiDailyProgression[] = [];
