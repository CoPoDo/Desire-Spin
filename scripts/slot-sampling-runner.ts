import { createRng, type Rng } from '../src/lib/fairness';
import { buyLineBonusRound, playLineRound, spinLineSlot, WANTED_BONUSES } from '../src/pages/slots/_shared/lineEngine';
import { WANTED_PROFILE } from '../src/pages/slots/wanted-wild';
import { WOLF_PROFILE } from '../src/pages/slots/wolf-gold';
import { playSugarRound } from '../src/pages/slots/sugar-rush/engine';
import * as Juan from '../src/pages/slots/big-juan/engine';
import * as Bass from '../src/pages/originals/big-bass/engine';
import { samplingRng, summarizeSample } from '../tests/slot-sampling-math';

type Observation = { payout: number; triggered?: boolean; capped?: boolean; freeSpins?: number; noTrainWilds?: boolean };
type Scenario = { id: string; group: string; cost: number; kind: 'base' | 'buy' | 'conditional-free-spin'; play: (rng: Rng) => Observation };
const scenarios: Scenario[] = [
  { id: 'wanted-base', group: 'wanted', cost: 1, kind: 'base', play: (rng) => { const r = playLineRound(rng, WANTED_PROFILE, 1); return { payout: r.totalPayout, triggered: !!r.bonus, capped: r.capped, freeSpins: r.freeSpinsAwarded }; } },
  ...WANTED_BONUSES.map((bonus): Scenario => ({ id: `wanted-${bonus.id}`, group: 'wanted', cost: bonus.costMultiplier, kind: 'buy', play: (rng) => { const r = buyLineBonusRound(rng, WANTED_PROFILE, 1, bonus.id); return { payout: r.totalPayout, capped: r.capped, freeSpins: r.freeSpinsAwarded, ...(bonus.id === 'train-robbery' ? { noTrainWilds: r.spins.every((spin) => !spin.result.wantedState?.stickyWilds.length) } : {}) }; } })),
  { id: 'wolf-base', group: 'wolf', cost: 1, kind: 'base', play: (rng) => { const r = playLineRound(rng, WOLF_PROFILE, 1); return { payout: r.totalPayout, triggered: r.freeSpinsAwarded > 0, capped: r.capped, freeSpins: r.freeSpinsAwarded }; } },
  { id: 'wolf-free-spin', group: 'wolf', cost: 1, kind: 'conditional-free-spin', play: (rng) => { const r = spinLineSlot(rng, WOLF_PROFILE, 1, 'free'); return { payout: r.payout, triggered: r.freeSpinsAwarded > 0, capped: r.payout >= WOLF_PROFILE.maxWin, freeSpins: r.freeSpinsAwarded }; } },
  ...[false, true].map((buy): Scenario => ({ id: `sugar-${buy ? 'buy' : 'base'}`, group: 'sugar', cost: buy ? 100 : 1, kind: buy ? 'buy' : 'base', play: (rng) => { const r = playSugarRound(rng, 1, buy); return { payout: r.totalPayout, triggered: r.freeSpinsAwarded > 0, capped: r.capped, freeSpins: r.freeSpinsAwarded }; } })),
  { id: 'big-juan-base', group: 'juan', cost: 1, kind: 'base', play: (rng) => { const r = Juan.play(rng); const feature = r.triggersBonus ? Juan.simulateRespinRound(rng, r.respinsAwarded, r.baseMultiplier) : undefined; return { payout: r.baseMultiplier + (feature?.totalMultiplier ?? 0), triggered: r.triggersBonus, capped: feature?.cappedAtMax }; } },
  { id: 'big-juan-buy', group: 'juan', cost: 100, kind: 'buy', play: (rng) => { const entry = Juan.rollBonusBuyEntry(rng); const r = Juan.simulateRespinRound(rng, entry.respinsAwarded); return { payout: r.totalMultiplier, capped: r.cappedAtMax }; } },
  ...[false, true].map((buy): Scenario => ({ id: `big-bass-${buy ? 'buy' : 'base'}`, group: 'bass', cost: buy ? 100 : 1, kind: buy ? 'buy' : 'base', play: (rng) => { const r = Bass.planRound(rng, 1, buy); return { payout: r.totalPayout, triggered: r.bonusAward > 0, capped: r.capped, freeSpins: r.feature.length }; } })),
];

export function runSampling(options: { baseRounds: number; buyRounds: number; seeds: number[]; rng: string; only?: string[]; scenarios?: string[] }) {
  if (!['hmac', 'mulberry32'].includes(options.rng)) throw new RangeError('Unknown benchmark RNG');
  const results = [];
  const pooled = [];
  for (const scenario of scenarios.filter((entry) => (!options.only || options.only.includes(entry.group)) && (!options.scenarios || options.scenarios.includes(entry.id)))) {
    const allPayouts: number[] = [];
    let totalTriggers = 0;
    let totalCaps = 0;
    const start = performance.now();
    for (const seed of options.seeds) {
      const rounds = scenario.kind === 'buy' ? options.buyRounds : options.baseRounds;
      const fastRng = samplingRng(seed);
      const payouts: number[] = [];
      let triggers = 0, caps = 0, freeSpins = 0, noTrainWilds = 0;
      for (let nonce = 0; nonce < rounds; nonce++) {
        const rng = options.rng === 'hmac' ? createRng(`slot-benchmark-${seed}`, scenario.id, nonce) : fastRng;
        const result = scenario.play(rng);
        if (!Number.isFinite(result.payout) || result.payout < 0) throw new Error(`Invalid ${scenario.id} payout`);
        payouts.push(result.payout);
        triggers += result.triggered ? 1 : 0;
        caps += result.capped ? 1 : 0;
        freeSpins += result.freeSpins ?? 0;
        noTrainWilds += result.noTrainWilds ? 1 : 0;
      }
      const row = { scenario: scenario.id, kind: scenario.kind, seed, ...summarizeSample(payouts, scenario.cost), triggers, caps, meanAwardedFreeSpins: freeSpins / rounds, ...(scenario.id.endsWith('train-robbery') ? { noTrainWildsFraction: noTrainWilds / rounds } : {}) };
      results.push(row);
      for (const payout of payouts) allPayouts.push(payout);
      totalTriggers += triggers; totalCaps += caps;
      console.log(`${row.scenario} seed=${seed} n=${rounds} return=${(row.returnFraction * 100).toFixed(3)}% SE=${(row.standardError * 100).toFixed(3)}pp cap=${caps}`);
    }
    pooled.push({ scenario: scenario.id, kind: scenario.kind, ...summarizeSample(allPayouts, scenario.cost), triggers: totalTriggers, caps: totalCaps, elapsedSeconds: (performance.now() - start) / 1000 });
  }
  if (!pooled.length) throw new RangeError('No benchmark scenarios selected');
  return { methodology: { ...options, baseBet: 1, fullBaseCyclesIncludeTriggeredFeatures: true, conditionalFreeSpinIsNotRTP: true, certifiedProviderProbabilities: false, normalIntervalsMayMissUnsampledRareTails: true }, results, pooled };
}
