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
  wins: LineWin[];
  winningPositions: number[];
  scatterCount: number;
  freeSpinsAwarded: number;
  featureName?: string;
  moneyValues: number[];
  multiplier: number;
  payout: number;
  events: GameEvent[];
};

export function makePaylines(cols: number, rows: number, count: number): number[][] {
  const lines: number[][] = [];
  for (let row = 0; row < rows && lines.length < count; row++) lines.push(new Array(cols).fill(row));
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

function generateGrid(rng: Rng, profile: LineSlotProfile, free: boolean, wantedBonus: WantedBonus): string[] {
  const weights = profile.symbols.map((entry) => free ? (entry.freeWeight ?? entry.weight) : entry.weight);
  if (profile.feature === 'wanted' && free && wantedBonus === 'duel-at-dawn') {
    const vsIndex = profile.symbols.findIndex((entry) => entry.id === 'vs');
    if (vsIndex >= 0) weights[vsIndex] = weights[vsIndex]! * 4;
  }
  const grid = Array.from({ length: profile.cols * profile.rows }, () => profile.symbols[rng.weighted(weights)]!.id);

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
  return grid;
}

function evaluate(profile: LineSlotProfile, grid: readonly string[], bet: number): LineWin[] {
  const lineBet = bet / profile.paylines.length;
  const wins: LineWin[] = [];
  profile.paylines.forEach((rows, line) => {
    const positions = rows.map((row, reel) => indexAt(profile, reel, row));
    const ids = positions.map((position) => grid[position]!);
    const payingId = ids.find((id) => !symbol(profile, id)?.wild);
    if (!payingId || symbol(profile, payingId)?.scatter || symbol(profile, payingId)?.money) return;
    let length = 0;
    for (const id of ids) {
      if (id === payingId || symbol(profile, id)?.wild) length++;
      else break;
    }
    if (length < 3) return;
    const multiplier = symbol(profile, payingId)?.pay?.[length as 3 | 4 | 5] ?? 0;
    if (multiplier <= 0) return;
    wins.push({ line, symbolId: payingId, length, positions: positions.slice(0, length), multiplier, payout: lineBet * multiplier });
  });
  return wins;
}

function applyWolfMoneyRespin(rng: Rng, profile: LineSlotProfile, grid: string[], moneyValues: number[]): { featurePayout: number; triggered: boolean } {
  const moneyId = profile.symbols.find((entry) => entry.money)?.id;
  if (!moneyId || grid.filter((id) => id === moneyId).length < 6) return { featurePayout: 0, triggered: false };
  const held = new Set(grid.map((id, index) => id === moneyId ? index : -1).filter((index) => index >= 0));
  let respins = 3;
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
  }
  const featurePayout = moneyValues.reduce((sum, value) => sum + value, 0);
  return { featurePayout: held.size === grid.length ? Math.max(1000, featurePayout) : featurePayout, triggered: true };
}

export function spinLineSlot(
  rng: Rng,
  profile: LineSlotProfile,
  bet: number,
  mode: 'base' | 'free' = 'base',
  wantedBonus: WantedBonus = 'duel-at-dawn',
): LineSpinResult {
  const grid = generateGrid(rng, profile, mode === 'free', wantedBonus);
  const moneyValues = grid.map((id) => symbol(profile, id)?.money ? [1, 2, 3, 5, 10, 20][rng.weighted([30, 22, 15, 8, 3, 1])]! : 0);
  const wins = evaluate(profile, grid, bet);
  const scatterCount = profile.scatterId ? grid.filter((id) => id === profile.scatterId).length : 0;
  const wolfFeature = profile.feature === 'wolf' ? applyWolfMoneyRespin(rng, profile, grid, moneyValues) : { featurePayout: 0, triggered: false };
  const deadManMultiplier = profile.feature === 'wanted' && mode === 'free' && wantedBonus === 'dead-mans-hand' && wins.length ? 1 + rng.nextInt(10) : 1;
  const linePayout = wins.reduce((sum, win) => sum + win.payout, 0) * deadManMultiplier;
  const scatterPayout = scatterCount >= 3 ? bet * ({ 3: 2, 4: 10, 5: 50 }[Math.min(5, scatterCount) as 3 | 4 | 5] ?? 0) : 0;
  const rawPayout = linePayout + scatterPayout + wolfFeature.featurePayout * bet;
  const payout = +Math.min(rawPayout, bet * profile.maxWin).toFixed(2);
  const featureName = wolfFeature.triggered ? 'Money Respin' : profile.feature === 'wanted' && grid.includes(profile.wildId ?? 'wild') ? 'DuelReels' : undefined;
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
    wins,
    winningPositions: [...new Set(wins.flatMap((win) => win.positions))],
    scatterCount,
    freeSpinsAwarded: scatterCount >= 3 ? profile.freeSpins : 0,
    featureName,
    moneyValues,
    multiplier: bet > 0 ? +(payout / bet).toFixed(2) : 0,
    payout,
    events,
  };
}
