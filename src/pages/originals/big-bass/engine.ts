import type { Rng } from '../../../lib/fairness';

/** Big Bass — fishing-themed 5-reel slot. Match 3+ identical symbols
 *  ANYWHERE on the 5-reel set (not just leftmost-consecutive) — that
 *  rule combined with the previous payout values gave a 4.6% RTP, which
 *  meant players almost never won. This iteration switches to anywhere-
 *  matching with payouts scaled 3.4× to land at ~96% RTP (verified via
 *  1.5M-spin Monte Carlo).
 *
 *  Pay table (3 / 4 / 5 of a kind, anywhere on the 5 reels):
 *    💎 diamond     170 / 680 / 3400   weight 1
 *    🐟 big bass     68 / 204 / 1700   weight 2
 *    🐠 small fish   27 /  68 /  340   weight 4
 *    🪝 hook         17 /  41 /  170   weight 5
 *    🎣 rod          10 /  27 /   82   weight 7
 *    ⚓ anchor        7 /  17 /   41   weight 9
 *    🟦 blue (low)   3.4/  10/   34    weight 14
 *    🟩 green (low)  3.4/   7/   27    weight 14
 *    🟧 orange (low) 3.4/   7/   20    weight 14
 *    🦞 fisherman    -- (scatter, anywhere 3+ pay)   weight 2.5
 *
 *  Scatter pays: 3 = 17×, 4 = 85×, 5 = 680× (also triggers a small
 *  free-pop bonus visually but no extra spins to keep this game light).
 */

export type Symbol = {
  id: string;
  emoji: string;
  /** Reel-strip weight per reel. */
  weight: number;
  /** Pay multipliers for 3/4/5 of-a-kind. Undefined for the scatter
   *  (which uses scatterPay). */
  pay?: { 3: number; 4: number; 5: number };
  isScatter?: boolean;
  /** Color (used for cell tint when this symbol is part of a win). */
  color: string;
};

export const SYMBOLS: Symbol[] = [
  { id: 'diamond',   emoji: '💎', weight: 1,  pay: { 3: 170, 4: 680, 5: 3400 }, color: '#22d3ee' },
  { id: 'bigbass',   emoji: '🐟', weight: 2,  pay: { 3: 68,  4: 204, 5: 1700 }, color: '#1fff7a' },
  { id: 'smallfish', emoji: '🐠', weight: 4,  pay: { 3: 27,  4: 68,  5: 340 },  color: '#ffd166' },
  { id: 'hook',      emoji: '🪝', weight: 5,  pay: { 3: 17,  4: 41,  5: 170 },  color: '#a8a29e' },
  { id: 'rod',       emoji: '🎣', weight: 7,  pay: { 3: 10,  4: 27,  5: 82 },   color: '#a78bfa' },
  { id: 'anchor',    emoji: '⚓', weight: 9,  pay: { 3: 7,   4: 17,  5: 41 },   color: '#7ac4ff' },
  { id: 'blue',      emoji: '🟦', weight: 14, pay: { 3: 3.4, 4: 10,  5: 34 },   color: '#5fb8ff' },
  { id: 'green',     emoji: '🟩', weight: 14, pay: { 3: 3.4, 4: 7,   5: 27 },   color: '#1fff7a' },
  { id: 'orange',    emoji: '🟧', weight: 14, pay: { 3: 3.4, 4: 7,   5: 20 },   color: '#ffae50' },
  { id: 'scatter',   emoji: '🦞', weight: 2.5, isScatter: true, color: '#ff5fa2' },
];

const SCATTER_PAY: Record<number, number> = { 3: 17, 4: 85, 5: 680 };

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);

function pickSymbol(rng: Rng): string {
  // Weights aren't all integers (scatter is 2.5) — scale to integers.
  const r = rng.nextInt(Math.round(TOTAL_WEIGHT * 2));
  let acc = 0;
  for (const s of SYMBOLS) {
    acc += s.weight * 2;
    if (r < acc) return s.id;
  }
  return SYMBOLS[0]!.id;
}

export function symbolById(id: string): Symbol | null {
  return SYMBOLS.find((s) => s.id === id) ?? null;
}

export type BassResult = {
  /** 5-reel result, leftmost first. */
  reels: string[];
  /** Best winning symbol (3+ matches anywhere on the 5 reels). null if none. */
  lineSymbol: string | null;
  lineLength: number;
  lineMultiplier: number;
  /** Indices of cells that form the win — used by the UI to highlight
   *  exactly the winning positions instead of assuming leftmost. */
  winningPositions: number[];
  /** Scatter count + pay. 0 if < 3 scatters. */
  scatterCount: number;
  scatterMultiplier: number;
  /** Total pay multiplier and currency payout. */
  multiplier: number;
  payout: number;
};

export function spin(rng: Rng, bet: number): BassResult {
  const reels: string[] = [];
  for (let i = 0; i < 5; i++) reels.push(pickSymbol(rng));

  // Anywhere-on-reels matching: count each non-scatter symbol's
  // occurrences across all 5 reels. Highest-paying 3+ count wins. Was
  // leftmost-consecutive only — RTP was 4.6% (almost unwinnable).
  const counts: Record<string, number> = {};
  for (const r of reels) counts[r] = (counts[r] ?? 0) + 1;

  let lineSymbol: string | null = null;
  let lineLength = 0;
  let lineMultiplier = 0;
  for (const [id, count] of Object.entries(counts)) {
    if (id === 'scatter' || count < 3) continue;
    const sym = symbolById(id);
    if (!sym?.pay) continue;
    const m = sym.pay[count as 3 | 4 | 5];
    if (m > lineMultiplier) {
      lineSymbol = id;
      lineLength = count;
      lineMultiplier = m;
    }
  }
  // Collect the indices of all reels showing the winning symbol so the
  // UI can highlight exactly those cells.
  const winningPositions: number[] = [];
  if (lineSymbol) {
    for (let i = 0; i < 5; i++) {
      if (reels[i] === lineSymbol) winningPositions.push(i);
    }
  }

  // Scatter count anywhere (independent of payline).
  const scatterCount = reels.filter((r) => r === 'scatter').length;
  const scatterMultiplier = scatterCount >= 3 ? SCATTER_PAY[scatterCount] ?? 0 : 0;

  const multiplier = lineMultiplier + scatterMultiplier;
  return {
    reels,
    lineSymbol,
    lineLength,
    lineMultiplier,
    winningPositions,
    scatterCount,
    scatterMultiplier,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
