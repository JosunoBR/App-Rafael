import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { AnnualStoreMatrixRow } from '../types/unitsManagement.types';
import { formatCurrency } from '../../../utils/masks';

interface DirectorSalesMatrixProps {
  matrixRows: AnnualStoreMatrixRow[];
  selectedYear?: string;
}

export const DirectorSalesMatrix: React.FC<DirectorSalesMatrixProps> = ({
  matrixRows,
  selectedYear: _selectedYear = '2026'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clusterFilter, setClusterFilter] = useState<'all' | 'A' | 'B' | 'C'>('all');

  const filteredRows = matrixRows.filter(r => {
    if (clusterFilter !== 'all' && r.cluster !== clusterFilter) return false;
    if (searchTerm.trim() !== '') {
      return r.lojaNome.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  // Totais consolidados da tabela
  const total2021 = filteredRows.reduce((a, b) => a + b.vendas2021, 0);
  const total2022 = filteredRows.reduce((a, b) => a + b.vendas2022, 0);
  const total2023 = filteredRows.reduce((a, b) => a + b.vendas2023, 0);
  const total2024 = filteredRows.reduce((a, b) => a + b.vendas2024, 0);
  const total2025 = filteredRows.reduce((a, b) => a + b.vendas2025, 0);
  const total2026 = filteredRows.reduce((a, b) => a + b.vendas2026, 0);
  const totalMeta = filteredRows.reduce((a, b) => a + b.meta2026, 0);
  const totalSuper = filteredRows.reduce((a, b) => a + b.superMeta2026, 0);
  const totalPontoEq = filteredRows.reduce((a, b) => a + b.pontoEquilibrio, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. TOPO DA MATRIZ */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Matriz Comparativa Anual (VENDAS ANUAL ALS)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Histórico consolidado 2021 a 2026, Ponto de Equilíbrio e Metas da Diretoria
          </p>
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar loja..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'A', 'B'] as const).map((cl) => (
              <button
                key={cl}
                type="button"
                onClick={() => setClusterFilter(cl)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  clusterFilter === cl
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cl === 'all' ? 'Todas' : `Cluster ${cl}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. TABELA COMPARATIVA ESTILO PLANILHA */}
      <div className="rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Loja / Unidade</th>
                <th className="py-3 px-3 text-right">2021</th>
                <th className="py-3 px-3 text-right">2022</th>
                <th className="py-3 px-3 text-right">2023</th>
                <th className="py-3 px-3 text-right">2024</th>
                <th className="py-3 px-3 text-right">2025</th>
                <th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">2026 (Atual)</th>
                <th className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">Meta 2026</th>
                <th className="py-3 px-3 text-right text-purple-600 dark:text-purple-400">Supermeta</th>
                <th className="py-3 px-3 text-right text-sky-600 dark:text-sky-400">Ponto Eq. (31%)</th>
                <th className="py-3 px-3 text-center">Cresc. Anual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {filteredRows.map((row) => (
                <tr
                  key={row.lojaId}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                >
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{row.lojaNome}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                    {formatCurrency(row.vendas2021, true)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                    {formatCurrency(row.vendas2022, true)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                    {formatCurrency(row.vendas2023, true)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                    {formatCurrency(row.vendas2024, true)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                    {formatCurrency(row.vendas2025, true)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50/30 dark:bg-emerald-950/20">
                    {formatCurrency(row.vendas2026, true)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-amber-700 dark:text-amber-300 font-mono">
                    {formatCurrency(row.meta2026, true)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-purple-700 dark:text-purple-300 font-mono">
                    {formatCurrency(row.superMeta2026, true)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sky-700 dark:text-sky-300 font-mono">
                    {formatCurrency(row.pontoEquilibrio, true)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                      +{row.crescimentoAnualPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* RODAPÉ FIXO DE TOTAIS */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 font-black text-xs text-slate-900 dark:text-white">
                <td className="py-3.5 px-4 uppercase tracking-wider">
                  TOTAL REDE ({filteredRows.length} Lojas)
                </td>
                <td className="py-3.5 px-3 text-right font-mono">{formatCurrency(total2021, true)}</td>
                <td className="py-3.5 px-3 text-right font-mono">{formatCurrency(total2022, true)}</td>
                <td className="py-3.5 px-3 text-right font-mono">{formatCurrency(total2023, true)}</td>
                <td className="py-3.5 px-3 text-right font-mono">{formatCurrency(total2024, true)}</td>
                <td className="py-3.5 px-3 text-right font-mono">{formatCurrency(total2025, true)}</td>
                <td className="py-3.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                  {formatCurrency(total2026, true)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalMeta, true)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
                  {formatCurrency(totalSuper, true)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-sky-600 dark:text-sky-400">
                  {formatCurrency(totalPontoEq, true)}
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                    +10.2%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
