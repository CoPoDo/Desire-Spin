import type { Rng } from '../../../lib/fairness';

/** Blackjack engine (Stake-style, single shoe abstracted as infinite deck).
 *
 *  Rules:
 *  - Dealer stands on all 17s (incl. soft 17)
 *  - Blackjack pays 3:2 (1.5× profit, 2.5× total return)
 *  - Player may Hit / Stand / Double on 2 cards, Split on equal-rank pairs
 *  - Split allows up to 4 hands total. Each split hand can hit/double.
 *  - Standard ace soft/hard handling
 *  - ~99.5% RTP with basic strategy */

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export type Suit = typeof SUITS[number];
export type Card = { rank: number; suit: Suit };

const MAX_SPLITS = 3; // up to 4 hands total

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
  // True blackjack is only on the INITIAL deal (2 cards). Split hands
  // that reach 21 with the first two cards pay 1:1 in standard rules
  // — we'll match that convention by exposing blackjack here only for
  // 2-card 21s and letting the caller decide whether to honor it.
  const blackjack = cards.length === 2 && sum === 21;
  return { value: sum, soft, bust: sum > 21, blackjack };
}

export type Outcome = 'player-blackjack' | 'player-win' | 'push' | 'dealer-win' | 'player-bust';

export type Hand = {
  cards: Card[];
  bet: number;          // bet attached to this hand (may double)
  doubled: boolean;
  done: boolean;        // stood, busted, 21, or doubled-and-resolved
  fromSplit: boolean;   // split hands cannot blackjack-pay (standard rule)
  outcome?: Outcome;
  payout?: number;      // populated when phase is done
};

export type RoundState = {
  hands: Hand[];
  activeIdx: number;    // which hand the player is currently acting on
  dealer: Card[];
  initialBet: number;   // the original bet placed, used to compute split costs
  phase: 'player' | 'dealer' | 'done';
  outcome: Outcome | null; // SUMMARY outcome: 'player-win' if any hand won, etc.
  payout: number;       // sum across all hands
};

function makeHand(cards: Card[], bet: number, opts: { fromSplit?: boolean; done?: boolean } = {}): Hand {
  return { cards, bet, doubled: false, done: opts.done ?? false, fromSplit: opts.fromSplit ?? false };
}

export function dealRound(rng: Rng, bet: number): RoundState {
  const player: Card[] = [drawCard(rng), drawCard(rng)];
  const dealer: Card[] = [drawCard(rng), drawCard(rng)];
  const playerHand = handValue(player);
  const dealerHand = handValue(dealer);
  const hand = makeHand(player, bet);
  const base: RoundState = {
    hands: [hand],
    activeIdx: 0,
    dealer,
    initialBet: bet,
    phase: 'player',
    outcome: null,
    payout: 0,
  };
  // Immediate resolutions on dealt blackjacks
  if (playerHand.blackjack && dealerHand.blackjack) {
    hand.done = true;
    hand.outcome = 'push';
    hand.payout = bet;
    return { ...base, phase: 'done', outcome: 'push', payout: bet };
  }
  if (playerHand.blackjack) {
    hand.done = true;
    hand.outcome = 'player-blackjack';
    hand.payout = +(bet * 2.5).toFixed(2);
    return { ...base, phase: 'done', outcome: 'player-blackjack', payout: hand.payout };
  }
  if (dealerHand.blackjack) {
    hand.done = true;
    hand.outcome = 'dealer-win';
    hand.payout = 0;
    return { ...base, phase: 'done', outcome: 'dealer-win', payout: 0 };
  }
  return base;
}

/** True if the active hand can split: 2 cards of the same rank, fewer
 *  than MAX_SPLITS splits have happened, and the player isn't on a
 *  split-Ace (which standard Stake rules treat as a single auto-stand
 *  card per hand — we model that by setting done=true after split for
 *  Aces). */
export function canSplit(state: RoundState): boolean {
  if (state.phase !== 'player') return false;
  if (state.hands.length > MAX_SPLITS) return false;
  const h = state.hands[state.activeIdx];
  if (!h || h.cards.length !== 2 || h.done) return false;
  return h.cards[0]!.rank === h.cards[1]!.rank;
}

/** Cost the caller must debit to perform the split (one extra bet at
 *  the original size). */
export function splitCost(state: RoundState): number {
  return state.initialBet;
}

/** Splits the active hand into two hands. Each gets one of the original
 *  cards plus a fresh draw. The new hand is inserted at activeIdx + 1
 *  so the player finishes the LEFT hand first, then the RIGHT.
 *
 *  Split Aces follow common casino rules: each receives exactly one
 *  card and auto-stands (done=true). A 21 on a split Ace pays 1:1,
 *  NOT as a natural blackjack. */
export function split(rng: Rng, state: RoundState): RoundState {
  if (!canSplit(state)) return state;
  const h = state.hands[state.activeIdx]!;
  const isAces = h.cards[0]!.rank === 1;
  const left = makeHand([h.cards[0]!, drawCard(rng)], state.initialBet, {
    fromSplit: true,
    done: isAces,
  });
  const right = makeHand([h.cards[1]!, drawCard(rng)], state.initialBet, {
    fromSplit: true,
    done: isAces,
  });
  // Replace active hand with [left, right]. Other hands unchanged.
  const newHands = [
    ...state.hands.slice(0, state.activeIdx),
    left,
    right,
    ...state.hands.slice(state.activeIdx + 1),
  ];
  let next: RoundState = {
    ...state,
    hands: newHands,
    // After split, focus stays on `left` (which is at activeIdx). If
    // left auto-stood (Aces), advance to next.
  };
  next = advanceIfDone(rng, next);
  return next;
}

/** If the active hand is done, advance to next hand. If all hands are
 *  done, resolve the dealer. Idempotent — safe to call on any state. */
function advanceIfDone(rng: Rng, state: RoundState): RoundState {
  let cur = state;
  while (cur.activeIdx < cur.hands.length && cur.hands[cur.activeIdx]!.done) {
    cur = { ...cur, activeIdx: cur.activeIdx + 1 };
  }
  if (cur.activeIdx >= cur.hands.length) {
    return resolveDealer(rng, { ...cur, phase: 'dealer' });
  }
  return cur;
}

export function hit(rng: Rng, state: RoundState): RoundState {
  if (state.phase !== 'player') return state;
  const idx = state.activeIdx;
  const h = state.hands[idx];
  if (!h || h.done) return state;
  const newCards = [...h.cards, drawCard(rng)];
  const v = handValue(newCards);
  const updated: Hand = { ...h, cards: newCards };
  if (v.bust) {
    updated.done = true;
    updated.outcome = 'player-bust';
    updated.payout = 0;
  } else if (v.value === 21) {
    updated.done = true; // auto-stand on 21
  }
  const nextHands = [...state.hands];
  nextHands[idx] = updated;
  const next: RoundState = { ...state, hands: nextHands };
  if (updated.done) {
    return advanceIfDone(rng, next);
  }
  return next;
}

export function double(rng: Rng, state: RoundState): RoundState {
  if (state.phase !== 'player') return state;
  const idx = state.activeIdx;
  const h = state.hands[idx];
  if (!h || h.done || h.cards.length !== 2) return state;
  const newCards = [...h.cards, drawCard(rng)];
  const v = handValue(newCards);
  const updated: Hand = {
    ...h,
    cards: newCards,
    bet: h.bet * 2,
    doubled: true,
    done: true, // double = one card then auto-stand
  };
  if (v.bust) {
    updated.outcome = 'player-bust';
    updated.payout = 0;
  }
  const nextHands = [...state.hands];
  nextHands[idx] = updated;
  return advanceIfDone(rng, { ...state, hands: nextHands });
}

export function stand(rng: Rng, state: RoundState): RoundState {
  if (state.phase !== 'player') return state;
  const idx = state.activeIdx;
  const h = state.hands[idx];
  if (!h || h.done) return state;
  const updated: Hand = { ...h, done: true };
  const nextHands = [...state.hands];
  nextHands[idx] = updated;
  return advanceIfDone(rng, { ...state, hands: nextHands });
}

export function resolveDealer(rng: Rng, state: RoundState): RoundState {
  // Only draw the dealer's full hand if any player hand survived (i.e.,
  // didn't bust). If every player hand busted, the dealer's hole stays
  // unseen and pays nothing on every hand. We still expose the dealer
  // cards for transparency — draw them anyway.
  const dealer = [...state.dealer];
  while (true) {
    const v = handValue(dealer);
    if (v.value >= 17) break; // stand on all 17s
    dealer.push(drawCard(rng));
  }
  const dv = handValue(dealer);
  const newHands = state.hands.map<Hand>((h) => {
    if (h.outcome) return h; // already resolved (bust or natural BJ)
    const pv = handValue(h.cards);
    let outcome: Outcome;
    let payout = 0;
    if (pv.bust) {
      outcome = 'player-bust';
    } else if (dv.bust || pv.value > dv.value) {
      outcome = 'player-win';
      payout = h.bet * 2;
    } else if (pv.value < dv.value) {
      outcome = 'dealer-win';
    } else {
      outcome = 'push';
      payout = h.bet;
    }
    return { ...h, outcome, payout: +payout.toFixed(2) };
  });
  const totalPayout = newHands.reduce((s, h) => s + (h.payout ?? 0), 0);
  // Round summary: pick a single representative outcome for the legacy
  // RoundState.outcome field. Player wins overall if total payout > total
  // bet; loses if < ; pushes if =.
  const totalBet = newHands.reduce((s, h) => s + h.bet, 0);
  let summary: Outcome;
  if (totalPayout > totalBet) summary = 'player-win';
  else if (totalPayout < totalBet) summary = 'dealer-win';
  else summary = 'push';
  return {
    ...state,
    dealer,
    hands: newHands,
    phase: 'done',
    outcome: summary,
    payout: +totalPayout.toFixed(2),
  };
}
