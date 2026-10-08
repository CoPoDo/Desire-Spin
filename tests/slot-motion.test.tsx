import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpinReel, reelProgress, reelTransform, reelTravelRows } from '../src/pages/slots/_shared/SpinReel';
import { Grid as SlotGrid } from '../src/pages/slots/_shared/Grid';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';
import type { Grid } from '../src/pages/slots/_shared/types';

const state = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  return { useReducedMotion: () => state.reduced, AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!cache.has(tag)) cache.set(tag, React.forwardRef((props: Record<string, unknown>, ref) => {
        const { initial, animate, exit, transition, layout, ...rest } = props;
        return React.createElement(tag, { ...rest, ref, 'data-initial': JSON.stringify(initial), 'data-animate': JSON.stringify(animate), 'data-transition': JSON.stringify(transition), 'data-layout': String(layout) });
      }));
      return cache.get(tag);
    } }) };
});
const cfg = { ...gatesOfOlympusConfig, cols: 3, rows: 3 };
const board = (prefix: string): Grid => Array.from({ length: cfg.cols }, (_, col) => Array.from({ length: cfg.rows }, (_, row) => ({ key: `${prefix}-${col}-${row}`, symbolId: `${prefix}-${col}-${row}` })));
const initialGrid = board('initial');
const finalGrid = board('outcome');
const art = ({ symbolId }: { symbolId: string }) => <span>{symbolId}</span>;
let frames: Map<number, FrameRequestCallback>;
let nextId: number;
function frame(at: number) {
  act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(at));
  });
}
function stripOffset(strip: HTMLElement) {
  return Number(strip.style.transform.match(/calc\(([-\d.e+]+)%/)?.[1]);
}
beforeEach(() => {
  vi.useFakeTimers(); state.reduced = false; frames = new Map(); nextId = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frames.set(++nextId, callback); return nextId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const props = { cfg, initialGrid, finalGrid, renderCell: art, durationMs: 650, staggerMs: 140 };

describe('physical reel motion, beyond outcome identity', () => {
  it('has continuous position, velocity, and acceleration at ramp joins', () => {
    const h = 1e-5;
    const velocity = (t: number) => (reelProgress(t + h) - reelProgress(t - h)) / (2 * h);
    expect(reelProgress(0)).toBe(0); expect(reelProgress(1)).toBe(1);
    expect(velocity(0)).toBeLessThan(1e-6); expect(velocity(1)).toBeLessThan(1e-6);
    for (const join of [.16, .66]) expect(Math.abs(velocity(join - h) - velocity(join + h))).toBeLessThan(1e-5);
    for (let step = 1; step <= 1000; step++) expect(reelProgress(step / 1000)).toBeGreaterThanOrEqual(reelProgress((step - 1) / 1000));
    expect(velocity(.5)).toBeGreaterThan(velocity(.8));
    expect(velocity(.8)).toBeGreaterThan(velocity(.95));
    expect(reelProgress(.9)).toBeGreaterThan(.99); // no long slow crawl at the end
  });

  it.each([240, 650, 900])('covers the viewport for the full %ims journey and lands at zero', (duration) => {
    const travel = reelTravelRows(5, duration);
    for (const viewportHeight of [217.3125, 503.25, 641.875]) {
      const stride = (viewportHeight + 6) / 5;
      const stripHeight = (travel + 5) * stride - 6;
      for (let sample = 0; sample <= 100; sample++) {
        const offset = -travel * (1 - reelProgress(sample / 100));
        const translate = offset / 5 * viewportHeight + offset / 5 * 6;
        expect(translate).toBeCloseTo(offset * stride, 8);
        expect(translate).toBeLessThanOrEqual(0);
        expect(stripHeight + translate).toBeGreaterThanOrEqual(viewportHeight - 1e-8);
      }
    }
    expect(reelTransform(0, 5)).toBe('translate3d(0, calc(0% + 0px), 0)');
  });

  it('begins with the old board, stays mounted through re-renders, and settles columns in order', () => {
    const complete = vi.fn();
    const view = render(<SpinReel {...props} onComplete={complete} />);
    const strips = [...view.container.querySelectorAll<HTMLElement>('[data-reel-strip]')];
    expect([...view.container.querySelectorAll('[data-reel-initial]')].map((cell) => cell.textContent)).toEqual(initialGrid.flat().map((cell) => cell.symbolId));
    expect(strips.every((strip) => strip.style.visibility !== 'hidden')).toBe(true);
    frame(0); frame(120);
    const moving = strips.map(stripOffset);
    view.rerender(<SpinReel {...props} durationMs={1} staggerMs={0} onComplete={complete} />);
    expect([...view.container.querySelectorAll('[data-reel-strip]')]).toEqual(strips);
    expect(strips.map(stripOffset)).toEqual(moving);
    frame(650);
    expect(strips[0]).toHaveAttribute('data-reel-settled', 'true');
    expect(strips[1]).toHaveAttribute('data-reel-settled', 'false');
    expect(complete).not.toHaveBeenCalled();
    frame(930);
    expect(strips.every((strip) => stripOffset(strip) === 0)).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('holds the existing board until new raster artwork is decoded', async () => {
    const complete = vi.fn();
    const decode = vi.fn(() => Promise.resolve());
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(64);
    vi.spyOn(HTMLImageElement.prototype, 'decode').mockImplementation(decode);
    const view = render(<SpinReel {...props} renderCell={({ symbolId }) => <img src={`/${symbolId}.webp`} loading="lazy" alt="" />} onComplete={complete} />);
    expect(frames.size).toBe(0);
    expect(view.container.querySelector('[data-reel-bank]')).toHaveAttribute('data-reel-ready', 'false');
    const images = [...view.container.querySelectorAll('img')];
    expect(images.every((image) => image.loading === 'eager')).toBe(true);
    await act(async () => { images.forEach((image) => fireEvent.load(image)); await Promise.resolve(); });
    expect(decode).toHaveBeenCalledTimes(images.length);
    expect(frames.size).toBe(1);
    frame(0); frame(930);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('recovers a stalled image load and suspended animation without locking the round', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
    const complete = vi.fn();
    render(<SpinReel {...props} renderCell={() => <img src="/missing.webp" alt="" />} onComplete={complete} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1999); });
    expect(complete).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(1231); });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does not restart a StrictMode spin or fire completion after unmount', async () => {
    const complete = vi.fn();
    const view = render(<StrictMode><SpinReel {...props} onComplete={complete} /></StrictMode>);
    expect(frames.size).toBe(1);
    frame(0); frame(300);
    view.unmount();
    expect(frames.size).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(complete).not.toHaveBeenCalled();
  });

  it('resolves reduced motion without scheduling a moving frame', () => {
    state.reduced = true;
    const complete = vi.fn();
    const view = render(<StrictMode><SpinReel {...props} onComplete={complete} /></StrictMode>);
    expect(frames.size).toBe(0);
    expect(complete).toHaveBeenCalledTimes(1);
    expect([...view.container.querySelectorAll<HTMLElement>('[data-reel-strip]')].every((strip) => stripOffset(strip) === 0)).toBe(true);
  });

  it('drops incoming cells by whole responsive strides without scaling survivors', () => {
    const grid = board('stable');
    const fresh = new Set([grid[1]![0]!.key, grid[1]![1]!.key]);
    const view = render(<SlotGrid grid={grid} cfg={cfg} winning={new Set()} newKeys={fresh} renderCell={art} bare />);
    const cells = [...view.container.querySelectorAll<HTMLElement>('[data-slot-cell-key]')];
    const incoming = cells.find((cell) => cell.dataset.slotCellKey === grid[1]![0]!.key)!;
    expect(JSON.parse(incoming.dataset.initial!)).toEqual({ y: 'calc(-200% + -12px)', opacity: 1 });
    expect(incoming.style.gridColumn).toBe('2'); expect(incoming.style.gridRow).toBe('1');
    const survivor = cells.find((cell) => cell.dataset.slotCellKey === grid[1]![2]!.key)!;
    expect(JSON.parse(survivor.dataset.initial!)).toBe(false);
    expect(survivor.dataset.layout).toBe('position');
    expect(JSON.parse(survivor.dataset.animate!)).not.toHaveProperty('scale');
  });
  it('removes visual exit copies on time instead of accumulating retired layout nodes', async () => {
    const first = board('first');
    const second = board('second');
    const view = render(<SlotGrid grid={first} cfg={cfg} winning={new Set()} newKeys={new Set()} renderCell={art} bare />);
    view.rerender(<SlotGrid grid={second} cfg={cfg} winning={new Set()} newKeys={new Set(second.flat().map((cell) => cell.key))} renderCell={art} bare />);
    expect(view.container.querySelectorAll('[data-slot-cell-key]')).toHaveLength(9);
    expect(view.container.querySelectorAll('[data-slot-exiting]')).toHaveLength(9);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    expect(view.container.querySelectorAll('[data-slot-exiting]')).toHaveLength(0);
    expect(view.container.querySelectorAll('[data-slot-cell-key]')).toHaveLength(9);
  });

});
