/**
 * Local probability-model diagnostic, NOT provider RTP certification.
 * Run: node scripts/benchmark-tumble-math.mjs [output.json] [baseRounds] [buyRounds]
 * Uses fixed, disjoint holdout seed streams. Never reads a wallet or play history.
 */
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const output = process.argv[2];
const baseRounds = Number(process.argv[3] ?? 100000);
const buyRounds = Number(process.argv[4] ?? 10000);
if (![baseRounds, buyRounds].every(n => Number.isInteger(n) && n > 1)) throw new Error('Sample sizes must be integers greater than 1');
const server = await createServer({ root, configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } });
try {
  const { sweetBonanzaConfig } = await server.ssrLoadModule('/src/pages/slots/sweet-bonanza/config.ts');
  const { gatesOfOlympusConfig } = await server.ssrLoadModule('/src/pages/slots/gates-of-olympus/config.ts');
  const { playRound, buyBonusRound } = await server.ssrLoadModule('/src/pages/slots/_shared/engine.ts');
  const { createRng } = await server.ssrLoadModule('/src/lib/fairness.ts');
  const report = { generatedAt: new Date().toISOString(), disclaimer: 'Local empirical sampling only. Normal intervals summarize observed sampling variation; rare unobserved tails can invalidate those intervals. No provider RTP certification.', diagnosticTarget: 'Broad local sanity near0.95 return, not a fitted/certified provider RTP.', configurations: [], results: [] };
  for (const cfg of [sweetBonanzaConfig, gatesOfOlympusConfig]) {
    report.configurations.push({ id: cfg.id, weightsBase: cfg.weightsBase, weightsFree: cfg.weightsFree, ante: cfg.ante,
      multiplierTableBase: cfg.multiplierTableBase, multiplierTableFree: cfg.multiplierTableFree, maxWinMultiplier: cfg.maxWinMultiplier });
    for (const seed of ['holdout-B', 'holdout-C', 'holdout-D']) {
      for (const mode of ['base', 'ante', 'buy']) {
        const n = mode === 'buy' ? buyRounds : baseRounds;
        const cost = mode === 'buy' ? cfg.buyBonusCost : mode === 'ante' ? cfg.ante.betMultiplier : 1;
        let sum = 0, sumSquares = 0, max = 0, triggered = 0, zero = 0, capHits = 0;
        for (let nonce = 0; nonce < n; nonce++) {
          const rng = createRng(seed, 'audit-holdout-2026-10-08', nonce);
          const result = (mode === 'buy' ? buyBonusRound : playRound)(rng, cfg, { bet: 1, ante: mode === 'ante' });
          const value = result.totalPayout;
          sum += value; sumSquares += value * value; max = Math.max(max, value);
          if (result.freeSpinsAwarded) triggered++;
          if (value === 0) zero++;
          if (value >= cfg.maxWinMultiplier) capHits++;
        }
        const observedReturn = sum / n / cost;
        const standardError = Math.sqrt(Math.max(0, sumSquares - sum * sum / n) / (n - 1) / n) / cost;
        const row = { game: cfg.id, seed, mode, n, cost, observedReturn, standardError, approximate95Interval: [observedReturn - 1.96 * standardError, observedReturn + 1.96 * standardError], max, triggered, zero, capHits };
        report.results.push(row);
        console.log(JSON.stringify(row));
        if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
      }
    }
  }
  report.summary = report.configurations.flatMap(cfg => ['base', 'ante', 'buy'].map(mode => {
    const rows = report.results.filter(row => row.game === cfg.id && row.mode === mode);
    const n = rows.reduce((sum, row) => sum + row.n, 0);
    const observedReturn = rows.reduce((sum, row) => sum + row.n * row.observedReturn, 0) / n;
    const variance = rows.reduce((sum, row) => sum + (row.n - 1) * row.standardError ** 2 * row.n + row.n * (row.observedReturn - observedReturn) ** 2, 0) / (n - 1);
    const standardError = Math.sqrt(variance / n);
    return { game: cfg.id, mode, n, observedReturn, standardError,
      approximate95Interval: [observedReturn - 1.96 * standardError, observedReturn + 1.96 * standardError],
      seedRange: [Math.min(...rows.map(row => row.observedReturn)), Math.max(...rows.map(row => row.observedReturn))] };
  }));
  if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
} finally { await server.close(); }
