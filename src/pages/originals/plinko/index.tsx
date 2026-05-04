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
};

/** Stake-style Plinko rendered in SVG. SVG primitives composite on the GPU,
 *  so animating `cx`/`cy` of the ball circle costs far less than animating
 *  HTML `left`/`top` percentages (which trigger layout + paint each frame). */
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
      setActiveBalls((prev) => [...prev, { id, drop: result, rows: r }]);

      // Animation duration scales with rows (gravity-like: faster per row).
      const animDur = r * 110 + 250;
      setTimeout(() => {
        if (result.payout > 0) balance.credit(result.payout);
        sound.play(
          result.multiplier >= 10 ? 'mega-win' :
          result.multiplier >= 2 ? 'big-win' :
          result.multiplier >= 0.5 ? 'win' : 'drop',
        );
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
        <div className="rounded-2xl bg-bg-card border border-edge p-2 sm:p-3 overflow-hidden">
          <Board
            rows={rows}
            mults={mults}
            activeBalls={activeBalls}
            flashingBucket={flashingBucket}
          />
        </div>

        {recentResults.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">Recent</span>
            {recentResults.map((r) => (
              <span
                key={r.id}
                className={`font-mono font-semibold text-xs tabular-nums px-2 py-1 rounded-lg flex-shrink-0 ${
                  r.multiplier >= 10
                    ? 'bg-accent-hot/20 text-accent-hot'
                    : r.multiplier >= 2
                      ? 'bg-accent-gold/20 text-accent-gold'
                      : r.multiplier >= 1
                        ? 'bg-accent/15 text-accent'
                        : 'bg-bg-elev text-ink-mute'
                }`}
              >
                {r.multiplier.toFixed(2)}×
              </span>
            ))}
          </div>
        )}

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

/** Plinko geometry in normalized SVG units:
 *
 *  - Coordinate system: x ∈ [0, W], y ∈ [0, H], W = rows + 2, H = rows + 4.
 *  - Row r (0-indexed) has r + 3 pegs centered horizontally at y = r + 1.5.
 *    Bottom row (r = rows-1) has rows+2 pegs filling the full width, creating
 *    rows+1 gaps between adjacent pegs — these gaps are the buckets.
 *  - Ball spawn: (W/2, 0.3). After deflection k, ball sits in the gap
 *    between row-k pegs; cx = W/2 + (R_count - L_count) × 0.5,
 *    cy = k + 1.5. After all deflections, ball lands in bucket b (= R_count)
 *    at x = b + 1 (since W/2 + (2b - rows + 1)/2 = b + 1 + (1 - rows + rows)/2
 *    after re-deriving, but the practical waypoints are computed from the
 *    L/R path directly).
 */
function Board({
  rows,
  mults,
  activeBalls,
  flashingBucket,
}: {
  rows: number;
  mults: number[];
  activeBalls: ActiveBall[];
  flashingBucket: number | null;
}) {
  const W = rows + 2;
  const H = rows + 4;

  // Static peg positions — memoized so we don't recompute every render.
  const pegs = useMemo(() => {
    const out: { x: number; y: number; key: string }[] = [];
    for (let r = 0; r < rows; r++) {
      const count = r + 3;
      const startX = (W - (count - 1)) / 2;
      for (let i = 0; i < count; i++) {
        out.push({ x: startX + i, y: r + 1.5, key: `${r}-${i}` });
      }
    }
    return out;
  }, [rows, W]);

  const pegRadius = 0.12;
  const ballRadius = 0.34;

  // Bucket geometry: bucket b is centered at x = b + 1 (between adjacent
  // bottom-row pegs), spans width 1, sits at y = rows + 2.0 to H - 0.2.
  const bucketY = rows + 2.0;
  const bucketHeight = H - bucketY - 0.2;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="plinko-peg" cx="38%" cy="32%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#dde4f0" />
            <stop offset="80%" stopColor="#7f8aa0" />
            <stop offset="100%" stopColor="#3a3f4d" />
          </radialGradient>
          <radialGradient id="plinko-ball" cx="32%" cy="28%" r="60%">
            <stop offset="0%" stopColor="#fffce6" />
            <stop offset="25%" stopColor="#ffe9a8" />
            <stop offset="55%" stopColor="#ffc850" />
            <stop offset="100%" stopColor="#a8761a" />
          </radialGradient>
          <filter id="plinko-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.18" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Pegs — single static layer, drawn once */}
        {pegs.map((p) => (
          <circle
            key={p.key}
            cx={p.x}
            cy={p.y}
            r={pegRadius}
            fill="url(#plinko-peg)"
            stroke="rgba(255,255,255,.25)"
            strokeWidth={0.015}
          />
        ))}

        {/* Buckets */}
        {mults.map((m, i) => {
          const tier = m >= 10 ? 'high' : m >= 2 ? 'mid' : m >= 1 ? 'one' : 'low';
          const isFlash = flashingBucket === i;
          const fill =
            tier === 'high' ? '#c8102e'
            : tier === 'mid' ? '#c8932e'
            : tier === 'one' ? '#0a7a3a'
            : '#1a1f29';
          const stroke =
            tier === 'high' ? '#ff5560'
            : tier === 'mid' ? '#ffc62a'
            : tier === 'one' ? '#1fff7a'
            : '#2a3142';
          const textColor =
            tier === 'high' ? '#fff'
            : tier === 'mid' ? '#1a0f00'
            : tier === 'one' ? '#fff'
            : '#9aa3b2';
          const display = m < 1 ? m.toFixed(1) : String(m);
          const labelLen = display.length + 1; // + '×'
          const fontSize = labelLen <= 2 ? 0.55 : labelLen === 3 ? 0.46 : labelLen === 4 ? 0.36 : 0.30;
          return (
            <g key={i}>
              <motion.rect
                x={i + 0.55}
                y={bucketY}
                width={0.9}
                height={bucketHeight}
                rx={0.12}
                fill={fill}
                stroke={stroke}
                strokeWidth={isFlash ? 0.05 : 0.025}
                filter={tier !== 'low' || isFlash ? 'url(#plinko-glow)' : undefined}
                animate={isFlash
                  ? { y: [bucketY, bucketY - 0.2, bucketY] }
                  : { y: bucketY }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.text
                x={i + 1}
                y={bucketY + bucketHeight / 2 + fontSize * 0.36}
                textAnchor="middle"
                fontSize={fontSize}
                fontFamily="ui-monospace, monospace"
                fontWeight={700}
                fill={textColor}
                style={{ pointerEvents: 'none' }}
                animate={isFlash
                  ? { y: [bucketY + bucketHeight / 2 + fontSize * 0.36, bucketY + bucketHeight / 2 + fontSize * 0.36 - 0.2, bucketY + bucketHeight / 2 + fontSize * 0.36] }
                  : { y: bucketY + bucketHeight / 2 + fontSize * 0.36 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                {display}×
              </motion.text>
            </g>
          );
        })}

        {/* Animated balls */}
        {activeBalls.map((b) => (
          <Ball key={b.id} ball={b} W={W} ballRadius={ballRadius} />
        ))}
      </svg>
    </div>
  );
}

function Ball({
  ball,
  W,
  ballRadius,
}: {
  ball: ActiveBall;
  W: number;
  ballRadius: number;
}) {
  const { rows } = ball;
  const path = ball.drop.path;

  // Build cx/cy keyframes through the peg field.
  const cxKeys: number[] = [W / 2];
  const cyKeys: number[] = [0.3];
  let curX = W / 2;
  for (let i = 0; i < rows; i++) {
    curX += path[i] === 'R' ? 0.5 : -0.5;
    cxKeys.push(curX);
    cyKeys.push(i + 1.5);
  }
  // Settle into bucket — extra cy below bottom row.
  cxKeys.push(curX);
  cyKeys.push(rows + 2.7);

  // Duration & gravity feel: linear `times` plus easeIn = accelerating drop.
  const dur = rows * 0.11 + 0.25;
  const times = cxKeys.map((_, i) => i / (cxKeys.length - 1));

  return (
    <motion.circle
      r={ballRadius}
      fill="url(#plinko-ball)"
      stroke="rgba(120, 70, 0, .6)"
      strokeWidth={0.025}
      filter="url(#plinko-glow)"
      initial={{ cx: cxKeys[0], cy: cyKeys[0] }}
      animate={{ cx: cxKeys, cy: cyKeys }}
      transition={{ duration: dur, times, ease: 'easeIn' }}
    />
  );
}
