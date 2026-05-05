import type { Rng } from '../../../lib/fairness';

/** Wheel (Stake-style):
 *  Segmented wheel with multipliers per segment, varies by risk level
 *  and segment count. Spin lands on a uniformly-random segment.
 *
 *  RTP target: 99% for every (risk, segmentCount) combo. The expected
 *  value of one spin is `mean(multipliers)` so each table must sum to
 *  `0.99 × segmentCount`. Each table below is hand-verified to satisfy
 *  that constraint; see the smoke test in tests/originals.test.ts.
 *
 *  Risk character:
 *    - LOW: many small wins, no zeros; sum 0.99×N spread across all
 *      segments using a 1.5 / 1.2 / 0.9 mix.
 *    - MEDIUM: half the segments are zero; the winning ones pay
 *      1.5–4× with a single bigger headline at the end.
 *    - HIGH: only the last segment pays — single jackpot per spin
 *      worth 0.99×N. Rare but huge.
 */

export type Risk = 'low' | 'medium' | 'high';
export type SegCount = 10 | 20 | 30 | 40 | 50;

/** LOW base pattern (10 segs, sum 9.9 — RTP 99%). Replicated for
 *  larger segment counts so the wheel scales linearly without breaking
 *  RTP. Every entry is 0 / 0.9 / 1.2 / 1.5 — no decimals beyond a digit. */
const LOW_PATTERN_10: number[] = [1.5, 1.5, 1.2, 1.2, 1.2, 1.2, 1.2, 0.9, 0, 0];

/** MEDIUM base pattern (10 segs, sum 9.9 — RTP 99%). Half-zero with a
 *  3× headline at the last position. Replicated for larger N. */
const MEDIUM_PATTERN_10: number[] = [0, 1.9, 0, 1.5, 0, 2, 0, 1.5, 0, 3];

function repeatPattern(pattern: number[], times: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < times; i++) out.push(...pattern);
  return out;
}

/** HIGH: one jackpot at the last segment worth 0.99×N. */
function highTable(n: number): number[] {
  const arr = new Array<number>(n).fill(0);
  arr[n - 1] = +(0.99 * n).toFixed(2);
  return arr;
}

const TABLES: Record<Risk, Record<SegCount, number[]>> = {
  low: {
    10: LOW_PATTERN_10,
    20: repeatPattern(LOW_PATTERN_10, 2),
    30: repeatPattern(LOW_PATTERN_10, 3),
    40: repeatPattern(LOW_PATTERN_10, 4),
    50: repeatPattern(LOW_PATTERN_10, 5),
  },
  medium: {
    10: MEDIUM_PATTERN_10,
    20: repeatPattern(MEDIUM_PATTERN_10, 2),
    30: repeatPattern(MEDIUM_PATTERN_10, 3),
    40: repeatPattern(MEDIUM_PATTERN_10, 4),
    50: repeatPattern(MEDIUM_PATTERN_10, 5),
  },
  high: {
    10: highTable(10),
    20: highTable(20),
    30: highTable(30),
    40: highTable(40),
    50: highTable(50),
  },
};

export function multipliersFor(risk: Risk, segments: SegCount): number[] {
  return TABLES[risk][segments];
}

export type WheelSpin = {
  segment: number;
  multiplier: number;
  payout: number;
  totalSegments: number;
};

export function spin(rng: Rng, bet: number, risk: Risk, segments: SegCount): WheelSpin {
  const mults = multipliersFor(risk, segments);
  const idx = rng.nextInt(mults.length);
  const m = mults[idx]!;
  return {
    segment: idx,
    multiplier: m,
    payout: +(bet * m).toFixed(2),
    totalSegments: mults.length,
  };
}
