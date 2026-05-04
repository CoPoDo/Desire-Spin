import type { Rng } from '../../../lib/fairness';

/** Video Poker — Jacks or Better.
 *  Standard 5-card draw poker against a paytable.
 *
 *  Steps:
 *    1. Player bets, gets 5 cards
 *    2. Player marks cards to HOLD; the rest are discarded
 *    3. Discarded cards replaced from the deck
 *    4. Final hand evaluated against the paytable
 *
 *  Paytable (Jacks or Better, 9/6 — full pay):
 *    Royal Flush    800×
 *    Straight Flush  50×
 *    Four of a Kind  25×
 *    Full House       9×
 *    Flush            6×
 *    Straight         4×
 *    Three of a Kind  3×
 *    Two Pair         2×
 *    Jacks or Better  1×
 *    All else         0
 *
 *  RTP: ~99.54% with optimal strategy. */

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export type Suit = typeof SUITS[number];
export type Card = { rank: number; suit: Suit };

export function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

/** Sample n distinct cards from a 52-card deck via Fisher-Yates on indices. */
export function dealCards(rng: Rng, n: number, exclude: Card[] = []): Card[] {
  const excluded = new Set(exclude.map((c) => `${c.rank}-${c.suit}`));
  const all: Card[] = [];
  for (let r = 1; r <= 13; r++) {
    for (const s of SUITS) {
      if (!excluded.has(`${r}-${s}`)) all.push({ rank: r, suit: s });
    }
  }
  // Fisher-Yates partial shuffle to pick n
  for (let i = 0; i < n; i++) {
    const j = i + rng.nextInt(all.length - i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all.slice(0, n);
}

export type HandRank =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-of-a-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'jacks-or-better'
  | 'no-win';

const PAY: Record<HandRank, number> = {
  'royal-flush':     800,
  'straight-flush':   50,
  'four-of-a-kind':   25,
  'full-house':        9,
  'flush':             6,
  'straight':          4,
  'three-of-a-kind':   3,
  'two-pair':          2,
  'jacks-or-better':   1,
  'no-win':            0,
};

export function payForRank(r: HandRank): number {
  return PAY[r];
}

export function rankLabel2(r: HandRank): string {
  return ({
    'royal-flush':    'Royal Flush',
    'straight-flush': 'Straight Flush',
    'four-of-a-kind': 'Four of a Kind',
    'full-house':     'Full House',
    'flush':          'Flush',
    'straight':       'Straight',
    'three-of-a-kind': 'Three of a Kind',
    'two-pair':       'Two Pair',
    'jacks-or-better': 'Jacks or Better',
    'no-win':         '—',
  } as Record<HandRank, string>)[r];
}

export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length !== 5) return 'no-win';
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  // Detect straight (incl. Ace-low A-2-3-4-5 and Ace-high 10-J-Q-K-A).
  const distinct = [...new Set(ranks)];
  let isStraight = false;
  let highCard = 0;
  if (distinct.length === 5) {
    if (distinct[4]! - distinct[0]! === 4) {
      isStraight = true;
      highCard = distinct[4]!;
    } else if (distinct[0] === 1 && distinct[1] === 10 && distinct[2] === 11 && distinct[3] === 12 && distinct[4] === 13) {
      // 10-J-Q-K-A
      isStraight = true;
      highCard = 14; // ace high
    }
  }
  if (isStraight && isFlush) {
    return highCard === 14 ? 'royal-flush' : 'straight-flush';
  }

  // Count rank frequencies
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const topCount = groups[0]![1];
  const secondCount = groups[1]?.[1] ?? 0;

  if (topCount === 4) return 'four-of-a-kind';
  if (topCount === 3 && secondCount === 2) return 'full-house';
  if (isFlush) return 'flush';
  if (isStraight) return 'straight';
  if (topCount === 3) return 'three-of-a-kind';
  if (topCount === 2 && secondCount === 2) return 'two-pair';
  if (topCount === 2) {
    const pairRank = groups[0]![0];
    if (pairRank === 1 || pairRank >= 11) return 'jacks-or-better';
  }
  return 'no-win';
}

/** Payout multiplier on bet given a final hand (0 if no-win). */
export function payoutMultiplier(cards: Card[]): { rank: HandRank; multiplier: number } {
  const r = evaluateHand(cards);
  return { rank: r, multiplier: PAY[r] };
}
