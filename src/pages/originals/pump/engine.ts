import type { Rng } from '../../../lib/fairness';

/** Pump is a finite 25-position survival ladder, not a constant-risk geometric
 * game. Difficulty reserves 1/3/5/10 pop positions; safe positions are removed
 * after each successful pump. A single 2% edge applies to the cashout total.
 * This reproduces the published ladder, including the 3,203,384.80× expert top.
 * Sources: https://stake.com/casino/games/pump and
 * https://stake.com/blog/how-to-play-pump-on-stake (official payout chart).
 */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
const POSITIONS = 25;
const POP_POSITIONS: Record<Difficulty, number> = { easy: 1, medium: 3, hard: 5, expert: 10 };
const RTP = 0.98;

export function maxPumpsFor(d: Difficulty): number {
  return POSITIONS - POP_POSITIONS[d];
}

/** Chance of the next pump popping after `pumps` successful pumps. */
export function popProbFor(d: Difficulty, pumps = 0): number {
  if (pumps >= maxPumpsFor(d)) return 1;
  return POP_POSITIONS[d] / (POSITIONS - Math.max(0, Math.floor(pumps)));
}

export function survivalChanceFor(d: Difficulty, pumps: number): number {
  if (!Number.isInteger(pumps) || pumps < 0 || pumps > maxPumpsFor(d)) return 0;
  let chance = 1;
  for (let step = 0; step < pumps; step++) chance *= 1 - popProbFor(d, step);
  return chance;
}

export function multStepFor(d: Difficulty): number {
  return multiplierAt(d, 1);
}

export function multiplierAt(d: Difficulty, pumps: number): number {
  if (pumps === 0) return 1;
  const survival = survivalChanceFor(d, pumps);
  return survival > 0 ? +(RTP / survival).toFixed(6) : 0;
}

export function pumpOnce(rng: Rng, d: Difficulty, pumps = 0): boolean {
  return pumps < maxPumpsFor(d) && rng.next() >= popProbFor(d, pumps);
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
  const next = { ...round, pumps: round.pumps + 1 };
  return next.pumps >= maxPumpsFor(round.difficulty) ? cashOut(next) : next;
}

export function cashOut(round: PumpRound): PumpRound {
  if (round.popped || round.cashed || round.pumps === 0) return round;
  return { ...round, cashed: true, payout: +(round.bet * multiplierAt(round.difficulty, round.pumps)).toFixed(2) };
}
