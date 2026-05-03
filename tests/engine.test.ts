import { describe, expect, it } from 'vitest';
import { createRng } from '../src/lib/fairness';
import { buyBonusRound, playRound, spin } from '../src/pages/slots/_shared/engine';
import { sweetBonanzaConfig } from '../src/pages/slots/sweet-bonanza/config';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';
import type { Frame } from '../src/pages/slots/_shared/types';

describe('Slot engine — determinism', () => {
  it('same seeds produce same total payout (Sweet Bonanza)', () => {
    const a = createRng('det-server', 'det-client', 42);
    const b = createRng('det-server', 'det-client', 42);
    const ra = playRound(a, sweetBonanzaConfig, { bet: 1, ante: false });
    const rb = playRound(b, sweetBonanzaConfig, { bet: 1, ante: false });
    expect(ra.totalPayout).toBeCloseTo(rb.totalPayout, 8);
    expect(ra.frames.length).toBe(rb.frames.length);
  });

  it('same seeds produce same total payout (Gates of Olympus)', () => {
    const a = createRng('zeus', 'mortal', 99);
    const b = createRng('zeus', 'mortal', 99);
    const ra = playRound(a, gatesOfOlympusConfig, { bet: 2, ante: true });
    const rb = playRound(b, gatesOfOlympusConfig, { bet: 2, ante: true });
    expect(ra.totalPayout).toBeCloseTo(rb.totalPayout, 8);
  });
});

describe('Slot engine — frame structure', () => {
  it('emits initialDrop and final frames every spin', () => {
    const r = createRng('s1', 'c1', 1);
    const result = spin(r, sweetBonanzaConfig, { bet: 1, ante: false }, 'base');
    expect(result.frames[0]?.kind).toBe('initialDrop');
    expect(result.frames[result.frames.length - 1]?.kind).toBe('final');
  });

  it('every wins frame carries non-empty wins', () => {
    const r = createRng('s2', 'c2', 17);
    const result = spin(r, sweetBonanzaConfig, { bet: 1, ante: false }, 'base');
    for (const f of result.frames) {
      if (f.kind === 'wins') {
        expect(f.wins.length).toBeGreaterThan(0);
        for (const w of f.wins) expect(w.positions.length).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

describe('Slot engine — sane RTP envelope', () => {
  // True RTP convergence needs 1M+ spins; with 8k spins and rare free-spins
  // triggers, variance is enormous (a single 1000× mega-win shifts the mean
  // by ~12.5 percentage points). We just check the engine produces a
  // non-degenerate configuration and isn't grinding the player to zero or
  // gushing payouts uncontrollably.
  function rtp(cfg: typeof sweetBonanzaConfig, n = 8000): number {
    let total = 0;
    for (let i = 0; i < n; i++) {
      const r = createRng('rtp-server', 'rtp-client', i);
      const result = playRound(r, cfg, { bet: 1, ante: false });
      total += result.totalPayout;
    }
    return total / n;
  }

  it('Sweet Bonanza RTP smoke is in (0.6, 1.5)', () => {
    const v = rtp(sweetBonanzaConfig);
    // Calibrated config converges to ~96.5% at 100k+ spins; 8k has high variance.
    expect(v).toBeGreaterThan(0.6);
    expect(v).toBeLessThan(1.5);
  });

  it('Gates of Olympus RTP smoke is in (0.6, 1.5)', () => {
    const v = rtp(gatesOfOlympusConfig);
    expect(v).toBeGreaterThan(0.6);
    expect(v).toBeLessThan(1.5);
  });
});

describe('Free spins trigger', () => {
  it('triggers free spins at least once across many spins', () => {
    let triggered = 0;
    for (let i = 0; i < 4000; i++) {
      const r = createRng('fs-server', 'fs-client', i);
      const res = spin(r, sweetBonanzaConfig, { bet: 1, ante: false }, 'base');
      if (res.triggeredFreeSpins) triggered++;
    }
    expect(triggered).toBeGreaterThan(0);
  });
});

describe('Buy bonus produces a free-spins round', () => {
  it('emits exactly one freeSpinsBegin and freeSpinsEnd frame', () => {
    const r = createRng('buy-srv', 'buy-cli', 2);
    const buy = buyBonusRound(r, sweetBonanzaConfig, { bet: 1, ante: false });
    const begins = buy.frames.filter((f: Frame) => f.kind === 'freeSpinsBegin');
    expect(begins.length).toBe(1);
    const ends = buy.frames.filter((f: Frame) => f.kind === 'freeSpinsEnd');
    expect(ends.length).toBe(1);
    expect(buy.freeSpinsAwarded).toBeGreaterThanOrEqual(sweetBonanzaConfig.freeSpinsAwardOnTrigger);
  });
});
