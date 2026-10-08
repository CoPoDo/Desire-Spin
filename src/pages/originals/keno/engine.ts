import type { Rng } from '../../../lib/fairness';

/** Keno (Stake-style):
 *  40-number grid (1..40). Player picks 1-10. The house draws 10 numbers.
 *  Payout depends on the # of player picks AND the # of matches with the
 *  draw. Multiplier tables vary by risk.
 *
 *  These values are captured from the public Stake game UI; no local
 *  rescaling is applied. */

export type Risk = 'classic' | 'low' | 'medium' | 'high';

export const TOTAL = 40;
export const DRAW_COUNT = 10;
export const MAX_PICKS = 10;

/** Exact rendered Stake Original payout rows, captured2026-10-08.
 * Classic is a distinct table, not a duplicate of Low.
 * Source: https://stake.com/casino/games/keno . */
export const KENO_TABLES: Record<Risk, Record<number, number[]>> = {
  "classic": {
    "1": [
      0,
      3.96
    ],
    "2": [
      0,
      1.9,
      4.5
    ],
    "3": [
      0,
      1,
      3.1,
      10.4
    ],
    "4": [
      0,
      0.8,
      1.8,
      5,
      22.5
    ],
    "5": [
      0,
      0.25,
      1.4,
      4.1,
      16.5,
      36
    ],
    "6": [
      0,
      0,
      1,
      3.68,
      7,
      16.5,
      40
    ],
    "7": [
      0,
      0,
      0.47,
      3,
      4.5,
      14,
      31,
      60
    ],
    "8": [
      0,
      0,
      0,
      2.2,
      4,
      13,
      22,
      55,
      70
    ],
    "9": [
      0,
      0,
      0,
      1.55,
      3,
      8,
      15,
      44,
      60,
      85
    ],
    "10": [
      0,
      0,
      0,
      1.4,
      2.25,
      4.5,
      8,
      17,
      50,
      80,
      100
    ]
  },
  "low": {
    "1": [
      0.7,
      1.85
    ],
    "2": [
      0,
      2,
      3.8
    ],
    "3": [
      0,
      1.1,
      1.38,
      26
    ],
    "4": [
      0,
      0,
      2.2,
      7.9,
      90
    ],
    "5": [
      0,
      0,
      1.5,
      4.2,
      13,
      300
    ],
    "6": [
      0,
      0,
      1.1,
      2,
      6.2,
      100,
      700
    ],
    "7": [
      0,
      0,
      1.1,
      1.6,
      3.5,
      15,
      225,
      700
    ],
    "8": [
      0,
      0,
      1.1,
      1.5,
      2,
      5.5,
      39,
      100,
      800
    ],
    "9": [
      0,
      0,
      1.1,
      1.3,
      1.7,
      2.5,
      7.5,
      50,
      250,
      1000
    ],
    "10": [
      0,
      0,
      1.1,
      1.2,
      1.3,
      1.8,
      3.5,
      13,
      50,
      250,
      1000
    ]
  },
  "medium": {
    "1": [
      0.4,
      2.75
    ],
    "2": [
      0,
      1.8,
      5.1
    ],
    "3": [
      0,
      0,
      2.8,
      50
    ],
    "4": [
      0,
      0,
      1.7,
      10,
      100
    ],
    "5": [
      0,
      0,
      1.4,
      4,
      14,
      390
    ],
    "6": [
      0,
      0,
      0,
      3,
      9,
      180,
      710
    ],
    "7": [
      0,
      0,
      0,
      2,
      7,
      30,
      400,
      800
    ],
    "8": [
      0,
      0,
      0,
      2,
      4,
      11,
      67,
      400,
      900
    ],
    "9": [
      0,
      0,
      0,
      2,
      2.5,
      5,
      15,
      100,
      500,
      1000
    ],
    "10": [
      0,
      0,
      0,
      1.6,
      2,
      4,
      7,
      26,
      100,
      500,
      1000
    ]
  },
  "high": {
    "1": [
      0,
      3.96
    ],
    "2": [
      0,
      0,
      17.1
    ],
    "3": [
      0,
      0,
      0,
      81.5
    ],
    "4": [
      0,
      0,
      0,
      10,
      259
    ],
    "5": [
      0,
      0,
      0,
      4.5,
      48,
      450
    ],
    "6": [
      0,
      0,
      0,
      0,
      11,
      350,
      710
    ],
    "7": [
      0,
      0,
      0,
      0,
      7,
      90,
      400,
      800
    ],
    "8": [
      0,
      0,
      0,
      0,
      5,
      20,
      270,
      600,
      900
    ],
    "9": [
      0,
      0,
      0,
      0,
      4,
      11,
      56,
      500,
      800,
      1000
    ],
    "10": [
      0,
      0,
      0,
      0,
      3.5,
      8,
      13,
      63,
      500,
      800,
      1000
    ]
  }
};

export function payoutFor(risk: Risk, picks: number, hits: number): number {
  const table = KENO_TABLES[risk][picks];
  if (!table) return 0;
  return table[hits] ?? 0;
}

/** Full payout table for a (risk, picks) combo. Useful for displaying
 *  the prize ladder. */
export function tableFor(risk: Risk, picks: number): number[] {
  return KENO_TABLES[risk][picks] ?? [];
}

export type KenoDraw = {
  drawn: number[]; // sorted ascending
  hits: number;
  multiplier: number;
  payout: number;
};

/** Draw 10 distinct numbers from 1..40 deterministically from RNG. */
export function drawNumbers(rng: Rng): number[] {
  const all = Array.from({ length: TOTAL }, (_, i) => i + 1);
  // Fisher-Yates shuffle, take the first DRAW_COUNT
  for (let i = TOTAL - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all.slice(0, DRAW_COUNT).sort((a, b) => a - b);
}

export function play(
  rng: Rng,
  bet: number,
  picks: number[],
  risk: Risk,
): KenoDraw {
  const drawn = drawNumbers(rng);
  const drawnSet = new Set(drawn);
  let hits = 0;
  for (const p of picks) if (drawnSet.has(p)) hits++;
  const multiplier = payoutFor(risk, picks.length, hits);
  return {
    drawn,
    hits,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
