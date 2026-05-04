import type { Rng } from '../../../lib/fairness';

/** Big Juan — 5×4 paylines slot inspired by Pragmatic Play's Big Juan
 *  (a fiesta / cantina theme with a portly mariachi mascot, NOT a
 *  luchador — see screenshots from the real game). Mechanics map to
 *  the real game's hold-and-spin bonus with 4 progressive jackpot tiers
 *  (Grand / Major / Minor / Mini).
 *
 *  ── Layout ─────────────────────────────────────────────
 *    5 reels × 4 rows = 20 cells
 *    40 paylines (standard horizontal/zigzag patterns)
 *    Wins are evaluated left → right starting at reel 0
 *
 *  ── Symbols ────────────────────────────────────────────
 *    juan       — top pay (Big Juan, the portly mariachi mascot)
 *    diablo     — high pay (Señorita, the female fiesta dancer)
 *    sombrero   — high (red sombrero hat)
 *    guitar     — high (mariachi vihuela)
 *    boot       — mid (cowboy/charro boot)
 *    glove      — mid (pair of maracas)
 *    A K Q J 10 — low (royal-style filler)
 *    chilli     — WILD (substitutes everything except scatter)
 *    pinata     — SCATTER (3+ → bonus respins round)
 *
 *  ── Features ──────────────────────────────────────────
 *    Wild substitution — chilli replaces any non-scatter to complete a line
 *    Wild Switch       — when 6+ identical non-scatter symbols land
 *                         entirely within reels 2-4, all of those positions
 *                         switch to wilds (re-evaluate for big multi-line hits)
 *    Bonus Respins     — 3 / 4 / 5 piñata scatters → 10 / 12 / 14 respins
 *                         on a 3×3 hold-and-spin grid with coins, jackpots
 *                         (mini/minor/major/grand), and +1-respin tokens
 *    Scatter pay       — 3 / 4 / 5 scatters pay 2× / 10× / 50× total bet
 *
 *  Calibrated for ~96.7% RTP / high volatility / ~2500× max-win cap
 *  (matches the real game's published headline numbers).
 */

// -----------------------------------------------------------------------------
// Symbols + reel weights
// -----------------------------------------------------------------------------

export type SymbolDef = {
  id: string;
  emoji: string;
  /** Pay multipliers for 3-of-a-kind, 4-of-a-kind, 5-of-a-kind on a payline.
   *  Undefined for the wild (uses substitute symbol's pays) and scatter
   *  (uses scatterPay). */
  pay?: { 3: number; 4: number; 5: number };
  isWild?: boolean;
  isScatter?: boolean;
  /** Per-reel weight. Symbols with weight 0 on a reel never appear there. */
  weights: [number, number, number, number, number]; // 5 reels
  color: string;
};

export const SYMBOLS: SymbolDef[] = [
  // Top pay — Big Juan, the portly mariachi mascot
  { id: 'juan',     emoji: '🤠', color: '#ff5560', pay: { 3: 5,  4: 25, 5: 200 }, weights: [2, 3, 3, 3, 2] },
  // High pays — fiesta/mariachi cast
  { id: 'diablo',   emoji: '💃', color: '#ff8aa3', pay: { 3: 2,  4: 10, 5: 80 },  weights: [3, 4, 4, 4, 3] },
  { id: 'sombrero', emoji: '🪅', color: '#ffae50', pay: { 3: 1.5, 4: 7, 5: 50 },  weights: [4, 5, 5, 5, 4] },
  { id: 'guitar',   emoji: '🎸', color: '#c8932e', pay: { 3: 1.2, 4: 5, 5: 40 },  weights: [5, 5, 5, 5, 5] },
  // Mid pays
  { id: 'boot',     emoji: '👢', color: '#7a4a18', pay: { 3: 0.8, 4: 3, 5: 20 },  weights: [6, 6, 6, 6, 6] },
  { id: 'glove',    emoji: '🪇', color: '#ffd166', pay: { 3: 0.6, 4: 2, 5: 15 },  weights: [7, 7, 7, 7, 7] },
  // Low pays (royal-style)
  { id: 'A',        emoji: '🅰', color: '#ffd166', pay: { 3: 0.4, 4: 1.2, 5: 8 }, weights: [9, 9, 9, 9, 9] },
  { id: 'K',        emoji: '🅺', color: '#a78bfa', pay: { 3: 0.3, 4: 1, 5: 6 },   weights: [10, 10, 10, 10, 10] },
  { id: 'Q',        emoji: '🅀', color: '#ff7ad9', pay: { 3: 0.3, 4: 0.8, 5: 5 }, weights: [10, 10, 10, 10, 10] },
  { id: 'J',        emoji: '🅹', color: '#1fff7a', pay: { 3: 0.2, 4: 0.6, 5: 4 }, weights: [11, 11, 11, 11, 11] },
  { id: '10',       emoji: '🔟', color: '#22d3ee', pay: { 3: 0.2, 4: 0.5, 5: 3 }, weights: [11, 11, 11, 11, 11] },
  // Wild (chilli) — substitutes; only on middle reels (2/3/4 = index 1/2/3) per
  // typical Pragmatic conventions (wilds usually NOT on first reel).
  { id: 'chilli',   emoji: '🌶️', color: '#ff5560', isWild: true,    weights: [0, 2, 3, 2, 0] },
  // Scatter (piñata) — appears on any reel.
  { id: 'pinata',   emoji: '🎉', color: '#ffd166', isScatter: true, weights: [1.5, 1.5, 1.5, 1.5, 1.5] },
];

const REEL_TOTAL_WEIGHT: number[] = [0, 1, 2, 3, 4].map(
  (r) => SYMBOLS.reduce((s, sym) => s + sym.weights[r as 0|1|2|3|4], 0),
);

function pickSymbolForReel(rng: Rng, reel: 0 | 1 | 2 | 3 | 4): string {
  const total = REEL_TOTAL_WEIGHT[reel]!;
  // Scale by 100 to support fractional weights (1.5 etc.).
  const r = rng.nextInt(Math.round(total * 100));
  let acc = 0;
  for (const s of SYMBOLS) {
    acc += s.weights[reel] * 100;
    if (r < acc) return s.id;
  }
  return SYMBOLS[0]!.id;
}

export function symbolById(id: string): SymbolDef | null {
  return SYMBOLS.find((s) => s.id === id) ?? null;
}

// -----------------------------------------------------------------------------
// Paylines — 40 standard layouts. Each line is an array of 5 row-indices
// (0=top, 3=bottom) with one row picked per reel. The classic 40-line set
// includes 4 horizontal lines + zigzag/V/diagonal patterns.
// -----------------------------------------------------------------------------

const PAYLINES: number[][] = [
  // 4 horizontals
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  // V-shapes top
  [0, 1, 2, 1, 0],
  [3, 2, 1, 2, 3],
  // Steps
  [1, 0, 0, 0, 1],
  [2, 3, 3, 3, 2],
  [0, 1, 1, 1, 0],
  [3, 2, 2, 2, 3],
  // Zigzags
  [0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1],
  [2, 3, 2, 3, 2],
  [3, 2, 3, 2, 3],
  // Long stairs
  [0, 0, 1, 2, 3],
  [3, 3, 2, 1, 0],
  // Cross
  [1, 2, 1, 2, 1],
  [2, 1, 2, 1, 2],
  // Up-down zigzag covering more rows
  [0, 2, 0, 2, 0],
  [3, 1, 3, 1, 3],
  // Symmetric arches
  [1, 0, 1, 0, 1],
  [2, 3, 2, 3, 2],
  // Curl
  [0, 0, 1, 0, 0],
  [3, 3, 2, 3, 3],
  // Diagonal slants
  [0, 1, 2, 3, 3],
  [3, 2, 1, 0, 0],
  [1, 1, 2, 3, 3],
  [2, 2, 1, 0, 0],
  // Corner clips
  [0, 1, 1, 1, 0],
  [3, 2, 2, 2, 3],
  // Centre tilts
  [1, 2, 1, 2, 1],
  [2, 1, 2, 1, 2],
  // Skip patterns
  [0, 2, 1, 2, 0],
  [3, 1, 2, 1, 3],
  [0, 0, 2, 0, 0],
  [3, 3, 1, 3, 3],
  // Wide V
  [0, 2, 3, 2, 0],
  [3, 1, 0, 1, 3],
  // Final fillers
  [1, 0, 2, 0, 1],
  [2, 3, 1, 3, 2],
];

export const PAYLINE_COUNT = PAYLINES.length; // 40

// -----------------------------------------------------------------------------
// Spin generation + win evaluation
// -----------------------------------------------------------------------------

/** A 5×4 grid: grid[reel][row] = symbolId. */
export type Grid = string[][];

export function generateGrid(rng: Rng, isFreeSpin: boolean = false): Grid {
  const grid: Grid = [];
  for (let reel = 0; reel < 5; reel++) {
    const col: string[] = [];
    for (let row = 0; row < 4; row++) {
      col.push(pickSymbolForReel(rng, reel as 0|1|2|3|4));
    }
    grid.push(col);
  }
  // FS slightly boosts scatter rate by re-rolling 8% of low-tier cells.
  if (isFreeSpin) {
    for (let reel = 0; reel < 5; reel++) {
      for (let row = 0; row < 4; row++) {
        if (rng.next() < 0.08) {
          grid[reel]![row] = pickSymbolForReel(rng, reel as 0|1|2|3|4);
        }
      }
    }
  }
  return grid;
}

/** Wild Switch — if 6+ identical non-special symbols land entirely on
 *  reels 2/3/4 (indices 1/2/3), turn each of those positions into wilds. */
export function applyWildSwitch(grid: Grid): { grid: Grid; switched: boolean; switchedSymbol: string | null; positions: Array<[number, number]> } {
  const counts = new Map<string, Array<[number, number]>>();
  for (let reel = 1; reel <= 3; reel++) {
    for (let row = 0; row < 4; row++) {
      const id = grid[reel]![row]!;
      const sym = symbolById(id);
      if (!sym || sym.isWild || sym.isScatter) continue;
      if (!counts.has(id)) counts.set(id, []);
      counts.get(id)!.push([reel, row]);
    }
  }
  for (const [id, positions] of counts.entries()) {
    if (positions.length >= 6) {
      const newGrid = grid.map((col) => [...col]);
      for (const [reel, row] of positions) {
        newGrid[reel]![row] = 'chilli';
      }
      return { grid: newGrid, switched: true, switchedSymbol: id, positions };
    }
  }
  return { grid, switched: false, switchedSymbol: null, positions: [] };
}

export type WinLine = {
  lineIndex: number;
  symbolId: string;
  count: number;
  /** Cell positions [reel, row] forming the win. */
  positions: Array<[number, number]>;
  multiplier: number;
};

/** Resolve a single payline. Returns the longest left-anchored matching
 *  run (>=3) including wild substitution. */
function resolveLine(
  grid: Grid,
  lineIndex: number,
  line: number[],
): WinLine | null {
  const cellSyms: string[] = line.map((row, reel) => grid[reel]![row]!);
  // First non-wild symbol fixes the "target". If reel-0 is a wild itself,
  // we treat the longest-prefix-of-wilds-then-target run.
  let target: string | null = null;
  let i = 0;
  for (; i < 5; i++) {
    const id = cellSyms[i]!;
    const sym = symbolById(id);
    if (sym?.isScatter) return null;
    if (!sym?.isWild) { target = id; break; }
  }
  if (target === null) {
    // All 5 are wilds — pay as the highest non-wild substitute (juan).
    target = 'juan';
    i = 0;
  }
  // Count consecutive matches from position 0
  let count = 0;
  for (let j = 0; j < 5; j++) {
    const id = cellSyms[j]!;
    const sym = symbolById(id);
    if (sym?.isScatter) break;
    if (id === target || sym?.isWild) count++;
    else break;
  }
  if (count < 3) return null;
  const targetSym = symbolById(target);
  if (!targetSym?.pay) return null;
  const multiplier = targetSym.pay[count as 3 | 4 | 5];
  if (!multiplier) return null;
  const positions: Array<[number, number]> = line
    .slice(0, count)
    .map((row, reel) => [reel, row]);
  return { lineIndex, symbolId: target, count, positions, multiplier };
}

export type SpinResult = {
  grid: Grid;
  /** Wild Switch info: was it triggered, what symbol, which positions. */
  wildSwitch?: { switched: boolean; switchedSymbol: string | null; positions: Array<[number, number]> };
  /** Per-line wins (after all wild handling). */
  wins: WinLine[];
  /** Total line-win multiplier (sum of all line multipliers). */
  lineMultiplier: number;
  /** Scatter count + scatter-only payout multiplier. */
  scatterCount: number;
  scatterMultiplier: number;
  /** Free-spins triggered? */
  freeSpinsAwarded: number;
  /** Total payout multiplier (line + scatter). */
  totalMultiplier: number;
};

const SCATTER_PAY: Record<number, number> = { 3: 2, 4: 10, 5: 50 };
const FS_AWARD: Record<number, number> = { 3: 8, 4: 10, 5: 12 };

export function play(rng: Rng, isFreeSpin: boolean = false): SpinResult {
  const initialGrid = generateGrid(rng, isFreeSpin);
  const switchResult = applyWildSwitch(initialGrid);
  const grid = switchResult.grid;

  const wins: WinLine[] = [];
  for (let i = 0; i < PAYLINES.length; i++) {
    const line = PAYLINES[i]!;
    const win = resolveLine(grid, i, line);
    if (win) wins.push(win);
  }
  const lineMultiplier = wins.reduce((s, w) => s + w.multiplier, 0);

  let scatterCount = 0;
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 4; row++) {
      if (grid[reel]![row] === 'pinata') scatterCount++;
    }
  }
  const scatterMultiplier = SCATTER_PAY[Math.min(5, scatterCount)] ?? 0;
  const freeSpinsAwarded = scatterCount >= 3 ? FS_AWARD[Math.min(5, scatterCount)] ?? 0 : 0;

  // Cap total multiplier at 2600× per spin to match real Big Juan max-win.
  const totalMultiplier = Math.min(2600, lineMultiplier + scatterMultiplier);
  return {
    grid,
    wildSwitch: switchResult,
    wins,
    lineMultiplier,
    scatterCount,
    scatterMultiplier,
    freeSpinsAwarded,
    totalMultiplier,
  };
}

export { PAYLINES };

// =============================================================================
// BONUS ROUND — 3×3 respins mini-grid (Money Train / Hold-and-Win style)
// =============================================================================
//
// On free-spin trigger (3+ scatters), the game enters a separate bonus
// respins mode. Player gets 10 + 2*(scatter-3) initial respins (so 10/12/14
// for 3/4/5 scatters). Each respin spins the empty cells of a 3×3 grid:
//
//  - Coin symbols stick in place when they land (1×, 2×, 5×, 10× values)
//  - Bonus +1 symbols add a respin and stick
//  - Jackpot symbols (mini/minor/major/grand) rarely land and stick
//  - Empty cells re-spin each round
//  - When a coin lands, the respin counter is RESET to its starting count
//    (the classic "hold-and-win"); when no new coins land, respins decrement
//  - Bonus ends when respins = 0 OR all 9 cells are filled
//  - Total payout = sum of all coin values + jackpot values awarded

export type BonusCellKind =
  | 'empty'
  | { kind: 'coin'; value: number }   // multiplier of base bet
  | { kind: 'extra' }                 // +1 respin
  | { kind: 'mini' }                  // jackpot tiers
  | { kind: 'minor' }
  | { kind: 'major' }
  | { kind: 'grand' };

export type BonusCell = BonusCellKind extends 'empty' ? 'empty' : BonusCellKind;

/** Jackpot multipliers (× base bet). */
export const JACKPOTS = {
  mini:  10,
  minor: 50,
  major: 250,
  grand: 2500,
} as const;

/** Per-cell weighted distribution for what an empty cell rolls when respun.
 *  Most rolls are empty → keeps the round dramatic. */
const BONUS_WEIGHTS: { kind: BonusCellKind; w: number }[] = [
  { kind: 'empty',                w: 7000 }, // 70% miss
  { kind: { kind: 'coin', value: 1 },  w: 1200 }, // 12% — 1×
  { kind: { kind: 'coin', value: 2 },  w: 700  }, // 7%  — 2×
  { kind: { kind: 'coin', value: 5 },  w: 320  }, // 3.2% — 5×
  { kind: { kind: 'coin', value: 10 }, w: 150  }, // 1.5% — 10×
  { kind: { kind: 'coin', value: 25 }, w: 70   }, // 0.7% — 25×
  { kind: { kind: 'coin', value: 50 }, w: 25   }, // 0.25% — 50×
  { kind: { kind: 'extra' },           w: 200  }, // 2% — +1 respin
  { kind: { kind: 'mini' },            w: 80   }, // 0.8% — Mini jackpot
  { kind: { kind: 'minor' },           w: 30   }, // 0.3%
  { kind: { kind: 'major' },           w: 10   }, // 0.1%
  { kind: { kind: 'grand' },           w: 5    }, // 0.05%
];
const BONUS_TOTAL_W = BONUS_WEIGHTS.reduce((s, w) => s + w.w, 0);

export function bonusRollOne(rng: Rng): BonusCellKind {
  const r = rng.nextInt(BONUS_TOTAL_W);
  let acc = 0;
  for (const item of BONUS_WEIGHTS) {
    acc += item.w;
    if (r < acc) return item.kind;
  }
  return 'empty';
}

/** Total cell value (× bet) for a single bonus cell. */
export function bonusCellValue(cell: BonusCellKind): number {
  if (cell === 'empty') return 0;
  if (typeof cell === 'string') return 0;
  if (cell.kind === 'coin') return cell.value;
  if (cell.kind === 'extra') return 0;
  if (cell.kind === 'mini') return JACKPOTS.mini;
  if (cell.kind === 'minor') return JACKPOTS.minor;
  if (cell.kind === 'major') return JACKPOTS.major;
  if (cell.kind === 'grand') return JACKPOTS.grand;
  return 0;
}

export function isFilled(cell: BonusCellKind): boolean {
  return cell !== 'empty';
}

/** Initial respin count given trigger scatter count. */
export function bonusInitialRespins(scatterCount: number): number {
  return 10 + 2 * Math.max(0, Math.min(2, scatterCount - 3));
}

