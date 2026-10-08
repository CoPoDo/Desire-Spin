import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng, sha256Hex } from '../src/lib/fairness';
import { moneyCents } from '../src/lib/accounting';
import { useRoundPlayback } from '../src/pages/originals/_shared/useRoundPlayback';
import { useAutoBetRunner } from '../src/pages/originals/_shared/AutoBetController';
import { ReelStrip } from '../src/pages/originals/_shared/ReelStrip';
import { PlinkoGame } from '../src/pages/originals/plinko';
import { WheelGame } from '../src/pages/originals/wheel';
import { BaccaratGame } from '../src/pages/originals/baccarat';
import { RouletteGame } from '../src/pages/originals/roulette';
import { SicBoGame } from '../src/pages/originals/sicbo';
import { SlideGame } from '../src/pages/originals/slide';
import { CupsGame } from '../src/pages/originals/cups';
import { ScratchGame } from '../src/pages/originals/scratch';
import { BigBassGame } from '../src/pages/originals/big-bass';
import { MiniSlotGame } from '../src/pages/originals/mini-slot';
import * as Plinko from '../src/pages/originals/plinko/engine';
import * as Wheel from '../src/pages/originals/wheel/engine';
import * as Baccarat from '../src/pages/originals/baccarat/engine';
import * as Roulette from '../src/pages/originals/roulette/engine';
import * as SicBo from '../src/pages/originals/sicbo/engine';
import * as Cups from '../src/pages/originals/cups/engine';
import * as Scratch from '../src/pages/originals/scratch/engine';
import * as Bass from '../src/pages/originals/big-bass/engine';
import * as Mini from '../src/pages/originals/mini-slot/engine';

const fixture = vi.hoisted(() => ({ game: {} as any, credits: 1000, nonce: 0 }));
vi.mock('../src/game-context', () => ({ useGame: () => fixture.game }));
vi.mock('../src/components/layout/OriginalPageLayout', () => ({
  OriginalPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: vi.fn() }));
// Keep geometry and interaction real while removing cosmetic animation timers.
// The requested target rotation remains inspectable independently of Framer.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const components = new Map<string, React.ComponentType<any>>();
  const ignored = new Set(['animate', 'initial', 'exit', 'transition', 'layout', 'layoutId', 'whileHover', 'whileTap']);
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!components.has(tag)) components.set(tag, React.forwardRef((props: any, ref) => {
        const clean = Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key)));
        return React.createElement(tag, {
          ...clean, ref,
          'data-motion-rotate': typeof props.animate?.rotate === 'number' ? props.animate.rotate : undefined,
          'data-motion-y': typeof props.animate?.y === 'string' ? props.animate.y : undefined,
          'data-layout-id': props.layoutId,
        });
      }));
      return components.get(tag);
    } }),
  };
});

const SERVER = 'playback-regression';
const CLIENT = 'client';
const rng = (nonce = 0) => createRng(SERVER, CLIENT, nonce);
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); fixture.credits = 1000; fixture.nonce = 0;
  frames = new Map(); nextFrame = 1;
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = nextFrame++; frames.set(id, callback); return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { frames.delete(id); }));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  fixture.game = {
    balance: {
      get balance() { return fixture.credits; },
      getBalance: () => fixture.credits,
      canAfford: (amount: number) => {
        const cents = moneyCents(amount); return cents !== null && cents > 0 && cents <= Math.round(fixture.credits * 100);
      },
      debit: vi.fn((amount: number) => {
        const cents = moneyCents(amount);
        if (cents === null || cents <= 0 || cents > Math.round(fixture.credits * 100)) return false;
        fixture.credits = (Math.round(fixture.credits * 100) - cents) / 100; return true;
      }),
      credit: vi.fn((amount: number) => {
        const cents = moneyCents(amount);
        if (cents === null) return false;
        fixture.credits = (Math.round(fixture.credits * 100) + cents) / 100; return true;
      }),
    },
    fairness: { hash: sha256Hex(SERVER), consumeNonce: vi.fn(() => ({ serverSeed: SERVER, clientSeed: CLIENT, nonce: fixture.nonce++ })) },
    history: { record: vi.fn() }, session: { recordSpin: vi.fn() }, sound: { play: vi.fn() },
  };
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const tick = async (milliseconds: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); }); };
const repeatClick = (button: HTMLElement) => act(() => {
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
const expectLedger = (game: string, bet: number, payout: number, nonce = 0) => {
  expect(fixture.game.history.record).toHaveBeenLastCalledWith(expect.objectContaining({
    game, bet, payout, nonce, clientSeed: CLIENT, serverSeedHash: sha256Hex(SERVER),
  }));
};

describe('Cancellable playback and manual autoplay stop', () => {
  it('locks synchronously and resolves every pending wait false on departure, including StrictMode', async () => {
    const { result, unmount } = renderHook(() => useRoundPlayback(), { wrapper: StrictMode });
    const callback = vi.fn(); const cancelled = vi.fn();
    let first!: Promise<boolean>; let second!: Promise<boolean>;
    act(() => {
      result.current.setBusy(true);
      expect(result.current.busyRef.current).toBe(true);
      first = result.current.wait(100); second = result.current.wait(200);
      result.current.schedule(callback, 300, cancelled);
    });
    unmount();
    await expect(first).resolves.toBe(false); await expect(second).resolves.toBe(false);
    await tick(500);
    expect(callback).not.toHaveBeenCalled(); expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('does not launch a second wager when manually stopped during an unresolved round', async () => {
    let finish!: (delta: number) => void;
    const runOnce = vi.fn(() => new Promise<number>(resolve => { finish = resolve; }));
    const onStop = vi.fn();
    const { rerender } = renderHook(({ active }) => useAutoBetRunner({
      active, config: { count: 10, stopOnProfit: 0, stopOnLoss: 0 }, intervalMs: 100, runOnce, onStop,
    }), { initialProps: { active: true } });
    expect(runOnce).toHaveBeenCalledTimes(1);
    rerender({ active: false });
    await act(async () => { finish(2); await Promise.resolve(); });
    await tick(10_000);
    expect(runOnce).toHaveBeenCalledTimes(1); expect(onStop).not.toHaveBeenCalled();
  });

  it('cancels the inter-round pause on stop and keeps the originally approved count', async () => {
    const runOnce = vi.fn().mockResolvedValue(0); const onStop = vi.fn();
    const { result, rerender } = renderHook(({ active, count }) => useAutoBetRunner({
      active, config: { count, stopOnProfit: 0, stopOnLoss: 0 }, intervalMs: 100, runOnce, onStop,
    }), { initialProps: { active: true, count: 2 } });
    await act(async () => { await Promise.resolve(); });
    rerender({ active: true, count: 100 });
    await tick(200);
    expect(runOnce).toHaveBeenCalledTimes(2); expect(result.current.stopReason).toMatch(/count reached/);
    rerender({ active: false, count: 100 });
    await tick(10_000); expect(runOnce).toHaveBeenCalledTimes(2);
  });
});

describe('Plinko bulk drops', () => {
  it('accepts and accounts all 25 balls immediately, freezes settings, and cancels only presentation on departure', async () => {
    const expectedPayout = Array.from({ length: 25 }, (_, nonce) => Plinko.dropBall(rng(nonce), 1, 12, 'medium').payout)
      .reduce((sum, payout) => sum + payout, 0);
    const view = render(<PlinkoGame />);
    fireEvent.click(screen.getByRole('button', { name: '×25' }));
    fireEvent.click(screen.getByRole('button', { name: /^Bet ×25/ }));
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(25);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(25);
    expect(fixture.credits).toBe(+(975 + expectedPayout).toFixed(2));
    expect(screen.getByRole('slider')).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Bet amount' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'expert' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'auto' })).toBeDisabled();
    view.unmount(); const soundCount = fixture.game.sound.play.mock.calls.length;
    await tick(10_000);
    expect(fixture.game.sound.play).toHaveBeenCalledTimes(soundCount);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(25);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(25);
  });

  it('rejects an unaffordable batch before accepting any ball', () => {
    fixture.credits = 4;
    render(<PlinkoGame />);
    fireEvent.click(screen.getByRole('button', { name: '×5' }));
    const bet = screen.getByRole('button', { name: /^Bet ×5/ });
    expect(bet).toBeDisabled(); fireEvent.click(bet);
    expect(fixture.game.balance.debit).not.toHaveBeenCalled();
    expect(fixture.game.fairness.consumeNonce).not.toHaveBeenCalled();
  });

  it('accepts an exactly affordable fractional batch without a floating-point false rejection', () => {
    fixture.credits = 0.35;
    render(<PlinkoGame />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Bet amount' }), { target: { value: '0.07' } });
    fireEvent.click(screen.getByRole('button', { name: '×5' }));
    const bet = screen.getByRole('button', { name: /^Bet ×5/ });
    expect(bet).toBeEnabled(); fireEvent.click(bet);
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(5);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(5);
  });

  it('restores settings after the last staggered ball leaves the board', async () => {
    render(<PlinkoGame />);
    fireEvent.click(screen.getByRole('button', { name: '×5' }));
    fireEvent.click(screen.getByRole('button', { name: /^Bet ×5/ }));
    await tick(1900); expect(screen.getByRole('slider')).toBeDisabled();
    await tick(300); expect(screen.getByRole('slider')).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'expert' }));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '16' } });
    fireEvent.keyDown(window, { key: ' ' });
    const expected = Plinko.dropBall(rng(5), 1, 16, 'expert');
    expectLedger('Plinko', 1, expected.payout, 5);
  });
});

describe('Wheel pointer alignment', () => {
  it.each([10, 20, 30, 40, 50] as const)('lands the center of the paid segment under the top pointer for %i segments over repeat spins', async segments => {
    const view = render(<WheelGame />);
    fireEvent.click(screen.getByRole('button', { name: String(segments) }));
    let priorRotation = 0;
    for (let nonce = 0; nonce < 3; nonce++) {
      const expected = Wheel.spin(rng(nonce), 1, 'medium', segments);
      const button = screen.getByRole('button', { name: /^Spin ·/ });
      repeatClick(button);
      expect(fixture.game.balance.debit).toHaveBeenCalledTimes(nonce + 1);
      expectLedger('Wheel', 1, expected.payout, nonce);
      const svg = view.container.querySelector('svg')!;
      const rotation = Number(svg.getAttribute('data-motion-rotate'));
      const targetAngle = expected.segment * 360 / segments + rotation;
      expect(targetAngle / 360).toBeCloseTo(Math.round(targetAngle / 360), 10);
      expect(rotation).toBeGreaterThan(priorRotation + 2 * 360);
      await tick(3200);
      const paths = svg.querySelectorAll('g > path');
      expect(paths).toHaveLength(segments);
      expect(paths[expected.segment]).toHaveAttribute('stroke', '#ffffff');
      expect(Array.from(paths).filter(path => path.getAttribute('stroke') === '#ffffff')).toHaveLength(1);
      // Verify against the rendered wedge boundaries rather than assuming
      // the SVG uses the same starting angle as the rotation calculation.
      const coordinates = paths[expected.segment]!.getAttribute('d')!.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi)!.map(Number);
      const centerAngle = Math.atan2(coordinates[3]! + coordinates[10]!, coordinates[2]! + coordinates[9]!) * 180 / Math.PI;
      const turnsFromTop = (centerAngle + rotation + 90) / 360;
      expect(turnsFromTop).toBeCloseTo(Math.round(turnsFromTop), 10);
      priorRotation = rotation;
    }
  });
});

describe('Table chip placement and accepted-round accounting', () => {
  it.each([
    ['Baccarat', BaccaratGame, /^Player 2×/, /^Deal ·/, 800],
    ['Roulette', RouletteGame, /^Red$/, /^Spin ·/, 2400],
    ['Sic Bo', SicBoGame, /^Small /, /^Roll ·/, 1300],
  ] as const)('%s retains repeated chip placements, blocks duplicate dealing and in-flight edits, and cancels sounds on departure', async (game, Game, chipName, dealName, duration) => {
    const view = render(<Game />);
    const chip = screen.getByRole('button', { name: chipName });
    repeatClick(chip);
    const deal = screen.getByRole('button', { name: dealName });
    const clear = screen.getByRole('button', { name: 'Clear' });
    repeatClick(deal);
    fireEvent.click(chip); fireEvent.click(clear);
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(fixture.game.balance.debit).toHaveBeenCalledWith(2);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
    const payout = game === 'Baccarat'
      ? Baccarat.payoutFor('player', 2, Baccarat.play(rng()))
      : game === 'Roulette'
        ? Roulette.play(rng(), [{ type: { kind: 'color', color: 'red' }, amount: 2 }]).totalReturn
        : SicBo.play(rng(), [{ bet: { kind: 'small' }, amount: 2 }]).totalReturn;
    expectLedger(game, 2, payout); expect(fixture.credits).toBe(+(998 + payout).toFixed(2));
    await tick(duration);
    expect(screen.getByRole('button', { name: dealName })).toHaveTextContent('2.00');
    repeatClick(screen.getByRole('button', { name: dealName }));
    expect(fixture.game.history.record).toHaveBeenCalledTimes(2);
    view.unmount(); const sounds = fixture.game.sound.play.mock.calls.length;
    await tick(10_000);
    expect(fixture.game.sound.play).toHaveBeenCalledTimes(sounds);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(2);
  });

  it('accepts an exactly affordable fractional Baccarat total across different bet positions', () => {
    fixture.credits = 0.3;
    render(<BaccaratGame />);
    const amount = screen.getByRole('spinbutton', { name: 'Bet amount' });
    fireEvent.change(amount, { target: { value: '0.1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Player 2×/ }));
    fireEvent.change(amount, { target: { value: '0.2' } });
    fireEvent.click(screen.getByRole('button', { name: /^Banker 1.95×/ }));
    const deal = screen.getByRole('button', { name: /^Deal ·/ });
    expect(deal).toBeEnabled(); fireEvent.click(deal);
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(fixture.game.balance.debit).toHaveBeenCalledWith(0.3);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });
});

describe('Slide animation lifecycle', () => {
  it('accounts once before RAF playback and cancels the outstanding frame when leaving', () => {
    const view = render(<SlideGame />);
    repeatClick(screen.getByRole('button', { name: /^Slide ·/ }));
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);
    const id = [...frames.keys()][0]!;
    view.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(id); expect(frames.size).toBe(0);
    const record = fixture.game.history.record.mock.calls[0][0];
    expect(fixture.credits).toBe(+(999 + record.payout).toFixed(2));
  });

  it('finishes the accepted slide after Stop without launching another automatic round', async () => {
    render(<SlideGame />);
    fireEvent.click(screen.getByRole('button', { name: 'auto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Autobet' }));
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stop Autobet' }));
    await act(async () => {
      const pending = [...frames.entries()]; frames.clear();
      pending.forEach(([, callback]) => callback(3000)); await Promise.resolve();
    });
    await tick(10_000);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Start Autobet' })).toBeEnabled();
  });
});

describe('Cups and Scratch interruption and replay', () => {
  it.each([100, 900, 2500])('refunds an unchosen Cups wager exactly once when leaving at %ims', async elapsed => {
    const view = render(<StrictMode><CupsGame /></StrictMode>);
    repeatClick(screen.getByRole('button', { name: /^Bet / }));
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    await tick(elapsed); view.unmount();
    const sounds = fixture.game.sound.play.mock.calls.length;
    await tick(10_000);
    expect(fixture.credits).toBe(1000); expect(fixture.game.balance.credit).toHaveBeenCalledTimes(1);
    expect(fixture.game.balance.credit).toHaveBeenCalledWith(1);
    expectLedger('3 Cups', 1, 1); expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.sound.play).toHaveBeenCalledTimes(sounds);
  });

  it('keeps the ball under its original cup after all swaps and accepts only one pick', async () => {
    const view = render(<CupsGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet / }));
    const ballCupId = Cups.play(rng(), 1, 0, 'easy').ballAt;
    const ballCup = view.container.querySelector(`[data-layout-id="cup-${ballCupId}"]`)!;
    expect(ballCup).toHaveTextContent('⚪');
    await tick(2200);
    expect(ballCup).toBeEnabled(); expect(ballCup).not.toHaveTextContent('⚪');
    repeatClick(ballCup as HTMLElement);
    const payout = Cups.multiplierFor('easy');
    expectLedger('3 Cups', 1, payout); expect(fixture.game.balance.credit).toHaveBeenCalledTimes(1);
    expect(fixture.game.balance.credit).toHaveBeenCalledWith(payout);
    view.unmount(); expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });

  it('leaves Cups playable after a refunded pagehide and bfcache restoration', async () => {
    render(<CupsGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet / }));
    await tick(900);
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(fixture.credits).toBe(1000); expectLedger('3 Cups', 1, 1);
    act(() => { window.dispatchEvent(new Event('pageshow')); });
    await tick(2500);
    expect(screen.queryByRole('button', { name: /^Bet |Play Again/ })).toBeEnabled();
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });

  it('keeps a partly revealed Scratch ticket paid and recorded when leaving', () => {
    const expected = Scratch.play(rng(), 1);
    const view = render(<ScratchGame />);
    repeatClick(screen.getByRole('button', { name: /^Buy Card/ }));
    fireEvent.click(screen.getAllByRole('button', { name: '?' })[0]!);
    expectLedger('Scratch', 1, expected.payout);
    view.unmount(); expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.credits).toBe(+(999 + expected.payout).toFixed(2));
  });

  it('accepts only one new Scratch ticket for repeated Play Again clicks in one render', () => {
    render(<ScratchGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Buy Card/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal All' }));
    repeatClick(screen.getByRole('button', { name: 'Play Again' }));
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(2);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(2);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(2);
  });
});

describe('Predetermined reel-strip outcomes', () => {
  it('keeps result cells in the moving strip and retains their nodes when highlights appear', () => {
    const initial = ['A', 'B', 'C']; const first = ['C', 'B', 'A']; const second = ['B', 'A', 'C'];
    const draw = (symbols: string[], roundId: number, highlighted = false) => <ReelStrip
      symbols={symbols} pool={['A', 'B', 'C']} reel={0} roundId={roundId} duration={1}
      renderSymbol={(symbol, row) => <span data-row={row ?? 'filler'} data-highlighted={highlighted && row !== null}>{symbol}</span>}
    />;
    const view = render(draw(initial, 0));
    view.rerender(draw(first, 1));
    const reel = screen.getByRole('img', { name: 'Reel 1: C, B, A' });
    const strip = reel.firstElementChild!;
    const cells = Array.from(strip.children);
    expect(cells.slice(0, 3).map(cell => cell.textContent)).toEqual(initial);
    expect(cells.slice(-3).map(cell => cell.textContent)).toEqual(first);
    expect(cells.slice(-3).map(cell => cell.firstElementChild!.getAttribute('data-row'))).toEqual(['0', '1', '2']);
    const landing = cells.length - first.length;
    expect(Number.parseFloat(strip.getAttribute('data-motion-y')!)).toBeCloseTo(-100 * landing / cells.length, 12);
    view.rerender(draw([...first], 1, true));
    expect(reel.firstElementChild).toBe(strip);
    expect(Array.from(strip.children).every((cell, index) => cell === cells[index])).toBe(true);
    expect(cells.slice(-3).map(cell => cell.textContent)).toEqual(first);
    expect(cells.slice(-3).every(cell => cell.firstElementChild!.getAttribute('data-highlighted') === 'true')).toBe(true);
    view.rerender(draw(second, 2));
    const nextStrip = reel.firstElementChild!;
    expect(nextStrip).not.toBe(strip);
    expect(Array.from(nextStrip.children).slice(0, 3).map(cell => cell.textContent)).toEqual(first);
    expect(Array.from(nextStrip.children).slice(-3).map(cell => cell.textContent)).toEqual(second);
  });

  it('Classic 3-Reel Slot never substitutes symbols when a round stops or a later round begins', async () => {
    render(<MiniSlotGame />);
    let previous = ['cherry', 'lemon', 'grape'];
    for (let nonce = 0; nonce < 3; nonce++) {
      const expected = Mini.spin(rng(nonce), 1);
      repeatClick(screen.getByRole('button', { name: /^Spin ·/ }));
      expectLedger('Classic 3-Reel Slot', 1, expected.payout, nonce);
      const reels = screen.getAllByRole('img', { name: /^Reel / });
      const strips = reels.map(reel => reel.firstElementChild!);
      const cells = strips.map(strip => Array.from(strip.children));
      reels.forEach((reel, index) => {
        expect(reel).toHaveAttribute('data-reel-outcome', expected.reels[index]);
        expect(cells[index]![0]!.textContent).toBe(Mini.symbolMeta(previous[index] as Mini.SymbolId).emoji);
        expect(cells[index]!.at(-1)!.textContent).toBe(Mini.symbolMeta(expected.reels[index]!).emoji);
      });
      await tick(1200);
      reels.forEach((reel, index) => {
        expect(reel.firstElementChild).toBe(strips[index]);
        expect(Array.from(strips[index]!.children).every((cell, row) => cell === cells[index]![row])).toBe(true);
        expect(strips[index]!.lastElementChild!.textContent).toBe(Mini.symbolMeta(expected.reels[index]!).emoji);
      });
      expect(fixture.game.history.record).toHaveBeenCalledTimes(nonce + 1);
      previous = expected.reels;
    }
  });

  it('Big Bass base rounds include the entire known 5×3 outcome before motion and retain it after settlement', async () => {
    render(<BigBassGame />);
    let nextNonce = 0;
    for (let round = 0; round < 3; round++) {
      while (Bass.planRound(rng(nextNonce), 1).bonusAward > 0) nextNonce++;
      fixture.nonce = nextNonce;
      const expected = Bass.planRound(rng(nextNonce), 1);
      fireEvent.keyDown(window, { key: ' ' });
      const reels = screen.getAllByRole('img', { name: /^Reel / });
      expect(reels).toHaveLength(5);
      const strips = reels.map(reel => reel.firstElementChild!);
      const cells = strips.map(strip => Array.from(strip.children));
      reels.forEach((reel, column) => {
        const symbols = [expected.base!.reels[column]!, expected.base!.reels[5 + column]!, expected.base!.reels[10 + column]!];
        expect(reel).toHaveAttribute('data-reel-outcome', symbols.join(','));
        expect(cells[column]!.slice(-3).map(cell => cell.querySelector('span')!.textContent))
          .toEqual(symbols.map(symbol => Bass.symbolById(symbol)!.emoji));
      });
      await tick(1500);
      reels.forEach((reel, column) => {
        expect(reel.firstElementChild).toBe(strips[column]);
        expect(Array.from(strips[column]!.children).every((cell, row) => cell === cells[column]![row])).toBe(true);
      });
      expectLedger('Big Bass Bonanza', 1, expected.totalPayout, nextNonce);
      expect(fixture.game.history.record).toHaveBeenCalledTimes(round + 1);
      nextNonce++;
    }
  });
});
