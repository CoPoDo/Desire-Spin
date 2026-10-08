import type { Rng } from '../../../lib/fairness';

/** Sic Bo: three fair dice, with an explicit local total-return table.
 * Small/Big exclude every triple (105 winning combinations out of 216).
 * Odd/Even exclude triples (105/216). Total bets include triples.
 * Returns include the original stake. House edge varies by wager. */

export const SUM_WAYS: Record<number, number> = {
  3: 1,  4: 3,  5: 6,  6: 10, 7: 15, 8: 21, 9: 25, 10: 27,
  11: 27, 12: 25, 13: 21, 14: 15, 15: 10, 16: 6, 17: 3, 18: 1,
};

export const SUM_PAYOUTS: Record<number, number> = {
  4: 51, 5: 19, 6: 15, 7: 13, 8: 9, 9: 7, 10: 7,
  11: 7, 12: 7, 13: 9, 14: 13, 15: 15, 16: 19, 17: 51,
};

export const SMALL_BIG_PAYOUT = 2;
export const ODD_EVEN_PAYOUT = 2;
export const ANY_TRIPLE_PAYOUT = 31;
export const SPECIFIC_TRIPLE_PAYOUT = 181;
// Two-distinct-face coverage and 6:1 profit odds: Crown Sydney approved rules,
// section 6.3. Other bets retain this app's explicitly displayed local variant.
export const COMBINATION_PAYOUT = 7;
export const TWO_DICE_COMBINATIONS: [number, number][] = Array.from({ length: 6 }, (_, i) =>
  Array.from({ length: 5 - i }, (_, j): [number, number] => [i + 1, i + j + 2]),
).flat();

export type Bet =
  | { kind: 'small' }
  | { kind: 'big' }
  | { kind: 'odd' }
  | { kind: 'even' }
  | { kind: 'anyTriple' }
  | { kind: 'specificTriple'; face: number } // 1..6
  | { kind: 'double'; face: number }         // 1..6
  | { kind: 'combination'; faces: [number, number] } // both distinct faces appear
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
    case 'double': {
      const count = r.filter((die) => die === bet.face).length;
      return count >= 2 ? 11 : 0;
    }
    case 'combination': {
      const [first, second] = bet.faces;
      if (![first, second].every(face => Number.isInteger(face) && face >= 1 && face <= 6) || first === second) return 0;
      return r.includes(first) && r.includes(second) ? COMBINATION_PAYOUT : 0;
    }
    case 'total':
      // Sum bets win on ANY 3-dice combination producing that sum,
      // including triples (Stake / standard Sic Bo convention). The
      // earlier `&& !triple` exclusion broke RTP on sums 6/9/12/15
      // (where a triple shares that sum) — payouts were calibrated
      // against the full ways-count, but triples were silently
      // disqualified, so RTP fell to ~89-95% for those sums instead
      // of the payout table probability.
      return sum === bet.sum ? (SUM_PAYOUTS[bet.sum] ?? 0) : 0;
    case 'singleDie': {
      // This table's "single die" wager: pays 1:1 / 2:1 / 3:1 (returns
      // 2× / 3× / 4× including stake) when the chosen face appears
      // on 1 / 2 / 3 of the three dice. RTP = (75×2 + 15×3 + 1×4)/216
      // ≈ 92.13%. Other published variants return more for a triple.
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
