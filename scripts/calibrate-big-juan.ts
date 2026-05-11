/* Calibration script for Big Juan engine. Run N spins, print the
 * realised RTP. Used to tune the bonus weights toward the published
 * 96.70% target. Not part of the production build.
 *
 *   npx tsx scripts/calibrate-big-juan.ts
 */
import { createRng } from '../src/lib/fairness';
import {
  play,
  resolveRespin,
  rollRespin,
} from '../src/pages/slots/big-juan/engine';

const N = 200_000;
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
    // Simulate bonus
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
    totalBonus += cum;
    maxBonus = Math.max(maxBonus, cum);
    bonusHistogram.push(cum);
  }
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
console.log(`  Trigger rate          : ${(triggerRate * 100).toFixed(3)}% (target ~0.5%)`);
console.log(`  Wild Switch rate      : ${(switchRate * 100).toFixed(2)}% (target 1-2.5%)`);
console.log(`  Bonuses simulated     : ${triggers.toLocaleString()}`);
console.log(`  Avg bonus payout      : ${avgBonus.toFixed(1)}× (target ~80-120×)`);
console.log(`  Max bonus seen        : ${maxBonus.toFixed(1)}×`);
console.log('  Bonus distribution    :');
for (let i = 0; i < buckets.length; i++) {
  const lo = buckets[i]!;
  const hi = buckets[i + 1] ?? Infinity;
  const range = hi === Infinity ? `${lo}+` : `${lo}-${hi}`;
  const pct = triggers > 0 ? (counts[i] / triggers * 100).toFixed(1) : '0.0';
  console.log(`    ${range.padEnd(12)} : ${counts[i].toString().padStart(5)} (${pct}%)`);
}
