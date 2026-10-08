import type { Rng } from '../../../lib/fairness';
/** Local Aviator simulation uses the published 97% edge and25,000x maximum.
 * The Spribe server protocol/multiplayer seed scheme is not reproduced.
 * Source: https://stake.com/ja/casino/games/spribe-aviator . */
export const AVIATOR_RTP = .97;
export const AVIATOR_MAX_MULTIPLIER = 25_000;
export function rollCrash(rng: Rng): number {
  return Math.max(1, Math.floor(Math.min(AVIATOR_MAX_MULTIPLIER, AVIATOR_RTP / Math.max(rng.next(), 1e-7)) * 100) / 100);
}
export { multiplierAt, timeForMultiplier } from '../crash/engine';
