import type { Rng } from '../../../lib/fairness';

/** Mini Slot — classic 3-reel single-line slot.
 *
 *  Symbols (with reel weights and 3-of-a-kind multipliers):
 *    🍒  cherry    weight 10  · 3× match: 3
 *    🍋  lemon     weight  8  · 3× match: 5
 *    🍇  grape     weight  6  · 3× match: 12
 *    7️⃣  seven     weight  4  · 3× match: 30
 *    💎  diamond   weight  2  · 3× match: 500
 *
 *  Plus consolation: any 2 cherries (no 3rd cherry) pays 2×.
 *  Net RTP ≈ 96%. */

export const SYMBOLS = [
  { id: 'cherry',  emoji: '🍒', weight: 10, mult: 3   },
  { id: 'lemon',   emoji: '🍋', weight:  8, mult: 5   },
  { id: 'grape',   emoji: '🍇', weight:  6, mult: 12  },
  { id: 'seven',   emoji: '7️⃣', weight:  4, mult: 30  },
  { id: 'diamond', emoji: '💎', weight:  2, mult: 500 },
] as const;

export type SymbolId = typeof SYMBOLS[number]['id'];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);

function pickSymbol(rng: Rng): SymbolId {
  let r = rng.nextInt(TOTAL_WEIGHT);
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r < 0) return s.id;
  }
  return SYMBOLS[0]!.id;
}

export type MiniSpinResult = {
  reels: SymbolId[];
  multiplier: number;
  payout: number;
  /** "3-of-a-kind" / "2 cherries" / "no win" */
  outcome: string;
};

export function spin(rng: Rng, bet: number): MiniSpinResult {
  const reels: SymbolId[] = [pickSymbol(rng), pickSymbol(rng), pickSymbol(rng)];
  // Three-of-a-kind?
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    const sym = SYMBOLS.find((s) => s.id === reels[0])!;
    return {
      reels,
      multiplier: sym.mult,
      payout: +(bet * sym.mult).toFixed(2),
      outcome: `Three ${sym.emoji}`,
    };
  }
  // Cherry consolation
  const cherries = reels.filter((r) => r === 'cherry').length;
  if (cherries >= 2) {
    return {
      reels,
      multiplier: 2,
      payout: +(bet * 2).toFixed(2),
      outcome: 'Two 🍒',
    };
  }
  return { reels, multiplier: 0, payout: 0, outcome: 'No win' };
}

export function symbolMeta(id: SymbolId) {
  return SYMBOLS.find((s) => s.id === id)!;
}
