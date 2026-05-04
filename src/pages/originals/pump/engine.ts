import type { Rng } from '../../../lib/fairness';

/** Pump (Stake's newer original):
 *  Player inflates a balloon. Each pump has a chance to pop (lose all)
 *  or grow the multiplier. Cash out anytime.
 *
 *  Difficulty controls the per-pump pop probability and the corresponding
 *  multiplier step (calibrated for ~99% RTP):
 *
 *    easy    → 4%  pop per pump, ×1.0313 / pump
 *    medium  → 10% pop per pump, ×1.10   / pump
 *    hard    → 25% pop per pump, ×1.32   / pump
 *    expert  → 50% pop per pump, ×1.98   / pump
 *
 *  At each pump the engine rolls a single uniform float; if it's below
 *  the pop probability, the balloon pops. Equivalent to drawing the
 *  pop-pump-number from a geometric distribution at round start, but
 *  this approach lets us record each pump as its own provably-fair draw. */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const POP_PROB: Record<Difficulty, number> = {
  easy: 0.04,
  medium: 0.10,
  hard: 0.25,
  expert: 0.50,
};

const HOUSE_EDGE = 0.01;

export function popProbFor(d: Difficulty): number {
  return POP_PROB[d];
}

/** Per-pump multiplier step. Designed so each pump preserves ~99% RTP. */
export function multStepFor(d: Difficulty): number {
  return +((1 - HOUSE_EDGE) / (1 - POP_PROB[d])).toFixed(4);
}

export function multiplierAt(d: Difficulty, pumps: number): number {
  if (pumps <= 0) return 1;
  return +Math.pow(multStepFor(d), pumps).toFixed(4);
}

/** Roll a single pump: returns true if survived (multiplier grows),
 *  false if popped (round ends, payout 0). */
export function pumpOnce(rng: Rng, d: Difficulty): boolean {
  return rng.next() >= POP_PROB[d];
}

export type PumpRound = {
  difficulty: Difficulty;
  bet: number;
  pumps: number;
  popped: boolean;
  cashed: boolean;
  payout: number;
};

export function newRound(bet: number, difficulty: Difficulty): PumpRound {
  return { difficulty, bet, pumps: 0, popped: false, cashed: false, payout: 0 };
}

export function applyPump(round: PumpRound, survived: boolean): PumpRound {
  if (round.popped || round.cashed) return round;
  if (!survived) return { ...round, popped: true, payout: 0 };
  return { ...round, pumps: round.pumps + 1 };
}

export function cashOut(round: PumpRound): PumpRound {
  if (round.popped || round.cashed || round.pumps === 0) return round;
  const m = multiplierAt(round.difficulty, round.pumps);
  return { ...round, cashed: true, payout: +(round.bet * m).toFixed(2) };
}
