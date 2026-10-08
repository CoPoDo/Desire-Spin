import { describe, expect, it } from 'vitest';
import { createRng, type Rng } from '../src/lib/fairness';
import { buyBonusRound, playRound, spin } from '../src/pages/slots/_shared/engine';
import { evaluateLineWins, makePaylines, playLineRound, spinLineSlot, type LineSlotProfile } from '../src/pages/slots/_shared/lineEngine';
import { sweetBonanzaConfig } from '../src/pages/slots/sweet-bonanza/config';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';
import { playSugarRound } from '../src/pages/slots/sugar-rush/engine';
import type { SlotConfig } from '../src/pages/slots/_shared/types';

const fixedRng = (weighted: () => number = () => 0): Rng => ({ next: () => .99, nextInt: () => 0, weighted, state: () => ({ nonce: 0, cursor: 0, floatIdx: 0 }) });
const capConfig: SlotConfig = {
  ...sweetBonanzaConfig, cols: 3, rows: 3, symbols: [{ id: 'a', tier: 'low', label: 'A', payout: { 8: 3 } }],
  weightsBase: [1], weightsFree: [1], payoutScaleBase: 1, maxWinMultiplier: 5,
  multiplierTableBase: { pPerTumble: 0, values: [[2, 1]], maxPerTumble: 1 },
  multiplierTableFree: { pPerTumble: 0, values: [[2, 1]], maxPerTumble: 1 },
};
const lineProfile: LineSlotProfile = {
  id: 'test', cols: 5, rows: 1, paylines: [[0, 0, 0, 0, 0]], maxWin: 100,
  wildId: 'w', scatterId: 's', feature: 'classic', freeSpins: 3,
  symbols: [{ id: 'a', weight: 1, pay: { 3: 5, 4: 10, 5: 20 } }, { id: 'b', weight: 1, pay: { 3: 2, 4: 4, 5: 8 } }, { id: 'w', weight: 1, wild: true }, { id: 's', weight: 1, scatter: true }],
};

describe('slot outcome and presentation regression', () => {
  it('replays complete tumble frames including stable keys from the same seeds', () => {
    const first = buyBonusRound(createRng('stable', 'keys', 11), sweetBonanzaConfig, { bet: 1, ante: false });
    const replay = buyBonusRound(createRng('stable', 'keys', 11), sweetBonanzaConfig, { bet: 1, ante: false });
    expect(first).toEqual(replay);
    const initial = first.frames.filter((frame) => frame.kind === 'initialDrop');
    expect(new Set(initial.flatMap((frame) => frame.grid.flat().map((cell) => cell.key))).size).toBe(initial.length * 30);
  });

  it('stops a winning cascade at the cap and makes final/outro totals match settlement', () => {
    const result = buyBonusRound(fixedRng(), capConfig, { bet: 2, ante: false });
    expect(result.totalPayout).toBe(10);
    expect(result.frames.filter((frame) => frame.kind === 'initialDrop')).toHaveLength(1);
    expect(result.frames.at(-1)).toEqual({ kind: 'freeSpinsEnd', totalPayout: 10 });
    const final = result.frames.find((frame) => frame.kind === 'final');
    expect(final).toEqual({ kind: 'final', spinPayout: 10, runningPayout: 10 });
  });

  it('starting with three free spins plays three, not four', () => {
    const cfg = { ...capConfig, symbols: [{ ...capConfig.symbols[0]!, payout: {} }] };
    const result = playRound(fixedRng(), cfg, { bet: 1, ante: false }, 'free', 3);
    expect(result.frames.filter((frame) => frame.kind === 'initialDrop')).toHaveLength(3);
    expect(result.frames[0]).toEqual({ kind: 'freeSpinsBegin', total: 3 });
  });

  it('lands new tumble symbols before presenting their multipliers', () => {
    let seen = false;
    for (let nonce = 0; nonce < 100; nonce++) {
      const { frames } = spin(createRng('chronology', 'test', nonce), gatesOfOlympusConfig, { bet: 1, ante: false }, 'free');
      frames.forEach((frame, index) => {
        if (frame.kind !== 'multipliersLanded') return;
        seen = true;
        expect(['initialDrop', 'tumble']).toContain(frames[index - 1]?.kind);
      });
    }
    expect(seen).toBe(true);
  });

  it('rejects malformed stakes before generating a slot outcome', () => {
    for (const value of [NaN, Infinity, -1, 0]) {
      expect(() => spin(fixedRng(), capConfig, { bet: value, ante: false }, 'base')).toThrow();
      expect(() => spinLineSlot(fixedRng(), lineProfile, value)).toThrow();
      expect(() => playSugarRound(fixedRng(), value)).toThrow();
    }
  });

  it('pays leading/all Wild substitutions and chooses the highest eligible win once', () => {
    expect(evaluateLineWins(lineProfile, ['w', 'w', 'w', 's', 'b'], 1)).toMatchObject([{ symbolId: 'a', length: 3, payout: 5 }]);
    expect(evaluateLineWins(lineProfile, ['w', 'w', 'w', 'w', 'w'], 1)).toMatchObject([{ symbolId: 'a', length: 5, payout: 20 }]);
    const wildPays = { ...lineProfile, symbols: [...lineProfile.symbols.slice(0, -2), { id: 'w', weight: 1, wild: true, pay: { 3: 30, 5: 100 } }] };
    expect(evaluateLineWins(wildPays, ['w', 'w', 'w', 'a', 'a'], 1)).toMatchObject([{ symbolId: 'w', length: 3, payout: 30 }]);
    expect(evaluateLineWins(lineProfile, ['a', 'b', 'w', 'w', 'w'], 1)).toHaveLength(0);
  });

  it('generates unique, in-range paylines with balanced diagonals', () => {
    const lines = makePaylines(5, 5, 15);
    expect(new Set(lines.map((line) => line.join(','))).size).toBe(15);
    expect(lines).toContainEqual([0, 1, 2, 3, 4]);
    expect(lines).toContainEqual([4, 3, 2, 1, 0]);
    expect(lines.flat().every((row) => row >= 0 && row < 5)).toBe(true);
  });

  it('keeps the line-winning board intact while replaying Money Respin separately', () => {
    let calls = 0;
    const rng: Rng = { ...fixedRng(() => calls++ < 6 ? 0 : 1), next: () => 0 };
    const profile: LineSlotProfile = { ...lineProfile, rows: 3, feature: 'wolf', symbols: [{ id: 'money', weight: 1, money: true }, { id: 'a', weight: 1, pay: { 5: 10 } }] };
    const result = spinLineSlot(rng, profile, 1);
    expect(result.grid.filter((id) => id === 'money')).toHaveLength(6);
    expect(result.respinFrames.at(-1)?.grid.every((id) => id === 'money')).toBe(true);
    expect(result.moneyValues.filter(Boolean)).toHaveLength(6);
    expect(result.featureName).toBe('Money Respin');
  });

  it('caps an entire line feature and deterministically replays all spins', () => {
    const profile = { ...lineProfile, maxWin: 7 };
    const result = playLineRound(fixedRng(() => 3), profile, 1);
    expect(result.totalPayout).toBe(7);
    expect(result.spins).toHaveLength(1);
    expect(result.capped).toBe(true);
    expect(playLineRound(createRng('line-round', 'test', 1), lineProfile, 2)).toEqual(playLineRound(createRng('line-round', 'test', 1), lineProfile, 2));
  });

  it('precomputes a single capped Sugar buy, retaining multiplier spots between free spins', () => {
    const round = playSugarRound(createRng('sugar-round', 'test', 2), 1, true);
    expect(round.spins.length).toBeGreaterThanOrEqual(1);
    expect(round.spins[0]!.free).toBe(false);
    expect(round.spins.slice(1).every((entry) => entry.free)).toBe(true);
    expect(round.totalPayout).toBeLessThanOrEqual(5000);
    expect(round.totalPayout).toBeCloseTo(round.spins.reduce((sum, entry) => sum + entry.result.totalPayout, 0), 2);
    for (let index = 2; index < round.spins.length; index++) {
      expect(round.spins[index]!.result.frames[0]!.spots).toEqual(round.spins[index - 1]!.result.spots);
    }
    expect(round).toEqual(playSugarRound(createRng('sugar-round', 'test', 2), 1, true));
  });
});
