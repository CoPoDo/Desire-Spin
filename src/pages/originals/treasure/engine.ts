import type { Rng } from '../../../lib/fairness';

/** Treasure Hunt — 5×5 grid with 6 traps and 19 treasure tiles.
 *
 *  Differs from Mines: each safe tile carries its own random multiplier
 *  drawn from a weighted pool, so successive reveals show variable values
 *  (instead of a fixed safe-count progression). Hitting a trap loses the
 *  whole bet; cashing out pays bet × accumulated multiplier from the
 *  revealed tiles so far.
 *
 *  Tile multiplier pool (weights /1000) — pool mean = 0.790:
 *    0.3×  600
 *    0.7×  250
 *    1.0×  100
 *    3.0×   35
 *    10×    13
 *    50×     2
 *
 *  With 6 traps / 25 tiles, P(survive K clicks) = C(19, K)/C(25, K).
 *  Optimal-stop EV per click count:
 *    K=1: 60%   K=2: 90%   K=3: 99.8% ← peak    K=4: 96.8%   K=5: 86.4%
 *  So a strict optimal player tops out at ~99.8% RTP (cash out after 3
 *  clicks). The previous calibration had pool mean 0.975 → peak EV 123%
 *  at K=3 (player-favorable — bug). Audit caught this; pool mean
 *  reduced to 0.79 to bring peak EV back to ~99%.
 */

export const GRID_SIZE = 25;
export const TRAP_COUNT = 6;

export type Tile =
  | { kind: 'trap' }
  | { kind: 'treasure'; multiplier: number };

const POOL: { mult: number; w: number }[] = [
  { mult: 0.3, w: 600 },
  { mult: 0.7, w: 250 },
  { mult: 1.0, w: 100 },
  { mult: 3.0, w: 35 },
  { mult: 10,  w: 13 },
  { mult: 50,  w: 2 },
];
const POOL_TOTAL = POOL.reduce((s, p) => s + p.w, 0);

function pickMultiplier(rng: Rng): number {
  const r = rng.nextInt(POOL_TOTAL);
  let acc = 0;
  for (const p of POOL) {
    acc += p.w;
    if (r < acc) return p.mult;
  }
  return POOL[POOL.length - 1]!.mult;
}

/** Generate a 25-tile grid with TRAP_COUNT traps placed at distinct random
 *  positions; remaining cells get random multipliers from the pool. */
export function generateGrid(rng: Rng): Tile[] {
  const tiles: Tile[] = new Array(GRID_SIZE);
  // Pick 6 distinct trap positions via partial Fisher-Yates.
  const positions = Array.from({ length: GRID_SIZE }, (_, i) => i);
  for (let i = 0; i < TRAP_COUNT; i++) {
    const j = i + rng.nextInt(GRID_SIZE - i);
    [positions[i], positions[j]] = [positions[j]!, positions[i]!];
  }
  const trapSet = new Set(positions.slice(0, TRAP_COUNT));
  for (let i = 0; i < GRID_SIZE; i++) {
    tiles[i] = trapSet.has(i)
      ? { kind: 'trap' }
      : { kind: 'treasure', multiplier: pickMultiplier(rng) };
  }
  return tiles;
}

export const POOL_VALUES = POOL.map((p) => p.mult);
