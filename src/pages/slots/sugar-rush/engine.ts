import type { Rng } from '../../../lib/fairness';

export const SUGAR_SIZE = 7;
export const SUGAR_SYMBOLS = ['donut', 'cupcake', 'popsicle', 'gingerb', 'jellybean', 'gum', 'mint', 'candy-pink', 'candy-blue'] as const;
export type SugarSymbol = typeof SUGAR_SYMBOLS[number] | 'lollipop';
export type MultiplierSpots = number[];

const WEIGHTS = [4, 7, 8, 9, 11, 12, 14, 16, 18, 1.5];
const PAY_5: Record<typeof SUGAR_SYMBOLS[number], number> = {
  donut: 1.5, cupcake: 1.2, popsicle: 1, gingerb: 0.8, jellybean: 0.6,
  gum: 0.5, mint: 0.4, 'candy-pink': 0.3, 'candy-blue': 0.25,
};

export type SugarCluster = { symbolId: SugarSymbol; positions: number[]; baseMultiplier: number; spotMultiplier: number; payout: number };
export type SugarFrame = {
  grid: SugarSymbol[];
  spots: MultiplierSpots;
  winningPositions: number[];
  clusters: SugarCluster[];
  payout: number;
  cascade: number;
};
export type SugarResult = {
  frames: SugarFrame[];
  finalGrid: SugarSymbol[];
  spots: MultiplierSpots;
  scatterCount: number;
  freeSpinsAwarded: number;
  totalPayout: number;
};

function pick(rng: Rng): SugarSymbol {
  const all: SugarSymbol[] = [...SUGAR_SYMBOLS, 'lollipop'];
  return all[rng.weighted(WEIGHTS)]!;
}

export function createSugarGrid(rng: Rng): SugarSymbol[] {
  return Array.from({ length: SUGAR_SIZE * SUGAR_SIZE }, () => pick(rng));
}

function neighbours(index: number): number[] {
  const row = Math.floor(index / SUGAR_SIZE);
  const col = index % SUGAR_SIZE;
  const result: number[] = [];
  if (row > 0) result.push(index - SUGAR_SIZE);
  if (row < SUGAR_SIZE - 1) result.push(index + SUGAR_SIZE);
  if (col > 0) result.push(index - 1);
  if (col < SUGAR_SIZE - 1) result.push(index + 1);
  return result;
}

function clusterPay(symbol: typeof SUGAR_SYMBOLS[number], size: number): number {
  const base = PAY_5[symbol];
  if (size >= 15) return base * 20;
  if (size >= 12) return base * 10;
  if (size >= 10) return base * 5;
  if (size >= 8) return base * 3;
  if (size >= 6) return base * 1.5;
  return base;
}

export function findSugarClusters(grid: readonly SugarSymbol[], spots: readonly number[], bet: number): SugarCluster[] {
  const visited = new Set<number>();
  const clusters: SugarCluster[] = [];
  for (let start = 0; start < grid.length; start++) {
    if (visited.has(start) || grid[start] === 'lollipop') continue;
    const symbol = grid[start]!;
    const queue = [start];
    const positions: number[] = [];
    visited.add(start);
    while (queue.length) {
      const current = queue.shift()!;
      positions.push(current);
      for (const next of neighbours(current)) {
        if (!visited.has(next) && grid[next] === symbol) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    if (positions.length < 5) continue;
    const baseMultiplier = clusterPay(symbol as typeof SUGAR_SYMBOLS[number], positions.length);
    const spotSum = positions.reduce((sum, position) => sum + (spots[position] ?? 0), 0);
    const spotMultiplier = spotSum > 0 ? spotSum : 1;
    clusters.push({ symbolId: symbol, positions, baseMultiplier, spotMultiplier, payout: bet * baseMultiplier * spotMultiplier });
  }
  return clusters;
}

function tumble(grid: readonly SugarSymbol[], removed: Set<number>, rng: Rng): SugarSymbol[] {
  const next = new Array<SugarSymbol>(SUGAR_SIZE * SUGAR_SIZE);
  for (let col = 0; col < SUGAR_SIZE; col++) {
    const survivors: SugarSymbol[] = [];
    for (let row = SUGAR_SIZE - 1; row >= 0; row--) {
      const index = row * SUGAR_SIZE + col;
      if (!removed.has(index)) survivors.push(grid[index]!);
    }
    let survivor = 0;
    for (let row = SUGAR_SIZE - 1; row >= 0; row--) {
      next[row * SUGAR_SIZE + col] = survivor < survivors.length ? survivors[survivor++]! : pick(rng);
    }
  }
  return next;
}

export function freeSpinsForScatters(count: number): number {
  if (count >= 7) return 30;
  if (count === 6) return 20;
  if (count === 5) return 15;
  if (count === 4) return 12;
  if (count === 3) return 10;
  return 0;
}

export function playSugarSpin(rng: Rng, bet: number, persistentSpots?: readonly number[]): SugarResult {
  let grid = createSugarGrid(rng);
  const spots = persistentSpots ? [...persistentSpots] : new Array(SUGAR_SIZE * SUGAR_SIZE).fill(0);
  const frames: SugarFrame[] = [{ grid: [...grid], spots: [...spots], winningPositions: [], clusters: [], payout: 0, cascade: 0 }];
  let totalPayout = 0;
  let cascade = 0;
  let scatterCount = grid.filter((symbol) => symbol === 'lollipop').length;

  while (cascade < 40) {
    const clusters = findSugarClusters(grid, spots, bet);
    if (!clusters.length) break;
    cascade++;
    const winningPositions = [...new Set(clusters.flatMap((cluster) => cluster.positions))];
    const payout = clusters.reduce((sum, cluster) => sum + cluster.payout, 0);
    totalPayout += payout;
    frames.push({ grid: [...grid], spots: [...spots], winningPositions, clusters, payout, cascade });

    for (const position of winningPositions) spots[position] = Math.min(128, spots[position] ? spots[position]! * 2 : 2);
    grid = tumble(grid, new Set(winningPositions), rng);
    scatterCount = Math.max(scatterCount, grid.filter((symbol) => symbol === 'lollipop').length);
    frames.push({ grid: [...grid], spots: [...spots], winningPositions: [], clusters: [], payout: 0, cascade });
    if (totalPayout >= bet * 5000) {
      totalPayout = bet * 5000;
      break;
    }
  }

  return {
    frames,
    finalGrid: grid,
    spots,
    scatterCount,
    freeSpinsAwarded: freeSpinsForScatters(scatterCount),
    totalPayout: +totalPayout.toFixed(2),
  };
}
