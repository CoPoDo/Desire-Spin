import type { Rng } from '../../../lib/fairness';

/** Limbo (Stake-style): pick a target multiplier; RNG produces a result.
 *  Win if result >= target. Multiplier paid = target.
 *  Math: result = 0.99 / u, u uniform on (0, 1). Gives P(result >= T) = 0.99/T,
 *  i.e. winChance% = 99/T (1% house edge / 99% RTP — matches Stake). */

const MAX_MULT = 1_000_000;

export function rollLimbo(rng: Rng): number {
  const u = Math.max(rng.next(), 1e-7); // avoid div-by-zero
  const raw = 99 / (u * 100); // result in (1, MAX]
  const capped = Math.min(raw, MAX_MULT);
  // 2-decimal precision; floor so the displayed value is achievable
  return Math.max(1, Math.floor(capped * 100) / 100);
}

export function winChanceFor(target: number): number {
  if (target < 1.01) return 0;
  return 99 / target; // %, 1% house edge
}

export type LimboPlay = {
  result: number;
  win: boolean;
  payoutMultiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number, target: number): LimboPlay {
  const result = rollLimbo(rng);
  const win = result >= target;
  return {
    result,
    win,
    payoutMultiplier: target,
    payout: win ? +(bet * target).toFixed(2) : 0,
  };
}
