import type { Rng } from '../../../lib/fairness';

/** Stake Diamonds: five independently and uniformly selected gem colours. */
export const GEM_TYPES = [
  { id: 'red', emoji: '◆', color: '#ff5560', name: 'Red' },
  { id: 'blue', emoji: '◆', color: '#22d3ee', name: 'Blue' },
  { id: 'green', emoji: '◆', color: '#1fff7a', name: 'Green' },
  { id: 'purple', emoji: '◆', color: '#a78bfa', name: 'Purple' },
  { id: 'yellow', emoji: '◆', color: '#ffc62a', name: 'Yellow' },
  { id: 'orange', emoji: '◆', color: '#ff9b47', name: 'Orange' },
  { id: 'white', emoji: '◆', color: '#f5f0e4', name: 'White' },
] as const;

export type GemId = typeof GEM_TYPES[number]['id'];
export type DiamondCategory = 'no-match' | 'pair' | 'two-pair' | 'three-kind' | 'full-house' | 'four-kind' | 'five-kind';

export const DIAMOND_PAYTABLE: Readonly<Record<DiamondCategory, number>> = {
  'no-match': 0,
  pair: 0.1,
  'two-pair': 2,
  'three-kind': 3,
  'full-house': 4,
  'four-kind': 5,
  'five-kind': 50,
};

export const DIAMOND_CATEGORY_LABEL: Readonly<Record<DiamondCategory, string>> = {
  'no-match': 'No match',
  pair: 'Pair',
  'two-pair': 'Two pair',
  'three-kind': 'Three of a kind',
  'full-house': 'Full house',
  'four-kind': 'Four of a kind',
  'five-kind': 'Five of a kind',
};

export type DiamondsResult = {
  gems: GemId[];
  category: DiamondCategory;
  winningGems: GemId[];
  /** Compatibility fields used by the presentation layer. */
  bestCount: number;
  bestGem: GemId;
  multiplier: number;
  payout: number;
};

export function classify(gems: readonly GemId[]): Pick<DiamondsResult, 'category' | 'winningGems' | 'bestCount' | 'bestGem'> {
  if (gems.length !== 5) throw new Error('Diamonds requires exactly five gems');
  const counts = new Map<GemId, number>();
  for (const gem of gems) counts.set(gem, (counts.get(gem) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const sizes = groups.map(([, count]) => count);
  const bestCount = sizes[0] ?? 1;
  const bestGem = groups[0]?.[0] ?? 'red';

  let category: DiamondCategory = 'no-match';
  if (bestCount === 5) category = 'five-kind';
  else if (bestCount === 4) category = 'four-kind';
  else if (bestCount === 3 && sizes[1] === 2) category = 'full-house';
  else if (bestCount === 3) category = 'three-kind';
  else if (bestCount === 2 && sizes[1] === 2) category = 'two-pair';
  else if (bestCount === 2) category = 'pair';

  const winningGems = category === 'no-match'
    ? []
    : groups.filter(([, count]) => count >= 2).map(([gem]) => gem);
  return { category, winningGems, bestCount, bestGem };
}

export function play(rng: Rng, bet: number): DiamondsResult {
  const gems = Array.from({ length: 5 }, () => GEM_TYPES[rng.nextInt(GEM_TYPES.length)]!.id);
  const classification = classify(gems);
  const multiplier = DIAMOND_PAYTABLE[classification.category];
  return {
    gems,
    ...classification,
    multiplier,
    payout: +(bet * multiplier).toFixed(2),
  };
}

export function gemMeta(id: GemId) {
  return GEM_TYPES.find((gem) => gem.id === id)!;
}
