import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
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

type Phase = 'idle' | 'flying' | 'done';
type SlotId = 'a' | 'b';

/** Aviator slot — per-bet state. Same shape as Crash because real
 *  Aviator also has a 2-bet panel (the iconic side-by-side layout). */
type Slot = {
  bet: number;
  autoCashout: number;
  autoEnabled: boolean;
  active: boolean;
  status: 'idle' | 'live' | 'cashed' | 'busted';
  cashedAt: number | null;
};

const initialSlot = (bet: number, autoCashout: number, active: boolean): Slot => ({
  bet,
  autoCashout,
  autoEnabled: false,
  active,
  status: 'idle',
  cashedAt: null,
});

/** Aviator — Crash-mechanics with rocket visual + the same TWO-BET
 *  panel layout real Aviator pioneered. */
export function AviatorGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [slotA, setSlotA] = useState<Slot>(initialSlot(1, 2.0, true));
  const [slotB, setSlotB] = useState<Slot>(initialSlot(1, 5.0, false));
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
  const bustRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const slotARef = useRef<Slot>(slotA); useEffect(() => { slotARef.current = slotA; }, [slotA]);
  const slotBRef = useRef<Slot>(slotB); useEffect(() => { slotBRef.current = slotB; }, [slotB]);
  const autoResolveRef = useRef<((delta: number) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  const finalizeSlot = useCallback(
    (id: SlotId, slot: Slot, cashedAt: number | null) => {
      const won = cashedAt !== null;
      const payout = won ? +(slot.bet * cashedAt).toFixed(2) : 0;
      if (won) {
        balance.credit(payout);
        if (id === 'a') {
          sound.play(cashedAt >= 10 ? 'mega-win' : cashedAt >= 3 ? 'big-win' : 'win');
          if (cashedAt >= 2) {
            fireConfetti({
              count: cashedAt >= 20 ? 130 : cashedAt >= 5 ? 80 : 50,
              colors: ['#5fb8ff', '#ffd166', '#ffffff'],
            });
          }
        } else {
          sound.play('coin');
        }
      }
      history.record({
        game: id === 'a' ? 'Aviator' : 'Aviator (B)',
        bet: slot.bet,
        payout,
        multiplier: won ? cashedAt : 0,
        serverSeedHash: fairness.hash,
        clientSeed: '',
        nonce: 0,
      });
      session.recordSpin(slot.bet, payout, false);
      return payout - slot.bet;
    },
    [balance, sound, history, fairness, session],
  );

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const m = multiplierAt(elapsed);
    setCurrentMult(m);
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

    for (const [id, ref, setSlot] of [
      ['a', slotARef, setSlotA] as const,
      ['b', slotBRef, setSlotB] as const,
    ]) {
      const s = ref.current;
      if (s.status === 'live' && s.autoEnabled && m >= s.autoCashout && s.autoCashout < bAt) {
        setSlot({ ...s, status: 'cashed', cashedAt: s.autoCashout });
        finalizeSlot(id, s, s.autoCashout);
      }
    }

    if (m >= bAt) {
      setCurrentMult(bAt);
      cleanup();
      if (phaseRef.current === 'flying') {
        let slotADelta = 0;
        const sA = slotARef.current;
        if (sA.status === 'live') {
          setSlotA({ ...sA, status: 'busted', cashedAt: null });
          slotADelta = finalizeSlot('a', sA, null);
        } else if (sA.status === 'cashed' && sA.cashedAt !== null) {
          slotADelta = sA.bet * sA.cashedAt - sA.bet;
        }
        const sB = slotBRef.current;
        if (sB.status === 'live') {
          setSlotB({ ...sB, status: 'busted', cashedAt: null });
          finalizeSlot('b', sB, null);
        }
        sound.play('drop');
        phaseRef.current = 'done';
        setPhase('done');
        setRecent((r) => [{ id: `${Date.now()}`, bust: bAt, cashedAt: sA.cashedAt }, ...r].slice(0, 20));
        if (autoResolveRef.current) {
          autoResolveRef.current(slotADelta);
          autoResolveRef.current = null;
        }
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [cleanup, finalizeSlot, sound]);

  const activeSlots = useMemo(() => {
    return [
      ...(slotA.active ? [{ id: 'a' as SlotId, slot: slotA }] : []),
      ...(slotB.active ? [{ id: 'b' as SlotId, slot: slotB }] : []),
    ];
  }, [slotA, slotB]);
  const totalBet = activeSlots.reduce((s, x) => s + x.slot.bet, 0);

  const start = useCallback(() => {
    if (phase === 'flying') return;
    if (activeSlots.length === 0) return;
    if (totalBet > balance.balance || totalBet <= 0) return;
    activeSlots.forEach(({ id, slot }) => {
      const setSlot = id === 'a' ? setSlotA : setSlotB;
      setSlot({ ...slot, status: 'live', cashedAt: null });
    });
    sound.play('click');
    balance.debit(totalBet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const b = rollCrash(rng);
    bustRef.current = b;
    setBust(b);
    setCurrentMult(1.0);
    phaseRef.current = 'flying';
    setPhase('flying');
    startTimeRef.current = performance.now();
    lastClimbMilestoneRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [phase, activeSlots, totalBet, balance, fairness, sound, tick]);

  const cashOutSlot = useCallback((id: SlotId) => {
    const ref = id === 'a' ? slotARef : slotBRef;
    const setSlot = id === 'a' ? setSlotA : setSlotB;
    const s = ref.current;
    if (phaseRef.current !== 'flying' || s.status !== 'live') return;
    const bAt = bustRef.current;
    if (bAt === null || currentMult >= bAt) return;
    setSlot({ ...s, status: 'cashed', cashedAt: currentMult });
    finalizeSlot(id, s, currentMult);
  }, [currentMult, finalizeSlot]);

  const reset = useCallback(() => {
    setSlotA((s) => ({ ...s, status: 'idle', cashedAt: null }));
    setSlotB((s) => ({ ...s, status: 'idle', cashedAt: null }));
    setPhase('idle');
    setBust(null);
    setCurrentMult(1.0);
    bustRef.current = null;
    phaseRef.current = 'idle';
  }, []);

  const autoRunOnce = useCallback(async (): Promise<number> => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'done') return 0;
    const sA = slotARef.current;
    if (!sA.autoEnabled) setSlotA({ ...sA, autoEnabled: true });
    const bet = sA.bet;
    if (balance.balance < bet || bet <= 0) return 0;
    return new Promise<number>((resolve) => {
      autoResolveRef.current = resolve;
      setSlotA({ ...sA, autoEnabled: true, status: 'live', cashedAt: null });
      setSlotB((s) => ({ ...s, active: false, status: 'idle', cashedAt: null }));
      sound.play('click');
      balance.debit(bet);
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const b = rollCrash(rng);
      bustRef.current = b;
      setBust(b);
      setCurrentMult(1.0);
      phaseRef.current = 'flying';
      setPhase('flying');
      startTimeRef.current = performance.now();
      lastClimbMilestoneRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    });
  }, [balance, fairness, sound, tick]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 600,
    runOnce: autoRunOnce,
    onStop: () => setAutoActive(false),
  });

  const inGame = phase === 'flying';
  const someoneWon = phase === 'done' && (slotA.status === 'cashed' || slotB.status === 'cashed');
  const lost = phase === 'done' && slotA.status === 'busted' && (!slotB.active || slotB.status === 'busted');

  // Space-to-launch / Space-to-cashout hotkey.
  useHotkey(' ', () => {
    if (autoActive) return;
    if (phase === 'flying') {
      if (slotA.status === 'live') cashOutSlot('a');
    } else {
      if (phase === 'done') reset();
      start();
    }
  }, mode === 'manual');

  // Plane trajectory
  const altitudePct = Math.min(0.85, Math.log(currentMult) / Math.log(50));
  const distancePct = Math.min(0.88, Math.log(currentMult) / Math.log(20));

  return (
    <OriginalPageLayout title="Aviator">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Sky stage with plane */}
        <div
          className={`rounded-2xl border border-edge p-4 relative overflow-hidden min-h-[280px] ${lost ? 'shake-medium' : ''}`}
          style={{
            background: lost
              ? 'linear-gradient(180deg, #2a0a14 0%, #5a0814 40%, #1a0408 100%)'
              : 'linear-gradient(180deg, #1a3a8a 0%, #2a5acc 38%, #5fb8ff 80%, #a3d4ff 100%)',
          }}
        >
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
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
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
            <path
              d={`M 5 95 Q ${distancePct * 50} ${95 - altitudePct * 80} ${distancePct * 95} ${95 - altitudePct * 90}`}
              fill="none"
              stroke="url(#aviator-trail)"
              strokeWidth="3.6"
              strokeLinecap="round"
              opacity={inGame || someoneWon || lost ? 0.55 : 0}
              filter="url(#aviator-trail-glow)"
            />
            <path
              d={`M 5 95 Q ${distancePct * 50} ${95 - altitudePct * 80} ${distancePct * 95} ${95 - altitudePct * 90}`}
              fill="none"
              stroke="url(#aviator-trail)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity={inGame || someoneWon || lost ? 1 : 0}
            />
          </svg>
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
                    rotate: inGame || someoneWon ? -12 : 0,
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
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[260px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                className={`font-mono font-bold tabular-nums leading-none ${
                  lost ? 'text-accent-hot' : someoneWon ? 'text-accent' : 'text-white'
                }`}
                style={{
                  fontSize: 'clamp(48px, 14vw, 88px)',
                  textShadow: lost
                    ? '0 0 28px rgba(255,61,139,.85)'
                    : someoneWon
                      ? '0 0 28px rgba(31,255,122,.85)'
                      : '0 0 18px rgba(0,0,0,.5), 0 0 12px rgba(255,255,255,.25)',
                }}
              >
                {(lost ? (bust ?? currentMult) : currentMult).toFixed(2)}×
              </motion.div>
            </AnimatePresence>
            <div className="mt-2 text-xs text-white/85 h-4">
              {lost && `Crashed at ${bust?.toFixed(2)}×`}
              {someoneWon && !lost && 'Round complete'}
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

        {/* Bet panels */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || inGame} />

          <SlotPanel
            id="a"
            slot={slotA}
            onChange={setSlotA}
            inGame={inGame}
            currentMult={currentMult}
            onCashOut={() => cashOutSlot('a')}
            disabled={autoActive}
            allowToggleActive={false}
          />

          {mode === 'manual' && !slotB.active && phase !== 'flying' && !autoActive && (
            <button
              onClick={() => setSlotB({ ...slotB, active: true })}
              className="w-full py-2 rounded-lg bg-bg-elev border border-edge border-dashed text-ink-dim hover:text-ink hover:border-accent/40 text-xs font-semibold uppercase tracking-wider transition active:scale-95"
            >
              + Add second bet
            </button>
          )}
          {mode === 'manual' && slotB.active && (
            <SlotPanel
              id="b"
              slot={slotB}
              onChange={setSlotB}
              inGame={inGame}
              currentMult={currentMult}
              onCashOut={() => cashOutSlot('b')}
              disabled={autoActive}
              allowToggleActive
              onRemove={() => setSlotB({ ...slotB, active: false, status: 'idle' })}
            />
          )}

          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
              <p className="text-[10px] text-ink-mute leading-relaxed">
                Auto-bet runs bet A only with its auto-cashout target. Bet B is paused during auto.
              </p>
            </>
          )}

          {mode === 'manual' ? (
            !inGame ? (
              <button
                onClick={phase === 'done' ? () => { reset(); start(); } : start}
                disabled={activeSlots.length === 0 || totalBet <= 0 || totalBet > balance.balance}
                className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                {activeSlots.length === 0
                  ? 'Activate at least one bet'
                  : phase === 'done'
                    ? `Launch · ${fmtCurrency(totalBet)}`
                    : `Launch · ${fmtCurrency(totalBet)}`}
              </button>
            ) : null
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (balance.balance < slotA.bet || slotA.bet <= 0)}
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

function SlotPanel({
  id,
  slot,
  onChange,
  inGame,
  currentMult,
  onCashOut,
  disabled,
  allowToggleActive,
  onRemove,
}: {
  id: SlotId;
  slot: Slot;
  onChange: (s: Slot) => void;
  inGame: boolean;
  currentMult: number;
  onCashOut: () => void;
  disabled: boolean;
  allowToggleActive: boolean;
  onRemove?: () => void;
}) {
  const label = id === 'a' ? 'Bet A' : 'Bet B';
  const accent = id === 'a' ? 'text-accent' : 'text-accent-cyan';
  const cashColor = id === 'a' ? 'bg-accent-gold' : 'bg-accent-cyan';
  const profitOnAuto = +(slot.bet * slot.autoCashout - slot.bet).toFixed(2);
  const livePayout = +(slot.bet * currentMult).toFixed(2);
  const editable = !inGame && !disabled;

  return (
    <div className="rounded-xl bg-bg-elev border border-edge p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] uppercase tracking-widest font-bold ${accent}`}>{label}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={slot.status} cashedAt={slot.cashedAt} />
          {allowToggleActive && onRemove && !inGame && (
            <button
              onClick={onRemove}
              disabled={disabled}
              className="text-ink-mute hover:text-accent-hot text-xs transition disabled:opacity-50"
              aria-label="Remove bet B"
              title="Remove second bet"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <BetInput
        bet={slot.bet}
        onBetChange={(b) => onChange({ ...slot, bet: b })}
        disabled={!editable}
      />

      <div className="rounded-lg bg-bg-card border border-edge p-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] text-ink-dim cursor-pointer">
            <input
              type="checkbox"
              checked={slot.autoEnabled}
              onChange={(e) => onChange({ ...slot, autoEnabled: e.target.checked })}
              disabled={!editable}
              className="accent-accent w-3.5 h-3.5"
            />
            Auto cashout
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={1.01}
            step={0.01}
            value={slot.autoCashout}
            disabled={!editable}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) onChange({ ...slot, autoCashout: Math.max(1.01, v) });
            }}
            className="font-mono font-semibold text-xs tabular-nums bg-bg-elev border border-edge rounded px-2 py-1 w-20 text-right outline-none focus:border-accent/60 disabled:opacity-50"
          />
        </div>
        {slot.autoEnabled && (
          <div className="mt-1.5 flex justify-between text-[10px]">
            <span className="text-ink-mute">Profit on auto</span>
            <span className={`font-mono font-semibold ${accent} tabular-nums`}>
              {fmtCurrency(profitOnAuto)}
            </span>
          </div>
        )}
      </div>

      {inGame && slot.status === 'live' && (
        <button
          onClick={onCashOut}
          className={`w-full py-2.5 rounded-lg ${cashColor} text-bg font-bold text-sm uppercase tracking-wider transition active:scale-[0.99] shadow-[0_0_14px_rgba(255,209,102,.4)]`}
        >
          Cash Out · {fmtCurrency(livePayout)}
        </button>
      )}
      {inGame && slot.status === 'cashed' && (
        <div className="text-center text-xs text-accent font-mono py-1">
          Cashed at {slot.cashedAt?.toFixed(2)}× · won {fmtCurrency(slot.bet * (slot.cashedAt ?? 0))}
        </div>
      )}
      {inGame && slot.status === 'busted' && (
        <div className="text-center text-xs text-accent-hot font-mono py-1">
          Bust · lost {fmtCurrency(slot.bet)}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, cashedAt }: { status: Slot['status']; cashedAt: number | null }) {
  if (status === 'idle') return null;
  if (status === 'live') {
    return (
      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/40">
        LIVE
      </span>
    );
  }
  if (status === 'cashed') {
    return (
      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/40">
        CASHED {cashedAt?.toFixed(2)}×
      </span>
    );
  }
  return (
    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-hot/15 text-accent-hot border border-accent-hot/40">
      BUST
    </span>
  );
}
