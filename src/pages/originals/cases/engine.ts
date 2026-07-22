import type { Rng } from '../../../lib/fairness';

export type CaseRisk = 'easy' | 'medium' | 'hard' | 'expert';
export type Rarity = 'common' | 'tiny' | 'small' | 'medium' | 'rare' | 'legendary' | 'mythic';

export type CaseItem = {
  id: string;
  rarity: Rarity;
  multiplier: number;
  label: string;
  emoji: string;
  weight: number;
  color: string;
  glow: string;
};

const COLORS: Record<Rarity, [string, string]> = {
  common: ['#6b7280', 'rgba(107,114,128,.4)'],
  tiny: ['#a8a29e', 'rgba(168,162,158,.5)'],
  small: ['#22d3ee', 'rgba(34,211,238,.6)'],
  medium: ['#1fff7a', 'rgba(31,255,122,.7)'],
  rare: ['#a78bfa', 'rgba(167,139,250,.8)'],
  legendary: ['#ffd166', 'rgba(255,209,102,.9)'],
  mythic: ['#ff7ad9', 'rgba(255,122,217,1)'],
};

function item(id: string, rarity: Rarity, multiplier: number, weight: number): CaseItem {
  const [color, glow] = COLORS[rarity];
  return {
    id,
    rarity,
    multiplier,
    weight,
    label: multiplier === 0 ? 'Empty' : `${multiplier}×`,
    emoji: multiplier === 0 ? '·' : multiplier >= 10000 ? '★' : multiplier >= 50 ? '◆' : '●',
    color,
    glow,
  };
}

/** Integer weights are parts per million. Every mode has 98% theoretical RTP. */
export const CASE_POOLS: Readonly<Record<CaseRisk, readonly CaseItem[]>> = {
  easy: [
    item('easy-empty', 'common', 0, 7499), item('easy-half', 'tiny', 0.5, 302000),
    item('easy-08', 'small', 0.8, 250000), item('easy-one', 'small', 1, 250000),
    item('easy-12', 'medium', 1.2, 120000), item('easy-two', 'rare', 2, 50000),
    item('easy-five', 'legendary', 5, 20000), item('easy-fifty', 'legendary', 50, 500),
    item('easy-max', 'mythic', 10000, 1),
  ],
  medium: [
    item('medium-empty', 'common', 0, 5995), item('medium-02', 'tiny', 0.2, 400000),
    item('medium-half', 'tiny', 0.5, 250000), item('medium-one', 'small', 1, 175000),
    item('medium-15', 'medium', 1.5, 100000), item('medium-three', 'rare', 3, 50000),
    item('medium-ten', 'legendary', 10, 15000), item('medium-25', 'legendary', 25, 4000),
    item('medium-max', 'mythic', 10000, 5),
  ],
  hard: [
    item('hard-empty', 'common', 0, 555955), item('hard-02', 'tiny', 0.2, 250000),
    item('hard-half', 'tiny', 0.5, 100000), item('hard-one', 'small', 1, 55000),
    item('hard-three', 'medium', 3, 25000), item('hard-ten', 'rare', 10, 10000),
    item('hard-fifty', 'legendary', 50, 4000), item('hard-max', 'mythic', 10000, 45),
  ],
  expert: [
    item('expert-empty', 'common', 0, 753451), item('expert-01', 'tiny', 0.1, 150000),
    item('expert-half', 'tiny', 0.5, 60000), item('expert-two', 'small', 2, 22500),
    item('expert-ten', 'medium', 10, 10000), item('expert-fifty', 'rare', 50, 4000),
    item('expert-hundred', 'legendary', 100, 1000), item('expert-max', 'mythic', 10000, 49),
  ],
};

export const CASE_ITEMS = CASE_POOLS.medium;
export const TOTAL_WEIGHT = 1_000_000;

export function caseRtp(risk: CaseRisk): number {
  return CASE_POOLS[risk].reduce((sum, prize) => sum + prize.multiplier * prize.weight / TOTAL_WEIGHT, 0);
}

export function pickItem(rng: Rng, risk: CaseRisk = 'medium'): CaseItem {
  const pool = CASE_POOLS[risk];
  const roll = rng.nextInt(TOTAL_WEIGHT);
  let cursor = 0;
  for (const prize of pool) {
    cursor += prize.weight;
    if (roll < cursor) return prize;
  }
  return pool[0]!;
}

export type CasesResult = { item: CaseItem; bet: number; multiplier: number; payout: number; risk: CaseRisk };

export function play(rng: Rng, bet: number, risk: CaseRisk = 'medium'): CasesResult {
  const prize = pickItem(rng, risk);
  return { item: prize, bet, multiplier: prize.multiplier, payout: +(bet * prize.multiplier).toFixed(2), risk };
}
