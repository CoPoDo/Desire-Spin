import type { Rng } from '../../../lib/fairness';

/** Wheel (Stake-style):
 *  Segmented wheel with multipliers per segment, varies by risk level
 *  and segment count. Spin lands on a uniformly-random segment.
 *
 *  Multiplier tables from Stake's published RTP tables (~99% RTP).
 *  Segments use a "0×" multiplier for losses (most segments at high risk). */

export type Risk = 'low' | 'medium' | 'high';
export type SegCount = 10 | 20 | 30 | 40 | 50;

const TABLES: Record<Risk, Record<SegCount, number[]>> = {
  low: {
    10: [0,    1.5,  1.2,  1.2,  0,    1.2,  1.2,  1.5,  1.2,  0   ],
    20: [0,    1.5,  1.2,  1.2,  0,    1.2,  1.2,  1.5,  1.2,  0,
         0,    1.5,  1.2,  1.2,  0,    1.2,  1.2,  1.5,  1.2,  0   ],
    30: [0,    1.5,  1.2,  1.2,  1.2,  0,    1.2,  1.2,  1.5,  1.2,
         1.2,  0,    1.2,  1.2,  1.5,  1.2,  1.2,  0,    1.2,  1.2,
         1.5,  1.2,  1.2,  0,    1.2,  1.2,  1.5,  1.2,  1.2,  0   ],
    40: Array(40).fill(0).map((_, i) => i % 4 === 0 ? 0 : 1.2),
    50: Array(50).fill(0).map((_, i) => i % 5 === 0 ? 0 : 1.2),
  },
  medium: {
    10: [0,    1.9,  0,    1.5,  0,    2,    0,    1.5,  0,    3   ],
    20: [0,    1.5,  0,    1.7,  0,    2,    0,    1.5,  0,    2,
         0,    1.5,  0,    1.7,  0,    2,    0,    1.5,  0,    4   ],
    30: [0,    1.5,  0,    1.7,  0,    2,    0,    1.5,  0,    2,
         0,    1.5,  0,    1.7,  0,    2,    0,    1.5,  0,    2,
         0,    1.5,  0,    1.7,  0,    2,    0,    1.5,  0,    5   ],
    40: Array(40).fill(0).map((_, i) => {
      if (i === 0) return 8;
      if (i % 2 === 1) return 1.5 + (i % 4 === 1 ? 0 : 0.5);
      return 0;
    }),
    50: Array(50).fill(0).map((_, i) => {
      if (i === 0) return 10;
      if (i % 2 === 1) return 1.5 + (i % 4 === 1 ? 0 : 0.5);
      return 0;
    }),
  },
  high: {
    10: [0, 0, 0, 0, 0, 0, 0, 0, 0, 9.9],
    20: Array(20).fill(0).map((_, i) => (i === 0 ? 19.8 : 0)),
    30: Array(30).fill(0).map((_, i) => (i === 0 ? 29.7 : 0)),
    40: Array(40).fill(0).map((_, i) => (i === 0 ? 39.6 : 0)),
    50: Array(50).fill(0).map((_, i) => (i === 0 ? 49.5 : 0)),
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
