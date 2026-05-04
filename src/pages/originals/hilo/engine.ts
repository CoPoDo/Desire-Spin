import type { Rng } from '../../../lib/fairness';

/** Hilo (Stake-style):
 *  Player guesses if next card is higher (or equal) or lower (or equal)
 *  than the current card. Each correct guess multiplies the running win;
 *  one wrong guess ends the round at 0.
 *
 *  Cards: rank 1-13 (Ace=1, J=11, Q=12, K=13). Suit randomized for
 *  display only — math is purely on rank with infinite-deck assumption.
 *
 *  Per-step multiplier formulas (1% house edge / 99% RTP):
 *    higherOrEqual(c): chance = (14 - c) / 13;   mult = 0.99 / chance
 *    lowerOrEqual(c):  chance = c / 13;          mult = 0.99 / chance
 *  When chance ≥ 50% the player gets a fair bet; when < 50% a risky one. */

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
  return (14 - rank) / 13;
}
export function lowerChance(rank: number): number {
  return rank / 13;
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
