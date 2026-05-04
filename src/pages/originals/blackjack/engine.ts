import type { Rng } from '../../../lib/fairness';

/** Blackjack engine (Stake-style, single shoe abstracted as infinite deck).
 *
 *  Rules:
 *  - Dealer stands on all 17s (incl. soft 17)
 *  - Blackjack pays 3:2 (1.5× profit, 2.5× total return)
 *  - Player may Hit / Stand / Double on 2 cards (no split for v1 simplicity)
 *  - Standard ace soft/hard handling
 *  - ~99.5% RTP with basic strategy */

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export type Suit = typeof SUITS[number];
export type Card = { rank: number; suit: Suit };

export function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function rankValue(rank: number): number {
  if (rank === 1) return 1; // ace counted as 1; soft handled in handValue
  if (rank >= 11) return 10;
  return rank;
}

export function drawCard(rng: Rng): Card {
  const rank = rng.nextInt(13) + 1;
  const suit = SUITS[rng.nextInt(4)]!;
  return { rank, suit };
}

export type HandValue = { value: number; soft: boolean; bust: boolean; blackjack: boolean };

export function handValue(cards: Card[]): HandValue {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 1) aces++;
    sum += rankValue(c.rank);
  }
  let soft = false;
  if (aces > 0 && sum + 10 <= 21) {
    sum += 10;
    soft = true;
  }
  const blackjack = cards.length === 2 && sum === 21;
  return { value: sum, soft, bust: sum > 21, blackjack };
}

export type Outcome = 'player-blackjack' | 'player-win' | 'push' | 'dealer-win' | 'player-bust';

export type RoundState = {
  player: Card[];
  dealer: Card[];
  bet: number;
  initialBet: number; // pre-double
  phase: 'player' | 'dealer' | 'done';
  outcome: Outcome | null;
  payout: number;
  doubled: boolean;
};

export function dealRound(rng: Rng, bet: number): RoundState {
  const player: Card[] = [drawCard(rng), drawCard(rng)];
  const dealer: Card[] = [drawCard(rng), drawCard(rng)];
  const playerHand = handValue(player);
  const dealerHand = handValue(dealer);
  // Immediate resolutions on dealt blackjacks
  if (playerHand.blackjack && dealerHand.blackjack) {
    return { player, dealer, bet, initialBet: bet, phase: 'done', outcome: 'push', payout: bet, doubled: false };
  }
  if (playerHand.blackjack) {
    return { player, dealer, bet, initialBet: bet, phase: 'done', outcome: 'player-blackjack', payout: +(bet * 2.5).toFixed(2), doubled: false };
  }
  if (dealerHand.blackjack) {
    return { player, dealer, bet, initialBet: bet, phase: 'done', outcome: 'dealer-win', payout: 0, doubled: false };
  }
  return { player, dealer, bet, initialBet: bet, phase: 'player', outcome: null, payout: 0, doubled: false };
}

export function hit(rng: Rng, state: RoundState): RoundState {
  if (state.phase !== 'player') return state;
  const player = [...state.player, drawCard(rng)];
  const v = handValue(player);
  if (v.bust) {
    return { ...state, player, phase: 'done', outcome: 'player-bust', payout: 0 };
  }
  if (v.value === 21) {
    // Auto-stand on 21
    return resolveDealer(rng, { ...state, player, phase: 'dealer' });
  }
  return { ...state, player };
}

export function double(rng: Rng, state: RoundState): RoundState {
  if (state.phase !== 'player' || state.player.length !== 2) return state;
  const player = [...state.player, drawCard(rng)];
  const newBet = state.initialBet * 2;
  const v = handValue(player);
  const next: RoundState = { ...state, player, bet: newBet, doubled: true };
  if (v.bust) return { ...next, phase: 'done', outcome: 'player-bust', payout: 0 };
  return resolveDealer(rng, { ...next, phase: 'dealer' });
}

export function stand(rng: Rng, state: RoundState): RoundState {
  if (state.phase !== 'player') return state;
  return resolveDealer(rng, { ...state, phase: 'dealer' });
}

export function resolveDealer(rng: Rng, state: RoundState): RoundState {
  const dealer = [...state.dealer];
  while (true) {
    const v = handValue(dealer);
    if (v.value >= 17) break; // stand on all 17s
    dealer.push(drawCard(rng));
  }
  const dv = handValue(dealer);
  const pv = handValue(state.player);
  let outcome: Outcome;
  let payout = 0;
  if (dv.bust || pv.value > dv.value) {
    outcome = 'player-win';
    payout = state.bet * 2;
  } else if (pv.value < dv.value) {
    outcome = 'dealer-win';
    payout = 0;
  } else {
    outcome = 'push';
    payout = state.bet;
  }
  return { ...state, dealer, phase: 'done', outcome, payout: +payout.toFixed(2) };
}
