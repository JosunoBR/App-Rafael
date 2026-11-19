import React from 'react';

export type StatusVariant = 
  | 'Em Cotação' 
  | 'Rascunho' 
  | 'Aprovado' 
  | 'Em Distribuição' 
  | 'Em Separação' 
  | 'Faturamento' 
  | 'Finalizado' 
  | 'Cancelado'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

export interface BadgeProps {
  status?: StatusVariant | string;
  children?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status = 'neutral',
  children,
  size = 'md',
  className = ''
}) => {
  const getColors = (s: string) => {
    switch (s) {
      case 'Em Cotação':
      case 'Rascunho':
      case 'warning':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
      case 'Aprovado':
      case 'success':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      case 'Em Distribuição':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60';
      case 'Em Separação':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
      case 'Faturamento':
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
      case 'Finalizado':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'Cancelado':
      case 'danger':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800/60';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full border tracking-wide uppercase ${sizeClass} ${getColors(status)} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{children || status}</span>
    </span>
  );
};
