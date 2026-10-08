import type { Rng } from '../../../lib/fairness';

export const SUGAR_SIZE = 7;
export const SUGAR_SYMBOLS = ['donut', 'cupcake', 'popsicle', 'gingerb', 'jellybean', 'gum', 'mint'] as const;
export type SugarPayingSymbol = typeof SUGAR_SYMBOLS[number] | 'candy-pink' | 'candy-blue';
export type SugarSymbol = SugarPayingSymbol | 'lollipop';
export type MultiplierSpots = number[];

const keyCounters = new WeakMap<Rng, number>();
function nextKey(rng: Rng): string {
  const count = (keyCounters.get(rng) ?? 0) + 1;
  keyCounters.set(rng, count);
  return `sugar-${count}`;
}

// Seven paying symbols. Artwork IDs are local aliases for the seven ordered
// provider pay classes. Captured from the original demo's help at a2-unit bet.
/** Fixed local occurrence model, not provider reel strips or certified RTP.
 * Base and feature distributions may differ; payouts are never rescaled. */
export const SUGAR_FREQUENCIES = {
  base: [4, 7, 8, 9, 11, 12, 14, .515],
  free: [4, 7, 8, 9, 11, 12, 19.65, .55],
} as const;
export const SUGAR_PAYTABLE: Record<SugarPayingSymbol, readonly number[]> = {
  donut: [1,1.5,1.75,2,2.5,5,7.5,15,35,70,150],
  cupcake: [.75,1,1.25,1.5,2,4,6,12.5,30,60,100],
  popsicle: [.5,.75,1,1.25,1.5,3,4.5,10,20,40,60],
  gingerb: [.4,.5,.75,1,1.25,2,3,5,10,20,40],
  jellybean: [.3,.4,.5,.75,1,1.5,2.5,3.5,8,15,30],
  gum: [.25,.3,.4,.5,.75,1.25,2,3,6,12,25],
  mint: [.2,.25,.3,.4,.5,1,1.5,2.5,5,10,20],
  // Old saved/art fixture aliases remain readable but are not generated.
  'candy-pink': [.25,.3,.4,.5,.75,1.25,2,3,6,12,25],
  'candy-blue': [.2,.25,.3,.4,.5,1,1.5,2.5,5,10,20],
};
export const SUGAR_BUY_SCATTERS = [3,4,5,6,7] as const;

export type SugarCluster = { symbolId: SugarSymbol; positions: number[]; baseMultiplier: number; spotMultiplier: number; payout: number };
export type SugarFrame = {
  grid: SugarSymbol[];
  cellKeys: string[];
  spots: MultiplierSpots;
  marked: boolean[];
  winningPositions: number[];
  clusters: SugarCluster[];
  payout: number;
  cascade: number;
  incomingPositions?: number[];
};
export type SugarResult = {
  frames: SugarFrame[];
  finalGrid: SugarSymbol[];
  spots: MultiplierSpots;
  marked: boolean[];
  scatterCount: number;
  freeSpinsAwarded: number;
  totalPayout: number;
};

function pick(rng: Rng, free = false): SugarSymbol {
  const all: SugarSymbol[] = [...SUGAR_SYMBOLS, 'lollipop'];
  return all[rng.weighted([...SUGAR_FREQUENCIES[free ? 'free' : 'base']])]!;
}

export function createSugarGrid(rng: Rng, free = false): SugarSymbol[] {
  return Array.from({ length: SUGAR_SIZE * SUGAR_SIZE }, () => pick(rng, free));
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

export function clusterPay(symbol: SugarPayingSymbol, size: number): number {
  return size < 5 ? 0 : SUGAR_PAYTABLE[symbol][Math.min(15, size) - 5] ?? 0;
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
    const baseMultiplier = clusterPay(symbol as SugarPayingSymbol, positions.length);
    const spotSum = positions.reduce((sum, position) => sum + (spots[position] ?? 0), 0);
    const spotMultiplier = spotSum > 0 ? spotSum : 1;
    clusters.push({ symbolId: symbol, positions, baseMultiplier, spotMultiplier, payout: bet * baseMultiplier * spotMultiplier });
  }
  return clusters;
}

function tumble(grid: readonly SugarSymbol[], keys: readonly string[], removed: Set<number>, rng: Rng, free = false): { grid: SugarSymbol[]; keys: string[] } {
  const next = new Array<SugarSymbol>(SUGAR_SIZE * SUGAR_SIZE);
  const nextKeys = new Array<string>(SUGAR_SIZE * SUGAR_SIZE);
  for (let col = 0; col < SUGAR_SIZE; col++) {
    const survivors: { symbol: SugarSymbol; key: string }[] = [];
    for (let row = SUGAR_SIZE - 1; row >= 0; row--) {
      const index = row * SUGAR_SIZE + col;
      if (!removed.has(index)) survivors.push({ symbol: grid[index]!, key: keys[index]! });
    }
    let survivor = 0;
    for (let row = SUGAR_SIZE - 1; row >= 0; row--) {
      const index = row * SUGAR_SIZE + col;
      const cell = survivors[survivor++];
      next[index] = cell ? cell.symbol : pick(rng, free);
      nextKeys[index] = cell ? cell.key : nextKey(rng);
    }
  }
  return { grid: next, keys: nextKeys };
}

export function freeSpinsForScatters(count: number): number {
  if (count >= 7) return 30;
  if (count === 6) return 20;
  if (count === 5) return 15;
  if (count === 4) return 12;
  if (count === 3) return 10;
  return 0;
}

export function playSugarSpin(rng: Rng, bet: number, persistentSpots?: readonly number[], persistentMarked?: readonly boolean[], guaranteedScatters = 0): SugarResult {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive and finite');
  const free = persistentSpots !== undefined;
  let grid = createSugarGrid(rng, free);
  if (guaranteedScatters > 0) {
    if (!Number.isInteger(guaranteedScatters) || guaranteedScatters > 7) throw new RangeError('Invalid Sugar bonus entry');
    grid = grid.map((id) => id === 'lollipop' ? SUGAR_SYMBOLS[rng.weighted(SUGAR_FREQUENCIES.base.slice(0,-1))]! : id);
    const positions = Array.from({ length: grid.length }, (_, index) => index);
    for (let index = 0; index < guaranteedScatters; index++) {
      const choice = index + rng.nextInt(positions.length - index);
      [positions[index], positions[choice]] = [positions[choice]!, positions[index]!];
      grid[positions[index]!] = 'lollipop';
    }
  }
  let cellKeys = grid.map(() => nextKey(rng));
  const spots = persistentSpots ? [...persistentSpots] : new Array(SUGAR_SIZE * SUGAR_SIZE).fill(0);
  const marked = persistentMarked ? [...persistentMarked] : spots.map((value) => value > 0);
  const frames: SugarFrame[] = [{ grid: [...grid], cellKeys: [...cellKeys], spots: [...spots], marked: [...marked], winningPositions: [], clusters: [], payout: 0, cascade: 0 }];
  let totalPayout = 0;
  let cascade = 0;
  let scatterCount = grid.filter((symbol) => symbol === 'lollipop').length;

  while (totalPayout < bet * 5000) {
    if (cascade >= 1000) throw new Error('Sugar tumble safety limit exceeded');
    let clusters = findSugarClusters(grid, spots, bet);
    if (!clusters.length) break;
    cascade++;
    const winningPositions = [...new Set(clusters.flatMap((cluster) => cluster.positions))];
    // First destruction only marks a position. A subsequent winning hit
    // activates/doubles its multiplier for that hit, capped at 128x.
    for (const position of winningPositions) {
      if (marked[position]) spots[position] = Math.min(128, spots[position] ? spots[position]! * 2 : 2);
      marked[position] = true;
    }
    clusters = findSugarClusters(grid, spots, bet);
    const rawPayout = clusters.reduce((sum, cluster) => sum + cluster.payout, 0);
    const payout = Math.min(rawPayout, bet * 5000 - totalPayout);
    totalPayout += payout;
    frames.push({ grid: [...grid], cellKeys: [...cellKeys], spots: [...spots], marked: [...marked], winningPositions, clusters, payout, cascade });

    const incomingPositions: number[] = [];
    for (let col = 0; col < SUGAR_SIZE; col++) {
      const count = winningPositions.filter((position) => position % SUGAR_SIZE === col).length;
      for (let row = 0; row < count; row++) incomingPositions.push(row * SUGAR_SIZE + col);
    }
    const dropped = tumble(grid, cellKeys, new Set(winningPositions), rng, free);
    grid = dropped.grid;
    cellKeys = dropped.keys;
    scatterCount = Math.max(scatterCount, grid.filter((symbol) => symbol === 'lollipop').length);
    frames.push({ grid: [...grid], cellKeys: [...cellKeys], spots: [...spots], marked: [...marked], winningPositions: [], clusters: [], payout: 0, cascade, incomingPositions });
    if (totalPayout >= bet * 5000) {
      totalPayout = bet * 5000;
      break;
    }
  }

  return {
    frames,
    finalGrid: grid,
    spots,
    marked,
    scatterCount,
    freeSpinsAwarded: freeSpinsForScatters(scatterCount),
    totalPayout: +totalPayout.toFixed(2),
  };
}

export type SugarRound = {
  spins: { result: SugarResult; free: boolean; remaining: number }[];
  totalPayout: number;
  freeSpinsAwarded: number;
  capped: boolean;
};

/** Precompute the complete feature with one replayable RNG and one round cap.
 * Bought entries can contain3–7 scatters; entry frequency weights are local. */
export function playSugarRound(rng: Rng, bet: number, buy = false): SugarRound {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive and finite');
  const cap = +(bet * 5000).toFixed(2);
  const spins: SugarRound['spins'] = [];
  let remaining = 0;
  let freeSpinsAwarded = remaining;
  let totalPayout = 0;
  let persistent = new Array<number>(49).fill(0);
  let persistentMarked = new Array<boolean>(49).fill(false);
  do {
    if (spins.length >= 1000) throw new Error('Free-spin safety limit exceeded');
    const free = spins.length > 0;
    const boughtEntry = buy && !free ? SUGAR_BUY_SCATTERS[rng.weighted([80,12,5,2,.3])]! : 0;
    const result = playSugarSpin(rng, bet, free ? persistent : undefined, free ? persistentMarked : undefined, boughtEntry);
    if (free) { persistent = result.spots; persistentMarked = result.marked; }
    result.totalPayout = +Math.min(result.totalPayout, cap - totalPayout).toFixed(2);
    // Keep the visible running cascade total within the same whole-round cap.
    let available = result.totalPayout;
    result.frames = result.frames.map((frame) => {
      const payout = Math.min(frame.payout, Math.max(0, available));
      available -= payout;
      return { ...frame, payout };
    });
    totalPayout = +(totalPayout + result.totalPayout).toFixed(2);
    spins.push({ result, free, remaining });
    remaining = Math.max(0, remaining - (free ? 1 : 0)) + result.freeSpinsAwarded;
    freeSpinsAwarded += result.freeSpinsAwarded;
  } while (remaining > 0 && totalPayout < cap);
  return { spins, totalPayout, freeSpinsAwarded, capped: totalPayout >= cap };
}
