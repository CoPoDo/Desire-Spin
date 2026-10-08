import { useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpinReel } from '../src/pages/slots/_shared/SpinReel';
import { Grid as SlotGrid } from '../src/pages/slots/_shared/Grid';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';
import { playSugarSpin } from '../src/pages/slots/sugar-rush/engine';
import { createRng } from '../src/lib/fairness';
import { spin } from '../src/pages/slots/_shared/engine';
import type { Grid } from '../src/pages/slots/_shared/types';

// Keep React's actual keyed DOM reconciliation while making transforms inspectable.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  return { useReducedMotion: () => false, AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!cache.has(tag)) cache.set(tag, React.forwardRef((props: Record<string, unknown>, ref) => {
        const { initial, animate, exit, transition, layout, ...rest } = props;
        return React.createElement(tag, { ...rest, ref });
      }));
      return cache.get(tag);
    } }) };
});
const renderCell = ({ symbolId, multiplier, cellKey }: { symbolId: string; multiplier?: number; cellKey: string }) => <span data-art={cellKey}>{symbolId}{multiplier ? ` ${multiplier}×` : ''}</span>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(250);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('landed symbols remain the actual result', () => {
  it('preserves the exact landed artwork, key, and multiplier through reel-to-grid handoff', async () => {
    const finalGrid: Grid = Array.from({ length: 6 }, (_, col) => Array.from({ length: 5 }, (_, row) => ({ key: `outcome-${col}-${row}`, symbolId: col === 2 && row === 3 ? '__mult__' : ['crown', 'ring', 'gem-red'][(col + row) % 3]!, ...(col === 2 && row === 3 ? { multiplier: 250 } : {}) })));
    function Landing() {
      const [spinning, setSpinning] = useState(true);
      return spinning ? <SpinReel cfg={gatesOfOlympusConfig} finalGrid={finalGrid} renderCell={renderCell} durationMs={500} staggerMs={100} onComplete={() => setSpinning(false)} /> : <SlotGrid cfg={gatesOfOlympusConfig} grid={finalGrid} winning={new Set()} newKeys={new Set()} renderCell={renderCell} bare />;
    }
    const { container } = render(<Landing />);
    const landed = new Map([...container.querySelectorAll<HTMLElement>('[data-reel-final]')].map((node) => [node.dataset.reelFinal!, { symbol: node.dataset.symbol, multiplier: node.dataset.multiplier, art: node.innerHTML }]));
    expect(landed.size).toBe(30);
    expect(landed.get('outcome-2-3')?.art).toContain('250×');
    await act(async () => { await vi.advanceTimersByTimeAsync(1400); });
    const resting = [...container.querySelectorAll<HTMLElement>('[data-slot-cell-key]')];
    expect(resting).toHaveLength(30);
    for (const node of resting) expect({ symbol: node.dataset.symbol, multiplier: node.dataset.multiplier, art: node.innerHTML }).toEqual(landed.get(node.dataset.slotCellKey!));
  });

  it('keeps the same survivor DOM nodes when a tumble moves them down', () => {
    const first: Grid = [[{ key: 'kept', symbolId: 'crown' }, { key: 'removed', symbolId: 'ring' }]];
    const second: Grid = [[{ key: 'new', symbolId: 'gem-red' }, { key: 'kept', symbolId: 'crown' }]];
    const cfg = { ...gatesOfOlympusConfig, cols: 1, rows: 2 };
    const view = render(<SlotGrid cfg={cfg} grid={first} winning={new Set(['0:1'])} newKeys={new Set()} renderCell={renderCell} bare />);
    const survivor = view.container.querySelector('[data-slot-cell-key="kept"]');
    view.rerender(<SlotGrid cfg={cfg} grid={second} winning={new Set()} newKeys={new Set(['new'])} renderCell={renderCell} bare />);
    expect(view.container.querySelector('[data-slot-cell-key="kept"]')).toBe(survivor);
    expect(view.container.querySelector('[data-slot-cell-key="removed"]')).toBeNull();
    expect(view.container.querySelector('[data-slot-cell-key="kept"]')?.textContent).toBe('crown');
  });

  it('commits multiplier cells in their landing board and never swaps a stopped board afterwards', () => {
    let multipliers = 0;
    for (let nonce = 0; nonce < 100; nonce++) {
      const { frames } = spin(createRng('landing-order', 'test', nonce), gatesOfOlympusConfig, { bet: 1, ante: false }, 'free');
      frames.forEach((frame, index) => {
        if (frame.kind !== 'multipliersLanded') return;
        const before = frames[index - 1];
        expect(before?.kind === 'initialDrop' || before?.kind === 'tumble').toBe(true);
        if (before && 'grid' in before) expect(frame.grid).toEqual(before.grid);
        multipliers++;
      });
      for (let index = 0; index < frames.length - 1; index++) {
        const frame = frames[index];
        if (frame?.kind !== 'wins') continue;
        const next = frames.slice(index + 1).find((entry) => entry.kind === 'tumble');
        if (!next || next.kind !== 'tumble') continue;
        const removed = new Set(frame.wins.flatMap((win) => win.positions.map(([col, row]) => frame.grid[col]![row]!.key)));
        for (let col = 0; col < frame.grid.length; col++) {
          for (const cell of frame.grid[col]!) {
            if (removed.has(cell.key)) continue;
            expect(next.grid[col]?.find((candidate) => candidate.key === cell.key)).toEqual(cell);
          }
        }
      }
    }
    expect(multipliers).toBeGreaterThan(0);
  });

  it('gives Sugar candy survivors stable identities, fixed columns, and downward gravity', () => {
    let tumbles = 0;
    for (let nonce = 0; nonce < 80; nonce++) {
      const result = playSugarSpin(createRng('sugar-topology', 'test', nonce), 1);
      for (let index = 0; index < result.frames.length - 1; index++) {
        const before = result.frames[index]!;
        if (!before.winningPositions.length) continue;
        const after = result.frames[index + 1]!;
        const removed = new Set(before.winningPositions.map((position) => before.cellKeys[position]));
        expect(new Set(after.cellKeys).size).toBe(49);
        before.cellKeys.forEach((key, position) => {
          const nextPosition = after.cellKeys.indexOf(key);
          if (removed.has(key)) expect(nextPosition).toBe(-1);
          else {
            expect(nextPosition).toBeGreaterThanOrEqual(position);
            expect(nextPosition % 7).toBe(position % 7);
            expect(after.grid[nextPosition]).toBe(before.grid[position]);
          }
        });
        tumbles++;
      }
    }
    expect(tumbles).toBeGreaterThan(0);
  });

  it('does not complete a reel twice or after it has unmounted', async () => {
    const done = vi.fn();
    const grid: Grid = Array.from({ length: 6 }, (_, col) => Array.from({ length: 5 }, (_, row) => ({ key: `${col}-${row}`, symbolId: 'crown' })));
    const view = render(<SpinReel cfg={gatesOfOlympusConfig} finalGrid={grid} renderCell={renderCell} durationMs={500} staggerMs={100} onComplete={done} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(done).toHaveBeenCalledTimes(1);
    view.unmount();
    const again = render(<SpinReel cfg={gatesOfOlympusConfig} finalGrid={grid} renderCell={renderCell} durationMs={500} staggerMs={100} onComplete={done} />);
    again.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(done).toHaveBeenCalledTimes(1);
  });
});
