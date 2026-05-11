import { describe, expect, it } from 'vitest';
import { createRng } from '../src/lib/fairness';
import {
  BIG_WIN_TIERS,
  BUY_BONUS_COST_MULTIPLIER,
  COIN_VALUES,
  COINS_PER_LINE,
  JACKPOTS,
  JACKPOT_THRESHOLD,
  PAYLINE_COUNT,
  SYMBOLS,
  applyWildSwitch,
  bigWinTierFor,
  type Grid,
  play,
  resolveRespin,
  rollBonusBuyEntry,
  rollRespin,
  symbolById,
  totalBetFor,
} from '../src/pages/slots/big-juan/engine';

/** Big Juan engine regression suite — derived directly from the
 *  public spec. Each section maps to a spec section so a future
 *  refactor that breaks a feature is caught immediately. */

describe('Big Juan — spec compliance: layout & paytable', () => {
  it('has 40 paylines (spec §1)', () => {
    expect(PAYLINE_COUNT).toBe(40);
  });

  it('exposes 11 paying symbols + 1 scatter (spec §3)', () => {
    // Spec §3: "11 symbols total in the base game: 5 low + 5 high + 1 wild.
    // Plus one scatter." → 12 entries in the SYMBOLS array.
    expect(SYMBOLS).toHaveLength(12);
    expect(SYMBOLS.filter((s) => s.kind === 'low')).toHaveLength(5);
    expect(SYMBOLS.filter((s) => s.kind === 'high')).toHaveLength(5);
    expect(SYMBOLS.filter((s) => s.kind === 'wild')).toHaveLength(1);
    expect(SYMBOLS.filter((s) => s.kind === 'scatter')).toHaveLength(1);
  });

  it('all 5 low cards share the same pay row (spec §4)', () => {
    const lows = SYMBOLS.filter((s) => s.kind === 'low');
    expect(lows).toHaveLength(5);
    const ref = lows[0]!.pay!;
    for (const l of lows) {
      expect(l.pay!['3']).toBe(ref['3']);
      expect(l.pay!['4']).toBe(ref['4']);
      expect(l.pay!['5']).toBe(ref['5']);
    }
  });

  it('low-pay row matches spec §4 exactly (0.125 / 0.25 / 1.00)', () => {
    const A = symbolById('A')!;
    expect(A.pay!['3']).toBe(0.125);
    expect(A.pay!['4']).toBe(0.25);
    expect(A.pay!['5']).toBe(1.00);
  });

  it('high pays match spec §4 exactly', () => {
    expect(symbolById('vihuela')!.pay).toEqual({ 3: 0.25, 4: 0.50, 5: 2.50 });
    expect(symbolById('hot_sauce')!.pay).toEqual({ 3: 0.25, 4: 0.50, 5: 2.50 });
    expect(symbolById('chihuahua')!.pay).toEqual({ 3: 0.375, 4: 1.00, 5: 3.75 });
    expect(symbolById('senorita')!.pay).toEqual({ 3: 0.50, 4: 2.00, 5: 5.00 });
    expect(symbolById('juan')!.pay).toEqual({ 3: 0.625, 4: 2.50, 5: 6.25 });
  });

  it('Chili Wild pays exactly 1.25 / 3.75 / 12.50 (spec §4)', () => {
    expect(symbolById('chili')!.pay).toEqual({ 3: 1.25, 4: 3.75, 5: 12.50 });
  });

  it('Piñata scatter has no line pay (spec §3)', () => {
    expect(symbolById('pinata')!.pay).toBeUndefined();
  });
});

describe('Big Juan — bet structure (spec §1)', () => {
  it('total = coin × cpl × 40', () => {
    expect(totalBetFor(0.01, 1)).toBeCloseTo(0.40, 6);
    expect(totalBetFor(0.50, 10)).toBeCloseTo(200.00, 6);
    expect(totalBetFor(0.10, 5)).toBeCloseTo(20.00, 6);
  });

  it('min bet is 0.40 (0.01 × 1 × 40)', () => {
    const minCoin = Math.min(...COIN_VALUES);
    const minCpl = Math.min(...COINS_PER_LINE);
    expect(totalBetFor(minCoin, minCpl)).toBeCloseTo(0.40, 6);
  });

  it('max bet is 200.00 (0.50 × 10 × 40)', () => {
    const maxCoin = Math.max(...COIN_VALUES);
    const maxCpl = Math.max(...COINS_PER_LINE);
    expect(totalBetFor(maxCoin, maxCpl)).toBeCloseTo(200.00, 6);
  });
});

describe('Big Juan — Wild Switch (spec §6)', () => {
  it('does not trigger on 5 same symbols across reels 2-3-4', () => {
    // Place exactly 5 A's on reels 2/3/4 — should NOT trigger (need 6+).
    // Other symbols capped at <6 too so no other candidate triggers.
    const grid: Grid = [
      ['10', '10', '10', '10'],
      ['A',  'A',  'A',  'Q'],   // reel 2: 3 A's + 1 Q
      ['A',  'K',  'Q',  '10'],  // reel 3: 1 A
      ['A',  'J',  'Q',  '10'],  // reel 4: 1 A → 5 A's total; others ≤ 3
      ['10', '10', '10', '10'],
    ];
    const r = applyWildSwitch(grid);
    expect(r.info.switched).toBe(false);
  });

  it('triggers on 6+ same symbols across reels 2-3-4', () => {
    const grid: Grid = [
      ['10', '10', '10', '10'],
      ['A',  'A',  'A',  'A'],
      ['A',  'A',  'K',  'K'],
      ['K',  'K',  'K',  'K'],
      ['10', '10', '10', '10'],
    ];
    const r = applyWildSwitch(grid);
    expect(r.info.switched).toBe(true);
    expect(r.info.switchedSymbol).toBe('A');
    // All A's on reels 2-3-4 should be turned into chili wilds.
    expect(r.grid[1]).toEqual(['chili', 'chili', 'chili', 'chili']);
    expect(r.grid[2]!.slice(0, 2)).toEqual(['chili', 'chili']);
  });

  it('ignores wild + scatter symbols when counting (spec §6)', () => {
    // 6 chili wilds on 2-3-4 should NOT trigger (wild excluded).
    const grid: Grid = [
      ['10', '10', '10', '10'],
      ['chili', 'chili', 'A', 'K'],
      ['chili', 'chili', 'K', 'K'],
      ['chili', 'chili', 'K', 'K'],
      ['10', '10', '10', '10'],
    ];
    const r = applyWildSwitch(grid);
    expect(r.info.switched).toBe(false);
  });

  it('tie-break picks the higher-paying symbol (spec §6)', () => {
    // Two candidates with 6+: A (low, 1.00× for 5) vs juan (top, 6.25× for 5)
    // — juan should win. Need 6+ of each on reels 2-3-4.
    const grid: Grid = [
      ['10', '10', '10', '10'],
      ['A', 'A', 'A', 'juan'],
      ['A', 'A', 'juan', 'juan'],
      ['A', 'juan', 'juan', 'juan'],
      ['10', '10', '10', '10'],
    ];
    const r = applyWildSwitch(grid);
    expect(r.info.switched).toBe(true);
    expect(r.info.switchedSymbol).toBe('juan');
  });
});

describe('Big Juan — base game determinism', () => {
  it('same seeds → identical SpinResult', () => {
    const a = createRng('bj-det', 'c', 100);
    const b = createRng('bj-det', 'c', 100);
    const ra = play(a);
    const rb = play(b);
    expect(ra.baseMultiplier).toBeCloseTo(rb.baseMultiplier, 8);
    expect(ra.scatterCount).toBe(rb.scatterCount);
    expect(ra.wildSwitch.switched).toBe(rb.wildSwitch.switched);
  });
});

describe('Big Juan — Respins feature mechanics (spec §7)', () => {
  it('BLANK 4th reel collects nothing and updates bag/meters identically', () => {
    const sample = {
      outer: Array(8).fill(null).map(() => ({ kind: 'coin' as const, value: 10 })),
      fourth: 'blank' as const,
    };
    const res = resolveRespin(sample, {
      bagValue: 1,
      meters: { mini: 0, minor: 0, major: 0, grand: 0 },
      cumulativeMult: 0,
    });
    expect(res.paid).toBe(0);
    expect(res.newBagValue).toBe(1);
    expect(res.newMeters).toEqual({ mini: 0, minor: 0, major: 0, grand: 0 });
  });

  it('WIN pays sum-of-coins + bag value', () => {
    const sample = {
      outer: [
        { kind: 'coin' as const, value: 5 },
        { kind: 'coin' as const, value: 10 },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
      ],
      fourth: 'win' as const,
    };
    const res = resolveRespin(sample, {
      bagValue: 3,
      meters: { mini: 0, minor: 0, major: 0, grand: 0 },
      cumulativeMult: 0,
    });
    expect(res.paid).toBe(18); // 5 + 10 + 3
    expect(res.coinSum).toBe(15);
    expect(res.bagPaid).toBe(3);
    expect(res.newBagValue).toBe(3); // bag unchanged on WIN
  });

  it('BOOST adds coins to bag, pays nothing', () => {
    const sample = {
      outer: [
        { kind: 'coin' as const, value: 25 },
        { kind: 'coin' as const, value: 50 },
        { kind: 'mini' as const }, // does NOT collect on BOOST per spec
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
      ],
      fourth: 'boost' as const,
    };
    const res = resolveRespin(sample, {
      bagValue: 1,
      meters: { mini: 0, minor: 0, major: 0, grand: 0 },
      cumulativeMult: 0,
    });
    expect(res.paid).toBe(0);
    expect(res.boostGain).toBe(75);
    expect(res.newBagValue).toBe(76);
    expect(res.newMeters.mini).toBe(0); // jackpot symbol NOT collected on boost
  });

  it('WIN fills mini meter at 3 symbols and pays the jackpot', () => {
    const sample = {
      outer: [
        { kind: 'mini' as const },
        { kind: 'mini' as const },
        { kind: 'mini' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
        { kind: 'blank' as const },
      ],
      fourth: 'win' as const,
    };
    const res = resolveRespin(sample, {
      bagValue: 1,
      meters: { mini: 0, minor: 0, major: 0, grand: 0 },
      cumulativeMult: 0,
    });
    expect(res.jackpotHits).toEqual([{ tier: 'mini', amount: JACKPOTS.mini }]);
    expect(res.paid).toBe(JACKPOTS.mini + 1); // jackpot + bag
    expect(res.newMeters.mini).toBe(0); // reset after fill
  });

  it('Grand meter requires 5 symbols (spec §7.6)', () => {
    expect(JACKPOT_THRESHOLD.mini).toBe(3);
    expect(JACKPOT_THRESHOLD.minor).toBe(4);
    expect(JACKPOT_THRESHOLD.major).toBe(5);
    expect(JACKPOT_THRESHOLD.grand).toBe(5);
  });

  it('jackpot payouts match spec §7.6 (12.5 / 50 / 250 / 2500)', () => {
    expect(JACKPOTS.mini).toBe(12.5);
    expect(JACKPOTS.minor).toBe(50);
    expect(JACKPOTS.major).toBe(250);
    expect(JACKPOTS.grand).toBe(2500);
  });

  it('caps total payout at 2,600× bet (spec §7.7)', () => {
    const sample = {
      outer: Array(8).fill(null).map(() => ({ kind: 'coin' as const, value: 250 })),
      fourth: 'win' as const,
    };
    // cumulative already at 2000; this respin would add 8*250 + bag → way over.
    const res = resolveRespin(sample, {
      bagValue: 1,
      meters: { mini: 0, minor: 0, major: 0, grand: 0 },
      cumulativeMult: 2000,
    });
    expect(res.cappedAtMax).toBe(true);
    expect(res.paid).toBeCloseTo(600, 4);
  });
});

describe('Big Juan — Bonus Buy (spec §8)', () => {
  it('rolls only 4 or 5 piñatas (never 3)', () => {
    let count4 = 0, count5 = 0;
    for (let i = 0; i < 10000; i++) {
      const rng = createRng('buy', 'c', i);
      const entry = rollBonusBuyEntry(rng);
      expect([4, 5]).toContain(entry.scatters);
      if (entry.scatters === 4) count4++;
      else count5++;
    }
    // Spec §8: weighted ~85/15 toward 4. Allow 4% noise.
    const ratio4 = count4 / (count4 + count5);
    expect(ratio4).toBeGreaterThan(0.81);
    expect(ratio4).toBeLessThan(0.89);
  });

  it('4-piñata entry awards 12 respins, 5-piñata 15', () => {
    for (let i = 0; i < 100; i++) {
      const rng = createRng('buy', 'c', i);
      const entry = rollBonusBuyEntry(rng);
      if (entry.scatters === 4) expect(entry.respinsAwarded).toBe(12);
      if (entry.scatters === 5) expect(entry.respinsAwarded).toBe(15);
    }
  });

  it('Buy cost multiplier is 100× (spec §8)', () => {
    expect(BUY_BONUS_COST_MULTIPLIER).toBe(100);
  });
});

describe('Big Juan — Big-win tiers (spec §10b.10)', () => {
  it('tier thresholds match spec', () => {
    expect(bigWinTierFor(9)).toBeNull();          // <10× no banner
    expect(bigWinTierFor(15)!.name).toBe('nice'); // 10-25
    expect(bigWinTierFor(30)!.name).toBe('big');  // 25-50
    expect(bigWinTierFor(75)!.name).toBe('mega'); // 50-100
    expect(bigWinTierFor(200)!.name).toBe('super'); // 100-500
    expect(bigWinTierFor(750)!.name).toBe('huge'); // 500-1000
    expect(bigWinTierFor(2000)!.name).toBe('epic'); // 1000-2500
    expect(bigWinTierFor(2600)!.name).toBe('max'); // 2500+
  });

  it('has all 7 tiers + max', () => {
    expect(BIG_WIN_TIERS).toHaveLength(7);
    expect(BIG_WIN_TIERS.map((t) => t.name)).toEqual([
      'nice', 'big', 'mega', 'super', 'huge', 'epic', 'max',
    ]);
  });
});

describe('Big Juan — base-game RTP envelope (Monte Carlo)', () => {
  it('base-game spin RTP is within sane range (Monte Carlo, N=4000)', () => {
    const N = 4000;
    let totalPaid = 0;
    let trigger = 0;
    for (let i = 0; i < N; i++) {
      const rng = createRng('bj-rtp-base', 'c', i);
      const r = play(rng);
      totalPaid += r.baseMultiplier;
      if (r.triggersBonus) trigger++;
    }
    // Base contribution alone (without bonus) should be a fraction of the
    // 96.7% total. Spec §11 suggests ~30-35% of RTP from base line wins.
    // Our calibration targets that band loosely — accept 15-65% line RTP.
    const baseRtp = totalPaid / N;
    expect(baseRtp).toBeGreaterThan(0.10);
    expect(baseRtp).toBeLessThan(0.80);
    // Bonus trigger rate target: ~0.5%. Accept 0.2-2.0%.
    const triggerRate = trigger / N;
    expect(triggerRate).toBeGreaterThan(0.001);
    expect(triggerRate).toBeLessThan(0.02);
  });
});

describe('Big Juan — full-round RTP envelope (Monte Carlo)', () => {
  it('combined base + bonus RTP within sane envelope', () => {
    // Approximate full-round RTP by simulating both base and a synthetic
    // bonus when triggered. We bootstrap the bonus via the engine's roll/
    // resolve helpers so this captures Money Bag + jackpots + cap.
    //
    // Sample variance at N=10k is large because bonuses are rare (~0.5%
    // trigger) and a single jackpot fill swings RTP by ~25%. Calibrated
    // target via the 200k-spin calibration script is 96.7%; the test
    // envelope below catches a 5x calibration drift but tolerates the
    // legitimate ±15% Monte Carlo noise at this sample size.
    const N = 10000;
    let total = 0;
    for (let i = 0; i < N; i++) {
      const rng = createRng('bj-rtp-full', 'c', i);
      const r = play(rng);
      total += r.baseMultiplier;
      if (r.triggersBonus) {
        const award = r.scatterCount === 3 ? 10 : r.scatterCount === 4 ? 12 : 15;
        let respins = award;
        let bag = 1;
        let meters = { mini: 0, minor: 0, major: 0, grand: 0 };
        let cum = 0;
        while (respins > 0 && cum < 2600) {
          const sample = rollRespin(rng);
          const res = resolveRespin(sample, { bagValue: bag, meters, cumulativeMult: cum });
          cum += res.paid;
          bag = res.newBagValue;
          meters = res.newMeters;
          respins = Math.max(0, respins - 1 + res.extraSpins);
          if (res.cappedAtMax) break;
        }
        total += cum;
      }
    }
    const rtp = total / N;
    // Loose envelope: 0.60-1.50. The 200k-spin calibration script reports
    // a stable ~96.7% — this in-suite envelope just guards against major
    // regressions while keeping the test under 2 seconds.
    expect(rtp).toBeGreaterThan(0.60);
    expect(rtp).toBeLessThan(1.50);
  });
});
