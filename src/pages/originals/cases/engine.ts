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

/** Published cumulative probability bands converted to parts per million.
 * All4 modes return98%; their maxima differ:23/115/1000/10000x.
 * Source: https://stake.com/provably-fair/calculation?game=cases . */
export const CASE_POOLS: Readonly<Record<CaseRisk, readonly CaseItem[]>> = {
  easy: [
    item('easy-0', 'tiny', 0.1, 410000),
    item('easy-1', 'tiny', 0.4, 350000),
    item('easy-2', 'small', 1.09, 100000),
    item('easy-3', 'medium', 2, 70000),
    item('easy-4', 'medium', 3, 40000),
    item('easy-5', 'rare', 10, 20000),
    item('easy-6', 'rare', 23, 10000)
  ],
  medium: [
    item('medium-0', 'common', 0, 300000),
    item('medium-1', 'tiny', 0.2, 270000),
    item('medium-2', 'tiny', 0.4, 180000),
    item('medium-3', 'small', 1.5, 130000),
    item('medium-4', 'medium', 2, 60000),
    item('medium-5', 'medium', 3.5, 30000),
    item('medium-6', 'medium', 7.5, 15000),
    item('medium-7', 'rare', 10, 8500),
    item('medium-8', 'rare', 15, 4000),
    item('medium-9', 'rare', 41, 1500),
    item('medium-10', 'legendary', 115, 1000)
  ],
  hard: [
    item('hard-0', 'common', 0, 350000),
    item('hard-1', 'tiny', 0.2, 250000),
    item('hard-2', 'tiny', 0.4, 120000),
    item('hard-3', 'tiny', 0.8, 100000),
    item('hard-4', 'small', 1.5, 100000),
    item('hard-5', 'medium', 3, 50000),
    item('hard-6', 'medium', 8, 20000),
    item('hard-7', 'rare', 10, 4000),
    item('hard-8', 'rare', 15, 3000),
    item('hard-9', 'rare', 35, 2000),
    item('hard-10', 'rare', 50, 400),
    item('hard-11', 'legendary', 100, 300),
    item('hard-12', 'legendary', 250, 150),
    item('hard-13', 'legendary', 495, 100),
    item('hard-14', 'mythic', 1000, 50)
  ],
  expert: [
    item('expert-0', 'common', 0, 353900),
    item('expert-1', 'tiny', 0.15, 200000),
    item('expert-2', 'tiny', 0.3, 150000),
    item('expert-3', 'tiny', 0.7, 150000),
    item('expert-4', 'small', 1.5, 80000),
    item('expert-5', 'medium', 5, 30000),
    item('expert-6', 'medium', 7, 20000),
    item('expert-7', 'rare', 10, 8000),
    item('expert-8', 'rare', 15, 5000),
    item('expert-9', 'rare', 20, 2000),
    item('expert-10', 'rare', 50, 400),
    item('expert-11', 'rare', 75, 300),
    item('expert-12', 'legendary', 100, 200),
    item('expert-13', 'legendary', 250, 100),
    item('expert-14', 'legendary', 460, 50),
    item('expert-15', 'legendary', 850, 30),
    item('expert-16', 'mythic', 1500, 12),
    item('expert-17', 'mythic', 3500, 6),
    item('expert-18', 'mythic', 10000, 2)
  ]
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
