import type { Rng } from '../../../lib/fairness';

/** Plinko (Stake-style):
 *  Drop a ball through a triangular peg layout. At each row, the ball
 *  deflects 50/50 left or right. After `rows` deflections, the ball lands
 *  in bucket k, where k = number of right deflections (range 0..rows).
 *
 *  Multipliers per bucket depend on row count + risk level.
 *  Distribution is binomial — middle buckets have the lowest multipliers,
 *  edges the highest. Published table values are preserved without local normalization. */

export type Risk = 'easy' | 'medium' | 'hard' | 'expert';

/** Exact rendered Stake calculator tables, captured2026-10-08.
 * Source: https://stake.com/provably-fair/calculation?game=plinko . */
export const PLINKO_TABLES: Record<Risk, Record<number, number[]>> = {
  "easy": {
    "8": [
      5.6,
      2.1,
      1.1,
      1,
      0.5,
      1,
      1.1,
      2.1,
      5.6
    ],
    "9": [
      5.6,
      2,
      1.6,
      1,
      0.7,
      0.7,
      1,
      1.6,
      2,
      5.6
    ],
    "10": [
      8.9,
      3,
      1.4,
      1.1,
      1,
      0.5,
      1,
      1.1,
      1.4,
      3,
      8.9
    ],
    "11": [
      8.4,
      3,
      1.9,
      1.3,
      1,
      0.7,
      0.7,
      1,
      1.3,
      1.9,
      3,
      8.4
    ],
    "12": [
      10,
      3,
      1.6,
      1.4,
      1.1,
      1,
      0.5,
      1,
      1.1,
      1.4,
      1.6,
      3,
      10
    ],
    "13": [
      8.1,
      4,
      3,
      1.9,
      1.2,
      0.9,
      0.7,
      0.7,
      0.9,
      1.2,
      1.9,
      3,
      4,
      8.1
    ],
    "14": [
      7.1,
      4,
      1.9,
      1.4,
      1.3,
      1.1,
      1,
      0.5,
      1,
      1.1,
      1.3,
      1.4,
      1.9,
      4,
      7.1
    ],
    "15": [
      15,
      8,
      3,
      2,
      1.5,
      1.1,
      1,
      0.7,
      0.7,
      1,
      1.1,
      1.5,
      2,
      3,
      8,
      15
    ],
    "16": [
      16,
      9,
      2,
      1.4,
      1.4,
      1.2,
      1.1,
      1,
      0.5,
      1,
      1.1,
      1.2,
      1.4,
      1.4,
      2,
      9,
      16
    ]
  },
  "medium": {
    "8": [
      13,
      3,
      1.3,
      0.7,
      0.4,
      0.7,
      1.3,
      3,
      13
    ],
    "9": [
      18,
      4,
      1.7,
      0.9,
      0.5,
      0.5,
      0.9,
      1.7,
      4,
      18
    ],
    "10": [
      22,
      5,
      2,
      1.4,
      0.6,
      0.4,
      0.6,
      1.4,
      2,
      5,
      22
    ],
    "11": [
      24,
      6,
      3,
      1.8,
      0.7,
      0.5,
      0.5,
      0.7,
      1.8,
      3,
      6,
      24
    ],
    "12": [
      33,
      11,
      4,
      2,
      1.1,
      0.6,
      0.3,
      0.6,
      1.1,
      2,
      4,
      11,
      33
    ],
    "13": [
      43,
      13,
      6,
      3,
      1.3,
      0.7,
      0.4,
      0.4,
      0.7,
      1.3,
      3,
      6,
      13,
      43
    ],
    "14": [
      58,
      15,
      7,
      4,
      1.9,
      1,
      0.5,
      0.2,
      0.5,
      1,
      1.9,
      4,
      7,
      15,
      58
    ],
    "15": [
      88,
      18,
      11,
      5,
      3,
      1.3,
      0.5,
      0.3,
      0.3,
      0.5,
      1.3,
      3,
      5,
      11,
      18,
      88
    ],
    "16": [
      110,
      41,
      10,
      5,
      3,
      1.5,
      1,
      0.5,
      0.3,
      0.5,
      1,
      1.5,
      3,
      5,
      10,
      41,
      110
    ]
  },
  "hard": {
    "8": [
      29,
      4,
      1.5,
      0.3,
      0.2,
      0.3,
      1.5,
      4,
      29
    ],
    "9": [
      43,
      7,
      2,
      0.6,
      0.2,
      0.2,
      0.6,
      2,
      7,
      43
    ],
    "10": [
      76,
      10,
      3,
      0.9,
      0.3,
      0.2,
      0.3,
      0.9,
      3,
      10,
      76
    ],
    "11": [
      120,
      14,
      5.2,
      1.4,
      0.4,
      0.2,
      0.2,
      0.4,
      1.4,
      5.2,
      14,
      120
    ],
    "12": [
      170,
      24,
      8.1,
      2,
      0.7,
      0.2,
      0.2,
      0.2,
      0.7,
      2,
      8.1,
      24,
      170
    ],
    "13": [
      260,
      37,
      11,
      4,
      1,
      0.2,
      0.2,
      0.2,
      0.2,
      1,
      4,
      11,
      37,
      260
    ],
    "14": [
      420,
      56,
      18,
      5,
      1.9,
      0.3,
      0.2,
      0.2,
      0.2,
      0.3,
      1.9,
      5,
      18,
      56,
      420
    ],
    "15": [
      620,
      83,
      27,
      8,
      3,
      0.5,
      0.2,
      0.2,
      0.2,
      0.2,
      0.5,
      3,
      8,
      27,
      83,
      620
    ],
    "16": [
      1000,
      130,
      26,
      9,
      4,
      2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      2,
      4,
      9,
      26,
      130,
      1000
    ]
  },
  "expert": {
    "8": [
      50,
      4.6,
      1.1,
      0.1,
      0.1,
      0.1,
      1.1,
      4.6,
      50
    ],
    "9": [
      100,
      7.8,
      1.5,
      0.2,
      0.1,
      0.1,
      0.2,
      1.5,
      7.8,
      100
    ],
    "10": [
      201,
      11,
      2,
      0.6,
      0.1,
      0.1,
      0.1,
      0.6,
      2,
      11,
      201
    ],
    "11": [
      324,
      16,
      4,
      1.1,
      0.2,
      0.1,
      0.1,
      0.2,
      1.1,
      4,
      16,
      324
    ],
    "12": [
      619,
      30,
      6,
      1.5,
      0.4,
      0.1,
      0.1,
      0.1,
      0.4,
      1.5,
      6,
      30,
      619
    ],
    "13": [
      1012,
      52,
      10,
      3,
      0.6,
      0.1,
      0.1,
      0.1,
      0.1,
      0.6,
      3,
      10,
      52,
      1012
    ],
    "14": [
      2369,
      80,
      16,
      3,
      1.2,
      0.2,
      0.1,
      0.1,
      0.1,
      0.2,
      1.2,
      3,
      16,
      80,
      2369
    ],
    "15": [
      5000,
      125,
      23,
      6,
      1.8,
      0.2,
      0.1,
      0.1,
      0.1,
      0.1,
      0.2,
      1.8,
      6,
      23,
      125,
      5000
    ],
    "16": [
      10000,
      216,
      26,
      7,
      2.5,
      1.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      1.1,
      2.5,
      7,
      26,
      216,
      10000
    ]
  }
};

export function multipliersFor(risk: Risk, rows: number): number[] {
  const fallback = PLINKO_TABLES[risk][16]!;
  return PLINKO_TABLES[risk][rows] ?? fallback;
}

export type PlinkoDrop = {
  /** Sequence of L/R deflections, one per row. */
  path: ('L' | 'R')[];
  /** Final bucket index (number of R's). */
  bucket: number;
  /** Multiplier for that bucket. */
  multiplier: number;
  /** Bet × multiplier. */
  payout: number;
};

export function dropBall(
  rng: Rng,
  bet: number,
  rows: number,
  risk: Risk,
): PlinkoDrop {
  const r = Math.max(8, Math.min(16, Math.floor(rows)));
  const path: ('L' | 'R')[] = [];
  let bucket = 0;
  for (let i = 0; i < r; i++) {
    if (rng.next() < 0.5) {
      path.push('L');
    } else {
      path.push('R');
      bucket++;
    }
  }
  const mults = multipliersFor(risk, r);
  const multiplier = mults[bucket] ?? 0;
  return {
    path,
    bucket,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
