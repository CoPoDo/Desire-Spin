import type { Rng } from '../../../lib/fairness';

/** Plinko (Stake-style):
 *  Drop a ball through a triangular peg layout. At each row, the ball
 *  deflects 50/50 left or right. After `rows` deflections, the ball lands
 *  in bucket k, where k = number of right deflections (range 0..rows).
 *
 *  Multipliers per bucket depend on row count + risk level.
 *  Distribution is binomial — middle buckets have the lowest multipliers,
 *  edges the highest. Tuned to ~99% RTP across all configurations. */

export type Risk = 'easy' | 'medium' | 'hard' | 'expert';

function expertTable(rows: number, maximum: number): number[] {
  const combinations = (n: number, k: number) => {
    let value = 1;
    for (let i = 1; i <= k; i++) value = value * (n - k + i) / i;
    return value;
  };
  const result = Array.from({ length: rows + 1 }, () => 0);
  result[0] = maximum;
  result[rows] = maximum;
  const edgeEv = (2 * maximum) / 2 ** rows;
  const remainingEv = Math.max(0, 0.99 - edgeEv);
  const raw = result.map((_, bucket) => {
    const distance = Math.min(bucket, rows - bucket);
    return distance === 0 ? 0 : 0.22 ** (distance - 1);
  });
  const rawEv = raw.reduce((sum, value, bucket) => sum + value * combinations(rows, bucket) / 2 ** rows, 0);
  const scale = rawEv > 0 ? remainingEv / rawEv : 0;
  return result.map((value, bucket) => value || +(raw[bucket]! * scale).toFixed(2));
}

/** Public Stake-style multiplier tables. Indexed by [risk][rows]. */
const TABLES: Record<Risk, Record<number, number[]>> = {
  easy: {
    8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    9:  [5.6, 2.0, 1.6, 1.0, 0.7, 0.7, 1.0, 1.6, 2.0, 5.6],
    10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    11: [8.4, 3.0, 1.9, 1.3, 1.0, 0.7, 0.7, 1.0, 1.3, 1.9, 3.0, 8.4],
    12: [10, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10],
    13: [8.1, 4.0, 3.0, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3.0, 4.0, 8.1],
    14: [7.1, 4.0, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4.0, 7.1],
    15: [15, 8.0, 3.0, 2.0, 1.5, 1.1, 1.0, 0.7, 0.7, 1.0, 1.1, 1.5, 2.0, 3.0, 8.0, 15],
    16: [16, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16],
  },
  medium: {
    8:  [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
    9:  [18, 4.0, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4.0, 18],
    10: [22, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22],
    11: [24, 6.0, 3.0, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3.0, 6.0, 24],
    12: [33, 11, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
    13: [43, 13, 6.0, 3.0, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3.0, 6.0, 13, 43],
    14: [58, 15, 7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15, 58],
    15: [88, 18, 11, 5.0, 3.0, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3.0, 5.0, 11, 18, 88],
    16: [110, 41, 10, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10, 41, 110],
  },
  hard: {
    8:  [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
    9:  [43, 7.0, 2.0, 0.6, 0.2, 0.2, 0.6, 2.0, 7.0, 43],
    10: [76, 10, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10, 76],
    11: [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
    12: [170, 24, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24, 170],
    13: [260, 37, 11, 4.0, 1.0, 0.2, 0.2, 0.2, 0.2, 1.0, 4.0, 11, 37, 260],
    14: [420, 56, 18, 5.0, 1.9, 0.3, 0.2, 0.2, 0.2, 0.2, 1.9, 5.0, 18, 56, 420],
    15: [620, 83, 27, 8.0, 3.0, 0.5, 0.2, 0.2, 0.2, 0.2, 0.2, 3.0, 8.0, 27, 83, 620],
    16: [1000, 130, 26, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26, 130, 1000],
  },
  expert: Object.fromEntries(
    [8, 9, 10, 11, 12, 13, 14, 15, 16].map((rows, index) => [
      rows,
      expertTable(rows, [120, 220, 400, 650, 1000, 1800, 3000, 5000, 10000][index]!),
    ]),
  ),
};

export function multipliersFor(risk: Risk, rows: number): number[] {
  const fallback = TABLES[risk][16]!;
  return TABLES[risk][rows] ?? fallback;
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
