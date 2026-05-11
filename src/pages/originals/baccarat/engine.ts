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
  /** First two cards of each side match in rank — pays the pair side
   *  bets. Computed at deal time. */
  playerPair: boolean;
  bankerPair: boolean;
};

/** Side-bet kinds supported on the Baccarat table. The two main bets
 *  (player/banker/tie) are Side; the two side bets are first-two-card
 *  pair bets at 11:1, matching real Punto Banco. */
export type BetKind = Side | 'playerPair' | 'bankerPair';

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
  const playerPair = player.length >= 2 && player[0]!.rank === player[1]!.rank;
  const bankerPair = banker.length >= 2 && banker[0]!.rank === banker[1]!.rank;
  return { player, banker, playerTotal: pTotal, bankerTotal: bTotal, winner, playerPair, bankerPair };
}

export function payoutFor(kind: BetKind, bet: number, round: BaccaratRound): number {
  const { winner, playerPair, bankerPair } = round;
  switch (kind) {
    case 'player':
      if (winner === 'player') return bet * 2;
      if (winner === 'tie') return bet; // push
      return 0;
    case 'banker':
      if (winner === 'banker') return +(bet * 1.95).toFixed(2); // 5% commission
      if (winner === 'tie') return bet; // push
      return 0;
    case 'tie':
      return winner === 'tie' ? bet * 9 : 0;
    case 'playerPair':
      // Real Baccarat pair side bet: 11:1 (pays 12× including stake)
      // when the first two cards of player match in rank.
      return playerPair ? bet * 12 : 0;
    case 'bankerPair':
      return bankerPair ? bet * 12 : 0;
  }
}
