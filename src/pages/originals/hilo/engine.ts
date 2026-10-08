import type { Rng } from '../../../lib/fairness';

/** Hilo (Stake-style):
 *  Player guesses if next card is higher (or equal) or lower (or equal)
 *  than the current card. Each correct guess multiplies the running win;
 *  one wrong guess ends the round at 0.
 *
 *  Cards: rank 1-13 (Ace=1, J=11, Q=12, K=13). Suit randomized for
 *  display only — math is purely on rank with infinite-deck assumption.
 *
 *  First-pick multiplier formulas (one 1% house edge / 99% round RTP):
 *    higherOrEqual(c): chance = (14 - c) / 13;   mult = 0.99 / chance
 *    lowerOrEqual(c):  chance = c / 13;          mult = 0.99 / chance
 *  At A, Higher excludes another A; at K, Lower excludes another K.
 *  Later picks use fair conditional odds, avoiding a compounded house edge.
 *  Rules: https://stake.com/casino/games/hilo */

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

export function drawCard(rng: Rng): Card {
  const rank = rng.nextInt(13) + 1;
  const suit = SUITS[rng.nextInt(4)]!;
  return { rank, suit };
}

const HOUSE_EDGE = 0.01;

export function higherChance(rank: number): number {
  return (rank === 1 ? 12 : 14 - rank) / 13;
}
export function lowerChance(rank: number): number {
  return (rank === 13 ? 12 : rank) / 13;
}
export function higherMult(rank: number): number {
  const c = higherChance(rank);
  if (c <= 0) return 0;
  return +((1 - HOUSE_EDGE) / c).toFixed(4);
}
export function lowerMult(rank: number): number {
  const c = lowerChance(rank);
  if (c <= 0) return 0;
  return +((1 - HOUSE_EDGE) / c).toFixed(4);
}

export function isWinningGuess(current: number, next: number, direction: 'higher' | 'lower'): boolean {
  if (direction === 'higher') return current === 1 ? next > current : next >= current;
  return current === 13 ? next < current : next <= current;
}

/** Gross streak multiplier, applying the house edge only to the first guess. */
export function advanceMultiplier(current: number, rank: number, direction: 'higher' | 'lower', firstPick: boolean): number {
  const chance = direction === 'higher' ? higherChance(rank) : lowerChance(rank);
  return current * (firstPick ? 1 - HOUSE_EDGE : 1) / chance;
}
