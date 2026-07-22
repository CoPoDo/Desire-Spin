import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
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
import { fireConfetti } from '../../../lib/confetti';

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
  const [bet, setBet] = usePersistedBet('plinko', 1);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState<Risk>('medium');
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  /** Bulk-drop count for the manual drop button. Real Stake Plinko
   *  lets a single click queue 1/5/10/25 balls in rapid succession.
   *  Total cost shown on the button so the player sees the stake
   *  before pressing. */
  const [bulkCount, setBulkCount] = useState<1 | 5 | 10 | 25>(1);
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

      // Peg-tick SFX synced to the visual fall — one tick per row
      // contact, with sqrt scaling so they accelerate as the ball
      // descends (matches the gravity-style keyframe timing in the
      // Ball component). Real Plinko makes an audible tick each time
      // the ball strikes a peg; the silent drop felt sterile.
      const visualDur = Math.sqrt(r) * 320 + 300;
      for (let i = 0; i < r; i++) {
        const at = visualDur * Math.sqrt(i + 1) / Math.sqrt(r + 1);
        window.setTimeout(() => sound.play('tick'), at);
      }

      // Animation duration scales with rows (gravity-like: faster per row).
      const animDur = r * 110 + 250;
      setTimeout(() => {
        if (result.payout > 0) balance.credit(result.payout);
        sound.play(
          result.multiplier >= 10 ? 'mega-win' :
          result.multiplier >= 2 ? 'big-win' :
          result.multiplier >= 0.5 ? 'win' : 'drop',
        );
        if (result.multiplier >= 5) {
          fireConfetti({
            count: result.multiplier >= 100 ? 130 : result.multiplier >= 20 ? 80 : 50,
            colors: ['#ff5560', '#ffd166', '#22d3ee', '#00e701', '#ffffff'],
          });
        }
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

  // Space-to-drop hotkey — real Stake parity. Rapid-fire works
  // because drop() doesn't block; multiple balls can be in flight.
  useHotkey(' ', () => { void drop(); }, !autoActive);

  return (
    <OriginalPageLayout title="Plinko">
      <div className="flex flex-col p-3 gap-3 max-w-md mx-auto w-full">
        <div className="rounded-lg bg-stake-card border border-stake-border p-2 sm:p-3 overflow-hidden">
          <Board
            rows={rows}
            mults={mults}
            activeBalls={activeBalls}
            flashingBucket={flashingBucket}
          />
        </div>

        <div className="flex items-center justify-end gap-1.5 overflow-x-auto py-0.5 min-h-[28px]">
          {recentResults.length > 0 ? (
            recentResults.map((r) => (
              <span
                key={r.id}
                className={`font-mono font-semibold text-xs tabular-nums px-2.5 py-1 rounded-full flex-shrink-0 border ${
                  r.multiplier >= 10
                    ? 'bg-stake-red/20 text-stake-red border-stake-red/30'
                    : r.multiplier >= 2
                      ? 'bg-accent-gold/20 text-accent-gold border-accent-gold/30'
                      : r.multiplier >= 1
                        ? 'bg-stake-green/15 text-stake-green border-stake-green/30'
                        : 'bg-stake-card text-stake-muted border-stake-border'
                }`}
              >
                {r.multiplier.toFixed(2)}×
              </span>
            ))
          ) : (
            <span className="text-[11px] text-stake-dim italic">no drops yet</span>
          )}
        </div>

        <div className="rounded-lg bg-stake-panel border border-stake-border p-3 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive} />
          <div>
            <div className="text-xs text-stake-muted mb-1.5">Risk</div>
            <div className="flex gap-1.5">
              {(['easy', 'medium', 'hard', 'expert'] as Risk[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  disabled={autoActive}
                  className={`flex-1 py-2 rounded text-xs font-semibold capitalize transition disabled:opacity-50 ${
                    risk === r
                      ? 'bg-stake-green text-stake-bg'
                      : 'bg-stake-input border border-stake-border text-stake-muted hover:text-stake-text'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-stake-muted">Rows</span>
              <span className="font-mono font-semibold text-sm text-stake-text tabular-nums">{rows}</span>
            </div>
            <input
              type="range"
              min={8}
              max={16}
              step={1}
              value={rows}
              disabled={autoActive}
              onChange={(e) => setRows(parseInt(e.target.value))}
              className="dice-slider w-full appearance-none bg-stake-bg rounded-full h-2 cursor-pointer disabled:opacity-50"
            />
          </div>
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <>
              {/* Bulk-drop selector — one click queues N balls in a
                  staggered cascade. */}
              <div className="flex gap-1.5">
                {([1, 5, 10, 25] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setBulkCount(n)}
                    disabled={autoActive}
                    className={`flex-1 py-1.5 rounded text-[11px] font-mono font-bold tabular-nums transition disabled:opacity-50 ${
                      bulkCount === n
                        ? 'bg-accent-gold text-stake-bg'
                        : 'bg-stake-input border border-stake-border text-stake-muted hover:text-stake-text'
                    }`}
                  >
                    ×{n}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  for (let i = 0; i < bulkCount; i++) {
                    window.setTimeout(() => { void drop(); }, i * 80);
                  }
                }}
                disabled={balance.balance < bet * bulkCount || bet <= 0}
                style={{ touchAction: 'manipulation' }}
                className="w-full py-3.5 rounded bg-stake-green text-stake-bg font-bold text-sm disabled:opacity-50 transition active:scale-[0.99] hover:bg-stake-green-hi"
              >
                Bet {bulkCount > 1 ? `×${bulkCount}` : ''} · {fmtCurrency(bet * bulkCount)}
              </button>
            </>
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (balance.balance < bet || bet <= 0)}
              className={`w-full py-3.5 rounded font-bold text-sm disabled:opacity-50 transition active:scale-[0.99] ${
                autoActive ? 'bg-stake-red text-white' : 'bg-stake-green text-stake-bg hover:bg-stake-green-hi'
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

  const pegRadius = 0.11;
  const ballRadius = 0.42;

  // Bucket geometry: bucket b is centered at x = b + 1 (between adjacent
  // bottom-row pegs), spans width 1, sits at y = rows + 2.0 to H - 0.2.
  const bucketY = rows + 2.0;
  const bucketHeight = H - bucketY - 0.2;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <radialGradient id="plinko-peg" cx="38%" cy="32%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#dde4f0" />
            <stop offset="80%" stopColor="#7f8aa0" />
            <stop offset="100%" stopColor="#3a3f4d" />
          </radialGradient>
          {/* Stake-style ball: bright coral / red with white highlight, dark
           * burgundy shadow on the underside. */}
          <radialGradient id="plinko-ball" cx="34%" cy="28%" r="64%">
            <stop offset="0%" stopColor="#fff5e8" />
            <stop offset="18%" stopColor="#ffc69b" />
            <stop offset="50%" stopColor="#ff5560" />
            <stop offset="80%" stopColor="#c8102e" />
            <stop offset="100%" stopColor="#5a0810" />
          </radialGradient>
          <filter id="plinko-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.18" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="plinko-ball-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.12" result="b" />
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
            : tier === 'one' ? '#00e701'
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

        {/* Bucket-landing impact ripple — quick expanding ring centred
         *  on the winning bucket. Fires together with the bucket bounce
         *  for extra "thump" on every landing. */}
        {flashingBucket !== null && (
          <motion.circle
            key={`ripple-${flashingBucket}`}
            cx={flashingBucket + 1}
            cy={bucketY + bucketHeight / 2}
            r={0.3}
            fill="none"
            stroke="rgba(255,255,255,.85)"
            strokeWidth={0.08}
            initial={{ r: 0.3, opacity: 0.85 }}
            animate={{ r: 1.4, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        )}
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

  // Build cx/cy keyframes through the peg field. For each peg-row we
  // emit TWO keyframes: the peg-contact point and a tiny "bounce-out"
  // just below it, slightly overshooting in the next direction. Real
  // Stake Plinko has the ball visibly kick off each peg rather than
  // smoothly arcing through the gaps; the overshoot keyframe sells
  // that contact moment.
  const cxKeys: number[] = [W / 2];
  const cyKeys: number[] = [0.3];
  let curX = W / 2;
  for (let i = 0; i < rows; i++) {
    const dir = path[i] === 'R' ? 1 : -1;
    // Peg contact — ball arrives at the peg position.
    cxKeys.push(curX);
    cyKeys.push(i + 1.5);
    // Bounce-out — ball kicks off the peg with a small lateral
    // overshoot in the upcoming direction, sells the rebound.
    cxKeys.push(curX + dir * 0.08);
    cyKeys.push(i + 1.62);
    // Update position for next row.
    curX += dir * 0.5;
  }
  // Settle into bucket — extra cy below bottom row.
  cxKeys.push(curX);
  cyKeys.push(rows + 2.7);

  // Gravity-based times: free-fall gives time ∝ sqrt(distance), so
  // each successive row takes less time than the previous. Real Plinko
  // visibly accelerates through the peg field; the previous linear
  // times + easeIn was a coarse approximation. sqrt(i)/sqrt(N) gives
  // a clearer "weight" feel.
  const N = cxKeys.length - 1;
  const times = cxKeys.map((_, i) => Math.sqrt(i) / Math.sqrt(N));

  // Total fall duration scales with sqrt(rows) since deeper boards
  // take more time as gravity accumulates velocity.
  const dur = Math.sqrt(rows) * 0.32 + 0.3;

  return (
    <>
      {/* Motion trail — three ghost circles trailing the ball at
       *  small delays + decreasing opacity. Real Stake Plinko shows
       *  a faint motion blur during fast falls; we approximate with
       *  delayed semi-transparent copies. */}
      {[0.04, 0.09, 0.14].map((delay, i) => (
        <motion.circle
          key={`trail-${i}`}
          r={ballRadius * (0.95 - i * 0.10)}
          fill="url(#plinko-ball)"
          opacity={0.4 - i * 0.10}
          initial={{ cx: cxKeys[0], cy: cyKeys[0] }}
          animate={{ cx: cxKeys, cy: cyKeys }}
          transition={{ duration: dur, times, ease: 'linear', delay }}
        />
      ))}
      {/* Main ball */}
      <motion.circle
        r={ballRadius}
        fill="url(#plinko-ball)"
        stroke="rgba(90, 8, 16, .8)"
        strokeWidth={0.03}
        filter="url(#plinko-ball-glow)"
        initial={{ cx: cxKeys[0], cy: cyKeys[0] }}
        animate={{ cx: cxKeys, cy: cyKeys }}
        transition={{ duration: dur, times, ease: 'linear' }}
      />
    </>
  );
}
