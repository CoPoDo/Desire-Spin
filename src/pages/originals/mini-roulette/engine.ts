import type { Rng } from '../../../lib/fairness';

/** Mini Roulette — a 13-pocket variant: 0 (green) plus 1–12 (red/black).
 *
 *  Numbers 1, 3, 5, 7, 9, 11 are red; 2, 4, 6, 8, 10, 12 are black; 0 is green.
 *  All bets calibrated for 99% RTP (0.99 / win-probability).
 *
 *  Win probabilities + payouts:
 *    Single number (12 + 0 = 13 pockets):
 *      P = 1/13 ≈ 7.69%   →  pay 12.87× (true 13×, 1% house edge)
 *    Color (red OR black, 6 pockets each):
 *      P = 6/13 ≈ 46.15%  →  pay 2.145×
 *    Even / Odd (excludes 0):
 *      P = 6/13 ≈ 46.15%  →  pay 2.145×
 *    Low (1–6) / High (7–12):
 *      P = 6/13 ≈ 46.15%  →  pay 2.145×
 *    Quad (1–4 / 5–8 / 9–12):
 *      P = 4/13 ≈ 30.77%  →  pay 3.2175×
 */

export const POCKETS = 13; // 0..12
export const RED_NUMBERS = new Set<number>([1, 3, 5, 7, 9, 11]);
export const BLACK_NUMBERS = new Set<number>([2, 4, 6, 8, 10, 12]);

export const STRAIGHT_PAYOUT = 12.87;
export const EVEN_MONEY_PAYOUT = 2.145;
export const QUAD_PAYOUT = 3.2175;

export type BetType =
  | { kind: 'number'; n: number } // 0..12
  | { kind: 'color'; color: 'red' | 'black' }
  | { kind: 'parity'; parity: 'even' | 'odd' }
  | { kind: 'half'; half: 'low' | 'high' } // 1-6 / 7-12
  | { kind: 'quad'; quad: 1 | 2 | 3 };     // 1-4 / 5-8 / 9-12

export type Bet = { type: BetType; amount: number };

export function spinWheel(rng: Rng): number {
  return rng.nextInt(POCKETS);
}

export function colorOf(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

export function payoutMultiplier(type: BetType, winning: number): number {
  switch (type.kind) {
    case 'number':
      return winning === type.n ? STRAIGHT_PAYOUT : 0;
    case 'color':
      if (winning === 0) return 0;
      return colorOf(winning) === type.color ? EVEN_MONEY_PAYOUT : 0;
    case 'parity':
      if (winning === 0) return 0;
      return (winning % 2 === 0) === (type.parity === 'even') ? EVEN_MONEY_PAYOUT : 0;
    case 'half':
      if (winning === 0) return 0;
      if (type.half === 'low') return winning <= 6 ? EVEN_MONEY_PAYOUT : 0;
      return winning >= 7 ? EVEN_MONEY_PAYOUT : 0;
    case 'quad':
      if (winning === 0) return 0;
      if (type.quad === 1) return winning <= 4 ? QUAD_PAYOUT : 0;
      if (type.quad === 2) return winning >= 5 && winning <= 8 ? QUAD_PAYOUT : 0;
      return winning >= 9 ? QUAD_PAYOUT : 0;
  }
}

export type MiniRouletteResult = {
  winning: number;
  totalStake: number;
  totalReturn: number;
  perBet: { bet: Bet; returned: number }[];
};

export function play(rng: Rng, bets: Bet[]): MiniRouletteResult {
  const winning = spinWheel(rng);
  let totalStake = 0;
  let totalReturn = 0;
  const perBet = bets.map((b) => {
    totalStake += b.amount;
    const m = payoutMultiplier(b.type, winning);
    const returned = +(b.amount * m).toFixed(2);
    totalReturn += returned;
    return { bet: b, returned };
  });
  return {
    winning,
    totalStake: +totalStake.toFixed(2),
    totalReturn: +totalReturn.toFixed(2),
    perBet,
  };
}
