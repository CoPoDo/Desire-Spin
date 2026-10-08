import type { Rng } from '../../../lib/fairness';

/** Dragon Tower: nine rows, one fixed 2% edge on the cashout total.
 *  Each row is independently shuffled. The per-row fair growth is tiles/safe.
 *  Source: https://stake.com/casino/games/dragon-tower (98% RTP).
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';
export const ROWS = 9;

const DIFFS: Record<Difficulty, { tiles: number; deaths: number }> = {
  easy:    { tiles: 4, deaths: 1 },
  medium:  { tiles: 3, deaths: 1 },
  hard:    { tiles: 2, deaths: 1 },
  expert:  { tiles: 3, deaths: 2 },
  master:  { tiles: 4, deaths: 3 },
};

const HOUSE_EDGE = 0.02;

export function configFor(d: Difficulty) {
  return DIFFS[d];
}

export function stepMultiplierFor(d: Difficulty): number {
  const { tiles, deaths } = DIFFS[d];
  const safe = tiles - deaths;
  if (safe <= 0) return 0;
  // First-row gross return; later rows grow by the fair conditional odds.
  return +((tiles / safe) * (1 - HOUSE_EDGE)).toFixed(4);
}

export function multiplierAt(d: Difficulty, step: number): number {
  if (step <= 0) return 1;
  const { tiles, deaths } = DIFFS[d];
  if (!Number.isInteger(step) || step > ROWS) return 0;
  return +((1 - HOUSE_EDGE) * Math.pow(tiles / (tiles - deaths), step)).toFixed(6);
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
  if (round.done || round.step >= ROWS || !Number.isInteger(tile) || tile < 0 || tile >= configFor(round.difficulty).tiles) return round;
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
