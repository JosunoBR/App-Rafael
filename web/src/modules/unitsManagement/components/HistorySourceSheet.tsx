import React, { useEffect, useState } from 'react';
import { fetchHistorySourceSheet } from '../../goalsExecutive/utils/goalsApi';

export function HistorySourceSheet({ names }: { names: string[] }) {
  const [name, setName] = useState('VENDAS ANUAL');
  const [rows, setRows] = useState<(string | number | null)[][]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetchHistorySourceSheet(name).then(data => { if (active) { setRows(data); setError(''); setLoading(false); } }).catch(error => { if (active) { setError(error.message); setLoading(false); } });
    return () => { active = false; };
  }, [name]);
  const columns = Math.max(0, ...rows.map(row => row.length));
  const columnLabel = (column: number): string => column < 26 ? String.fromCharCode(65 + column) : `${columnLabel(Math.floor(column / 26) - 1)}${columnLabel(column % 26)}`;
  return <div className="space-y-3"><label className="text-xs font-bold">Aba original registrada no banco <select aria-label="Aba original do histórico" value={name} onChange={event => { setName(event.target.value); setLoading(true); }} className="ml-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">{names.map(name => <option key={name}>{name}</option>)}</select></label>
    {error && <p role="alert" className="text-amber-700 dark:text-amber-300">{error}</p>}
    {loading ? <p role="status">Carregando registros originais...</p> : <div className="overflow-auto max-h-[560px] border border-slate-200 dark:border-slate-800 rounded-xl"><table className="text-xs w-full"><caption className="sr-only">Todos os registros da aba {name} da planilha importada</caption><thead className="sticky top-0 bg-slate-100 dark:bg-slate-900"><tr><th className="p-2">Linha</th>{Array.from({ length: columns }, (_, index) => <th key={index} className="p-2">{columnLabel(index)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800"><th scope="row" className="p-2 text-slate-500">{index + 1}</th>{Array.from({ length: columns }, (_, column) => <td key={column} className="p-2 whitespace-nowrap">{typeof row[column] === 'number' ? row[column].toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : row[column] ?? '—'}</td>)}</tr>)}</tbody></table></div>}
  </div>;
}
