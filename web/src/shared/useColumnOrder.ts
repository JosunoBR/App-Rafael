import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';

export function moveColumn(order: string[], source: string, target: string) {
  if (source === target || !order.includes(source) || !order.includes(target)) return order;
  const next = order.filter(column => column !== source);
  next.splice(order.indexOf(target), 0, source);
  return next;
}

export function useColumnOrder(defaultOrder: string[], storageKey: string) {
  const [order, setOrder] = useState(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (Array.isArray(saved)) {
        const valid = [...new Set(saved.filter((key): key is string => typeof key === 'string' && defaultOrder.includes(key)))];
        return [...valid, ...defaultOrder.filter(key => !valid.includes(key))];
      }
    } catch { /* The table remains usable when browser storage is unavailable. */ }
    return defaultOrder;
  });
  const source = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const save = (next: string[]) => {
    setOrder(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep this session's order. */ }
  };
  const finish = () => { source.current = null; setDragging(null); setOver(null); };
  return {
    order,
    headerProps: (column: string) => ({
      draggable: true,
      className: `cursor-grab active:cursor-grabbing ${dragging === column ? 'opacity-50' : ''} ${over === column && dragging !== column ? 'ring-2 ring-inset ring-emerald-500' : ''}`,
      onDragStart: (event: DragEvent<HTMLTableCellElement>) => {
        source.current = column;
        setDragging(column);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', column);
      },
      onDragOver: (event: DragEvent<HTMLTableCellElement>) => {
        if (!source.current) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setOver(column);
      },
      onDrop: (event: DragEvent<HTMLTableCellElement>) => {
        if (!source.current) return;
        event.preventDefault();
        save(moveColumn(order, source.current, column));
        finish();
      },
      onDragEnd: finish,
      onKeyDown: (event: KeyboardEvent<HTMLTableCellElement>) => {
        if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const target = order[order.indexOf(column) + (event.key === 'ArrowLeft' ? -1 : 1)];
        if (target) save(moveColumn(order, column, target));
      },
    }),
  };
}
