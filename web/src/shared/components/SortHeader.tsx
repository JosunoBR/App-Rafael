import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
interface Props extends React.ThHTMLAttributes<HTMLTableCellElement> {
  column: string;
  sort: { key: string; direction: 'asc' | 'desc'; requestSort: (key: string) => void };
}
export function SortHeader({ column, sort, children, className = '', ...props }: Props) {
  const active = sort.key === column;
  const Icon = active ? sort.direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown;
  return <th {...props} data-resize-key={column} scope="col" className={className} aria-sort={active ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => sort.requestSort(column)} className={`inline-flex items-center gap-1 cursor-pointer font-[inherit] uppercase focus-visible:outline-2 focus-visible:outline-emerald-500 rounded ${className.includes('text-right') ? 'justify-end' : ''}`} title={props.draggable ? 'Arraste o cabeçalho para mover a coluna. Clique para ordenar. Alt + setas move pelo teclado.' : 'Clique para alternar a ordenação'}><span>{children}</span><Icon size={12} className={active ? 'shrink-0' : 'shrink-0 opacity-40'} /></button></th>;
}
