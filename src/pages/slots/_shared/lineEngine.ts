import type { Rng } from '../../../lib/fairness';
import type { GameEvent } from '../../../games/contracts';

export type LineSymbol = {
  id: string;
  weight: number;
  freeWeight?: number;
  /** Fixed local per-feature frequencies; not provider reel/PAR data. */
  bonusWeights?: Partial<Record<WantedBonus, number>>;
  pay?: Partial<Record<2 | 3 | 4 | 5, number>>;
  /** Optional numbered-line awards; used by the classic Pharaoh coin variant. */
  payByLine?: readonly Partial<Record<2 | 3 | 4 | 5, number>>[];
  scatter?: boolean;
  wild?: boolean;
  money?: boolean;
  /** Wanted has three distinct bonus scatters, never a selected base mode. */
  bonus?: WantedBonus;
};

export type LineFeature = 'classic' | 'wanted' | 'wolf';
export type WantedBonus = 'train-robbery' | 'duel-at-dawn' | 'dead-mans-hand';
export const WANTED_BONUSES = [
  { id: 'train-robbery', label: 'The Great Train Robbery', costMultiplier: 80, freeSpins: 10, description: '10 free spins. Every Wild stays locked for the feature.' },
  { id: 'duel-at-dawn', label: 'Duel at Dawn', costMultiplier: 200, freeSpins: 10, description: '10 free spins with more VS symbols and additive DuelReel multipliers.' },
  { id: 'dead-mans-hand', label: 'Dead Man’s Hand', costMultiplier: 400, freeSpins: 3, description: 'Collect Wilds and multipliers, then play 3 Showdown spins.' },
] as const;
export const WANTED_DUEL_MULTIPLIERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 25, 50, 100] as const;
export const WOLF_JACKPOTS = { mini: 30, major: 100, mega: 1000 } as const;
export type WolfJackpotAward = { tier: keyof typeof WOLF_JACKPOTS; multiplier: number };
export type WantedState = {
  bonus: WantedBonus;
  phase: 'free-spins' | 'collect' | 'showdown';
  stickyWilds: number[];
  collectedWilds: number;
  collectedMultiplier: number;
  respinsRemaining?: number;
};

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
  retriggerSpins?: number;
  /** Local Dead Man collection frequencies, independent of wallet/history. */
  wantedCollect?: { wildProbability: number; multiplierProbability: number };
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
  triggeredBonus?: WantedBonus;
  reelMultipliers?: number[];
  wantedState?: WantedState;
  moneyValues: number[];
  jackpotAwards?: WolfJackpotAward[];
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
  const weights = profile.symbols.map((entry) => {
    if (profile.feature === 'wanted' && free) {
      if (entry.scatter || entry.bonus) return 0;
      if (entry.id === 'vs') return wantedBonus === 'duel-at-dawn' ? (entry.bonusWeights?.[wantedBonus] ?? (entry.freeWeight ?? entry.weight) * 4) : 0;
      return entry.bonusWeights?.[wantedBonus] ?? entry.freeWeight ?? entry.weight;
    }
    return free ? (entry.freeWeight ?? entry.weight) : entry.weight;
  });
  const scatterReels = new Set<number>();
  const grid = Array.from({ length: profile.cols * profile.rows }, (_, position) => {
    const reel = position % profile.cols;
    const eligible = profile.feature === 'wolf' ? weights.map((weight, index) => profile.symbols[index]?.scatter && (reel % 2 !== 0 || scatterReels.has(reel)) ? 0 : weight) : weights;
    // Guard unusual fixture profiles with no eligible ordinary symbols.
    const picked = profile.symbols[rng.weighted(eligible.some((weight) => weight > 0) ? eligible : weights)]!.id;
    if (symbol(profile, picked)?.scatter) scatterReels.add(reel);
    return picked;
  });
  const initialGrid = [...grid];
  if (profile.feature === 'wolf' && free) {
    // The middle three reels combine into one 3x3 giant symbol on every
    // free spin. Choosing its value uses a disclosed local distribution.
    const candidates = profile.symbols;
    const giant = candidates[rng.weighted(candidates.map((entry) => entry.freeWeight ?? entry.weight))]?.id;
    if (giant) for (let reel = 1; reel <= Math.min(3, profile.cols - 1); reel++) {
      for (let row = 0; row < profile.rows; row++) grid[indexAt(profile, reel, row)] = giant;
    }
  }
  return { grid, initialGrid };
}

/** Distinct bonus symbols trigger independently. Local simultaneous triggers
 * use the highest-tier feature; provider reel correlations are not public. */
export function detectWantedBonus(profile: LineSlotProfile, grid: readonly string[]): WantedBonus | undefined {
  for (const bonus of ['dead-mans-hand', 'duel-at-dawn', 'train-robbery'] as const) {
    if (grid.filter((id) => symbol(profile, id)?.bonus === bonus).length >= 3) return bonus;
  }
  return undefined;
}

/** Expand only VS reels that participate in a win after candidate expansion. */
export function resolveWantedDuels(rng: Rng, profile: LineSlotProfile, input: readonly string[], bet: number) {
  const grid = [...input];
  const candidates = new Set<number>();
  input.forEach((id, position) => { if (id === 'vs') candidates.add(position % profile.cols); });
  const expanded = [...grid];
  candidates.forEach((reel) => { for (let row = 0; row < profile.rows; row++) expanded[indexAt(profile, reel, row)] = profile.wildId ?? 'wild'; });
  const eligible = new Set(evaluateLineWins(profile, expanded, bet).flatMap((win) => win.positions.map((position) => position % profile.cols)));
  const reelMultipliers = new Array<number>(profile.cols).fill(0);
  candidates.forEach((reel) => {
    if (!eligible.has(reel)) return;
    // Public multiplier values; selection weights are local, not provider PAR.
    reelMultipliers[reel] = WANTED_DUEL_MULTIPLIERS[rng.weighted([28, 22, 16, 12, 9, 7, 5, 4, 3, 1.5, 1, .4, .1])]!;
    for (let row = 0; row < profile.rows; row++) grid[indexAt(profile, reel, row)] = profile.wildId ?? 'wild';
  });
  return { grid, reelMultipliers };
}

/** Pay the best eligible substitution once per line, including all-Wild runs. */
export function evaluateLineWins(profile: LineSlotProfile, grid: readonly string[], bet: number, reelMultipliers: readonly number[] = []): LineWin[] {
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
      for (let paidLength = Math.min(length, 5); paidLength >= 2; paidLength--) {
        const paytable = candidate.payByLine?.[line] ?? candidate.pay;
        const multiplier = paytable[paidLength as 2 | 3 | 4 | 5] ?? 0;
        const reelFactor = positions.slice(0, paidLength).reduce((sum, position) => sum + (reelMultipliers[position % profile.cols] ?? 0), 0);
        const payout = lineBet * multiplier * (reelFactor || 1);
        if (payout > (best?.payout ?? 0)) best = { line, symbolId: candidate.id, length: paidLength, positions: positions.slice(0, paidLength), multiplier, payout };
      }
    }
    if (best) wins.push(best);
  });
  return wins;
}

function pickWolfMoney(rng: Rng): number {
  // Includes public fixed Mini/Major awards. Frequencies are local.
  return [1, 2, 3, 5, 10, 15, 20, 30, 50, 100][rng.weighted([30, 24, 16, 12, 8, 5, 3, .5, 1.5, .1])]!;
}

function applyWolfMoneyRespin(rng: Rng, profile: LineSlotProfile, grid: string[], moneyValues: number[]): { featurePayout: number; triggered: boolean; frames: LineSpinResult['respinFrames'] } {
  const moneyId = profile.symbols.find((entry) => entry.money)?.id;
  if (!moneyId || grid.filter((id) => id === moneyId).length < 6) return { featurePayout: 0, triggered: false, frames: [] };
  grid.forEach((id, index) => { if (id !== moneyId) grid[index] = 'blank'; });
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
        moneyValues[index] = pickWolfMoney(rng);
        landed = true;
      }
    }
    respins = landed ? 3 : respins - 1;
    frames.push({ grid: [...grid], moneyValues: [...moneyValues], remaining: respins });
  }
  const featurePayout = moneyValues.reduce((sum, value) => sum + value, 0);
  return { featurePayout: held.size === grid.length ? 1000 + featurePayout : featurePayout, triggered: true, frames };
}

export function spinLineSlot(
  rng: Rng,
  profile: LineSlotProfile,
  bet: number,
  mode: 'base' | 'free' = 'base',
  wantedBonus: WantedBonus = 'duel-at-dawn',
  wantedState?: WantedState,
): LineSpinResult {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive and finite');
  const generated = generateGrid(rng, profile, mode === 'free', wantedBonus);
  let grid = generated.grid;
  const initialGrid = generated.initialGrid;
  let reelMultipliers: number[] | undefined;
  let nextWantedState: WantedState | undefined;
  if (profile.feature === 'wanted') {
    if (mode === 'free' && wantedBonus === 'train-robbery') {
      const sticky = new Set(wantedState?.stickyWilds ?? []);
      grid.forEach((id, position) => { if (symbol(profile, id)?.wild) sticky.add(position); });
      sticky.forEach((position) => { grid[position] = profile.wildId ?? 'wild'; });
      nextWantedState = { bonus: wantedBonus, phase: 'free-spins', stickyWilds: [...sticky], collectedWilds: 0, collectedMultiplier: 1 };
    } else if (mode === 'free' && wantedBonus === 'dead-mans-hand') {
      const count = Math.min(20, wantedState?.collectedWilds ?? 0, grid.length);
      const positions = Array.from({ length: grid.length }, (_, index) => index);
      for (let i = 0; i < count; i++) {
        const choice = i + rng.nextInt(positions.length - i);
        [positions[i], positions[choice]] = [positions[choice]!, positions[i]!];
        grid[positions[i]!] = profile.wildId ?? 'wild';
      }
      nextWantedState = { bonus: wantedBonus, phase: 'showdown', stickyWilds: [], collectedWilds: count, collectedMultiplier: wantedState?.collectedMultiplier ?? 1 };
    } else {
      const duel = resolveWantedDuels(rng, profile, grid, bet);
      grid = duel.grid;
      reelMultipliers = duel.reelMultipliers;
      if (mode === 'free') nextWantedState = { bonus: wantedBonus, phase: 'free-spins', stickyWilds: [], collectedWilds: 0, collectedMultiplier: 1 };
    }
  }
  const featurePositions = grid.map((id, index) => id !== initialGrid[index] ? index : -1).filter((index) => index >= 0);
  const moneyValues = grid.map((id) => symbol(profile, id)?.money ? profile.feature === 'wolf' ? pickWolfMoney(rng) : [1, 2, 3, 5, 10, 20][rng.weighted([30, 22, 15, 8, 3, 1])]! : 0);
  const wins = evaluateLineWins(profile, grid, bet, reelMultipliers);
  const rawScatterCount = profile.feature === 'wanted' ? initialGrid.filter((id) => symbol(profile, id)?.bonus).length : profile.scatterId ? grid.filter((id) => id === profile.scatterId).length : 0;
  // A giant scatter is one bonus symbol, though its art spans nine cells.
  const giantScatter = profile.feature === 'wolf' && mode === 'free' && profile.cols === 5 && profile.rows === 3 && grid[indexAt(profile, 2, 1)] === profile.scatterId;
  const scatterCount = giantScatter ? rawScatterCount - 8 : rawScatterCount;
  const triggeredBonus = profile.feature === 'wanted' && mode === 'base' ? detectWantedBonus(profile, initialGrid) : undefined;
  const wolfFeature = profile.feature === 'wolf' ? applyWolfMoneyRespin(rng, profile, [...grid], [...moneyValues]) : { featurePayout: 0, triggered: false, frames: [] };
  const deadManMultiplier = nextWantedState?.phase === 'showdown' ? nextWantedState.collectedMultiplier : 1;
  const linePayout = wins.reduce((sum, win) => sum + win.payout, 0) * deadManMultiplier;
  const scatterPayout = profile.feature !== 'wanted' && scatterCount >= 3 ? profile.feature === 'wolf' ? bet : bet * ({ 3: 2, 4: 10, 5: 50 }[Math.min(5, scatterCount) as 3 | 4 | 5] ?? 0) : 0;
  const rawPayout = linePayout + scatterPayout + wolfFeature.featurePayout * bet;
  const payout = +Math.min(rawPayout, bet * profile.maxWin).toFixed(2);
  const featureName = wolfFeature.triggered ? 'Money Respin' : profile.feature === 'wanted' && featurePositions.length > 0 ? nextWantedState?.bonus === 'train-robbery' ? 'Sticky Wilds' : nextWantedState?.phase === 'showdown' ? 'Showdown' : 'DuelReels' : profile.feature === 'wolf' && featurePositions.length > 0 ? 'Expanding symbol' : undefined;
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
    freeSpinsAwarded: profile.feature === 'wanted' ? triggeredBonus ? WANTED_BONUSES.find((entry) => entry.id === triggeredBonus)!.freeSpins : 0 : scatterCount >= 3 ? mode === 'free' ? (profile.retriggerSpins ?? (profile.feature === 'wolf' ? 3 : profile.freeSpins)) : profile.freeSpins : 0,
    triggeredBonus,
    reelMultipliers,
    wantedState: nextWantedState,
    featureName,
    moneyValues,
    jackpotAwards: wolfFeature.triggered ? [
      ...wolfFeature.frames.at(-1)!.moneyValues.filter((value) => value === 30 || value === 100).map((value): WolfJackpotAward => ({ tier: value === 30 ? 'mini' : 'major', multiplier: value })),
      ...(wolfFeature.frames.at(-1)!.grid.every((id) => symbol(profile, id)?.money) ? [{ tier: 'mega' as const, multiplier: 1000 }] : []),
    ] : undefined,
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
  bonus?: WantedBonus;
  purchaseCost?: number;
};

function deadManCollectSpin(rng: Rng, profile: LineSlotProfile, bet: number, state: WantedState): LineSpinResult {
  const grid = new Array<string>(profile.cols * profile.rows).fill('blank');
  const moneyValues = new Array<number>(grid.length).fill(0);
  let wilds = state.collectedWilds;
  let multiplier = state.collectedMultiplier;
  let collected = false;
  // The collect feature's symbol frequencies are local; its reset/limits and
  // three-spin showdown structure follow public rules.
  const wildProbability = profile.wantedCollect?.wildProbability ?? .025;
  const multiplierProbability = profile.wantedCollect?.multiplierProbability ?? .015;
  for (let position = 0; position < grid.length; position++) {
    const roll = rng.next();
    if (roll < wildProbability && wilds < 20) {
      grid[position] = profile.wildId ?? 'wild'; wilds++; collected = true;
    } else if (roll < wildProbability + multiplierProbability && multiplier < 31) {
      const value = Math.min(31 - multiplier, [1, 2, 3, 5][rng.weighted([60, 25, 10, 5])]!);
      grid[position] = 'collection-multiplier'; moneyValues[position] = value; multiplier += value; collected = true;
    }
  }
  const next = { ...state, collectedWilds: wilds, collectedMultiplier: multiplier, respinsRemaining: collected ? 3 : (state.respinsRemaining ?? 3) - 1 };
  return { grid, initialGrid: [...grid], featurePositions: [], wins: [], winningPositions: [], scatterCount: 0, freeSpinsAwarded: 0,
    featureName: 'Dead Man’s Hand · Collect', wantedState: next, moneyValues, multiplier: 0, payout: 0, respinFrames: [], events: [
      { type: 'roundStarted', at: 0, wager: bet }, { type: 'reelsStarted', at: 0, reels: profile.cols },
      ...Array.from({ length: profile.cols }, (_, reel) => ({ type: 'reelStopped' as const, at: 500 + reel * 180, reel })),
      { type: 'featureTriggered', at: 1500, feature: 'Dead Man’s Hand · Collect' }, { type: 'roundEnded', at: 1700, payout: 0 },
    ] };
}

function resolveLineRound(rng: Rng, profile: LineSlotProfile, bet: number, boughtBonus?: WantedBonus): LineRoundResult {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive and finite');
  if (boughtBonus && (profile.feature !== 'wanted' || !WANTED_BONUSES.some((entry) => entry.id === boughtBonus))) throw new RangeError('This profile does not offer that bonus purchase');
  const spins: LineRoundResult['spins'] = [];
  const cap = +(bet * profile.maxWin).toFixed(2);
  let totalPayout = 0;
  let remaining = boughtBonus ? WANTED_BONUSES.find((entry) => entry.id === boughtBonus)!.freeSpins : 0;
  let freeSpinsAwarded = remaining;
  let bonus = boughtBonus;
  let state: WantedState | undefined;
  const append = (result: LineSpinResult, free: boolean) => {
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
  };
  if (!boughtBonus) {
    const base = spinLineSlot(rng, profile, bet);
    append(base, false);
    remaining = base.freeSpinsAwarded;
    freeSpinsAwarded = remaining;
    bonus = base.triggeredBonus;
  }
  if (bonus === 'dead-mans-hand' && totalPayout < cap) {
    state = { bonus, phase: 'collect', stickyWilds: [], collectedWilds: 0, collectedMultiplier: 1, respinsRemaining: 3 };
    while ((state.respinsRemaining ?? 0) > 0) {
      if (spins.length >= 1000) throw new Error('Collection safety limit exceeded');
      const collect = deadManCollectSpin(rng, profile, bet, state);
      append(collect, true);
      state = collect.wantedState!;
    }
  }
  while (remaining > 0 && totalPayout < cap) {
    if (spins.length >= 1000) throw new Error('Free-spin safety limit exceeded');
    const result = spinLineSlot(rng, profile, bet, 'free', bonus ?? 'duel-at-dawn', state);
    append(result, true);
    state = result.wantedState;
    remaining = Math.max(0, remaining - 1) + result.freeSpinsAwarded;
    freeSpinsAwarded += result.freeSpinsAwarded;
  }
  return { spins, totalPayout, freeSpinsAwarded, capped: totalPayout >= cap, bonus,
    ...(boughtBonus ? { purchaseCost: +(bet * WANTED_BONUSES.find((entry) => entry.id === boughtBonus)!.costMultiplier).toFixed(2) } : {}) };
}

/** One seed and one debit cover the complete base + feature cycle. The legacy
 * selection parameter is ignored: only naturally landed bonus symbols choose it. */
export function playLineRound(rng: Rng, profile: LineSlotProfile, bet: number, _legacySelection?: WantedBonus): LineRoundResult {
  return resolveLineRound(rng, profile, bet);
}

/** Local play-credit purchase. Caller debits purchaseCost once, credits the
 * complete total once, records the same cost, then replays these prepared spins. */
export function buyLineBonusRound(rng: Rng, profile: LineSlotProfile, bet: number, bonus: WantedBonus): LineRoundResult {
  return resolveLineRound(rng, profile, bet, bonus);
}
