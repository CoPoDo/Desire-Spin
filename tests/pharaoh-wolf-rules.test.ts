import { describe, expect, it } from 'vitest';
import { createRng } from '../src/lib/fairness';
import { evaluateLineWins, spinLineSlot } from '../src/pages/slots/_shared/lineEngine';
import { PHARAOH_PROFILE, pharaohProfileForLines, type PharaohLines } from '../src/pages/slots/pharaoh-gold/profile';
import { WOLF_PAYLINES } from '../src/pages/slots/wolf-gold/paylines';
import { WOLF_PROFILE } from '../src/pages/slots/wolf-gold';

// Payline diagram independently transcribed from original Wolf rulebook page2.
const WOLF_DIAGRAM = ['11111','00000','22222','01210','21012','10001','12221','00122','22100','12101','10121','01110','21112','01010','21212','11011','11211','00200','22022','02220','20002','12021','10201','02020','20202'];
describe('source-backed classic line-slot corrections', () => {
  it('preserves all25 Wolf diagram paths and their numbering', () => {
    expect(WOLF_PAYLINES.map(line => line.join(''))).toEqual(WOLF_DIAGRAM);
    expect(new Set(WOLF_DIAGRAM).size).toBe(25);
    expect(WOLF_PROFILE.paylines).toBe(WOLF_PAYLINES);
  });
  it('Pharaoh exposes five canonical classes, an Eye Wild and no scatter', () => {
    expect(PHARAOH_PROFILE.symbols.filter(symbol => symbol.id !== 'blank').map(symbol => symbol.id)).toEqual(['pharaoh','ankh','scarab','cobra','eye']);
    expect(PHARAOH_PROFILE.symbols.find(symbol => symbol.id === 'eye')?.wild).toBe(true);
    expect(PHARAOH_PROFILE.symbols.some(symbol => symbol.scatter)).toBe(false);
    expect(PHARAOH_PROFILE.freeSpins).toBe(0);
  });
  it('Pharaoh selected lines use one coin each and preserve the third-line Mask award', () => {
    for (const lines of [1, 2, 3] as const) {
      const profile = pharaohProfileForLines(lines);
      expect(profile.paylines).toHaveLength(lines);
      const wins = evaluateLineWins(profile, new Array(9).fill('pharaoh'), lines);
      expect(wins.map(win => win.payout)).toEqual([50,50,100].slice(0,lines));
      expect(profile.paylines[0]).toEqual([1,1,1]);
    }
    expect(() => pharaohProfileForLines(0 as PharaohLines)).toThrow();
    expect(() => pharaohProfileForLines(4 as PharaohLines)).toThrow();
  });
  it('Pharaoh pays the displayed two-Cobra rule and chooses the highest Wild substitution', () => {
    const profile = pharaohProfileForLines(1);
    const two = ['blank','blank','blank','cobra','eye','blank','blank','blank','blank'];
    expect(evaluateLineWins(profile, two, 1)).toEqual([{line:0,symbolId:'cobra',length:2,positions:[3,4],multiplier:2,payout:2}]);
    expect(evaluateLineWins(profile, new Array(9).fill('eye'),1)[0]?.payout).toBe(50);
    expect(evaluateLineWins(profile, new Array(9).fill('cobra'),1)[0]?.payout).toBe(5);
  });
  it('Pharaoh beetles produce line wins without awarding scatter cash or free spins', () => {
    const profile = { ...pharaohProfileForLines(3), symbols: [{id:'scarab',weight:1,pay:{3:25}}] };
    const result = spinLineSlot(createRng('scarab','rule',1),profile,3);
    expect(result.payout).toBe(75);
    expect(result.scatterCount).toBe(0);
    expect(result.freeSpinsAwarded).toBe(0);
  });
  it('analytically documents the three-line local frequency model without claiming provider RTP', () => {
    const p = PHARAOH_PROFILE;
    const totalWeight = p.symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
    let expectedReturn = 0;
    for (let line = 0; line < 3; line++) {
      for (const a of p.symbols) for (const b of p.symbols) for (const c of p.symbols) {
        const grid = new Array<string>(9).fill('blank');
        const row = p.paylines[line]![0]!;
        [a,b,c].forEach((symbol, reel) => { grid[row * 3 + reel] = symbol.id; });
        const pay = evaluateLineWins(p, grid, 1).filter(win => win.line === line).reduce((sum, win) => sum + win.payout, 0);
        expectedReturn += pay * a.weight * b.weight * c.weight / totalWeight ** 3;
      }
    }
    // Before aggregate cent rounding. The unresolved Ankh pay is a local rule.
    expect(expectedReturn).toBeCloseTo(.9431680367757271, 12);
  });
});
