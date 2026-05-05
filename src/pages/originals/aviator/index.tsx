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
import { multiplierAt, rollCrash } from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'flying' | 'crashed' | 'cashed';

/** Aviator — Crash-mechanics game with a rocket-flying visual. The plane
 *  takes off, the multiplier rises with altitude, and at a random RNG-
 *  determined point the plane explodes. Cash out before that to lock in
 *  the multiplier × bet payout.
 *
 *  Math is identical to Crash (99/u bust, 99% RTP); the visual emphasis
 *  is on the rocket trajectory through clouds rather than a multiplier
 *  curve graph. Useful for users who prefer Aviator-style presentation
 *  over the abstract climbing line. */
export function AviatorGame() {
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
  const lastClimbMilestoneRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const cashedAtRef = useRef<number | null>(null);
  const bustRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const autoCashoutRef = useRef<{ enabled: boolean; target: number }>({ enabled: false, target: 2.0 });
  const autoResolveRef = useRef<((delta: number) => void) | null>(null);

  useEffect(() => {
    autoCashoutRef.current = { enabled: autoCashoutEnabled, target: autoCashout };
  }, [autoCashoutEnabled, autoCashout]);

  const cleanup = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  const finalize = useCallback(
    (cashedAt: number | null, bustAt: number) => {
      const win = cashedAt !== null && cashedAt < bustAt;
      const payout = win ? +(bet * cashedAt!).toFixed(2) : 0;
      if (win) {
        balance.credit(payout);
        sound.play(cashedAt! >= 10 ? 'mega-win' : cashedAt! >= 3 ? 'big-win' : 'win');
        if (cashedAt! >= 2) {
          fireConfetti({
            count: cashedAt! >= 20 ? 130 : cashedAt! >= 5 ? 80 : 50,
            colors: ['#5fb8ff', '#ffd166', '#ffffff'],
          });
        }
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Aviator',
        bet,
        payout,
        multiplier: win ? cashedAt! : 0,
        serverSeedHash: fairness.hash,
        clientSeed: '',
        nonce: 0,
      });
      session.recordSpin(bet, payout, false);
      setRecent((r) =>
        [{ id: `${Date.now()}`, bust: bustAt, cashedAt }, ...r].slice(0, 20),
      );
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
    // Climb milestones — same scheme as Crash so the round audibly
    // accelerates as the plane climbs higher.
    const milestones = [1.5, 2, 3, 5, 10, 25, 50, 100, 250, 500, 1000];
    while (
      lastClimbMilestoneRef.current < milestones.length &&
      m >= milestones[lastClimbMilestoneRef.current]!
    ) {
      const idx = lastClimbMilestoneRef.current;
      sound.play(idx >= 7 ? 'big-win' : idx >= 4 ? 'win' : 'coin');
      lastClimbMilestoneRef.current += 1;
    }
    const bAt = bustRef.current;
    if (bAt === null) return;
    const auto = autoCashoutRef.current;
    if (
      phaseRef.current === 'flying' &&
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
      setCurrentMult(bAt);
      cleanup();
      if (phaseRef.current === 'flying') {
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
    const b = rollCrash(rng);
    bustRef.current = b;
    cashedAtRef.current = null;
    setBust(b);
    setCurrentMult(1.0);
    phaseRef.current = 'flying';
    setPhase('flying');
    startTimeRef.current = performance.now();
    lastClimbMilestoneRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [phase, balance, bet, fairness, sound, tick]);

  const cashOut = useCallback(() => {
    if (phaseRef.current !== 'flying' || cashedAtRef.current !== null) return;
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

  const autoRunOnce = useCallback(async (): Promise<number> => {
    if (!autoCashoutEnabled) setAutoCashoutEnabled(true);
    if (balance.balance < bet || bet <= 0) return 0;
    return new Promise<number>((resolve) => {
      autoResolveRef.current = resolve;
      sound.play('click');
      balance.debit(bet);
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const b = rollCrash(rng);
      bustRef.current = b;
      cashedAtRef.current = null;
      setBust(b);
      setCurrentMult(1.0);
      phaseRef.current = 'flying';
      setPhase('flying');
      startTimeRef.current = performance.now();
      lastClimbMilestoneRef.current = 0;
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

  const inGame = phase === 'flying';
  const won = phase === 'cashed';
  const lost = phase === 'crashed';
  const profitOnAuto = useMemo(
    () => +(bet * autoCashout - bet).toFixed(2),
    [bet, autoCashout],
  );

  // Plane trajectory: x and y travel diagonally across the sky as the
  // multiplier grows. cap at 90% so the rocket stays in-frame.
  const altitudePct = Math.min(0.85, Math.log(currentMult) / Math.log(50));
  const distancePct = Math.min(0.88, Math.log(currentMult) / Math.log(20));

  return (
    <OriginalPageLayout title="Aviator">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Sky stage with plane — shakes briefly when the plane crashes
         *  (camera-shake on impact, like a real cockpit-cam). */}
        <div
          className={`rounded-2xl border border-edge p-4 relative overflow-hidden min-h-[280px] ${lost ? 'shake-medium' : ''}`}
          style={{
            background: lost
              ? 'linear-gradient(180deg, #2a0a14 0%, #5a0814 40%, #1a0408 100%)'
              : 'linear-gradient(180deg, #1a3a8a 0%, #2a5acc 38%, #5fb8ff 80%, #a3d4ff 100%)',
          }}
        >
          {/* Cloud layer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(28% 14% at 22% 22%, rgba(255,255,255,.45), transparent 70%),
                radial-gradient(24% 12% at 70% 38%, rgba(255,255,255,.4), transparent 70%),
                radial-gradient(20% 10% at 14% 58%, rgba(255,255,255,.35), transparent 70%),
                radial-gradient(28% 12% at 82% 70%, rgba(255,255,255,.4), transparent 70%)
              `,
              opacity: lost ? 0.2 : 0.7,
              transition: 'opacity .4s',
            }}
          />
          {/* Trail — solid glowing arc from launch corner to current
           *  plane position. Real Aviator shows a thick gold contrail
           *  with a brighter leading edge; the previous thin dashed
           *  line read as a graph-curve, not exhaust. */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="aviator-trail" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor={lost ? '#ff3d8b' : '#ffd166'} stopOpacity="0.0" />
                <stop offset="65%" stopColor={lost ? '#ff3d8b' : '#ffd166'} stopOpacity="0.45" />
                <stop offset="100%" stopColor={lost ? '#ff8aa3' : '#ffe9a8'} stopOpacity="0.95" />
              </linearGradient>
              <filter id="aviator-trail-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.6" />
              </filter>
            </defs>
            {/* Outer halo stroke */}
            <path
              d={`M 5 95 Q ${distancePct * 50} ${95 - altitudePct * 80} ${distancePct * 95} ${95 - altitudePct * 90}`}
              fill="none"
              stroke="url(#aviator-trail)"
              strokeWidth="3.6"
              strokeLinecap="round"
              opacity={inGame || won || lost ? 0.55 : 0}
              filter="url(#aviator-trail-glow)"
            />
            {/* Bright inner core */}
            <path
              d={`M 5 95 Q ${distancePct * 50} ${95 - altitudePct * 80} ${distancePct * 95} ${95 - altitudePct * 90}`}
              fill="none"
              stroke="url(#aviator-trail)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity={inGame || won || lost ? 1 : 0}
            />
          </svg>
          {/* Exhaust puffs — three small cloud particles that spawn
           *  just behind the plane and drift back / down while fading.
           *  Cycle-keyed so each new puff plays from scratch as the
           *  plane climbs. Real Aviator has visible exhaust; this fakes
           *  it without a physics particle system. */}
          {inGame && (
            <>
              {[0, 0.4, 0.8].map((delay, i) => (
                <motion.span
                  key={`puff-${i}-${Math.floor(currentMult * 2)}`}
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    left: `${5 + distancePct * 90}%`,
                    top: `${95 - altitudePct * 90}%`,
                    width: '14px',
                    height: '14px',
                    background:
                      'radial-gradient(circle at 40% 40%, rgba(255,255,255,.85), rgba(255,209,102,.55) 50%, transparent 75%)',
                    transform: 'translate(-50%, -50%)',
                    mixBlendMode: 'screen',
                  }}
                  initial={{ opacity: 0.85, scale: 0.6, x: 0, y: 0 }}
                  animate={{ opacity: 0, scale: 1.6, x: -22, y: 14 }}
                  transition={{ duration: 1.0, delay, repeat: Infinity, ease: 'easeOut' }}
                />
              ))}
            </>
          )}
          {/* Plane / explosion — on bust the plane visibly tumbles
           *  toward the ground (rotates + falls 30%) over 600ms before
           *  the 💥 swap settles. Real Aviator shows the plane spinning
           *  away off-screen rather than instantly transforming. */}
          <motion.div
            className="absolute pointer-events-none select-none"
            initial={false}
            animate={
              lost
                ? {
                    left: `${5 + distancePct * 90}%`,
                    top: `${Math.min(98, 95 - altitudePct * 90 + 30)}%`,
                    rotate: -110,
                  }
                : {
                    left: `${5 + distancePct * 90}%`,
                    top: `${95 - altitudePct * 90}%`,
                    rotate: inGame || won ? -12 : 0,
                  }
            }
            transition={
              lost
                ? { duration: 0.6, ease: [0.36, 0, 0.66, 1] }
                : { duration: 0.12, ease: 'linear' }
            }
            style={{
              transform: 'translate(-50%, -50%)',
              fontSize: 'clamp(28px, 7vw, 44px)',
              filter: lost
                ? 'drop-shadow(0 0 12px rgba(255,61,139,.95))'
                : 'drop-shadow(0 4px 8px rgba(0,0,0,.5))',
            }}
          >
            {lost ? '💥' : '✈️'}
          </motion.div>
          {/* Centered multiplier — keyed on phase only (same fix Crash
           *  got): the previous key included currentMult so the spring
           *  scale-pop remounted on every animation tick during flight,
           *  making the counter visibly judder. Now the pop fires once
           *  per phase change. */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[260px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                className={`font-mono font-bold tabular-nums leading-none ${
                  lost ? 'text-accent-hot' : won ? 'text-accent' : 'text-white'
                }`}
                style={{
                  fontSize: 'clamp(48px, 14vw, 88px)',
                  textShadow: lost
                    ? '0 0 28px rgba(255,61,139,.85)'
                    : won
                      ? '0 0 28px rgba(31,255,122,.85)'
                      : '0 0 18px rgba(0,0,0,.5), 0 0 12px rgba(255,255,255,.25)',
                }}
              >
                {(lost ? (bust ?? currentMult) : currentMult).toFixed(2)}×
              </motion.div>
            </AnimatePresence>
            <div className="mt-2 text-xs text-white/85 h-4">
              {lost && `Crashed at ${bust?.toFixed(2)}×`}
              {won && `Cashed out · won ${fmtCurrency(bet * cashedAtRef.current!)}`}
              {inGame && 'Cash out before the plane flies away!'}
              {phase === 'idle' && 'Place a bet to launch'}
            </div>
          </div>
        </div>

        {/* Recent rounds bar */}
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
              </>
            )}
            {mode === 'manual' ? (
              <button
                onClick={lost || won ? reset : start}
                disabled={!(lost || won) && (balance.balance < bet || bet <= 0)}
                className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                {lost || won ? 'Bet Again' : `Launch ${fmtCurrency(bet)}`}
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
