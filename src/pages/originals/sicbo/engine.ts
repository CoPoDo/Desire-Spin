import type { Rng } from '../../../lib/fairness';

/** Sic Bo — three-dice ancient Chinese casino game.
 *
 *  Roll 3 dice (each 1..6 = 216 equally likely outcomes). Bet types
 *  with payouts calibrated for ~99% RTP:
 *
 *  Small (sum 4-10, no triples):
 *    P = 105/216 ≈ 48.61%   →  2.04×   (RTP = 0.4861 × 2.04 ≈ 0.9916)
 *  Big   (sum 11-17, no triples):
 *    P = 105/216 ≈ 48.61%   →  2.04×
 *  Odd  (no triples):
 *    P = 105/216 ≈ 48.61%   →  2.04×
 *  Even (no triples):
 *    P = 105/216 ≈ 48.61%   →  2.04×
 *  Any Triple (3-of-a-kind, any face):
 *    P = 6/216  ≈ 2.78%     →  35.64×  (RTP ≈ 0.99)
 *  Specific Triple (e.g. 4-4-4):
 *    P = 1/216  ≈ 0.46%     →  213.84× (RTP ≈ 0.99)
 *  Specific Total (sum N for N in 4..17):
 *    P = ways(N)/216        →  varies; payouts table tuned to 99% RTP each.
 *
 *  Specific-total payouts (excluding 3 and 18 since those are "any triple"
 *  territory) — designed so each bet pays ~99% RTP independently.
 *    sum 4:  ways=3  → 0.99 × 216/3  ≈ 71.28×
 *    sum 5:  ways=6  → 0.99 × 216/6  ≈ 35.64×
 *    sum 6:  ways=10 → 21.38×
 *    sum 7:  ways=15 → 14.26×
 *    sum 8:  ways=21 → 10.18×
 *    sum 9:  ways=25 → 8.55×
 *    sum 10: ways=27 → 7.92×
 *    sum 11: ways=27 → 7.92×
 *    sum 12: ways=25 → 8.55×
 *    sum 13: ways=21 → 10.18×
 *    sum 14: ways=15 → 14.26×
 *    sum 15: ways=10 → 21.38×
 *    sum 16: ways=6  → 35.64×
 *    sum 17: ways=3  → 71.28×
 */

export const SUM_WAYS: Record<number, number> = {
  3: 1,  4: 3,  5: 6,  6: 10, 7: 15, 8: 21, 9: 25, 10: 27,
  11: 27, 12: 25, 13: 21, 14: 15, 15: 10, 16: 6, 17: 3, 18: 1,
};

export const SUM_PAYOUTS: Record<number, number> = Object.fromEntries(
  Object.entries(SUM_WAYS)
    .filter(([n]) => +n >= 4 && +n <= 17)
    .map(([n, w]) => [n, +(0.99 * 216 / w).toFixed(2)]),
);

export const SMALL_BIG_PAYOUT = 2.04;
export const ODD_EVEN_PAYOUT = 2.04;
export const ANY_TRIPLE_PAYOUT = 35.64;
export const SPECIFIC_TRIPLE_PAYOUT = 213.84;

export type Bet =
  | { kind: 'small' }
  | { kind: 'big' }
  | { kind: 'odd' }
  | { kind: 'even' }
  | { kind: 'anyTriple' }
  | { kind: 'specificTriple'; face: number } // 1..6
  | { kind: 'total'; sum: number }           // 4..17
  | { kind: 'singleDie'; face: number };     // 1..6, pays per count

export type Roll = [number, number, number];

export function roll(rng: Rng): Roll {
  return [rng.nextInt(6) + 1, rng.nextInt(6) + 1, rng.nextInt(6) + 1] as Roll;
}

export function isTriple(r: Roll): boolean {
  return r[0] === r[1] && r[1] === r[2];
}

export function payoutMultiplier(bet: Bet, r: Roll): number {
  const sum = r[0] + r[1] + r[2];
  const triple = isTriple(r);
  switch (bet.kind) {
    case 'small':
      return !triple && sum >= 4 && sum <= 10 ? SMALL_BIG_PAYOUT : 0;
    case 'big':
      return !triple && sum >= 11 && sum <= 17 ? SMALL_BIG_PAYOUT : 0;
    case 'odd':
      return !triple && sum % 2 === 1 ? ODD_EVEN_PAYOUT : 0;
    case 'even':
      return !triple && sum % 2 === 0 ? ODD_EVEN_PAYOUT : 0;
    case 'anyTriple':
      return triple ? ANY_TRIPLE_PAYOUT : 0;
    case 'specificTriple':
      return triple && r[0] === bet.face ? SPECIFIC_TRIPLE_PAYOUT : 0;
    case 'total':
      // Sum bets win on ANY 3-dice combination producing that sum,
      // including triples (Stake / standard Sic Bo convention). The
      // earlier `&& !triple` exclusion broke RTP on sums 6/9/12/15
      // (where a triple shares that sum) — payouts were calibrated
      // against the full ways-count, but triples were silently
      // disqualified, so RTP fell to ~89-95% for those sums instead
      // of the 99% target.
      return sum === bet.sum ? (SUM_PAYOUTS[bet.sum] ?? 0) : 0;
    case 'singleDie': {
      // Real Sic Bo "single die" wager: pays 1:1 / 2:1 / 3:1 (returns
      // 2× / 3× / 4× including stake) when the chosen face appears
      // on 1 / 2 / 3 of the three dice. RTP = (75×2 + 15×3 + 1×4)/216
      // ≈ 92.13% — high house edge by design, matches real Sic Bo.
      const count =
        (r[0] === bet.face ? 1 : 0) +
        (r[1] === bet.face ? 1 : 0) +
        (r[2] === bet.face ? 1 : 0);
      return count === 0 ? 0 : count + 1; // 2× / 3× / 4×
    }
  }
}

export type SicBoResult = {
  dice: Roll;
  sum: number;
  isTriple: boolean;
  totalStake: number;
  totalReturn: number;
  perBet: { bet: Bet; amount: number; returned: number }[];
};

export function play(
  rng: Rng,
  bets: { bet: Bet; amount: number }[],
): SicBoResult {
  const dice = roll(rng);
  let totalStake = 0;
  let totalReturn = 0;
  const perBet = bets.map((b) => {
    totalStake += b.amount;
    const m = payoutMultiplier(b.bet, dice);
    const returned = +(b.amount * m).toFixed(2);
    totalReturn += returned;
    return { bet: b.bet, amount: b.amount, returned };
  });
  return {
    dice,
    sum: dice[0] + dice[1] + dice[2],
    isTriple: isTriple(dice),
    totalStake: +totalStake.toFixed(2),
    totalReturn: +totalReturn.toFixed(2),
    perBet,
  };
}
