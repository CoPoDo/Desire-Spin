import { useLayoutEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Cell, Grid, SlotConfig } from './types';
import type { CellRenderer } from './Grid';

export type ReelConfig = Pick<SlotConfig, 'cols' | 'rows' | 'symbols' | 'scatterId'> & { theme: Pick<SlotConfig['theme'], 'cellClass'> };
export const REEL_GAP = 6;

/** Integrated, cosine-ramped velocity: rest → cruise → rest. Both velocity
 * and acceleration are continuous at the joins, with no overshoot/reverse. */
export function reelProgress(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const accelerate = .16;
  const decelerate = .34;
  const speed = 1 / (1 - (accelerate + decelerate) / 2);
  if (t < accelerate) return speed * (t / 2 - accelerate * Math.sin(Math.PI * t / accelerate) / (2 * Math.PI));
  if (t <= 1 - decelerate) return speed * (t - accelerate / 2);
  const tail = t - (1 - decelerate);
  return Math.min(1, speed * (1 - decelerate - accelerate / 2 + tail / 2 + decelerate * Math.sin(Math.PI * tail / decelerate) / (2 * Math.PI)));
}

/** The strip is exactly one viewport tall. Percentage + gap translation
 * follows the CSS grid's fractional track geometry, including live resizes;
 * integer clientHeight measurements cannot accurately describe these tracks. */
export function reelTransform(offsetRows: number, rows: number) {
  const viewports = offsetRows / rows;
  return `translate3d(0, calc(${viewports * 100}% + ${viewports * REEL_GAP}px), 0)`;
}

export function reelTravelRows(rows: number, durationMs: number) {
  return Math.max(rows + 2, Math.round(Math.max(0, durationMs) * .018));
}

export function prepareReelImages(root: HTMLElement, ready: () => void) {
  const images = [...root.querySelectorAll('img')];
  if (!images.length) { ready(); return () => {}; }
  let cancelled = false;
  const disposers: (() => void)[] = [];
  const pending = images.map((image) => new Promise<void>((resolve) => {
    const decode = () => {
      image.removeEventListener('load', decode);
      image.removeEventListener('error', decode);
      // A failed asset must not deadlock a financially settled result.
      if (image.naturalWidth > 0 && typeof image.decode === 'function') image.decode().catch(() => {}).then(resolve);
      else resolve();
    };
    // Off-screen strip artwork must load before it enters the viewport.
    image.loading = 'eager';
    if (image.complete) decode();
    else {
      image.addEventListener('load', decode, { once: true });
      image.addEventListener('error', decode, { once: true });
      disposers.push(() => { image.removeEventListener('load', decode); image.removeEventListener('error', decode); });
    }
  }));
  Promise.all(pending).then(() => { if (!cancelled) ready(); });
  return () => { cancelled = true; disposers.forEach((dispose) => dispose()); };
}

/** A single uninterrupted strip joins the current board, passing symbols,
 * and the exact outcome. No board replacement is visible at either end. */
export function SpinReel({ cfg, renderCell, initialGrid, finalGrid, durationMs, staggerMs, onComplete }: {
  cfg: ReelConfig;
  renderCell: CellRenderer;
  initialGrid?: Grid;
  finalGrid: Grid;
  durationMs: number;
  staggerMs: number;
  onComplete: () => void;
}) {
  const bankRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const reducedMotion = useReducedMotion();
  // Freeze a complete visual spin. Parent status updates and turbo toggles must
  // not change its strip, outcome, starting board, or velocity mid-flight.
  const columns = useMemo(() => {
    const pool = cfg.symbols.filter((symbol) => symbol.tier !== 'multiplier' && symbol.id !== cfg.scatterId).map((symbol) => symbol.id);
    return Array.from({ length: cfg.cols }, (_, col) => {
      const duration = Math.max(0, durationMs + col * staggerMs);
      const travel = reelTravelRows(cfg.rows, duration);
      const filler = Array.from({ length: travel - cfg.rows }, (_, index): Cell => ({ symbolId: pool[Math.floor(Math.random() * pool.length)] ?? '', key: `filler-${col}-${index}` }));
      const initial = Array.from({ length: cfg.rows }, (_, row): Cell => initialGrid?.[col]?.[row] ?? { symbolId: pool[(col + row) % pool.length] ?? '', key: `start-${col}-${row}` });
      return { duration, travel, cells: [...(finalGrid[col] ?? []), ...filler, ...initial] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const bank = bankRef.current;
    if (!bank) return;
    const strips = [...bank.querySelectorAll<HTMLElement>('[data-reel-strip]')];
    let active = true;
    let completed = finishedRef.current;
    let started = false;
    let frame = 0;
    let startTime: number | undefined;
    let safetyTimer = 0;
    const finish = () => {
      if (!active || completed) return;
      completed = true;
      finishedRef.current = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(safetyTimer);
      strips.forEach((strip) => { strip.style.transform = reelTransform(0, cfg.rows); strip.style.willChange = 'auto'; strip.dataset.reelSettled = 'true'; });
      completeRef.current();
    };
    const tick = (now: number) => {
      if (!active || completed) return;
      startTime ??= now;
      const elapsed = now - startTime;
      let settled = true;
      strips.forEach((strip, col) => {
        const column = columns[col]!;
        const progress = column.duration <= 0 ? 1 : Math.min(1, elapsed / column.duration);
        strip.style.transform = reelTransform(-column.travel * (1 - reelProgress(progress)), cfg.rows);
        strip.dataset.reelSettled = String(progress >= 1);
        if (progress < 1) settled = false;
        else strip.style.willChange = 'auto';
      });
      if (settled) finish();
      else frame = window.requestAnimationFrame(tick);
    };
    const begin = () => {
      if (!active || started || completed) return;
      started = true;
      bank.dataset.reelReady = 'true';
      window.clearTimeout(safetyTimer);
      if (reducedMotion || columns.every((column) => column.duration <= 0)) { finish(); return; }
      frame = window.requestAnimationFrame(tick);
      // Background tabs can suspend rAF. Completion still lands the exact
      // outcome rather than leaving a round locked indefinitely.
      safetyTimer = window.setTimeout(finish, Math.max(...columns.map((column) => column.duration)) + 300);
    };
    const disposeImages = prepareReelImages(bank, begin);
    // Keep showing the existing board while art decodes, but bound a broken
    // network request. Normal cached/decoded artwork starts without a timer.
    if (!started) safetyTimer = window.setTimeout(begin, 2000);
    return () => { active = false; disposeImages(); window.cancelAnimationFrame(frame); window.clearTimeout(safetyTimer); };
  }, [cfg.rows, columns, reducedMotion]);

  return (
    <div ref={bankRef} data-reel-bank data-reel-ready="false" style={{ display: 'grid', gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))`, gap: REEL_GAP, aspectRatio: `${cfg.cols} / ${cfg.rows}`, width: '100%' }}>
      {columns.map((column, col) => (
        <div key={col} data-spin-reel-col={col} style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%', minHeight: 0 }}>
          <div data-reel-strip data-reel-travel={column.travel} style={{ position: 'absolute', inset: '0 0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: REEL_GAP, transform: reelTransform(-column.travel, cfg.rows), willChange: 'transform' }}>
            {column.cells.map((cell, index) => (
              <div key={`${col}-${index}`} data-reel-final={index < cfg.rows ? cell.key : undefined} data-reel-initial={index >= column.travel ? cell.key : undefined} data-symbol={cell.symbolId} data-multiplier={cell.multiplier} className={`cell ${cfg.theme.cellClass ?? ''}`} style={{ flexShrink: 0, width: '100%', minHeight: 0, height: `calc((100% - ${(cfg.rows - 1) * REEL_GAP}px) / ${cfg.rows})` }}>
                {renderCell({ symbolId: cell.symbolId, multiplier: cell.multiplier, winning: false, cellKey: cell.key })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
