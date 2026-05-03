import { motion } from 'framer-motion';
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
}: {
  grid: TGrid;
  cfg: SlotConfig;
  winning: Set<string>;
  newKeys: Set<string>;
  renderCell: CellRenderer;
}) {
  return (
    <div
      className={`relative rounded-2xl p-2 sm:p-3 border border-white/5 ${cfg.theme.gridClass}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))`,
        gap: '6px',
        aspectRatio: `${cfg.cols} / ${cfg.rows}`,
      }}
    >
      {Array.from({ length: cfg.cols * cfg.rows }).map((_, idx) => {
        const c = idx % cfg.cols;
        const r = Math.floor(idx / cfg.cols);
        const cell = grid[c]?.[r];
        if (!cell) return <div key={idx} className="cell" />;
        const isWin = winning.has(`${c}:${r}`);
        const isNew = newKeys.has(cell.key);
        return (
          <motion.div
            key={cell.key}
            className={`cell ${isWin ? 'win' : ''}`}
            initial={isNew ? { y: -40, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
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
    </div>
  );
}
