import type { Rng } from '../../../lib/fairness';

/** European Roulette — single 0, no double-zero. RTP = 36/37 ≈ 97.30%.
 *  No house edge tweak needed; the green 0 provides the edge naturally. */

export const TOTAL = 37; // 0..36

export const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
export const BLACK_NUMBERS = new Set<number>([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

export type BetType =
  | { kind: 'number'; n: number }      // 35:1
  | { kind: 'color'; color: 'red' | 'black' } // 1:1
  | { kind: 'parity'; parity: 'even' | 'odd' } // 1:1
  | { kind: 'half'; half: 'low' | 'high' }     // 1:1 (1-18 / 19-36)
  | { kind: 'dozen'; dozen: 1 | 2 | 3 }        // 2:1 (1-12 / 13-24 / 25-36)
  | { kind: 'column'; column: 1 | 2 | 3 }      // 2:1
  | { kind: 'street'; street: number }         // 11:1 — 3 numbers in a column
  | { kind: 'sixline'; sixline: number }
  | { kind: 'split'; numbers: readonly [number, number] }
  | { kind: 'corner'; numbers: readonly [number, number, number, number] }
  | { kind: 'trio'; numbers: readonly [0, 1, 2] | readonly [0, 2, 3] }
  | { kind: 'first-four' };      // 5:1 — 6 numbers (two adjacent streets, 1-11)

/** Canonical European inside-bet sets. Values are pocket numbers, not
 * neighbouring wheel pockets; zero has three dedicated split seams. */
export const SPLIT_BETS: readonly (readonly [number, number])[] = [
  [0, 1], [0, 2], [0, 3],
  ...Array.from({ length: 12 }, (_, row) => [[row * 3 + 1, row * 3 + 2], [row * 3 + 2, row * 3 + 3]] as [number, number][]).flat(),
  ...Array.from({ length: 33 }, (_, index) => [index + 1, index + 4] as [number, number]),
];
export const CORNER_BETS: readonly (readonly [number, number, number, number])[] = Array.from({ length: 11 }, (_, row) => [
  [row * 3 + 1, row * 3 + 2, row * 3 + 4, row * 3 + 5],
  [row * 3 + 2, row * 3 + 3, row * 3 + 5, row * 3 + 6],
] as [number, number, number, number][]).flat();
function validSet(values: readonly number[], choices: readonly (readonly number[])[]): boolean {
  return choices.some((choice) => choice.length === values.length && choice.every((value) => values.includes(value)) && new Set(values).size === values.length);
}

export type Bet = { type: BetType; amount: number };

export function spinWheel(rng: Rng): number {
  return rng.nextInt(TOTAL);
}

export function colorOf(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

/** Returns the payout multiplier (including the staked amount) on a given
 *  bet for a given winning number. 0 means the bet lost. */
export function payoutMultiplier(type: BetType, winningNumber: number): number {
  const n = winningNumber;
  switch (type.kind) {
    case 'split':
      return validSet(type.numbers, SPLIT_BETS) && type.numbers.includes(n) ? 18 : 0;
    case 'corner':
      return validSet(type.numbers, CORNER_BETS) && type.numbers.includes(n) ? 9 : 0;
    case 'trio':
      return validSet(type.numbers, [[0, 1, 2], [0, 2, 3]]) && (type.numbers as readonly number[]).includes(n) ? 12 : 0;
    case 'first-four':
      return n >= 0 && n <= 3 ? 9 : 0;
    case 'number':
      return n === type.n ? 36 : 0; // 35:1 + stake = 36×
    case 'color':
      if (n === 0) return 0;
      return colorOf(n) === type.color ? 2 : 0;
    case 'parity':
      if (n === 0) return 0;
      return (n % 2 === 0) === (type.parity === 'even') ? 2 : 0;
    case 'half':
      if (n === 0) return 0;
      if (type.half === 'low') return n <= 18 ? 2 : 0;
      return n >= 19 ? 2 : 0;
    case 'dozen':
      if (n === 0) return 0;
      if (type.dozen === 1) return n <= 12 ? 3 : 0;
      if (type.dozen === 2) return n >= 13 && n <= 24 ? 3 : 0;
      return n >= 25 ? 3 : 0;
    case 'column':
      if (n === 0) return 0;
      // Column 1: 1, 4, 7, ..., 34 → n % 3 === 1
      // Column 2: 2, 5, 8, ..., 35 → n % 3 === 2
      // Column 3: 3, 6, 9, ..., 36 → n % 3 === 0
      const col = n % 3 === 0 ? 3 : (n % 3) as 1 | 2;
      return col === type.column ? 3 : 0;
    case 'street': {
      // Street s covers numbers (3s-2, 3s-1, 3s) — e.g., street 1 =
      // {1, 2, 3}; street 4 = {10, 11, 12}; street 12 = {34, 35, 36}.
      // Pays 11:1 (12× including stake) → RTP = 12 × 3/37 ≈ 97.30%.
      if (n === 0) return 0;
      const lo = type.street * 3 - 2;
      const hi = type.street * 3;
      return n >= lo && n <= hi ? 12 : 0;
    }
    case 'sixline': {
      // Six-line s covers two adjacent streets — e.g., sixline 1 =
      // {1, 2, 3, 4, 5, 6}; sixline 11 = {31, 32, 33, 34, 35, 36}.
      // Pays 5:1 (6× including stake) → RTP = 6 × 6/37 ≈ 97.30%.
      if (n === 0) return 0;
      const lo = type.sixline * 3 - 2;
      const hi = type.sixline * 3 + 3;
      return n >= lo && n <= hi ? 6 : 0;
    }
  }
}

export type RouletteResult = {
  winningNumber: number;
  totalStake: number;
  totalReturn: number;
  perBet: { bet: Bet; returned: number }[];
};

export function play(rng: Rng, bets: Bet[]): RouletteResult {
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
    winningNumber: winning,
    totalStake: +totalStake.toFixed(2),
    totalReturn: +totalReturn.toFixed(2),
    perBet,
  };
}
