import type { Rng } from '../../../lib/fairness';

/** Rock-Paper-Scissors — pick your move, RNG picks the opponent's move.
 *
 *  Outcomes (with 1% house edge):
 *  - Win (1/3 prob):  pay 1.97× → RTP = (1/3)(1.97) + (1/3)(1) = 0.99
 *  - Tie (1/3 prob):  push (return stake)
 *  - Loss (1/3 prob): lose stake
 */

export type Move = 'rock' | 'paper' | 'scissors';
export const MOVES: Move[] = ['rock', 'paper', 'scissors'];

export const MOVE_EMOJI: Record<Move, string> = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

export const WIN_PAYOUT = 1.97; // 1% house edge on win
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
