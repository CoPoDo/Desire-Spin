import type { Rng } from '../../../lib/fairness';

/** Slide — visual cousin of Limbo. Player sets a target multiplier; the
 *  slider lights up in real-time as it builds toward a stop point picked
 *  by the RNG. If the slider's stop point ≥ target, player wins (target
 *  pays target). Same provably-fair math as Limbo (99 / u), 1% house edge.
 *
 *  Differs from Crash: the stop point is fixed at round start (no live
 *  cashout); from Limbo: animated live build-up reveals the stop value
 *  gradually instead of instant reveal. */

const MAX_MULT = 1_000_000;

export function rollSlide(rng: Rng): number {
  const u = Math.max(rng.next(), 1e-7);
  const raw = 99 / (u * 100);
  return Math.max(1, Math.floor(Math.min(raw, MAX_MULT) * 100) / 100);
}

export function winChanceFor(target: number): number {
  if (target < 1.01) return 0;
  return 99 / target;
}

export type SlidePlay = {
  /** The stop value the slider lands on. */
  stop: number;
  /** Player's target. */
  target: number;
  win: boolean;
  /** Multiplier paid (= target on win, 0 on loss). */
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number, target: number): SlidePlay {
  const stop = rollSlide(rng);
  const win = stop >= target;
  return {
    stop,
    target,
    win,
    multiplier: win ? target : 0,
    payout: win ? +(bet * target).toFixed(2) : 0,
  };
}
