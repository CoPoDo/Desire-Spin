import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SlotConfig } from './types';
import type { CellRenderer } from './Grid';

/**
 * Vegas-style vertical reel spin for tumble slots. Covers the grid
 * during the initial spin phase and animates each column as a
 * strip-scrolling reel that decelerates to rest. No drop-in cascade
 * during this phase; after it completes the parent swaps back to the
 * regular Grid (with the final symbols already in place).
 *
 * Layout matches the Grid exactly so the post-reel hand-off has zero
 * cell-position jitter: outer CSS grid with the same aspect-ratio +
 * gap, each column is a viewport (overflow:hidden), and each strip
 * cell is sized to `(viewport_height - (rows-1)*gap) / rows` via a
 * ResizeObserver — same approach Big Juan uses to keep its reels
 * pinned to the grid frame.
 */

const GAP_PX = 6;

export function SpinReel({
  cfg,
  renderCell,
  finalGrid,
  durationMs,
  staggerMs,
  onComplete,
}: {
  cfg: SlotConfig;
  renderCell: CellRenderer;
  /** Final grid the reels lock onto at the top of each strip. */
  finalGrid: { symbolId: string; multiplier?: number; key: string }[][];
  /** Spin time (ms) for the leftmost column. Each subsequent column
   *  adds `staggerMs` so it stops a beat later (left → right reveal). */
  durationMs: number;
  staggerMs: number;
  onComplete: () => void;
}) {
  const bankRef = useRef<HTMLDivElement>(null);
  // Per-viewport cell height (measured). Each column has the same
  // height so a single number is enough.
  const [cellHeight, setCellHeight] = useState<number>(0);

  useEffect(() => {
    const el = bankRef.current;
    if (!el) return;
    const recompute = () => {
      const firstCol = el.querySelector('[data-spin-reel-col]') as HTMLElement | null;
      const viewportH = firstCol?.clientHeight ?? el.clientHeight;
      if (viewportH <= 0) return;
      const cellH = Math.max(20, (viewportH - (cfg.rows - 1) * GAP_PX) / cfg.rows);
      setCellHeight(cellH);
    };
    // One frame for the grid's aspect-ratio'd height to settle.
    requestAnimationFrame(recompute);
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cfg.rows]);

  return (
    <div
      ref={bankRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))`,
        gap: `${GAP_PX}px`,
        aspectRatio: `${cfg.cols} / ${cfg.rows}`,
        width: '100%',
      }}
    >
      {Array.from({ length: cfg.cols }).map((_, c) => (
        <SpinReelColumn
          key={c}
          colIndex={c}
          rows={cfg.rows}
          cellHeight={cellHeight}
          fillerPool={cfg.symbols
            .filter((s) => s.tier !== 'multiplier' && s.id !== cfg.scatterId)
            .map((s) => s.id)}
          finalColumn={finalGrid[c] ?? []}
          renderCell={renderCell}
          cellClass={cfg.theme.cellClass ?? ''}
          durationMs={durationMs + c * staggerMs}
          onComplete={c === cfg.cols - 1 ? onComplete : undefined}
        />
      ))}
    </div>
  );
}

function SpinReelColumn({
  colIndex,
  rows,
  cellHeight,
  fillerPool,
  finalColumn,
  renderCell,
  cellClass,
  durationMs,
  onComplete,
}: {
  colIndex: number;
  rows: number;
  cellHeight: number;
  fillerPool: string[];
  finalColumn: { symbolId: string; multiplier?: number; key: string }[];
  renderCell: CellRenderer;
  cellClass: string;
  durationMs: number;
  onComplete?: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  // Strip layout, top → bottom:
  //   FINAL_SYMBOLS  (rows entries — revealed at rest)
  //   FILLER         (rows * SPIN_LOOPS entries — pass through during spin)
  // The strip is initially translated up so only the bottom block of
  // filler is visible, then animates to translateY(0) which puts the
  // FINAL_SYMBOLS in the viewport.
  const SPIN_LOOPS = 5;
  const stripSymbols = useMemo(() => {
    const filler: string[] = [];
    for (let i = 0; i < rows * SPIN_LOOPS; i++) {
      filler.push(
        fillerPool[Math.floor(Math.random() * fillerPool.length)] ?? fillerPool[0] ?? '',
      );
    }
    const finalIds = finalColumn.map((c) => c.symbolId);
    return [...finalIds, ...filler];
    // Generated once per mount — re-generating filler every render
    // would jitter the visible symbols mid-spin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || cellHeight <= 0) return;

    const stride = cellHeight + GAP_PX;
    const stripCount = stripSymbols.length;
    // Total scroll distance: strip is positioned with its top at
    // `startY` so the bottom block (filler) is initially in the
    // viewport. At the end (translateY=0), the TOP block (final
    // symbols) is in the viewport.
    const startY = -(stripCount - rows) * stride;
    const endY = 0;

    strip.style.transition = 'none';
    strip.style.transform = `translate3d(0, ${startY}px, 0)`;
    void strip.offsetHeight;
    strip.style.transition = `transform ${durationMs}ms cubic-bezier(0.08, 0.6, 0.2, 1)`;
    strip.style.transform = `translate3d(0, ${endY}px, 0)`;

    let settled = false;
    const handleEnd = () => {
      if (settled) return;
      settled = true;
      onComplete?.();
    };
    // Fallback timer in case transitionend doesn't fire (tab-switch,
    // unmount-mid-spin, etc.).
    const t = window.setTimeout(handleEnd, durationMs + 120);
    strip.addEventListener('transitionend', handleEnd, { once: true });
    return () => {
      window.clearTimeout(t);
      strip.removeEventListener('transitionend', handleEnd);
    };
  }, [cellHeight, durationMs, rows, stripSymbols, onComplete]);

  return (
    <div
      data-spin-reel-col={colIndex}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        ref={stripRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: `${GAP_PX}px`,
          willChange: 'transform',
        }}
      >
        {stripSymbols.map((symbolId, i) => (
          <ReelStripCell
            key={`${colIndex}-${i}`}
            symbolId={symbolId}
            cellClass={cellClass}
            height={cellHeight}
            renderCell={renderCell}
          />
        ))}
      </div>
    </div>
  );
}

function ReelStripCell({
  symbolId,
  cellClass,
  height,
  renderCell,
}: {
  symbolId: string;
  cellClass: string;
  height: number;
  renderCell: CellRenderer;
}): ReactNode {
  return (
    <div
      className={`cell ${cellClass}`}
      style={{
        flexShrink: 0,
        width: '100%',
        height: height > 0 ? `${height}px` : undefined,
      }}
    >
      {renderCell({ symbolId, winning: false, cellKey: `spin-${symbolId}` })}
    </div>
  );
}
