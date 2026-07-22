import { describe, expect, it } from 'vitest';
import { validateEventTimeline } from '../src/games/contracts';
import { GAME_REFERENCES, REMOVED_GAME_IDS } from '../src/games/references';
import { createRng } from '../src/lib/fairness';
import { GAMES } from '../src/pages/Home';
import * as BigBass from '../src/pages/originals/big-bass/engine';
import { CASE_POOLS, caseRtp, type CaseRisk } from '../src/pages/originals/cases/engine';
import { spin as spinTumble } from '../src/pages/slots/_shared/engine';
import { makePaylines, spinLineSlot, type LineSlotProfile } from '../src/pages/slots/_shared/lineEngine';
import { findSugarClusters, freeSpinsForScatters, SUGAR_SIZE } from '../src/pages/slots/sugar-rush/engine';
import { sweetBonanzaConfig } from '../src/pages/slots/sweet-bonanza/config';

describe('fidelity registry', () => {
  it('retains exactly 34 unique referenced games', () => {
    expect(GAME_REFERENCES).toHaveLength(34);
    expect(new Set(GAME_REFERENCES.map((entry) => entry.id)).size).toBe(34);
    expect(new Set(GAME_REFERENCES.map((entry) => entry.route)).size).toBe(34);
    expect(GAMES).toHaveLength(34);
  });

  it('does not expose removed games in the lobby', () => {
    const routes = GAMES.map((game) => game.to).join(' ');
    for (const id of REMOVED_GAME_IDS) expect(routes).not.toContain(id);
  });
});

describe('corrected rules', () => {
  it('Cases has four risk pools at 98% RTP and a 10,000x prize', () => {
    for (const risk of ['easy', 'medium', 'hard', 'expert'] as CaseRisk[]) {
      expect(caseRtp(risk)).toBeCloseTo(0.98, 8);
      expect(CASE_POOLS[risk].some((prize) => prize.multiplier === 10000)).toBe(true);
    }
  });

  it('Sugar Rush detects orthogonal clusters and applies existing spots', () => {
    const grid = Array.from({ length: SUGAR_SIZE * SUGAR_SIZE }, () => 'candy-blue' as const);
    const spots = new Array(49).fill(0);
    spots[0] = 2;
    spots[1] = 4;
    const clusters = findSugarClusters(grid, spots, 1);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.positions).toHaveLength(49);
    expect(clusters[0]!.spotMultiplier).toBe(6);
    expect(freeSpinsForScatters(3)).toBe(10);
    expect(freeSpinsForScatters(7)).toBe(30);
  });

  it('Sweet Bonanza never creates multiplier bombs in base play', () => {
    for (let nonce = 0; nonce < 100; nonce++) {
      const result = spinTumble(createRng('sweet-base', 'client', nonce), sweetBonanzaConfig, { bet: 1, ante: false }, 'base');
      expect(result.frames.some((frame) => frame.kind === 'multipliersLanded' || frame.kind === 'lightningStrike')).toBe(false);
    }
  });

  it('Big Bass uses a 5x3 grid and ten fixed paylines', () => {
    const result = BigBass.spin(createRng('bass-grid', 'client', 0), 1);
    expect(result.reels).toHaveLength(15);
    expect(result.moneyValues).toHaveLength(15);
    expect(BigBass.PAYLINES).toHaveLength(10);
  });

  it('line-slot outcomes provide a valid deterministic event timeline', () => {
    const profile: LineSlotProfile = {
      id: 'fixture', cols: 5, rows: 3, paylines: makePaylines(5, 3, 10), maxWin: 1000,
      feature: 'classic', freeSpins: 0,
      symbols: [{ id: 'a', weight: 1, pay: { 3: 1, 4: 2, 5: 3 } }],
    };
    const first = spinLineSlot(createRng('line', 'client', 1), profile, 1);
    const replay = spinLineSlot(createRng('line', 'client', 1), profile, 1);
    expect(first).toEqual(replay);
    expect(first.grid).toHaveLength(15);
    expect(validateEventTimeline(first.events)).toEqual([]);
  });
});
