import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { type Risk, type SegCount, multipliersFor, spin } from './engine';
import { fireConfetti } from '../../../lib/confetti';

const SEG_OPTIONS: SegCount[] = [10, 20, 30, 40, 50];

export function WheelGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [risk, setRisk] = useState<Risk>('medium');
  const [segments, setSegments] = useState<SegCount>(10);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rotation, setRotation] = useState(0); // accumulated rotation deg
  const [lastResult, setLastResult] = useState<{ multiplier: number; segment: number } | null>(null);
  const [recent, setRecent] = useState<{ id: number; m: number }[]>([]);
  const idRef = useRef(0);
  const stateRef = useRef({ bet, risk, segments });
  stateRef.current = { bet, risk, segments };

  const mults = useMemo(() => multipliersFor(risk, segments), [risk, segments]);
  const segAngle = 360 / segments;

  const playOnce = useCallback(async (): Promise<number> => {
    const { bet: b, risk: rk, segments: seg } = stateRef.current;
    if (balance.balance < b || b <= 0) return 0;
    setBusy(true);
    sound.play('click');
    balance.debit(b);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = spin(rng, b, rk, seg);
    // Rotate so the *top* indicator points at segment r.segment.
    // Segments laid out clockwise starting at 12 o'clock.
    // Add 4-6 full rotations for drama.
    const fullRots = 4 + Math.floor(Math.random() * 3);
    const targetAbs = -(r.segment * (360 / seg)) - (360 / seg) / 2;
    const next = Math.floor(rotation / 360) * 360 + fullRots * 360 + targetAbs;
    setRotation(next);
    return new Promise<number>((resolve) => {
      setTimeout(() => {
        setLastResult({ multiplier: r.multiplier, segment: r.segment });
        if (r.payout > 0) {
          balance.credit(r.payout);
          sound.play(r.multiplier >= 10 ? 'mega-win' : r.multiplier >= 2 ? 'big-win' : 'win');
          if (r.multiplier >= 2) {
            fireConfetti({
              count: r.multiplier >= 30 ? 130 : r.multiplier >= 10 ? 80 : 50,
              colors: ['#ffc62a', '#1fff7a', '#22d3ee', '#ffffff'],
            });
          }
        } else {
          sound.play('drop');
        }
        history.record({
          game: 'Wheel',
          bet: b,
          payout: r.payout,
          multiplier: r.multiplier,
          serverSeedHash: fairness.hash,
          clientSeed: seeds.clientSeed,
          nonce: seeds.nonce,
        });
        session.recordSpin(b, r.payout, false);
        const id = ++idRef.current;
        setRecent((prev) => [{ id, m: r.multiplier }, ...prev].slice(0, 10));
        setBusy(false);
        resolve(r.payout - b);
      }, 3200);
    });
  }, [balance, fairness, history, session, sound, rotation]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 200,
    runOnce: playOnce,
    onStop: () => setAutoActive(false),
  });

  return (
    <OriginalPageLayout title="Wheel">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Wheel */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 flex items-center justify-center">
          <div className="relative w-full aspect-square max-w-[300px]">
            {/* Pointer at top */}
            <div
              className="absolute left-1/2 z-10"
              style={{
                top: '-2px',
                transform: 'translateX(-50%)',
                width: '0',
                height: '0',
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: '20px solid #e5e9f0',
                filter: 'drop-shadow(0 0 4px rgba(255,255,255,.4))',
              }}
            />
            {/* Wheel SVG */}
            <motion.svg
              viewBox="-100 -100 200 200"
              className="w-full h-full"
              animate={{ rotate: rotation }}
              transition={{
                duration: 3.0,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {mults.map((m, i) => {
                const start = i * segAngle - 90 - segAngle / 2;
                const end = start + segAngle;
                const startRad = (start * Math.PI) / 180;
                const endRad = (end * Math.PI) / 180;
                const r = 95;
                const x1 = Math.cos(startRad) * r;
                const y1 = Math.sin(startRad) * r;
                const x2 = Math.cos(endRad) * r;
                const y2 = Math.sin(endRad) * r;
                const largeArc = segAngle > 180 ? 1 : 0;
                const path = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                const tier = m >= 10 ? 'epic' : m >= 2 ? 'mid' : m >= 1 ? 'one' : 'zero';
                const fill =
                  tier === 'epic' ? '#ffc62a' :
                  tier === 'mid'  ? '#1fff7a' :
                  tier === 'one'  ? '#22d3ee' :
                                    '#3a4258';
                // Label position
                const midRad = ((start + end) / 2) * Math.PI / 180;
                const labelR = r * 0.65;
                const lx = Math.cos(midRad) * labelR;
                const ly = Math.sin(midRad) * labelR;
                const isWinningSeg = lastResult?.segment === i;
                return (
                  <g key={i}>
                    <path
                      d={path}
                      fill={fill}
                      stroke={isWinningSeg ? '#ffffff' : '#0f1419'}
                      strokeWidth={isWinningSeg ? 1.6 : 0.6}
                      style={isWinningSeg ? {
                        filter: `drop-shadow(0 0 6px ${fill}) drop-shadow(0 0 12px ${fill})`,
                      } : undefined}
                    />
                    {segments <= 30 && (
                      <text
                        x={lx}
                        y={ly}
                        fontSize={segments <= 10 ? 12 : segments <= 20 ? 8 : 6}
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="700"
                        fill={tier === 'zero' ? '#9aa3b2' : '#0f1419'}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${(start + end) / 2 + 90} ${lx} ${ly})`}
                      >
                        {m === 0 ? '0' : `${m}×`}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Center hub */}
              <circle cx="0" cy="0" r="12" fill="#15191f" stroke="#2a3142" strokeWidth="1" />
              <circle cx="0" cy="0" r="5" fill="#3a4258" />
            </motion.svg>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
          {lastResult ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute">Last Spin</div>
              <div
                className={`font-mono font-bold text-2xl tabular-nums mt-0.5 ${
                  lastResult.multiplier >= 10
                    ? 'text-accent-gold'
                    : lastResult.multiplier >= 2
                      ? 'text-accent'
                      : lastResult.multiplier >= 1
                        ? 'text-accent-cyan'
                        : 'text-accent-hot'
                }`}
              >
                {lastResult.multiplier === 0 ? '0×' : `${lastResult.multiplier}×`}
              </div>
            </>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Spin the wheel</div>
          )}
        </div>

        {/* Recent results */}
        {recent.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">Recent</span>
            <AnimatePresence initial={false}>
              {recent.map((r) => (
                <motion.span
                  key={r.id}
                  layout
                  initial={{ scale: 0.6, opacity: 0, x: -12 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                  className={`font-mono font-semibold text-xs tabular-nums px-2 py-1 rounded-lg flex-shrink-0 ${
                    r.m >= 10
                      ? 'bg-accent-gold/20 text-accent-gold'
                      : r.m >= 2
                        ? 'bg-accent/15 text-accent'
                        : r.m >= 1
                          ? 'bg-accent-cyan/15 text-accent-cyan'
                          : 'bg-accent-hot/15 text-accent-hot'
                  }`}
                >
                  {r.m}×
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Controls */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || busy} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || busy} />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">Risk</div>
            <div className="flex gap-1.5">
              {(['low', 'medium', 'high'] as Risk[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  disabled={autoActive || busy}
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
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">Segments</div>
            <div className="flex gap-1.5">
              {SEG_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSegments(s)}
                  disabled={autoActive || busy}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold tabular-nums transition disabled:opacity-50 ${
                    segments === s
                      ? 'bg-accent-cyan text-bg'
                      : 'bg-bg-elev border border-edge text-ink-dim hover:text-ink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <button
              onClick={() => void playOnce()}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy ? 'Spinning…' : `Spin · ${fmtCurrency(bet)}`}
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
