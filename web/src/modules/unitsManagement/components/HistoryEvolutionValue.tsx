import { annualEvolution } from '../../goalsExecutive/utils/goalsCalculations';
import { money } from '../../goalsExecutive/utils/goalsFormat';

const percent = (value: number | null) => value === null ? 'Sem comparativo' : `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
function evolutionExplanation(evolution: ReturnType<typeof annualEvolution>, metricLabel: string) {
  const comparisons = evolution.history.flatMap(current => {
    const previous = evolution.history.find(item => item.year === current.year - 1);
    if (current.value === null || previous?.value === null || previous?.value === undefined || previous.value === 0) return [];
    const variation = (current.value - previous.value) / Math.abs(previous.value) * 100;
    return [`${previous.year} → ${current.year}: ${metricLabel} de ${money(previous.value)} para ${money(current.value)} (${percent(variation)}).`];
  });
  return comparisons.length
    ? `Média das variações de ${metricLabel} no período selecionado.\n${comparisons.join('\n')}\n${comparisons.length === 1 ? 'Há apenas uma comparação válida; o percentual corresponde a essa variação.' : `A porcentagem exibida é a média dessas ${comparisons.length} variações.`} Anos sem dados válidos ficam fora do cálculo.`
    : `Não há dois anos consecutivos com ${metricLabel} válido para calcular a variação percentual.`;
}

export function HistoryEvolutionValue({ evolution, metricLabel }: { evolution: ReturnType<typeof annualEvolution>; metricLabel: string }) {
  return <>
    <span tabIndex={0} title={evolutionExplanation(evolution, metricLabel)} aria-label={`${percent(evolution.averagePercent)}. ${evolutionExplanation(evolution, metricLabel)}`} className={evolution.averagePercent !== null && evolution.averagePercent < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'font-bold'}>{percent(evolution.averagePercent)}</span>
    <span className="block text-[10px] text-slate-500 dark:text-slate-400">{money(evolution.averageChange)} / ano · {evolution.comparisons} comparações</span>
  </>;
}
