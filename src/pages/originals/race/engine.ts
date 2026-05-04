import type { Rng } from '../../../lib/fairness';

/** Race — pick a horse, watch the race, win if your horse crosses first.
 *
 *  4 horses, all with equal win probability. Multiplier per horse:
 *  0.99 / (1/4) = 3.96 (1% house edge / 99% RTP).
 *
 *  Animation: each horse "advances" via a sequence of small RNG-driven
 *  steps, but the FINAL winner is pre-determined at round start so the
 *  outcome is provably-fair from a single RNG seed. */

export const HORSE_COUNT = 4;
const HOUSE_EDGE = 0.01;

export const HORSE_LABELS = ['🟥 1', '🟦 2', '🟩 3', '🟨 4'] as const;
export const HORSE_COLORS = ['#ff5560', '#22d3ee', '#1fff7a', '#ffc62a'] as const;

export function multiplierPerHorse(): number {
  return +((1 - HOUSE_EDGE) * HORSE_COUNT).toFixed(2);
}

export function pickWinner(rng: Rng): number {
  return rng.nextInt(HORSE_COUNT);
}

export type RaceResult = {
  winner: number;
  picked: number;
  win: boolean;
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number, picked: number): RaceResult {
  const winner = pickWinner(rng);
  const win = winner === picked;
  const multiplier = win ? multiplierPerHorse() : 0;
  return {
    winner,
    picked,
    win,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
