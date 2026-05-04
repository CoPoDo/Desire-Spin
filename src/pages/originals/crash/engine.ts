import type { Rng } from '../../../lib/fairness';

/** Crash (Stake-style):
 *  Multiplier rises over time from 1.00× until it "busts" at a randomly
 *  determined point. Player wins bet × current multiplier if they cash out
 *  before the bust.
 *
 *  Bust distribution: P(bust >= T) = 0.99 / T  (1% house edge / 99% RTP).
 *  Math is identical to Limbo's RNG mapping. */

const BUST_CAP = 100_000;

export function rollBust(rng: Rng): number {
  const u = Math.max(rng.next(), 1e-7);
  const raw = 99 / (u * 100);
  const capped = Math.min(raw, BUST_CAP);
  return Math.max(1, Math.floor(capped * 100) / 100);
}

/** Multiplier as a function of elapsed seconds from round start.
 *  Tuned so 2× ≈ 12s, 5× ≈ 27s, 10× ≈ 39s — matches Stake's pacing. */
export function multiplierAt(secs: number): number {
  const m = Math.pow(Math.E, 0.06 * secs);
  return Math.max(1, Math.floor(m * 100) / 100);
}

/** Inverse: at what time does the multiplier reach M? */
export function timeForMultiplier(m: number): number {
  return Math.log(Math.max(1, m)) / 0.06;
}
