import type { Rng } from '../../../lib/fairness';

/** Stake Flip: one 2% house edge across a maximum twenty-flip round.
 * Source: https://stake.com/casino/games/flip (98%, 1,027,604.48x ceiling). */
export type Side = 'heads' | 'tails';
export const MAX_FLIPS = 20;
export const FLIP_MAX_MULTIPLIER = .98 * 2 ** MAX_FLIPS;
export function multiplierAfter(streak: number): number {
  const flips = Math.max(0, Math.min(MAX_FLIPS, Math.floor(streak)));
  return flips === 0 ? 1 : +(.98 * 2 ** flips).toFixed(4);
}

export function flip(rng: Rng): Side {
  return rng.nextInt(2) === 0 ? 'heads' : 'tails';
}
