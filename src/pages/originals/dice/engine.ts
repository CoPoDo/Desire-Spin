import type { Rng } from '../../../lib/fairness';

/** Dice game (Stake-style):
 *  - RNG produces a roll in [0, 100) with 2 decimal precision
 *  - Player chooses a direction (over | under) and a target threshold
 *  - Win if roll satisfies the direction relative to target
 *  - Multiplier = 99 / winChance% (1% house edge, matches Stake's 0.99 RTP)
 */

export type DiceDirection = 'over' | 'under';

export type DiceRoll = {
  roll: number;
  win: boolean;
  multiplier: number;
  winChance: number;
  payout: number;
};

const HOUSE_EDGE = 0.01; // 1% — matches Stake's 99% RTP on Dice.

/** 0 to 99.99 inclusive on each end */
export function rollDice(rng: Rng): number {
  // Two independent draws to get a 0-9999 integer, then divide by 100.
  // This matches Stake's documented dice roll math (4-decimal precision
  // expressed as 2-decimal display).
  const v = rng.nextInt(10000);
  return Math.round(v / 100 * 100) / 100; // 2-decimal precision
}

export function winChanceFor(direction: DiceDirection, target: number): number {
  // Target is the threshold the roll must beat. Roll is in [0, 100).
  if (direction === 'over') return Math.max(0, 100 - target);
  return Math.max(0, target);
}

export function multiplierFor(direction: DiceDirection, target: number): number {
  const chance = winChanceFor(direction, target);
  if (chance <= 0) return 0;
  return +((100 - HOUSE_EDGE * 100) / chance).toFixed(4);
}

export function play(
  rng: Rng,
  bet: number,
  direction: DiceDirection,
  target: number,
): DiceRoll {
  const roll = rollDice(rng);
  const win = direction === 'over' ? roll > target : roll < target;
  const multiplier = multiplierFor(direction, target);
  return {
    roll,
    win,
    multiplier,
    winChance: winChanceFor(direction, target),
    payout: win ? +(bet * multiplier).toFixed(2) : 0,
  };
}
