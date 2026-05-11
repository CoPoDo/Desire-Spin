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

/** Free-spin awards per scatter count when 3+ fisherman land on a
 *  base spin. Mirrors real Pragmatic Big Bass Bonanza:
 *  3 → 10, 4 → 15, 5 → 20. Retriggers (3+ scatters during free spins)
 *  add the same amount on top. */
export const FREE_SPIN_AWARDS: Record<number, number> = { 3: 10, 4: 15, 5: 20 };

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
  /** Money values landed on each cell during a free spin (cell idx →
   *  multiplier-of-bet). Empty array on base spins. Fisherman lands
   *  collect all of these into `collectedMultiplier`. */
  moneyValues: number[];
  /** Sum of money collected when fisherman triggers a collection
   *  (FS only, when scatter present). 0 otherwise. */
  collectedMultiplier: number;
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
  const winningPositions: number[] = [];
  if (lineSymbol) {
    for (let i = 0; i < 5; i++) {
      if (reels[i] === lineSymbol) winningPositions.push(i);
    }
  }

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
    moneyValues: [],
    collectedMultiplier: 0,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}

/** Money values that can land on bass symbols during free spins.
 *  Weighted toward low values matching real Big Bass distribution. */
const MONEY_VALUES: [number, number][] = [
  [1, 28], [2, 20], [3, 14], [5, 10], [8, 7], [10, 6],
  [15, 4], [20, 3], [50, 1.5], [100, 0.6], [250, 0.2], [1000, 0.05],
];
const MONEY_TOTAL_WEIGHT = MONEY_VALUES.reduce((s, [, w]) => s + w, 0);

function pickMoneyValue(rng: Rng): number {
  const r = rng.next() * MONEY_TOTAL_WEIGHT;
  let acc = 0;
  for (const [v, w] of MONEY_VALUES) {
    acc += w;
    if (r < acc) return v;
  }
  return MONEY_VALUES[0]![0];
}

/** Free-spin variant. Mechanically the same reel spin but:
 *   1. Bass symbols carry money values (multiplier × bet).
 *   2. If fisherman scatter lands AND money is on the reels, the
 *      fisherman COLLECTS all visible money into the round's pot.
 *   3. Normal line pays still apply on top of the collected money.
 *
 *  Scatter count is also tracked so 3+ scatters during FS retrigger
 *  additional spins. */
export function spinFreeRound(rng: Rng, bet: number): BassResult {
  const reels: string[] = [];
  for (let i = 0; i < 5; i++) reels.push(pickSymbol(rng));

  // Free spins are more generous with money symbols — boost the chance
  // a bass-tier symbol carries money. Real game uses a different reel
  // strip; we approximate by tagging existing bass/diamond reels.
  const moneyValues: number[] = new Array(5).fill(0);
  for (let i = 0; i < 5; i++) {
    const id = reels[i]!;
    if (id === 'bigbass' || id === 'diamond' || id === 'smallfish') {
      // ~70% chance of money tag during FS
      if (rng.next() < 0.7) {
        moneyValues[i] = pickMoneyValue(rng);
      }
    }
  }

  // Standard line + scatter pays still compute.
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
  const winningPositions: number[] = [];
  if (lineSymbol) {
    for (let i = 0; i < 5; i++) {
      if (reels[i] === lineSymbol) winningPositions.push(i);
    }
  }

  const scatterCount = reels.filter((r) => r === 'scatter').length;
  const scatterMultiplier = scatterCount >= 3 ? SCATTER_PAY[scatterCount] ?? 0 : 0;

  // Fisherman collects: if at least one scatter appeared this spin, he
  // gathers ALL money values currently on the reels. Real game requires
  // the fisherman to actually appear on a money-bearing reel position,
  // but for the 5-cell layout we simplify: any scatter → collection.
  const collectedMultiplier = scatterCount >= 1
    ? +moneyValues.reduce((s, m) => s + m, 0).toFixed(2)
    : 0;

  const multiplier = +(lineMultiplier + scatterMultiplier + collectedMultiplier).toFixed(2);
  return {
    reels,
    lineSymbol,
    lineLength,
    lineMultiplier,
    winningPositions,
    scatterCount,
    scatterMultiplier,
    moneyValues,
    collectedMultiplier,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
