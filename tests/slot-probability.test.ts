import { describe, expect, it } from 'vitest';
import { createRng } from '../src/lib/fairness';
import { samplingRng, summarizeSample, expectedStickyTrainPayout } from './slot-sampling-math';
import { buyLineBonusRound, WANTED_BONUSES } from '../src/pages/slots/_shared/lineEngine';
import { WANTED_PROFILE } from '../src/pages/slots/wanted-wild';
import { planRound as playBassRound } from '../src/pages/originals/big-bass/engine';
import { SUGAR_FREQUENCIES, playSugarRound } from '../src/pages/slots/sugar-rush/engine';

describe('offline probability benchmark accounting', () => {
  it('reports return relative to total purchase cost, not nominal spin bet', () => {
    const result = summarizeSample([0, 100, 200], 100);
    expect(result.returnFraction).toBe(1);
    expect(result.meanPayout).toBe(100);
    expect(result.standardError).toBeCloseTo(Math.sqrt(1 / 3));
    expect(result.positivePayoutFraction).toBe(2 / 3);
    expect(result.recoveredCostFraction).toBe(2 / 3);
    expect(result.payoutQuantiles).toEqual({ p50: 100, p90: 100, p99: 100, max: 200 });
  });
  it('replays the offline source and rejects invalid summaries', () => {
    const a = samplingRng(1234), b = samplingRng(1234);
    const first = Array.from({ length: 1000 }, () => a.next());
    expect(first).toEqual(Array.from({ length: 1000 }, () => b.next()));
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(summarizeSample([2, 2, 2], 2).standardError).toBe(0);
    expect(() => summarizeSample([1], 1)).toThrow();
    expect(() => summarizeSample([1, NaN], 1)).toThrow();
    expect(() => summarizeSample([1, 2], 0)).toThrow();
  });
});

describe('fixed local frequency calibration safeguards', () => {
  it('uses finite nonnegative declared frequency weights only', () => {
    for (const symbol of WANTED_PROFILE.symbols) {
      expect(symbol.weight).toBeGreaterThanOrEqual(0);
      for (const weight of Object.values(symbol.bonusWeights ?? {})) {
        expect(Number.isFinite(weight)).toBe(true);
        expect(weight).toBeGreaterThanOrEqual(0);
      }
    }
    for (const weights of Object.values(SUGAR_FREQUENCIES)) {
      expect(weights).toHaveLength(8);
      expect(weights.every((weight) => weight >= 0 && Number.isFinite(weight))).toBe(true);
    }
  });
  it('checks Train expectation analytically without choosing winning outcomes', () => {
    const mean = expectedStickyTrainPayout(WANTED_PROFILE.symbols);
    expect(mean / 80).toBeGreaterThan(.96);
    expect(mean / 80).toBeLessThan(.97);
    expect(expectedStickyTrainPayout([{ id: 'a', weight: 1, pay: { 5: 3 } }])).toBe(30);
    expect(expectedStickyTrainPayout([{ id: 'wild', weight: 1, wild: true, pay: { 5: 3 } }])).toBe(30);
  });
  it('retains exact Wanted purchase costs, one round cap, and HMAC replay', () => {
    for (const feature of WANTED_BONUSES) {
      for (let nonce = 0; nonce < 3; nonce++) {
        const run = () => buyLineBonusRound(createRng('frequency-regression', 'wanted', nonce), WANTED_PROFILE, 2, feature.id);
        const round = run();
        expect(round).toEqual(run());
        expect(round.purchaseCost).toBe(2 * feature.costMultiplier);
        expect(round.totalPayout).toBeLessThanOrEqual(25_000);
        expect(round.totalPayout).toBeCloseTo(round.spins.reduce((sum, spin) => sum + spin.result.payout, 0), 2);
      }
    }
  });
  it('retains Sugar HMAC replay and complete buy settlement after frequency changes', () => {
    const run = () => playSugarRound(createRng('frequency-regression', 'sugar', 0), 2, true);
    const round = run();
    expect(round).toEqual(run());
    expect(round.totalPayout).toBeLessThanOrEqual(10_000);
    expect(round.totalPayout).toBeCloseTo(round.spins.reduce((sum, spin) => sum + spin.result.totalPayout, 0), 2);
    expect(round.spins[0]!.result.scatterCount).toBeGreaterThanOrEqual(3);
  });
  it('keeps Sugar and Bass buys in broad non-degenerate sampling bands', () => {
    for (const play of [(rng: ReturnType<typeof samplingRng>) => playSugarRound(rng, 1, true), (rng: ReturnType<typeof samplingRng>) => playBassRound(rng, 1, true)]) {
      const rng = samplingRng(80803);
      let total = 0;
      for (let index = 0; index < 500; index++) total += play(rng).totalPayout;
      expect(total / 50_000).toBeGreaterThan(.25);
      expect(total / 50_000).toBeLessThan(2.5);
    }
  }, 20_000);
  // Wide deterministic regression bands catch catastrophic buy-frequency
  // mistakes; these are not assertions of exact or certified provider RTP.
  it('keeps every Wanted buy out of grossly degenerate return bands', () => {
    for (const feature of WANTED_BONUSES) {
      const rng = samplingRng(80803);
      let total = 0;
      for (let index = 0; index < 500; index++) total += buyLineBonusRound(rng, WANTED_PROFILE, 1, feature.id).totalPayout;
      const sampledReturn = total / (500 * feature.costMultiplier);
      expect(sampledReturn).toBeGreaterThan(.25);
      expect(sampledReturn).toBeLessThan(2.5);
    }
  }, 20_000);
});
