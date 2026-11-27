import { ReactNode } from 'react';

/**
 * Cabeçalho padrão para páginas do módulo Franquias (Mega 12 identidade visual).
 *
 * Estrutura:
 * - Cartão arredondado (rounded-2xl) com borda sutil em emerald
 * - Fundo branco puro (bg-white)
 * - Ícone tile à esquerda
 * - Título e descrição
 * - Badge de status opcional
 *
 * Cores: slate (texto/backgrounds), emerald (accent/badges/links)
 * Nenhuma referência Sults: gradientes, cores escuras padrão removidas.
 */
export interface FranchisePageHeaderProps {
  /** Título principal da página */
  title: string;
  /** Subtítulo/descrição secundária */
  description: string;
  /** Ícone lucide-react à esquerda do título (ex: Store, ClipboardList, etc) */
  icon?: React.ComponentType<{ className?: string; ariaHidden?: boolean }>;
  /** Rótulo do badge de status (ex: "Em implantação", "12 unidades") */
  badge?: string;
  /** Ação primária opcional no cabeçalho */
  primaryAction?: { label: string; onClick: () => void };
  /** Classes adicionais de container */
  className?: string;
}

/** Classe CSS padrão do cabeçalho */
const DEFAULT_CLASS_NAME = 'rounded-2xl border border-emerald-200 bg-white p-5 sm:p-7';

export function FranchisePageHeader({
  title,
  description,
  icon: Icon,
  badge,
  primaryAction,
  className,
}: FranchisePageHeaderProps) {
  const classes = className ? `${DEFAULT_CLASS_NAME} ${className}` : DEFAULT_CLASS_NAME;

  return (
    <div className={classes}>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="flex flex-shrink-0">
          {Icon && (
            <Icon
              className="h-10 w-10 text-emerald-500 rounded-lg border border-emerald-100 bg-emerald-50"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Mega 12 · Gestão de Franquias</p>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span
              className="mt-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.8 text-xs font-semibold text-emerald-700"
            >
              {badge}
            </span>
          )}
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}