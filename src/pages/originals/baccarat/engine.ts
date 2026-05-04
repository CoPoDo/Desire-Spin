import type { Rng } from '../../../lib/fairness';

/** Baccarat (Punto Banco) — Stake-style.
 *
 *  Bets:
 *    Player → wins on player higher, pays 1:1
 *    Banker → wins on banker higher, pays 0.95:1 (5% commission)
 *    Tie    → pays 8:1
 *
 *  Card values: A=1, 2-9=face, 10/J/Q/K=0. Hand = sum mod 10.
 *  Drawing rules per the standard Punto Banco table. */

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export type Suit = typeof SUITS[number];
export type Card = { rank: number; suit: Suit };
export type Side = 'player' | 'banker' | 'tie';

export function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function cardValue(rank: number): number {
  if (rank >= 10) return 0;
  return rank;
}

export function handTotal(cards: Card[]): number {
  return cards.reduce((s, c) => s + cardValue(c.rank), 0) % 10;
}

export function drawCard(rng: Rng): Card {
  const rank = rng.nextInt(13) + 1;
  const suit = SUITS[rng.nextInt(4)]!;
  return { rank, suit };
}

export type BaccaratRound = {
  player: Card[];
  banker: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: Side;
};

export function play(rng: Rng): BaccaratRound {
  const player: Card[] = [drawCard(rng), drawCard(rng)];
  const banker: Card[] = [drawCard(rng), drawCard(rng)];
  let pTotal = handTotal(player);
  let bTotal = handTotal(banker);

  // Naturals (8 or 9): both stand
  if (pTotal < 8 && bTotal < 8) {
    // Player draws on 0-5, stands on 6-7
    let playerThird: Card | null = null;
    if (pTotal <= 5) {
      playerThird = drawCard(rng);
      player.push(playerThird);
      pTotal = handTotal(player);
    }

    // Banker draw rules
    let bankerDraws = false;
    if (playerThird === null) {
      // Player stood — banker draws on 0-5
      bankerDraws = bTotal <= 5;
    } else {
      const t = cardValue(playerThird.rank);
      if (bTotal <= 2) bankerDraws = true;
      else if (bTotal === 3) bankerDraws = t !== 8;
      else if (bTotal === 4) bankerDraws = t >= 2 && t <= 7;
      else if (bTotal === 5) bankerDraws = t >= 4 && t <= 7;
      else if (bTotal === 6) bankerDraws = t === 6 || t === 7;
      // bTotal 7+: stands
    }
    if (bankerDraws) {
      banker.push(drawCard(rng));
      bTotal = handTotal(banker);
    }
  }

  const winner: Side = pTotal > bTotal ? 'player' : bTotal > pTotal ? 'banker' : 'tie';
  return { player, banker, playerTotal: pTotal, bankerTotal: bTotal, winner };
}

export function payoutFor(side: Side, bet: number, winner: Side): number {
  if (side === winner) {
    if (side === 'player') return bet * 2;
    if (side === 'banker') return +(bet * 1.95).toFixed(2); // 5% commission
    return bet * 9; // tie
  }
  // Tie returns Player and Banker bets (push) — common Punto Banco rule
  if (winner === 'tie' && side !== 'tie') return bet;
  return 0;
}
