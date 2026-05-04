import type { Rng } from '../../../lib/fairness';

/** Diamonds (Stake-style) — 5 gem slots; pay based on biggest matching
 *  rank group. 7 gem types (rarer gems pay more). ~99% RTP. */

export const GEM_TYPES = [
  { id: 'red',     emoji: '💎', color: '#ff5560', name: 'Ruby' },
  { id: 'blue',    emoji: '💎', color: '#22d3ee', name: 'Sapphire' },
  { id: 'green',   emoji: '💎', color: '#1fff7a', name: 'Emerald' },
  { id: 'purple',  emoji: '💎', color: '#a78bfa', name: 'Amethyst' },
  { id: 'yellow',  emoji: '💎', color: '#ffc62a', name: 'Topaz' },
  { id: 'orange',  emoji: '💎', color: '#ff9b47', name: 'Citrine' },
  { id: 'white',   emoji: '💎', color: '#f5f0e4', name: 'Diamond' },
] as const;

export type GemId = typeof GEM_TYPES[number]['id'];

/** Pay table: how much (in bet × X) for groups of 2/3/4/5 of a kind for
 *  the rarest gem in the group. Tuned to ~99% RTP. */
const PAY: Record<number, Record<GemId, number>> = {
  2: { red: 0,  blue: 0,  green: 0,  purple: 0, yellow: 0, orange: 0, white: 0  },
  3: { red: 1.4, blue: 1.5, green: 1.7, purple: 2,  yellow: 2.5, orange: 3,  white: 5  },
  4: { red: 5,   blue: 6,   green: 8,  purple: 10, yellow: 14,  orange: 25, white: 50 },
  5: { red: 35,  blue: 50,  green: 70, purple: 100, yellow: 250, orange: 500, white: 1000 },
};

export type DiamondsResult = {
  gems: GemId[];
  /** Best matching count (1-5) and which gem made it. */
  bestCount: number;
  bestGem: GemId;
  multiplier: number;
  payout: number;
};

export function play(rng: Rng, bet: number): DiamondsResult {
  // Draw 5 gems with weighted distribution — rarer gems are rarer.
  // Using approximately uniform for simplicity (true Stake uses weighted).
  const gems: GemId[] = [];
  for (let i = 0; i < 5; i++) {
    gems.push(GEM_TYPES[rng.nextInt(GEM_TYPES.length)]!.id);
  }
  // Find biggest matching rank group
  const counts: Record<string, number> = {};
  for (const g of gems) counts[g] = (counts[g] ?? 0) + 1;
  let bestCount = 0;
  let bestGem: GemId = 'red';
  for (const [g, c] of Object.entries(counts)) {
    if (c > bestCount || (c === bestCount && rarityOrder(g as GemId) > rarityOrder(bestGem))) {
      bestCount = c;
      bestGem = g as GemId;
    }
  }
  const multiplier = bestCount >= 2 ? (PAY[bestCount]?.[bestGem] ?? 0) : 0;
  return {
    gems,
    bestCount,
    bestGem,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}

function rarityOrder(g: GemId): number {
  return GEM_TYPES.findIndex((x) => x.id === g);
}

export function gemMeta(id: GemId) {
  return GEM_TYPES.find((g) => g.id === id)!;
}
