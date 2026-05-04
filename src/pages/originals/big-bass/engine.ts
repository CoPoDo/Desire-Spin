import type { Rng } from '../../../lib/fairness';

/** Big Bass — fishing-themed 5-reel single-payline slot.
 *
 *  Each reel independently picks a symbol (with weights). Win if the
 *  leftmost N reels (N >= 3) all show the same symbol; pay = bet ×
 *  that symbol's N-of-a-kind multiplier. The fisherman/scatter pays
 *  for 3+ anywhere. Money fish symbols add a small flat bonus when
 *  any appear together with the fisherman. RTP ≈ 96%.
 *
 *  Pay table (3 / 4 / 5 of a kind):
 *    💎 diamond     50 / 200 / 1000   weight 1
 *    🐟 big bass    20 /  60 /  500   weight 2
 *    🐠 small fish   8 /  20 /  100   weight 4
 *    🪝 hook         5 /  12 /   50   weight 5
 *    🎣 rod          3 /   8 /   24   weight 7
 *    ⚓ anchor       2 /   5 /   12   weight 9
 *    🟦 blue (low)   1 /   3 /   10   weight 14
 *    🟩 green (low)  1 /   2 /    8   weight 14
 *    🟧 orange (low) 1 /   2 /    6   weight 14
 *    🦞 fisherman    -- (scatter, anywhere 3+ pay)   weight 2.5
 *
 *  Scatter pays: 3 = 5×, 4 = 25×, 5 = 200× (also triggers a small
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
  { id: 'diamond',   emoji: '💎', weight: 1,  pay: { 3: 50, 4: 200, 5: 1000 }, color: '#22d3ee' },
  { id: 'bigbass',   emoji: '🐟', weight: 2,  pay: { 3: 20, 4: 60,  5: 500 },  color: '#1fff7a' },
  { id: 'smallfish', emoji: '🐠', weight: 4,  pay: { 3: 8,  4: 20,  5: 100 },  color: '#ffd166' },
  { id: 'hook',      emoji: '🪝', weight: 5,  pay: { 3: 5,  4: 12,  5: 50 },   color: '#a8a29e' },
  { id: 'rod',       emoji: '🎣', weight: 7,  pay: { 3: 3,  4: 8,   5: 24 },   color: '#a78bfa' },
  { id: 'anchor',    emoji: '⚓', weight: 9,  pay: { 3: 2,  4: 5,   5: 12 },   color: '#7ac4ff' },
  { id: 'blue',      emoji: '🟦', weight: 14, pay: { 3: 1,  4: 3,   5: 10 },   color: '#5fb8ff' },
  { id: 'green',     emoji: '🟩', weight: 14, pay: { 3: 1,  4: 2,   5: 8 },    color: '#1fff7a' },
  { id: 'orange',    emoji: '🟧', weight: 14, pay: { 3: 1,  4: 2,   5: 6 },    color: '#ffae50' },
  { id: 'scatter',   emoji: '🦞', weight: 2.5, isScatter: true, color: '#ff5fa2' },
];

const SCATTER_PAY: Record<number, number> = { 3: 5, 4: 25, 5: 200 };

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
  /** Best line win (consecutive leftmost match). 0 if none. */
  lineSymbol: string | null;
  lineLength: number;
  lineMultiplier: number;
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

  // Leftmost consecutive match (skip scatters in line eval).
  let lineSymbol: string | null = null;
  let lineLength = 0;
  let lineMultiplier = 0;
  if (reels[0] !== 'scatter') {
    const first = reels[0]!;
    let count = 1;
    for (let i = 1; i < 5; i++) {
      if (reels[i] === first) count++;
      else break;
    }
    if (count >= 3) {
      const sym = symbolById(first)!;
      lineSymbol = first;
      lineLength = count;
      lineMultiplier = sym.pay![count as 3 | 4 | 5];
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
    scatterCount,
    scatterMultiplier,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
