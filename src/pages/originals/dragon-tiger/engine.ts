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
  bet: BetKind;
  amount: number;
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, amount: number, bet: BetKind): DragonTigerResult {
  const dragon = drawCard(rng);
  const tiger = drawCard(rng, dragon);
  const winner: Side | 'tie' =
    dragon.rank > tiger.rank ? 'dragon' : tiger.rank > dragon.rank ? 'tiger' : 'tie';

  let multiplier = 0;
  if (bet === 'tie') {
    multiplier = winner === 'tie' ? TIE_PAYOUT : 0;
  } else {
    if (winner === bet) multiplier = DRAGON_TIGER_PAYOUT;
    else if (winner === 'tie') multiplier = 1; // push
    else multiplier = 0;
  }

  return {
    dragon,
    tiger,
    winner,
    bet,
    amount,
    multiplier,
    payout: +(amount * multiplier).toFixed(2),
  };
}
