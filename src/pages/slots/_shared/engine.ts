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
 * Implements the public feature structure of Sweet Bonanza and Gates of
 * Olympus using local probabilities. Provider math and RTP are not certified.
 *
 * The engine is fully deterministic given a `Rng`. The render layer plays
 * `result.frames` in sequence with animation timing of its choosing.
 */

const keyCounters = new WeakMap<Rng, number>();
const nextKey = (rng: Rng) => {
  const count = (keyCounters.get(rng) ?? 0) + 1;
  keyCounters.set(rng, count);
  return `c${count}`;
};

export type SpinOptions = {
  /** Base bet used by the paytable; ante and purchase costs are charged separately. */
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

function newCell(rng: Rng, symbolId: string, multiplier?: number): Cell {
  return { symbolId, multiplier, key: nextKey(rng) };
}

function fillGrid(rng: Rng, cfg: SlotConfig, weights: number[]): Grid {
  const grid: Grid = [];
  for (let c = 0; c < cfg.cols; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < cfg.rows; r++) {
      const idx = pickSymbol(rng, weights);
      col.push(newCell(rng, cfg.symbols[idx]!.id));
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
function findWins(grid: Grid, cfg: SlotConfig, bet: number, mode: SpinMode): WinGroup[] {
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
    const scale = mode === 'base' ? (cfg.payoutScaleBase ?? 1) : (cfg.payoutScaleFree ?? 1);
    const payMultiplier = lookupPay(sym.payout, pos.length) * scale;
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
  let threshold = -1;
  for (const k of Object.keys(table)) {
    const n = parseInt(k, 10);
    if (n <= count && n > threshold) { threshold = n; best = table[n]!; }
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
      fresh.push(newCell(rng, cfg.symbols[idx]!.id));
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
  eligibleKeys?: ReadonlySet<string>,
): MultiplierLanding[] {
  if (mode === 'base' && cfg.multiplierBaseMode === 'disabled') return [];
  const table = mode === 'base' ? cfg.multiplierTableBase : cfg.multiplierTableFree;
  // Probability gate: this is per-tumble.
  if (rng.next() >= table.pPerTumble) return [];
  // How many multipliers? Heavily weighted toward 1.
  const countRoll = rng.next();
  const count = Math.min(table.maxPerTumble, countRoll < 0.85 ? 1 : countRoll < 0.97 ? 2 : 3);
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
    if (!cell || cell.multiplier !== undefined || cell.symbolId === cfg.scatterId || (eligibleKeys && !eligibleKeys.has(cell.key))) continue;
    used.add(key);
    const vIdx = rng.weighted(valuesWeights);
    const value = table.values[vIdx]![0];
    landings.push({ col: c, row: r, value, key: nextKey(rng) });
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
export function spin(rng: Rng, cfg: SlotConfig, opts: SpinOptions, mode: SpinMode, payoutLimit = (cfg.maxWinMultiplier ?? 5000) * opts.bet, carriedMultiplier = 0, guaranteedScatters = 0): SpinResult {
  const { bet, ante } = opts;
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive and finite');
  const cap = Math.max(0, payoutLimit);
  const weights = activeWeights(cfg, mode, ante);
  const frames: Frame[] = [];
  let grid = fillGrid(rng, cfg, weights);

  if (guaranteedScatters > 0) {
    if (mode !== 'base' || !Number.isInteger(guaranteedScatters) || guaranteedScatters > cfg.cols * cfg.rows) throw new RangeError('Invalid purchased scatter entry');
    const ordinary = cfg.symbols.map((symbol, index) => symbol.id === cfg.scatterId ? 0 : weights[index]!);
    if (!ordinary.some((weight) => weight > 0)) throw new RangeError('Purchased entry requires ordinary symbols');
    grid = grid.map((column) => column.map((cell) => cell.symbolId === cfg.scatterId ? newCell(rng, cfg.symbols[rng.weighted(ordinary)]!.id) : cell));
    const positions = Array.from({ length: cfg.cols * cfg.rows }, (_, index) => index);
    for (let index = 0; index < guaranteedScatters; index++) {
      const choice = index + rng.nextInt(positions.length - index);
      [positions[index], positions[choice]] = [positions[choice]!, positions[index]!];
      const position = positions[index]!;
      grid[Math.floor(position / cfg.rows)]![position % cfg.rows] = newCell(rng, cfg.scatterId);
    }
  }

  // Track scatters seen during the entire spin (Pragmatic behavior).
  const scattersAtStart = countScatters(grid, cfg);
  let scatterTotal = scattersAtStart;

  // Multiplier tokens survive the complete tumble sequence. In Gates free
  // spins, winning tokens additionally accumulate across the whole feature.
  let chainIdx = 0;
  let subtotal = 0;
  let working: Grid = clone(grid);

  // Initial multiplier roll (per-tumble Zeus drops, distinct from the strike).
  {
    const initialLandings = rollMultipliers(working, cfg, rng, mode);
    if (initialLandings.length > 0) {
      working = applyMultiplierLandings(working, initialLandings);
    }
    frames.push({ kind: 'initialDrop', grid: clone(working) });
    if (initialLandings.length > 0) frames.push({ kind: 'multipliersLanded', landings: initialLandings, grid: clone(working) });
  }

  while (subtotal < cap) {
    if (chainIdx >= 1000) throw new Error('Tumble safety limit exceeded');
    const wins = findWins(working, cfg, bet, mode);
    if (wins.length === 0) break;
    const chainPayout = Math.min(wins.reduce((a, w) => a + w.payout, 0), cap - subtotal);
    chainIdx++;
    frames.push({
      kind: 'wins',
      grid: clone(working),
      wins,
      tumbleIdx: chainIdx,
      chainPayout,
    });
    subtotal += chainPayout;

    if (subtotal >= cap) break;

    // Tumble winners away.
    const survivorKeys = new Set(working.flat().map((cell) => cell.key));
    working = tumbleAfterWins(working, wins, cfg, rng, weights);
    const incomingKeys = new Set(working.flat().filter((cell) => !survivorKeys.has(cell.key)).map((cell) => cell.key));
    // Decide every incoming cell before its landing animation starts.
    const landings = rollMultipliers(working, cfg, rng, mode, incomingKeys);
    if (landings.length > 0) {
      working = applyMultiplierLandings(working, landings);
    }
    frames.push({ kind: 'tumble', grid: clone(working) });
    if (landings.length > 0) frames.push({ kind: 'multipliersLanded', landings, grid: clone(working) });
    // Update scatter total with any new scatters tumbled in.
    scatterTotal = Math.max(scatterTotal, countScatters(working, cfg));
  }

  // Both base and free sequences apply their final visible multiplier sum
  // once, to the whole sequence. A carried Gates multiplier activates only
  // when a NEW multiplier lands on a winning free spin.
  let featureMultiplier = carriedMultiplier;
  const finalMultSum = sumGridMultipliers(working);
  if (finalMultSum > 0 && subtotal > 0) {
    if (mode === 'free' && cfg.multiplierFreeMode === 'accumulate-on-win') featureMultiplier += finalMultSum;
    const applied = mode === 'free' && cfg.multiplierFreeMode === 'accumulate-on-win' ? featureMultiplier : finalMultSum;
    const before = subtotal;
    subtotal = Math.min(cap, subtotal * applied);
    frames.push({ kind: 'multiplierApplied', sumOfMultipliers: applied, preMultiplierPayout: before, finalPayout: subtotal });
  }

  // Scatter pay-out (Pragmatic public: 4 → 3×, 5 → 5×, 6+ → 100× in Sweet Bonanza).
  let scatterPay = 0;
  {
    const scatterDef = cfg.symbols.find((s) => s.id === cfg.scatterId);
    if (scatterDef) {
      scatterPay = lookupPay(scatterDef.payout, scatterTotal) * bet;
    }
    if (scatterPay > 0) {
      scatterPay = Math.min(scatterPay, Math.max(0, cap - subtotal));
      frames.push({ kind: 'scattersWon', count: scatterTotal, payout: scatterPay });
      subtotal += scatterPay;
    }
  }

  // Trigger free spins?
  let triggeredFree = false;
  let freeAwarded = 0;
  if (mode === 'base' && subtotal < cap && scatterTotal >= cfg.scatterTriggerCount) {
    triggeredFree = true;
    freeAwarded = cfg.freeSpinsAwardOnTrigger;
    frames.push({ kind: 'freeSpinsAwarded', count: freeAwarded, reason: 'scatter' });
  }

  subtotal = +Math.min(cap, subtotal).toFixed(2);
  frames.push({ kind: 'final', spinPayout: subtotal, runningPayout: subtotal });
  return {
    frames,
    totalPayout: subtotal,
    triggeredFreeSpins: triggeredFree,
    featureMultiplier,
    freeSpinsAwarded: freeAwarded,
  };
}

/**
 * A deterministic base spin and its entire feature share one RNG and one cap.
 * Every final frame contains the credited, cumulative total, including rounding.
 */
export function playRound(
  rng: Rng,
  cfg: SlotConfig,
  opts: SpinOptions,
  startingMode: SpinMode = 'base',
  initialFreeSpins = 0,
): RoundResult {
  return runRound(rng, cfg, opts, startingMode === 'free' ? Math.max(1, initialFreeSpins) : 0, false);
}

function runRound(rng: Rng, cfg: SlotConfig, opts: SpinOptions, initialFreeSpins: number, bought: boolean): RoundResult {
  if (!Number.isFinite(opts.bet) || opts.bet <= 0) throw new RangeError('Bet must be positive and finite');
  const cap = +((cfg.maxWinMultiplier ?? 5000) * opts.bet).toFixed(2);
  const frames: Frame[] = [];
  let total = 0;
  let awarded = initialFreeSpins;
  let pending = initialFreeSpins;
  let carriedMultiplier = 0;
  const appendSpin = (result: SpinResult) => {
    total = +Math.min(cap, total + result.totalPayout).toFixed(2);
    frames.push(...result.frames.map((frame): Frame => frame.kind === 'final' ? { ...frame, runningPayout: total } : frame));
  };
  if (bought && cfg.buyTriggerScatters) {
    const entry = spin(rng, cfg, { ...opts, ante: false }, 'base', cap, 0, cfg.buyTriggerScatters);
    entry.frames = entry.frames.map((frame) => frame.kind === 'freeSpinsAwarded' ? { ...frame, reason: 'buy' } : frame);
    appendSpin(entry);
    pending = entry.freeSpinsAwarded;
    awarded = pending;
  } else if (initialFreeSpins === 0) {
    const first = spin(rng, cfg, opts, 'base', cap);
    appendSpin(first);
    pending = first.freeSpinsAwarded;
    awarded = pending;
  } else if (bought) {
    frames.push({ kind: 'freeSpinsAwarded', count: pending, reason: 'buy' });
  }
  if (pending > 0 && total < cap) {
    frames.push({ kind: 'freeSpinsBegin', total: pending });
    let completed = 0;
    while (pending > 0 && total < cap) {
      if (++completed > 1000) throw new Error('Free-spin safety limit exceeded');
      const result = spin(rng, cfg, opts, 'free', cap - total, carriedMultiplier);
      carriedMultiplier = result.featureMultiplier ?? carriedMultiplier;
      appendSpin(result);
      pending--;
      if (total < cap && countScattersInFrames(result.frames, cfg) >= cfg.scatterRetriggerCount) {
        pending += cfg.freeSpinsAwardOnRetrigger;
        awarded += cfg.freeSpinsAwardOnRetrigger;
        frames.push({ kind: 'freeSpinsAwarded', count: cfg.freeSpinsAwardOnRetrigger, reason: 'retrigger' });
      }
    }
    frames.push({ kind: 'freeSpinsEnd', totalPayout: total });
  }
  return { frames, totalPayout: total, freeSpinsAwarded: awarded };
}

function countScattersInFrames(frames: Frame[], cfg: SlotConfig): number {
  for (let i = frames.length - 1; i >= 0; i--) {
    const frame = frames[i]!;
    if ('grid' in frame) return countScatters(frame.grid, cfg);
  }
  return 0;
}

export function buyBonusRound(rng: Rng, cfg: SlotConfig, opts: SpinOptions): RoundResult {
  if (opts.ante) throw new RangeError('Disable ante before buying free spins');
  return runRound(rng, cfg, opts, cfg.freeSpinsAwardOnTrigger, true);
}
