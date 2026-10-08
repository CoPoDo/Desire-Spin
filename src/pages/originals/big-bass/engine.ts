import type { Rng } from '../../../lib/fairness';

export type Symbol = {
  id: string;
  emoji: string;
  weight: number;
  freeWeight?: number;
  /** Published wins in units of bet per line (total bet / ten lines). */
  pay?: Partial<Record<2 | 3 | 4 | 5, number>>;
  isScatter?: boolean;
  isWild?: boolean;
  isMoney?: boolean;
  color: string;
};

/** Original ten paylines, transcribed from page 1 of the public game rules.
 * https://www.daznbet.com/uploads/media/DUK/Game-Rules/Big_Bass_Bonanza_EN.pdf
 * Row indices are zero-based, top to bottom. */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [2, 1, 0, 1, 2],
  [0, 1, 2, 1, 0], [2, 2, 1, 0, 0], [0, 0, 1, 2, 2], [2, 1, 1, 1, 0],
];

/** The public paytable is fixed. Only local outcome frequencies may be tuned;
 * private provider reel strips / PAR probabilities are not available. */
export const SYMBOLS: Symbol[] = [
  { id: 'floater', emoji: '', weight: 3, pay: { 2: 5, 3: 50, 4: 200, 5: 2000 }, color: '#ef4444' },
  { id: 'rod', emoji: '', weight: 5, pay: { 3: 30, 4: 150, 5: 1000 }, color: '#ffd166' },
  { id: 'dragonfly', emoji: '', weight: 7, pay: { 3: 20, 4: 100, 5: 500 }, color: '#7ac4ff' },
  { id: 'tacklebox', emoji: '', weight: 9, pay: { 3: 20, 4: 100, 5: 500 }, color: '#a78bfa' },
  { id: 'bigbass', emoji: '', weight: 10, freeWeight: 12, isMoney: true, pay: { 3: 10, 4: 50, 5: 200 }, color: '#1fff7a' },
  { id: 'ace', emoji: '', weight: 12, pay: { 3: 5, 4: 25, 5: 100 }, color: '#ef4444' },
  { id: 'king', emoji: '', weight: 13, pay: { 3: 5, 4: 25, 5: 100 }, color: '#f59e0b' },
  { id: 'queen', emoji: '', weight: 14, pay: { 3: 5, 4: 25, 5: 100 }, color: '#ec4899' },
  { id: 'jack', emoji: '', weight: 15, pay: { 3: 5, 4: 25, 5: 100 }, color: '#22d3ee' },
  { id: 'ten', emoji: '', weight: 15, pay: { 3: 5, 4: 25, 5: 100 }, color: '#fbbf24' },
  { id: 'scatter', emoji: '', weight: 2.9, freeWeight: 0, isScatter: true, color: '#ff5fa2' },
  { id: 'fisherman', emoji: '', weight: 0, freeWeight: 1.88, isWild: true, color: '#ffd166' },
];

export const FREE_SPIN_AWARDS: Record<number, number> = { 3: 10, 4: 15, 5: 20 };
export const MAX_WIN_MULTIPLIER = 2100;
export const COLLECTOR_MULTIPLIERS = [1, 2, 3, 10] as const;
/** The public range is 2–2,000×. This discrete distribution and the random
 * extra-fish frequency are explicitly local, not claimed provider odds. */
export const MONEY_VALUES: [number, number][] = [[2, 30], [3, 24], [5, 16], [10, 12], [15, 8], [20, 5], [50, 3], [100, 1.5], [2000, 0.001]];
export const LOCAL_EXTRA_FISH_CHANCE = 0.075;
export const LOCAL_EXTRA_FISH_COUNTS: [number, number][] = [[1, 6], [2, 3], [3, 1]];

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100);
const money = (value: number) => cents(value) / 100;

function createGrid(rng: Rng, free: boolean): string[] {
  const weights = SYMBOLS.map((symbol) => free ? (symbol.freeWeight ?? symbol.weight) : symbol.weight);
  return Array.from({ length: 15 }, () => SYMBOLS[rng.weighted(weights)]!.id);
}

const SYMBOL_LOOKUP = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]));
export function symbolById(id: string): Symbol | null {
  return SYMBOL_LOOKUP.get(id) ?? null;
}

function indexAt(reel: number, row: number): number {
  return row * 5 + reel;
}

export type ExtraFish = { position: number; value: number };
export type BassResult = {
  /** Actual reel landing, before the optional end-of-spin extra fish. */
  reels: string[];
  lineSymbol: string | null;
  lineLength: number;
  lineMultiplier: number;
  winningPositions: number[];
  winningLines: number[];
  scatterCount: number;
  /** Kept for result consumers: scatters have no direct cash payout. */
  scatterMultiplier: number;
  fishermanCount: number;
  moneyValues: number[];
  extraFish?: ExtraFish[];
  collectedMultiplier: number;
  multiplier: number;
  payout: number;
  capped?: boolean;
};

/** Pure public-rules evaluation, also used by deterministic fixture tests.
 * Extra fish arrive after payline evaluation, so they cannot create line wins. */
export function evaluateGrid(grid: string[], bet: number, moneyValues: number[] = new Array(15).fill(0), collectorMultiplier = 1, extraFish: ExtraFish[] = []): BassResult {
  const winning = new Set<number>();
  const winningLines: number[] = [];
  let bestSymbol: string | null = null;
  let bestLength = 0;
  let bestPay = 0;
  let lineMultiplier = 0;

  PAYLINES.forEach((rows, lineIndex) => {
    const cells = rows.map((row, reel) => ({ index: indexAt(reel, row), id: grid[indexAt(reel, row)]! }));
    let linePay = 0;
    let lineLength = 0;
    let lineSymbol: string | null = null;
    // Checking every eligible symbol handles all-Wild lines and, importantly,
    // two leading Wilds paying as floaters even when the next symbol differs.
    for (const symbol of SYMBOLS) {
      if (!symbol.pay) continue;
      let length = 0;
      for (const cell of cells) {
        if (cell.id === symbol.id || symbolById(cell.id)?.isWild) length++;
        else break;
      }
      const pay = symbol.pay[length as 2 | 3 | 4 | 5] ?? 0;
      if (pay > linePay) { linePay = pay; lineLength = length; lineSymbol = symbol.id; }
    }
    if (!linePay) return;
    lineMultiplier += linePay / PAYLINES.length;
    winningLines.push(lineIndex);
    cells.slice(0, lineLength).forEach((cell) => winning.add(cell.index));
    if (linePay > bestPay) { bestPay = linePay; bestSymbol = lineSymbol; bestLength = lineLength; }
  });

  const scatterCount = grid.filter((id) => id === 'scatter').length;
  const fishermanPositions = grid.flatMap((id, index) => id === 'fisherman' ? [index] : []);
  const fishermanCount = fishermanPositions.length;
  const eligibleExtraFish = fishermanCount === 1 ? extraFish : [];
  const visibleMoney = moneyValues.reduce((sum, value, index) => sum + (symbolById(grid[index]!)?.isMoney ? value : 0), 0)
    + eligibleExtraFish.reduce((sum, fish) => sum + fish.value, 0);
  const collectedMultiplier = visibleMoney * fishermanCount * collectorMultiplier;
  if (collectedMultiplier > 0) {
    fishermanPositions.forEach((index) => winning.add(index));
    moneyValues.forEach((value, index) => { if (value > 0 && symbolById(grid[index]!)?.isMoney) winning.add(index); });
    eligibleExtraFish.forEach((fish) => winning.add(fish.position));
  }
  const multiplier = money(lineMultiplier + collectedMultiplier);
  return {
    reels: grid, lineSymbol: bestSymbol, lineLength: bestLength,
    lineMultiplier: money(lineMultiplier), winningPositions: [...winning], winningLines,
    scatterCount, scatterMultiplier: 0, fishermanCount, moneyValues,
    extraFish: eligibleExtraFish, collectedMultiplier, multiplier, payout: money(bet * multiplier),
  };
}

function pickMoneyValue(rng: Rng): number {
  return MONEY_VALUES[rng.weighted(MONEY_VALUES.map(([, weight]) => weight))]![0];
}

function assignMoneyValues(rng: Rng, grid: string[]): number[] {
  // Fish always carry a value, in both the base and the free-spin game.
  return grid.map((id) => symbolById(id)?.isMoney ? pickMoneyValue(rng) : 0);
}

export function spin(rng: Rng, bet: number): BassResult {
  const grid = createGrid(rng, false);
  return evaluateGrid(grid, bet, assignMoneyValues(rng, grid));
}

export function spinFreeRound(rng: Rng, bet: number, collectorMultiplier = 1): BassResult {
  const grid = createGrid(rng, true);
  const moneyValues = assignMoneyValues(rng, grid);
  const extraFish: ExtraFish[] = [];
  if (grid.filter((id) => id === 'fisherman').length === 1 && rng.next() < LOCAL_EXTRA_FISH_CHANCE) {
    const available = grid.flatMap((id, index) => id !== 'fisherman' && !symbolById(id)?.isMoney ? [index] : []);
    const count = Math.min(available.length, LOCAL_EXTRA_FISH_COUNTS[rng.weighted(LOCAL_EXTRA_FISH_COUNTS.map(([, weight]) => weight))]![0]);
    for (let i = 0; i < count; i++) {
      const position = available.splice(rng.nextInt(available.length), 1)[0]!;
      extraFish.push({ position, value: pickMoneyValue(rng) });
    }
  }
  return evaluateGrid(grid, bet, moneyValues, collectorMultiplier, extraFish);
}

export type BassFeatureFrame = {
  result: BassResult;
  /** All unplayed spins, including queued retrigger batches. */
  remaining: number;
  collectorMultiplier: number;
  addedSpins: number;
  runningWin: number;
  batchRemaining?: number;
  collectedWilds?: number;
};
export type BassRound = {
  base: BassResult | null;
  bonusAward: number;
  feature: BassFeatureFrame[];
  totalPayout: number;
  capped?: boolean;
};

/** Resolve the complete paid round before cosmetic playback. Retriggers queue
 * separate ten-spin batches at 2×, 3× and 10×; they never change a batch that is
 * already in progress. All Wilds count toward the cumulative 4/8/12 milestones.
 * The 2,100× limit includes the triggering base win and forfeits unused spins. */
export function planRound(rng: Rng, bet: number, buyBonus = false): BassRound {
  const capCents = cents(bet * MAX_WIN_MULTIPLIER);
  const limit = (result: BassResult, availableCents: number): BassResult => {
    if (cents(result.payout) < availableCents) return result;
    const payout = availableCents / 100;
    return { ...result, payout, multiplier: bet > 0 ? payout / bet : 0, capped: true };
  };
  const rawBase = buyBonus ? null : spin(rng, bet);
  const base = rawBase ? limit(rawBase, capCents) : null;
  const bonusAward = buyBonus ? 10 : base && base.scatterCount >= 3
    ? FREE_SPIN_AWARDS[Math.min(5, base.scatterCount)]! : 0;
  const feature: BassFeatureFrame[] = [];
  const batches = bonusAward ? [{ remaining: bonusAward, multiplier: 1 }] : [];
  let totalCents = cents(base?.payout ?? 0);
  let featureCents = 0;
  let collectedWilds = 0;
  let retriggers = 0;
  let capped = totalCents >= capCents;
  while (batches.length > 0 && !capped) {
    const batch = batches[0]!;
    const collectorMultiplier = batch.multiplier;
    const result = limit(spinFreeRound(rng, bet, collectorMultiplier), capCents - totalCents);
    batch.remaining -= 1;
    collectedWilds += result.fishermanCount;
    totalCents += cents(result.payout);
    featureCents += cents(result.payout);
    capped = totalCents >= capCents;
    let addedSpins = 0;
    while (!capped && collectedWilds >= (retriggers + 1) * 4 && retriggers < 3) {
      retriggers += 1;
      batches.push({ remaining: 10, multiplier: COLLECTOR_MULTIPLIERS[retriggers]! });
      addedSpins += 10;
    }
    const batchRemaining = capped ? 0 : batch.remaining;
    if (batch.remaining === 0) batches.shift();
    const remaining = capped ? 0 : batches.reduce((sum, queued) => sum + queued.remaining, 0);
    feature.push({ result, remaining, collectorMultiplier, addedSpins, runningWin: featureCents / 100, batchRemaining, collectedWilds });
  }
  return { base, bonusAward, feature, totalPayout: totalCents / 100, capped };
}
