import { useCallback, useEffect, useState } from 'react';
import type { GoalsWorkbook } from '../types/goalsSpreadsheet.types';
import { fetchGoalsWorkbook } from './goalsApi';

export function useStoreHistory(userId?: string) {
  const [snapshot, setSnapshot] = useState<{ owner?: string; workbook: GoalsWorkbook | null; error: string }>({ owner: userId, workbook: null, error: '' });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const reload = useCallback(() => setRefreshVersion(value => value + 1), []);
  const setWorkbook = useCallback((workbook: GoalsWorkbook) => setSnapshot({ owner: userId, workbook, error: '' }), [userId]);
  useEffect(() => {
    let active = true;
    fetchGoalsWorkbook().then(workbook => { if (active) setSnapshot({ owner: userId, workbook, error: '' }); }).catch(error => {
      if (active) setSnapshot(previous => ({ owner: userId, workbook: previous.owner === userId ? previous.workbook : null, error: error instanceof Error ? error.message : 'Não foi possível carregar o histórico.' }));
    });
    window.addEventListener('focus', reload);
    const refreshTimer = window.setInterval(reload, 15000);
    return () => { window.clearInterval(refreshTimer); active = false; window.removeEventListener('focus', reload); };
  }, [userId, refreshVersion, reload]);
  return { workbook: snapshot.owner === userId ? snapshot.workbook : null, error: snapshot.owner === userId ? snapshot.error : '', reload, setWorkbook };
}
