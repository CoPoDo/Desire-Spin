import type { Rng } from '../src/lib/fairness';

/** Mulberry32 is a reproducible Monte Carlo source, NOT the app's HMAC RNG.
 * It only runs in this offline benchmark. Engine payout rules are unchanged. */
export function samplingRng(seed: number): Rng {
  let state = seed >>> 0;
  let draws = 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    draws++;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  return {
    next,
    nextInt: (max) => Math.floor(next() * max),
    weighted(weights) {
      let remaining = next() * weights.reduce((sum, weight) => sum + weight, 0);
      for (let index = 0; index < weights.length; index++) {
        remaining -= weights[index]!;
        if (remaining < 0) return index;
      }
      return weights.length - 1;
    },
    state: () => ({ nonce: seed, cursor: Math.floor(draws / 8), floatIdx: draws % 8 }),
  };
}

export function summarizeSample(payouts: readonly number[], cost: number) {
  if (payouts.length < 2 || !Number.isFinite(cost) || cost <= 0) throw new RangeError('Sample needs at least two rounds and positive cost');
  let mean = 0;
  let m2 = 0;
  let positive = 0;
  let recoveredCost = 0;
  payouts.forEach((payout, index) => {
    if (!Number.isFinite(payout) || payout < 0) throw new RangeError('Invalid payout');
    const delta = payout - mean;
    mean += delta / (index + 1);
    m2 += delta * (payout - mean);
    positive += payout > 0 ? 1 : 0;
    recoveredCost += payout >= cost ? 1 : 0;
  });
  const ordered = [...payouts].sort((a, b) => a - b);
  const quantile = (fraction: number) => ordered[Math.floor((ordered.length - 1) * fraction)]!;
  const returnFraction = mean / cost;
  const standardError = Math.sqrt(m2 / (payouts.length - 1) / payouts.length) / cost;
  return {
    rounds: payouts.length, cost, meanPayout: mean, returnFraction, standardError,
    // A descriptive normal approximation. Rare tails may invalidate its coverage.
    approximate95Interval: [Math.max(0, returnFraction - 1.96 * standardError), returnFraction + 1.96 * standardError],
    positivePayoutFraction: positive / payouts.length,
    recoveredCostFraction: recoveredCost / payouts.length,
    payoutQuantiles: { p50: quantile(.5), p90: quantile(.9), p99: quantile(.99), max: ordered.at(-1)! },
  };
}

/** Exact pre-cent-rounding expectation for the local independent-cell Train
 * model. Line correlation changes variance but not the sum of line means.
 * This is not a provider PAR reconstruction. The configured round cap must
 * exceed the maximum possible ten-spin line sum (true for Wanted). */
export function expectedStickyTrainPayout(symbols: readonly { id: string; weight: number; freeWeight?: number; wild?: boolean; scatter?: boolean; bonus?: string; bonusWeights?: Partial<Record<'train-robbery' | 'duel-at-dawn' | 'dead-mans-hand', number>>; pay?: Partial<Record<3 | 4 | 5, number>> }[], freeSpins = 10): number {
  const eligible = symbols.filter((symbol) => !symbol.scatter && !symbol.bonus && symbol.id !== 'vs');
  const entries = eligible.map((symbol) => ({ symbol, weight: symbol.bonusWeights?.['train-robbery'] ?? symbol.freeWeight ?? symbol.weight }));
  const weightTotal = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const wildProbability = entries.filter((entry) => entry.symbol.wild).reduce((sum, entry) => sum + entry.weight, 0) / weightTotal;
  const ordinary = entries.filter((entry) => !entry.symbol.wild);
  const payThrough = (pay: Partial<Record<3 | 4 | 5, number>> | undefined, length: number) => Math.max(0, ...Object.entries(pay ?? {}).filter(([count]) => Number(count) <= length).map(([, value]) => value!));
  const wildPrefixPay = (length: number) => Math.max(0, ...eligible.map((symbol) => payThrough(symbol.pay, length)));
  let featureMean = 0;
  for (let spin = 1; spin <= freeSpins; spin++) {
    const survivedEarlierSpins = (1 - wildProbability) ** (spin - 1);
    const stickyWildProbability = 1 - (1 - wildProbability) ** spin;
    let spinMean = stickyWildProbability ** 5 * wildPrefixPay(5);
    for (let wildPrefix = 0; wildPrefix < 5; wildPrefix++) {
      for (const { symbol, weight } of ordinary) {
        const probability = weight / weightTotal * survivedEarlierSpins;
        const substitutes = probability + stickyWildProbability;
        for (let length = wildPrefix + 1; length <= 5; length++) {
          const stopProbability = length === 5 ? 1 : 1 - substitutes;
          const pay = Math.max(wildPrefixPay(wildPrefix), payThrough(symbol.pay, length));
          spinMean += stickyWildProbability ** wildPrefix * probability * substitutes ** (length - wildPrefix - 1) * stopProbability * pay;
        }
      }
    }
    featureMean += spinMean;
  }
  return featureMean;
}
