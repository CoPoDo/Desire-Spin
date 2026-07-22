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
import { multiplierAt, rollBust, timeForMultiplier } from './engine';
import { fireConfetti } from '../../../lib/confetti';
import { LocalRoundFeed } from '../_shared/LocalRoundFeed';

type Phase = 'idle' | 'running' | 'done';
type SlotId = 'a' | 'b';

/** Per-slot state. Real Stake Crash has TWO independent bet panels —
 *  each with its own bet amount, auto-cashout target, and status. The
 *  player can ladder strategies (e.g., one bet auto-cashes at 1.5× for
 *  safety while a second rides to 50× for a moonshot). */
type Slot = {
  bet: number;
  autoCashout: number;
  autoEnabled: boolean;
  active: boolean;                       // is this slot included in the next round?
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

/** Stake-style Crash with TWO independent bet panels.
 *  Round phases:
 *    idle → place bets → click Bet → running → all live slots cashed
 *    or busted → done. */
export function CrashGame() {
  const { balance, fairness, sound, history, session } = useGame();
  // Each slot is independently configurable. Slot B starts inactive so
  // single-bet players see the same compact UI as before.
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
  const rafRef = useRef<number | null>(null);
  const bustRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const lastClimbMilestoneRef = useRef<number>(0);
  // Latest slot states via refs so the rAF tick can read fresh values
  // without re-creating the callback on every state change.
  const slotARef = useRef<Slot>(slotA); useEffect(() => { slotARef.current = slotA; }, [slotA]);
  const slotBRef = useRef<Slot>(slotB); useEffect(() => { slotBRef.current = slotB; }, [slotB]);

  const cleanup = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  // Auto-bet pending Promise resolver. Auto-bet only runs slot A.
  const autoResolveRef = useRef<((delta: number) => void) | null>(null);

  /** Finalize a single slot after it cashes or busts. Credits the
   *  payout (if won) and updates the slot's status. Returns the net
   *  delta for that slot. */
  const finalizeSlot = useCallback(
    (id: SlotId, slot: Slot, cashedAt: number | null) => {
      const won = cashedAt !== null;
      const payout = won ? +(slot.bet * cashedAt).toFixed(2) : 0;
      if (won) {
        balance.credit(payout);
      }
      // Sound only for slot A (otherwise two slots cashing simultaneously
      // would chord. Slot B uses a quieter chime.)
      if (won) {
        if (id === 'a') {
          sound.play(cashedAt >= 10 ? 'mega-win' : cashedAt >= 3 ? 'big-win' : 'win');
          if (cashedAt >= 2) {
            fireConfetti({
              count: cashedAt >= 20 ? 130 : cashedAt >= 5 ? 80 : 50,
              colors: ['#00e701', '#22d3ee', '#ffd166', '#ffffff'],
            });
          }
        } else {
          sound.play('coin');
        }
      }
      // Per-slot history record so the player can see each bet in the
      // shared history table independently.
      history.record({
        game: id === 'a' ? 'Crash' : 'Crash (B)',
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
    // Climb-tick milestones
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

    // Check each slot's auto-cashout — fire if multiplier crosses
    // target AND target is below the bust.
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
      // Bust — mark all live slots busted.
      setCurrentMult(bAt);
      cleanup();
      if (phaseRef.current === 'running') {
        // Auto-bet only tracks slot A's delta
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
        // Resolve auto-bet promise with slot-A delta
        if (autoResolveRef.current) {
          autoResolveRef.current(slotADelta);
          autoResolveRef.current = null;
        }
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [cleanup, finalizeSlot, sound]);

  /** Compute the set of slots that will participate in the next round
   *  and the total cost. */
  const activeSlots = useMemo(() => {
    return [
      ...(slotA.active ? [{ id: 'a' as SlotId, slot: slotA }] : []),
      ...(slotB.active ? [{ id: 'b' as SlotId, slot: slotB }] : []),
    ];
  }, [slotA, slotB]);
  const totalBet = activeSlots.reduce((s, x) => s + x.slot.bet, 0);

  const start = useCallback(() => {
    if (phase === 'running') return;
    if (activeSlots.length === 0) return;
    if (totalBet > balance.balance || totalBet <= 0) return;
    // Reset slots for this round
    activeSlots.forEach(({ id, slot }) => {
      const setSlot = id === 'a' ? setSlotA : setSlotB;
      setSlot({ ...slot, status: 'live', cashedAt: null });
    });
    sound.play('click');
    balance.debit(totalBet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const b = rollBust(rng);
    bustRef.current = b;
    setBust(b);
    setCurrentMult(1.0);
    phaseRef.current = 'running';
    setPhase('running');
    startTimeRef.current = performance.now();
    lastClimbMilestoneRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [phase, activeSlots, totalBet, balance, fairness, sound, tick]);

  const cashOutSlot = useCallback((id: SlotId) => {
    const ref = id === 'a' ? slotARef : slotBRef;
    const setSlot = id === 'a' ? setSlotA : setSlotB;
    const s = ref.current;
    if (phaseRef.current !== 'running' || s.status !== 'live') return;
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

  /** Auto-bet uses slot A only — slot B is too unusual to auto-loop
   *  (two independent strategies are a player choice, not a machine
   *  loop). Forces slot A's auto-cashout on so the round resolves. */
  const autoRunOnce = useCallback(async (): Promise<number> => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'done') return 0;
    const sA = slotARef.current;
    if (!sA.autoEnabled) {
      setSlotA({ ...sA, autoEnabled: true });
    }
    const bet = sA.bet;
    if (balance.balance < bet || bet <= 0) return 0;
    return new Promise<number>((resolve) => {
      autoResolveRef.current = resolve;
      // Hide slot B during auto-bet so the player isn't confused
      setSlotA({ ...sA, autoEnabled: true, status: 'live', cashedAt: null });
      setSlotB((s) => ({ ...s, active: false, status: 'idle', cashedAt: null }));
      sound.play('click');
      balance.debit(bet);
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const b = rollBust(rng);
      bustRef.current = b;
      setBust(b);
      setCurrentMult(1.0);
      phaseRef.current = 'running';
      setPhase('running');
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

  const inGame = phase === 'running';
  const lost = phase === 'done' && bust !== null && slotA.status === 'busted' && (!slotB.active || slotB.status === 'busted');
  const someoneCashed = phase === 'done' && (slotA.status === 'cashed' || slotB.status === 'cashed');

  // Space-to-bet / Space-to-cashout hotkey. Real Stake Crash: tap
  // Space once to bet, Space again mid-flight to cash out slot A.
  useHotkey(' ', () => {
    if (autoActive) return;
    if (phase === 'running') {
      if (slotA.status === 'live') cashOutSlot('a');
    } else {
      if (phase === 'done') reset();
      start();
    }
  }, mode === 'manual');

  // Curve point — just for visual feedback, drawn as a rising line.
  const curveProgress = Math.min(timeForMultiplier(currentMult) / 60, 1);

  return (
    <OriginalPageLayout title="Crash">
      <div className="flex flex-col p-3 gap-3 max-w-md mx-auto w-full">
        {/* Multiplier display + curve */}
        <div className={`rounded-lg bg-stake-card border border-stake-border p-4 relative overflow-hidden min-h-[260px] ${lost ? 'shake-medium' : ''}`}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="crash-curve" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor={lost ? '#ed4163' : '#00e701'} stopOpacity="0.05" />
                <stop offset="100%" stopColor={lost ? '#ed4163' : '#00e701'} stopOpacity="0.45" />
              </linearGradient>
            </defs>
            {(() => {
              const px = curveProgress * 100;
              const py = 60 - Math.min(60, Math.log(currentMult) / Math.log(20) * 60);
              let path = 'M 0 60';
              for (let i = 0; i <= 30; i++) {
                const t = (i / 30) * px;
                const m = Math.exp(0.06 * (t / 100) * 60);
                const y = 60 - Math.min(60, Math.log(m) / Math.log(20) * 60);
                path += ` L ${t} ${y}`;
              }
              path += ` L ${px} ${py} L ${px} 60 Z`;
              const edgeColor = lost ? '#ed4163' : '#00e701';
              return (
                <>
                  <path
                    d={path}
                    fill="url(#crash-curve)"
                    stroke={edgeColor}
                    strokeWidth="0.5"
                    opacity={inGame || someoneCashed || lost ? 1 : 0.2}
                  />
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

          <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[220px] py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                className={`font-mono font-bold tabular-nums leading-none ${
                  lost ? 'text-stake-red' : someoneCashed ? 'text-stake-green' : inGame ? 'text-stake-text' : 'text-stake-dim'
                }`}
                style={{
                  fontSize: 'clamp(48px, 14vw, 88px)',
                  textShadow: lost
                    ? '0 0 28px rgba(237,65,99,.85)'
                    : someoneCashed
                      ? '0 0 28px rgba(0,231,1,.7)'
                      : inGame
                        ? '0 0 18px rgba(255,255,255,.25)'
                        : 'none',
                }}
              >
                {(lost ? (bust ?? currentMult) : currentMult).toFixed(2)}×
              </motion.div>
            </AnimatePresence>
            <div className="mt-2 text-xs text-stake-muted h-4">
              {lost && `Crashed at ${bust?.toFixed(2)}×`}
              {someoneCashed && !lost && 'Round complete'}
              {inGame && 'Cash out before crash!'}
              {phase === 'idle' && 'Place a bet to start'}
            </div>
          </div>
          {/* Bust flash */}
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
                    'radial-gradient(ellipse at center, rgba(237,65,99,.55) 0%, rgba(237,65,99,.18) 40%, transparent 75%)',
                  mixBlendMode: 'screen',
                }}
              />
            )}
          </AnimatePresence>
          {/* Bust shrapnel */}
          <AnimatePresence>
            {lost && (
              <>
                {Array.from({ length: 14 }).map((_, i) => {
                  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.22 : -0.18);
                  const dist = 100 + (i % 5) * 22;
                  const dx = Math.cos(angle) * dist;
                  const dy = Math.sin(angle) * dist - 12;
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
                          i % 3 === 0 ? '#ed4163' : i % 3 === 1 ? '#ffd166' : '#ffffff',
                        boxShadow: '0 0 8px rgba(237,65,99,.7)',
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

        {/* Bust history */}
        {recent.length > 0 && (
          <div className="rounded-lg bg-stake-card border border-stake-border p-2.5">
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
                          tier === 'epic' ? '#ffc62a' : tier === 'good' ? '#00e701' : '#ed4163',
                        boxShadow: tier !== 'low' ? `0 0 6px currentColor` : undefined,
                      }}
                    />
                    <span
                      className="text-[8px] font-mono font-semibold tabular-nums leading-none"
                      style={{ color: tier === 'epic' ? '#ffc62a' : tier === 'good' ? '#00e701' : '#ed4163' }}
                    >
                      {r.bust < 10 ? r.bust.toFixed(2) : r.bust.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <LocalRoundFeed currentMultiplier={currentMult} active={inGame} crashed={lost} game="Crash" />

        {/* === Mode tabs + auto-bet config === */}
        <div className="rounded-lg bg-stake-panel border border-stake-border p-3 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || inGame} />

          {/* Slot A panel — always visible */}
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

          {/* Add Slot B toggle / Slot B panel (manual mode only) */}
          {mode === 'manual' && !slotB.active && phase !== 'running' && !autoActive && (
            <button
              onClick={() => setSlotB({ ...slotB, active: true })}
              className="w-full py-2 rounded bg-stake-input border border-stake-border border-dashed text-stake-muted hover:text-stake-text hover:border-stake-dim text-xs font-semibold transition active:scale-95"
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
              <p className="text-[11px] text-stake-dim leading-relaxed">
                Auto-bet runs bet A only with its auto-cashout target. Bet B is paused during auto.
              </p>
            </>
          )}

          {/* Action button — Bet ALL active slots, or Bet Again after a round */}
          {mode === 'manual' ? (
            !inGame ? (
              <button
                onClick={phase === 'done' ? () => { reset(); start(); } : start}
                disabled={
                  activeSlots.length === 0 ||
                  totalBet <= 0 ||
                  totalBet > balance.balance
                }
                className="w-full py-3.5 rounded bg-stake-green text-stake-bg font-bold text-sm disabled:opacity-50 transition active:scale-[0.99] hover:bg-stake-green-hi"
              >
                {activeSlots.length === 0
                  ? 'Activate at least one bet'
                  : phase === 'done'
                    ? `Bet Again · ${fmtCurrency(totalBet)}`
                    : `Bet · ${fmtCurrency(totalBet)}`}
              </button>
            ) : null
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (balance.balance < slotA.bet || slotA.bet <= 0)}
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

/** A single bet panel — bet amount, auto-cashout, status + cash-out
 *  button during a round. Used for both Slot A and Slot B. */
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
  const accent = id === 'a' ? 'text-stake-green' : 'text-accent-cyan';
  const profitOnAuto = +(slot.bet * slot.autoCashout - slot.bet).toFixed(2);
  const livePayout = +(slot.bet * currentMult).toFixed(2);
  const editable = !inGame && !disabled;

  return (
    <div className="rounded bg-stake-input border border-stake-border p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className={`text-[11px] uppercase tracking-wider font-bold ${accent}`}>{label}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={slot.status} cashedAt={slot.cashedAt} />
          {allowToggleActive && onRemove && !inGame && (
            <button
              onClick={onRemove}
              disabled={disabled}
              className="text-stake-dim hover:text-stake-red text-xs transition disabled:opacity-50"
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

      <div className="rounded bg-stake-card border border-stake-border p-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] text-stake-muted cursor-pointer">
            <input
              type="checkbox"
              checked={slot.autoEnabled}
              onChange={(e) => onChange({ ...slot, autoEnabled: e.target.checked })}
              disabled={!editable}
              className="w-3.5 h-3.5"
              style={{ accentColor: '#00e701' }}
            />
            Auto Cashout
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
            className="font-mono font-semibold text-xs tabular-nums bg-stake-input border border-stake-border rounded px-2 py-1 w-20 text-right text-stake-text outline-none focus:border-stake-dim disabled:opacity-50"
          />
        </div>
        {slot.autoEnabled && (
          <div className="mt-1.5 flex justify-between text-[10px]">
            <span className="text-stake-dim">Profit on auto</span>
            <span className={`font-mono font-semibold ${accent} tabular-nums`}>
              {fmtCurrency(profitOnAuto)}
            </span>
          </div>
        )}
      </div>

      {/* Cash out button — only visible during a live round for this slot */}
      {inGame && slot.status === 'live' && (
        <button
          onClick={onCashOut}
          className="w-full py-2.5 rounded bg-accent-gold text-stake-bg font-bold text-sm transition active:scale-[0.99] shadow-[0_0_14px_rgba(255,209,102,.4)]"
        >
          Cash Out · {fmtCurrency(livePayout)}
        </button>
      )}
      {inGame && slot.status === 'cashed' && (
        <div className="text-center text-xs text-stake-green font-mono py-1">
          Cashed at {slot.cashedAt?.toFixed(2)}× · won {fmtCurrency(slot.bet * (slot.cashedAt ?? 0))}
        </div>
      )}
      {inGame && slot.status === 'busted' && (
        <div className="text-center text-xs text-stake-red font-mono py-1">
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
      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stake-green/15 text-stake-green border border-stake-green/40">
        LIVE
      </span>
    );
  }
  if (status === 'cashed') {
    return (
      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stake-green/15 text-stake-green border border-stake-green/40">
        CASHED {cashedAt?.toFixed(2)}×
      </span>
    );
  }
  return (
    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stake-red/15 text-stake-red border border-stake-red/40">
      BUST
    </span>
  );
}
