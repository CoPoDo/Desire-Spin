import payoutCapture from '../docs/mechanics-sources/stake-payout-tables-2026-10-08.json?raw';
import kenoCapture from '../docs/mechanics-sources/stake-keno-tables-2026-10-08.json?raw';
import { KENO_TABLES } from '../src/pages/originals/keno/engine';
import { PLINKO_TABLES } from '../src/pages/originals/plinko/engine';
import { CASE_POOLS } from '../src/pages/originals/cases/engine';
import * as Roulette from '../src/pages/originals/roulette/engine';
import auditDoc from '../docs/MECHANICS_AUDIT_2026-10-08.md?raw';
import { GAME_REFERENCES } from '../src/games/references';
import * as RPS from '../src/pages/originals/rps/engine';
import * as SicBo from '../src/pages/originals/sicbo/engine';
import * as Aviator from '../src/pages/originals/aviator/engine';
import * as Crash from '../src/pages/originals/crash/engine';
import * as Bass from '../src/pages/originals/big-bass/engine';
import { sweetBonanzaConfig } from '../src/pages/slots/sweet-bonanza/config';
import { describe, expect, it } from 'vitest';
import { createRng, type Rng } from '../src/lib/fairness';
import { buyLineBonusRound, detectWantedBonus, evaluateLineWins, resolveWantedDuels, spinLineSlot, playLineRound, WANTED_BONUSES, WANTED_DUEL_MULTIPLIERS, type LineSlotProfile } from '../src/pages/slots/_shared/lineEngine';
import { WANTED_PROFILE } from '../src/pages/slots/wanted-wild';
import { WOLF_PROFILE } from '../src/pages/slots/wolf-gold';
import { playSugarRound, playSugarSpin } from '../src/pages/slots/sugar-rush/engine';
import { spin, buyBonusRound } from '../src/pages/slots/_shared/engine';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';
import type { SlotConfig } from '../src/pages/slots/_shared/types';
import { multipliersFor } from '../src/pages/originals/wheel/engine';
import { multiplierAfter, FLIP_MAX_MULTIPLIER, MAX_FLIPS } from '../src/pages/originals/coin-flip/engine';
import { rollDice } from '../src/pages/originals/dice/engine';
import { payForRank } from '../src/pages/originals/video-poker/engine';

const fixed = (weighted: Rng['weighted'] = () => 0, next: Rng['next'] = () => .99): Rng => ({ weighted, next, nextInt: () => 0, state: () => ({ nonce: 0, cursor: 0, floatIdx: 0 }) });
const simple: LineSlotProfile = { id: 'wanted-test', cols: 5, rows: 1, paylines: [[0, 0, 0, 0, 0]], symbols: [{id:'a',weight:1,pay:{3:1,5:2}},{id:'b',weight:1},{id:'wild',weight:0,wild:true},{id:'vs',weight:0}], wildId:'wild',maxWin:12500,feature:'wanted',freeSpins:10 };

describe('source-backed Wanted mechanics', () => {
  it('has separate naturally triggered bonuses and documented purchase prices', () => {
    expect(WANTED_BONUSES.map(x => [x.id,x.costMultiplier])).toEqual([['train-robbery',80],['duel-at-dawn',200],['dead-mans-hand',400]]);
    expect(detectWantedBonus(WANTED_PROFILE,['poster','poster','poster'])).toBe('train-robbery');
    expect(detectWantedBonus(WANTED_PROFILE,['duel','duel','duel'])).toBe('duel-at-dawn');
    expect(detectWantedBonus(WANTED_PROFILE,['dead','dead','dead'])).toBe('dead-mans-hand');
    expect(detectWantedBonus(WANTED_PROFILE,['poster','duel','dead'])).toBeUndefined();
  });
  it('only expands VS reels that can participate in a winning payline', () => {
    expect(resolveWantedDuels(fixed(),simple,['vs','b','a','b','a'],1).grid[0]).toBe('vs');
    const result = resolveWantedDuels(fixed(),simple,['vs','a','a','b','b'],1);
    expect(result.grid[0]).toBe('wild'); expect(result.reelMultipliers[0]).toBe(2);
    expect(evaluateLineWins(simple,result.grid,1,result.reelMultipliers)[0]!.payout).toBe(2);
  });
  it('adds participating reel multipliers rather than multiplying them', () => {
    expect(evaluateLineWins(simple,['wild','wild','a','b','b'],1,[3,5,0,0,0])[0]!.payout).toBe(8);
    expect(WANTED_DUEL_MULTIPLIERS).toEqual([2,3,4,5,6,7,8,9,10,20,25,50,100]);
  });
  it('retains individual Train Wild cells and does not create forced full wild reels', () => {
    const r = spinLineSlot(fixed(),simple,1,'free','train-robbery',{bonus:'train-robbery',phase:'free-spins',stickyWilds:[3],collectedWilds:0,collectedMultiplier:1});
    expect(r.grid).toEqual(['a','a','a','wild','a']);
    expect(r.wantedState?.stickyWilds).toEqual([3]);
  });
  it('precomputes and deterministically settles each bought feature once', () => {
    for(const bonus of WANTED_BONUSES) {
      const r = buyLineBonusRound(createRng('wanted-buy','audit',4),WANTED_PROFILE,2,bonus.id);
      expect(r.purchaseCost).toBe(2*bonus.costMultiplier);
      expect(r.spins.every(x=>x.free)).toBe(true);
      expect(r.totalPayout).toBeCloseTo(r.spins.reduce((s,x)=>s+x.result.payout,0),2);
      expect(r.totalPayout).toBeLessThanOrEqual(25000);
      expect(r).toEqual(buyLineBonusRound(createRng('wanted-buy','audit',4),WANTED_PROFILE,2,bonus.id));
    }
  });
  it('ends Dead collection after 3 misses, then plays exactly 3 Showdown spins', () => {
    const r=buyLineBonusRound(fixed(),simple,1,'dead-mans-hand');
    expect(r.spins.filter(x=>x.result.wantedState?.phase==='collect')).toHaveLength(3);
    expect(r.spins.filter(x=>x.result.wantedState?.phase==='showdown')).toHaveLength(3);
    expect(r.freeSpinsAwarded).toBe(3);
  });
  it('caps Dead collections at20 Wilds and31x even with pathological collect RNG', () => {
    let calls=0;
    const rng=fixed(()=>0,()=>calls++<25?.03:0);
    const r=buyLineBonusRound(rng,WANTED_PROFILE,1,'dead-mans-hand');
    const frames=r.spins.filter(x=>x.result.wantedState?.phase==='collect');
    expect(frames.at(-1)?.result.wantedState?.collectedWilds).toBe(20);
    expect(frames.every(x=>(x.result.wantedState?.collectedMultiplier??0)<=31)).toBe(true);
    expect(frames.at(-1)?.result.wantedState?.respinsRemaining).toBe(0);
  });
  it('base play ignores an old preselected feature option', () => {
    expect(playLineRound(createRng('wanted-natural','audit',0),WANTED_PROFILE,1,'train-robbery')).toEqual(playLineRound(createRng('wanted-natural','audit',0),WANTED_PROFILE,1,'dead-mans-hand'));
  });
});

describe('source-backed slot corrections',()=>{
  it('Wolf free spins always combine the central3x3 into one symbol',()=>{
    for(let nonce=0;nonce<30;nonce++) {
      const r=spinLineSlot(createRng('wolf-giant','audit',nonce),WOLF_PROFILE,1,'free');
      expect(new Set(r.grid.filter((_,i)=>i%5>=1&&i%5<=3)).size).toBe(1);
    }
  });
  it('Wolf retriggers award3 spins and full-screen Mega is added to money awards',()=>{
    const scatters: LineSlotProfile={...simple,feature:'wolf',scatterId:'s',freeSpins:5,symbols:[{id:'s',weight:1,scatter:true}]};
    expect(spinLineSlot(fixed(),scatters,1,'free').freeSpinsAwarded).toBe(3);
    const money: LineSlotProfile={...simple,feature:'wolf',rows:3,symbols:[{id:'money',weight:1,money:true}]};
    expect(spinLineSlot(fixed(),money,1).payout).toBe(1015);
  });
  it('Sugar first hits only mark cells; later hits establish2x then double',()=>{
    const r=playSugarSpin(fixed(()=>6),1);
    const wins=r.frames.filter(f=>f.winningPositions.length);
    expect(wins[0]!.marked.every(Boolean)).toBe(true);
    expect(wins[0]!.spots.every(x=>x===0)).toBe(true);
    expect(wins[1]!.spots.every(x=>x===2)).toBe(true);
    expect(wins[2]!.spots.every(x=>x===4)).toBe(true);
    const round=playSugarRound(createRng('sugar-persistence','audit',2),1,true);
    for(let i=2;i<round.spins.length;i++) expect(round.spins[i]!.result.frames[0]!.marked).toEqual(round.spins[i-1]!.result.marked);
  });
  it('Gates multiplies the whole tumble and carries winning multipliers only',()=>{
    const cfg: SlotConfig={...gatesOfOlympusConfig,cols:3,rows:3,symbols:[{id:'a',tier:'low' as const,label:'A',payout:{8:1}},{id:'b',tier:'low' as const,label:'B',payout:{}}],weightsBase:[1,1],weightsFree:[1,1],scatterId:'none',multiplierTableBase:{pPerTumble:1,maxPerTumble:1,values:[[2,1] as [number,number]]},multiplierTableFree:{pPerTumble:1,maxPerTumble:1,values:[[2,1] as [number,number]]}};
    const rng=()=>{let symbols=0;return fixed(w=>w.length===1?0:symbols++<9?0:1,()=>0);};
    const base=spin(rng(),cfg,{bet:1,ante:false},'base');
    expect(base.totalPayout).toBe(4);
    const free=spin(rng(),cfg,{bet:1,ante:false},'free',5000,7);
    expect(free.featureMultiplier).toBe(11);expect(free.totalPayout).toBe(11);
    const noTokens=spin(rng(),{...cfg,multiplierTableFree:{...cfg.multiplierTableFree,pPerTumble:0}},{bet:1,ante:false},'free',5000,7);
    expect(noTokens.featureMultiplier).toBe(7);expect(noTokens.totalPayout).toBe(1);
  });
});

describe('source-backed Originals corrections',()=>{
  it('Wheel matches public low topology and distinct larger medium tables',()=>{
    expect(multipliersFor('low',10)).toEqual([1.5,1.2,1.2,1.2,0,1.2,1.2,1.2,1.2,0]);
    expect(multipliersFor('medium',20)).toContain(1.8);
    expect(multipliersFor('medium',30)).toContain(1.7);
    expect(multipliersFor('medium',40)).toContain(1.6);
    expect(multipliersFor('medium',50)).toContain(5);
  });
  it('Dice includes100.00 as a possible outcome',()=>{
    expect(rollDice({...fixed(),nextInt:n=>n-1})).toBe(100);
  });
  it('Flip applies one2% edge and ends at20 successful flips',()=>{
    expect(MAX_FLIPS).toBe(20);expect(FLIP_MAX_MULTIPLIER).toBe(1027604.48);
    for(let n=1;n<=20;n++) expect(multiplierAfter(n)/2**n).toBeCloseTo(.98,10);
    expect(multiplierAfter(21)).toBe(FLIP_MAX_MULTIPLIER);
  });
  it('Video Poker pins Stake22x quads and60x straight flush',()=>{
    expect(payForRank('four-of-a-kind')).toBe(22);expect(payForRank('straight-flush')).toBe(60);expect(payForRank('royal-flush')).toBe(800);
  });
});

describe('complete audit follow-through', () => {
  it('RPS tie preserves the round, cashout preserves the original stake, loss settles zero', () => {
    let round = RPS.createRpsRound(2);
    round = RPS.advanceRpsRound(round, 'rock', 'rock');
    expect(round).toMatchObject({ bet: 2, wins: 0, throws: 1, done: false, payout: 0 });
    expect(RPS.cashOutRpsRound(round)).toBe(round);
    round = RPS.advanceRpsRound(round, 'rock', 'scissors');
    expect(round.lastResult?.multiplier).toBe(1.96);
    round = RPS.advanceRpsRound(round, 'paper', 'paper');
    expect(round.wins).toBe(1);
    expect(RPS.cashOutRpsRound(round).payout).toBe(3.92);
    expect(RPS.advanceRpsRound(round, 'rock', 'paper')).toMatchObject({ done: true, payout: 0 });
  });
  it('RPS caps at twenty wins without capping tied manual throws', () => {
    let round = RPS.createRpsRound(1);
    for (let index = 0; index < 80; index++) round = RPS.advanceRpsRound(round, 'rock', 'rock');
    expect(round.done).toBe(false);
    for (let wins = 1; wins <= 20; wins++) {
      round = RPS.advanceRpsRound(round, 'rock', 'scissors');
      expect(RPS.multiplierAfterWins(wins) / 2 ** wins).toBeCloseTo(.98, 10);
    }
    expect(round).toMatchObject({ wins: 20, throws: 100, done: true, payout: 1027604.48 });
    expect(RPS.advanceRpsRound(round, 'rock', 'paper')).toBe(round);
    expect(RPS.cashOutRpsRound(round)).toBe(round);
  });
  it('Sic Bo masks enumerate every triple correctly across all216 dice outcomes', () => {
    let small = 0, big = 0, odd = 0, even = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) {
      const roll: SicBo.Roll = [a, b, c];
      small += SicBo.payoutMultiplier({ kind: 'small' }, roll) > 0 ? 1 : 0;
      big += SicBo.payoutMultiplier({ kind: 'big' }, roll) > 0 ? 1 : 0;
      odd += SicBo.payoutMultiplier({ kind: 'odd' }, roll) > 0 ? 1 : 0;
      even += SicBo.payoutMultiplier({ kind: 'even' }, roll) > 0 ? 1 : 0;
      if (a === b && b === c) {
        expect(SicBo.payoutMultiplier({ kind: 'small' }, roll)).toBe(0);
        expect(SicBo.payoutMultiplier({ kind: 'big' }, roll)).toBe(0);
        if (a >= 2 && a <= 5) expect(SicBo.payoutMultiplier({ kind: 'total', sum: a * 3 }, roll)).toBeGreaterThan(0);
      }
    }
    expect({ small, big, odd, even }).toEqual({ small: 105, big: 105, odd: 105, even: 105 });
  });
  it('Sweet Bonanza uses the original14 multiplier values with100x top', () => {
    expect(sweetBonanzaConfig.multiplierTableFree.values.map(([value]) => value)).toEqual([2,3,5,8,10,12,15,18,20,25,30,35,50,100]);
  });
  it('Big Bass includes the published2000x money value', () => {
    expect(Math.max(...Bass.MONEY_VALUES.map(([value]) => value))).toBe(2000);
  });
  it('Aviator separates its97% model and cap from Stake Crash', () => {
    expect(Aviator.rollCrash({ ...fixed(), next: () => .5 })).toBe(1.94);
    expect(Aviator.rollCrash({ ...fixed(), next: () => 0 })).toBe(25000);
    expect(Crash.rollBust({ ...fixed(), next: () => .5 })).toBe(1.98);
    expect(Crash.rollBust({ ...fixed(), next: () => 0 })).toBe(1000000);
  });
  it('the source inventory covers each of the34 retained routes once', () => {
    const doc = auditDoc;
    expect(GAME_REFERENCES).toHaveLength(34);
    for (const entry of GAME_REFERENCES) expect(doc.split('`' + entry.route + '`').length - 1).toBe(1);
  });
});


describe('captured primary-source payout fixtures', () => {
  it('preserves every value from all36 observed Plinko rows', () => {
    const capture = JSON.parse(payoutCapture).plinko;
    for (const [source, local] of [['Low','easy'],['Medium','medium'],['High','hard'],['Expert','expert']] as const) {
      expect(PLINKO_TABLES[local]).toEqual(capture[source]);
    }
  });
  it('preserves every value from all40 observed Keno rows', () => {
    const capture = JSON.parse(kenoCapture).tables;
    for (const [source, local] of [['Classic','classic'],['Low','low'],['Medium','medium'],['High','high']] as const) {
      expect(KENO_TABLES[local]).toEqual(capture[source]);
    }
    expect(KENO_TABLES.classic[1]).toEqual([0,3.96]);
    expect(KENO_TABLES.low[1]).toEqual([.7,1.85]);
  });
  it('preserves Cases payouts and cumulative probability thresholds', () => {
    const capture = JSON.parse(payoutCapture).cases as Record<string,string>;
    for (const risk of ['easy','medium','hard','expert'] as const) {
      const rows=capture[risk]!.split('\n').slice(1);
      let cumulative=0;
      expect(CASE_POOLS[risk]).toHaveLength(rows.length);
      rows.forEach((row,index)=>{
        const [range,payout]=row.split('\t');
        cumulative+=CASE_POOLS[risk][index]!.weight;
        expect(CASE_POOLS[risk][index]!.multiplier).toBe(Number(payout));
        expect(cumulative/1_000_000).toBeCloseTo(Number(range!.split(' - ')[1]),8);
      });
    }
  });
  it('covers all60 legal splits and22 legal corners with36/37 expected return', () => {
    expect(Roulette.SPLIT_BETS).toHaveLength(60);expect(Roulette.CORNER_BETS).toHaveLength(22);
    const bets: Roulette.BetType[]=[...Roulette.SPLIT_BETS.map(numbers=>({kind:'split' as const,numbers})),...Roulette.CORNER_BETS.map(numbers=>({kind:'corner' as const,numbers})),{kind:'trio',numbers:[0,1,2]},{kind:'trio',numbers:[0,2,3]},{kind:'first-four'}];
    for (const bet of bets) expect(Array.from({length:37},(_,n)=>Roulette.payoutMultiplier(bet,n)).reduce((a,b)=>a+b,0)).toBe(36);
    expect(Roulette.payoutMultiplier({kind:'split',numbers:[1,36]},1)).toBe(0);
    expect(Roulette.payoutMultiplier({kind:'corner',numbers:[1,2,3,4]},1)).toBe(0);
    expect(Roulette.payoutMultiplier({kind:'split',numbers:[1,1]},1)).toBe(0);
  });
  it('Gates purchase has a guaranteed4-scatter paid entry before its15-spin feature', () => {
    const result=buyBonusRound(createRng('gate-entry','audit',1),gatesOfOlympusConfig,{bet:2,ante:false});
    const initial=result.frames.find(frame=>frame.kind==='initialDrop');
    expect(initial?.kind==='initialDrop'&&initial.grid.flat().filter(cell=>cell.symbolId===gatesOfOlympusConfig.scatterId)).toHaveLength(4);
    const begin=result.frames.findIndex(frame=>frame.kind==='freeSpinsBegin');
    expect(result.frames.slice(0,begin).some(frame=>frame.kind==='scattersWon'&&frame.payout>=6)).toBe(true);
    expect(result.frames[begin]).toEqual({kind:'freeSpinsBegin',total:15});
    expect(result.totalPayout).toBeCloseTo(result.frames.filter(frame=>frame.kind==='final').reduce((sum,frame)=>sum+(frame.kind==='final'?frame.spinPayout:0),0),2);
  });
});

it('Sic Bo offers every two-distinct-face combination with exactly30 winning dice outcomes', () => {
  expect(SicBo.TWO_DICE_COMBINATIONS).toHaveLength(15);
  expect(new Set(SicBo.TWO_DICE_COMBINATIONS.map(pair => pair.join(','))).size).toBe(15);
  for (const faces of SicBo.TWO_DICE_COMBINATIONS) {
    let winning = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) {
      const multiplier = SicBo.payoutMultiplier({ kind: 'combination', faces }, [a, b, c]);
      expect(multiplier).toBe([a,b,c].includes(faces[0]) && [a,b,c].includes(faces[1]) ? 7 : 0);
      if (multiplier > 0) winning++;
    }
    expect(winning).toBe(30);
  }
  expect(SicBo.payoutMultiplier({ kind:'combination',faces:[1,1]},[1,1,1])).toBe(0);
  expect(SicBo.payoutMultiplier({ kind:'combination',faces:[0,2]},[1,2,3])).toBe(0);
});
