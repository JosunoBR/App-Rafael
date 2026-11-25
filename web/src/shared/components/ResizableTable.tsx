import React, { useLayoutEffect, useRef } from 'react';

const MIN_WIDTH = 56;
const MAX_WIDTH = 2000;
const clamp = (width: number) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)));
type CellPosition = { cell: HTMLTableCellElement; start: number; span: number };

// Resolve real column positions, including grouped headers and row spans.
function cellPositions(table: HTMLTableElement) {
  const positions: CellPosition[] = [];
  let occupied: number[] = [];
  for (const section of [table.tHead, ...Array.from(table.tBodies), table.tFoot]) {
    if (!section) continue;
    occupied = [];
    for (const row of Array.from(section.rows)) {
      let column = 0;
      for (const cell of Array.from(row.cells)) {
        while ((occupied[column] ?? 0) > 0) column++;
        positions.push({ cell, start: column, span: cell.colSpan });
        for (let offset = 0; offset < cell.colSpan; offset++) occupied[column + offset] = Math.max(occupied[column + offset] ?? 0, cell.rowSpan);
        column += cell.colSpan;
      }
      occupied = occupied.map(value => Math.max(0, value - 1));
    }
  }
  return positions;
}

export function ResizableTable({ resizeId, children, className = '', ...props }: React.TableHTMLAttributes<HTMLTableElement> & { resizeId: string }) {
  const tableRef = useRef<HTMLTableElement>(null);
  const columnsRef = useRef<HTMLTableColElement>(null);
  const widthsRef = useRef<Record<string, number>>(Object.create(null));
  const scopeRef = useRef('');
  useLayoutEffect(() => {
    const table = tableRef.current, group = columnsRef.current;
    if (!table || !group || !table.tHead) return;
    let userId = 'default';
    try { userId = JSON.parse(localStorage.getItem('mega12_user') ?? 'null')?.id ?? 'default'; } catch { /* Local preferences remain optional. */ }
    const storageKey = `table-widths:v1:${userId}:${resizeId}`;
    if (scopeRef.current !== storageKey) {
      widthsRef.current = Object.create(null);
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) for (const [key, value] of Object.entries(saved)) {
          if (typeof value === 'number' && Number.isFinite(value)) widthsRef.current[key] = clamp(value);
        }
      } catch { /* Storage restrictions must not prevent resizing. */ }
      scopeRef.current = storageKey;
    }
    const originalStyle = { width: table.style.width, minWidth: table.style.minWidth, maxWidth: table.style.maxWidth, tableLayout: table.style.tableLayout };
    const positions = cellPositions(table);
    const headers = positions.filter(item => item.cell.parentElement?.parentElement === table.tHead && item.span === 1);
    if (!headers.length) return;
    const count = Math.max(...positions.filter(item => item.cell.parentElement?.parentElement === table.tHead).map(item => item.start + item.span));
    const naturalWidths = Array.from({ length: count }, (_, index) => {
      const position = headers.find(item => item.start === index) ?? positions.find(item => item.start === index && item.span === 1);
      return clamp(position?.cell.getBoundingClientRect().width || 120);
    });
    const duplicateKeys = new Map<string, number>();
    const keys = naturalWidths.map((_, index) => {
      const header = headers.find(item => item.start === index)?.cell;
      const key = header?.dataset.resizeKey || header?.dataset.column || header?.textContent?.replace(/\s+/g, ' ').trim() || `column-${index}`;
      const duplicate = duplicateKeys.get(key) ?? 0;
      duplicateKeys.set(key, duplicate + 1);
      return duplicate ? `${key}:${duplicate}` : key;
    });
    let widths = naturalWidths.map((value, index) => widthsRef.current[keys[index]] ?? value);
    const columns = widths.map(() => document.createElement('col'));
    const sticky = positions.filter(item => {
      const style = getComputedStyle(item.cell);
      return style.position === 'sticky' && style.left !== 'auto';
    }).map(item => ({ ...item, left: item.cell.style.left }));
    const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(widthsRef.current)); } catch { /* Keep widths for this session. */ } };
    const handles: HTMLDivElement[] = [];
    const apply = () => {
      if (columns[0]?.parentElement !== group) group.replaceChildren(...columns);
      columns.forEach((column, index) => { column.style.width = `${widths[index]}px`; });
      const total = widths.reduce((sum, value) => sum + value, 0);
      Object.assign(table.style, { width: `${total}px`, minWidth: `${total}px`, maxWidth: 'none', tableLayout: 'fixed' });
      table.dataset.columnWidths = 'custom';
      sticky.forEach(item => { item.cell.style.left = `${widths.slice(0, item.start).reduce((sum, value) => sum + value, 0)}px`; });
      handles.forEach(handle => { handle.setAttribute('aria-valuenow', String(widths[Number(handle.dataset.columnIndex)])); });
    };
    const restore = () => {
      Object.assign(table.style, originalStyle);
      delete table.dataset.columnWidths;
      group.replaceChildren();
      sticky.forEach(item => { item.cell.style.left = item.left; });
    };
    const reset = (index: number) => {
      delete widthsRef.current[keys[index]];
      widths[index] = naturalWidths[index];
      if (keys.some(key => widthsRef.current[key] !== undefined)) apply(); else restore();
      save();
    };
    let cancelDrag: (() => void) | undefined;
    const cleanupHeaders: (() => void)[] = [];
    for (const { cell, start } of headers) {
      const originalPosition = cell.style.position;
      const hasAccessibleName = cell.hasAttribute('aria-label') || cell.hasAttribute('aria-labelledby');
      if (!hasAccessibleName) {
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        const labels: string[] = [];
        while (walker.nextNode()) { const value = walker.currentNode.textContent?.trim(); if (value) labels.push(value); }
        cell.setAttribute('aria-label', labels.join(' ').replace(/\s+/g, ' '));
      }
      if (getComputedStyle(cell).position === 'static') cell.style.position = 'relative';
      const handle = document.createElement('div');
      handle.className = 'table-column-resizer';
      handle.dataset.columnIndex = String(start);
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.setAttribute('aria-label', `Ajustar largura: ${cell.textContent?.trim() || `coluna ${start + 1}`}`);
      handle.setAttribute('aria-valuemin', String(MIN_WIDTH));
      handle.setAttribute('aria-valuemax', String(MAX_WIDTH));
      handle.setAttribute('aria-valuenow', String(widths[start]));
      handle.title = 'Arraste para ajustar a largura. Duplo clique para restaurar. Use as setas para ajustar pelo teclado.';
      handle.tabIndex = 0;
      handle.draggable = false;
      handle.onclick = event => { event.preventDefault(); event.stopPropagation(); };
      handle.ondragstart = event => { event.preventDefault(); event.stopPropagation(); };
      handle.ondblclick = event => { event.preventDefault(); event.stopPropagation(); reset(start); };
      handle.onkeydown = event => {
        if (!['ArrowLeft','ArrowRight','Home'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault(); event.stopPropagation();
        if (event.key === 'Home') { reset(start); return; }
        widths[start] = clamp(widths[start] + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 30 : 10));
        widthsRef.current[keys[start]] = widths[start]; apply(); save();
      };
      handle.onpointerdown = event => {
        if (event.button !== 0) return;
        event.preventDefault(); event.stopPropagation();
        cancelDrag?.();
        const initialX = event.clientX, initialWidths = [...widths];
        const previousCursor = document.body.style.cursor, previousSelection = document.body.style.userSelect;
        document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
        handle.classList.add('is-resizing');
        let frame = 0;
        const move = (pointer: PointerEvent) => {
          if (pointer.pointerId !== event.pointerId) return;
          pointer.preventDefault();
          widths[start] = clamp(initialWidths[start] + pointer.clientX - initialX);
          if (!frame) frame = requestAnimationFrame(() => { frame = 0; apply(); });
        };
        const finish = (commit: boolean) => {
          if (frame) cancelAnimationFrame(frame);
          if (commit) { widthsRef.current[keys[start]] = widths[start]; apply(); save(); }
          else { widths = initialWidths; if (keys.some(key => widthsRef.current[key] !== undefined)) apply(); else restore(); }
          document.body.style.cursor = previousCursor; document.body.style.userSelect = previousSelection;
          handle.classList.remove('is-resizing');
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          document.removeEventListener('pointercancel', cancel);
          document.removeEventListener('keydown', escape, true);
          window.removeEventListener('blur', cancel);
          cancelDrag = undefined;
        };
        const up = (pointer: PointerEvent) => { if (pointer.pointerId === event.pointerId) finish(true); };
        const cancel = () => finish(false);
        const escape = (key: KeyboardEvent) => { if (key.key === 'Escape') { key.preventDefault(); key.stopPropagation(); cancel(); } };
        cancelDrag = cancel;
        document.addEventListener('pointermove', move, { passive: false });
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', cancel);
        document.addEventListener('keydown', escape, true);
        window.addEventListener('blur', cancel);
      };
      cell.append(handle); handles.push(handle);
      cleanupHeaders.push(() => { handle.remove(); cell.style.position = originalPosition; if (!hasAccessibleName) cell.removeAttribute('aria-label'); });
    }
    if (keys.some(key => widthsRef.current[key] !== undefined)) apply();
    return () => { cancelDrag?.(); cleanupHeaders.forEach(clean => clean()); restore(); };
  }, [children, resizeId]);
  const content = React.Children.toArray(children);
  const captions = content.filter(child => React.isValidElement(child) && child.type === 'caption');
  const body = content.filter(child => !React.isValidElement(child) || child.type !== 'caption');
  return <table {...props} ref={tableRef} className={`resizable-table ${className}`}>
    {captions}<colgroup ref={columnsRef} />{body}
  </table>;
}
