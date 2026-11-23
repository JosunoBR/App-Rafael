import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  Zap,
  PieChart,
  Flame
} from 'lucide-react';
import {
  StorePerformanceMetric,
  BiDailyProgression,
  PaymentMixItem
} from '../types/unitsManagement.types';
import { formatCurrency } from '../../../utils/masks';

interface DirectorBiChartsProps {
  metrics: StorePerformanceMetric[];
  dailyProgression: BiDailyProgression[];
  paymentMix: PaymentMixItem[];
  selectedMonth?: string;
}

export const DirectorBiCharts: React.FC<DirectorBiChartsProps> = ({
  metrics,
  dailyProgression,
  paymentMix,
  selectedMonth: _selectedMonth
}) => {
  // Métricas Consolidadas da Rede
  const totalMetaRede = metrics.reduce((acc, m) => acc + m.metaNormal, 0);
  const totalSuperMetaRede = metrics.reduce((acc, m) => acc + m.superMeta, 0);
  const totalAcumuladoRede = metrics.reduce((acc, m) => acc + m.acumuladoVendido, 0);
  const percentualAtingidoRede = totalMetaRede > 0 ? (totalAcumuladoRede / totalMetaRede) * 100 : 0;
  const percentualSuperMetaRede = totalSuperMetaRede > 0 ? (totalAcumuladoRede / totalSuperMetaRede) * 100 : 0;
  const totalFaltaMeta = Math.max(0, totalMetaRede - totalAcumuladoRede);
  const diasRestantesRede = metrics[0]?.diasUteisRestantes || 8;
  const ritmoDiarioRede = diasRestantesRede > 0 ? totalFaltaMeta / diasRestantesRede : 0;

  // Lojas ordenadas por percentual atingido da meta (Geral)
  const filteredMetrics = [...metrics].sort((a, b) => b.percentualMeta - a.percentualMeta);

  // Helper para exibir estritamente apenas o nome da unidade
  const cleanStoreName = (name: string) => {
    return name
      .replace(/^Mega\s*12\s*[-–]\s*/i, '')
      .replace(/\s*\(\s*Filial\s*\d+\s*\)/gi, '')
      .replace(/\s*Filial\s*\d+/gi, '')
      .trim();
  };

  // SVG Chart: Cálculo de dimensões para o gráfico de evolução
  const chartHeight = 220;
  const chartWidth = 720;
  const paddingX = 45;
  const paddingY = 25;

  const maxVal = totalSuperMetaRede * 1.05 || 2200000;
  const minVal = 0;

  const getX = (dia: number) => {
    return paddingX + ((dia - 1) / 29) * (chartWidth - paddingX * 2);
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(val, maxVal));
    return chartHeight - paddingY - ((clamped - minVal) / (maxVal - minVal)) * (chartHeight - paddingY * 2);
  };

  // Caminho da Linha de Venda Real (até dia 23)
  const realPoints = dailyProgression
    .filter(p => p.vendaRealAcumulada !== null)
    .map(p => `${getX(p.dia)},${getY(p.vendaRealAcumulada!)}`)
    .join(' L ');

  const realPath = realPoints ? `M ${realPoints}` : '';

  // Caminho da Linha de Meta
  const metaPoints = dailyProgression
    .map(p => `${getX(p.dia)},${getY(p.linhaMeta)}`)
    .join(' L ');
  const metaPath = `M ${metaPoints}`;

  // Caminho da Linha de Supermeta
  const superMetaPoints = dailyProgression
    .map(p => `${getX(p.dia)},${getY(p.linhaSuperMeta)}`)
    .join(' L ');
  const superMetaPath = `M ${superMetaPoints}`;

  // Área sombreada sob a linha real
  const lastRealPoint = dailyProgression.filter(p => p.vendaRealAcumulada !== null).slice(-1)[0];
  const areaReal = lastRealPoint
    ? `${realPath} L ${getX(lastRealPoint.dia)},${chartHeight - paddingY} L ${getX(1)},${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TERMÔMETRO CONSOLIDADO DA REDE (MEGA 12) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B132B] to-[#070D1F] text-white border border-slate-800 shadow-2xl shadow-slate-950/40 relative overflow-hidden">
        
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Painel BI Executivo • Rede Mega 12
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Novembro / 2026 (20 Unidades)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {formatCurrency(totalAcumuladoRede, true)}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Faturamento Consolidado Aprovado no Mês
            </p>
          </div>

          {/* Cards Rápidos de Alvos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Meta Geral da Rede
              </span>
              <span className="text-base sm:text-lg font-black text-white block mt-0.5">
                {formatCurrency(totalMetaRede, true)}
              </span>
              <span className="text-[11px] font-black text-emerald-400">
                {percentualAtingidoRede.toFixed(1)}% atingido
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Supermeta (+10%)
              </span>
              <span className="text-base sm:text-lg font-black text-amber-300 block mt-0.5">
                {formatCurrency(totalSuperMetaRede, true)}
              </span>
              <span className="text-[11px] font-black text-amber-400">
                {percentualSuperMetaRede.toFixed(1)}% atingido
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                Ritmo Diário Necessário
              </span>
              <span className="text-base sm:text-lg font-black text-sky-300 block mt-0.5">
                {formatCurrency(ritmoDiarioRede, true)}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                para {diasRestantesRede} dias úteis restantes
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Segmentada Dupla */}
        <div className="relative z-10 pt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">
              Progresso Geral da Rede: <strong>{percentualAtingidoRede.toFixed(1)}% da Meta</strong>
            </span>
            <span className="text-slate-400">
              Falta: <strong className="text-white">{formatCurrency(totalFaltaMeta, true)}</strong>
            </span>
          </div>

          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/80 relative">
            {/* Marcador da Meta 100% */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white z-20 left-[90.9%]" title="Meta 100%" />
            {/* Barra de Preenchimento */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-700 shadow-sm shadow-emerald-500/50"
              style={{ width: `${Math.min(100, (totalAcumuladoRede / totalSuperMetaRede) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. GRÁFICO DE EVOLUÇÃO DIÁRIA (S-CURVE) VS METAS */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span>Curva de Evolução Diária da Rede (Novembro/2026)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trajetória dia a dia das vendas consolidadas vs projeção da Meta e Supermeta
            </p>
          </div>

          {/* Legenda do Gráfico */}
          <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-700 dark:text-slate-300">Venda Real Acumulada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 border-dashed border-t-2 border-amber-500" />
              <span className="text-slate-700 dark:text-slate-300">Linha da Meta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-purple-500 border-dashed border-t-2 border-purple-500" />
              <span className="text-slate-700 dark:text-slate-300">Supermeta (+10%)</span>
            </div>
          </div>
        </div>

        {/* Gráfico SVG Responsivo */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 select-none font-sans">
            <defs>
              <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de Grade Horizontais */}
            {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
              const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
              const labelVal = maxVal * ratio;
              return (
                <g key={idx}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800/80"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[9px] font-semibold"
                  >
                    {(labelVal / 1000).toFixed(0)}k
                  </text>
                </g>
              );
            })}

            {/* Área sob a curva real */}
            {areaReal && (
              <path d={areaReal} fill="url(#realGradient)" />
            )}

            {/* Linha da Supermeta (Tracejada Roxa) */}
            <path
              d={superMetaPath}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="5 4"
            />

            {/* Linha da Meta (Tracejada Laranja) */}
            <path
              d={metaPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5 4"
            />

            {/* Linha Real (Esmeralda Sólida) */}
            <path
              d={realPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Pontos nos dias chave da curva real */}
            {dailyProgression.filter(p => p.vendaRealAcumulada !== null && (p.dia % 5 === 0 || p.dia === 23)).map(p => (
              <circle
                key={p.dia}
                cx={getX(p.dia)}
                cy={getY(p.vendaRealAcumulada!)}
                r="4"
                className="fill-emerald-500 stroke-white dark:stroke-slate-900 stroke-2"
              />
            ))}

            {/* Eixo X: Dias do Mês */}
            {[1, 5, 10, 15, 20, 23, 25, 30].map(dia => (
              <text
                key={dia}
                x={getX(dia)}
                y={chartHeight - 6}
                textAnchor="middle"
                className={`text-[9px] font-bold ${
                  dia === 23 ? 'fill-emerald-600 dark:fill-emerald-400 font-black' : 'fill-slate-400'
                }`}
              >
                {dia === 23 ? 'Hoje (23)' : `D${dia}`}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* 3. RANKING DAS LOJAS + MIX DE PAGAMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1 & 2: RANKING COMPARATIVO DAS LOJAS */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                <span>Ranking de Desempenho por Loja (% Atingido da Meta)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparativo individual de faturamento e ritmo de cada filial
              </p>
            </div>

            {/* Totalizador */}
            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
              Todas as 20 Lojas
            </span>
          </div>

          {/* Lista em Barras Horizontais do Ranking */}
          <div className="space-y-3">
            {filteredMetrics.map((store, index) => {
              const isSuper = store.statusRitmo === 'supermeta';
              const isBelow = store.statusRitmo === 'abaixo';

              let barColor = 'from-emerald-500 to-teal-400';
              let badgeColor = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300';
              if (isSuper) {
                barColor = 'from-amber-500 to-orange-400';
                badgeColor = 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300';
              } else if (isBelow) {
                barColor = 'from-rose-500 to-rose-400';
                badgeColor = 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300';
              }

              return (
                <div key={store.lojaId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[11px] font-black text-slate-400">
                        #{index + 1}
                      </span>
                      <span className="text-slate-900 dark:text-white font-extrabold">
                        {cleanStoreName(store.lojaNome)}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase ${badgeColor}`}>
                        {store.percentualMeta.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-900 dark:text-white font-black">
                        {formatCurrency(store.acumuladoVendido, true)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                        (Meta: {formatCurrency(store.metaNormal, true)})
                      </span>
                    </div>
                  </div>

                  {/* Barra da Loja */}
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.min(100, store.percentualMeta)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 3: BI DE MEIOS DE PAGAMENTO (MIX DA REDE) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-500" />
                <span>Mix de Meios de Pagamento</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribuição percentual da arrecadação da rede
              </p>
            </div>

            {/* Barra Segmentada Multicolorida */}
            <div className="mt-4 h-4 w-full rounded-full overflow-hidden flex shadow-inner">
              {paymentMix.map((p) => (
                <div
                  key={p.id}
                  style={{ width: `${p.percentual}%` }}
                  className={`${p.color} h-full transition-all`}
                  title={`${p.label}: ${p.percentual}%`}
                />
              ))}
            </div>

            {/* Detalhamento dos Meios */}
            <div className="mt-5 space-y-3">
              {paymentMix.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${p.color} shrink-0`} />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {p.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatCurrency(p.valor, true)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 w-10 text-right">
                      {p.percentual}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Destaque Estratégico para Negociação */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white mb-1">
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>Predominância de Pix & Dinheiro</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Mais de <strong>74% da receita da rede</strong> é liquidada instantaneamente (Pix + Espécie), garantindo alta liquidez e redução no custo de antecipação de recebíveis.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
