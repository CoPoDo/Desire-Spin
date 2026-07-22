import type { Rng } from '../../../lib/fairness';

/** Flip — Stake-style streak coin game.
 *
 *  Player picks Heads or Tails. RNG flips a coin. Each correct call
 *  doubles the multiplier (slightly less than 2× to bake in the 1%
 *  house edge per flip). Player can cash out at any time.
 *
 *  Per-flip multiplier: 1.98× (= 2 × 0.99). Streak of N → 1.98^N.
 *  This matches the "Stake Plinko + Crash style coin streak" math. */

export type Side = 'heads' | 'tails';

const HOUSE_EDGE = 0.01;
const PER_FLIP = 2 * (1 - HOUSE_EDGE); // 1.98

export function multiplierAfter(streak: number): number {
  return +Math.pow(PER_FLIP, streak).toFixed(4);
}

export function flip(rng: Rng): Side {
  return rng.nextInt(2) === 0 ? 'heads' : 'tails';
}
