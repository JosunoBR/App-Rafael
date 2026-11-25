export interface AnnualValue { year: number; value: number | null }
export interface SpreadsheetStore {
  id: string;
  storeId?: string | null;
  name: string;
  sourceRow: number;
  sales: AnnualValue[];
  breakEven: number | null;
  spreadsheetGoal: number | null;
  spreadsheetSuperGoal: number | null;
  commission: number | null;
  superCommission: number | null;
  profitSheet: string | null;
  costName: string;
}
export interface ProfitMonth { sourceRow: number; sales: AnnualValue[]; profits: AnnualValue[] }
export interface SpreadsheetCosts {
  name: string;
  sourceRow: number;
  items: { name: string; value: number | null }[];
  reportedTotal: number | null;
}
export interface GoalsWorkbook {
  filename: string;
  sha256: string;
  years: number[];
  months: Record<string, { sourceRow: number; reportedTotals: AnnualValue[]; stores: SpreadsheetStore[] }>;
  profitSheets: Record<string, Record<string, ProfitMonth>>;
  costs: SpreadsheetCosts[];
  importedAt?: string;
  sourceSheetNames?: string[];
  registeredStores?: { id: string; name: string; shortName?: string; active: number | boolean }[];
  storeLinks?: { sourceKey: string; sourceName: string; storeId: string | null }[];
}
