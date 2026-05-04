import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Grid as TGrid, SlotConfig } from './types';

export type CellRenderer = (args: {
  symbolId: string;
  multiplier?: number;
  winning: boolean;
  cellKey: string;
}) => ReactNode;

export function Grid({
  grid,
  cfg,
  winning,
  newKeys,
  renderCell,
  bare = false,
}: {
  grid: TGrid;
  cfg: SlotConfig;
  winning: Set<string>;
  newKeys: Set<string>;
  renderCell: CellRenderer;
  /** When true, omit the grid background/border (caller provides chrome). */
  bare?: boolean;
}) {
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
        gap: '6px',
        aspectRatio: `${cfg.cols} / ${cfg.rows}`,
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {Array.from({ length: cfg.cols * cfg.rows }).map((_, idx) => {
          const c = idx % cfg.cols;
          const r = Math.floor(idx / cfg.cols);
          const cell = grid[c]?.[r];
          const cellClass = `cell ${cfg.theme.cellClass ?? ''}`;
          if (!cell) return <div key={`empty-${idx}`} className={cellClass} />;
          const isWin = winning.has(`${c}:${r}`);
          const isNew = newKeys.has(cell.key);
          // Per-column stagger: leftmost column drops first, then the next,
          // etc. — matches real Pragmatic's left-to-right reel reveal. Adds
          // a few hundred ms of cinematic pacing without hurting overall flow.
          const columnDelay = isNew ? c * 0.05 : 0;
          return (
            <motion.div
              key={cell.key}
              className={`${cellClass} ${isWin ? 'win' : ''}`}
              // Real-game-style drop: symbols fall from above with a small
              // landing squish (scale [0.85,1.05,1]) so they feel weighted.
              initial={isNew ? { y: -90, opacity: 0, scale: 0.85 } : false}
              animate={{ y: 0, opacity: 1, scale: isNew ? [0.85, 1.05, 0.97, 1] : 1 }}
              // Win → tumble: cell puffs out with a brightness flash then fades.
              exit={{
                scale: 1.35,
                opacity: 0,
                filter: 'brightness(1.8) saturate(1.4)',
                transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
              }}
              transition={
                isNew
                  ? { type: 'spring', stiffness: 320, damping: 17, mass: 0.9, delay: columnDelay }
                  : { type: 'spring', stiffness: 380, damping: 26 }
              }
              layout
            >
              {renderCell({
                symbolId: cell.symbolId,
                multiplier: cell.multiplier,
                winning: isWin,
                cellKey: cell.key,
              })}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
