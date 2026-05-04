import type { Rng } from '../../../lib/fairness';

/** Race — pick 1 of 4 horses, watch the race, win if your horse crosses first.
 *
 *  Horses have different win probabilities (favourite → long shot) so each
 *  pick has its own risk/reward profile. Every horse pays 99% RTP at its
 *  individual win probability:
 *
 *    Horse 1 — Favourite : P=40%   →  2.475×
 *    Horse 2 — Strong    : P=27%   →  3.667×
 *    Horse 3 — Decent    : P=20%   →  4.95×
 *    Horse 4 — Long shot : P=13%   →  7.615×
 *
 *  Animation: race plays for ~3.4s before reveal. The winner is pre-decided
 *  by the fair RNG so the outcome is deterministic from the seeds. */

export const HORSE_COUNT = 4;
const HOUSE_EDGE = 0.01;

export const HORSE_LABELS = ['🟥 1', '🟦 2', '🟩 3', '🟨 4'] as const;
export const HORSE_COLORS = ['#ff5560', '#22d3ee', '#1fff7a', '#ffc62a'] as const;
export const HORSE_NAMES = ['Favourite', 'Strong', 'Decent', 'Long shot'] as const;

/** Per-horse win weights (sum to 100). */
export const HORSE_WEIGHTS = [40, 27, 20, 13] as const;
const TOTAL_WEIGHT = 100;

export function multiplierForHorse(idx: number): number {
  const p = HORSE_WEIGHTS[idx]! / TOTAL_WEIGHT;
  return +((1 - HOUSE_EDGE) / p).toFixed(3);
}

export function pickWinner(rng: Rng): number {
  const r = rng.nextInt(TOTAL_WEIGHT);
  let acc = 0;
  for (let i = 0; i < HORSE_COUNT; i++) {
    acc += HORSE_WEIGHTS[i]!;
    if (r < acc) return i;
  }
  return HORSE_COUNT - 1;
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
  const multiplier = win ? multiplierForHorse(picked) : 0;
  return {
    winner,
    picked,
    win,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
