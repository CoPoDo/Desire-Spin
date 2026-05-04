import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  AutoConfigFields,
  AutoProgressDisplay,
  ManualAutoTabs,
  type AutoConfig,
  type Mode,
  useAutoBetRunner,
} from '../_shared/AutoBetController';
import {
  type PlinkoDrop,
  type Risk,
  dropBall,
  multipliersFor,
} from './engine';

type ActiveBall = {
  id: number;
  drop: PlinkoDrop;
  rows: number;
  startedAt: number;
};

/** Stake-style Plinko: drop a ball through pegs, lands in a payout bucket.
 *  Risk level (low/medium/high) and row count (8-16) determine the multiplier
 *  table. ~99% RTP across all configurations. */
export function PlinkoGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState<Risk>('medium');
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [activeBalls, setActiveBalls] = useState<ActiveBall[]>([]);
  const [recentResults, setRecentResults] = useState<{ id: number; multiplier: number }[]>([]);
  const [flashingBucket, setFlashingBucket] = useState<number | null>(null);
  const ballIdRef = useRef(0);
  const stateRef = useRef({ bet, rows, risk });
  stateRef.current = { bet, rows, risk };

  const mults = useMemo(() => multipliersFor(risk, rows), [risk, rows]);
  const buckets = mults.length;

  const drop = useCallback((): Promise<number> => {
    return new Promise<number>((resolve) => {
      const { bet: b, rows: r, risk: rk } = stateRef.current;
      if (balance.balance < b || b <= 0) {
        resolve(0);
        return;
      }
      sound.play('click');
      balance.debit(b);
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const result = dropBall(rng, b, r, rk);
      const id = ++ballIdRef.current;
      setActiveBalls((prev) => [...prev, { id, drop: result, rows: r, startedAt: performance.now() }]);

      const animDur = r * 130 + 250;
      setTimeout(() => {
        if (result.payout > 0) balance.credit(result.payout);
        sound.play(
          result.multiplier >= 10 ? 'mega-win' :
          result.multiplier >= 2 ? 'big-win' :
          result.multiplier >= 0.5 ? 'win' : 'drop',
        );
        // Flash the bucket the ball landed in
        setFlashingBucket(result.bucket);
        setTimeout(() => setFlashingBucket(null), 600);
        history.record({
          game: 'Plinko',
          bet: b,
          payout: result.payout,
          multiplier: result.multiplier,
          serverSeedHash: fairness.hash,
          clientSeed: seeds.clientSeed,
          nonce: seeds.nonce,
        });
        session.recordSpin(b, result.payout, false);
        setRecentResults((prev) => [{ id, multiplier: result.multiplier }, ...prev].slice(0, 8));
        setTimeout(() => {
          setActiveBalls((prev) => prev.filter((bb) => bb.id !== id));
        }, 400);
        resolve(result.payout - b);
      }, animDur);
    });
  }, [balance, fairness, sound, history, session]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 350,
    runOnce: drop,
    onStop: () => setAutoActive(false),
  });

  return (
    <OriginalPageLayout title="Plinko">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Plinko board */}
        <div
          className="relative rounded-2xl bg-bg-card border border-edge p-3 overflow-hidden"
          style={{ aspectRatio: `${rows + 1} / ${rows + 4}` }}
        >
          {/* Pegs and ball animation */}
          <Board rows={rows} buckets={buckets} mults={mults} activeBalls={activeBalls} flashingBucket={flashingBucket} />
        </div>

        {/* Recent results */}
        {recentResults.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">Recent</span>
            {recentResults.map((r) => (
              <span
                key={r.id}
                className={`font-mono font-semibold text-xs tabular-nums px-2 py-1 rounded-lg flex-shrink-0 ${
                  r.multiplier >= 1
                    ? r.multiplier >= 10
                      ? 'bg-accent-gold/20 text-accent-gold'
                      : 'bg-accent/15 text-accent'
                    : 'bg-bg-elev text-ink-mute'
                }`}
              >
                {r.multiplier.toFixed(2)}×
              </span>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive} />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">Risk</div>
            <div className="flex gap-1.5">
              {(['low', 'medium', 'high'] as Risk[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  disabled={autoActive}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                    risk === r
                      ? 'bg-accent text-bg'
                      : 'bg-bg-elev border border-edge text-ink-dim hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-ink-mute">Rows</span>
              <span className="font-mono font-semibold text-sm text-ink tabular-nums">{rows}</span>
            </div>
            <input
              type="range"
              min={8}
              max={16}
              step={1}
              value={rows}
              disabled={autoActive}
              onChange={(e) => setRows(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <button
              onClick={() => void drop()}
              disabled={balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              Drop · {fmtCurrency(bet)}
            </button>
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (balance.balance < bet || bet <= 0)}
              className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] ${
                autoActive ? 'bg-accent-hot text-white' : 'bg-accent text-bg'
              }`}
            >
              {autoActive ? 'Stop Autobet' : 'Start Autobet'}
            </button>
          )}
        </div>
      </div>
    </OriginalPageLayout>
  );
}

function Board({
  rows,
  buckets,
  mults,
  activeBalls,
  flashingBucket,
}: {
  rows: number;
  buckets: number;
  mults: number[];
  activeBalls: ActiveBall[];
  flashingBucket: number | null;
}) {
  // Geometry: pegs in (rows+1) lines (0..rows), with 2 pegs in the second
  // line, 3 in the third, ... rows+1 in the bottom. Wait — Stake's
  // standard is rows of pegs starting with 3 at the top: row r has r+3
  // pegs. We'll use simpler: row r has r+2 pegs (so for 16 rows the
  // bottom has 17 pegs, matching 17 buckets).
  return (
    <div className="relative w-full h-full">
      {/* Pegs */}
      {Array.from({ length: rows }).map((_, rIdx) => {
        const pegsInRow = rIdx + 3;
        const yPct = ((rIdx + 1) / (rows + 2)) * 100;
        return (
          <div
            key={rIdx}
            className="absolute left-0 right-0 flex justify-center"
            style={{ top: `${yPct}%`, transform: 'translateY(-50%)' }}
          >
            <div className="flex" style={{ width: `${(pegsInRow / (rows + 2)) * 100}%` }}>
              {Array.from({ length: pegsInRow }).map((_, pIdx) => (
                <div key={pIdx} className="flex-1 flex justify-center">
                  <div
                    className="rounded-full bg-ink/80"
                    style={{
                      width: `${Math.max(3, 100 / (rows + 4) / 2.5)}%`,
                      aspectRatio: '1 / 1',
                      boxShadow: '0 0 4px rgba(255,255,255,.25)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Buckets at the bottom */}
      <div
        className="absolute left-0 right-0 grid gap-0.5 px-1"
        style={{
          bottom: '1%',
          gridTemplateColumns: `repeat(${buckets}, minmax(0, 1fr))`,
          height: '12%',
        }}
      >
        {mults.map((m, i) => {
          const tier = m >= 10 ? 'high' : m >= 2 ? 'mid' : m >= 1 ? 'one' : 'low';
          const isFlash = flashingBucket === i;
          return (
            <motion.div
              key={i}
              animate={isFlash ? { scale: [1, 1.18, 1], y: [0, -4, 0] } : { scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-md flex items-center justify-center font-mono font-bold text-[8px] sm:text-[10px] tabular-nums"
              style={{
                background:
                  tier === 'high'
                    ? 'linear-gradient(180deg, #ff5560, #c8102e)'
                    : tier === 'mid'
                      ? 'linear-gradient(180deg, #ffc62a, #c8932e)'
                      : tier === 'one'
                        ? 'linear-gradient(180deg, #1fff7a, #0a7a3a)'
                        : 'linear-gradient(180deg, #2a3142, #1a1f29)',
                color: tier === 'high' ? '#fff' : tier === 'mid' ? '#1a0f00' : tier === 'one' ? '#0a3a14' : '#9aa3b2',
                boxShadow: isFlash
                  ? '0 0 24px currentColor, 0 0 8px currentColor'
                  : tier !== 'low' ? '0 0 8px currentColor' : undefined,
              }}
            >
              {m < 1 ? m.toFixed(1) : m}×
            </motion.div>
          );
        })}
      </div>

      {/* Animated balls */}
      {activeBalls.map((ball) => (
        <Ball key={ball.id} ball={ball} buckets={buckets} />
      ))}
    </div>
  );
}

function Ball({ ball, buckets }: { ball: ActiveBall; buckets: number }) {
  // Map the L/R sequence into a series of x positions over time.
  // Top of board: ball starts centered on the topmost peg gap (x = 50%).
  // After each row, ball moves left or right toward the next peg gap.
  // Bottom: ball lands in bucket index = number of R's.
  const path = ball.drop.path;
  const rows = ball.rows;

  // Smooth trajectory: ball travels from x=50% at top to
  // x = ((bucket + 0.5) / buckets) * 100% at bottom, but jitters left/right
  // at each row by a small amount based on path[i].
  const finalBucketX = ((ball.drop.bucket + 0.5) / buckets) * 100;
  const yKeyframes = [0]; // %
  const xKeyframes = [50]; // %
  let curX = 50;
  for (let i = 0; i < rows; i++) {
    const yPct = ((i + 1) / (rows + 2)) * 100;
    // Toward final bucket x
    const towardFinal = curX + (finalBucketX - curX) * 0.35;
    // Plus a small left/right jitter
    const jitter = (path[i] === 'R' ? 1 : -1) * (3 / rows) * 100 * 0.5;
    curX = towardFinal + jitter;
    yKeyframes.push(yPct);
    xKeyframes.push(curX);
  }
  // Final descent into bucket
  yKeyframes.push(94);
  xKeyframes.push(finalBucketX);

  const totalDur = rows * 0.13 + 0.15;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: `${Math.max(5, 100 / (rows + 4) * 0.9)}%`,
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 35% 28%, #fff5c4 0%, #ffd37a 30%, #f5c56f 50%, #c8932e 100%)',
        boxShadow:
          '0 0 8px rgba(255,200,80,.85), inset 0 1px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(80,40,5,.5)',
        zIndex: 10,
      }}
      initial={{ left: '50%', top: '0%', x: '-50%', y: '-50%' }}
      animate={{
        left: xKeyframes.map((x) => `${x}%`),
        top: yKeyframes.map((y) => `${y}%`),
      }}
      transition={{
        duration: totalDur,
        times: yKeyframes.map((_, i) => i / (yKeyframes.length - 1)),
        ease: 'easeIn',
      }}
    />
  );
}
