import { describe, expect, it } from 'vitest';
import { createRng, type Rng } from '../src/lib/fairness';
import * as Bass from '../src/pages/originals/big-bass/engine';

const empty = () => ['ace', 'king', 'queen', 'jack', 'ten', 'queen', 'jack', 'ten', 'ace', 'king', 'ten', 'ace', 'king', 'queen', 'jack'];
/** Script complete reel landings without coupling fixtures to local weights. */
function scripted(grids: string[][], options: { moneyValue?: number; extra?: boolean } = {}): Rng {
  let cell = 0;
  return {
    next: () => options.extra ? 0 : 0.999999,
    nextInt: () => 0,
    weighted: (weights) => {
      if (weights.length === Bass.SYMBOLS.length) {
        const grid = grids[Math.floor(cell / 15)] ?? empty();
        const id = grid[cell++ % 15]!;
        const index = Bass.SYMBOLS.findIndex((symbol) => symbol.id === id);
        if (index < 0) throw new Error(`Unknown scripted symbol ${id}`);
        return index;
      }
      if (weights.length === Bass.MONEY_VALUES.length) return Bass.MONEY_VALUES.findIndex(([value]) => value === (options.moneyValue ?? 2));
      if (weights.length === Bass.LOCAL_EXTRA_FISH_COUNTS.length) return 0;
      throw new Error(`Unknown weighted draw of length ${weights.length}`);
    },
    state: () => ({ nonce: 0, cursor: 0, floatIdx: cell }),
  };
}
const withWilds = (...positions: number[]) => {
  const grid = empty(); positions.forEach((position) => { grid[position] = 'fisherman'; }); return grid;
};

describe('original Big Bass public paytable and paylines', () => {
  it('uses the ten symbol classes, including the two-floater win, without payout scaling', () => {
    expect(Bass.SYMBOLS.filter((symbol) => symbol.pay)).toHaveLength(10);
    expect(Bass.symbolById('floater')!.pay).toEqual({ 2: 5, 3: 50, 4: 200, 5: 2000 });
    expect(Bass.symbolById('rod')!.pay).toEqual({ 3: 30, 4: 150, 5: 1000 });
    for (const id of ['dragonfly', 'tacklebox']) expect(Bass.symbolById(id)!.pay).toEqual({ 3: 20, 4: 100, 5: 500 });
    expect(Bass.symbolById('bigbass')!.pay).toEqual({ 3: 10, 4: 50, 5: 200 });
    for (const id of ['ace', 'king', 'queen', 'jack', 'ten']) expect(Bass.symbolById(id)!.pay).toEqual({ 3: 5, 4: 25, 5: 100 });
    const grid = empty(); grid[0] = 'floater'; grid[1] = 'floater';
    const result = Bass.evaluateGrid(grid, 2);
    expect(result.winningLines).toEqual([1, 8]);
    expect(result.lineMultiplier).toBe(1);
    expect(result.payout).toBe(2);
  });

  it('matches the public diagram, including the asymmetric tenth line', () => {
    expect(Bass.PAYLINES).toEqual([
      [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
      [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [2, 1, 0, 1, 2],
      [0, 1, 2, 1, 0], [2, 2, 1, 0, 0], [0, 0, 1, 2, 2], [2, 1, 1, 1, 0],
    ]);
    const grid = empty(); Bass.PAYLINES[9]!.forEach((row, reel) => { grid[row * 5 + reel] = 'rod'; });
    expect(Bass.evaluateGrid(grid, 1).winningLines).toContain(9);
  });

  it('pays only the best substitution on a line, including leading or all Wilds', () => {
    const grid = new Array(15).fill('scatter'); grid[0] = 'fisherman'; grid[1] = 'fisherman';
    expect(Bass.evaluateGrid(grid, 1).lineMultiplier).toBe(1);
    const full = Bass.evaluateGrid(new Array(15).fill('fisherman'), 1);
    expect(full.lineSymbol).toBe('floater');
    expect(full.lineMultiplier).toBe(2000);
    expect(full.winningLines).toHaveLength(10);
    const scatters = empty(); scatters[0] = 'fisherman'; scatters[1] = 'scatter'; scatters[2] = 'floater';
    expect(Bass.evaluateGrid(scatters, 1).winningLines).not.toContain(1);
  });

  it('assigns money to every fish in base and free spins, and never to other symbols', () => {
    const grid = empty(); grid[0] = 'bigbass'; grid[8] = 'bigbass';
    for (const result of [Bass.spin(scripted([grid]), 1), Bass.spinFreeRound(scripted([grid]), 1)]) {
      expect(result.moneyValues).toEqual(grid.map((id) => id === 'bigbass' ? 2 : 0));
      expect(result.collectedMultiplier).toBe(0);
    }
    expect(Math.min(...Bass.MONEY_VALUES.map(([value]) => value))).toBe(2);
    expect(Math.max(...Bass.MONEY_VALUES.map(([value]) => value))).toBe(2000);
    expect(Bass.SYMBOLS.filter((symbol) => symbol.isMoney).map((symbol) => symbol.id)).toEqual(['bigbass']);
  });

  it.each([[3, 10], [4, 15], [5, 20]])('%i scatters award %i spins without a cash payout', (count, award) => {
    const grid = empty(); for (let i = 0; i < count; i++) grid[i] = 'scatter';
    const round = Bass.planRound(scripted([grid]), 1);
    expect(round.base!.scatterMultiplier).toBe(0);
    expect(round.bonusAward).toBe(award);
    expect(round.feature).toHaveLength(award);
  });
});

describe('original Big Bass collector feature', () => {
  it('each Wild collects every visible fish and applies only the active collection multiplier', () => {
    const grid = withWilds(0, 8); grid[3] = 'bigbass'; grid[12] = 'bigbass';
    const values = new Array(15).fill(0); values[3] = 5; values[12] = 20;
    const result = Bass.evaluateGrid(grid, 2, values, 3);
    expect(result.collectedMultiplier).toBe((5 + 20) * 2 * 3);
    expect(result.payout).toBe(2 * (result.lineMultiplier + 150));
    expect(result.winningPositions).toEqual(expect.arrayContaining([0, 3, 8, 12]));
  });

  it('queues all three retriggers but finishes every current batch at its original multiplier', () => {
    const grids = [withWilds(0, 4, 6, 12), withWilds(0, 4, 6, 12), withWilds(0, 4, 6, 12)];
    const round = Bass.planRound(scripted(grids), 1, true);
    expect(round.feature).toHaveLength(40);
    expect(round.feature.map((frame) => frame.collectorMultiplier)).toEqual([1, 2, 3, 10].flatMap((multiplier) => new Array(10).fill(multiplier)));
    expect(round.feature.slice(0, 3).map((frame) => frame.addedSpins)).toEqual([10, 10, 10]);
    expect(round.feature[0]!.remaining).toBe(19);
    expect(round.feature[2]!.collectedWilds).toBe(12);
    expect(round.feature[39]!.remaining).toBe(0);
    expect(round.totalPayout).toBeCloseTo(round.feature.reduce((sum, frame) => sum + frame.result.payout, 0), 2);
  });

  it('carries surplus Wilds over each milestone and never awards a fourth retrigger', () => {
    const grids = [withWilds(0, 2, 4, 6, 8), withWilds(0, 4, 12), withWilds(0, 4, 6, 12), withWilds(0, 4, 6, 12)];
    const round = Bass.planRound(scripted(grids), 1, true);
    expect(round.feature.slice(0, 4).map((frame) => frame.addedSpins)).toEqual([10, 10, 10, 0]);
    expect(round.feature.slice(0, 4).map((frame) => frame.collectedWilds)).toEqual([5, 8, 12, 16]);
    expect(round.feature).toHaveLength(40);
  });

  it('adds random fish only after exactly-one-Wild landings and does not recalculate paylines', () => {
    const grid = withWilds(14);
    const result = Bass.spinFreeRound(scripted([grid], { extra: true }), 1, 3);
    expect(result.reels).toEqual(grid);
    expect(result.extraFish).toEqual([{ position: 0, value: 2 }]);
    expect(result.lineMultiplier).toBe(Bass.evaluateGrid(grid, 1).lineMultiplier);
    expect(result.collectedMultiplier).toBe(6);
    for (const other of [empty(), withWilds(0, 14)]) {
      expect(Bass.spinFreeRound(scripted([other], { extra: true }), 1).extraFish).toEqual([]);
    }
  });

  it('caps a feature at 2,100× and forfeits all remaining free spins', () => {
    const grid = withWilds(14); grid[0] = 'bigbass'; grid[1] = 'bigbass';
    const round = Bass.planRound(scripted([grid], { moneyValue: 2000 }), 2, true);
    expect(round.totalPayout).toBe(4200);
    expect(round.capped).toBe(true);
    expect(round.feature).toHaveLength(1);
    expect(round.feature[0]).toMatchObject({ remaining: 0, runningWin: 4200, addedSpins: 0, result: { payout: 4200, multiplier: 2100, capped: true } });
  });

  it('includes triggering base wins in the whole-round cap and retains an exact payout ledger', () => {
    const base = empty(); base.splice(0, 5, 'ace', 'ace', 'ace', 'king', 'queen'); base[5] = base[9] = base[12] = 'scatter';
    const free = withWilds(14); free[0] = 'bigbass'; free[1] = 'bigbass';
    const round = Bass.planRound(scripted([base, free], { moneyValue: 2000 }), 0.01);
    expect(round.base!.payout).toBeGreaterThan(0);
    expect(round.totalPayout).toBe(21);
    expect(round.totalPayout).toBeCloseTo(round.base!.payout + round.feature.reduce((sum, frame) => sum + frame.result.payout, 0), 2);
    expect(round.feature[0]!.result.payout).toBe(+(21 - round.base!.payout).toFixed(2));
  });

  it('replays every base, fish-value, retrigger and cap decision from a single round seed', () => {
    for (const buy of [false, true]) {
      for (let nonce = 0; nonce < 50; nonce++) {
        const a = Bass.planRound(createRng('bass-complete-round', 'test', nonce), 1.37, buy);
        const b = Bass.planRound(createRng('bass-complete-round', 'test', nonce), 1.37, buy);
        expect(a).toEqual(b);
        expect(a.totalPayout).toBeLessThanOrEqual(+(1.37 * 2100).toFixed(2));
        expect(a.totalPayout).toBeCloseTo((a.base?.payout ?? 0) + a.feature.reduce((sum, frame) => sum + frame.result.payout, 0), 2);
        expect(a.feature.length).toBeLessThanOrEqual(a.bonusAward + 30);
      }
    }
  });
});
