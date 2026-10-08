import { useCrashRound, type CrashSlot as Slot, type CrashSlotId as SlotId } from '../_shared/useCrashRound';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  AutoConfigFields,
  AutoProgressDisplay,
  ManualAutoTabs,
} from '../_shared/AutoBetController';
import { timeForMultiplier } from './engine';
import { LocalRoundFeed } from '../_shared/LocalRoundFeed';

export function CrashGame() {
  const { balance } = useGame();
  const { slotA, slotB, setSlotA, setSlotB, phase, bust, currentMult, recent,
    mode, setMode, autoConfig, setAutoConfig, autoActive, setAutoActive, progress,
    activeSlots, totalBet, start, cashOutSlot, reset } = useCrashRound('Crash', 'running');

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

        <p className="text-[11px] text-stake-muted">Leaving the game cashes out live bets at the current multiplier, unless the round has already crashed.</p>

        <LocalRoundFeed currentMultiplier={currentMult} active={inGame} crashed={phase === 'done'} game="Crash" />

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
              {(autoActive || progress.stopReason) && <AutoProgressDisplay progress={progress} config={autoConfig} />}
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
              disabled={!autoActive && (inGame || balance.balance < slotA.bet || slotA.bet <= 0)}
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
            max={100000}
            aria-label={`${label} auto cashout multiplier`}
            step={0.01}
            value={slot.autoCashout}
            disabled={!editable}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) onChange({ ...slot, autoCashout: Math.min(100000, +Math.max(1.01, v).toFixed(2)) });
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
