/** Aviator — Crash math, rocket visual.
 *  Re-exports Crash's engine so the math is shared (99/u bust, 99% RTP). */

export {
  rollBust as rollCrash,
  multiplierAt,
  timeForMultiplier,
} from '../crash/engine';
