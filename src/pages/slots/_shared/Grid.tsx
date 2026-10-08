import { motion, useReducedMotion } from 'framer-motion';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Grid as TGrid, SlotConfig } from './types';
import { useGravityMotion, CASCADE_CLEAR_MS, type CascadePhase } from './cascadeMotion';

export type CellRenderer = (args: {
  symbolId: string;
  multiplier?: number;
  winning: boolean;
  cellKey: string;
}) => ReactNode;

/** Brief visual exit copies have an explicit lifetime. Keeping retired layout
 * nodes in AnimatePresence allowed completed, invisible cells to accumulate
 * and participate in later projection measurements. Survivors stay keyed in
 * the live grid; only removed cells get a short, non-layout fade. */
export function useCascadeExit<T extends { key: string }>(cells: T[], durationMs: number) {
  const previous = useRef(cells);
  const [leaving, setLeaving] = useState<T[]>([]);
  useLayoutEffect(() => {
    const live = new Set(cells.map((cell) => cell.key));
    const removed = durationMs > 0 ? previous.current.filter((cell) => !live.has(cell.key)) : [];
    previous.current = cells;
    setLeaving((active) => active.length || removed.length ? removed : active);
    if (!removed.length) return;
    const timer = window.setTimeout(() => setLeaving([]), durationMs);
    return () => window.clearTimeout(timer);
  }, [cells, durationMs]);
  return leaving;
}

export function Grid({
  grid,
  cfg,
  winning,
  newKeys,
  renderCell,
  bare = false,
  speed = 1,
  onCascadePhase,
}: {
  grid: TGrid;
  cfg: SlotConfig;
  winning: Set<string>;
  newKeys: Set<string>;
  renderCell: CellRenderer;
  /** When true, omit the grid background/border (caller provides chrome). */
  bare?: boolean;
  speed?: number;
  onCascadePhase?: (phase: CascadePhase) => void;
}) {
  const reducedMotion = useReducedMotion();
  const timing = reducedMotion ? 0 : speed;
  const cells = useMemo(() => grid.flatMap((column, col) => column.map((cell, row) => ({ ...cell, col, row }))), [grid]);
  const leaving = useCascadeExit(cells, CASCADE_CLEAR_MS * timing);
  const bindCell = useGravityMotion(cells, newKeys, timing, 6, onCascadePhase);
  return (
    <div
      className={
        bare
          ? 'relative'
          : `relative rounded-2xl p-2 sm:p-3 border border-white/5 ${cfg.theme.gridClass}`
      }
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${cfg.rows}, minmax(0, 1fr))`,
        gap: '6px',
        aspectRatio: `${cfg.cols} / ${cfg.rows}`,
      }}
    >
        {Array.from({ length: cfg.cols * cfg.rows }).map((_, idx) => {
          const c = idx % cfg.cols;
          const r = Math.floor(idx / cfg.cols);
          const cell = grid[c]?.[r];
          const cellClass = `cell ${cfg.theme.cellClass ?? ''}`;
          if (!cell) return <div key={`empty-${idx}`} className={cellClass} />;
          const isWin = winning.has(`${c}:${r}`);
          return (
            <div
              ref={bindCell(cell.key)}
              key={cell.key}
              data-slot-cell-key={cell.key}
              data-symbol={cell.symbolId}
              data-multiplier={cell.multiplier}
              aria-label={`${cfg.symbols.find((symbol) => symbol.id === cell.symbolId)?.label ?? cell.symbolId}${cell.multiplier ? ` ${cell.multiplier}×` : ''}${isWin ? ', winning symbol' : ''}`}
              className={`${cellClass} ${isWin ? 'win' : ''}`}
              style={{ gridColumn: c + 1, gridRow: r + 1, minWidth: 0, minHeight: 0, animation: 'none' }}
            >
              {renderCell({
                symbolId: cell.symbolId,
                multiplier: cell.multiplier,
                winning: isWin,
                cellKey: cell.key,
              })}
            </div>
          );
        })}
      {leaving.map((cell) => (
        <motion.div key={`exit-${cell.key}`} data-slot-exiting={cell.key} aria-hidden="true" className={`cell ${cfg.theme.cellClass ?? ''}`} initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: .86 }} transition={{ duration: CASCADE_CLEAR_MS / 1000 * timing, ease: 'easeOut' }} style={{ gridColumn: cell.col + 1, gridRow: cell.row + 1, minWidth: 0, minHeight: 0, pointerEvents: 'none', zIndex: 1 }}>
          {renderCell({ symbolId: cell.symbolId, multiplier: cell.multiplier, winning: false, cellKey: cell.key })}
        </motion.div>
      ))}
    </div>
  );
}
