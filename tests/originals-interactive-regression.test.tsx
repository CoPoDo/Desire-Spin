import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng, sha256Hex, type Rng } from '../src/lib/fairness';
import * as Blackjack from '../src/pages/originals/blackjack/engine';
import * as Hilo from '../src/pages/originals/hilo/engine';
import * as Mines from '../src/pages/originals/mines/engine';
import * as Tower from '../src/pages/originals/tower/engine';
import * as Pump from '../src/pages/originals/pump/engine';
import * as Poker from '../src/pages/originals/video-poker/engine';
import { BlackjackGame } from '../src/pages/originals/blackjack';
import { HiloGame } from '../src/pages/originals/hilo';
import { MinesGame } from '../src/pages/originals/mines';
import { TowerGame } from '../src/pages/originals/tower';
import { PumpGame } from '../src/pages/originals/pump';
import { VideoPokerGame } from '../src/pages/originals/video-poker';
import { useInteractiveRound } from '../src/pages/originals/_shared/useInteractiveRound';

const fixture = vi.hoisted(() => ({ game: {} as any, credits: 1000, nonce: 0 }));
vi.mock('../src/game-context', () => ({ useGame: () => fixture.game }));
vi.mock('../src/components/layout/OriginalPageLayout', () => ({
  OriginalPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: vi.fn() }));

const SERVER = 'interactive-regression';
const CLIENT = 'client';
const rng = (nonce = 0) => createRng(SERVER, CLIENT, nonce);
const findNonce = (accept: (rng: Rng) => boolean) => {
  for (let nonce = 0; nonce < 10_000; nonce++) if (accept(rng(nonce))) return nonce;
  throw new Error('Fixture seed not found');
};
const tick = (ms = 600) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  fixture.credits = 1000;
  fixture.nonce = 0;
  fixture.game = {
    balance: {
      get balance() { return fixture.credits; },
      canAfford: (amount: number) => Number.isFinite(amount) && amount > 0 && fixture.credits >= amount,
      getBalance: () => fixture.credits,
      debit: vi.fn((amount: number) => {
        if (!Number.isFinite(amount) || amount <= 0 || amount > fixture.credits) return false;
        fixture.credits = +(fixture.credits - amount).toFixed(2);
        return true;
      }),
      credit: vi.fn((amount: number) => {
        fixture.credits = +(fixture.credits + amount).toFixed(2);
        return true;
      }),
    },
    fairness: {
      hash: sha256Hex(SERVER),
      consumeNonce: vi.fn(() => ({ serverSeed: SERVER, clientSeed: CLIENT, nonce: fixture.nonce++ })),
    },
    history: { record: vi.fn() },
    session: { recordSpin: vi.fn() },
    sound: { play: vi.fn() },
  };
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Interactive engine rules', () => {
  it('never redraws any of video poker’s five original cards, including discarded cards', () => {
    for (let n = 0; n < 100; n++) {
      const stream = rng(n);
      const hand = Poker.dealCards(stream, 5);
      const held = [true, false, true, false, false];
      const result = Poker.drawHand(stream, hand, held);
      expect(result[0]).toEqual(hand[0]);
      expect(result[2]).toEqual(hand[2]);
      for (const index of [1, 3, 4]) expect(hand).not.toContainEqual(result[index]);
      expect(new Set(result.map(card => `${card.rank}${card.suit}`)).size).toBe(5);
    }
  });

  it('recognizes royal/ace-low straights and rejects impossible duplicate poker cards', () => {
    const flush = (ranks: number[]): Poker.Card[] => ranks.map(rank => ({ rank, suit: '♠' }));
    expect(Poker.evaluateHand(flush([1, 10, 11, 12, 13]))).toBe('royal-flush');
    expect(Poker.evaluateHand(flush([1, 2, 3, 4, 5]))).toBe('straight-flush');
    expect(Poker.evaluateHand(flush([1, 1, 1, 1, 1]))).toBe('no-win');
    expect(() => Poker.dealCards(rng(), 53)).toThrow(RangeError);
  });

  it('uses Hilo’s strict Ace/King boundary and inclusive middle-rank ties', () => {
    for (let rank = 1; rank <= 13; rank++) {
      for (const direction of ['higher', 'lower'] as const) {
        const wins = Array.from({ length: 13 }, (_, i) => i + 1)
          .filter(next => Hilo.isWinningGuess(rank, next, direction)).length;
        const chance = direction === 'higher' ? Hilo.higherChance(rank) : Hilo.lowerChance(rank);
        expect(wins / 13).toBeCloseTo(chance, 12);
      }
    }
    expect(Hilo.isWinningGuess(1, 1, 'higher')).toBe(false);
    expect(Hilo.isWinningGuess(13, 13, 'lower')).toBe(false);
    expect(Hilo.isWinningGuess(7, 7, 'higher')).toBe(true);
    let multiplier = 1;
    let survival = 1;
    for (let i = 0; i < 8; i++) {
      survival *= Hilo.higherChance(7);
      multiplier = Hilo.advanceMultiplier(multiplier, 7, 'higher', i === 0);
      expect(multiplier * survival).toBeCloseTo(0.99, 10);
    }
  });

  it('ignores invalid Mines indices and automatically settles the final safe tile', () => {
    const round = Mines.startRound(rng(), 2, 24.8);
    expect(round.mineCount).toBe(24);
    for (const invalid of [-1, 25, 1.5, NaN]) expect(Mines.reveal(round, invalid)).toBe(round);
    const safe = Array.from({ length: 25 }, (_, i) => i).find(i => !round.mineSet.has(i))!;
    const next = Mines.reveal(round, safe);
    expect(next.done).toBe(true);
    expect(next.payout).toBe(49.5);
    expect(Mines.cashOut(next)).toBe(next);
    expect(Mines.reveal(next, safe)).toBe(next);
  });

  it('rejects out-of-grid tower picks and retains 98% RTP at every height', () => {
    for (const difficulty of ['easy', 'medium', 'hard', 'expert', 'master'] as const) {
      const round = Tower.startRound(rng(), 1, difficulty);
      const config = Tower.configFor(difficulty);
      for (const invalid of [-1, config.tiles, 1.5, NaN]) expect(Tower.pickTile(round, invalid)).toBe(round);
      for (let row = 1; row <= Tower.ROWS; row++) {
        expect(Tower.multiplierAt(difficulty, row) * ((config.tiles - config.deaths) / config.tiles) ** row)
          .toBeCloseTo(0.98, 5);
      }
    }
  });

  it('matches the official finite Pump payout ladder and rising risk', () => {
    const fixtures: [Pump.Difficulty, number, number, number][] = [
      ['easy', 24, 0.04, 24.50], ['medium', 22, 0.12, 2254],
      ['hard', 20, 0.20, 52067.40], ['expert', 15, 0.40, 3203384.80],
    ];
    for (const [difficulty, max, initialRisk, top] of fixtures) {
      expect(Pump.maxPumpsFor(difficulty)).toBe(max);
      expect(Pump.popProbFor(difficulty)).toBe(initialRisk);
      expect(Pump.popProbFor(difficulty, 1)).toBeGreaterThan(initialRisk);
      expect(Pump.multiplierAt(difficulty, max)).toBeCloseTo(top, 2);
      let round = Pump.newRound(1, difficulty);
      for (let n = 1; n <= max; n++) {
        round = Pump.applyPump(round, true);
        expect(Pump.multiplierAt(difficulty, n) * Pump.survivalChanceFor(difficulty, n)).toBeCloseTo(0.98, 5);
      }
      expect(round.cashed).toBe(true);
      expect(round.payout).toBe(top);
      expect(Pump.applyPump(round, false)).toBe(round);
    }
    expect(Pump.multiplierAt('hard', 3)).toBeCloseTo(1.98, 2);
    expect(Pump.multiplierAt('expert', 10)).toBeCloseTo(1066.73, 2);
  });

  it('auto-stands split 21s and pays even money rather than blackjack', () => {
    const card = (rank: number): Blackjack.Card => ({ rank, suit: '♠' });
    const state: Blackjack.RoundState = {
      hands: [{ cards: [card(10), card(10)], bet: 1, done: false, doubled: false, fromSplit: false }],
      dealer: [card(10), card(7)], initialBet: 1, activeIdx: 0, phase: 'player', payout: 0, outcome: null,
    };
    const aces: Rng = { next: () => 0, nextInt: () => 0, weighted: () => 0, state: () => ({ nonce: 0, cursor: 0, floatIdx: 0 }) };
    const result = Blackjack.split(aces, state);
    expect(result.phase).toBe('done');
    expect(result.payout).toBe(4);
    expect(result.hands.every(hand => hand.done && hand.fromSplit)).toBe(true);
    expect(Blackjack.resolveDealer(aces, result)).toBe(result);
  });
});

describe('Interactive lifecycle accounting', () => {
  it('locks a wager synchronously, settles once, and freezes its fairness identity', () => {
    const { result, unmount } = renderHook(() => useInteractiveRound('Test'));
    act(() => {
      expect(result.current.begin(2)).not.toBeNull();
      expect(result.current.begin(2)).toBeNull();
      fixture.game.fairness.hash = 'rotated-hash';
      expect(result.current.settle(4)).toBe(true);
      expect(result.current.settle(4)).toBe(false);
    });
    unmount();
    expect(fixture.credits).toBe(1002);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledWith(expect.objectContaining({
      bet: 2, payout: 4, serverSeedHash: sha256Hex(SERVER), clientSeed: CLIENT, nonce: 0,
    }));
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
  });

  it.each([BlackjackGame, HiloGame, MinesGame, TowerGame, PumpGame, VideoPokerGame])('rejects an unaffordable %s start without consuming a nonce', (Game) => {
    fixture.credits = 0;
    render(<Game />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(fixture.game.fairness.consumeNonce).not.toHaveBeenCalled();
    expect(fixture.game.history.record).not.toHaveBeenCalled();
  });

  it('cashouts Mines exactly once under rapid input and never credits again on navigation', () => {
    const expected = Mines.startRound(rng(), 1, 3);
    const safe = Array.from({ length: 25 }, (_, i) => i).find(i => !expected.mineSet.has(i))!;
    const { container, unmount } = render(<MinesGame />);
    const tiles = container.querySelectorAll('div.grid-cols-5 > button');
    act(() => { (tiles[safe] as HTMLButtonElement).click(); (tiles[safe] as HTMLButtonElement).click(); });
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    tick();
    const cash = screen.getByRole('button', { name: /Cash Out/ });
    act(() => { cash.click(); cash.click(); });
    const paid = +(Mines.multiplierFor(1, 3)).toFixed(2);
    expect(fixture.credits).toBe(999 + paid);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    unmount(); tick();
    expect(fixture.game.balance.credit).toHaveBeenCalledTimes(1);
  });

  it('refunds unopened Tower bets and cashes out climbed rows on navigation', () => {
    const first = render(<TowerGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet / }));
    first.unmount();
    expect(fixture.credits).toBe(1000);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    const expected = Tower.startRound(rng(1), 1, 'medium');
    const safe = [0, 1, 2].find(i => !expected.skulls[0]!.includes(i))!;
    const second = render(<TowerGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet / }));
    fireEvent.keyDown(window, { key: String(safe + 1) });
    second.unmount();
    expect(fixture.credits).toBe(1000.47);
    expect(fixture.game.history.record).toHaveBeenLastCalledWith(expect.objectContaining({ payout: 1.47, nonce: 1 }));
  });

  it('keeps Hilo guess and cashout mutually exclusive and records the original nonce', () => {
    fixture.nonce = findNonce(stream => {
      const first = Hilo.drawCard(stream);
      const next = Hilo.drawCard(stream);
      return Hilo.isWinningGuess(first.rank, next.rank, 'higher');
    });
    const nonce = fixture.nonce;
    const stream = rng(nonce);
    const first = Hilo.drawCard(stream);
    const payout = +(Hilo.advanceMultiplier(1, first.rank, 'higher', true)).toFixed(2);
    const { unmount } = render(<HiloGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet/ })); tick();
    fireEvent.keyDown(window, { key: 'h' });
    fireEvent.keyDown(window, { key: ' ' });
    expect(fixture.game.history.record).not.toHaveBeenCalled();
    unmount(); tick();
    expect(fixture.credits).toBe(999 + payout);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledWith(expect.objectContaining({ payout, nonce }));
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
  });

  it('settles a pumped round when navigating during animation', () => {
    fixture.nonce = findNonce(stream => Pump.pumpOnce(stream, 'medium', 0));
    const { unmount } = render(<PumpGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet / })); tick();
    const pump = screen.getByRole('button', { name: /^Pump$/ });
    act(() => { pump.click(); pump.click(); });
    unmount(); tick();
    expect(fixture.credits).toBe(1000.11);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
  });

  it('automatically stands Blackjack on departure instead of cancelling the wager', () => {
    fixture.nonce = findNonce(stream => Blackjack.dealRound(stream, 1).phase === 'player');
    const stream = rng(fixture.nonce);
    const expected = Blackjack.stand(stream, Blackjack.dealRound(stream, 1));
    const { unmount } = render(<BlackjackGame />);
    const deal = screen.getByRole('button', { name: /^Deal/ });
    act(() => { deal.click(); deal.click(); });
    unmount(); tick();
    expect(fixture.credits).toBe(999 + expected.payout);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
  });

  it('resolves the selected poker draw on departure without refunding a dealt hand', () => {
    const stream = rng();
    const initial = Poker.dealCards(stream, 5);
    const expected = Poker.drawHand(stream, initial, [true, false, false, false, false]);
    const payout = Poker.payoutMultiplier(expected).multiplier;
    const { container, unmount } = render(<VideoPokerGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Deal/ })); tick();
    // The first card is the first button in the hand, before Draw.
    const hold = container.querySelector('button[aria-pressed]');
    expect(hold).toBeDefined();
    fireEvent.click(hold!);
    unmount(); tick();
    expect(fixture.credits).toBe(999 + payout);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledWith(expect.objectContaining({ payout, nonce: 0 }));
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
  });

  it('rejects stakes above the simulation limit before debiting or consuming a nonce', () => {
    fixture.credits = 50_000;
    const { result } = renderHook(() => useInteractiveRound('Test'));
    act(() => { expect(result.current.begin(10_001)).toBeNull(); });
    expect(fixture.game.balance.debit).not.toHaveBeenCalled();
    expect(fixture.game.fairness.consumeNonce).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/10,000/);
  });

  it('debits a Blackjack double exactly once and settles the combined stake', () => {
    fixture.nonce = findNonce(stream => Blackjack.dealRound(stream, 1).phase === 'player');
    const stream = rng(fixture.nonce);
    const expected = Blackjack.double(stream, Blackjack.dealRound(stream, 1));
    const { unmount } = render(<BlackjackGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Deal/ })); tick();
    const double = screen.getByRole('button', { name: /^Double$/ });
    act(() => { double.click(); double.click(); });
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(2);
    expect(fixture.credits).toBe(998 + expected.payout);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledWith(expect.objectContaining({ bet: 2, payout: expected.payout }));
    unmount(); tick();
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
  });

  it('settles a Hilo loss before animation and never refunds it on departure', () => {
    fixture.nonce = findNonce(stream => {
      const first = Hilo.drawCard(stream);
      return !Hilo.isWinningGuess(first.rank, Hilo.drawCard(stream).rank, 'higher');
    });
    const { unmount } = render(<HiloGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet/ })); tick();
    fireEvent.keyDown(window, { key: 'h' });
    expect(fixture.game.history.record).toHaveBeenCalledWith(expect.objectContaining({ payout: 0 }));
    unmount(); tick();
    expect(fixture.credits).toBe(999);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.balance.credit).not.toHaveBeenCalled();
  });

  it('draws Video Poker once even when Draw is clicked twice before rendering', () => {
    const stream = rng();
    const initial = Poker.dealCards(stream, 5);
    const expected = Poker.drawHand(stream, initial, [false, false, false, false, false]);
    const payout = Poker.payoutMultiplier(expected).multiplier;
    const { unmount } = render(<VideoPokerGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Deal/ })); tick();
    const draw = screen.getByRole('button', { name: /^Draw$/ });
    act(() => { draw.click(); draw.click(); });
    unmount(); tick();
    expect(fixture.credits).toBe(999 + payout);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
  });

  it('settles on pagehide and leaves a playable completed state for browser back-cache restore', () => {
    const { unmount } = render(<PumpGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Bet / })); tick();
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(fixture.credits).toBe(1000);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /^Play Again$/ }));
    expect(fixture.credits).toBe(999);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(2);
    unmount(); tick();
    expect(fixture.credits).toBe(1000);
    expect(fixture.game.history.record).toHaveBeenCalledTimes(2);
  });

});
