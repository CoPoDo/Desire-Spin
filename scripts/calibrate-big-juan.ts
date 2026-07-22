/* Calibration script for Big Juan engine. Run N spins, print the
 * realised RTP. Used to tune the bonus weights toward the published
 * 96.70% target. Not part of the production build.
 *
 *   npx tsx scripts/calibrate-big-juan.ts
 */
import { createRng } from '../src/lib/fairness';
import {
  play,
  rollBonusBuyEntry,
  simulateRespinRound,
} from '../src/pages/slots/big-juan/engine';

const N = Number(process.env.BJ_CALIBRATION_SPINS ?? 200_000);
let totalBase = 0;
let totalBonus = 0;
let triggers = 0;
let switchHits = 0;
let maxBonus = 0;
const bonusHistogram: number[] = [];

for (let i = 0; i < N; i++) {
  const rng = createRng('calib', 'c', i);
  const r = play(rng);
  totalBase += r.baseMultiplier;
  if (r.wildSwitch.switched) switchHits++;
  if (r.triggersBonus) {
    triggers++;
    const award = r.scatterCount === 3 ? 10 : r.scatterCount === 4 ? 12 : 15;
    const cum = simulateRespinRound(rng, award, r.baseMultiplier).totalMultiplier;
    totalBonus += cum;
    maxBonus = Math.max(maxBonus, cum);
    bonusHistogram.push(cum);
  }
}

let totalBuyPayout = 0;
for (let i = 0; i < N; i++) {
  const rng = createRng('calib-buy', 'c', i);
  const entry = rollBonusBuyEntry(rng);
  totalBuyPayout += simulateRespinRound(rng, entry.respinsAwarded).totalMultiplier;
}

const rtpBase = totalBase / N;
const rtpBonus = totalBonus / N;
const rtpTotal = rtpBase + rtpBonus;
const triggerRate = triggers / N;
const switchRate = switchHits / N;
const avgBonus = triggers > 0 ? totalBonus / triggers : 0;

// Bonus histogram buckets
const buckets = [0, 10, 25, 50, 100, 250, 500, 1000, 2600];
const counts = new Array(buckets.length).fill(0);
for (const b of bonusHistogram) {
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (b >= buckets[i]!) { counts[i]++; break; }
  }
}

console.log(`Big Juan calibration — N=${N.toLocaleString()}`);
console.log('────────────────────────────────────────');
console.log(`  RTP (base only)       : ${(rtpBase * 100).toFixed(2)}%`);
console.log(`  RTP (bonus contrib)   : ${(rtpBonus * 100).toFixed(2)}%`);
console.log(`  RTP (total)           : ${(rtpTotal * 100).toFixed(2)}%`);
console.log(`  Bonus Buy RTP         : ${(totalBuyPayout / N).toFixed(2)}%`);
console.log(`  Trigger rate          : ${(triggerRate * 100).toFixed(3)}% (local analytic ~0.489%)`);
console.log(`  Wild Switch rate      : ${(switchRate * 100).toFixed(2)}% (local calibration ~0.574%)`);
console.log(`  Bonuses simulated     : ${triggers.toLocaleString()}`);
console.log(`  Avg bonus payout      : ${avgBonus.toFixed(1)}× (local calibration ~71.2×)`);
console.log(`  Max bonus seen        : ${maxBonus.toFixed(1)}×`);
console.log('  Bonus distribution    :');
for (let i = 0; i < buckets.length; i++) {
  const lo = buckets[i]!;
  const hi = buckets[i + 1] ?? Infinity;
  const range = hi === Infinity ? `${lo}+` : `${lo}-${hi}`;
  const pct = triggers > 0 ? (counts[i] / triggers * 100).toFixed(1) : '0.0';
  console.log(`    ${range.padEnd(12)} : ${counts[i].toString().padStart(5)} (${pct}%)`);
}
