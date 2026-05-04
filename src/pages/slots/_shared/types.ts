/**
 * Shared types for tumble slots (Sweet Bonanza, Gates of Olympus, ...).
 *
 * The engine produces a deterministic Spin given (config, rng, bet, mode).
 * The render layer plays back its `frames` to animate.
 */

export type Tier = 'low' | 'mid' | 'high' | 'top' | 'scatter' | 'multiplier';

export type SymbolDef = {
  id: string;
  /** Tier mostly informational; payout map is the source of truth. */
  tier: Tier;
  /** Display label (used in alt text / fallback). */
  label: string;
  /**
   * Payout multiplier of the *bet* for a given count (pay-anywhere).
   * Pragmatic Play uses count→multiplier where 8–9, 10–11, 12+ are typical breakpoints.
   * For scatters the breakpoints are 4, 5, 6+.
   * Multiplier symbols don't pay directly; their `payout` is empty.
   */
  payout: Record<number, number>;
};

export type Cell = {
  symbolId: string;
  /** For multiplier symbols, the printed multiplier value. */
  multiplier?: number;
  /** Stable key for animation tracking across frames. */
  key: string;
};

/** Grid is `cols × rows`. Indexing: `grid[col][row]`, row 0 is top. */
export type Grid = Cell[][];

export type WinGroup = {
  symbolId: string;
  /** [col, row] coordinates of cells in this win group. */
  positions: [number, number][];
  /** Pay multiplier (payout / bet) for this group, before global multipliers. */
  payMultiplier: number;
  /** Cash payout in bet units (= payMultiplier * bet). */
  payout: number;
};

export type MultiplierLanding = {
  col: number;
  row: number;
  value: number;
  key: string;
};

/** Frames the renderer plays in order. */
export type Frame =
  | { kind: 'initialDrop'; grid: Grid }
  /** Lightning Strike (real Olympus): Zeus appears, raises arm, lightning slams
      a batch of multiplier orbs onto the board before the first win-check.
      Visually distinct from normal multiplier drops during tumbles. */
  | { kind: 'lightningStrike'; landings: MultiplierLanding[]; grid: Grid }
  | { kind: 'multipliersLanded'; landings: MultiplierLanding[]; grid: Grid }
  | {
      kind: 'wins';
      grid: Grid;
      wins: WinGroup[];
      tumbleIdx: number;
      chainPayout: number;
    }
  | { kind: 'tumble'; grid: Grid }
  | { kind: 'scattersWon'; count: number; payout: number }
  | { kind: 'freeSpinsAwarded'; count: number; reason: 'scatter' | 'retrigger' | 'buy' }
  | { kind: 'freeSpinsBegin'; total: number }
  | { kind: 'freeSpinsEnd'; totalPayout: number }
  | {
      kind: 'multiplierApplied';
      sumOfMultipliers: number;
      preMultiplierPayout: number;
      finalPayout: number;
    }
  | { kind: 'final'; spinPayout: number; runningPayout: number };

export type SpinMode = 'base' | 'free';

export type SpinResult = {
  frames: Frame[];
  totalPayout: number;
  /** True if free-spin trigger fired during this base spin. */
  triggeredFreeSpins: boolean;
  /** Free-spins awarded (>=10 if triggered, +5 per retrigger). */
  freeSpinsAwarded: number;
};

/** Result of running an entire round (base spin or full free-spins session). */
export type RoundResult = {
  frames: Frame[];
  totalPayout: number;
  /** Triggered free spins count. */
  freeSpinsAwarded: number;
};

export type MultiplierTable = {
  /** Probability of any multiplier landing on a given tumble step. */
  pPerTumble: number;
  /** Distribution of multiplier values (each entry: [value, weight]). */
  values: [number, number][];
  /** Max number of multipliers per tumble (rare to land more than 1–2). */
  maxPerTumble: number;
};

export type SlotConfig = {
  id: string;
  name: string;
  cols: number;
  rows: number;
  /** Symbol definitions. */
  symbols: SymbolDef[];
  /** Symbol weights for base game (parallel to `symbols`). */
  weightsBase: number[];
  /** Symbol weights for free-spins reels (often boosts mid/high tier). */
  weightsFree: number[];
  /** Symbol id used for scatter (lollipop / Zeus icon). */
  scatterId: string;
  /** Number of scatters required to trigger free spins. */
  scatterTriggerCount: number;
  /** Scatters required to retrigger inside free spins (typ. 3). */
  scatterRetriggerCount: number;
  /** Free spins awarded on initial trigger. */
  freeSpinsAwardOnTrigger: number;
  /** Extra free spins per retrigger. */
  freeSpinsAwardOnRetrigger: number;
  /** Pay-anywhere threshold (Pragmatic = 8). */
  payAnywhereThreshold: number;
  /** Multiplier table for base game. */
  multiplierTableBase: MultiplierTable;
  /** Multiplier table for free spins. */
  multiplierTableFree: MultiplierTable;
  /** When true, *base*-game multipliers apply only to the chain that they landed on (Olympus); when false they apply at the end of the entire spin sum (Bonanza-style: applies after summing the chain). For free spins, behavior is configured per game in engine. */
  multiplierFreeMode: 'sum-at-end' | 'sum-at-end'; // both Bonanza & Olympus sum at end of free spin
  /** Buy bonus cost (multiple of bet). */
  buyBonusCost: number;
  /** Ante bet adjustments. */
  ante: { betMultiplier: number; scatterWeightBoost: number };
  /** Theme metadata (gradient, accent) — used by render layer. */
  theme: {
    accent: string;
    glow: string;
    gridClass: string;
    /** Class added to each cell for game-specific styling (`cell-olympus`, `cell-bonanza`). */
    cellClass: string;
    /** Class added to the page-level wrapper for atmosphere (e.g. `olympus-stage`). */
    stageClass?: string;
    /** How the grid transitions when SPIN is pressed before new symbols
     *  arrive. Each option matches what the real-game inspiration does:
     *
     *   - 'fall'      tumble slots (Sweet Bonanza, Gates of Olympus): old
     *                 symbols drop down off the grid, no blur. New symbols
     *                 cascade in from above.
     *   - 'puff'      cluster slots (Sugar Rush): old symbols pop/shrink in
     *                 place, then new ones drop in.
     *   - 'reel-spin' real reel slots (Wolf Gold, Wanted): vertical motion
     *                 blur per column (not omni-directional blur).
     *
     *  When omitted, falls back to the legacy blur+darken effect. */
    prespinStyle?: 'fall' | 'puff' | 'reel-spin';
  };
};
