import { useState } from 'react';
export type SortValue = string | number | null | undefined;
export function compareTableValues(a: SortValue, b: SortValue, direction: 'asc' | 'desc') {
  const missing = (value: SortValue) => value === null || value === undefined || typeof value === 'number' && !Number.isFinite(value);
  if (missing(a)) return missing(b) ? 0 : 1;
  if (missing(b)) return -1;
  const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}
export function useTableSort<T>(rows: T[], value: (row: T, key: string) => SortValue, initialKey = '', initialDirection: 'asc' | 'desc' = 'asc') {
  const [state, setState] = useState({ key: initialKey, direction: initialDirection });
  const requestSort = (key: string) => setState(previous => ({ key, direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc' }));
  return { ...state, requestSort, rows: state.key ? [...rows].sort((a, b) => compareTableValues(value(a, state.key), value(b, state.key), state.direction)) : rows };
}
