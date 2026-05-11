import type { Rng } from '../../../lib/fairness';

/** Dragon Tiger — two cards dealt face-down (one to Dragon, one to Tiger).
 *  Highest card wins. Bet on Dragon, Tiger, or Tie.
 *
 *  Single deck (52 cards), 2 dealt without replacement:
 *    P(Tie)         = 13 × C(4,2) / C(52,2) = 78/1326 ≈ 5.88%
 *    P(Dragon win)  = (1 − 78/1326) / 2     ≈ 47.06%
 *    P(Tiger  win)  = 47.06%
 *
 *  Payouts calibrated for 99% RTP:
 *    Dragon/Tiger: 1.98× on win, push on tie, 0× on lose.
 *      RTP = 0.4706 × 1.98 + 0.0588 × 1 ≈ 0.9907.
 *    Tie:          16.83× on win, 0× on lose (no push).
 *      RTP = 0.0588 × 16.83 ≈ 0.99.
 *
 *  Card ranks: 2 (low) … A (high, 14). Suits don't break ties.
 */

export type Side = 'dragon' | 'tiger';
export type BetKind = Side | 'tie';

export const DRAGON_TIGER_PAYOUT = 1.98;
export const TIE_PAYOUT = 16.83;

export type Card = {
  rank: number; // 2..14
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
};

const SUITS: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function rankLabel(rank: number): string {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return String(rank);
}

export function suitGlyph(suit: Card['suit']): string {
  return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit];
}

export function suitIsRed(suit: Card['suit']): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/** Draw one card from a standard deck (uniform over 52 cards). */
function drawCard(rng: Rng, exclude?: Card): Card {
  // For 2-card-without-replacement we only need to skip one prior card.
  // Reroll if we'd duplicate the excluded card (vanishingly small skew vs.
  // a full Fisher-Yates over 52 — and keeps the RNG draw count stable).
  while (true) {
    const idx = rng.nextInt(52); // 0..51
    const rank = (idx % 13) + 2; // 2..14
    const suit = SUITS[Math.floor(idx / 13)]!;
    const card: Card = { rank, suit };
    if (!exclude || !(exclude.rank === rank && exclude.suit === suit)) return card;
  }
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
export function payoutMultiplier(kind: BetKind, winner: Side | 'tie'): number {
  if (kind === 'tie') return winner === 'tie' ? TIE_PAYOUT : 0;
  if (winner === kind) return DRAGON_TIGER_PAYOUT;
  if (winner === 'tie') return 1; // push for dragon/tiger bets
  return 0;
}

/** Roll the round and resolve every active bet. Supports placing on
 *  multiple kinds simultaneously (e.g., Dragon + Tie). */
export function play(
  rng: Rng,
  bets: { kind: BetKind; amount: number }[],
): DragonTigerResult {
  const dragon = drawCard(rng);
  const tiger = drawCard(rng, dragon);
  const winner: Side | 'tie' =
    dragon.rank > tiger.rank ? 'dragon' : tiger.rank > dragon.rank ? 'tiger' : 'tie';

  let totalStake = 0;
  let totalReturn = 0;
  const perBet = bets.map(({ kind, amount }) => {
    totalStake += amount;
    const multiplier = payoutMultiplier(kind, winner);
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
