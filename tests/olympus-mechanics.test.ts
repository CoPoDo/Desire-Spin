import { describe, expect, it } from 'vitest';
import type { Rng } from '../src/lib/fairness';
import { createRng } from '../src/lib/fairness';
import { spin, playRound, buyBonusRound } from '../src/pages/slots/_shared/engine';
import { gatesOfOlympusConfig as cfg } from '../src/pages/slots/gates-of-olympus/config';
import type { SlotConfig } from '../src/pages/slots/_shared/types';

const fixture: SlotConfig = { ...cfg, cols:3, rows:3, symbols:[
  {id:'a',tier:'low',label:'A',payout:{8:1}},
  {id:'b',tier:'low',label:'B',payout:{}},
  {id:'s',tier:'scatter',label:'Scatter',payout:{4:3,5:5,6:100}},
], weightsBase:[1,1,1],weightsFree:[1,1,1],scatterId:'s',
  multiplierTableBase:{pPerTumble:1,maxPerTumble:1,values:[[2,1]]},
  multiplierTableFree:{pPerTumble:1,maxPerTumble:1,values:[[2,1]]},buyTriggerScatters:undefined,
};
function sequenceRng(symbols: number[], gates: number[]=[]): Rng {
  let symbolAt=0, gateAt=0;
  return {
    weighted: weights => weights.length===1 ? 0 : symbols[symbolAt++] ?? 1,
    next: () => gates[gateAt++] ?? 0,
    nextInt: () => 0,
    state:()=>({nonce:0,cursor:symbolAt,floatIdx:gateAt}),
  };
}
const a=(count:number)=>new Array<number>(count).fill(0);
const b=(count:number)=>new Array<number>(count).fill(1);

describe('original Gates of Olympus pinned mechanics',()=>{
  it('pins the original6x5/15spin/500x/5000x variant and published pay classes',()=>{
    expect([cfg.cols,cfg.rows,cfg.payAnywhereThreshold,cfg.freeSpinsAwardOnTrigger,cfg.freeSpinsAwardOnRetrigger,cfg.maxWinMultiplier]).toEqual([6,5,8,15,5,5000]);
    expect(cfg.ante.betMultiplier).toBe(1.25);expect(cfg.buyBonusCost).toBe(100);expect(cfg.buyTriggerScatters).toBe(4);
    expect(cfg.symbols.map(symbol=>symbol.payout)).toEqual([
      {8:10,10:25,12:50},{8:2.5,10:10,12:25},{8:2,10:5,12:15},{8:1.5,10:2,12:12},
      {8:1,10:1.5,12:10},{8:.8,10:1.2,12:8},{8:.5,10:1,12:5},{8:.4,10:.9,12:4},{8:.25,10:.75,12:2},{4:3,5:5,6:100},
    ]);
    expect(Math.max(...cfg.multiplierTableFree.values.map(([value])=>value))).toBe(500);
  });
  it('applies late multipliers to the sum of several cascades only once',()=>{
    // Initial9 A: one orb leaves8 winners; refill8 A: another orb leaves7.
    // A7 fixture allows second win; following B refill ends the sequence.
    const c: SlotConfig={...fixture,payAnywhereThreshold:7,symbols:[{...fixture.symbols[0]!,payout:{7:1}},...fixture.symbols.slice(1)]};
    const r=spin(sequenceRng([...a(17),...b(7)]),c,{bet:1,ante:false},'base');
    expect(r.frames.filter(frame=>frame.kind==='wins')).toHaveLength(2);
    const applied=r.frames.find(frame=>frame.kind==='multiplierApplied');
    expect(applied).toEqual({kind:'multiplierApplied',sumOfMultipliers:6,preMultiplierPayout:2,finalPayout:12});
    expect(r.totalPayout).toBe(12);
  });
  it('adds multiple tokens on the same landing rather than multiplying token values',()=>{
    const c: SlotConfig={...fixture,cols:4,rows:3,multiplierTableBase:{pPerTumble:1,maxPerTumble:2,values:[[2,1]]}};
    let ints=0,nexts=0;
    const r=spin({...sequenceRng([...a(12),...b(10)]),next:()=>nexts++%2===0?0:.9,nextInt:n=>[0,0,1,0][ints++%4]!%n},c,{bet:1,ante:false},'base');
    expect(r.frames.find(frame=>frame.kind==='multipliersLanded')).toMatchObject({landings:[{value:2},{value:2}]});
    expect(r.frames.find(frame=>frame.kind==='multiplierApplied')).toMatchObject({sumOfMultipliers:8,preMultiplierPayout:1,finalPayout:8});
  });
  it('retains carry through a zero-paying retrigger and later adds new winning multipliers',()=>{
    const symbols=[...a(9),...b(8),2,2,2,...b(6),...a(9),...b(8)];
    const r=playRound(sequenceRng(symbols),fixture,{bet:1,ante:false},'free',3);
    expect(r.freeSpinsAwarded).toBe(8);
    expect(r.frames.filter(frame=>frame.kind==='initialDrop')).toHaveLength(8);
    expect(r.frames.filter(frame=>frame.kind==='freeSpinsAwarded')).toEqual([{kind:'freeSpinsAwarded',count:5,reason:'retrigger'}]);
    expect(r.frames.filter(frame=>frame.kind==='multiplierApplied').map(frame=>frame.kind==='multiplierApplied'?frame.sumOfMultipliers:0)).toEqual([4,8]);
    expect(r.totalPayout).toBe(12);
    expect(r.frames.at(-1)).toEqual({kind:'freeSpinsEnd',totalPayout:12});
  });
  it('does not bank multiplier symbols from losing spins',()=>{
    const losing=spin(sequenceRng(b(9)),fixture,{bet:1,ante:false},'free',5000,7);
    expect(losing.totalPayout).toBe(0);expect(losing.featureMultiplier).toBe(7);
    const noToken=spin(sequenceRng([...a(9),...b(9)],[1,1]),fixture,{bet:1,ante:false},'free',5000,7);
    expect(noToken.totalPayout).toBe(1);expect(noToken.featureMultiplier).toBe(7);
    expect(noToken.frames.some(frame=>frame.kind==='multiplierApplied')).toBe(false);
  });
  it('scatters pay once separately and award15 spins from4 or more',()=>{
    for(const count of [4,5,6]){
      const symbols=[...new Array<number>(count).fill(2),...b(9-count)];
      const r=spin(sequenceRng(symbols),fixture,{bet:2,ante:false},'base');
      expect(r.frames.filter(frame=>frame.kind==='scattersWon')).toEqual([{kind:'scattersWon',count,payout:({4:3,5:5,6:100}[count as 4|5|6])*2}]);
      expect(r.freeSpinsAwarded).toBe(15);
    }
  });
  it('retains scatter pay on free spins independently of orb multiplication',()=>{
    const r=spin(sequenceRng([2,2,2,2,...b(5)]),fixture,{bet:2,ante:false},'free',10000,7);
    expect(r.totalPayout).toBe(6);expect(r.featureMultiplier).toBe(7);
    expect(r.frames.filter(frame=>frame.kind==='scattersWon')).toEqual([{kind:'scattersWon',count:4,payout:6}]);
  });
  it('clamps whole round and stops remaining spins after a cumulative win reaches5000x',()=>{
    const c={...fixture,maxWinMultiplier:6};
    const r=playRound(sequenceRng([...a(9),...b(8),...a(9),...b(8)]),c,{bet:1,ante:false},'free',15);
    expect(r.totalPayout).toBe(6);expect(r.frames.filter(frame=>frame.kind==='initialDrop')).toHaveLength(2);
    expect(r.frames.filter(frame=>frame.kind==='final')).toEqual([{kind:'final',spinPayout:4,runningPayout:4},{kind:'final',spinPayout:2,runningPayout:6}]);
  });
  it('buy preserves one entry and deterministic complete accounting',()=>{
    const r=buyBonusRound(createRng('olympus-buy-fixture','audit',1),cfg,{bet:2,ante:false});
    expect(r).toEqual(buyBonusRound(createRng('olympus-buy-fixture','audit',1),cfg,{bet:2,ante:false}));
    expect(r.frames.filter(frame=>frame.kind==='freeSpinsBegin')).toEqual([{kind:'freeSpinsBegin',total:15}]);
    expect(r.frames.filter(frame=>frame.kind==='initialDrop').length).toBe(r.freeSpinsAwarded+1);
  });
});
