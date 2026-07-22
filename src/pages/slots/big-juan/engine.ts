import type { Rng } from '../../../lib/fairness';

/** Big Juan play-money reconstruction, pinned to the current official sver=5
 * client audited on 2026-07-22. Documented rules, paytable, paylines, display
 * strips and event order are reproduced. Server outcome/PAR weights remain
 * proprietary, so those probabilities are transparently Monte Carlo tuned.
 *
 *  ── Layout ─────────────────────────────────────────────
 *    Base game: 5 reels × 4 rows = 20 cells
 *    Paylines : 40 fixed, left-to-right, anchored at reel 1
 *    Max win  : 2,600× total bet (hard cap)
 *    RTP      : 96.70% standard mode / 96.53% via Bonus Buy
 *    Vol      : 5/5 (very high)
 *
 *  ── Symbol set (12 total) ─────────────────────────────
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
 *    Wild Switch (every 6+ matching group on reels 2-3-4 becomes wild)
 *    Respins feature (3×3 + 4th-reel cell; sticky money bag; jackpot meters)
 *    Bonus Buy at 100× total bet (guaranteed 4 or 5 piñata entry)
 */

// =============================================================================
// SECTION 1 — Symbols + published display strips
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

/** Published symbol set and normalized paytable. */
export const SYMBOLS: SymbolDef[] = [
  // Top pay
  { id: 'juan',      kind: 'high',    label: 'Big Juan',  color: '#ff5560', pay: HIGH_PAY_TOP },
  // High pays
  { id: 'senorita',  kind: 'high',    label: 'Señorita',  color: '#ff7ad9', pay: HIGH_PAY_HI },
  { id: 'chihuahua', kind: 'high',    label: 'Chihuahua', color: '#d8a060', pay: HIGH_PAY_MID },
  { id: 'vihuela',   kind: 'high',    label: 'Vihuela',   color: '#c8932e', pay: HIGH_PAY_LO },
  { id: 'hot_sauce', kind: 'high',    label: 'Hot Sauce', color: '#ff8a40', pay: HIGH_PAY_LO },
  // Low pays (mechanically identical — different art / colour only)
  { id: 'A',         kind: 'low',     label: 'A',         color: '#ff5560', pay: LOW_PAY },
  { id: 'K',         kind: 'low',     label: 'K',         color: '#ffd166', pay: LOW_PAY },
  { id: 'Q',         kind: 'low',     label: 'Q',         color: '#ff7ad9', pay: LOW_PAY },
  { id: 'J',         kind: 'low',     label: 'J',         color: '#1fff7a', pay: LOW_PAY },
  { id: '10',        kind: 'low',     label: '10',        color: '#5fb8ff', pay: LOW_PAY },
  // Red Chili Wild — substitutes everything except scatter and pays as its
  // own symbol at the highest tier. It can appear on all five reels.
  { id: 'chili',     kind: 'wild',    label: 'Chili Wild', color: '#ff5560', pay: WILD_PAY },
  // Burro Piñata scatter — no line pay; triggers Respins on 3+ reels.
  { id: 'pinata',    kind: 'scatter', label: 'Piñata',    color: '#ffd166' },
];

const SYMBOL_BY_ID = new Map(SYMBOLS.map((s) => [s.id, s]));
export function symbolById(id: string): SymbolDef | null {
  return SYMBOL_BY_ID.get(id) ?? null;
}

/** Exact base-game display strips exposed by the current official sver=5
 * demo on 2026-07-22. Provider ID 13 is a response-patcher placeholder and
 * is removed by the official client before display, so it is filtered here.
 * Server-side PAR logic remains proprietary; these strips reproduce visible
 * ordering/stacking but are not represented as a complete provider PAR sheet. */
const OFFICIAL_REEL_SET_0_RAW: readonly (readonly number[])[] = [
  [8,7,7,13,13,11,13,7,1,12,11,9,5,4,3,13,11,12,3,6,3,3,3,3,12,11,12,11,8,8,5,6,8,12,5,3,5,2,11,2,3,12,8,13,10,8,7],
  [12,3,13,6,8,8,11,5,13,9,9,9,9,10,13,8,10,6,13,10,5,11,10,4,13,13,13,13,9,13,8,7,10,6,6,7,9,3,13,8,8,8,8,2,11,11,10,4,4,6,12,8,11,11,11,11,9,1,5,2,11,9,13,10,6,1,4,10,10,10,10,5,8,8,11,11,2,4,9,9,11,5,6,6,6,6,13,5,10,9,10,2,10,8,4,4],
  [3,10,9,12,7,2,10,7,12,7,13,9,5,13,13,13,13,3,12,9,12,1,13,5,11,8,6,5,12,13,4,2,9,9,9,9,10,5,3,11,12,9,7,13,12,13,2,10,10,9,12,12,12,8,9,9,10,9,1,13,3,9,12,4,10,6,9,10,3],
  [6,7,5,7,2,13,7,7,11,4,13,13,13,13,8,13,10,6,1,8,6,2,13,9,7,11,11,11,11,7,12,11,1,3,10,8,11,6,4,13,6,6,6,11,4,4,8,8,4,13,8,10,11,13,8,8,8,8,11,7,10,3,8,10,6,11,13,10,5,7,7,7,7,6,9,6,4,12,11,6,7,8,4,2,10,10],
  [12,3,9,11,5,11,3,11,8,3,9,13,6,2,5,2,12,13,9,8,6,13,8,9,12,10,7,11,11,13,5,6,3,6,7,13,2,10,7,6,6,3,3,3,3,11,9,5,6,11,12,10,12,5,3,9,5,10,3,3,13,9,12,13,5,11,9,12,13,8,5,7,2,3,7,3,4,5,13,12,11,6,7,4,13,5,9,12,13,13,13,2,7,3,11,1,3,6,7,11,6,9,3,12,4,12,5,1,10,7,2,3,7,12,8,13,8,13,12,10,12,11,7,12,6,9,5,12,6,7,5,13,11,1,6,13],
] as const;

const PROVIDER_SYMBOL_ID: Readonly<Record<number, string>> = {
  1: 'pinata',
  2: 'chili',
  3: 'juan',
  4: 'senorita',
  5: 'chihuahua',
  6: 'hot_sauce',
  7: 'vihuela',
  8: 'A',
  9: 'K',
  10: 'Q',
  11: 'J',
  12: '10',
};

export const BASE_REEL_STRIPS: readonly (readonly string[])[] = OFFICIAL_REEL_SET_0_RAW.map(
  (reel) => reel.filter((providerId) => providerId !== 13).map((providerId) => PROVIDER_SYMBOL_ID[providerId]!),
);


// =============================================================================
// SECTION 2 — Paylines
// =============================================================================

/** The 40 published fixed paylines, decoded from the provider rules sheet.
 * Each entry contains five row indices (0 = top, 3 = bottom). Keeping the
 * source order is important because line numbers are surfaced in history. */
const PAYLINES: number[][] = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 1, 1, 1, 2],
  [0, 1, 2, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 1, 2, 1],
  [1, 1, 1, 2, 3],
  [1, 1, 1, 1, 1],
  [1, 1, 2, 1, 1],
  [1, 1, 2, 3, 3],
  [1, 2, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [1, 2, 2, 2, 1],
  [1, 2, 2, 2, 3],
  [1, 2, 3, 2, 1],
  [1, 2, 3, 3, 3],
  [2, 3, 3, 3, 2],
  [2, 3, 2, 3, 2],
  [2, 3, 2, 1, 2],
  [2, 2, 2, 1, 0],
  [2, 2, 2, 2, 2],
  [2, 2, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [2, 1, 2, 1, 2],
  [2, 1, 2, 3, 2],
  [2, 1, 1, 1, 2],
  [2, 1, 1, 1, 0],
  [2, 1, 0, 0, 0],
  [2, 1, 0, 1, 2],
  [3, 2, 1, 2, 3],
  [3, 2, 2, 2, 3],
  [3, 2, 2, 2, 1],
  [3, 3, 2, 3, 3],
  [3, 3, 2, 1, 1],
  [3, 3, 3, 2, 1],
  [3, 3, 3, 3, 3],
];

export const PAYLINE_COUNT = PAYLINES.length; // 40
export { PAYLINES };

// =============================================================================
// SECTION 3 — Grid generation + win evaluation
// =============================================================================

/** A 5×4 grid: grid[reel][row] = symbolId. */
export type Grid = string[][];

function reelWindow(strip: readonly string[], stop: number): string[] {
  return Array.from({ length: 4 }, (_, row) => strip[(stop + row) % strip.length]!);
}

/** The official client exposes visible strip loops, but its server chooses
 * outcomes and does not publish the PAR sheet. Sampling those display loops
 * as if they were physical reels materially overpays the game. Keep the
 * deterministic outcome model separate and label its calibrated values.
 *
 * A scatter is first rolled once per reel (never more than one per reel),
 * then the remaining cells are filled from the non-scatter pool. This keeps
 * the documented 3/4/5-reel trigger shape while matching the published RTP
 * envelope in large seeded simulations. */
export const CALIBRATED_BASE_MODEL = {
  scatterChancePerReel: 0.0822,
  symbols: [
    { id: 'juan', weight: 4000 },
    { id: 'senorita', weight: 5000 },
    { id: 'chihuahua', weight: 6000 },
    { id: 'vihuela', weight: 7000 },
    { id: 'hot_sauce', weight: 7000 },
    { id: 'A', weight: 10000 },
    { id: 'K', weight: 10000 },
    { id: 'Q', weight: 10000 },
    { id: 'J', weight: 10000 },
    { id: '10', weight: 10000 },
    { id: 'chili', weight: 7160 },
  ],
} as const;

const BASE_OUTCOME_WEIGHTS = CALIBRATED_BASE_MODEL.symbols.map((entry) => entry.weight);

function rollBasePaySymbol(rng: Rng): string {
  return CALIBRATED_BASE_MODEL.symbols[rng.weighted(BASE_OUTCOME_WEIGHTS)]!.id;
}

export function generateGrid(rng: Rng): Grid {
  return Array.from({ length: 5 }, () => {
    const scatterRow = rng.next() < CALIBRATED_BASE_MODEL.scatterChancePerReel
      ? rng.nextInt(4)
      : -1;
    return Array.from(
      { length: 4 },
      (_, row) => row === scatterRow ? 'pinata' : rollBasePaySymbol(rng),
    );
  });
}

/** Create the visible 4/5-piñata entry spin used by Bonus Buy. The
 * reference client lands no more than one trigger symbol on each reel. */
export function generateBonusBuyGrid(rng: Rng, scatterCount: 4 | 5): Grid {
  const grid: Grid = BASE_REEL_STRIPS.map((strip) => {
    let window: string[] = [];
    do {
      const stop = rng.nextInt(strip.length);
      window = reelWindow(strip, stop);
    } while (window.includes('pinata'));
    return window;
  });
  const reels = [0, 1, 2, 3, 4];
  for (let index = reels.length - 1; index > 0; index--) {
    const pick = rng.nextInt(index + 1);
    [reels[index], reels[pick]] = [reels[pick]!, reels[index]!];
  }
  for (const reel of reels.slice(0, scatterCount)) grid[reel]![rng.nextInt(4)] = 'pinata';
  return grid;
}

/** Wild Switch. Count paying symbols on reels 2/3/4 (indices 1/2/3).
 * Every symbol type represented at least six times transforms into Wild.
 * Provider rules do not define a winner-takes-all tie-break, so qualifying
 * groups are all transformed. Wins are then evaluated on the final grid. */
export type WildSwitchInfo = {
  switched: boolean;
  switchedSymbols: string[];
  /** First qualifying symbol, retained for old history entries. */
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
  const candidates: { id: string; positions: Array<[number, number]> }[] = [];
  for (const [id, positions] of counts.entries()) {
    if (positions.length >= 6) {
      candidates.push({ id, positions });
    }
  }
  if (candidates.length === 0) {
    return {
      grid,
      info: { switched: false, switchedSymbols: [], switchedSymbol: null, positions: [] },
    };
  }
  const newGrid = grid.map((col) => [...col]);
  const positions: Array<[number, number]> = [];
  for (const candidate of candidates) {
    for (const [reel, row] of candidate.positions) {
      newGrid[reel]![row] = 'chili';
      positions.push([reel, row]);
    }
  }
  const switchedSymbols = candidates.map((candidate) => candidate.id);
  return {
    grid: newGrid,
    info: {
      switched: true,
      switchedSymbols,
      switchedSymbol: switchedSymbols[0] ?? null,
      positions,
    },
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
export function resolveLine(grid: Grid, lineIndex: number, line: number[]): WinLine | null {
  const cellSyms = line.map((row, reel) => grid[reel]![row]!);
  const candidates = new Set<string>(['chili']);
  for (const id of cellSyms) {
    const symbol = symbolById(id);
    if (symbol?.pay && symbol.kind !== 'wild') candidates.add(id);
  }

  let best: WinLine | null = null;
  for (const candidateId of candidates) {
    const candidate = symbolById(candidateId);
    if (!candidate?.pay) continue;
    let count = 0;
    for (const id of cellSyms) {
      const symbol = symbolById(id);
      const matches = candidateId === 'chili'
        ? id === 'chili'
        : id === candidateId || symbol?.kind === 'wild';
      if (!matches) break;
      count++;
    }
    if (count < 3) continue;
    const multiplier = candidate.pay[count as 3 | 4 | 5];
    if (best && best.multiplier >= multiplier) continue;
    best = {
      lineIndex,
      symbolId: candidateId,
      count,
      positions: line.slice(0, count).map((row, reel) => [reel, row]),
      multiplier,
    };
  }
  return best;
}

export type SpinResult = {
  /** Initial grid (before wild switch). */
  initialGrid: Grid;
  /** Grid after wild switch (or same as initialGrid if no switch). */
  grid: Grid;
  wildSwitch: WildSwitchInfo;
  /** Paid wins evaluated from the final grid. */
  wins: WinLine[];
  /** Initial-grid wins retained for presentation/debugging; not paid when
   * Wild Switch fires because the transformed grid replaces that result. */
  preSwitchWins: WinLine[];
  /** Wins from the post-switch grid. */
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
  /** Zero-based reel that receives the suspense tail, if any. */
  anticipationReel: number | null;
};

const RESPIN_AWARD: Record<number, number> = { 3: 10, 4: 12, 5: 15 };

/** §10b.2 anticipation reel — true when reels 1-4 show ≥2 piñatas (still
 *  in line for a 3+ trigger if reel 5 lands one). Reported on the result so
 *  the UI can play the slow-spin animation on reel 5. */
function shouldAnticipateReelFive(grid: Grid): boolean {
  let qualifyingReels = 0;
  for (let reel = 0; reel < 4; reel++) {
    if (grid[reel]!.includes('pinata')) qualifyingReels++;
  }
  return qualifyingReels >= 2;
}

/** Official Wild Switch teaser: five eligible matching symbols already
 * visible across reels 2–3 make reel 4 enter anticipation. */
function shouldAnticipateWildSwitch(grid: Grid): boolean {
  const counts = new Map<string, number>();
  for (let reel = 1; reel <= 2; reel++) {
    for (const id of grid[reel]!) {
      const symbol = symbolById(id);
      if (!symbol || symbol.kind === 'wild' || symbol.kind === 'scatter') continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.values()].some((count) => count >= 5);
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
  // Wild Switch resolves before the provider evaluates the paid line result.
  // Keep both snapshots to drive the transform animation and seeded replay.
  const preSwitchWins = evaluateLines(initialGrid);
  const switched = applyWildSwitch(initialGrid);
  const postSwitchWins = switched.info.switched ? evaluateLines(switched.grid) : [];
  const wins = switched.info.switched ? postSwitchWins : preSwitchWins;
  const lineMultiplier = wins.reduce((sum, win) => sum + win.multiplier, 0);

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

  const anticipationReel = shouldAnticipateWildSwitch(initialGrid)
    ? 3
    : shouldAnticipateReelFive(initialGrid)
      ? 4
      : null;

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
    anticipationReel,
    anticipation: anticipationReel !== null,
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
//   - WIN  : sum coins + jackpot symbols increment meters + bag pays.
//            Extra-spin symbols award +1 independently of this result.
//   - BOOST: coins on grid → permanently added to the Money Bag value;
//            jackpot/extra symbols do NOT collect. Respin -= 1.
//
// Jackpot meters (4 of them, separate counters):
//   Mini  : 3 symbols → 12.5× bet (then reset to 0)
//   Minor : 4 symbols → 50× bet
//   Major : 5 symbols → 250× bet
//   Grand : 5 symbols → 2,500× bet (current official sver=5 ruleset)
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

/** Exact Money value set exposed by the current official runtime. Values are
 * total-bet multipliers. Probability weights remain private and are locally
 * calibrated; low values deliberately dominate the approximation. */
const COIN_VALUE_TABLE: { value: number; w: number }[] = [
  { value: 0.5, w: 1400 },
  { value: 1,   w: 1200 },
  { value: 2,   w: 1000 },
  { value: 3,   w: 900 },
  { value: 5,   w: 800 },
  { value: 8,   w: 700 },
  { value: 10,  w: 600 },
  { value: 15,  w: 450 },
  { value: 20,  w: 300 },
  { value: 25,  w: 200 },
  { value: 40,  w: 100 },
  { value: 50,  w: 70 },
  { value: 100, w: 20 },
  { value: 125, w: 10 },
  { value: 200, w: 4 },
  { value: 250, w: 2 },
];

export const RESPIN_MONEY_VALUES = COIN_VALUE_TABLE.map((entry) => entry.value);

/** Locally calibrated marginal pool for the eight outer cells. The official
 * server sends correlated feature outcomes and does not expose their PAR
 * weights, so this table is explicitly an approximation. */
const OUTER_CELL_TABLE: { kind: 'blank' | 'coin' | 'extra' | JackpotTier; w: number }[] = [
  { kind: 'blank', w: 8481 },
  { kind: 'coin',  w: 1019 },
  { kind: 'extra', w: 200 },
  { kind: 'mini',  w: 240 },
  { kind: 'minor', w: 45 },
  { kind: 'major', w: 12 },
  { kind: 'grand', w: 3 },
];
const OUTER_CELL_TOTAL = OUTER_CELL_TABLE.reduce((s, x) => s + x.w, 0);
const COIN_VALUE_TOTAL = COIN_VALUE_TABLE.reduce((s, x) => s + x.w, 0);

function rollCoinValue(rng: Rng): number {
  const pick = rng.nextInt(COIN_VALUE_TOTAL);
  let accumulated = 0;
  for (const entry of COIN_VALUE_TABLE) {
    accumulated += entry.w;
    if (pick < accumulated) return entry.value;
  }
  return 1;
}

function rollOuterCell(rng: Rng): RespinSymbol {
  const r = rng.nextInt(OUTER_CELL_TOTAL);
  let acc = 0;
  for (const entry of OUTER_CELL_TABLE) {
    acc += entry.w;
    if (r < acc) {
      if (entry.kind === 'blank') return { kind: 'blank' };
      if (entry.kind === 'extra') return { kind: 'extra' };
      if (entry.kind === 'coin') {
        return { kind: 'coin', value: rollCoinValue(rng) };
      }
      return { kind: entry.kind };
    }
  }
  return { kind: 'blank' };
}

/** Locally calibrated fourth-reel outcomes. The current client exposes a
 * 25-stop visual loop (9 blank / 8 WIN / 8 BOOST), but that animation is not
 * proof of the server-side outcome distribution. These matching ratios are
 * therefore an explicit approximation, not a claimed provider PAR sheet. */
const FOURTH_REEL_TABLE: { kind: FourthReelOutcome; w: number }[] = [
  { kind: 'blank', w: 9 },
  { kind: 'win',   w: 8 },
  { kind: 'boost', w: 8 },
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

/** Operator rules document a guaranteed WIN during one of the first three
 * respins. That reveal contains exactly two Money symbols and two Jackpot
 * symbols; all remaining outer positions are blank. The caller chooses the
 * seeded index (1–3) once per feature and uses this sample at that index. */
export function rollGuaranteedWinRespin(rng: Rng): RespinSample {
  const outer: RespinSymbol[] = Array.from({ length: 8 }, () => ({ kind: 'blank' }));
  const positions = Array.from({ length: 8 }, (_, index) => index);
  for (let index = positions.length - 1; index > 0; index--) {
    const pick = rng.nextInt(index + 1);
    [positions[index], positions[pick]] = [positions[pick]!, positions[index]!];
  }
  outer[positions[0]!] = { kind: 'coin', value: rollCoinValue(rng) };
  outer[positions[1]!] = { kind: 'coin', value: rollCoinValue(rng) };
  const jackpotPool: JackpotTier[] = ['mini', 'mini', 'mini', 'minor', 'minor', 'major', 'grand'];
  outer[positions[2]!] = { kind: jackpotPool[rng.nextInt(jackpotPool.length)]! };
  outer[positions[3]!] = { kind: jackpotPool[rng.nextInt(jackpotPool.length)]! };
  return { outer, fourth: 'win' };
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
  /** Extra spins added to the counter, independent of fourth-reel result. */
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
  const extraSpins = countExtraSpins(outer);
  let boostGain = 0;
  let newBag = bagValue;
  let cappedAtMax = false;

  if (fourth === 'win') {
    coinSum = sumCoinValues(outer);
    bagPaid = bagValue;
    paid = coinSum + bagPaid;
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

  // The feature ends as soon as the complete cycle reaches the documented
  // 2,600× maximum, not only after it exceeds the cap.
  const projected = state.cumulativeMult + paid;
  if (projected >= 2600) {
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

/** A deterministic feature event consumed by presentation code. Keeping the
 * sampled outcome and its resolved state together prevents frame timing,
 * animation interruption or React renders from changing feature math. */
export type RespinTimelineEvent = {
  ordinal: number;
  guaranteedWin: boolean;
  respinsBefore: number;
  respinsAfter: number;
  sample: RespinSample;
  resolution: RespinResolution;
  cumulativeAfter: number;
};

export type RespinRoundOutcome = {
  initialRespins: number;
  guaranteedWinOrdinal: number;
  events: RespinTimelineEvent[];
  totalMultiplier: number;
  finalBagValue: number;
  finalMeters: Record<JackpotTier, number>;
  cappedAtMax: boolean;
};

/** Precompute a complete feature from one seeded RNG. The UI replays this
 * immutable timeline and never samples or evaluates wins while animating. */
export function simulateRespinRound(
  rng: Rng,
  initialRespins: number,
  capOffsetMultiplier = 0,
): RespinRoundOutcome {
  const safeInitialRespins = Math.max(0, Math.floor(initialRespins));
  const safeCapOffset = Number.isFinite(capOffsetMultiplier)
    ? Math.max(0, capOffsetMultiplier)
    : 0;
  const guaranteedWinOrdinal = rng.nextInt(3) + 1;
  const events: RespinTimelineEvent[] = [];
  let respinsLeft = safeInitialRespins;
  let bagValue = 1;
  let meters: Record<JackpotTier, number> = { mini: 0, minor: 0, major: 0, grand: 0 };
  let cumulative = 0;
  let cappedAtMax = safeCapOffset >= 2600;

  while (respinsLeft > 0 && !cappedAtMax) {
    const ordinal = events.length + 1;
    const guaranteedWin = ordinal === guaranteedWinOrdinal;
    const sample = guaranteedWin ? rollGuaranteedWinRespin(rng) : rollRespin(rng);
    const resolution = resolveRespin(sample, {
      bagValue,
      meters,
      cumulativeMult: safeCapOffset + cumulative,
    });
    const respinsAfter = Math.max(0, respinsLeft - 1 + resolution.extraSpins);
    cumulative = +(cumulative + resolution.paid).toFixed(4);
    events.push({
      ordinal,
      guaranteedWin,
      respinsBefore: respinsLeft,
      respinsAfter,
      sample,
      resolution,
      cumulativeAfter: cumulative,
    });
    respinsLeft = respinsAfter;
    bagValue = resolution.newBagValue;
    meters = resolution.newMeters;
    cappedAtMax = resolution.cappedAtMax;

    // Defensive guard against a malformed future probability table creating
    // an unbounded chain of Extra Spins.
    if (events.length >= 10_000) throw new Error('Big Juan respin timeline exceeded safety limit');
  }

  return {
    initialRespins: safeInitialRespins,
    guaranteedWinOrdinal,
    events,
    totalMultiplier: cumulative,
    finalBagValue: bagValue,
    finalMeters: { ...meters },
    cappedAtMax,
  };
}

// =============================================================================
// SECTION 5 — Bonus Buy
// =============================================================================
//
// The documented buy costs 100× total bet and enters with either 4 piñatas
// (12 respins) or 5 piñatas (15 respins), never 3. Their server weighting is
// private; the local 85/15 split below is calibrated to the published 96.53%
// buy RTP and must not be presented as an official probability.

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

/** Current sver=5 bet structure — total_bet = coin_value × coins_per_line × 40.
 * Min 0.40; current runtime maximum 240.00. */
export const BET_MIN = 0.40;
export const BET_MAX = 240.00;
export const PAYLINE_COUNT_FOR_BET = 40;

/** Coin-value steps used by this local control surface. */
export const COIN_VALUES = [
  0.01, 0.02, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60,
] as const;

/** Coins-per-line steps (spec §1: range 1 – 10). */
export const COINS_PER_LINE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function totalBetFor(coinValue: number, coinsPerLine: number): number {
  return +(coinValue * coinsPerLine * PAYLINE_COUNT_FOR_BET).toFixed(2);
}

/** Autoplay options per spec §1. */
export const AUTOPLAY_OPTIONS = [10, 20, 30, 50, 70, 100, 500, 1000] as const;

/** Presentation thresholds are calibrated because the provider does not
 * publish them. Labels use phrases observed in reference-game captures. */
export type BigWinTierName = 'nice' | 'big' | 'mega' | 'super' | 'huge' | 'epic' | 'max';
export const BIG_WIN_TIERS: { name: BigWinTierName; min: number; max: number; durationMs: number; label: string }[] = [
  { name: 'nice',  min: 10,   max: 25,    durationMs: 2500,  label: 'STELLAR SPIN!' },
  { name: 'big',   min: 25,   max: 50,    durationMs: 4000,  label: "YOU'RE ON FIRE!" },
  { name: 'mega',  min: 50,   max: 100,   durationMs: 5500,  label: 'SUPERSTAR!' },
  { name: 'super', min: 100,  max: 500,   durationMs: 7000,  label: "YOU'VE GOT THE POWER!" },
  { name: 'huge',  min: 500,  max: 1000,  durationMs: 9000,  label: 'OUT OF THIS WORLD!' },
  { name: 'epic',  min: 1000, max: 2500,  durationMs: 11000, label: 'POP THE CHAMPAGNE!' },
  { name: 'max',   min: 2500, max: Infinity, durationMs: 14000, label: 'MAX WIN!' },
];

export function bigWinTierFor(multiplier: number): typeof BIG_WIN_TIERS[number] | null {
  if (multiplier < 10) return null;
  for (let i = BIG_WIN_TIERS.length - 1; i >= 0; i--) {
    if (multiplier >= BIG_WIN_TIERS[i]!.min) return BIG_WIN_TIERS[i]!;
  }
  return null;
}
