/** Offline benchmark only: no writes to app state, wallets, seeds, or weights.
 * node scripts/benchmark-slots.mjs --base=100000 --buys=20000 --seeds=12345,67890,24680
 * Add --rng=hmac to use production HMAC (slower), --only=wanted,sugar,wolf,
 * and --output=docs/slot-sampling-2026-10-08.json to preserve the report. */
import { createServer } from 'vite';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const options = Object.fromEntries(process.argv.slice(2).map((entry) => entry.replace(/^--/, '').split('=')));
const baseRounds = Number(options.base ?? 100_000);
const buyRounds = Number(options.buys ?? 20_000);
const seeds = (options.seeds ?? '12345,67890,24680').split(',').map(Number);
if (![baseRounds, buyRounds, ...seeds].every(Number.isSafeInteger) || baseRounds < 2 || buyRounds < 2 || new Set(seeds).size !== seeds.length || seeds.some((seed) => seed < 0 || seed > 0xffffffff)) throw new RangeError('Invalid rounds or seeds');
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } });
try {
  const sourcesByGroup = { wanted: ['src/pages/slots/_shared/lineEngine.ts', 'src/pages/slots/wanted-wild/index.tsx'], wolf: ['src/pages/slots/_shared/lineEngine.ts', 'src/pages/slots/wolf-gold/index.tsx', 'src/pages/slots/wolf-gold/paylines.ts'], sugar: ['src/pages/slots/sugar-rush/engine.ts'], juan: ['src/pages/slots/big-juan/engine.ts'], bass: ['src/pages/originals/big-bass/engine.ts'] };
  const groups = options.only?.split(',') ?? Object.keys(sourcesByGroup);
  if (groups.some((group) => !Object.hasOwn(sourcesByGroup, group))) throw new RangeError('Unknown benchmark game group');
  const files = [...new Set([...groups.flatMap((group) => sourcesByGroup[group] ?? []), 'src/lib/fairness.ts', 'src/lib/sha256.ts', 'tests/slot-sampling-math.ts'])];
  const sourceHashes = Object.fromEntries(files.map((file) => [file, createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex')]));
  const { runSampling } = await server.ssrLoadModule('/scripts/slot-sampling-runner.ts');
  const result = await runSampling({ baseRounds, buyRounds, seeds, rng: options.rng ?? 'mulberry32', only: options.only?.split(','), scenarios: options.scenarios?.split(',') });
  const sourceChangedDuringRun = files.filter((file) => sourceHashes[file] !== createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex'));
  const report = { phase: options.phase ?? 'diagnostic', sourceChangedDuringRun, generatedAt: new Date().toISOString(), revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceHashes, ...result };
  if (options.output) { writeFileSync(resolve(root, options.output), `${JSON.stringify(report, null, 2)}\n`); console.log(`Saved ${options.output}`); }
  else console.log(JSON.stringify(report, null, 2));
} finally { await server.close(); }
