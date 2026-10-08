import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng, sha256Hex, type Rng } from '../src/lib/fairness';
import { useCrashRound } from '../src/pages/originals/_shared/useCrashRound';
import { useAutoBetRunner } from '../src/pages/originals/_shared/AutoBetController';
import { DiceGame } from '../src/pages/originals/dice';
import { DiamondsGame } from '../src/pages/originals/diamonds';
import { KenoGame } from '../src/pages/originals/keno';
import { ScratchGame } from '../src/pages/originals/scratch';
import { BigBassGame } from '../src/pages/originals/big-bass';
import { CoinFlipGame } from '../src/pages/originals/coin-flip';
import * as Dice from '../src/pages/originals/dice/engine';
import * as Crash from '../src/pages/originals/crash/engine';
import * as Scratch from '../src/pages/originals/scratch/engine';
import * as Bass from '../src/pages/originals/big-bass/engine';
import * as Limbo from '../src/pages/originals/limbo/engine';
import * as Slide from '../src/pages/originals/slide/engine';
import * as Flip from '../src/pages/originals/coin-flip/engine';
import * as Plinko from '../src/pages/originals/plinko/engine';
import { MAX_ROUND_MULTIPLIER } from '../src/lib/accounting';

const fixture = vi.hoisted(() => ({ game: {} as any, credits: 1000, nonce: 0 }));
vi.mock('../src/game-context', () => ({ useGame: () => fixture.game }));
vi.mock('../src/components/layout/OriginalPageLayout', () => ({
  OriginalPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: vi.fn() }));
const SERVER = 'originals-regression';
const CLIENT = 'client';
const rng = (nonce = 0) => createRng(SERVER, CLIENT, nonce);
const findNonce = (accept: (stream: Rng) => boolean) => {
  for (let n = 0; n < 10000; n++) if (accept(rng(n))) return n;
  throw new Error('No test seed found');
};
let now = 0;
let frame: FrameRequestCallback = () => undefined;
let visibility = 'visible';

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); now = 0; visibility = 'visible';
  fixture.credits = 1000; fixture.nonce = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => { frame = cb; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility as DocumentVisibilityState);
  fixture.game = {
    balance: {
      get balance() { return fixture.credits; },
      getBalance: () => fixture.credits,
      canAfford: (amount: number) => Number.isFinite(amount) && amount > 0 && fixture.credits >= amount,
      debit: vi.fn((amount: number) => {
        if (!Number.isFinite(amount) || amount <= 0 || amount > fixture.credits) return false;
        fixture.credits = +(fixture.credits - amount).toFixed(2); return true;
      }),
      credit: vi.fn((amount: number) => { fixture.credits = +(fixture.credits + amount).toFixed(2); return true; }),
    },
    fairness: { hash: sha256Hex(SERVER), consumeNonce: vi.fn(() => ({ serverSeed: SERVER, clientSeed: CLIENT, nonce: fixture.nonce++ })) },
    history: { record: vi.fn() }, session: { recordSpin: vi.fn() }, sound: { play: vi.fn() },
  };
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Crash/Aviator authoritative round lifecycle', () => {
  it.each([['Crash', 'running'], ['Aviator', 'flying']] as const)('%s settles both auto cashouts exactly once when one delayed frame crosses targets and bust', (name, phase) => {
    fixture.nonce = findNonce((stream) => { const bust = Crash.rollBust(stream); return bust > 3 && bust < 10; });
    const usedNonce = fixture.nonce;
    const { result } = renderHook(() => useCrashRound(name, phase));
    act(() => {
      result.current.setSlotA({ ...result.current.slotA, autoEnabled: true, autoCashout: 2 });
      result.current.setSlotB({ ...result.current.slotB, active: true, autoEnabled: true, autoCashout: 3 });
      result.current.start(); result.current.start();
    });
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    now = (Crash.timeForMultiplier(result.current.bust!) + 1) * 1000;
    act(() => frame(now));
    expect(fixture.credits).toBe(1003);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(2);
    for (const [record] of fixture.game.history.record.mock.calls) {
      expect(record.clientSeed).toBe(CLIENT); expect(record.nonce).toBe(usedNonce);
      expect(record.serverSeedHash).toBe(sha256Hex(SERVER)); expect(record.payout).toBeGreaterThan(0);
    }
    expect(result.current.phase).toBe('done');
  });

  it('uses elapsed time rather than stale paint when manually cashing out after crash', () => {
    fixture.nonce = findNonce((stream) => Crash.rollBust(stream) > 1.1);
    const { result } = renderHook(() => useCrashRound('Crash', 'running'));
    act(() => result.current.start());
    now = (Crash.timeForMultiplier(result.current.bust!) + 1) * 1000;
    act(() => result.current.cashOutSlot('a'));
    expect(fixture.credits).toBe(999); expect(fixture.game.balance.credit).not.toHaveBeenCalled();
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate manual payouts and settles a live unmounted round', () => {
    fixture.nonce = findNonce((stream) => Crash.rollBust(stream) > 2);
    const first = renderHook(() => useCrashRound('Crash', 'running'));
    act(() => first.result.current.start()); now = 100;
    act(() => { first.result.current.cashOutSlot('a'); first.result.current.cashOutSlot('a'); });
    first.unmount();
    expect(fixture.game.balance.credit).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    const second = renderHook(() => useCrashRound('Aviator', 'flying'));
    act(() => second.result.current.start());
    second.unmount();
    expect(fixture.game.history.record).toHaveBeenCalledTimes(2);
  });
});

describe('Safe autobet', () => {
  const config = { count: 10, stopOnProfit: 0, stopOnLoss: 0 };
  it('stops on rejected wager without counting it, while zero-profit pushes count', async () => {
    const runOnce = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(null);
    const onStop = vi.fn();
    const { result } = renderHook(() => useAutoBetRunner({ active: true, config, intervalMs: 0, runOnce, onStop }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(runOnce).toHaveBeenCalledTimes(2); expect(onStop).toHaveBeenCalledTimes(1);
    expect(result.current.completed).toBe(1); expect(result.current.stopReason).toMatch(/no bet/);
  });
  it('rounds cumulative net profit so decimal stop limits fire at the right bet', async () => {
    const runOnce = vi.fn().mockResolvedValue(0.1); const onStop = vi.fn();
    const { result } = renderHook(() => useAutoBetRunner({ active: true, config: { ...config, stopOnProfit: 0.3 }, intervalMs: 0, runOnce, onStop }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.completed).toBe(3); expect(result.current.netProfit).toBe(0.3);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
  it('does not place another wager after the tab becomes hidden', async () => {
    const runOnce = vi.fn().mockResolvedValue(-1); const onStop = vi.fn();
    renderHook(() => useAutoBetRunner({ active: true, config, intervalMs: 1000, runOnce, onStop }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve(); });
    expect(runOnce).toHaveBeenCalledTimes(1); expect(onStop).toHaveBeenCalledTimes(1);
  });
});

describe('Originals interaction and presentation settlement', () => {
  it('Dice hotkeys cannot overlap its reveal or bypass the debit guard', () => {
    render(<DiceGame />);
    act(() => { fireEvent.keyDown(window, { key: ' ' }); fireEvent.keyDown(window, { key: ' ' }); });
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });
  it('Diamonds credits and records before the reveal, then cancels sounds on departure', () => {
    const view = render(<DiamondsGame />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    const record = fixture.game.history.record.mock.calls[0][0];
    expect(fixture.credits).toBe(+(999 + record.payout).toFixed(2));
    view.unmount(); const sounds = fixture.game.sound.play.mock.calls.length;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(fixture.game.sound.play).toHaveBeenCalledTimes(sounds);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });
  it('Keno cannot lose a known prize when leaving during sequential drawing', () => {
    const view = render(<KenoGame />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /^Play/ }));
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    view.unmount(); act(() => { vi.advanceTimersByTime(10000); });
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });
  it('Scratch payout is exactly once even in StrictMode and repeated reveal-all clicks', () => {
    fixture.nonce = findNonce((stream) => Scratch.play(stream, 1).payout > 0);
    render(<StrictMode><ScratchGame /></StrictMode>);
    fireEvent.click(screen.getByRole('button', { name: /^Buy|^Bet|^Scratch/ }));
    const record = fixture.game.history.record.mock.calls[0][0];
    const reveal = screen.getByRole('button', { name: /reveal all/i });
    act(() => { fireEvent.click(reveal); fireEvent.click(reveal); });
    expect(fixture.credits).toBe(+(999 + record.payout).toFixed(2));
    expect(fixture.game.balance.credit).toHaveBeenCalledTimes(1);
  });
  it('Flip records the original wager seed and cashes out completed flips on departure', () => {
    fixture.nonce = findNonce((stream) => Flip.flip(stream) === 'heads');
    const view = render(<CoinFlipGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }));
    view.unmount();
    expect(fixture.credits).toBe(1000.98);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });
  it('Big Bass accounts the whole awarded feature before any animation', () => {
    fixture.nonce = findNonce((stream) => Bass.spin(stream, 1).scatterCount >= 3);
    const expected = Bass.planRound(rng(fixture.nonce), 1);
    const view = render(<BigBassGame />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.credits).toBe(+(999 + expected.totalPayout).toFixed(2));
    view.unmount(); act(() => { vi.advanceTimersByTime(120000); });
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });
});

describe('Math and feature regression', () => {
  it('Dice chance exactly matches its strict inequality over all 10000 possible rolls', () => {
    for (const target of [0, 2, 50, 98, 99.99, 100]) {
      for (const direction of ['over', 'under'] as const) {
        let wins = 0;
        for (let i = 0; i < 10000; i++) if (direction === 'over' ? i / 100 > target : i / 100 < target) wins++;
        expect(Dice.winChanceFor(direction, target)).toBe(wins / 100);
      }
    }
  });
  it('unsupported multipliers cannot win in Limbo or Slide', () => {
    for (const target of [NaN, Infinity, 0, 1, 1000001]) {
      expect(Limbo.play(rng(), 1, target).win).toBe(false);
      expect(Slide.play(rng(), 1, target).win).toBe(false);
    }
    expect(Flip.multiplierAfter(1000)).toBe(MAX_ROUND_MULTIPLIER);
  });
  it('Big Bass feature terminates after at most three collector upgrades', () => {
    for (let nonce = 0; nonce < 100; nonce++) {
      const round = Bass.planRound(rng(nonce), 1, true);
      expect(round.feature.length).toBeLessThanOrEqual(40);
      expect(round.feature.reduce((n, frame) => n + frame.addedSpins, 0)).toBeLessThanOrEqual(30);
      expect(round.feature.every((frame) => frame.result.scatterCount === 0)).toBe(true);
      expect(round.totalPayout).toBeCloseTo(round.feature.reduce((sum, frame) => sum + frame.result.payout, 0), 2);
    }
  });
});

it('Big Bass calibrates the entire collector feature and demo purchase, not just base spins', () => {
  const choose = (n: number, k: number) => {
    if (k < 0 || k > n) return 0;
    let result = 1;
    for (let i = 1; i <= k; i++) result = result * (n - k + i) / i;
    return result;
  };
  const weights = Bass.SYMBOLS.map(symbol => symbol.weight);
  const freeWeights = Bass.SYMBOLS.map(symbol => symbol.freeWeight ?? symbol.weight);
  const lineUnit = (values: number[]) => {
    const total = values.reduce((a, b) => a + b, 0);
    const wild = values[Bass.SYMBOLS.findIndex(symbol => symbol.isWild)]! / total;
    return Bass.SYMBOLS.reduce((sum, symbol, i) => sum + ([3, 4, 5] as const).reduce((pay, count) => {
      const probability = values[i]! / total + wild;
      return pay + (probability ** count - wild ** count) * (count < 5 ? 1 - probability : 1) * (symbol.pay?.[count] ?? 0);
    }, 0), 0);
  };
  const freeTotal = freeWeights.reduce((a, b) => a + b, 0);
  const wild = freeWeights[Bass.SYMBOLS.findIndex(symbol => symbol.isWild)]! / freeTotal;
  const fish = Bass.SYMBOLS.reduce((sum, symbol, i) => sum + (symbol.isMoney ? freeWeights[i]! / freeTotal : 0), 0);
  const meanMoney = Bass.MONEY_VALUES.reduce((sum, [value, weight]) => sum + value * weight, 0) / Bass.MONEY_VALUES.reduce((sum, [, weight]) => sum + weight, 0);
  const lineReturn = lineUnit(freeWeights) * Bass.LOCAL_LINE_SCALE;
  const collectionReturn = 15 * 14 * wild * fish * meanMoney * Bass.MONEY_ASSIGNMENT_CHANCE;
  const memo = new Map<string, number>();
  const featureEV = (remaining: number, level = 0, progress = 0): number => {
    if (!remaining) return 0;
    const key = `${remaining}:${level}:${progress}`;
    if (memo.has(key)) return memo.get(key)!;
    let expected = lineReturn + collectionReturn * [1, 2, 3, 10][level]!;
    for (let fishermen = 0; fishermen <= 15; fishermen++) {
      const probability = choose(15, fishermen) * wild ** fishermen * (1 - wild) ** (15 - fishermen);
      const upgrades = Math.min(Math.floor((progress + fishermen) / 4), 3 - level);
      const nextLevel = level + upgrades;
      expected += probability * featureEV(remaining - 1 + 10 * upgrades, nextLevel, nextLevel < 3 ? (progress + fishermen) % 4 : 0);
    }
    memo.set(key, expected); return expected;
  };
  const baseTotal = weights.reduce((a, b) => a + b, 0);
  const scatter = weights[Bass.SYMBOLS.findIndex(symbol => symbol.isScatter)]! / baseTotal;
  let fullEV = lineUnit(weights) * Bass.LOCAL_LINE_SCALE;
  for (let count = 3; count <= 15; count++) {
    const probability = choose(15, count) * scatter ** count * (1 - scatter) ** (15 - count);
    fullEV += probability * ((count === 3 ? 2 : count === 4 ? 20 : 200) + featureEV(count === 3 ? 10 : count === 4 ? 15 : 20));
  }
  expect(fullEV).toBeCloseTo(0.9669, 8);
  expect(featureEV(10) / 100).toBeCloseTo(0.9669, 8);
});


it('every Plinko board is symmetric and stays near its stated 99% theoretical return', () => {
  for (const risk of ['easy', 'medium', 'hard', 'expert'] as const) {
    for (let rows = 8; rows <= 16; rows++) {
      const table = Plinko.multipliersFor(risk, rows);
      expect(table).toEqual([...table].reverse());
      let combinations = 1;
      let expected = 0;
      for (let bucket = 0; bucket <= rows; bucket++) {
        if (bucket > 0) combinations = combinations * (rows - bucket + 1) / bucket;
        expected += combinations / 2 ** rows * table[bucket]!;
      }
      expect(expected).toBeGreaterThan(0.987);
      expect(expected).toBeLessThan(0.993);
    }
  }
});
