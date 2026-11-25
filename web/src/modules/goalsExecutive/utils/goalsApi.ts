import { apiFetch } from '../../../utils/api';
import type { GoalsWorkbook } from '../types/goalsSpreadsheet.types';
export interface SavedGoal { storeId: string; amount: number | null; version: number }
export async function fetchGoalsWorkbook(): Promise<GoalsWorkbook> {
  const response = await apiFetch('/goals/history');
  return response.json();
}
export async function fetchGoalPlans(year: number, month: number): Promise<SavedGoal[]> {
  const response = await apiFetch(`/goals/plans?year=${year}&month=${month}`);
  return response.json();
}
export async function saveGoalPlans(year: number, month: number, plans: SavedGoal[]): Promise<SavedGoal[]> {
  const response = await apiFetch('/goals/plans', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year, month, plans }) });
  return response.json();
}
