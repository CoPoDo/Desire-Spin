import type { Rng } from '../../../lib/fairness';

/** Race — pick 1 of 8 horses, watch the race, win if your horse crosses
 *  first. Every horse pays 99% RTP at its individual win probability.
 *
 *  Real Stake-style horse race has 8+ runners with named jockeys and
 *  visible odds. We expanded from 4 → 8 to better match that feel.
 *
 *  Per-horse win weights (sum to 100):
 *    Thunderbolt   : 30% →  3.30×    favourite
 *    Midnight Star : 20% →  4.95×
 *    Lightning Bolt: 14% →  7.071×
 *    Wild Wind     : 10% →  9.90×
 *    Iron Hoof     :  8% → 12.375×
 *    Dust Devil    :  7% → 14.143×
 *    Solar Flare   :  6% → 16.50×
 *    Long Shot     :  5% → 19.80×    biggest payout, hardest to land
 */

export const HORSE_COUNT = 8;
const HOUSE_EDGE = 0.01;

export const HORSE_NAMES = [
  'Thunderbolt',
  'Midnight Star',
  'Lightning Bolt',
  'Wild Wind',
  'Iron Hoof',
  'Dust Devil',
  'Solar Flare',
  'Long Shot',
] as const;

export const HORSE_LABELS = HORSE_NAMES;

export const HORSE_COLORS = [
  '#ff5560', // red — favourite
  '#22d3ee', // cyan
  '#1fff7a', // green
  '#ffc62a', // gold
  '#a78bfa', // violet
  '#ff8a40', // orange
  '#5fb8ff', // sky blue
  '#ff7ad9', // pink — long shot
] as const;

/** Per-horse win weights (sum to 100). */
export const HORSE_WEIGHTS = [30, 20, 14, 10, 8, 7, 6, 5] as const;
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
