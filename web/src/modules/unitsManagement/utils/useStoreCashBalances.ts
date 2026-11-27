import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { apiFetch } from '../../../utils/api';
import type { StoreCashBalance } from '../types/unitsCash.types';

type Snapshot = { rows: StoreCashBalance[]; loading: boolean; error: string };
type Entry = { snapshot: Snapshot; listeners: Set<() => void>; request?: Promise<void> };
const balancesByPeriod = new Map<string, Entry>();
function getEntry(key: string): Entry {
  let entry = balancesByPeriod.get(key);
  if (!entry) { entry = { snapshot: { rows: [], loading: true, error: '' }, listeners: new Set() }; balancesByPeriod.set(key, entry); }
  return entry;
}
function publish(entry: Entry, snapshot: Snapshot) {
  entry.snapshot = snapshot;
  entry.listeners.forEach(listener => listener());
}
async function refresh(entry: Entry, selectedMonth: string) {
  if (entry.request) return entry.request;
  entry.request = (async () => {
    try {
      const [stores, closings] = await Promise.all([
        apiFetch('/config/stores').then(response => response.json()),
        apiFetch(`/store-closings?month=${selectedMonth}`).then(response => response.json()),
      ]);
      const rows: StoreCashBalance[] = stores.map((store: any) => {
        const approved = closings.filter((row: any) => row.storeId === store.id && row.status === 'aprovado');
        const movements = approved.map((row: any) => {
          const expenses = row.expenses.map((expense: any) => ({ id: expense.id, descricao: expense.description,
            valor: expense.amountCents / 100, tipo: (expense.movementType ?? 'despesa') as 'despesa' | 'deposito' | 'vale_funcionario', categoria: 'outros' as const }));
          const totalDespesas = expenses.filter((expense: { tipo: string }) => expense.tipo === 'despesa').reduce((sum: number, expense: { valor: number }) => sum + expense.valor, 0);
          const sangriaDia = expenses.filter((expense: { tipo: string }) => expense.tipo === 'deposito' || expense.tipo === 'vale_funcionario').reduce((sum: number, expense: { valor: number }) => sum + expense.valor, 0);
          return { data: row.closingDate, dataFormatada: row.closingDate.split('-').reverse().join('/'),
            diaSemana: '', entradaDinheiro: row.cashCents / 100, despesas: expenses, totalDespesas, sangriaDia,
            saldoLiquidoDia: row.cashCents / 100 - totalDespesas - sangriaDia, responsavel: row.submittedByName || '', memorando: row.memo };
        });
        const totalEntradasDinheiro = movements.reduce((sum: number, item: { entradaDinheiro: number }) => sum + item.entradaDinheiro, 0);
        const totalDespesas = movements.reduce((sum: number, item: { totalDespesas: number }) => sum + item.totalDespesas, 0);
        const totalSangrias = movements.reduce((sum: number, item: { sangriaDia: number }) => sum + item.sangriaDia, 0);
        return { lojaId: store.id, lojaCodigo: store.shortName || '', lojaNome: store.name,
          cidade: '', responsavel: '', fundoDeCaixa: 0, totalEntradasDinheiro, totalDespesas,
          totalSangrias, saldoAtualEmCaixa: totalEntradasDinheiro - totalDespesas - totalSangrias,
          ultimaAtualizacao: approved[0]?.updatedAt || '', movimentacoes: movements };
      });
      publish(entry, { rows, loading: false, error: '' });
    } catch {
      publish(entry, { ...entry.snapshot, loading: false, error: 'Não foi possível carregar o caixa das unidades.' });
    } finally { entry.request = undefined; }
  })();
  return entry.request;
}

// Keep the Caixa balances available for each user and month.
export function useStoreCashBalances(month: string, userId?: string) {
  const entry = useMemo(() => getEntry(`${userId ?? 'default'}:${month}`), [month, userId]);
  const subscribe = useCallback((listener: () => void) => { entry.listeners.add(listener); return () => { entry.listeners.delete(listener); }; }, [entry]);
  const snapshot = useSyncExternalStore(subscribe, () => entry.snapshot, () => entry.snapshot);
  const reload = useCallback(() => refresh(entry, month), [entry, month]);
  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), 15000);
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [reload]);
  return { ...snapshot, reload };
}
