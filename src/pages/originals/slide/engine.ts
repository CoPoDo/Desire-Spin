import type { Rng } from '../../../lib/fairness';
import { MAX_STAKE, moneyCents } from '../../../lib/accounting';

/** Local single-player Slide. Published rules allow separate amounts/targets
 * against one result, with a 2% edge. Conversion follows the operator-linked
 * seeding formula, but the input is our local seeded RNG, not its hash chain.
 * https://stake.com/blog/how-to-play-slide-on-stake
 * https://stake.com/provably-fair/game-events
 * https://bitcointalk.org/index.php?topic=5278260.0
 * Local limits (not claimed as provider limits): 10 wagers, 10,000 total
 * credits, 1,000,000× target/result. Money and displayed stops use cents. */
export const SLIDE_MAX_TARGET = 1_000_000;
export const SLIDE_MAX_BETS = 10;
const RETURN_PERCENT = 98;
export const SLIDE_RETURN = RETURN_PERCENT / 100;
const UINT32_RANGE = 2 ** 32;

export type SlideWager = { amount: number; target: number };
export type SlidePlay = {
  stop: number;
  target: number;
  win: boolean;
  /** Gross return multiplier: target on a win, otherwise zero. */
  multiplier: number;
  payout: number;
};
export type SlideBetResult = SlidePlay & { amount: number };
export type SlideRound = {
  stop: number;
  bets: SlideBetResult[];
  totalStake: number;
  payout: number;
  /** Aggregate gross return / aggregate stake, not the stop value. */
  multiplier: number;
  net: number;
};

export function isSlideTarget(target: number): boolean {
  return Number.isFinite(target) && target >= 1.01 && target <= SLIDE_MAX_TARGET &&
    Math.abs(target * 100 - Math.round(target * 100)) < 1e-6;
}

/** Reject the entire slip before any debit or random draw. Never trim it. */
export function slideStake(wagers: readonly SlideWager[]): number | null {
  if (wagers.length < 1 || wagers.length > SLIDE_MAX_BETS) return null;
  let totalCents = 0;
  for (const wager of wagers) {
    const cents = moneyCents(wager.amount);
    if (cents === null || cents < 1 || cents > MAX_STAKE * 100 ||
        Math.abs(wager.amount * 100 - cents) > 1e-6 || !isSlideTarget(wager.target)) return null;
    totalCents += cents;
  }
  return totalCents <= MAX_STAKE * 100 ? totalCents / 100 : null;
}

export function rollSlide(rng: Rng): number {
  const float = rng.next();
  if (!Number.isFinite(float) || float < 0 || float >= 1) throw new RangeError('Invalid Slide random draw');
  const integer = Math.floor(float * UINT32_RANGE);
  // Integer numerator avoids an IEEE-754 1.28 → 1.27 error at exact
  // boundaries. This is floor(2^32 / (integer + 1) * 0.98 * 100).
  const stopCents = Math.floor(UINT32_RANGE * RETURN_PERCENT / (integer + 1));
  return Math.max(1, Math.min(SLIDE_MAX_TARGET, stopCents / 100));
}

/** Exact local 32-bit probability for a supported, two-decimal target. */
export function winChanceFor(target: number): number {
  if (!isSlideTarget(target)) return 0;
  return Math.floor(UINT32_RANGE * RETURN_PERCENT / Math.round(target * 100)) / UINT32_RANGE * 100;
}

/** Round each gross return once, with an integer product for exact half cents. */
export function slideReturnFor(amount: number, target: number): number {
  const cents = moneyCents(amount);
  if (cents === null || cents < 1 || amount > MAX_STAKE ||
      Math.abs(amount * 100 - cents) > 1e-6 || !isSlideTarget(target)) return 0;
  return Math.round(cents * Math.round(target * 100) / 100) / 100;
}

function settle(stop: number, bet: number, target: number): SlidePlay {
  const possibleReturn = slideReturnFor(bet, target);
  const win = possibleReturn > 0 && stop >= target;
  return { stop, target, win, multiplier: win ? target : 0, payout: win ? possibleReturn : 0 };
}

/** Backwards-compatible single-wager entry point. */
export function play(rng: Rng, bet: number, target: number): SlidePlay {
  return settle(rollSlide(rng), bet, target);
}

/** Exactly one random draw for every target, including duplicate targets. */
export function playRound(rng: Rng, wagers: readonly SlideWager[]): SlideRound {
  const totalStake = slideStake(wagers);
  if (totalStake === null) throw new RangeError('Invalid Slide wager setup');
  const stop = rollSlide(rng);
  const bets = wagers.map(({ amount, target }) => ({ amount, ...settle(stop, amount, target) }));
  const payoutCents = bets.reduce((sum, bet) => sum + Math.round(bet.payout * 100), 0);
  const payout = payoutCents / 100;
  return { stop, bets, totalStake, payout, multiplier: payout / totalStake, net: (payoutCents - Math.round(totalStake * 100)) / 100 };
}
