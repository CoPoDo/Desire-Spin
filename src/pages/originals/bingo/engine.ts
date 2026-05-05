import type { Rng } from '../../../lib/fairness';

/** Bingo — classic 5×5 player card with FREE center, 40 sequential
 *  number draws from 1–75. Numbers per column follow standard layout:
 *
 *      B (col 0): 1..15   (5 numbers)
 *      I (col 1): 16..30  (5)
 *      N (col 2): 31..45  (4 + FREE in centre)
 *      G (col 3): 46..60  (5)
 *      O (col 4): 61..75  (5)
 *
 *  Win condition: at least one completed line (row, column, diagonal).
 *  12 lines are scored — 5 rows + 5 cols + 2 diagonals. The middle row,
 *  middle column and both diagonals only need 4 numbers because the
 *  FREE square pre-marks itself.
 *
 *  Pay table (line count) — calibrated for ~98.5% RTP @ 40 draws via
 *  Monte Carlo (was 0.4% RTP at 12 draws — players almost never won):
 *    0 lines :  0×        (P ≈ 55.3%)
 *    1 line  :  1.4×      (P ≈ 32.0%)
 *    2 lines :  3×        (P ≈ 10.0%)
 *    3 lines :  6×        (P ≈ 2.2%)
 *    4 lines : 15×        (P ≈ 0.4%)
 *    5+ lines: 50×        (P ≈ 0.1%, capped tier)
 */

export const COLUMN_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
] as const;

export const COLUMN_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

export const DRAW_COUNT = 40;

export const PAY_TABLE: Record<number, number> = {
  0: 0,
  1: 1.4,
  2: 3,
  3: 6,
  4: 15,
  5: 50, // 5+ lines (capped tier)
};

/** Generate a 5×5 bingo card. tiles[0..24] in row-major order. The
 *  centre tile (index 12) is always 0 (FREE). */
export function generateCard(rng: Rng): number[] {
  const tiles: number[] = new Array(25);
  for (let col = 0; col < 5; col++) {
    const [lo, hi] = COLUMN_RANGES[col]!;
    const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    // Pick 5 distinct numbers via partial Fisher-Yates shuffle
    for (let i = 0; i < 5; i++) {
      const j = i + rng.nextInt(pool.length - i);
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    for (let row = 0; row < 5; row++) {
      const idx = row * 5 + col;
      tiles[idx] = col === 2 && row === 2 ? 0 /* FREE */ : pool[row]!;
    }
  }
  return tiles;
}

/** Draw `count` distinct numbers from 1..75. */
export function drawNumbers(rng: Rng, count: number): number[] {
  const all = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = 0; i < count; i++) {
    const j = i + rng.nextInt(75 - i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all.slice(0, count);
}

/** All 12 line definitions as arrays of card indices (length 5 each;
 *  the FREE centre at index 12 is always-marked so middle row/col +
 *  both diagonals only need 4 actual draws). */
export const LINES: number[][] = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14], // middle row (has FREE)
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22], // middle column (has FREE)
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24], // ↘ (has FREE)
  [4, 8, 12, 16, 20], // ↙ (has FREE)
];

export function computeLineMatches(
  _card: number[],
  marked: Set<number>,
): number[] {
  const completed: number[] = [];
  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i]!;
    const allMarked = line.every((idx) => marked.has(idx));
    if (allMarked) completed.push(i);
  }
  return completed;
}

export type BingoResult = {
  card: number[];
  draws: number[];
  marked: Set<number>;
  completedLines: number[];
  lineCount: number;
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number): BingoResult {
  const card = generateCard(rng);
  const draws = drawNumbers(rng, DRAW_COUNT);
  const drawnSet = new Set(draws);
  const marked = new Set<number>();
  marked.add(12); // FREE
  for (let i = 0; i < 25; i++) {
    if (i === 12) continue;
    if (drawnSet.has(card[i]!)) marked.add(i);
  }
  const completedLines = computeLineMatches(card, marked);
  const lineCount = completedLines.length;
  const tier = Math.min(5, lineCount);
  const multiplier = PAY_TABLE[tier] ?? 0;
  return {
    card,
    draws,
    marked,
    completedLines,
    lineCount,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
