import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  AutoConfigFields,
  AutoProgressDisplay,
  ManualAutoTabs,
  type AutoConfig,
  type Mode,
  useAutoBetRunner,
} from '../_shared/AutoBetController';
import { play, winChanceFor } from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'sliding' | 'reveal';

export function SlideGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [target, setTarget] = useState(2);
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stop, setStop] = useState<number | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [recent, setRecent] = useState<{ id: string; stop: number; win: boolean }[]>([]);
  // Live slider value while animating (between 1.0 and stop)
  const [liveValue, setLiveValue] = useState(1.0);
  const animRef = useRef<number | null>(null);
  const stateRef = useRef({ bet, target });
  stateRef.current = { bet, target };

  const playOnce = useCallback(async (): Promise<number> => {
    const { bet: b, target: t } = stateRef.current;
    if (balance.balance < b || b <= 0 || t < 1.01) return 0;
    setBusy(true);
    setPhase('sliding');
    setStop(null);
    setWin(null);
    setLiveValue(1.0);
    sound.play('click');
    balance.debit(b);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng, b, t);

    // Animate slider from 1.0 → r.stop over a time proportional to stop
    // (smaller stops finish faster, big stops take longer but cap at 2.5s).
    const dur = Math.min(2500, 350 + Math.log10(r.stop) * 700);
    const start = performance.now();
    // Milestone chimes during the climb — match Crash / Aviator / Limbo
    // pattern so the player audibly hears the slider crossing key
    // multiplier thresholds during the ascent.
    const milestones = [1.5, 2, 3, 5, 10, 25, 50, 100, 250, 500, 1000];
    let lastMilestone = 0;
    return new Promise<number>((resolve) => {
      const tick = (now: number) => {
        const dt = now - start;
        const progress = Math.min(1, dt / dur);
        // Ease-out so the slider decelerates as it approaches stop
        const eased = 1 - Math.pow(1 - progress, 2.2);
        const cur = 1 + (r.stop - 1) * eased;
        setLiveValue(+cur.toFixed(2));
        // Check milestones — chime on each crossing.
        while (lastMilestone < milestones.length && cur >= milestones[lastMilestone]!) {
          sound.play(lastMilestone >= 7 ? 'big-win' : lastMilestone >= 4 ? 'win' : 'coin');
          lastMilestone++;
        }
        if (progress < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          // Settle
          setStop(r.stop);
          setWin(r.win);
          setPhase('reveal');
          if (r.win) {
            balance.credit(r.payout);
            sound.play(
              r.payout >= b * 50 ? 'mega-win' :
              r.payout >= b * 5 ? 'big-win' : 'win',
            );
            if (r.payout >= b * 5) {
              fireConfetti({
                count: r.payout >= b * 50 ? 130 : 70,
                colors: ['#1fff7a', '#ffd166', '#ffffff'],
              });
            }
          } else {
            sound.play('drop');
          }
          history.record({
            game: 'Slide',
            bet: b,
            payout: r.payout,
            multiplier: r.multiplier,
            serverSeedHash: fairness.hash,
            clientSeed: seeds.clientSeed,
            nonce: seeds.nonce,
          });
          session.recordSpin(b, r.payout, false);
          setRecent((prev) =>
            [{ id: `${seeds.nonce}`, stop: r.stop, win: r.win }, ...prev].slice(0, 12),
          );
          setBusy(false);
          resolve(r.payout - b);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    });
  }, [balance, fairness, sound, history, session]);

  // Cleanup any in-flight animation on unmount
  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 350,
    runOnce: playOnce,
    onStop: () => setAutoActive(false),
  });

  useHotkey(' ', () => { if (mode === 'manual') void playOnce(); }, !autoActive);

  const winChance = winChanceFor(target);
  const profitOnWin = +(bet * target - bet).toFixed(2);

  // Slider shows progress 1× → max(target, current) on a log-ish scale so
  // both small and large multipliers stay readable.
  const displayMax = Math.max(target * 1.5, liveValue * 1.1, 4);
  const sliderProgress = Math.min(1, (liveValue - 1) / (displayMax - 1));
  const targetMarker = Math.min(1, (target - 1) / (displayMax - 1));

  return (
    <OriginalPageLayout title="Slide">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Live multiplier */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-5 flex flex-col items-center justify-center min-h-[140px]">
          <motion.div
            className={`font-mono font-extrabold tabular-nums leading-none ${
              phase === 'reveal' && win === false
                ? 'text-stake-red'
                : phase === 'reveal' && win === true
                  ? 'text-stake-green'
                  : 'text-stake-text'
            }`}
            style={{ fontSize: 'clamp(2.5rem, 12vw, 4.5rem)' }}
            animate={
              phase === 'reveal'
                ? { scale: [1, 1.08, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.45 }}
          >
            {fmtMultiplier(phase === 'idle' ? 1 : liveValue)}
          </motion.div>
          <div className="text-[10px] uppercase tracking-widest text-stake-muted mt-2">
            {phase === 'idle' && 'Set target & slide'}
            {phase === 'sliding' && 'Sliding…'}
            {phase === 'reveal' && (win
              ? `Won · ${fmtCurrency(bet * target)}`
              : `Stopped at ${fmtMultiplier(stop ?? 0)} (target ${fmtMultiplier(target)})`)}
          </div>
        </div>

        {/* Slider visual */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-2 px-1">
            Live slider
          </div>
          <div
            className="relative w-full h-7 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, #1a1f29 0%, #2a3142 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,.4)',
            }}
          >
            {/* Filled portion */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${sliderProgress * 100}%`,
                background:
                  win === false && phase === 'reveal'
                    ? 'linear-gradient(90deg, #c8102e, #ff5560)'
                    : 'linear-gradient(90deg, #1fff7a, #ffd166)',
                boxShadow:
                  win === false && phase === 'reveal'
                    ? '0 0 18px rgba(255,85,96,.7)'
                    : '0 0 16px rgba(31,255,122,.55)',
              }}
              transition={{ duration: 0.06 }}
            />
            {/* Leading-edge spark while the slider is climbing — same
             *  pattern as Crash's curve tip spark. Disappears on stop. */}
            {phase === 'sliding' && (
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none z-20"
                style={{
                  left: `calc(${sliderProgress * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  background: 'radial-gradient(circle, #ffffff 30%, #ffd166 70%, transparent 100%)',
                  boxShadow: '0 0 8px rgba(255,209,102,.95), 0 0 16px rgba(31,255,122,.6)',
                  transition: 'left 60ms linear',
                }}
              />
            )}
            {/* Target marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 z-10"
              style={{
                left: `${targetMarker * 100}%`,
                background: '#ffd166',
                boxShadow: '0 0 6px rgba(255,209,102,.85)',
              }}
            />
            <div
              className="absolute -top-5 text-[9px] font-mono font-bold text-accent-gold tabular-nums z-10 -translate-x-1/2"
              style={{ left: `${targetMarker * 100}%` }}
            >
              {fmtMultiplier(target)}
            </div>
          </div>
        </div>

        {/* Recent results */}
        {recent.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-stake-muted mr-1 flex-shrink-0">
              Recent
            </span>
            <AnimatePresence initial={false}>
              {recent.map((r) => (
                <motion.span
                  key={r.id}
                  layout
                  initial={{ scale: 0.6, opacity: 0, x: -12 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                  className={`font-mono font-semibold text-[10px] tabular-nums px-1.5 py-1 rounded-md flex-shrink-0 ${
                    r.win ? 'bg-stake-green/15 text-stake-green' : 'bg-stake-input text-stake-muted'
                  }`}
                >
                  {fmtMultiplier(r.stop)}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Controls */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || busy} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || busy} />
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-stake-muted">
                Target multiplier
              </span>
              <span className="font-mono font-semibold text-sm text-stake-text tabular-nums">
                {fmtMultiplier(target)}
              </span>
            </div>
            <input
              type="number"
              min={1.01}
              max={1000000}
              step={0.01}
              value={target}
              onChange={(e) => setTarget(Math.max(1.01, parseFloat(e.target.value) || 2))}
              disabled={autoActive || busy}
              className="w-full bg-stake-input border border-stake-border rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-stake-text"
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stake-muted">Win chance</span>
            <span className="font-mono tabular-nums text-stake-muted">
              {winChance.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stake-muted">Profit on Win</span>
            <span className="font-mono font-semibold text-stake-green tabular-nums">
              {fmtCurrency(profitOnWin)}
            </span>
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
              disabled={busy || balance.balance < bet || bet <= 0 || target < 1.01}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy ? 'Sliding…' : `Slide · ${fmtCurrency(bet)}`}
            </button>
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (balance.balance < bet || bet <= 0)}
              className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] ${
                autoActive ? 'bg-stake-red text-white' : 'bg-stake-green text-stake-bg'
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
