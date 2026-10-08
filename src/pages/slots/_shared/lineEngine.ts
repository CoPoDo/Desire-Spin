import type { Rng } from '../../../lib/fairness';
import type { GameEvent } from '../../../games/contracts';

export type LineSymbol = {
  id: string;
  weight: number;
  freeWeight?: number;
  pay?: Partial<Record<3 | 4 | 5, number>>;
  scatter?: boolean;
  wild?: boolean;
  money?: boolean;
};

export type LineFeature = 'classic' | 'wanted' | 'wolf';
export type WantedBonus = 'train-robbery' | 'duel-at-dawn' | 'dead-mans-hand';

export type LineSlotProfile = {
  id: string;
  cols: number;
  rows: number;
  paylines: readonly (readonly number[])[];
  symbols: readonly LineSymbol[];
  scatterId?: string;
  wildId?: string;
  maxWin: number;
  feature: LineFeature;
  freeSpins: number;
};

export type LineWin = { line: number; symbolId: string; length: number; positions: number[]; multiplier: number; payout: number };
export type LineSpinResult = {
  grid: string[];
  initialGrid: string[];
  featurePositions: number[];
  wins: LineWin[];
  winningPositions: number[];
  scatterCount: number;
  freeSpinsAwarded: number;
  featureName?: string;
  moneyValues: number[];
  multiplier: number;
  payout: number;
  events: GameEvent[];
  respinFrames: { grid: string[]; moneyValues: number[]; remaining: number }[];
};

export function makePaylines(cols: number, rows: number, count: number): number[][] {
  if (![cols, rows, count].every((value) => Number.isSafeInteger(value) && value > 0) || count > rows ** cols) throw new RangeError('Invalid payline dimensions or count');
  const lines: number[][] = [];
  for (let row = 0; row < rows && lines.length < count; row++) lines.push(new Array(cols).fill(row));
  // Prefer balanced, readable paths over lexicographic variants concentrated
  // on the top row. These are explicit local paylines, not provider strips.
  const patterns = [
    Array.from({ length: cols }, (_, col) => Math.round(col * (rows - 1) / (cols - 1))),
    Array.from({ length: cols }, (_, col) => Math.round(Math.abs(col - (cols - 1) / 2) * (rows - 1) / ((cols - 1) / 2))),
    Array.from({ length: cols }, (_, col) => col % 2 ? rows - 1 : 0),
  ];
  const add = (line: number[]) => {
    if (lines.length < count && !lines.some((existing) => existing.join(',') === line.join(','))) lines.push(line);
  };
  for (const pattern of patterns) {
    add(pattern);
    add(pattern.map((row) => rows - 1 - row));
  }
  const maximumUnique = rows ** cols;
  for (let variant = 0; lines.length < count && variant < maximumUnique; variant++) {
    let encoded = variant;
    const line = Array.from({ length: cols }, () => {
      const row = encoded % rows;
      encoded = Math.floor(encoded / rows);
      return row;
    });
    if (!lines.some((existing) => existing.join(',') === line.join(','))) lines.push(line);
  }
  if (lines.length < count) throw new Error(`Cannot create ${count} unique paylines for ${cols}x${rows}`);
  return lines;
}

function indexAt(profile: LineSlotProfile, reel: number, row: number): number {
  return row * profile.cols + reel;
}

function symbol(profile: LineSlotProfile, id: string): LineSymbol | undefined {
  return profile.symbols.find((entry) => entry.id === id);
}

function generateGrid(rng: Rng, profile: LineSlotProfile, free: boolean, wantedBonus: WantedBonus): { grid: string[]; initialGrid: string[] } {
  const weights = profile.symbols.map((entry) => free ? (entry.freeWeight ?? entry.weight) : entry.weight);
  if (profile.feature === 'wanted' && free && wantedBonus === 'duel-at-dawn') {
    const vsIndex = profile.symbols.findIndex((entry) => entry.id === 'vs');
    if (vsIndex >= 0) weights[vsIndex] = weights[vsIndex]! * 4;
  }
  const grid = Array.from({ length: profile.cols * profile.rows }, () => profile.symbols[rng.weighted(weights)]!.id);
  const initialGrid = [...grid];

  if (profile.feature === 'wanted') {
    const vsReels = new Set<number>();
    grid.forEach((id, position) => { if (id === 'vs') vsReels.add(position % profile.cols); });
    vsReels.forEach((reel) => {
      for (let row = 0; row < profile.rows; row++) grid[indexAt(profile, reel, row)] = profile.wildId ?? 'wild';
    });
    if (free && wantedBonus === 'train-robbery') {
      const reel = 1 + rng.nextInt(Math.max(1, profile.cols - 2));
      for (let row = 0; row < profile.rows; row++) grid[indexAt(profile, reel, row)] = profile.wildId ?? 'wild';
    }
  }

  if (profile.feature === 'wolf' && free) {
    const candidates = profile.symbols.filter((entry) => entry.pay && !entry.wild && !entry.scatter && !entry.money);
    const expanding = candidates[rng.nextInt(candidates.length)]?.id;
    if (expanding) {
      for (let reel = 1; reel <= Math.min(3, profile.cols - 1); reel++) {
        if (rng.next() < 0.28) for (let row = 0; row < profile.rows; row++) grid[indexAt(profile, reel, row)] = expanding;
      }
    }
  }
  return { grid, initialGrid };
}

/** Pay the best eligible substitution once per line, including all-Wild runs. */
export function evaluateLineWins(profile: LineSlotProfile, grid: readonly string[], bet: number): LineWin[] {
  const lineBet = bet / profile.paylines.length;
  const wins: LineWin[] = [];
  profile.paylines.forEach((rows, line) => {
    const positions = rows.map((row, reel) => indexAt(profile, reel, row));
    const ids = positions.map((position) => grid[position]!);
    let best: LineWin | undefined;
    for (const candidate of profile.symbols) {
      if (!candidate.pay || candidate.scatter || candidate.money) continue;
      let length = 0;
      for (const id of ids) {
        if (id === candidate.id || (!candidate.wild && symbol(profile, id)?.wild)) length++;
        else break;
      }
      // Some local profiles do not give Wild a separate paytable. In that
      // case a Wild-only prefix substitutes for the best regular symbol.
      for (let paidLength = Math.min(length, 5); paidLength >= 3; paidLength--) {
        const multiplier = candidate.pay[paidLength as 3 | 4 | 5] ?? 0;
        const payout = lineBet * multiplier;
        if (payout > (best?.payout ?? 0)) best = { line, symbolId: candidate.id, length: paidLength, positions: positions.slice(0, paidLength), multiplier, payout };
      }
    }
    if (best) wins.push(best);
  });
  return wins;
}

function applyWolfMoneyRespin(rng: Rng, profile: LineSlotProfile, grid: string[], moneyValues: number[]): { featurePayout: number; triggered: boolean; frames: LineSpinResult['respinFrames'] } {
  const moneyId = profile.symbols.find((entry) => entry.money)?.id;
  if (!moneyId || grid.filter((id) => id === moneyId).length < 6) return { featurePayout: 0, triggered: false, frames: [] };
  const held = new Set(grid.map((id, index) => id === moneyId ? index : -1).filter((index) => index >= 0));
  let respins = 3;
  const frames: LineSpinResult['respinFrames'] = [{ grid: [...grid], moneyValues: [...moneyValues], remaining: respins }];
  while (respins > 0 && held.size < grid.length) {
    let landed = false;
    for (let index = 0; index < grid.length; index++) {
      if (held.has(index)) continue;
      if (rng.next() < 0.09) {
        held.add(index);
        grid[index] = moneyId;
        moneyValues[index] = [1, 2, 3, 5, 10, 15, 20, 50, 100][rng.weighted([30, 24, 16, 12, 8, 5, 3, 1.5, 0.4])]!;
        landed = true;
      }
    }
    respins = landed ? 3 : respins - 1;
    frames.push({ grid: [...grid], moneyValues: [...moneyValues], remaining: respins });
  }
  const featurePayout = moneyValues.reduce((sum, value) => sum + value, 0);
  return { featurePayout: held.size === grid.length ? Math.max(1000, featurePayout) : featurePayout, triggered: true, frames };
}

export function spinLineSlot(
  rng: Rng,
  profile: LineSlotProfile,
  bet: number,
  mode: 'base' | 'free' = 'base',
  wantedBonus: WantedBonus = 'duel-at-dawn',
): LineSpinResult {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive and finite');
  const { grid, initialGrid } = generateGrid(rng, profile, mode === 'free', wantedBonus);
  const featurePositions = grid.map((id, index) => id !== initialGrid[index] ? index : -1).filter((index) => index >= 0);
  const moneyValues = grid.map((id) => symbol(profile, id)?.money ? [1, 2, 3, 5, 10, 20][rng.weighted([30, 22, 15, 8, 3, 1])]! : 0);
  const wins = evaluateLineWins(profile, grid, bet);
  const scatterCount = profile.scatterId ? grid.filter((id) => id === profile.scatterId).length : 0;
  const wolfFeature = profile.feature === 'wolf' ? applyWolfMoneyRespin(rng, profile, [...grid], [...moneyValues]) : { featurePayout: 0, triggered: false, frames: [] };
  const deadManMultiplier = profile.feature === 'wanted' && mode === 'free' && wantedBonus === 'dead-mans-hand' && wins.length ? 1 + rng.nextInt(10) : 1;
  const linePayout = wins.reduce((sum, win) => sum + win.payout, 0) * deadManMultiplier;
  const scatterPayout = scatterCount >= 3 ? bet * ({ 3: 2, 4: 10, 5: 50 }[Math.min(5, scatterCount) as 3 | 4 | 5] ?? 0) : 0;
  const rawPayout = linePayout + scatterPayout + wolfFeature.featurePayout * bet;
  const payout = +Math.min(rawPayout, bet * profile.maxWin).toFixed(2);
  const featureName = wolfFeature.triggered ? 'Money Respin' : profile.feature === 'wanted' && featurePositions.length > 0 ? 'DuelReels' : profile.feature === 'wolf' && featurePositions.length > 0 ? 'Expanding symbol' : undefined;
  const events: GameEvent[] = [
    { type: 'roundStarted', at: 0, wager: bet },
    { type: 'reelsStarted', at: 0, reels: profile.cols },
    ...Array.from({ length: profile.cols }, (_, reel) => ({ type: 'reelStopped' as const, at: 500 + reel * 180, reel })),
  ];
  if (featureName) events.push({ type: 'featureTriggered', at: 500 + profile.cols * 180, feature: featureName });
  events.push({ type: 'winEvaluated', at: 700 + profile.cols * 180, amount: payout, multiplier: bet > 0 ? payout / bet : 0 });
  events.push({ type: 'payoutCommitted', at: 900 + profile.cols * 180, amount: payout });
  events.push({ type: 'roundEnded', at: 900 + profile.cols * 180, payout });
  return {
    grid,
    initialGrid,
    featurePositions,
    wins,
    winningPositions: [...new Set(wins.flatMap((win) => win.positions))],
    scatterCount,
    freeSpinsAwarded: scatterCount >= 3 ? profile.freeSpins : 0,
    featureName,
    moneyValues,
    multiplier: bet > 0 ? +(payout / bet).toFixed(2) : 0,
    payout,
    events,
    respinFrames: wolfFeature.frames,
  };
}

export type LineRoundResult = {
  spins: { result: LineSpinResult; free: boolean; remaining: number }[];
  totalPayout: number;
  freeSpinsAwarded: number;
  capped: boolean;
};

/** One seed and one debit cover the complete base + free-spin cycle. */
export function playLineRound(rng: Rng, profile: LineSlotProfile, bet: number, wantedBonus: WantedBonus = 'duel-at-dawn'): LineRoundResult {
  const spins: LineRoundResult['spins'] = [];
  const cap = +(bet * profile.maxWin).toFixed(2);
  let totalPayout = 0;
  let remaining = 0;
  let freeSpinsAwarded = 0;
  do {
    if (spins.length >= 1000) throw new Error('Free-spin safety limit exceeded');
    const free = spins.length > 0;
    const result = spinLineSlot(rng, profile, bet, free ? 'free' : 'base', wantedBonus);
    result.payout = +Math.min(result.payout, Math.max(0, cap - totalPayout)).toFixed(2);
    result.multiplier = result.payout / bet;
    result.events = result.events.map((event) => {
      if (event.type === 'winEvaluated') return { ...event, amount: result.payout, multiplier: result.multiplier };
      if (event.type === 'payoutCommitted') return { ...event, amount: result.payout };
      if (event.type === 'roundEnded') return { ...event, payout: result.payout };
      return event;
    });
    totalPayout = +(totalPayout + result.payout).toFixed(2);
    spins.push({ result, free, remaining });
    remaining = Math.max(0, remaining - (free ? 1 : 0)) + result.freeSpinsAwarded;
    freeSpinsAwarded += result.freeSpinsAwarded;
  } while (remaining > 0 && totalPayout < cap);
  return { spins, totalPayout, freeSpinsAwarded, capped: totalPayout >= cap };
}
