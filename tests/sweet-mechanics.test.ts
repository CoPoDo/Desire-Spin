import { describe, expect, it } from 'vitest';
import { createRng, type Rng } from '../src/lib/fairness';
import { buyBonusRound, playRound, spin } from '../src/pages/slots/_shared/engine';
import { sweetBonanzaConfig as cfg } from '../src/pages/slots/sweet-bonanza/config';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';
import type { SlotConfig } from '../src/pages/slots/_shared/types';

// Provider-authored rules: https://yesplay.bet/assets/documents/pragmatic-play-Sweet-Bonanza-rules.pdf
const fixture: SlotConfig = {
  ...cfg, cols: 3, rows: 3, scatterId: 's',
  symbols: [
    { id: 'a', tier: 'low', label: 'A', payout: { 8: 1 } },
    { id: 'b', tier: 'low', label: 'B', payout: {} },
    { id: 's', tier: 'scatter', label: 'Scatter', payout: { 4: 3, 5: 5, 6: 100 } },
  ],
  weightsBase: [1, 1, 1], weightsFree: [1, 1, 1],
  multiplierTableFree: { pPerTumble: 1, maxPerTumble: 1, values: [[2, 1]] },
};
function fixtureRng(symbols: number[]): Rng {
  let cursor = 0;
  return { weighted: weights => weights.length === 1 ? 0 : symbols[cursor++] ?? 1,
    next: () => 0, nextInt: () => 0, state: () => ({ nonce: 0, cursor, floatIdx: 0 }) };
}
const symbols = (value: number, length: number) => new Array<number>(length).fill(value);

describe('original Sweet Bonanza public mechanics', () => {
  it('uses all nine published pay classes with no hidden base payout factor', () => {
    expect(cfg.symbols.map(symbol => symbol.payout)).toEqual([
      { 8: 10, 10: 25, 12: 50 }, { 8: .4, 10: .9, 12: 4 },
      { 8: .5, 10: 1, 12: 5 }, { 8: .8, 10: 1.2, 12: 8 },
      { 8: 1, 10: 1.5, 12: 10 }, { 8: 1.5, 10: 2, 12: 12 },
      { 8: .25, 10: .75, 12: 2 }, { 8: 2.5, 10: 10, 12: 25 },
      { 8: 2, 10: 5, 12: 15 }, { 4: 3, 5: 5, 6: 100 },
    ]);
    expect(cfg.payoutScaleBase ?? 1).toBe(1);
    expect(cfg.payoutScaleFree ?? 1).toBe(1);
    expect(cfg.multiplierTableFree.values.map(([value]) => value)).toEqual([2, 3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 50, 100]);
    expect([cfg.cols, cfg.rows, cfg.freeSpinsAwardOnTrigger, cfg.freeSpinsAwardOnRetrigger, cfg.buyBonusCost]).toEqual([6, 5, 10, 5, 100]);
  });
  it('never inserts multiplier bombs in base play', () => {
    const result = spin(fixtureRng([...symbols(0, 9), ...symbols(1, 9)]), fixture, { bet: 1, ante: false }, 'base');
    expect(result.totalPayout).toBe(1);
    expect(result.frames.some(frame => frame.kind === 'multipliersLanded' || frame.kind === 'multiplierApplied')).toBe(false);
  });
  it('adds bombs across a tumble sequence but resets their sum before the next free spin', () => {
    const result = playRound(fixtureRng([
      ...symbols(0, 9), ...symbols(1, 8),
      ...symbols(0, 9), ...symbols(1, 8),
    ]), fixture, { bet: 1, ante: false }, 'free', 2);
    const applied = result.frames.filter(frame => frame.kind === 'multiplierApplied');
    expect(applied).toEqual([
      { kind: 'multiplierApplied', sumOfMultipliers: 4, preMultiplierPayout: 1, finalPayout: 4 },
      { kind: 'multiplierApplied', sumOfMultipliers: 4, preMultiplierPayout: 1, finalPayout: 4 },
    ]);
    expect(result.totalPayout).toBe(8);
  });
  it('pays scatters without multiplying their cash award and preserves the five-spin retrigger', () => {
    const result = playRound(fixtureRng([2, 2, 2, 2, ...symbols(1, 5)]), fixture, { bet: 1, ante: false }, 'free', 1);
    expect(result.totalPayout).toBe(3);
    expect(result.freeSpinsAwarded).toBe(6);
    expect(result.frames.filter(frame => frame.kind === 'freeSpinsAwarded')).toEqual([{ kind: 'freeSpinsAwarded', count: 5, reason: 'retrigger' }]);
  });
  it('rejects ante plus bonus purchase in both public tumble-game engines', () => {
    for (const config of [cfg, gatesOfOlympusConfig]) {
      expect(() => buyBonusRound(createRng('ante', 'buy', 1), config, { bet: 1, ante: true })).toThrow('Disable ante');
    }
  });
});
