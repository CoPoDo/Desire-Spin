import type { Rng } from '../../../lib/fairness';

/** Stake-style Rock-Paper-Scissors is a streak/cashout game.
 * Win/loss chances are equal after ties; the first win pays 1.96x and
 * each later win doubles the potential return. A tie leaves the streak
 * unchanged. Source: https://stake.com/casino/games/rock-paper-scissors . */

export type Move = 'rock' | 'paper' | 'scissors';
export const MOVES: Move[] = ['rock', 'paper', 'scissors'];

export const MOVE_EMOJI: Record<Move, string> = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

export const WIN_PAYOUT = 1.96; // 2% edge once per decisive streak
export const TIE_PAYOUT = 1; // push

export function pickOpponent(rng: Rng): Move {
  return MOVES[rng.nextInt(3)]!;
}

export type Outcome = 'win' | 'tie' | 'loss';

export function resolve(player: Move, opponent: Move): Outcome {
  if (player === opponent) return 'tie';
  if (
    (player === 'rock' && opponent === 'scissors') ||
    (player === 'paper' && opponent === 'rock') ||
    (player === 'scissors' && opponent === 'paper')
  ) {
    return 'win';
  }
  return 'loss';
}

export type RpsResult = {
  player: Move;
  opponent: Move;
  outcome: Outcome;
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number, player: Move): RpsResult {
  const opponent = pickOpponent(rng);
  const outcome = resolve(player, opponent);
  const multiplier =
    outcome === 'win' ? WIN_PAYOUT : outcome === 'tie' ? TIE_PAYOUT : 0;
  return {
    player,
    opponent,
    outcome,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}


export const RPS_MAX_WINS = 20;
export const RPS_MAX_MULTIPLIER = .98 * 2 ** RPS_MAX_WINS;
export function multiplierAfterWins(wins: number): number {
  const count = Math.max(0, Math.min(RPS_MAX_WINS, Math.floor(wins)));
  return count === 0 ? 1 : +(.98 * 2 ** count).toFixed(4);
}
export type RpsRoundState = {
  bet: number;
  wins: number;
  /** Includes tied throws, unlike wins. No artificial manual throw limit. */
  throws: number;
  done: boolean;
  payout: number;
  lastResult?: RpsResult;
};
export function createRpsRound(bet: number): RpsRoundState {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive and finite');
  return { bet, wins: 0, throws: 0, done: false, payout: 0 };
}
/** No new wager: caller reuses the original round RNG/nonce. */
export function advanceRpsRound(state: RpsRoundState, player: Move, opponent: Move): RpsRoundState {
  if (state.done) return state;
  const outcome = resolve(player, opponent);
  const wins = state.wins + (outcome === 'win' ? 1 : 0);
  const done = outcome === 'loss' || wins >= RPS_MAX_WINS;
  const multiplier = outcome === 'loss' ? 0 : multiplierAfterWins(wins);
  const potential = +(state.bet * multiplier).toFixed(2);
  return { ...state, wins, throws: state.throws + 1, done, payout: done ? potential : 0,
    lastResult: { player, opponent, outcome, multiplier, payout: potential } };
}
export function cashOutRpsRound(state: RpsRoundState): RpsRoundState {
  if (state.done || state.wins === 0) return state;
  return { ...state, done: true, payout: +(state.bet * multiplierAfterWins(state.wins)).toFixed(2) };
}
