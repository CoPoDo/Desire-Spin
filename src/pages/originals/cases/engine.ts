import type { Rng } from '../../../lib/fairness';

/** Cases — open a crate, get a weighted random prize.
 *
 *  Prize table (99% RTP, 1% house edge):
 *    Multiplier × Probability summed to 0.99 EV.
 *
 *  Common (0×):       52.0%   →  0
 *  Tiny    (0.5×):    30.0%   →  0.15
 *  Small   (1.5×):    12.0%   →  0.18
 *  Medium  (3×):       5.0%   →  0.15
 *  Rare    (10×):      0.6%   →  0.06
 *  Legendary (50×):    0.3%   →  0.15
 *  Mythic  (300×):     0.1%   →  0.30
 *  Total weight:     100.0%   EV = 0.99 ✓
 */

export type Rarity = 'common' | 'tiny' | 'small' | 'medium' | 'rare' | 'legendary' | 'mythic';

export type CaseItem = {
  id: string;
  rarity: Rarity;
  multiplier: number;
  label: string;
  emoji: string;
  weight: number; // sums to 1000 (parts per mille for clean integer math)
  color: string;
  glow: string;
};

export const CASE_ITEMS: CaseItem[] = [
  // Common — bulk of opens. Worthless.
  { id: 'dust',    rarity: 'common', multiplier: 0,     label: 'Dust',     emoji: '💨', weight: 520, color: '#6b7280', glow: 'rgba(107,114,128,.4)' },
  // Tiny — small fraction back.
  { id: 'shard',   rarity: 'tiny',   multiplier: 0.5,   label: 'Shard',    emoji: '🪙', weight: 300, color: '#a8a29e', glow: 'rgba(168,162,158,.5)' },
  // Small — break-even-ish.
  { id: 'gem',     rarity: 'small',  multiplier: 1.5,   label: 'Gem',      emoji: '💎', weight: 120, color: '#22d3ee', glow: 'rgba(34,211,238,.6)' },
  // Medium — small profit.
  { id: 'medal',   rarity: 'medium', multiplier: 3,     label: 'Medal',    emoji: '🏅', weight: 50,  color: '#1fff7a', glow: 'rgba(31,255,122,.7)' },
  // Rare.
  { id: 'crown',   rarity: 'rare',   multiplier: 10,    label: 'Crown',    emoji: '👑', weight: 6,   color: '#a78bfa', glow: 'rgba(167,139,250,.8)' },
  // Legendary.
  { id: 'star',    rarity: 'legendary', multiplier: 50, label: 'Star',     emoji: '🌟', weight: 3,   color: '#ffd166', glow: 'rgba(255,209,102,.9)' },
  // Mythic — super rare.
  { id: 'unicorn', rarity: 'mythic', multiplier: 300,   label: 'Unicorn',  emoji: '🦄', weight: 1,   color: '#ff7ad9', glow: 'rgba(255,122,217,1)' },
];

export const TOTAL_WEIGHT = CASE_ITEMS.reduce((s, i) => s + i.weight, 0);

export function pickItem(rng: Rng): CaseItem {
  const r = rng.nextInt(TOTAL_WEIGHT);
  let acc = 0;
  for (const item of CASE_ITEMS) {
    acc += item.weight;
    if (r < acc) return item;
  }
  return CASE_ITEMS[CASE_ITEMS.length - 1]!;
}

export type CasesResult = {
  item: CaseItem;
  bet: number;
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number): CasesResult {
  const item = pickItem(rng);
  return {
    item,
    bet,
    multiplier: item.multiplier,
    payout: +(bet * item.multiplier).toFixed(2),
  };
}
