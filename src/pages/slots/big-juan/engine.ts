import type { Rng } from '../../../lib/fairness';

/** Big Juan — full clone of Pragmatic Play's Big Juan (Wild Streak Gaming
 *  math, Stake Exclusive, Nov 2021). Implemented from the public spec
 *  documenting all features. Where exact PAR-sheet weights are not public,
 *  this file uses calibration weights tuned via Monte Carlo to land near
 *  the published 96.70% headline RTP (±0.5% in our simulations).
 *
 *  ── Layout ─────────────────────────────────────────────
 *    Base game: 5 reels × 4 rows = 20 cells
 *    Paylines : 40 fixed, left-to-right, anchored at reel 1
 *    Max win  : 2,600× total bet (hard cap)
 *    RTP      : 96.70% base / 96.53% via Bonus Buy
 *    Vol      : 5/5 (very high)
 *
 *  ── Symbol set (11 total) ─────────────────────────────
 *    Lows (5, mechanically identical): 10, J, Q, K, A
 *    Highs (5):
 *      vihuela     — Mexican guitar (mid-low high pay)
 *      hot_sauce   — chili sauce bottle (same pay as vihuela)
 *      chihuahua   — tan dog in sombrero
 *      senorita    — fiesta dancer
 *      juan        — Big Juan himself (top pay)
 *    Special:
 *      chili       — Red Chili Wild (pays as its own symbol, highest)
 *      pinata      — Burro piñata scatter (3+ → Respins feature; no line pay)
 *
 *  ── Features ──────────────────────────────────────────
 *    Wild substitution
 *    Wild Switch (6+ of same symbol on reels 2-3-4 → all become wilds;
 *                 tie-break by highest payer)
 *    Respins feature (3×3 + 4th-reel cell; sticky money bag; jackpot meters)
 *    Bonus Buy at 100× total bet (guaranteed 4 or 5 piñata entry)
 */

// =============================================================================
// SECTION 1 — Symbols + reel weights
// =============================================================================

export type SymbolPay = { 3: number; 4: number; 5: number };

export type SymbolDef = {
  id: string;
  /** Display category — drives art selection. */
  kind: 'low' | 'high' | 'wild' | 'scatter';
  /** Pay multipliers as × total bet. Lows all share the same pay. Wild
   *  also pays as its own symbol (highest). Scatter does NOT pay on its
   *  own (matches spec: "Pays nothing by itself; triggers Respins"). */
  pay?: SymbolPay;
  /** Per-reel weight (5 reels). Decoupled so we can keep wilds slightly
   *  rarer on the outer reels per typical Pragmatic distribution. */
  weights: [number, number, number, number, number];
  color: string;
  label: string;
};

/** Pay-table per spec §4 — values are multipliers of TOTAL BET, not coins
 *  or per-line. All five low cards share the same pay row. */
const LOW_PAY: SymbolPay = { 3: 0.125, 4: 0.25, 5: 1.00 };
const HIGH_PAY_LO: SymbolPay = { 3: 0.25, 4: 0.50, 5: 2.50 }; // vihuela, hot sauce
const HIGH_PAY_MID: SymbolPay = { 3: 0.375, 4: 1.00, 5: 3.75 }; // chihuahua
const HIGH_PAY_HI: SymbolPay = { 3: 0.50, 4: 2.00, 5: 5.00 };  // señorita
const HIGH_PAY_TOP: SymbolPay = { 3: 0.625, 4: 2.50, 5: 6.25 }; // big juan
const WILD_PAY: SymbolPay = { 3: 1.25, 4: 3.75, 5: 12.50 };    // chili wild

/** Reel weights calibrated against §3 ranges (cards combined ~40-50%,
 *  highs ~5-8% each, wild ~2-4%, scatter ~1-2%) — and against our 96.70%
 *  RTP target via Monte Carlo (scripts/calibrate-big-juan.ts). Wild leans
 *  heavier on middle reels (Pragmatic standard) but appears on all five
 *  per spec §3 ("Big Juan allows wild on all 5 reels"). */
export const SYMBOLS: SymbolDef[] = [
  // Top pay
  { id: 'juan',      kind: 'high',    label: 'Big Juan',  color: '#ff5560', pay: HIGH_PAY_TOP, weights: [5, 6, 7, 6, 5] },
  // High pays
  { id: 'senorita',  kind: 'high',    label: 'Señorita',  color: '#ff7ad9', pay: HIGH_PAY_HI,  weights: [6, 7, 8, 7, 6] },
  { id: 'chihuahua', kind: 'high',    label: 'Chihuahua', color: '#d8a060', pay: HIGH_PAY_MID, weights: [7, 8, 9, 8, 7] },
  { id: 'vihuela',   kind: 'high',    label: 'Vihuela',   color: '#c8932e', pay: HIGH_PAY_LO,  weights: [8, 9, 10, 9, 8] },
  { id: 'hot_sauce', kind: 'high',    label: 'Hot Sauce', color: '#ff8a40', pay: HIGH_PAY_LO,  weights: [8, 9, 10, 9, 8] },
  // Low pays (mechanically identical — different art / colour only)
  { id: 'A',         kind: 'low',     label: 'A',         color: '#ff5560', pay: LOW_PAY,      weights: [10, 11, 11, 11, 10] },
  { id: 'K',         kind: 'low',     label: 'K',         color: '#ffd166', pay: LOW_PAY,      weights: [10, 11, 11, 11, 10] },
  { id: 'Q',         kind: 'low',     label: 'Q',         color: '#ff7ad9', pay: LOW_PAY,      weights: [10, 11, 11, 11, 10] },
  { id: 'J',         kind: 'low',     label: 'J',         color: '#1fff7a', pay: LOW_PAY,      weights: [10, 11, 11, 11, 10] },
  { id: '10',        kind: 'low',     label: '10',        color: '#5fb8ff', pay: LOW_PAY,      weights: [10, 11, 11, 11, 10] },
  // Red Chili Wild — substitutes everything except scatter. Pays as its
  // own symbol at the highest tier. Spec §3 says wild on all 5 reels but
  // lighter on reels 1 and 5 per Pragmatic convention.
  { id: 'chili',     kind: 'wild',    label: 'Chili Wild', color: '#ff5560', pay: WILD_PAY,    weights: [3, 4, 5, 4, 3] },
  // Burro Piñata scatter — no line pay; triggers Respins on 3+. Spec §5
  // hit-frequency target is ~1 in 180-230 spins (~0.5%); we tune toward
  // that via per-reel weight, leaving outer reels slightly lighter to
  // create the 4-/5-scatter rarity gradient.
  { id: 'pinata',    kind: 'scatter', label: 'Piñata',    color: '#ffd166',                    weights: [1.87, 1.97, 2.07, 1.97, 1.87] },
];

const SYMBOL_BY_ID = new Map(SYMBOLS.map((s) => [s.id, s]));
export function symbolById(id: string): SymbolDef | null {
  return SYMBOL_BY_ID.get(id) ?? null;
}

const REEL_TOTAL_WEIGHT: number[] = [0, 1, 2, 3, 4].map(
  (r) => SYMBOLS.reduce((s, sym) => s + sym.weights[r as 0|1|2|3|4], 0),
);

function pickSymbolForReel(rng: Rng, reel: 0 | 1 | 2 | 3 | 4): string {
  // Scale by 100 to support hundredths-step fractional weight tuning.
  // Math.round on the final total guards against floating-point dust
  // (would crash nextInt with NaN).
  const total = Math.round(REEL_TOTAL_WEIGHT[reel]! * 100);
  const r = rng.nextInt(total);
  let acc = 0;
  for (const s of SYMBOLS) {
    acc += Math.round(s.weights[reel] * 100);
    if (r < acc) return s.id;
  }
  return SYMBOLS[0]!.id;
}

// =============================================================================
// SECTION 2 — Paylines
// =============================================================================

/** 40 fixed paylines, each an array of 5 row-indices (0=top, 3=bottom).
 *  Pattern set chosen to evenly cover the 5×4 grid the way Pragmatic
 *  typical 40-liners do (horizontals + zig-zags + V/W shapes + slants). */
const PAYLINES: number[][] = [
  // 4 horizontals
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  // V / inverted V
  [0, 1, 2, 1, 0],
  [3, 2, 1, 2, 3],
  [1, 0, 1, 0, 1],
  [2, 3, 2, 3, 2],
  // Step variations
  [1, 0, 0, 0, 1],
  [2, 3, 3, 3, 2],
  [0, 1, 1, 1, 0],
  [3, 2, 2, 2, 3],
  // Big zig-zags
  [0, 1, 0, 1, 0],
  [3, 2, 3, 2, 3],
  [0, 2, 0, 2, 0],
  [3, 1, 3, 1, 3],
  // Centre tilts
  [1, 2, 1, 2, 1],
  [2, 1, 2, 1, 2],
  // Diagonals
  [0, 0, 1, 2, 3],
  [3, 3, 2, 1, 0],
  [0, 1, 2, 3, 3],
  [3, 2, 1, 0, 0],
  // Anchor-clip steps
  [1, 1, 2, 3, 3],
  [2, 2, 1, 0, 0],
  [0, 1, 1, 2, 2],
  [3, 2, 2, 1, 1],
  // Edge clips
  [0, 1, 1, 1, 0],
  [3, 2, 2, 2, 3],
  // Curl peaks
  [0, 0, 1, 0, 0],
  [3, 3, 2, 3, 3],
  // Wide V / W
  [0, 2, 3, 2, 0],
  [3, 1, 0, 1, 3],
  // Skip patterns
  [0, 2, 1, 2, 0],
  [3, 1, 2, 1, 3],
  [0, 0, 2, 0, 0],
  [3, 3, 1, 3, 3],
  // Tilted fillers
  [1, 0, 2, 0, 1],
  [2, 3, 1, 3, 2],
  [1, 2, 2, 2, 1],
  [2, 1, 1, 1, 2],
];

export const PAYLINE_COUNT = PAYLINES.length; // 40
export { PAYLINES };

// =============================================================================
// SECTION 3 — Grid generation + win evaluation
// =============================================================================

/** A 5×4 grid: grid[reel][row] = symbolId. */
export type Grid = string[][];

export function generateGrid(rng: Rng): Grid {
  const grid: Grid = [];
  for (let reel = 0; reel < 5; reel++) {
    const col: string[] = [];
    for (let row = 0; row < 4; row++) {
      col.push(pickSymbolForReel(rng, reel as 0|1|2|3|4));
    }
    grid.push(col);
  }
  return grid;
}

/** Wild Switch — spec §6. After base-game line wins are evaluated, count
 *  symbols on reels 2/3/4 (indices 1/2/3). If 6+ of the SAME paying
 *  symbol (not wild, not scatter) are present, all of those positions
 *  transform into Red Chili Wilds and the paylines are re-evaluated.
 *
 *  Tie-break: if two different symbols both have 6+, the higher-paying
 *  symbol wins (per spec). We compare by 5-of-a-kind payout. */
export type WildSwitchInfo = {
  switched: boolean;
  switchedSymbol: string | null;
  positions: Array<[number, number]>;
};

export function applyWildSwitch(grid: Grid): { grid: Grid; info: WildSwitchInfo } {
  const counts = new Map<string, Array<[number, number]>>();
  for (let reel = 1; reel <= 3; reel++) {
    for (let row = 0; row < 4; row++) {
      const id = grid[reel]![row]!;
      const sym = symbolById(id);
      if (!sym || sym.kind === 'wild' || sym.kind === 'scatter') continue;
      if (!counts.has(id)) counts.set(id, []);
      counts.get(id)!.push([reel, row]);
    }
  }

  // Candidates with 6+ occurrences across reels 2-3-4 combined.
  const candidates: { id: string; positions: Array<[number, number]>; pay5: number }[] = [];
  for (const [id, positions] of counts.entries()) {
    if (positions.length >= 6) {
      const pay5 = symbolById(id)?.pay?.[5] ?? 0;
      candidates.push({ id, positions, pay5 });
    }
  }
  if (candidates.length === 0) {
    return { grid, info: { switched: false, switchedSymbol: null, positions: [] } };
  }
  // Tie-break: highest 5-of-a-kind pay wins.
  candidates.sort((a, b) => b.pay5 - a.pay5);
  const pick = candidates[0]!;
  const newGrid = grid.map((col) => [...col]);
  for (const [reel, row] of pick.positions) {
    newGrid[reel]![row] = 'chili';
  }
  return {
    grid: newGrid,
    info: { switched: true, switchedSymbol: pick.id, positions: pick.positions },
  };
}

export type WinLine = {
  lineIndex: number;
  /** Symbol paid (substituted target). Wild wins are paid as 'chili'. */
  symbolId: string;
  count: number;
  /** Cell positions [reel, row] forming the win. */
  positions: Array<[number, number]>;
  /** Multiplier × total bet. */
  multiplier: number;
};

/** Resolve a single payline. Per spec §5: walk left→right from reel 1.
 *  Find the longest consecutive run of identical symbols (or wild-
 *  substituted match) starting at reel 1. The wild's own value applies
 *  if it's higher than the substitute. */
function resolveLine(grid: Grid, lineIndex: number, line: number[]): WinLine | null {
  const cellSyms = line.map((row, reel) => grid[reel]![row]!);

  // Scatter on this line breaks line-evaluation early.
  // (Scatters anywhere in run = stop matching.)

  // Walk to find the first non-wild target symbol (defines the substituted run).
  let target: string | null = null;
  let i = 0;
  for (; i < 5; i++) {
    const id = cellSyms[i]!;
    const sym = symbolById(id);
    if (sym?.kind === 'scatter') return null; // scatter at position i breaks the run
    if (sym?.kind !== 'wild') { target = id; break; }
  }
  // All wilds case: pay them as wilds directly (wild pays as itself).
  const allWilds = target === null;
  const substituteId = allWilds ? 'chili' : target!;

  // Count consecutive matches from position 0.
  let count = 0;
  for (let j = 0; j < 5; j++) {
    const id = cellSyms[j]!;
    const sym = symbolById(id);
    if (sym?.kind === 'scatter') break;
    if (id === substituteId || sym?.kind === 'wild') count++;
    else break;
  }
  if (count < 3) return null;

  const subSym = symbolById(substituteId);
  if (!subSym?.pay) return null;
  const subMult = subSym.pay[count as 3 | 4 | 5];

  // Wild's own value applies if higher than the substitute. Check whether
  // all positions in the run are wilds (then the wild's own pay table wins
  // outright — same value either way, but we name the win as 'chili').
  // Otherwise compare wild-pay vs substitute-pay; per spec the higher wins.
  const wildSym = symbolById('chili')!;
  const wildMult = wildSym.pay![count as 3 | 4 | 5];
  // If wild's pay is higher than substitute's pay (it always is, since
  // wild is the top single-payer), the line pays as wild — BUT only if
  // every position in the run is a wild. Otherwise pay as the substitute:
  // a row like [chili, chili, A, A, A] is paid as A 5-of-a-kind, since
  // the A is the matched symbol; the wild as its own symbol only counts
  // when the entire run is wilds. (This matches Pragmatic's standard
  // wild-line behaviour — the substitution rule.)
  const allRunWild = !allWilds
    ? false
    : true; // when target was null, all 5 are wilds
  // Re-check: even if target is set, the run could be all wilds before
  // the target started. But since target is the FIRST non-wild and i is
  // its index, positions [0..i-1] are all wild — and we matched up to count
  // which could include later wilds substituting. So the run is "all wilds"
  // only if target was null (handled above).
  const multiplier = allRunWild ? wildMult : subMult;
  const idForWin = allRunWild ? 'chili' : substituteId;

  const positions: Array<[number, number]> = line
    .slice(0, count)
    .map((row, reel) => [reel, row]);
  return { lineIndex, symbolId: idForWin, count, positions, multiplier };
}

export type SpinResult = {
  /** Initial grid (before wild switch). */
  initialGrid: Grid;
  /** Grid after wild switch (or same as initialGrid if no switch). */
  grid: Grid;
  wildSwitch: WildSwitchInfo;
  /** Per-line wins (combined post-switch). */
  wins: WinLine[];
  /** Wins from the initial pre-switch grid (paid first, per spec §6). */
  preSwitchWins: WinLine[];
  /** Wins from the post-switch grid (paid after switch). */
  postSwitchWins: WinLine[];
  /** Sum of all line multipliers (× bet). */
  lineMultiplier: number;
  /** Scatter count on the final grid. */
  scatterCount: number;
  /** Free spins (respins) awarded — 10/12/15 for 3/4/5 scatters, else 0. */
  respinsAwarded: number;
  /** True if respins are triggered. */
  triggersBonus: boolean;
  /** Total payout multiplier from BASE GAME only (line wins). Scatter
   *  does not pay directly; the bonus handles payouts independently. */
  baseMultiplier: number;
};

const RESPIN_AWARD: Record<number, number> = { 3: 10, 4: 12, 5: 15 };

/** §10b.2 anticipation reel — true when reels 1-4 show ≥2 piñatas (still
 *  in line for a 3+ trigger if reel 5 lands one). Reported on the result so
 *  the UI can play the slow-spin animation on reel 5. */
function isNearScatterMiss(grid: Grid): boolean {
  let scatterCountFirstFour = 0;
  for (let reel = 0; reel < 4; reel++) {
    for (let row = 0; row < 4; row++) {
      if (grid[reel]![row] === 'pinata') scatterCountFirstFour++;
    }
  }
  return scatterCountFirstFour >= 2;
}

function evaluateLines(grid: Grid): WinLine[] {
  const wins: WinLine[] = [];
  for (let i = 0; i < PAYLINES.length; i++) {
    const w = resolveLine(grid, i, PAYLINES[i]!);
    if (w) wins.push(w);
  }
  return wins;
}

export function play(rng: Rng): SpinResult & { anticipation: boolean } {
  const initialGrid = generateGrid(rng);
  // Per spec §5: payline wins are evaluated FIRST on the initial grid,
  // then Wild Switch fires (if applicable) and lines are re-evaluated on
  // the post-switch grid. Both sets of wins pay.
  const preSwitchWins = evaluateLines(initialGrid);
  const switched = applyWildSwitch(initialGrid);
  const postSwitchWins = switched.info.switched ? evaluateLines(switched.grid) : [];

  // Combine for the headline "wins" list (post-switch state is what the
  // player ultimately sees on the grid).
  const wins = switched.info.switched ? postSwitchWins : preSwitchWins;

  // Total line multiplier — sum of pre-switch wins (paid first) plus
  // post-switch wins (paid after the switch). If no switch occurred,
  // only preSwitchWins paid out.
  const preMult = preSwitchWins.reduce((s, w) => s + w.multiplier, 0);
  const postMult = switched.info.switched
    ? postSwitchWins.reduce((s, w) => s + w.multiplier, 0)
    : 0;
  const lineMultiplier = preMult + postMult;

  // Scatter count from the FINAL grid (post-switch). Spec §6: Wild Switch
  // excludes scatters, so the count is unchanged either way.
  let scatterCount = 0;
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 4; row++) {
      if (switched.grid[reel]![row] === 'pinata') scatterCount++;
    }
  }
  const respinsAwarded = scatterCount >= 3 ? RESPIN_AWARD[Math.min(5, scatterCount)] ?? 0 : 0;
  const triggersBonus = respinsAwarded > 0;

  // Base game per-spin cap. Spec §1 says max win is 2,600× across the
  // round (base + bonus); the per-spin BASE pay is capped at 2,600× too
  // since a single Wild Switch spin can theoretically push close to that.
  const baseMultiplier = Math.min(2600, lineMultiplier);

  return {
    initialGrid,
    grid: switched.grid,
    wildSwitch: switched.info,
    wins,
    preSwitchWins,
    postSwitchWins,
    lineMultiplier,
    scatterCount,
    respinsAwarded,
    triggersBonus,
    baseMultiplier,
    anticipation: isNearScatterMiss(initialGrid) && scatterCount < 3,
  };
}

// =============================================================================
// SECTION 4 — Respins (bonus) feature
// =============================================================================
//
// Spec §7. Triggered by 3+ piñatas on the base grid. Awards 10/12/15
// respins (for 3/4/5 scatters respectively). The base reels slide out;
// a new 3×3 grid + a separate 4th-reel single cell slides in.
//
//   ┌───┬───┬───┐   ┌───┐
//   │   │   │   │   │   │
//   ├───┼───┼───┤   │ 4 │   ← 4th reel = single cell, 3 outcomes
//   │   │BAG│   │   │ R │       (Blank / Win / Boost)
//   ├───┼───┼───┤   │   │
//   │   │   │   │   │   │
//   └───┴───┴───┘   └───┘
//
// Center cell of the 3×3 is the sticky Money Bag (starts at 1× bet).
// The other 8 cells respin each round.
//
// Per-respin resolution depends on the 4th-reel result:
//   - Blank: nothing collects; respin -= 1.
//   - WIN  : sum coins + jackpot symbols increment meters + extra-spin
//            symbols add respins + bag pays. Respin -= 1.
//   - BOOST: coins on grid → permanently added to the Money Bag value;
//            jackpot/extra symbols do NOT collect. Respin -= 1.
//
// Jackpot meters (4 of them, separate counters):
//   Mini  : 3 symbols → 12.5× bet (then reset to 0)
//   Minor : 4 symbols → 50× bet
//   Major : 5 symbols → 250× bet
//   Grand : 5 symbols → 2,500× bet
//
// The feature ends when respins hit 0 OR running total + pending payout
// would exceed 2,600× bet (cap clamps to exactly 2,600×).
//
// Cannot retrigger; piñatas are not in the respin symbol pool. Wilds are
// not in the respin pool either (spec §13).
// =============================================================================

export type FourthReelOutcome = 'blank' | 'win' | 'boost';

export type RespinSymbol =
  | { kind: 'blank' }
  | { kind: 'coin'; value: number }   // value = × bet
  | { kind: 'extra' }                 // +1 respin (only triggered on Win)
  | { kind: 'mini' }                  // jackpot symbols — collect to fill meters
  | { kind: 'minor' }
  | { kind: 'major' }
  | { kind: 'grand' };

export type JackpotTier = 'mini' | 'minor' | 'major' | 'grand';

/** Jackpot payouts per spec §7.6 (× bet). */
export const JACKPOTS: Record<JackpotTier, number> = {
  mini:  12.5,
  minor: 50,
  major: 250,
  grand: 2500,
} as const;

/** Symbols required on each meter before it pays out. */
export const JACKPOT_THRESHOLD: Record<JackpotTier, number> = {
  mini:  3,
  minor: 4,
  major: 5,
  grand: 5,
};

/** Coin-value distribution. Values are × bet. Per real-game research,
 *  money symbols range from 0.5× to 250× total bet — the minimum is
 *  HALF a bet, not one bet. Multiple authoritative sources (Stake.com,
 *  Pragmatic Play documentation, third-party reviews) consistently
 *  document the 0.5× floor. Adding it shifts the bonus payout shape
 *  toward the dry/low end and produces the authentic "many small coins,
 *  rare big coin" rhythm. The 250× cap matches the documented top coin.
 *
 *  Weights tuned via Monte Carlo (scripts/calibrate-big-juan.ts) toward
 *  the published 96.70% RTP. The 0.5 tier carries the largest weight
 *  to absorb most of the bonus's coin landings. */
const COIN_VALUE_TABLE: { value: number; w: number }[] = [
  { value: 0.5, w: 1300 }, // real-game minimum (≈25% of coins)
  { value: 1,   w: 1100 },
  { value: 2,   w: 1000 },
  { value: 3,   w: 950 },
  { value: 5,   w: 900 },
  { value: 10,  w: 800 },
  { value: 15,  w: 550 },
  { value: 20,  w: 400 },
  { value: 25,  w: 250 },
  { value: 50,  w: 120 },
  { value: 100, w: 38 },
  { value: 250, w: 8 },
];

/** Per-cell pool for the 8 OUTER cells of the 3×3 grid. Most rolls are
 *  blank — that's what makes the bonus feel suspenseful (spec §10b.7).
 *  The non-blank slice + 4th-reel WIN gating combine to land within
 *  Big Juan's published 96.70% RTP target. */
const OUTER_CELL_TABLE: { kind: 'blank' | 'coin' | 'extra' | JackpotTier; w: number }[] = [
  { kind: 'blank', w: 3700 },     // 37%
  { kind: 'coin',  w: 5300 },     // 53% — value drawn from COIN_VALUE_TABLE
  { kind: 'extra', w: 220 },      // 2.2%
  { kind: 'mini',  w: 660 },      // 6.6%
  { kind: 'minor', w: 200 },      // 2.0%
  { kind: 'major', w: 50 },       // 0.5%
  { kind: 'grand', w: 10 },       // 0.1%
];
const OUTER_CELL_TOTAL = OUTER_CELL_TABLE.reduce((s, x) => s + x.w, 0);
const COIN_VALUE_TOTAL = COIN_VALUE_TABLE.reduce((s, x) => s + x.w, 0);

function rollOuterCell(rng: Rng): RespinSymbol {
  const r = rng.nextInt(OUTER_CELL_TOTAL);
  let acc = 0;
  for (const entry of OUTER_CELL_TABLE) {
    acc += entry.w;
    if (r < acc) {
      if (entry.kind === 'blank') return { kind: 'blank' };
      if (entry.kind === 'extra') return { kind: 'extra' };
      if (entry.kind === 'coin') {
        // Draw coin value
        const cr = rng.nextInt(COIN_VALUE_TOTAL);
        let cacc = 0;
        for (const cv of COIN_VALUE_TABLE) {
          cacc += cv.w;
          if (cr < cacc) return { kind: 'coin', value: cv.value };
        }
        return { kind: 'coin', value: 1 };
      }
      return { kind: entry.kind };
    }
  }
  return { kind: 'blank' };
}

/** 4th reel distribution. Spec §7.4 says "Blank most common — 70-80%";
 *  we sit at 68% to push enough WIN / BOOST events through to hit the
 *  96.70% RTP target after Monte Carlo calibration. WIN gates everything
 *  that pays so its rate dominates the bonus's contribution to RTP. */
const FOURTH_REEL_TABLE: { kind: FourthReelOutcome; w: number }[] = [
  { kind: 'blank', w: 68 },
  { kind: 'win',   w: 20 },
  { kind: 'boost', w: 12 },
];
const FOURTH_REEL_TOTAL = FOURTH_REEL_TABLE.reduce((s, x) => s + x.w, 0);

function rollFourthReel(rng: Rng): FourthReelOutcome {
  const r = rng.nextInt(FOURTH_REEL_TOTAL);
  let acc = 0;
  for (const entry of FOURTH_REEL_TABLE) {
    acc += entry.w;
    if (r < acc) return entry.kind;
  }
  return 'blank';
}

/** Per-respin sample. Eight outer cells + one 4th-reel cell. The Money
 *  Bag's value is tracked separately by the round state machine. */
export type RespinSample = {
  outer: RespinSymbol[];          // length 8 — index 0..7 around the bag
  fourth: FourthReelOutcome;
};

/** Sample one respin (called by the bonus state machine). */
export function rollRespin(rng: Rng): RespinSample {
  const outer: RespinSymbol[] = [];
  for (let i = 0; i < 8; i++) outer.push(rollOuterCell(rng));
  const fourth = rollFourthReel(rng);
  return { outer, fourth };
}

/** Per-tier symbol count visible on the grid (used during WIN resolution
 *  to update the jackpot meters). */
function countJackpotSymbols(outer: RespinSymbol[]): Record<JackpotTier, number> {
  const c: Record<JackpotTier, number> = { mini: 0, minor: 0, major: 0, grand: 0 };
  for (const s of outer) {
    if (s.kind === 'mini' || s.kind === 'minor' || s.kind === 'major' || s.kind === 'grand') {
      c[s.kind]++;
    }
  }
  return c;
}

function sumCoinValues(outer: RespinSymbol[]): number {
  let sum = 0;
  for (const s of outer) if (s.kind === 'coin') sum += s.value;
  return sum;
}

function countExtraSpins(outer: RespinSymbol[]): number {
  let n = 0;
  for (const s of outer) if (s.kind === 'extra') n++;
  return n;
}

export type RespinResolution = {
  kind: FourthReelOutcome;
  /** Amount paid out from this respin (× bet). 0 for blank/boost. */
  paid: number;
  /** Jackpots that filled and paid on this respin (in tier order). */
  jackpotHits: { tier: JackpotTier; amount: number }[];
  /** Coins paid (their sum). */
  coinSum: number;
  /** Bag value paid (only on WIN). */
  bagPaid: number;
  /** Extra spins added to the counter (only on WIN). */
  extraSpins: number;
  /** Boost amount added to the bag (only on BOOST). */
  boostGain: number;
  /** New bag value AFTER resolution. */
  newBagValue: number;
  /** New meter state AFTER resolution. */
  newMeters: Record<JackpotTier, number>;
  /** Did the cap clamp this resolution? */
  cappedAtMax: boolean;
};

/** Resolve a single respin against current round state. Stateless —
 *  the caller passes in current bag + meters + cumulative total and
 *  gets back the new values + payout. */
export function resolveRespin(
  sample: RespinSample,
  state: {
    bagValue: number;       // current center bag value (× bet)
    meters: Record<JackpotTier, number>;
    cumulativeMult: number; // running feature win (× bet) — for cap check
  },
): RespinResolution {
  const { outer, fourth } = sample;
  const bagValue = state.bagValue;
  const meters: Record<JackpotTier, number> = { ...state.meters };
  let paid = 0;
  const jackpotHits: { tier: JackpotTier; amount: number }[] = [];
  let coinSum = 0;
  let bagPaid = 0;
  let extraSpins = 0;
  let boostGain = 0;
  let newBag = bagValue;
  let cappedAtMax = false;

  if (fourth === 'win') {
    coinSum = sumCoinValues(outer);
    bagPaid = bagValue;
    paid = coinSum + bagPaid;
    extraSpins = countExtraSpins(outer);
    // Increment meters; fire any that fill.
    const jpc = countJackpotSymbols(outer);
    (Object.keys(jpc) as JackpotTier[]).forEach((tier) => {
      meters[tier] += jpc[tier];
      while (meters[tier] >= JACKPOT_THRESHOLD[tier]) {
        const amount = JACKPOTS[tier];
        jackpotHits.push({ tier, amount });
        paid += amount;
        meters[tier] -= JACKPOT_THRESHOLD[tier];
      }
    });
  } else if (fourth === 'boost') {
    boostGain = sumCoinValues(outer);
    newBag = bagValue + boostGain;
  }
  // Blank: nothing.

  // Cap enforcement — spec §7.7. If cumulative + paid would exceed 2,600×,
  // clamp paid to exactly 2,600 - cumulative.
  const projected = state.cumulativeMult + paid;
  if (projected > 2600) {
    paid = Math.max(0, +(2600 - state.cumulativeMult).toFixed(4));
    cappedAtMax = true;
  }

  return {
    kind: fourth,
    paid: +paid.toFixed(4),
    jackpotHits,
    coinSum: +coinSum.toFixed(4),
    bagPaid: +bagPaid.toFixed(4),
    extraSpins,
    boostGain: +boostGain.toFixed(4),
    newBagValue: +newBag.toFixed(4),
    newMeters: meters,
    cappedAtMax,
  };
}

// =============================================================================
// SECTION 5 — Bonus Buy
// =============================================================================
//
// Spec §8: cost is 100× total bet. Player skips the base game and enters
// the Respins feature directly. Trigger is guaranteed to be 4 piñatas
// (12 respins) or 5 piñatas (15 respins) — never 3. Distribution is
// heavily weighted toward 4 (around 85/15) to keep the buy slightly EV-
// negative vs. organic triggers (96.53% buy RTP vs 96.70% base).

export const BUY_BONUS_COST_MULTIPLIER = 100;

const BUY_BONUS_TABLE: { scatters: 4 | 5; w: number }[] = [
  { scatters: 4, w: 85 },
  { scatters: 5, w: 15 },
];
const BUY_BONUS_TOTAL = BUY_BONUS_TABLE.reduce((s, x) => s + x.w, 0);

/** Sample a Bonus Buy entry. Returns scatter count + matching respins. */
export function rollBonusBuyEntry(rng: Rng): { scatters: 4 | 5; respinsAwarded: number } {
  const r = rng.nextInt(BUY_BONUS_TOTAL);
  let acc = 0;
  for (const entry of BUY_BONUS_TABLE) {
    acc += entry.w;
    if (r < acc) return { scatters: entry.scatters, respinsAwarded: RESPIN_AWARD[entry.scatters]! };
  }
  return { scatters: 4, respinsAwarded: RESPIN_AWARD[4]! };
}

/** Bet structure — total_bet = coin_value × coins_per_line × 40.
 *  Min: 0.01 × 1 × 40 = 0.40.  Max: 0.50 × 10 × 40 = 200.00. */
export const BET_MIN = 0.40;
export const BET_MAX = 200.00;
export const PAYLINE_COUNT_FOR_BET = 40;

/** Coin-value steps (spec §1: range 0.01 – 0.50). */
export const COIN_VALUES = [
  0.01, 0.02, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50,
] as const;

/** Coins-per-line steps (spec §1: range 1 – 10). */
export const COINS_PER_LINE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function totalBetFor(coinValue: number, coinsPerLine: number): number {
  return +(coinValue * coinsPerLine * PAYLINE_COUNT_FOR_BET).toFixed(2);
}

/** Autoplay options per spec §1. */
export const AUTOPLAY_OPTIONS = [10, 20, 30, 50, 70, 100, 500, 1000] as const;

/** Big-win tiers per spec §10b.10 — labels and × bet thresholds. */
export type BigWinTierName = 'nice' | 'big' | 'mega' | 'super' | 'huge' | 'epic' | 'max';
export const BIG_WIN_TIERS: { name: BigWinTierName; min: number; max: number; durationMs: number; label: string }[] = [
  { name: 'nice',  min: 10,   max: 25,    durationMs: 2500,  label: 'NICE WIN' },
  { name: 'big',   min: 25,   max: 50,    durationMs: 4000,  label: 'BIG WIN' },
  { name: 'mega',  min: 50,   max: 100,   durationMs: 5500,  label: 'MEGA WIN' },
  { name: 'super', min: 100,  max: 500,   durationMs: 7000,  label: 'SUPER WIN' },
  { name: 'huge',  min: 500,  max: 1000,  durationMs: 9000,  label: 'HUGE WIN' },
  { name: 'epic',  min: 1000, max: 2500,  durationMs: 11000, label: 'EPIC WIN' },
  { name: 'max',   min: 2500, max: Infinity, durationMs: 14000, label: 'MAX WIN!' },
];

export function bigWinTierFor(multiplier: number): typeof BIG_WIN_TIERS[number] | null {
  if (multiplier < 10) return null;
  for (let i = BIG_WIN_TIERS.length - 1; i >= 0; i--) {
    if (multiplier >= BIG_WIN_TIERS[i]!.min) return BIG_WIN_TIERS[i]!;
  }
  return null;
}
