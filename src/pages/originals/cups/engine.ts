import type { Rng } from '../../../lib/fairness';

/** Cups (find-the-ball) — Stake-style.
 *
 *  N cups, ball under exactly one. Player picks a cup; correct = win.
 *  Multiplier = 0.99 / (1/N) = 0.99 × N (1% house edge).
 *
 *  Difficulty determines cup count:
 *    easy   → 3 cups, ×2.97
 *    medium → 4 cups, ×3.96
 *    hard   → 5 cups, ×4.95 */

export type Difficulty = 'easy' | 'medium' | 'hard';

const HOUSE_EDGE = 0.01;

export function cupCountFor(d: Difficulty): number {
  return d === 'easy' ? 3 : d === 'medium' ? 4 : 5;
}

export function multiplierFor(d: Difficulty): number {
  const n = cupCountFor(d);
  return +((1 - HOUSE_EDGE) * n).toFixed(2);
}

export function ballPosition(rng: Rng, d: Difficulty): number {
  return rng.nextInt(cupCountFor(d));
}

export type CupsResult = {
  ballAt: number;
  pickedAt: number;
  win: boolean;
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number, picked: number, d: Difficulty): CupsResult {
  const ballAt = ballPosition(rng, d);
  const win = picked === ballAt;
  const multiplier = win ? multiplierFor(d) : 0;
  return {
    ballAt,
    pickedAt: picked,
    win,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
