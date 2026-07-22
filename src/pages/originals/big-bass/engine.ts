import type { Rng } from '../../../lib/fairness';

export type Symbol = {
  id: string;
  emoji: string;
  weight: number;
  freeWeight?: number;
  pay?: { 3: number; 4: number; 5: number };
  isScatter?: boolean;
  isWild?: boolean;
  isMoney?: boolean;
  color: string;
};

/** Five reels by three rows, ten fixed paylines. */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 2],
];

export const SYMBOLS: Symbol[] = [
  { id: 'bigbass', emoji: '🐟', weight: 3, freeWeight: 5, isMoney: true, pay: { 3: 20, 4: 100, 5: 500 }, color: '#1fff7a' },
  { id: 'smallfish', emoji: '🐠', weight: 5, freeWeight: 7, isMoney: true, pay: { 3: 10, 4: 40, 5: 200 }, color: '#ffd166' },
  { id: 'tackle', emoji: '🎣', weight: 7, pay: { 3: 5, 4: 15, 5: 50 }, color: '#a78bfa' },
  { id: 'truck', emoji: '🛻', weight: 9, pay: { 3: 3, 4: 8, 5: 25 }, color: '#ff9b47' },
  { id: 'anchor', emoji: '⚓', weight: 10, pay: { 3: 2, 4: 5, 5: 15 }, color: '#7ac4ff' },
  { id: 'ace', emoji: 'A', weight: 12, pay: { 3: 1.5, 4: 3, 5: 8 }, color: '#ef4444' },
  { id: 'king', emoji: 'K', weight: 13, pay: { 3: 1.2, 4: 2.5, 5: 6 }, color: '#f59e0b' },
  { id: 'queen', emoji: 'Q', weight: 14, pay: { 3: 1, 4: 2, 5: 5 }, color: '#ec4899' },
  { id: 'jack', emoji: 'J', weight: 15, pay: { 3: 0.8, 4: 1.5, 5: 4 }, color: '#22d3ee' },
  { id: 'scatter', emoji: '🚤', weight: 1.4, freeWeight: 1.2, isScatter: true, color: '#ff5fa2' },
  { id: 'fisherman', emoji: '🧔', weight: 0, freeWeight: 2.2, isWild: true, color: '#ffd166' },
];

export const FREE_SPIN_AWARDS: Record<number, number> = { 3: 10, 4: 15, 5: 20 };
const SCATTER_PAY: Record<number, number> = { 3: 2, 4: 20, 5: 200 };
const MONEY_VALUES: [number, number][] = [[1, 30], [2, 24], [3, 16], [5, 12], [10, 8], [15, 5], [20, 3], [50, 1.5], [100, 0.4]];

function pickSymbol(rng: Rng, free: boolean): string {
  const weights = SYMBOLS.map((symbol) => free ? (symbol.freeWeight ?? symbol.weight) : symbol.weight);
  return SYMBOLS[rng.weighted(weights)]!.id;
}

function createGrid(rng: Rng, free: boolean): string[] {
  return Array.from({ length: 15 }, () => pickSymbol(rng, free));
}

export function symbolById(id: string): Symbol | null {
  return SYMBOLS.find((symbol) => symbol.id === id) ?? null;
}

function indexAt(reel: number, row: number): number {
  return row * 5 + reel;
}

export type BassResult = {
  reels: string[];
  lineSymbol: string | null;
  lineLength: number;
  lineMultiplier: number;
  winningPositions: number[];
  winningLines: number[];
  scatterCount: number;
  scatterMultiplier: number;
  fishermanCount: number;
  moneyValues: number[];
  collectedMultiplier: number;
  multiplier: number;
  payout: number;
};

function evaluate(grid: string[], bet: number, moneyValues: number[], collectorMultiplier: number): BassResult {
  const winning = new Set<number>();
  const winningLines: number[] = [];
  let bestSymbol: string | null = null;
  let bestLength = 0;
  let lineMultiplier = 0;

  PAYLINES.forEach((rows, lineIndex) => {
    const cells = rows.map((row, reel) => ({ index: indexAt(reel, row), id: grid[indexAt(reel, row)]! }));
    const firstPaying = cells.find((cell) => !symbolById(cell.id)?.isWild)?.id;
    if (!firstPaying || symbolById(firstPaying)?.isScatter) return;
    let length = 0;
    for (const cell of cells) {
      const symbol = symbolById(cell.id);
      if (cell.id === firstPaying || symbol?.isWild) length++;
      else break;
    }
    if (length < 3) return;
    const pay = symbolById(firstPaying)?.pay?.[length as 3 | 4 | 5] ?? 0;
    if (pay <= 0) return;
    // Public reel strips/PAR data are unavailable. The visible paytable is
    // calibrated against the local strip weights to the published RTP band.
    lineMultiplier += (pay / PAYLINES.length) * 27;
    winningLines.push(lineIndex);
    cells.slice(0, length).forEach((cell) => winning.add(cell.index));
    if (pay > (symbolById(bestSymbol ?? '')?.pay?.[bestLength as 3 | 4 | 5] ?? 0)) {
      bestSymbol = firstPaying;
      bestLength = length;
    }
  });

  const scatterCount = grid.filter((id) => id === 'scatter').length;
  const scatterMultiplier = scatterCount >= 3 ? (SCATTER_PAY[Math.min(scatterCount, 5)] ?? 0) : 0;
  const fishermanPositions = grid.map((id, index) => id === 'fisherman' ? index : -1).filter((index) => index >= 0);
  const fishermanCount = fishermanPositions.length;
  fishermanPositions.forEach((index) => winning.add(index));
  const visibleMoney = moneyValues.reduce((sum, value) => sum + value, 0);
  const collectedMultiplier = fishermanCount > 0 ? visibleMoney * fishermanCount * collectorMultiplier : 0;
  const multiplier = +(lineMultiplier + scatterMultiplier + collectedMultiplier).toFixed(2);

  return {
    reels: grid,
    lineSymbol: bestSymbol,
    lineLength: bestLength,
    lineMultiplier: +lineMultiplier.toFixed(2),
    winningPositions: [...winning],
    winningLines,
    scatterCount,
    scatterMultiplier,
    fishermanCount,
    moneyValues,
    collectedMultiplier,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}

export function spin(rng: Rng, bet: number): BassResult {
  return evaluate(createGrid(rng, false), bet, new Array(15).fill(0), 1);
}

function pickMoneyValue(rng: Rng): number {
  return MONEY_VALUES[rng.weighted(MONEY_VALUES.map(([, weight]) => weight))]![0];
}

export function spinFreeRound(rng: Rng, bet: number, collectorMultiplier = 1): BassResult {
  const grid = createGrid(rng, true);
  const moneyValues = grid.map((id) => symbolById(id)?.isMoney && rng.next() < 0.72 ? pickMoneyValue(rng) : 0);
  return evaluate(grid, bet, moneyValues, collectorMultiplier);
}
