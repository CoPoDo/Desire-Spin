import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng, sha256Hex, type Rng } from '../src/lib/fairness';
import * as Blackjack from '../src/pages/originals/blackjack/engine';
import * as Baccarat from '../src/pages/originals/baccarat/engine';
import * as DragonTiger from '../src/pages/originals/dragon-tiger/engine';
import { BlackjackGame } from '../src/pages/originals/blackjack';
import { DragonTigerGame } from '../src/pages/originals/dragon-tiger';
import { BaccaratGame } from '../src/pages/originals/baccarat';

const fixture = vi.hoisted(() => ({ game: {} as any, credits: 1000, nonce: 0 }));
vi.mock('../src/game-context', () => ({ useGame: () => fixture.game }));
vi.mock('../src/components/layout/OriginalPageLayout', () => ({
  OriginalPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: vi.fn() }));
const SERVER = 'table-rules-regression';
const CLIENT = 'client';
const stream = (nonce = 0) => createRng(SERVER, CLIENT, nonce);

function ints(values: number[]): Rng {
  let index = 0;
  return {
    next: () => { throw new Error('Unexpected float'); },
    nextInt: (max) => {
      const value = values[index++];
      if (value === undefined || value < 0 || value >= max) throw new Error(`Unexpected draw ${index}, max ${max}`);
      return value;
    },
    weighted: () => { throw new Error('Unexpected weighted draw'); },
    state: () => ({ nonce: 0, cursor: index, floatIdx: 0 }),
  };
}
const cards = (...ranks: number[]) => ints(ranks.flatMap(rank => [rank - 1, 0]));
function blackjackNonce(accept: (round: Blackjack.RoundState) => boolean) {
  for (let n = 0; n < 20000; n++) if (accept(Blackjack.dealRound(stream(n), 1))) return n;
  throw new Error('No matching Blackjack seed');
}
function resolvedBlackjack(nonce: number, insured: boolean, bet = 1) {
  const rng = stream(nonce);
  let round = Blackjack.dealRound(rng, bet);
  if (round.phase === 'insurance') round = Blackjack.chooseInsurance(round, insured);
  while (round.phase === 'player') round = Blackjack.stand(rng, round);
  return round;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  fixture.credits = 1000;
  fixture.nonce = 0;
  fixture.game = {
    balance: {
      get balance() { return fixture.credits; },
      getBalance: () => fixture.credits,
      debit: vi.fn((amount: number) => {
        if (!Number.isFinite(amount) || amount <= 0 || amount > fixture.credits) return false;
        fixture.credits = +(fixture.credits - amount).toFixed(2); return true;
      }),
      credit: vi.fn((amount: number) => { fixture.credits = +(fixture.credits + amount).toFixed(2); return true; }),
    },
    fairness: {
      hash: sha256Hex(SERVER),
      consumeNonce: vi.fn(() => ({ serverSeed: SERVER, clientSeed: CLIENT, nonce: fixture.nonce++ })),
    },
    history: { record: vi.fn() }, session: { recordSpin: vi.fn() }, sound: { play: vi.fn() },
  };
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

// Primary rule sources, verified 2026-10-08:
// https://stake.com/casino/games/blackjack (Ace insurance, 2:1, natural 3:2)
// https://stake.com/casino/games/pragmatic-play-live-lobby-blackjack (half-stake convention)
// https://stake.com/casino/games/baccarat (drawing matrix and main payouts)
// https://games.evolution.com/live-casino/live-baccarat/ (pair-bet variant)
// https://games.evolution.com/live-casino/dragon-tiger/ (tie and suited tie)
// https://www.sagaming.com/cert/bmm-south-africa.pdf (canonical half-stake tie)
describe('Blackjack insurance and preserved table rules', () => {
  it('offers insurance before peeking and blocks every hand action until a decision', () => {
    const rng = cards(9, 7, 1, 13);
    const round = Blackjack.dealRound(rng, 10);
    expect(round.phase).toBe('insurance');
    expect(round.payout).toBe(0);
    expect(round.hands[0]!.outcome).toBeUndefined();
    const cursor = rng.state();
    for (const move of [Blackjack.hit, Blackjack.stand, Blackjack.double, Blackjack.split, Blackjack.resolveDealer]) {
      expect(move(rng, round)).toBe(round);
    }
    expect(rng.state()).toEqual(cursor);
    expect(Blackjack.canSplit(round)).toBe(false);
    const insured = Blackjack.chooseInsurance(round, true);
    expect(insured.phase).toBe('done');
    expect(insured.insurance).toEqual({ bet: 5, payout: 15 });
    expect(Blackjack.roundStake(insured)).toBe(15);
    expect(insured.payout).toBe(15);
    expect(insured.outcome).toBe('push');
    expect(insured.hands[0]!.outcome).toBe('dealer-win');
    expect(Blackjack.chooseInsurance(insured, true)).toBe(insured);
    expect(Blackjack.chooseInsurance(round, false).payout).toBe(0);
    expect(round.phase).toBe('insurance'); // immutable transition
  });

  it.each([10, 9])('insurance on a natural is equivalent to even money with dealer hole %s', hole => {
    const round = Blackjack.dealRound(cards(1, 13, 1, hole), 10);
    expect(round.phase).toBe('insurance');
    const insured = Blackjack.chooseInsurance(round, true);
    expect(insured.phase).toBe('done');
    expect(insured.payout - Blackjack.roundStake(insured)).toBe(10);
    expect(insured.payout).toBe(25);
    const declined = Blackjack.chooseInsurance(round, false);
    expect(declined.payout).toBe(hole === 10 ? 10 : 25);
  });

  it('a failed insurance bet stays in total stake while ordinary play continues', () => {
    const rng = cards(10, 9, 1, 6);
    const round = Blackjack.chooseInsurance(Blackjack.dealRound(rng, 10), true);
    expect(round.phase).toBe('player');
    expect(round.insurance).toEqual({ bet: 5, payout: 0 });
    const done = Blackjack.stand(rng, round);
    expect(done.dealer).toHaveLength(2); // dealer stands on soft 17
    expect(done.payout).toBe(20);
    expect(Blackjack.roundStake(done)).toBe(15);
  });

  it('preserves split/double bets and non-natural 21 after declined insurance', () => {
    const rng = cards(8, 8, 1, 6, 3, 2, 10, 10);
    let round = Blackjack.chooseInsurance(Blackjack.dealRound(rng, 10), false);
    round = Blackjack.split(rng, round);
    round = Blackjack.double(rng, round);
    round = Blackjack.double(rng, round);
    expect(round.phase).toBe('done');
    expect(round.hands.map(hand => hand.bet)).toEqual([20, 20]);
    expect(round.hands.map(hand => hand.outcome)).toEqual(['player-win', 'player-win']);
    expect(round.payout).toBe(80);
    expect(Blackjack.roundStake(round)).toBe(40);
  });

  it('preserves immediate naturals without an Ace upcard and split Ace restrictions', () => {
    expect(Blackjack.dealRound(cards(1, 10, 10, 8), 10).payout).toBe(25);
    expect(Blackjack.dealRound(cards(1, 10, 10, 1), 10).payout).toBe(10);
    const rng = cards(1, 1, 10, 7, 10, 9);
    const done = Blackjack.split(rng, Blackjack.dealRound(rng, 10));
    expect(done.phase).toBe('done');
    expect(done.hands.every(hand => hand.done && hand.fromSplit)).toBe(true);
    expect(done.payout).toBe(40);
  });

  it('uses whole cents without ever charging more than half the main stake', () => {
    for (const [bet, cost] of [[10, 5], [10.01, 5], [0.03, 0.01], [0.01, 0]]) {
      const round = Blackjack.dealRound(cards(9, 7, 1, 10), bet);
      expect(Blackjack.insuranceCost(round)).toBe(cost);
      expect(cost).toBeLessThanOrEqual(bet / 2);
      if (cost === 0) expect(Blackjack.chooseInsurance(round, true)).toBe(round);
    }
  });
});

describe('Blackjack insurance UI and one-round accounting', () => {
  it('hides the dealer hole card until the choice and debits/settles rapid input exactly once', () => {
    fixture.nonce = blackjackNonce(r => r.phase === 'insurance' && Blackjack.handValue(r.dealer).blackjack && !Blackjack.handValue(r.hands[0]!.cards).blackjack);
    const nonce = fixture.nonce;
    const { unmount } = render(<StrictMode><BlackjackGame /></StrictMode>);
    const deal = screen.getByRole('button', { name: /^Deal ·/ });
    act(() => { fireEvent.click(deal); fireEvent.click(deal); fireEvent.keyDown(window, { key: ' ' }); });
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).not.toHaveBeenCalled();
    const dealer = within(screen.getByRole('region', { name: 'Dealer hand' }));
    expect(dealer.getByRole('img', { name: 'Hidden dealer card' })).toBeInTheDocument();
    expect(dealer.getAllByRole('img')).toHaveLength(2);
    expect(dealer.queryByText('21 (soft)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hit' })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(220));
    const buy = screen.getByRole('button', { name: /^Buy insurance/ });
    act(() => { fireEvent.click(buy); fireEvent.click(buy); fireEvent.keyDown(window, { key: 'd' }); });
    expect(fixture.game.balance.debit.mock.calls.map(([amount]: [number]) => amount)).toEqual([1, 0.5]);
    expect(fixture.credits).toBe(1000);
    expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      game: 'Blackjack', bet: 1.5, payout: 1.5, multiplier: 1, nonce, serverSeedHash: sha256Hex(SERVER), clientSeed: CLIENT,
    }));
    expect(screen.queryByRole('img', { name: 'Hidden dealer card' })).not.toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pagehide')); });
    unmount();
    expect(fixture.game.balance.credit).toHaveBeenCalledTimes(1);
    expect(fixture.game.session.recordSpin).toHaveBeenCalledExactlyOnceWith(1.5, 1.5, false);
  });

  it.each(['unmount', 'pagehide'] as const)('declines an unanswered offer and settles every hand on %s', departure => {
    fixture.nonce = blackjackNonce(r => r.phase === 'insurance' && !Blackjack.handValue(r.dealer).blackjack);
    const expected = resolvedBlackjack(fixture.nonce, false);
    const { unmount } = render(<BlackjackGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Deal ·/ }));
    if (departure === 'pagehide') {
      act(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pagehide')); });
      expect(screen.queryByRole('group', { name: 'Insurance decision' })).not.toBeInTheDocument();
    }
    unmount();
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ bet: 1, payout: expected.payout }));
    expect(fixture.credits).toBe(+(999 + expected.payout).toFixed(2));
  });

  it('settles purchased, losing insurance together with the hand when leaving during animation', () => {
    fixture.nonce = blackjackNonce(r => r.phase === 'insurance' && !Blackjack.handValue(r.dealer).blackjack && !Blackjack.handValue(r.hands[0]!.cards).blackjack);
    const expected = resolvedBlackjack(fixture.nonce, true);
    const { unmount } = render(<BlackjackGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Deal ·/ }));
    act(() => vi.advanceTimersByTime(220));
    fireEvent.click(screen.getByRole('button', { name: /^Buy insurance/ }));
    expect(fixture.game.history.record).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Hidden dealer card' })).toBeInTheDocument();
    unmount();
    expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ bet: 1.5, payout: expected.payout }));
    expect(fixture.credits).toBe(+(998.5 + expected.payout).toFixed(2));
  });

  it('keeps the decline action usable when insurance is unaffordable', () => {
    fixture.credits = 1;
    fixture.nonce = blackjackNonce(r => r.phase === 'insurance');
    render(<BlackjackGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Deal ·/ }));
    act(() => vi.advanceTimersByTime(220));
    expect(screen.getByRole('button', { name: /^Buy insurance/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'No insurance' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'No insurance' }));
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: 'Insurance decision' })).not.toBeInTheDocument();
  });

  it.each([true, false])('offers insurance on a player natural and settles the selected choice (%s)', accept => {
    fixture.nonce = blackjackNonce(r => r.phase === 'insurance' && Blackjack.handValue(r.hands[0]!.cards).blackjack);
    const expected = resolvedBlackjack(fixture.nonce, accept);
    render(<BlackjackGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Deal ·/ }));
    expect(screen.getByText(/same as taking even money/)).toBeInTheDocument();
    expect(fixture.game.history.record).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(220));
    fireEvent.click(screen.getByRole('button', { name: accept ? /^Buy insurance/ : 'No insurance' }));
    expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ bet: accept ? 1.5 : 1, payout: expected.payout }));
    if (accept) expect(fixture.credits).toBe(1001);
  });

  it('a one-cent saved stake remains playable with insurance disabled', () => {
    fixture.nonce = blackjackNonce(r => r.phase === 'insurance');
    render(<BlackjackGame />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Bet amount' }), { target: { value: '0.01' } });
    fireEvent.click(screen.getByRole('button', { name: /^Deal ·/ }));
    act(() => vi.advanceTimersByTime(220));
    expect(screen.getByRole('button', { name: /^Buy insurance/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'No insurance' }));
    expect(fixture.game.balance.debit).toHaveBeenCalledExactlyOnceWith(0.01);
  });
});

describe('Baccarat public draw and payout matrix', () => {
  it('checks every starting total and every possible third-card value against the published draw table', () => {
    const allowedThirds = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [0, 1, 2, 3, 4, 5, 6, 7, 9], [2, 3, 4, 5, 6, 7], [4, 5, 6, 7], [6, 7], [], [], [],
    ];
    for (let p = 0; p <= 9; p++) for (let b = 0; b <= 9; b++) for (let third = 0; third <= 9; third++) {
      const natural = p >= 8 || b >= 8;
      const playerDraws = !natural && p <= 5;
      const bankerDraws = !natural && (playerDraws ? allowedThirds[b]!.includes(third) : b <= 5);
      const round = Baccarat.play(cards(10, p || 10, 10, b || 10, ...(playerDraws ? [third || 10] : []), ...(bankerDraws ? [2] : [])));
      expect(round.player.length, `P${p}, B${b}, third ${third}`).toBe(playerDraws ? 3 : 2);
      expect(round.banker.length, `P${p}, B${b}, third ${third}`).toBe(bankerDraws ? 3 : 2);
      expect(round.playerTotal).toBe((p + (playerDraws ? third : 0)) % 10);
      expect(round.bankerTotal).toBe((b + (bankerDraws ? 2 : 0)) % 10);
    }
  });

  it('pays commission and pairs independently, pushes main bets on ties, and tests original pair cards only', () => {
    const banker = Baccarat.play(cards(4, 4, 9, 10));
    expect(Baccarat.payoutFor('banker', 10, banker)).toBe(19.5);
    expect(Baccarat.payoutFor('player', 10, banker)).toBe(0);
    expect(Baccarat.payoutFor('playerPair', 10, banker)).toBe(120);
    const tie = Baccarat.play(cards(4, 4, 4, 4));
    expect(Baccarat.payoutFor('tie', 10, tie)).toBe(90);
    expect(Baccarat.payoutFor('player', 10, tie)).toBe(10);
    expect(Baccarat.payoutFor('banker', 10, tie)).toBe(10);
    expect(Baccarat.payoutFor('bankerPair', 10, tie)).toBe(120);
    const laterPair = Baccarat.play(cards(1, 2, 3, 4, 1));
    expect(laterPair.playerPair).toBe(false);
    expect(Baccarat.payoutFor('playerPair', 10, laterPair)).toBe(0);
    expect(Baccarat.play(cards(10, 11, 4, 4)).playerPair).toBe(false); // equal value is not equal rank
  });
});

describe('Eight-deck Dragon Tiger canonical ties', () => {
  it('uses distinct physical cards, allows cross-deck suited ties, and settles all bet positions', () => {
    expect(DragonTiger.payoutMultiplier('suitedTie', 'dragon', true)).toBe(0);
    const bets: { kind: DragonTiger.BetKind; amount: number }[] = ['dragon', 'tiger', 'tie', 'suitedTie'].map(kind => ({ kind: kind as DragonTiger.BetKind, amount: 2 }));
    const suited = DragonTiger.play(ints([0, 51]), bets); // A spades in decks 0 and 1
    expect(suited.dragon).toEqual({ rank: 1, suit: 'spades', deck: 0 });
    expect(suited.tiger).toEqual({ rank: 1, suit: 'spades', deck: 1 });
    expect(suited.perBet.map(bet => bet.returned)).toEqual([1, 1, 24, 102]);
    expect(suited.totalStake).toBe(8);
    expect(suited.totalReturn).toBe(128);
    const unsuited = DragonTiger.play(ints([0, 12]), bets);
    expect(unsuited.winner).toBe('tie');
    expect(unsuited.perBet.map(bet => bet.returned)).toEqual([1, 1, 24, 0]);
    const aceLoses = DragonTiger.play(ints([0, 11]), bets);
    expect(aceLoses.tiger.rank).toBe(13);
    expect(aceLoses.winner).toBe('tiger');
    expect(aceLoses.perBet.map(bet => bet.returned)).toEqual([0, 4, 0, 0]);
  });

  it('exhaustively verifies all 415 second-card choices and exact eight-deck RTP for each bet', () => {
    const bets: { kind: DragonTiger.BetKind; amount: number }[] = ['dragon', 'tiger', 'tie', 'suitedTie'].map(kind => ({ kind: kind as DragonTiger.BetKind, amount: 2 }));
    const paid = [0, 0, 0, 0];
    let ties = 0;
    let suited = 0;
    // Every first-card rank; suit/deck symmetry leaves the same probabilities.
    for (let first = 0; first < 13; first++) for (let second = 0; second < 415; second++) {
      const round = DragonTiger.play(ints([first, second]), bets);
      expect(round.tiger).not.toEqual(round.dragon);
      if (round.winner === 'tie') ties++;
      if (round.perBet[3]!.returned > 0) suited++;
      round.perBet.forEach((bet, i) => { paid[i]! += bet.returned; });
    }
    const count = 13 * 415;
    expect(ties / count).toBeCloseTo(31 / 415, 12);
    expect(suited / count).toBeCloseTo(7 / 415, 12);
    expect(paid[0]! / (count * 2)).toBeCloseTo(1 - 31 / 830, 12);
    expect(paid[1]! / (count * 2)).toBeCloseTo(1 - 31 / 830, 12);
    expect(paid[2]! / (count * 2)).toBeCloseTo(12 * 31 / 415, 12);
    expect(paid[3]! / (count * 2)).toBeCloseTo(51 * 7 / 415, 12);
  });

  it.each([['Baccarat', BaccaratGame], ['Dragon Tiger', DragonTigerGame]] as const)('%s settles mixed bets once before playback and survives immediate departure', (name, Game) => {
    const bets = name === 'Baccarat'
      ? ['player', 'banker', 'tie', 'playerPair', 'bankerPair'] as const
      : ['dragon', 'tiger', 'tie', 'suitedTie'] as const;
    const { unmount } = render(<Game />);
    if (name === 'Baccarat') {
      for (const label of [/^Player 2×/, /^Banker 1.95×/, /^Tie 9×/, /^Player Pair/, /^Banker Pair/]) fireEvent.click(screen.getByRole('button', { name: label }));
    } else {
      for (const label of [/Dragon · 2×/, /Tiger · 2×/, /^Tie · 12×/, /^Suited Tie · 51×/]) fireEvent.click(screen.getByRole('button', { name: label }));
    }
    const expected = name === 'Baccarat'
      ? (() => { const round = Baccarat.play(stream()); return (bets as readonly Baccarat.BetKind[]).reduce((sum, bet) => sum + Baccarat.payoutFor(bet, 1, round), 0); })()
      : DragonTiger.play(stream(), (bets as readonly DragonTiger.BetKind[]).map(kind => ({ kind, amount: 1 }))).totalReturn;
    const deal = screen.getByRole('button', { name: /^Deal ·/ });
    act(() => { fireEvent.click(deal); fireEvent.click(deal); });
    expect(fixture.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ game: name, bet: bets.length, payout: expected }));
    unmount();
    act(() => vi.advanceTimersByTime(2000));
    expect(fixture.game.history.record).toHaveBeenCalledTimes(1);
    expect(fixture.credits).toBe(+(1000 - bets.length + expected).toFixed(2));
  });
});
