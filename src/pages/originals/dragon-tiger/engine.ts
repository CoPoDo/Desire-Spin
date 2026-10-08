import type { Rng } from '../../../lib/fairness';

/** Eight-deck Dragon Tiger, pinned to the Evolution-style public variant.
 * Ace is low; Dragon/Tiger return 2x, or half the stake on a tie.
 * Tie returns 12x and Suited Tie 51x, including stake.
 * Sources: https://stake.com/casino/games/evolution-dragon-tiger and
 * https://games.evolution.com/live-casino/dragon-tiger/ . */

export type Side = 'dragon' | 'tiger';
export type BetKind = Side | 'tie' | 'suitedTie';

export const DRAGON_TIGER_PAYOUT = 2;
export const TIE_PAYOUT = 12;
export const SUITED_TIE_PAYOUT = 51;

export type Card = {
  rank: number; // 1..13 (Ace low)
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  deck: number;
};

const SUITS: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function rankLabel(rank: number): string {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 1) return 'A';
  return String(rank);
}

export function suitGlyph(suit: Card['suit']): string {
  return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit];
}

export function suitIsRed(suit: Card['suit']): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/** Draw one card from a standard deck (uniform over 52 cards). */
function cardAt(idx: number): Card {
  return { rank: (idx % 13) + 1, suit: SUITS[Math.floor(idx / 13) % 4]!, deck: Math.floor(idx / 52) };
}

export type DragonTigerResult = {
  dragon: Card;
  tiger: Card;
  winner: Side | 'tie';
  /** Per-bet outcome: which bet kind, how much was staked, and what
   *  was returned (multiplier × amount, 0 on lose, amount on push). */
  perBet: { kind: BetKind; amount: number; multiplier: number; returned: number }[];
  totalStake: number;
  totalReturn: number;
};

/** Compute the payout multiplier (including stake) for a single bet
 *  given the round's winner. */
export function payoutMultiplier(kind: BetKind, winner: Side | 'tie', suitedTie = false): number {
  if (kind === 'suitedTie') return winner === 'tie' && suitedTie ? SUITED_TIE_PAYOUT : 0;
  if (kind === 'tie') return winner === 'tie' ? TIE_PAYOUT : 0;
  if (winner === kind) return DRAGON_TIGER_PAYOUT;
  if (winner === 'tie') return .5; // half the main stake is returned on a tie
  return 0;
}

/** Roll the round and resolve every active bet. Supports placing on
 *  multiple kinds simultaneously (e.g., Dragon + Tie). */
export function play(
  rng: Rng,
  bets: { kind: BetKind; amount: number }[],
): DragonTigerResult {
  const dragonIndex = rng.nextInt(416);
  const tigerRaw = rng.nextInt(415);
  const tigerIndex = tigerRaw >= dragonIndex ? tigerRaw + 1 : tigerRaw;
  const dragon = cardAt(dragonIndex);
  const tiger = cardAt(tigerIndex);
  const winner: Side | 'tie' =
    dragon.rank > tiger.rank ? 'dragon' : tiger.rank > dragon.rank ? 'tiger' : 'tie';

  let totalStake = 0;
  let totalReturn = 0;
  const perBet = bets.map(({ kind, amount }) => {
    totalStake += amount;
    const multiplier = payoutMultiplier(kind, winner, winner === 'tie' && dragon.suit === tiger.suit);
    const returned = +(amount * multiplier).toFixed(2);
    totalReturn += returned;
    return { kind, amount, multiplier, returned };
  });

  return {
    dragon,
    tiger,
    winner,
    perBet,
    totalStake: +totalStake.toFixed(2),
    totalReturn: +totalReturn.toFixed(2),
  };
}
