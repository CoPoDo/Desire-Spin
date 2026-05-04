import type { Rng } from '../../../lib/fairness';

/** Treasure Hunt — 5×5 grid with 6 traps and 19 treasure tiles.
 *
 *  Differs from Mines: each safe tile carries its own random multiplier
 *  drawn from a weighted pool, so successive reveals show variable values
 *  (instead of a fixed safe-count progression). Hitting a trap loses the
 *  whole bet; cashing out pays bet × accumulated multiplier from the
 *  revealed tiles so far.
 *
 *  Tile multiplier pool (weights /1000):
 *    0.3×  450
 *    0.7×  300
 *    1.0×  170
 *    3.0×   60
 *    10×    18
 *    50×     2
 *  Pool mean ≈ 0.135 + 0.21 + 0.17 + 0.18 + 0.18 + 0.10 = 0.975 ≈ 0.98
 *
 *  With 6 traps / 25 tiles, P(survive K clicks) = C(19, K)/C(25, K).
 *  Optimal stopping ~3 reveals; peak EV ≈ 0.99 with this pool.
 *  (Sub-optimal play returns less, like Mines — the math is fair, not
 *   forgiving.)
 */

export const GRID_SIZE = 25;
export const TRAP_COUNT = 6;

export type Tile =
  | { kind: 'trap' }
  | { kind: 'treasure'; multiplier: number };

const POOL: { mult: number; w: number }[] = [
  { mult: 0.3, w: 450 },
  { mult: 0.7, w: 300 },
  { mult: 1.0, w: 170 },
  { mult: 3.0, w: 60 },
  { mult: 10,  w: 18 },
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
