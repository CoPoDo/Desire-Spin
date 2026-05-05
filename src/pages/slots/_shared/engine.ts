import type { Rng } from '../../../lib/fairness';
import type {
  Cell,
  Frame,
  Grid,
  MultiplierLanding,
  RoundResult,
  SlotConfig,
  SpinMode,
  SpinResult,
  WinGroup,
} from './types';

/**
 * Tumble slot engine — pay-anywhere with cascading wins, random multiplier
 * symbols, free spins, ante bet, and buy-bonus.
 *
 * Mirrors the published mechanics of Pragmatic Play's "Sweet Bonanza" and
 * "Gates of Olympus" closely enough that the produced spins *feel* identical
 * — but with internal weights tuned for a casual emulator (95–98% RTP).
 *
 * The engine is fully deterministic given a `Rng`. The render layer plays
 * `result.frames` in sequence with animation timing of its choosing.
 */

let keyCounter = 0;
const nextKey = () => `c${++keyCounter}`;

export type SpinOptions = {
  /** Total bet for this spin (after ante / buy adjustments). */
  bet: number;
  /** Whether ante bet is active (boosts scatter weight in base spins). */
  ante: boolean;
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function pickSymbol(rng: Rng, weights: number[]): number {
  return rng.weighted(weights);
}

function newCell(symbolId: string, multiplier?: number): Cell {
  return { symbolId, multiplier, key: nextKey() };
}

function fillGrid(rng: Rng, cfg: SlotConfig, weights: number[]): Grid {
  const grid: Grid = [];
  for (let c = 0; c < cfg.cols; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < cfg.rows; r++) {
      const idx = pickSymbol(rng, weights);
      col.push(newCell(cfg.symbols[idx]!.id));
    }
    grid.push(col);
  }
  return grid;
}

function activeWeights(cfg: SlotConfig, mode: SpinMode, ante: boolean): number[] {
  const base = mode === 'base' ? cfg.weightsBase : cfg.weightsFree;
  if (mode === 'base' && ante) {
    const scatterIdx = cfg.symbols.findIndex((s) => s.id === cfg.scatterId);
    if (scatterIdx >= 0) {
      const out = base.slice();
      out[scatterIdx] = (out[scatterIdx] ?? 0) * cfg.ante.scatterWeightBoost;
      return out;
    }
  }
  return base;
}

/** Find pay-anywhere wins for non-multiplier, non-scatter symbols. */
function findWins(grid: Grid, cfg: SlotConfig, bet: number): WinGroup[] {
  const positions = new Map<string, [number, number][]>();
  for (let c = 0; c < grid.length; c++) {
    const col = grid[c]!;
    for (let r = 0; r < col.length; r++) {
      const cell = col[r]!;
      if (cell.symbolId === cfg.scatterId) continue;
      if (cell.multiplier !== undefined) continue;
      const arr = positions.get(cell.symbolId) ?? [];
      arr.push([c, r]);
      positions.set(cell.symbolId, arr);
    }
  }
  const wins: WinGroup[] = [];
  for (const [symbolId, pos] of positions) {
    if (pos.length < cfg.payAnywhereThreshold) continue;
    const sym = cfg.symbols.find((s) => s.id === symbolId);
    if (!sym) continue;
    const payMultiplier = lookupPay(sym.payout, pos.length);
    if (payMultiplier <= 0) continue;
    wins.push({
      symbolId,
      positions: pos,
      payMultiplier,
      payout: payMultiplier * bet,
    });
  }
  return wins;
}

function lookupPay(table: Record<number, number>, count: number): number {
  // Pick the largest threshold ≤ count.
  let best = 0;
  for (const k of Object.keys(table)) {
    const n = parseInt(k, 10);
    if (n <= count && table[n]! > best) best = table[n]!;
  }
  return best;
}

function tumbleAfterWins(grid: Grid, wins: WinGroup[], cfg: SlotConfig, rng: Rng, weights: number[]): Grid {
  const winning = new Set<string>();
  for (const w of wins) for (const [c, r] of w.positions) winning.add(`${c}:${r}`);
  const next: Grid = [];
  for (let c = 0; c < grid.length; c++) {
    const col = grid[c]!;
    // Keep non-winning cells (gravity: bottom-anchored).
    const survivors: Cell[] = [];
    for (let r = 0; r < col.length; r++) {
      if (!winning.has(`${c}:${r}`)) survivors.push(col[r]!);
    }
    // New cells dropped from above to fill the gap.
    const fresh: Cell[] = [];
    const need = cfg.rows - survivors.length;
    for (let i = 0; i < need; i++) {
      const idx = pickSymbol(rng, weights);
      fresh.push(newCell(cfg.symbols[idx]!.id));
    }
    // Stack: fresh on top, survivors below — preserving row order (top-down).
    next.push([...fresh, ...survivors]);
  }
  return next;
}

/** Roll for multiplier landings on the current grid. */
function rollMultipliers(
  grid: Grid,
  cfg: SlotConfig,
  rng: Rng,
  mode: SpinMode,
): MultiplierLanding[] {
  const table = mode === 'base' ? cfg.multiplierTableBase : cfg.multiplierTableFree;
  // Probability gate: this is per-tumble.
  if (rng.next() >= table.pPerTumble) return [];
  // How many multipliers? Heavily weighted toward 1.
  const countRoll = rng.next();
  const count = countRoll < 0.85 ? 1 : countRoll < 0.97 ? 2 : Math.min(table.maxPerTumble, 3);
  const landings: MultiplierLanding[] = [];
  const used = new Set<string>();
  // Pick free cells (cells not currently holding a multiplier) and assign value.
  const valuesWeights = table.values.map(([, w]) => w);
  let attempts = 0;
  while (landings.length < count && attempts < 60) {
    attempts++;
    const c = rng.nextInt(cfg.cols);
    const r = rng.nextInt(cfg.rows);
    const key = `${c}:${r}`;
    if (used.has(key)) continue;
    const cell = grid[c]?.[r];
    if (!cell || cell.multiplier !== undefined || cell.symbolId === cfg.scatterId) continue;
    used.add(key);
    const vIdx = rng.weighted(valuesWeights);
    const value = table.values[vIdx]![0];
    landings.push({ col: c, row: r, value, key: nextKey() });
  }
  return landings;
}

function applyMultiplierLandings(grid: Grid, landings: MultiplierLanding[]): Grid {
  if (landings.length === 0) return grid;
  const next = clone(grid);
  for (const m of landings) {
    const col = next[m.col]!;
    const cell = col[m.row]!;
    cell.multiplier = m.value;
    cell.symbolId = '__mult__'; // virtual id; render layer handles it
    cell.key = m.key;
  }
  return next;
}

function countScatters(grid: Grid, cfg: SlotConfig): number {
  let n = 0;
  for (const col of grid) for (const cell of col) if (cell.symbolId === cfg.scatterId) n++;
  return n;
}

function sumGridMultipliers(grid: Grid): number {
  let sum = 0;
  for (const col of grid) for (const cell of col) if (cell.multiplier !== undefined) sum += cell.multiplier;
  return sum;
}

/**
 * Run a single spin (base or free).
 *
 * Mechanics:
 *  - Initial fill, count scatters → emit `scattersWon` if any pay (4+).
 *  - Tumble loop: find wins → emit win + payout → roll for multiplier landings →
 *    apply to grid → tumble survivors + new cells → repeat until no wins.
 *  - Free-spin trigger detection at end of tumbles for base spins (Pragmatic
 *    counts scatters across the entire spin including new ones tumbled in).
 *  - In free spins, multipliers persist on grid for the whole spin, then sum
 *    and apply to total spin payout at the end.
 */
export function spin(rng: Rng, cfg: SlotConfig, opts: SpinOptions, mode: SpinMode): SpinResult {
  const { bet, ante } = opts;
  const weights = activeWeights(cfg, mode, ante);
  const frames: Frame[] = [];
  let grid = fillGrid(rng, cfg, weights);
  frames.push({ kind: 'initialDrop', grid: clone(grid) });

  // Track scatters seen during the entire spin (Pragmatic behavior).
  const scattersAtStart = countScatters(grid, cfg);
  let scatterTotal = scattersAtStart;

  // Free spins: keep multiplier symbols sticky on the grid until end of spin.
  // Base: multipliers act as pay-modifying tokens that apply on the chain
  // they landed in (Gates of Olympus base) or sum at end of spin (Sweet Bonanza
  // base) — controlled per-game via cfg flags. We use a hybrid approach
  // matching public behavior: multipliers landed during a chain apply only
  // to *that* chain's payout (base game), and persist into next chain (free).
  let chainIdx = 0;
  let subtotal = 0;
  const freeStickyMultipliers: number[] = [];

  let working: Grid = clone(grid);

  // === Lightning Strike feature ===
  // NOT actually in real Pragmatic Olympus — that game just has random
  // multiplier orbs landing during tumbles. We keep it as a rare "special
  // moment" (~0.8% per base spin = ~1 in 125 spins) so the dramatic Zeus
  // overlay feels earned rather than spammy.
  if (mode === 'base' && rng.next() < 0.008) {
    const strikeCount = 2 + rng.nextInt(5); // 2..6 orbs
    const landings: MultiplierLanding[] = [];
    const used = new Set<string>();
    let attempts = 0;
    const valuesWeights = cfg.multiplierTableBase.values.map(([, w]) => w);
    while (landings.length < strikeCount && attempts < 60) {
      attempts++;
      const c = rng.nextInt(cfg.cols);
      const r = rng.nextInt(cfg.rows);
      const key = `${c}:${r}`;
      if (used.has(key)) continue;
      const cell = working[c]?.[r];
      if (!cell || cell.multiplier !== undefined || cell.symbolId === cfg.scatterId) continue;
      used.add(key);
      const vIdx = rng.weighted(valuesWeights);
      const value = cfg.multiplierTableBase.values[vIdx]![0];
      landings.push({ col: c, row: r, value, key: nextKey() });
    }
    if (landings.length > 0) {
      working = applyMultiplierLandings(working, landings);
      frames.push({ kind: 'lightningStrike', landings, grid: clone(working) });
    }
  }

  // Initial multiplier roll (per-tumble Zeus drops, distinct from the strike).
  {
    const initialLandings = rollMultipliers(working, cfg, rng, mode);
    if (initialLandings.length > 0) {
      working = applyMultiplierLandings(working, initialLandings);
      frames.push({ kind: 'multipliersLanded', landings: initialLandings, grid: clone(working) });
    }
  }

  while (true) {
    const wins = findWins(working, cfg, bet);
    if (wins.length === 0) break;
    const chainPayout = wins.reduce((a, w) => a + w.payout, 0);
    chainIdx++;
    frames.push({
      kind: 'wins',
      grid: clone(working),
      wins,
      tumbleIdx: chainIdx,
      chainPayout,
    });
    // Apply chain-level multipliers (base game only): if multipliers exist on
    // the *current* grid before tumble, they apply to this chain.
    if (mode === 'base') {
      const sum = sumGridMultipliers(working);
      const factor = sum > 0 ? sum : 1;
      subtotal += chainPayout * factor;
    } else {
      // Free spins: track multipliers on grid for end-of-spin application;
      // chains pay 1× for now.
      subtotal += chainPayout;
      const sum = sumGridMultipliers(working);
      if (sum > 0) freeStickyMultipliers.push(sum); // remember snapshot per chain
    }

    // Tumble winners away.
    working = tumbleAfterWins(working, wins, cfg, rng, weights);
    // Roll for new multiplier landings.
    const landings = rollMultipliers(working, cfg, rng, mode);
    if (landings.length > 0) {
      working = applyMultiplierLandings(working, landings);
      frames.push({ kind: 'multipliersLanded', landings, grid: clone(working) });
    }
    frames.push({ kind: 'tumble', grid: clone(working) });
    // Update scatter total with any new scatters tumbled in.
    scatterTotal = Math.max(scatterTotal, countScatters(working, cfg));
  }

  // No more wins. Roll for "drop only" multiplier landings (rare even without
  // a win, mostly free spins) — keeps Olympus' "Zeus throws multipliers" feel.
  if (mode === 'base') {
    const landings = rollMultipliers(working, cfg, rng, mode);
    if (landings.length > 0) {
      working = applyMultiplierLandings(working, landings);
      frames.push({ kind: 'multipliersLanded', landings, grid: clone(working) });
    }
  }

  // Free-spins: apply summed multipliers at end of spin.
  if (mode === 'free') {
    const finalMultSum = sumGridMultipliers(working);
    if (finalMultSum > 0 && subtotal > 0) {
      const before = subtotal;
      subtotal = subtotal * finalMultSum;
      frames.push({
        kind: 'multiplierApplied',
        sumOfMultipliers: finalMultSum,
        preMultiplierPayout: before,
        finalPayout: subtotal,
      });
    }
  }

  // Scatter pay-out (Pragmatic public: 4 → 3×, 5 → 5×, 6+ → 100× in Sweet Bonanza).
  let scatterPay = 0;
  if (mode === 'base') {
    const scatterDef = cfg.symbols.find((s) => s.id === cfg.scatterId);
    if (scatterDef) {
      scatterPay = lookupPay(scatterDef.payout, scatterTotal) * bet;
    }
    if (scatterPay > 0) {
      frames.push({ kind: 'scattersWon', count: scatterTotal, payout: scatterPay });
      subtotal += scatterPay;
    }
  }

  // Trigger free spins?
  let triggeredFree = false;
  let freeAwarded = 0;
  if (mode === 'base' && scatterTotal >= cfg.scatterTriggerCount) {
    triggeredFree = true;
    freeAwarded = cfg.freeSpinsAwardOnTrigger;
    frames.push({ kind: 'freeSpinsAwarded', count: freeAwarded, reason: 'scatter' });
  }

  frames.push({ kind: 'final', spinPayout: subtotal, runningPayout: subtotal });
  return {
    frames,
    totalPayout: subtotal,
    triggeredFreeSpins: triggeredFree,
    freeSpinsAwarded: freeAwarded,
  };
}

/**
 * Run an entire round = one base spin + (if triggered) the full free-spin
 * session including retriggers. Used by the React layer for compact "play
 * the whole round" semantics. Multipliers persist across free spins via a
 * grid kept between calls.
 */
export function playRound(
  rng: Rng,
  cfg: SlotConfig,
  opts: SpinOptions,
  startingMode: SpinMode = 'base',
  initialFreeSpins = 0,
): RoundResult {
  const allFrames: Frame[] = [];
  let total = 0;
  let awarded = 0;

  // Initial spin.
  const first = spin(rng, cfg, opts, startingMode);
  allFrames.push(...first.frames);
  total += first.totalPayout;

  let pendingFree = first.triggeredFreeSpins
    ? first.freeSpinsAwarded
    : startingMode === 'free'
      ? initialFreeSpins
      : 0;

  if (pendingFree > 0) {
    allFrames.push({ kind: 'freeSpinsBegin', total: pendingFree });
    awarded = pendingFree;
    while (pendingFree > 0) {
      const fs = spin(rng, cfg, opts, 'free');
      allFrames.push(...fs.frames);
      total += fs.totalPayout;
      pendingFree--;
      // Retrigger logic: scatters during a free spin add freeSpinsAwardOnRetrigger.
      // We re-derive by walking frames for a `scattersWon`/scatter count signal.
      const scatterFrame = fs.frames.find(
        (f) => f.kind === 'scattersWon',
      ) as Extract<Frame, { kind: 'scattersWon' }> | undefined;
      // In free mode we don't emit scattersWon; retrigger needs to be detected
      // at the engine level. We piggyback on the running count via a small re-scan:
      const ret = countScattersInFrames(fs.frames, cfg);
      if (ret >= cfg.scatterRetriggerCount) {
        const extra = cfg.freeSpinsAwardOnRetrigger;
        pendingFree += extra;
        awarded += extra;
        allFrames.push({ kind: 'freeSpinsAwarded', count: extra, reason: 'retrigger' });
      }
      // mark scatterFrame as referenced for tsc strictness
      void scatterFrame;
    }
    allFrames.push({ kind: 'freeSpinsEnd', totalPayout: total });
  }

  // Apply per-slot max-win cap (× bet). Real Pragmatic slots cap a single
  // round's payout at e.g. Olympus 5,000× / Bonanza 21,100×; without a
  // cap a lucky free-spins chain with stacked multipliers could
  // theoretically pay 100,000×+ which (a) doesn't match the real game's
  // headline number, and (b) could overflow the balance UI on big
  // tabletops. Default cap: 5000× (standard Pragmatic value).
  const cap = (cfg.maxWinMultiplier ?? 5000) * opts.bet;
  if (total > cap) total = cap;

  return { frames: allFrames, totalPayout: total, freeSpinsAwarded: awarded };
}

/** Last-grid scatter count by inspecting frames. */
function countScattersInFrames(frames: Frame[], cfg: SlotConfig): number {
  // Find the most recent grid frame.
  let lastGrid: Grid | undefined;
  for (let i = frames.length - 1; i >= 0; i--) {
    const f = frames[i]!;
    if ('grid' in f) {
      lastGrid = f.grid;
      break;
    }
  }
  if (!lastGrid) return 0;
  return countScatters(lastGrid, cfg);
}

/** Helper: kick off a buy-bonus round (skip base, enter free spins directly). */
export function buyBonusRound(rng: Rng, cfg: SlotConfig, opts: SpinOptions): RoundResult {
  // Buy bonus enters free spins with the standard award count.
  const allFrames: Frame[] = [];
  let total = 0;
  const fs = cfg.freeSpinsAwardOnTrigger;
  allFrames.push({ kind: 'freeSpinsAwarded', count: fs, reason: 'buy' });
  allFrames.push({ kind: 'freeSpinsBegin', total: fs });
  let pending = fs;
  let awarded = fs;
  while (pending > 0) {
    const r = spin(rng, cfg, opts, 'free');
    allFrames.push(...r.frames);
    total += r.totalPayout;
    pending--;
    const ret = countScattersInFrames(r.frames, cfg);
    if (ret >= cfg.scatterRetriggerCount) {
      const extra = cfg.freeSpinsAwardOnRetrigger;
      pending += extra;
      awarded += extra;
      allFrames.push({ kind: 'freeSpinsAwarded', count: extra, reason: 'retrigger' });
    }
  }
  allFrames.push({ kind: 'freeSpinsEnd', totalPayout: total });
  // Same per-slot max-win cap as playRound (see comment there).
  const cap = (cfg.maxWinMultiplier ?? 5000) * opts.bet;
  if (total > cap) total = cap;
  return { frames: allFrames, totalPayout: total, freeSpinsAwarded: awarded };
}
