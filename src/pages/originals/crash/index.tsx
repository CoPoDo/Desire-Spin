import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { multiplierAt, rollBust, timeForMultiplier } from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'running' | 'crashed' | 'cashed';

/** Stake-style Crash. The multiplier climbs from 1× until it busts at a
 *  random pre-rolled multiplier. Player can set an auto-cashout target or
 *  manually cash out before the bust. */
export function CrashGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [bust, setBust] = useState<number | null>(null);
  const [currentMult, setCurrentMult] = useState(1.0);
  const [recent, setRecent] = useState<{ id: string; bust: number; cashedAt: number | null }[]>([]);

  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const cashedAtRef = useRef<number | null>(null);
  const bustRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const autoCashoutRef = useRef<{ enabled: boolean; target: number }>({ enabled: false, target: 2.0 });
  useEffect(() => {
    autoCashoutRef.current = { enabled: autoCashoutEnabled, target: autoCashout };
  }, [autoCashoutEnabled, autoCashout]);

  const cleanup = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  // Auto-bet round resolution: each Crash round is async. autoResolveRef
  // holds the resolver of the currently-pending Promise (if any) so we can
  // signal "round done" with the net delta after finalize fires.
  const autoResolveRef = useRef<((delta: number) => void) | null>(null);

  const finalize = useCallback(
    (cashedAt: number | null, bustAt: number) => {
      const win = cashedAt !== null && cashedAt < bustAt;
      const payout = win ? +(bet * cashedAt!).toFixed(2) : 0;
      if (win) {
        balance.credit(payout);
        sound.play(cashedAt! >= 10 ? 'mega-win' : cashedAt! >= 3 ? 'big-win' : 'win');
        // Confetti scaled to cash-out multiplier — small for hop-out
        // safety, big for held-it-late wins.
        if (cashedAt! >= 2) {
          fireConfetti({
            count: cashedAt! >= 20 ? 130 : cashedAt! >= 5 ? 80 : 50,
            colors: ['#1fff7a', '#22d3ee', '#ffd166', '#ffffff'],
          });
        }
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Crash',
        bet,
        payout,
        multiplier: win ? cashedAt! : 0,
        serverSeedHash: fairness.hash,
        clientSeed: '',
        nonce: 0,
      });
      session.recordSpin(bet, payout, false);
      setRecent((r) => [{ id: `${Date.now()}`, bust: bustAt, cashedAt }, ...r].slice(0, 20));
      // Resolve the pending auto-bet round's promise (if any) with net delta.
      if (autoResolveRef.current) {
        autoResolveRef.current(payout - bet);
        autoResolveRef.current = null;
      }
    },
    [bet, balance, fairness, history, session, sound],
  );

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const m = multiplierAt(elapsed);
    setCurrentMult(m);
    const bAt = bustRef.current;
    if (bAt === null) return;
    // Auto-cashout fires first if its target is below the bust
    const auto = autoCashoutRef.current;
    if (
      phaseRef.current === 'running' &&
      auto.enabled &&
      cashedAtRef.current === null &&
      m >= auto.target &&
      auto.target < bAt
    ) {
      cashedAtRef.current = auto.target;
      phaseRef.current = 'cashed';
      setPhase('cashed');
      cleanup();
      finalize(auto.target, bAt);
      return;
    }
    if (m >= bAt) {
      // Bust
      setCurrentMult(bAt);
      cleanup();
      if (phaseRef.current === 'running') {
        phaseRef.current = 'crashed';
        setPhase('crashed');
        finalize(null, bAt);
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [cleanup, finalize]);

  const start = useCallback(() => {
    if (phase !== 'idle' && phase !== 'crashed' && phase !== 'cashed') return;
    if (balance.balance < bet || bet <= 0) return;
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const b = rollBust(rng);
    bustRef.current = b;
    cashedAtRef.current = null;
    setBust(b);
    setCurrentMult(1.0);
    phaseRef.current = 'running';
    setPhase('running');
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [phase, balance, bet, fairness, sound, tick]);

  const cashOut = useCallback(() => {
    if (phaseRef.current !== 'running' || cashedAtRef.current !== null) return;
    const m = currentMult;
    const bAt = bustRef.current;
    if (bAt === null || m >= bAt) return;
    cashedAtRef.current = m;
    phaseRef.current = 'cashed';
    setPhase('cashed');
    cleanup();
    finalize(m, bAt);
  }, [cleanup, currentMult, finalize]);

  const reset = useCallback(() => {
    setPhase('idle');
    setBust(null);
    setCurrentMult(1.0);
    cashedAtRef.current = null;
    bustRef.current = null;
    phaseRef.current = 'idle';
  }, []);

  /** Auto-bet runs Crash with the auto-cashout enabled at the configured
   *  target. Returns a Promise that resolves with net delta when the round
   *  finishes (either cashout or bust). */
  const autoRunOnce = useCallback(async (): Promise<number> => {
    // Force auto-cashout on for auto rounds (otherwise nothing would
    // resolve the round — the auto loop can't manually click cashout).
    if (!autoCashoutEnabled) setAutoCashoutEnabled(true);
    if (balance.balance < bet || bet <= 0) return 0;
    return new Promise<number>((resolve) => {
      autoResolveRef.current = resolve;
      // Start the round
      sound.play('click');
      balance.debit(bet);
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const b = rollBust(rng);
      bustRef.current = b;
      cashedAtRef.current = null;
      setBust(b);
      setCurrentMult(1.0);
      phaseRef.current = 'running';
      setPhase('running');
      startTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    });
  }, [autoCashoutEnabled, balance, bet, fairness, sound, tick]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 600,
    runOnce: autoRunOnce,
    onStop: () => setAutoActive(false),
  });

  const inGame = phase === 'running';
  const won = phase === 'cashed';
  const lost = phase === 'crashed';
  const profitOnAuto = useMemo(
    () => +(bet * autoCashout - bet).toFixed(2),
    [bet, autoCashout],
  );

  // Curve point — just for visual feedback, drawn as a rising line.
  const curveProgress = Math.min(timeForMultiplier(currentMult) / 60, 1);

  return (
    <OriginalPageLayout title="Crash">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Multiplier display + curve. Stage shakes on bust — mirrors
         *  Aviator's camera-shake-on-impact polish so both crash-style
         *  games have parity on the explosion moment. */}
        <div className={`rounded-2xl bg-bg-card border border-edge p-4 relative overflow-hidden min-h-[260px] ${lost ? 'shake-medium' : ''}`}>
          {/* Curve viz */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="crash-curve" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor={lost ? '#ff3d8b' : '#1fff7a'} stopOpacity="0.05" />
                <stop offset="100%" stopColor={lost ? '#ff3d8b' : '#1fff7a'} stopOpacity="0.45" />
              </linearGradient>
            </defs>
            {(() => {
              // Compute curve once and reuse for both fill path + edge dot
              const px = curveProgress * 100;
              const py = 60 - Math.min(60, Math.log(currentMult) / Math.log(20) * 60);
              let path = 'M 0 60';
              for (let i = 0; i <= 30; i++) {
                const t = (i / 30) * px;
                const m = Math.exp(0.06 * (t / 100) * 60); // approximate
                const y = 60 - Math.min(60, Math.log(m) / Math.log(20) * 60);
                path += ` L ${t} ${y}`;
              }
              path += ` L ${px} ${py} L ${px} 60 Z`;
              const edgeColor = lost ? '#ff3d8b' : '#1fff7a';
              return (
                <>
                  <path
                    d={path}
                    fill="url(#crash-curve)"
                    stroke={edgeColor}
                    strokeWidth="0.5"
                    opacity={inGame || won || lost ? 1 : 0.2}
                  />
                  {/* Bright leading-edge spark following the curve tip — only
                   *  visible while the round is running; on bust/cashout
                   *  the curve freezes and the spark disappears. */}
                  {inGame && (
                    <>
                      <circle cx={px} cy={py} r="1.6" fill={edgeColor}
                        style={{ filter: `drop-shadow(0 0 4px ${edgeColor})` }} />
                      <circle cx={px} cy={py} r="0.7" fill="#ffffff" />
                    </>
                  )}
                </>
              );
            })()}
          </svg>

          {/* Center multiplier — keyed on PHASE only (not currentMult) so
           *  the spring scale-pop fires once per phase transition rather
           *  than every tick. Previously remounted on every frame which
           *  cancelled the animation immediately and created numeric
           *  chop. Now scale-pops at takeoff and at cash-out / crash,
           *  with smooth value updates in between. */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[220px] py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                className={`font-mono font-bold tabular-nums leading-none ${
                  lost ? 'text-accent-hot' : won ? 'text-accent' : inGame ? 'text-ink' : 'text-ink-dim'
                }`}
                style={{
                  fontSize: 'clamp(48px, 14vw, 88px)',
                  textShadow: lost
                    ? '0 0 28px rgba(255,61,139,.85)'
                    : won
                      ? '0 0 28px rgba(31,255,122,.85)'
                      : inGame
                        ? '0 0 18px rgba(255,255,255,.25)'
                        : 'none',
                }}
              >
                {(lost ? (bust ?? currentMult) : currentMult).toFixed(2)}×
              </motion.div>
            </AnimatePresence>
            <div className="mt-2 text-xs text-ink-dim h-4">
              {lost && `Crashed at ${bust?.toFixed(2)}×`}
              {won && `Cashed out at ${cashedAtRef.current?.toFixed(2)}× — won ${fmtCurrency(bet * cashedAtRef.current!)}`}
              {inGame && 'Cash out before crash!'}
              {phase === 'idle' && 'Place a bet to start'}
            </div>
          </div>
          {/* Bust flash — quick red radial pulse fades in then out so the
           *  crash moment has visible "boom" feedback layered over the
           *  shake. Real Stake Crash flashes the screen briefly on bust. */}
          <AnimatePresence>
            {lost && (
              <motion.div
                key="bust-flash"
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.95, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, times: [0, 0.18, 1] }}
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(255,61,139,.55) 0%, rgba(255,61,139,.18) 40%, transparent 75%)',
                  mixBlendMode: 'screen',
                }}
              />
            )}
          </AnimatePresence>
          {/* Bust shrapnel — 14 particles fly outward from screen-center
           *  on impact. The flash + shake on their own read as "screen
           *  effect"; particles add a physical "rocket exploded into
           *  pieces" beat that matches real Crash games' impact moment. */}
          <AnimatePresence>
            {lost && (
              <>
                {Array.from({ length: 14 }).map((_, i) => {
                  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.22 : -0.18);
                  const dist = 100 + (i % 5) * 22;
                  const dx = Math.cos(angle) * dist;
                  const dy = Math.sin(angle) * dist - 12; // bias slightly upward
                  const sz = 5 + (i % 3) * 2;
                  return (
                    <motion.span
                      key={`bust-debris-${i}`}
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        width: sz,
                        height: sz,
                        background:
                          i % 3 === 0 ? '#ff3d8b' : i % 3 === 1 ? '#ffd166' : '#ffffff',
                        boxShadow: '0 0 8px rgba(255,61,139,.7)',
                        zIndex: 5,
                      }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: dx, y: dy, opacity: 0, scale: 0.3, rotate: 280 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: [0.22, 0.5, 0.4, 0.96] }}
                    />
                  );
                })}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Bust history bar chart — like Stake's "Last X rounds" view */}
        {recent.length > 0 && (
          <div className="rounded-xl bg-bg-card border border-edge p-2.5">
            <div className="flex items-end justify-end gap-0.5 h-12">
              {recent.slice().reverse().map((r) => {
                const heightPct = Math.min(100, (Math.log(r.bust) / Math.log(20)) * 100);
                const tier = r.bust >= 10 ? 'epic' : r.bust >= 2 ? 'good' : 'low';
                return (
                  <div
                    key={r.id}
                    className="flex-1 flex flex-col items-center justify-end gap-0.5"
                    title={`${r.bust.toFixed(2)}×${r.cashedAt ? ` · cashed ${r.cashedAt.toFixed(2)}×` : ''}`}
                  >
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${Math.max(8, heightPct)}%`,
                        background:
                          tier === 'epic' ? '#ffc62a' : tier === 'good' ? '#1fff7a' : '#ff3d8b',
                        boxShadow: tier !== 'low' ? `0 0 6px currentColor` : undefined,
                      }}
                    />
                    <span
                      className={`text-[8px] font-mono font-semibold tabular-nums leading-none ${
                        tier === 'epic' ? 'text-accent-gold' : tier === 'good' ? 'text-accent' : 'text-accent-hot'
                      }`}
                    >
                      {r.bust < 10 ? r.bust.toFixed(2) : r.bust.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action button */}
        {inGame ? (
          <button
            onClick={cashOut}
            className="w-full py-4 rounded-xl bg-accent-gold text-bg font-bold text-base uppercase tracking-wider transition active:scale-[0.99] shadow-[0_0_24px_rgba(255,209,102,.55)]"
          >
            Cash Out · {fmtCurrency(bet * currentMult)}
          </button>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive} />
            <BetInput bet={bet} onBetChange={setBet} disabled={autoActive} />
            <div className="rounded-lg bg-bg-elev border border-edge p-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-ink-dim cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCashoutEnabled}
                    onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
                    disabled={autoActive}
                    className="accent-accent w-3.5 h-3.5"
                  />
                  Auto cashout
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1.01}
                  step={0.01}
                  value={autoCashout}
                  disabled={autoActive}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setAutoCashout(Math.max(1.01, v));
                  }}
                  className="font-mono font-semibold text-sm tabular-nums bg-bg-card border border-edge rounded-lg px-2 py-1 w-24 text-right outline-none focus:border-accent/60 disabled:opacity-50"
                />
              </div>
              {autoCashoutEnabled && (
                <div className="mt-2 flex justify-between text-[11px]">
                  <span className="text-ink-mute">Profit on auto</span>
                  <span className="font-mono font-semibold text-accent tabular-nums">
                    {fmtCurrency(profitOnAuto)}
                  </span>
                </div>
              )}
            </div>
            {mode === 'auto' && (
              <>
                <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
                {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
                <p className="text-[10px] text-ink-mute leading-relaxed">
                  Auto-bet uses your auto-cashout target. If it's off it'll be enabled automatically.
                </p>
              </>
            )}
            {mode === 'manual' ? (
              <button
                onClick={lost || won ? reset : start}
                disabled={!(lost || won) && (balance.balance < bet || bet <= 0)}
                className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                {lost || won ? 'Bet Again' : `Bet ${fmtCurrency(bet)}`}
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
        )}
      </div>
    </OriginalPageLayout>
  );
}
