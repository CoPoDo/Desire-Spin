import type { Rng } from '../../../lib/fairness';

/** Tower (Stake-style):
 *  Climb a tower row by row. Each row has N tiles, of which D are deadly
 *  (skulls) and N-D are safe. Pick a safe tile to advance. Cash out
 *  anytime; one skull = lose all.
 *
 *  Difficulty determines tiles-per-row + deaths-per-row:
 *    easy:    4 tiles, 1 death  → 75% safe → mult ×0.99/(0.75) = 1.32 / step
 *    medium:  3 tiles, 1 death  → 66.7% safe → mult ×1.485
 *    hard:    2 tiles, 1 death  → 50% safe → mult ×1.98
 *    expert:  3 tiles, 2 deaths → 33.3% safe → mult ×2.97
 *    master:  4 tiles, 3 deaths → 25% safe → mult ×3.96
 *  Total rows: 9 (so max ladder, master = 3.96^9 ≈ 60,000× theoretical
 *  but capped by Stake's display formatting). */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';
export const ROWS = 9;

const DIFFS: Record<Difficulty, { tiles: number; deaths: number }> = {
  easy:    { tiles: 4, deaths: 1 },
  medium:  { tiles: 3, deaths: 1 },
  hard:    { tiles: 2, deaths: 1 },
  expert:  { tiles: 3, deaths: 2 },
  master:  { tiles: 4, deaths: 3 },
};

const HOUSE_EDGE = 0.01;

export function configFor(d: Difficulty) {
  return DIFFS[d];
}

export function stepMultiplierFor(d: Difficulty): number {
  const { tiles, deaths } = DIFFS[d];
  const safe = tiles - deaths;
  if (safe <= 0) return 0;
  // Per-step fair multiplier = tiles / safe; with house edge each step.
  return +((tiles / safe) * (1 - HOUSE_EDGE)).toFixed(4);
}

export function multiplierAt(d: Difficulty, step: number): number {
  if (step <= 0) return 1;
  const m = stepMultiplierFor(d);
  return +Math.pow(m, step).toFixed(4);
}

/** Place skull positions per row, deterministically from RNG. */
export function placeTower(rng: Rng, d: Difficulty): number[][] {
  const cfg = DIFFS[d];
  const board: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const indices = Array.from({ length: cfg.tiles }, (_, i) => i);
    // Shuffle
    for (let i = cfg.tiles - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    board.push(indices.slice(0, cfg.deaths).sort((a, b) => a - b));
  }
  return board;
}

export type TowerRound = {
  difficulty: Difficulty;
  bet: number;
  /** skulls[row] = sorted array of skull tile indices */
  skulls: number[][];
  /** picks[row] = the player's tile choice for that row */
  picks: (number | null)[];
  step: number; // 0..ROWS — current row to pick (= picks completed)
  done: boolean;
  hitSkull: boolean;
  payout: number;
};

export function startRound(rng: Rng, bet: number, difficulty: Difficulty): TowerRound {
  return {
    difficulty,
    bet,
    skulls: placeTower(rng, difficulty),
    picks: new Array(ROWS).fill(null),
    step: 0,
    done: false,
    hitSkull: false,
    payout: 0,
  };
}

export function pickTile(round: TowerRound, tile: number): TowerRound {
  if (round.done || round.step >= ROWS) return round;
  const skulls = round.skulls[round.step]!;
  const isSkull = skulls.includes(tile);
  const picks = round.picks.slice();
  picks[round.step] = tile;
  if (isSkull) {
    return { ...round, picks, done: true, hitSkull: true, payout: 0 };
  }
  const newStep = round.step + 1;
  if (newStep >= ROWS) {
    // Won the whole tower
    const m = multiplierAt(round.difficulty, ROWS);
    return { ...round, picks, step: newStep, done: true, payout: +(round.bet * m).toFixed(2) };
  }
  return { ...round, picks, step: newStep };
}

export function cashOut(round: TowerRound): TowerRound {
  if (round.done || round.step === 0) return round;
  const m = multiplierAt(round.difficulty, round.step);
  return { ...round, done: true, payout: +(round.bet * m).toFixed(2) };
}
