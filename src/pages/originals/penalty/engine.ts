import type { Rng } from '../../../lib/fairness';

/** Penalty Shootout — pick a zone in the goal, watch the keeper dive
 *  somewhere via weighted RNG. If your zone ≠ keeper's zone, it's a goal.
 *
 *  Five zones with different keeper-defense rates → different payouts:
 *     ┌──────────┬──────────┬──────────┐
 *     │ TOP-LEFT │  CENTER  │ TOP-RIGHT│   (top row: hardest reach for keeper)
 *     ├──────────┴──────────┴──────────┤
 *     │ BOT-LEFT          BOT-RIGHT   │   (bottom row: more defended)
 *     └────────────────────────────────┘
 *
 *  Keeper-defense weights (sum to 100):
 *     top-left  : 12%   →  P(goal) = 88%   →  pay 1.125×
 *     top-right : 12%   →  P(goal) = 88%   →  pay 1.125×
 *     center    : 40%   →  P(goal) = 60%   →  pay 1.65×
 *     bot-left  : 18%   →  P(goal) = 82%   →  pay 1.207×
 *     bot-right : 18%   →  P(goal) = 82%   →  pay 1.207×
 *
 *  Each payout = 0.99 / P(goal), so every zone individually returns
 *  99% RTP — players choose risk vs reward, the house edge stays flat.
 */

export type Zone = 'top-left' | 'top-right' | 'center' | 'bot-left' | 'bot-right';
export const ZONES: Zone[] = ['top-left', 'top-right', 'center', 'bot-left', 'bot-right'];

const KEEPER_WEIGHTS: Record<Zone, number> = {
  'top-left': 12,
  'top-right': 12,
  'center': 40,
  'bot-left': 18,
  'bot-right': 18,
};
const KEEPER_TOTAL = 100;

export const ZONE_LABELS: Record<Zone, string> = {
  'top-left': 'Top L',
  'top-right': 'Top R',
  'center': 'Center',
  'bot-left': 'Bot L',
  'bot-right': 'Bot R',
};

export function zonePayoutMultiplier(zone: Zone): number {
  const keeperP = KEEPER_WEIGHTS[zone] / KEEPER_TOTAL;
  const goalP = 1 - keeperP;
  return +(0.99 / goalP).toFixed(3);
}

export function pickKeeperZone(rng: Rng): Zone {
  const r = rng.nextInt(KEEPER_TOTAL);
  let acc = 0;
  for (const zone of ZONES) {
    acc += KEEPER_WEIGHTS[zone];
    if (r < acc) return zone;
  }
  return 'center';
}

export type PenaltyResult = {
  player: Zone;
  keeper: Zone;
  goal: boolean;
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number, player: Zone): PenaltyResult {
  const keeper = pickKeeperZone(rng);
  const goal = keeper !== player;
  const multiplier = goal ? zonePayoutMultiplier(player) : 0;
  return {
    player,
    keeper,
    goal,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}
