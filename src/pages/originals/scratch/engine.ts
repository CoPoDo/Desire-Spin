import type { Rng } from '../../../lib/fairness';

/** Scratch Card — instant-win 3×3 grid. RNG pre-decides the outcome
 *  (winning multiplier or "no match"); the engine then generates a tile
 *  arrangement consistent with that outcome:
 *    - Win at mult M: 3 random tiles get the matching symbol; the other 6
 *      get non-winning symbols, taking care not to create a stray 3-of-a-kind
 *      that would award a higher prize.
 *    - No match: every symbol appears at most twice, so the player can't
 *      claim any prize.
 *
 *  Outcome distribution (calibrated for 99% RTP, weights /10,000):
 *    0×    5470   (54.70% — no match)
 *    0.5×  2400   (24.00%)
 *    1×    1100   (11.00%)
 *    2×     600   ( 6.00%)
 *    5×     280   ( 2.80%)
 *    10×    100   ( 1.00%)
 *    50×     40   ( 0.40%)
 *    200×    10   ( 0.10%)
 *  EV = 0.5(0.24) + 1(0.11) + 2(0.06) + 5(0.028) + 10(0.01) + 50(0.004) + 200(0.001)
 *     = 0.12 + 0.11 + 0.12 + 0.14 + 0.10 + 0.20 + 0.20 = 0.99 ✓
 */

export type ScratchSymbol = {
  id: string;
  emoji: string;
  multiplier: number;
  color: string;
  glow: string;
};

export const SCRATCH_SYMBOLS: ScratchSymbol[] = [
  { id: 'half',    emoji: '🪙', multiplier: 0.5, color: '#a8a29e', glow: 'rgba(168,162,158,.5)' },
  { id: 'one',     emoji: '🍀', multiplier: 1,   color: '#1fff7a', glow: 'rgba(31,255,122,.55)' },
  { id: 'two',     emoji: '🎰', multiplier: 2,   color: '#22d3ee', glow: 'rgba(34,211,238,.65)' },
  { id: 'five',    emoji: '💎', multiplier: 5,   color: '#7ac4ff', glow: 'rgba(122,196,255,.75)' },
  { id: 'ten',     emoji: '⭐', multiplier: 10,  color: '#a78bfa', glow: 'rgba(167,139,250,.8)' },
  { id: 'fifty',   emoji: '👑', multiplier: 50,  color: '#ffd166', glow: 'rgba(255,209,102,.85)' },
  { id: 'jackpot', emoji: '🏆', multiplier: 200, color: '#ff7ad9', glow: 'rgba(255,122,217,1)' },
];

const OUTCOME_WEIGHTS: { mult: number; w: number }[] = [
  { mult: 0,   w: 5470 },
  { mult: 0.5, w: 2400 },
  { mult: 1,   w: 1100 },
  { mult: 2,   w: 600 },
  { mult: 5,   w: 280 },
  { mult: 10,  w: 100 },
  { mult: 50,  w: 40 },
  { mult: 200, w: 10 },
];
const TOTAL_W = OUTCOME_WEIGHTS.reduce((s, o) => s + o.w, 0);

function pickOutcome(rng: Rng): number {
  const r = rng.nextInt(TOTAL_W);
  let acc = 0;
  for (const o of OUTCOME_WEIGHTS) {
    acc += o.w;
    if (r < acc) return o.mult;
  }
  return 0;
}

function symbolByMultiplier(m: number): ScratchSymbol | null {
  return SCRATCH_SYMBOLS.find((s) => s.multiplier === m) ?? null;
}

/** Pick 3 distinct integers in [0, 9). */
function pick3(rng: Rng): number[] {
  const all = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  // Fisher-Yates partial — first 3 are the picks.
  for (let i = 0; i < 3; i++) {
    const j = i + rng.nextInt(9 - i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return [all[0]!, all[1]!, all[2]!];
}

export type ScratchResult = {
  tiles: ScratchSymbol[]; // length 9
  winningSymbol: ScratchSymbol | null;
  winningPositions: number[]; // empty if no win
  multiplier: number;
  bet: number;
  payout: number;
};

export function play(rng: Rng, bet: number): ScratchResult {
  const outcomeMult = pickOutcome(rng);
  const tiles: ScratchSymbol[] = new Array(9);

  if (outcomeMult > 0) {
    const winSym = symbolByMultiplier(outcomeMult)!;
    const winPositions = pick3(rng);
    for (const p of winPositions) tiles[p] = winSym;
    // Fill remaining 6 positions with non-winning symbols. We pick from a
    // candidate set that excludes the winning symbol AND we cap any single
    // symbol to at most 2 placements so a "stray triple" can't appear.
    const fillCounts = new Map<string, number>();
    const fillablePool = SCRATCH_SYMBOLS.filter((s) => s.id !== winSym.id);
    for (let i = 0; i < 9; i++) {
      if (tiles[i]) continue;
      // Choose a symbol whose placement count is < 2.
      const usable = fillablePool.filter((s) => (fillCounts.get(s.id) ?? 0) < 2);
      const chosen = usable[rng.nextInt(usable.length)]!;
      fillCounts.set(chosen.id, (fillCounts.get(chosen.id) ?? 0) + 1);
      tiles[i] = chosen;
    }
    return {
      tiles,
      winningSymbol: winSym,
      winningPositions: winPositions,
      multiplier: outcomeMult,
      bet,
      payout: +(bet * outcomeMult).toFixed(2),
    };
  }

  // No-win branch: every symbol appears at most twice in the 9 tiles.
  const counts = new Map<string, number>();
  for (let i = 0; i < 9; i++) {
    const usable = SCRATCH_SYMBOLS.filter((s) => (counts.get(s.id) ?? 0) < 2);
    const chosen = usable[rng.nextInt(usable.length)]!;
    counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
    tiles[i] = chosen;
  }
  return {
    tiles,
    winningSymbol: null,
    winningPositions: [],
    multiplier: 0,
    bet,
    payout: 0,
  };
}
