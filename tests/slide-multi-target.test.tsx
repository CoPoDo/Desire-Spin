import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng, sha256Hex, type Rng } from '../src/lib/fairness';
import { SlideGame } from '../src/pages/originals/slide';
import * as Slide from '../src/pages/originals/slide/engine';

const fixture = vi.hoisted(() => ({ game: {} as any, credits: 1000, nonce: 0 }));
vi.mock('../src/game-context', () => ({ useGame: () => fixture.game }));
vi.mock('../src/components/layout/OriginalPageLayout', () => ({ OriginalPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: vi.fn() }));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<any>>();
  const ignored = new Set(['animate', 'initial', 'exit', 'transition', 'layout']);
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!cache.has(tag)) cache.set(tag, React.forwardRef((props: any, ref) => React.createElement(tag, { ...Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))), ref })));
      return cache.get(tag);
    } }),
  };
});
const SERVER = 'slide-multi-target';
const CLIENT = 'client';
const stream = (nonce = 0) => createRng(SERVER, CLIENT, nonce);
function fixed(float: number): Rng {
  return { next: vi.fn(() => float), nextInt: () => { throw Error('Unexpected integer draw'); }, weighted: () => { throw Error('Unexpected weighted draw'); }, state: () => ({ nonce: 0, cursor: 0, floatIdx: 0 }) };
}
function matchingNonce(min: number, max: number) {
  for (let nonce = 0; nonce < 10000; nonce++) { const stop = Slide.rollSlide(stream(nonce)); if (stop >= min && stop < max) return nonce; }
  throw Error('No matching nonce');
}

// Operator sources verified 2026-10-08:
// https://stake.com/blog/how-to-play-slide-on-stake (multiple independently
// sized targets, inclusive wins, presets/shuffle, re-bet, aggregate stop limits)
// https://stake.com/casino/games/slide (2% house edge)
// https://stake.com/provably-fair/game-events links the primary formula at:
// https://bitcointalk.org/index.php?topic=5278260.0
// Hosted hash-chain input and provider's higher target range are NOT claimed.
describe('Slide shared-result wager math', () => {
  it('settles independent amounts and duplicate targets against one random draw', () => {
    const rng = fixed(0.3);
    const bets = [{ amount: 3, target: 2 }, { amount: 4, target: 5 }, { amount: 2, target: 2.5 }, { amount: 1, target: 2 }];
    const round = Slide.playRound(rng, bets);
    expect(rng.next).toHaveBeenCalledTimes(1);
    expect(round.stop).toBe(3.26);
    expect(round.bets.map(bet => bet.stop)).toEqual([3.26, 3.26, 3.26, 3.26]);
    expect(round.bets.map(bet => bet.payout)).toEqual([6, 0, 5, 2]);
    expect(round.bets.map(bet => bet.win)).toEqual([true, false, true, true]);
    expect(round).toMatchObject({ totalStake: 10, payout: 13, multiplier: 1.3, net: 3 });
    bets[0]!.amount = 99;
    expect(round.bets[0]!.amount).toBe(3);
  });

  it('uses the published 32-bit +1 denominator and 2% edge with disclosed local caps', () => {
    for (const integer of [0, 1, 4294, 123456, 2 ** 31, 2 ** 32 - 1]) {
      const expected = Math.max(1, Math.floor(Math.min((2 ** 32 / (integer + 1)) * 0.98, 1_000_000) * 100) / 100);
      expect(Slide.rollSlide(fixed(integer / 2 ** 32))).toBe(expected);
    }
    expect(Slide.rollSlide(fixed(0))).toBe(Slide.SLIDE_MAX_TARGET);
    expect(Slide.rollSlide(fixed(0.5))).toBe(1.95);
    expect(Slide.winChanceFor(2)).toBeCloseTo(49, 7);
    const winningIntegers = Math.floor((2 ** 32 * 0.98) / 2);
    expect(Slide.play(fixed((winningIntegers - 1) / 2 ** 32), 3, 2)).toMatchObject({ stop: 2, win: true, payout: 6 });
    expect(Slide.play(fixed(winningIntegers / 2 ** 32), 3, 2)).toMatchObject({ stop: 1.99, win: false, payout: 0 });
  });

  it('keeps exact target equality winning at binary floating-point boundaries', () => {
    for (const target of [1.28, 2.56, 5.12, 10.24, 20.48, 40.96, 81.92, 163.84, 327.68, 655.36]) {
      const count = Math.floor(2 ** 32 * 98 / Math.round(target * 100));
      expect(Slide.play(fixed((count - 1) / 2 ** 32), 1, target)).toMatchObject({ stop: target, win: true, payout: target });
      expect(Slide.play(fixed(count / 2 ** 32), 1, target).win).toBe(false);
      expect(Slide.winChanceFor(target)).toBe(count / 2 ** 32 * 100);
    }
  });

  it('rounds each winning return to cents before summing and preserves aggregate net', () => {
    const result = Slide.playRound(fixed(0.1), [{ amount: 0.01, target: 1.5 }, { amount: 0.01, target: 1.5 }, { amount: 0.1, target: 100 }]);
    expect(result.bets.map(bet => bet.payout)).toEqual([0.02, 0.02, 0]);
    expect(result).toMatchObject({ totalStake: 0.12, payout: 0.04, net: -0.08 });
    expect(Slide.slideReturnFor(0.1, 1.15)).toBe(0.12);
    expect(Slide.playRound(fixed(0.1), [{ amount: 0.1, target: 1.15 }, { amount: 0.1, target: 1.15 }]).payout).toBe(0.24);
  });

  it('rejects the entire invalid or oversized slip before drawing instead of silently trimming bets', () => {
    const valid = { amount: 1, target: 2 };
    const cases = [[], Array(11).fill(valid), [{ amount: 10000, target: 2 }, valid],
      ...[NaN, Infinity, -1, 0, 0.001, 10001].map(amount => [valid, { amount, target: 2 }]),
      ...[NaN, Infinity, 0, 1, 1.001, 2.555, 1000001].map(target => [valid, { amount: 1, target }])];
    for (const bets of cases) {
      const rng = fixed(0.3);
      expect(Slide.slideStake(bets)).toBeNull();
      expect(() => Slide.playRound(rng, bets)).toThrow(RangeError);
      expect(rng.next).not.toHaveBeenCalled();
    }
    expect(Slide.slideStake(Array(10).fill({ amount: 1000, target: 1000000 }))).toBe(10000);
    for (const value of [NaN, Infinity, -1, 1]) expect(() => Slide.rollSlide(fixed(value))).toThrow(RangeError);
  });

  it('replays the entire slip deterministically without changing legacy single-target shape', () => {
    const bets = [{ amount: 1, target: 2 }, { amount: 3, target: 5 }];
    const first = Slide.playRound(stream(12), bets);
    expect(Slide.playRound(stream(12), bets)).toEqual(first);
    const { amount: _amount, ...single } = first.bets[0]!;
    expect(Slide.play(stream(12), 1, 2)).toEqual(single);
  });
});

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); fixture.credits = 1000; fixture.nonce = 0;
  frames = new Map(); nextFrame = 1;
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { const id = nextFrame++; frames.set(id, callback); return id; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { frames.delete(id); }));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  fixture.game = {
    balance: {
      get balance() { return fixture.credits; }, getBalance: () => fixture.credits,
      canAfford: (amount: number) => Number.isFinite(amount) && amount > 0 && amount <= fixture.credits,
      debit: vi.fn((amount: number) => { if (!Number.isFinite(amount) || amount <= 0 || amount > fixture.credits) return false; fixture.credits = +(fixture.credits - amount).toFixed(2); return true; }),
      credit: vi.fn((amount: number) => { fixture.credits = +(fixture.credits + amount).toFixed(2); return true; }),
    },
    fairness: { hash: sha256Hex(SERVER), consumeNonce: vi.fn(() => ({ serverSeed: SERVER, clientSeed: CLIENT, nonce: fixture.nonce++ })) },
    history: { record: vi.fn() }, session: { recordSpin: vi.fn() }, sound: { play: vi.fn() },
  };
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const row = (number: number) => within(screen.getByRole('group', { name: `Wager ${number}` }));
const setAmount = (number: number, amount: number) => fireEvent.change(row(number).getByRole('spinbutton', { name: 'Bet amount' }), { target: { value: `${amount}` } });
const setTarget = (number: number, target: number) => fireEvent.change(row(number).getByRole('spinbutton', { name: 'Target multiplier' }), { target: { value: `${target}` } });
function setupMixedBets() {
  setAmount(1, 3);
  fireEvent.click(screen.getByRole('button', { name: 'Add target' }));
  setAmount(2, 4);
  fireEvent.click(screen.getByRole('button', { name: 'Add target' }));
  setAmount(3, 2); setTarget(3, 2.5);
}
function expectLedger(stake: number, payout: number, nonce = 0) {
  expect(fixture.game.balance.debit).toHaveBeenCalledExactlyOnceWith(stake);
  expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
  expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ game: 'Slide', bet: stake, payout, multiplier: payout / stake, nonce }));
  expect(fixture.game.session.recordSpin).toHaveBeenCalledExactlyOnceWith(stake, payout, false);
  expect(fixture.credits).toBe(+(1000 - stake + payout).toFixed(2));
}

async function finishFrame() {
  await act(async () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(3000)); await Promise.resolve(); });
}

describe('Slide multiple-target controls and atomic accounting', () => {
  it('preserves defaults and debits/credits one complete slip under rapid click and hotkey input', () => {
    fixture.nonce = matchingNonce(2.5, 5); const nonce = fixture.nonce;
    render(<StrictMode><SlideGame /></StrictMode>);
    expect(row(1).getByRole('spinbutton', { name: 'Bet amount' })).toHaveValue(1);
    expect(row(1).getByRole('spinbutton', { name: 'Target multiplier' })).toHaveValue(2);
    setupMixedBets();
    const button = screen.getByRole('button', { name: /^Slide ·/ });
    act(() => { fireEvent.click(button); fireEvent.click(button); fireEvent.keyDown(window, { key: ' ' }); });
    expectLedger(9, 11, nonce);
    expect(fixture.game.balance.credit).toHaveBeenCalledExactlyOnceWith(11);
    expect(screen.getByRole('button', { name: 'Add target' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Re-add last bets' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove target 2' })).toBeDisabled();
    screen.getAllByRole('spinbutton').forEach(input => expect(input).toBeDisabled());
    fireEvent.change(row(1).getByRole('spinbutton', { name: 'Bet amount' }), { target: { value: '99' } });
    expect(row(1).getByRole('spinbutton', { name: 'Bet amount' })).toHaveValue(3);
  });

  it('skips safely, ignores a stale frame and keeps actual returns unchanged when draft targets change', async () => {
    fixture.nonce = matchingNonce(2.5, 5); const nonce = fixture.nonce;
    const view = render(<SlideGame />); setupMixedBets();
    fireEvent.click(screen.getByRole('button', { name: /^Slide ·/ }));
    const stale = [...frames.values()][0]!;
    const skip = screen.getByRole('button', { name: 'Skip animation' });
    act(() => { fireEvent.click(skip); fireEvent.click(skip); stale(3000); });
    expect(frames.size).toBe(0);
    const results = screen.getByRole('region', { name: 'Slide round results' });
    expect(results).toHaveTextContent('6.00'); expect(results).toHaveTextContent('5.00'); expect(results).toHaveTextContent('Lost · 0.00');
    expect(screen.getByRole('status')).toHaveTextContent('2 of 3 targets won');
    expect(screen.getByRole('status')).toHaveTextContent('Returned 11.00');
    setAmount(1, 9); setTarget(1, 100);
    expect(screen.getByRole('status')).toHaveTextContent('Returned 11.00');
    fireEvent.click(screen.getByRole('button', { name: 'Remove target 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Re-add last bets' }));
    expect(row(1).getByRole('spinbutton', { name: 'Bet amount' })).toHaveValue(3);
    expect(row(3).getByRole('spinbutton', { name: 'Target multiplier' })).toHaveValue(2.5);
    expectLedger(9, 11, nonce);
    view.unmount(); await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expectLedger(9, 11, nonce);
  });

  it.each(['unmount', 'pagehide', 'hidden'] as const)('settles once and cancels playback on %s without orphaning automatic rounds', async departure => {
    const view = render(<StrictMode><SlideGame /></StrictMode>);
    fireEvent.click(screen.getByRole('button', { name: 'Add target' }));
    const expected = Slide.playRound(stream(), [{ amount: 1, target: 2 }, { amount: 1, target: 5 }]);
    fireEvent.click(screen.getByRole('button', { name: 'auto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Autobet' }));
    const stale = [...frames.values()][0]!;
    if (departure === 'unmount') view.unmount();
    else act(() => {
      if (departure === 'hidden') { vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden'); document.dispatchEvent(new Event('visibilitychange')); }
      else { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pagehide')); }
    });
    const sounds = fixture.game.sound.play.mock.calls.length;
    await act(async () => { stale(3000); await vi.advanceTimersByTimeAsync(10000); });
    expect(frames.size).toBe(0); expectLedger(2, expected.payout);
    expect(fixture.game.sound.play).toHaveBeenCalledTimes(sounds);
    if (departure !== 'unmount') {
      expect(screen.getByRole('button', { name: 'Start Autobet' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Add target' })).toBeEnabled();
    }
  });

  it('does not partially accept unaffordable, over-limit or stale-balance slips', () => {
    fixture.credits = 1.5;
    render(<SlideGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Add target' }));
    expect(screen.getByRole('button', { name: /^Slide ·/ })).toBeDisabled();
    fireEvent.keyDown(window, { key: ' ' });
    expect(fixture.game.balance.debit).not.toHaveBeenCalled();
    expect(fixture.game.fairness.consumeNonce).not.toHaveBeenCalled();
    setAmount(1, 10000); setAmount(2, 1);
    expect(screen.getByRole('alert')).toHaveTextContent('at most 10,000');
    fireEvent.keyDown(window, { key: ' ' });
    expect(fixture.game.balance.debit).not.toHaveBeenCalled();
    setAmount(1, 0.1); setAmount(2, 0.1);
    fixture.game.balance.debit.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /^Slide ·/ }));
    expect(fixture.game.balance.debit).toHaveBeenCalledExactlyOnceWith(0.2);
    expect(fixture.game.fairness.consumeNonce).not.toHaveBeenCalled();
    expect(fixture.game.history.record).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Slide ·/ })).toBeEnabled();
  });

  it('supports the local target cap, safe removal and all published target presets', () => {
    render(<SlideGame />);
    const add = screen.getByRole('button', { name: 'Add target' });
    act(() => { for (let count = 0; count < 20; count++) fireEvent.click(add); });
    expect(screen.getAllByRole('group')).toHaveLength(Slide.SLIDE_MAX_BETS);
    expect(add).toBeDisabled();
    fireEvent.click(row(1).getByRole('button', { name: '100×' }));
    expect(row(1).getByRole('spinbutton', { name: 'Target multiplier' })).toHaveValue(100);
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    fireEvent.click(row(1).getByRole('button', { name: 'Shuffle' }));
    expect(row(1).getByRole('spinbutton', { name: 'Target multiplier' })).toHaveValue(2000);
    fireEvent.click(screen.getByRole('button', { name: 'Remove target 10' }));
    expect(add).toBeEnabled(); expect(screen.getAllByRole('group')).toHaveLength(9);
    expect(fixture.game.fairness.consumeNonce).not.toHaveBeenCalled();
  });

  it('stops autobet using combined net loss even if one target wins', async () => {
    fixture.nonce = matchingNonce(2, 5); const nonce = fixture.nonce;
    render(<SlideGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Add target' }));
    setAmount(2, 5); // First target returns 2, second loses: net -4.
    fireEvent.click(screen.getByRole('button', { name: 'auto' }));
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[inputs.length - 1]!, { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start Autobet' }));
    await finishFrame();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expectLedger(6, 2, nonce);
    expect(screen.getByText('Loss limit reached.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Autobet' })).toBeEnabled();
  });

  it('returns the whole debit once if result calculation fails and never creates a partial history entry', async () => {
    render(<SlideGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Add target' }));
    vi.spyOn(Slide, 'playRound').mockImplementationOnce(() => { throw Error('Test calculation failure'); });
    fireEvent.click(screen.getByRole('button', { name: /^Slide ·/ }));
    expect(fixture.credits).toBe(1000);
    expect(fixture.game.balance.debit).toHaveBeenCalledExactlyOnceWith(2);
    expect(fixture.game.balance.credit).toHaveBeenCalledExactlyOnceWith(2);
    expect(fixture.game.history.record).not.toHaveBeenCalled();
    expect(fixture.game.session.recordSpin).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('credits were returned');
    expect(screen.getByRole('button', { name: /^Slide ·/ })).toBeEnabled();
  });
});
