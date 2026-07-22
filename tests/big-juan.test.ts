import { describe, expect, it } from 'vitest';
import { createRng } from '../src/lib/fairness';
import {
  BASE_REEL_STRIPS,
  CALIBRATED_BASE_MODEL,
  BIG_WIN_TIERS,
  BUY_BONUS_COST_MULTIPLIER,
  COIN_VALUES,
  COINS_PER_LINE,
  JACKPOTS,
  JACKPOT_THRESHOLD,
  PAYLINES,
  PAYLINE_COUNT,
  RESPIN_MONEY_VALUES,
  SYMBOLS,
  applyWildSwitch,
  bigWinTierFor,
  generateBonusBuyGrid,
  generateGrid,
  type Grid,
  play,
  resolveLine,
  resolveRespin,
  rollBonusBuyEntry,
  rollGuaranteedWinRespin,
  rollRespin,
  simulateRespinRound,
  symbolById,
  totalBetFor,
} from '../src/pages/slots/big-juan/engine';

/** Big Juan engine regression suite. Provider-documented rules are pinned
 * exactly; calibrated distributions and presentation thresholds are labelled
 * separately so they are not mistaken for published operator values. */

const PUBLISHED_PAYLINES: number[][] = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 1, 1, 1, 2],
  [0, 1, 2, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 1, 2, 1],
  [1, 1, 1, 2, 3],
  [1, 1, 1, 1, 1],
  [1, 1, 2, 1, 1],
  [1, 1, 2, 3, 3],
  [1, 2, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [1, 2, 2, 2, 1],
  [1, 2, 2, 2, 3],
  [1, 2, 3, 2, 1],
  [1, 2, 3, 3, 3],
  [2, 3, 3, 3, 2],
  [2, 3, 2, 3, 2],
  [2, 3, 2, 1, 2],
  [2, 2, 2, 1, 0],
  [2, 2, 2, 2, 2],
  [2, 2, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [2, 1, 2, 1, 2],
  [2, 1, 2, 3, 2],
  [2, 1, 1, 1, 2],
  [2, 1, 1, 1, 0],
  [2, 1, 0, 0, 0],
  [2, 1, 0, 1, 2],
  [3, 2, 1, 2, 3],
  [3, 2, 2, 2, 3],
  [3, 2, 2, 2, 1],
  [3, 3, 2, 3, 3],
  [3, 3, 2, 1, 1],
  [3, 3, 3, 2, 1],
  [3, 3, 3, 3, 3],
];

function gridWithTopLine(ids: string[]): Grid {
  return ids.map((id) => [id, '10', 'J', 'Q']);
}

describe('Big Juan — spec compliance: layout & paytable', () => {
  it('has 40 paylines (spec §1)', () => {
    expect(PAYLINE_COUNT).toBe(40);
  });

  it('matches all 40 published paylines in provider order', () => {
    expect(PAYLINES).toEqual(PUBLISHED_PAYLINES);
  });

  it('contains 40 unique payline paths', () => {
    expect(new Set(PAYLINES.map((line) => line.join(','))).size).toBe(40);
  });

  it('uses the current official display-strip ordering with placeholders removed', () => {
    expect(BASE_REEL_STRIPS.map((reel) => reel.length)).toEqual([42, 84, 59, 75, 119]);
    expect(BASE_REEL_STRIPS.flat()).not.toContain(undefined);
    expect(BASE_REEL_STRIPS[0]!.slice(0, 8)).toEqual([
      'A', 'vihuela', 'vihuela', 'J', 'vihuela', 'pinata', '10', 'J',
    ]);
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
    expect(totalBetFor(0.60, 10)).toBeCloseTo(240.00, 6);
    expect(totalBetFor(0.10, 5)).toBeCloseTo(20.00, 6);
  });

  it('min bet is 0.40 (0.01 × 1 × 40)', () => {
    const minCoin = Math.min(...COIN_VALUES);
    const minCpl = Math.min(...COINS_PER_LINE);
    expect(totalBetFor(minCoin, minCpl)).toBeCloseTo(0.40, 6);
  });

  it('current sver=5 max bet is 240.00 (0.60 × 10 × 40)', () => {
    const maxCoin = Math.max(...COIN_VALUES);
    const maxCpl = Math.max(...COINS_PER_LINE);
    expect(totalBetFor(maxCoin, maxCpl)).toBeCloseTo(240.00, 6);
  });
});

describe('Big Juan — Wild Switch (pinned provider rule)', () => {
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

  it('transforms every group represented at least six times', () => {
    // Both A and Juan occupy six cells across reels 2–4, so both groups
    // transform; the published rules do not define a winner-takes-all tie.
    const grid: Grid = [
      ['10', '10', '10', '10'],
      ['A', 'A', 'A', 'juan'],
      ['A', 'A', 'juan', 'juan'],
      ['A', 'juan', 'juan', 'juan'],
      ['10', '10', '10', '10'],
    ];
    const r = applyWildSwitch(grid);
    expect(r.info.switched).toBe(true);
    expect(r.info.switchedSymbols).toEqual(['A', 'juan']);
    expect(r.info.positions).toHaveLength(12);
    expect(r.grid[1]).toEqual(['chili', 'chili', 'chili', 'chili']);
    expect(r.grid[2]).toEqual(['chili', 'chili', 'chili', 'chili']);
    expect(r.grid[3]).toEqual(['chili', 'chili', 'chili', 'chili']);
  });
});

describe('Big Juan — leading-Wild line resolution', () => {
  const topLine = [0, 0, 0, 0, 0];

  it('[W,W,W,A,A] pays the higher W3 value', () => {
    const win = resolveLine(
      gridWithTopLine(['chili', 'chili', 'chili', 'A', 'A']),
      0,
      topLine,
    );
    expect(win).toMatchObject({ symbolId: 'chili', count: 3, multiplier: 1.25 });
  });

  it('[W,W,W,pinata,...] still pays W3 before the scatter', () => {
    const win = resolveLine(
      gridWithTopLine(['chili', 'chili', 'chili', 'pinata', 'A']),
      0,
      topLine,
    );
    expect(win).toMatchObject({ symbolId: 'chili', count: 3, multiplier: 1.25 });
  });

  it('[W,W,A,A,A] pays A5', () => {
    const win = resolveLine(
      gridWithTopLine(['chili', 'chili', 'A', 'A', 'A']),
      0,
      topLine,
    );
    expect(win).toMatchObject({ symbolId: 'A', count: 5, multiplier: 1 });
  });
});

describe('Big Juan — scatter placement constraints', () => {
  it('pins the audited local outcome model separately from display loops', () => {
    expect(CALIBRATED_BASE_MODEL.scatterChancePerReel).toBe(0.0822);
    expect(CALIBRATED_BASE_MODEL.symbols.map(({ id, weight }) => [id, weight])).toEqual([
      ['juan', 4000], ['senorita', 5000], ['chihuahua', 6000],
      ['vihuela', 7000], ['hot_sauce', 7000],
      ['A', 10000], ['K', 10000], ['Q', 10000], ['J', 10000], ['10', 10000],
      ['chili', 7160],
    ]);
  });

  it('base grids contain at most one Piñata on each reel', () => {
    for (let nonce = 0; nonce < 500; nonce++) {
      const grid = generateGrid(createRng('base-grid', 'scatter-limit', nonce));
      for (const reel of grid) {
        expect(reel.filter((symbol) => symbol === 'pinata')).toHaveLength(
          reel.includes('pinata') ? 1 : 0,
        );
      }
    }
  });

  it.each([4, 5] as const)('buy grid contains exactly %i Piñatas with at most one per reel', (count) => {
    for (let nonce = 0; nonce < 100; nonce++) {
      const grid = generateBonusBuyGrid(createRng('buy-grid', String(count), nonce), count);
      const scatterCount = grid.flat().filter((symbol) => symbol === 'pinata').length;
      expect(scatterCount).toBe(count);
      for (const reel of grid) {
        expect(reel.filter((symbol) => symbol === 'pinata').length).toBeLessThanOrEqual(1);
      }
    }
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
  it('precomputes an identical whole-feature timeline from identical seeds', () => {
    const first = simulateRespinRound(createRng('feature-replay', 'client', 42), 12, 3.5);
    const second = simulateRespinRound(createRng('feature-replay', 'client', 42), 12, 3.5);
    expect(first).toEqual(second);
    expect(first.events.length).toBeGreaterThanOrEqual(12);
    expect(first.events.filter((event) => event.guaranteedWin)).toHaveLength(1);
    expect(first.events.find((event) => event.guaranteedWin)?.ordinal).toBe(
      first.guaranteedWinOrdinal,
    );
    expect(first.events.at(-1)?.cumulativeAfter ?? 0).toBe(first.totalMultiplier);
  });

  it('does not create feature events when the base result already reached max win', () => {
    const outcome = simulateRespinRound(createRng('feature-cap', 'client', 1), 10, 2600);
    expect(outcome.events).toHaveLength(0);
    expect(outcome.totalMultiplier).toBe(0);
    expect(outcome.cappedAtMax).toBe(true);
  });

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

  it('uses the current sver=5 3 / 4 / 5 / 5 meter thresholds', () => {
    expect(JACKPOT_THRESHOLD.mini).toBe(3);
    expect(JACKPOT_THRESHOLD.minor).toBe(4);
    expect(JACKPOT_THRESHOLD.major).toBe(5);
    expect(JACKPOT_THRESHOLD.grand).toBe(5);
  });

  it('uses the exact current Money symbol value set', () => {
    expect(RESPIN_MONEY_VALUES).toEqual([
      0.5, 1, 2, 3, 5, 8, 10, 15, 20, 25, 40, 50, 100, 125, 200, 250,
    ]);
  });

  it('EXTRA SPIN awards one respin independently of the fourth reel', () => {
    for (const fourth of ['blank', 'boost', 'win'] as const) {
      const res = resolveRespin({
        outer: [
          { kind: 'extra' },
          ...Array.from({ length: 7 }, () => ({ kind: 'blank' as const })),
        ],
        fourth,
      }, {
        bagValue: 1,
        meters: { mini: 0, minor: 0, major: 0, grand: 0 },
        cumulativeMult: 0,
      });
      expect(res.extraSpins).toBe(1);
    }
  });

  it('guaranteed WIN samples contain exactly 2 coins and 2 jackpot symbols', () => {
    const jackpotKinds = new Set(['mini', 'minor', 'major', 'grand']);
    for (let nonce = 0; nonce < 500; nonce++) {
      const sample = rollGuaranteedWinRespin(createRng('guaranteed-win', 'shape', nonce));
      expect(sample.fourth).toBe('win');
      expect(sample.outer).toHaveLength(8);
      expect(sample.outer.filter((symbol) => symbol.kind === 'coin')).toHaveLength(2);
      expect(sample.outer.filter((symbol) => jackpotKinds.has(symbol.kind))).toHaveLength(2);
      expect(sample.outer.filter((symbol) => symbol.kind === 'blank')).toHaveLength(4);
    }
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

  it('ends immediately when a resolution reaches exactly 2,600×', () => {
    const res = resolveRespin({
      outer: Array.from({ length: 8 }, () => ({ kind: 'blank' as const })),
      fourth: 'win',
    }, {
      bagValue: 1,
      meters: { mini: 0, minor: 0, major: 0, grand: 0 },
      cumulativeMult: 2599,
    });
    expect(res.paid).toBe(1);
    expect(res.cappedAtMax).toBe(true);
  });
});

describe('Big Juan — calibrated Bonus Buy entry', () => {
  it('calibrated entry table rolls only 4 or 5 piñatas', () => {
    let count4 = 0, count5 = 0;
    for (let i = 0; i < 10000; i++) {
      const rng = createRng('buy', 'c', i);
      const entry = rollBonusBuyEntry(rng);
      expect([4, 5]).toContain(entry.scatters);
      if (entry.scatters === 4) count4++;
      else count5++;
    }
    // The local calibrated table is weighted ~85/15 toward four.
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

  it('Buy cost multiplier is pinned at 100×', () => {
    expect(BUY_BONUS_COST_MULTIPLIER).toBe(100);
  });
});

describe('Big Juan — calibrated presentation tiers', () => {
  it('keeps the local tier thresholds pinned', () => {
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
    // This is the local hidden-outcome calibration, not a provider claim.
    // Large offline simulations target about 61.86% line-win contribution.
    const baseRtp = totalPaid / N;
    expect(baseRtp).toBeGreaterThan(0.35);
    expect(baseRtp).toBeLessThan(0.90);
    // q=0.0822 gives an analytic 3+-reel trigger rate of about 0.489%.
    const triggerRate = trigger / N;
    expect(triggerRate).toBeGreaterThan(0.001);
    expect(triggerRate).toBeLessThan(0.012);
  });
});

describe('Big Juan — full-round RTP envelope (Monte Carlo)', () => {
  it('combined base + bonus RTP within sane envelope', () => {
    // Approximate full-round RTP by simulating both base and a synthetic
    // bonus when triggered. We bootstrap the bonus via the engine's roll/
    // resolve helpers so this captures Money Bag + jackpots + cap.
    //
    // Sample variance at N=10k is large because bonuses are rare and a
    // single jackpot fill can move the result materially. This is a broad
    // regression envelope, not an assertion of provider-exact RTP.
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
        const guaranteedWinOrdinal = rng.nextInt(3) + 1;
        let respinNumber = 0;
        while (respins > 0 && cum < 2600) {
          respinNumber++;
          const sample = respinNumber === guaranteedWinOrdinal
            ? rollGuaranteedWinRespin(rng)
            : rollRespin(rng);
          const res = resolveRespin(sample, {
            bagValue: bag,
            meters,
            cumulativeMult: r.baseMultiplier + cum,
          });
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
    // Loose envelope: this catches major payout drift while keeping the
    // in-suite simulation quick enough for regular development.
    expect(rtp).toBeGreaterThan(0.60);
    expect(rtp).toBeLessThan(1.50);
  });
});
