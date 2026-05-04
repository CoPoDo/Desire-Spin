import type { Rng } from '../../../lib/fairness';

/** Mines game engine (Stake-style).
 *
 *  - 5×5 grid (25 tiles)
 *  - Player chooses mineCount (1-24); the rest are safe gems
 *  - Player reveals tiles one at a time; cash out anytime
 *  - Multiplier after k safe picks with m mines:
 *      mult(k) = 0.99 × C(25, k) / C(25-m, k)
 *    (1% house edge on each step relative to fair odds)
 *  - Hitting a mine ends the game with 0 payout
 *
 *  Mine placement is deterministic from the round's seed (provably fair).
 */

export const GRID_SIZE = 25;

/** Place mines deterministically using a Fisher-Yates shuffle keyed by RNG. */
export function placeMines(rng: Rng, mineCount: number): Set<number> {
  const m = Math.max(1, Math.min(24, Math.floor(mineCount)));
  const indices = Array.from({ length: GRID_SIZE }, (_, i) => i);
  // Standard Fisher-Yates with the provably-fair Rng
  for (let i = GRID_SIZE - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  return new Set(indices.slice(0, m));
}

/** Binomial coefficient (n choose k). Floating point; safe for n,k <= 25. */
function nCk(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

const HOUSE_EDGE = 0.01;

/** Multiplier after k safe picks with m mines. */
export function multiplierFor(picks: number, mines: number): number {
  if (picks <= 0) return 1;
  const safe = GRID_SIZE - mines;
  if (picks > safe) return 0;
  const fair = nCk(GRID_SIZE, picks) / nCk(safe, picks);
  return +(fair * (1 - HOUSE_EDGE)).toFixed(6);
}

/** Win chance (probability) of getting through `picks` safe tiles with `mines` mines. */
export function safeChanceFor(picks: number, mines: number): number {
  const safe = GRID_SIZE - mines;
  if (picks > safe) return 0;
  return nCk(safe, picks) / nCk(GRID_SIZE, picks);
}

export type MinesRoundState = {
  mineSet: Set<number>;
  mineCount: number;
  bet: number;
  revealed: Set<number>;
  done: boolean;
  hitMine: boolean;
  payout: number;
};

export function startRound(rng: Rng, bet: number, mineCount: number): MinesRoundState {
  return {
    mineSet: placeMines(rng, mineCount),
    mineCount,
    bet,
    revealed: new Set(),
    done: false,
    hitMine: false,
    payout: 0,
  };
}

export function reveal(state: MinesRoundState, idx: number): MinesRoundState {
  if (state.done || state.revealed.has(idx)) return state;
  const revealed = new Set(state.revealed);
  revealed.add(idx);
  const hit = state.mineSet.has(idx);
  if (hit) {
    return { ...state, revealed, done: true, hitMine: true, payout: 0 };
  }
  return { ...state, revealed };
}

export function cashOut(state: MinesRoundState): MinesRoundState {
  if (state.done || state.revealed.size === 0) return state;
  const m = multiplierFor(state.revealed.size, state.mineCount);
  return { ...state, done: true, payout: +(state.bet * m).toFixed(2) };
}
