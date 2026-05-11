import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
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
import {
  type DiceDirection,
  multiplierFor,
  play,
  winChanceFor,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

export function DiceGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = usePersistedBet('dice', 1);
  const [direction, setDirection] = useState<DiceDirection>('over');
  const [target, setTarget] = useState(50);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [recentRolls, setRecentRolls] = useState<{ id: string; roll: number; win: boolean }[]>([]);
  const stateRef = useRef({ direction, target, bet });
  stateRef.current = { direction, target, bet };

  const winChance = useMemo(() => winChanceFor(direction, target), [direction, target]);
  const multiplier = useMemo(() => multiplierFor(direction, target), [direction, target]);
  const profitOnWin = useMemo(() => +(bet * multiplier - bet).toFixed(2), [bet, multiplier]);

  const playOnce = useCallback(async (): Promise<number> => {
    const { direction: dir, target: tgt, bet: b } = stateRef.current;
    if (balance.balance < b || b <= 0) return 0;
    setBusy(true);
    sound.play('click');
    balance.debit(b);
    try {
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const result = play(rng, b, dir, tgt);
      setLastRoll(result.roll);
      setLastWin(result.win);
      setRecentRolls((r) => [{ id: `${seeds.nonce}`, roll: result.roll, win: result.win }, ...r].slice(0, 8));
      if (result.win) {
        balance.credit(result.payout);
        // Sound + confetti tier on the win multiplier — matches the
        // pattern used by Crash, Limbo, Tower, Hilo, etc. (≥4× = big
        // celebration, ≥10× = mega, ≥40× = epic). Real Stake Dice
        // doesn't ship confetti but every other Original we mirror does;
        // adding it here for parity.
        sound.play(
          result.multiplier >= 10 ? 'mega-win' :
          result.multiplier >= 4 ? 'big-win' : 'win',
        );
        if (result.multiplier >= 4) {
          fireConfetti({
            count: result.multiplier >= 40 ? 130 : result.multiplier >= 10 ? 80 : 50,
            colors: ['#1fff7a', '#22d3ee', '#ffd166', '#ffffff'],
          });
        }
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Dice',
        bet: b,
        payout: result.payout,
        multiplier: result.win ? result.multiplier : 0,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(b, result.payout, false);
      return result.payout - b;
    } finally {
      setBusy(false);
    }
  }, [balance, fairness, history, session, sound]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 280,
    runOnce: playOnce,
    onStop: () => setAutoActive(false),
  });

  const manualRoll = useCallback(() => {
    if (busy || balance.balance < bet || bet <= 0) return;
    void playOnce();
  }, [busy, balance, bet, playOnce]);

  // Space-to-bet hotkey — real Stake parity. Disabled during auto-bet
  // so it doesn't conflict with the autobet loop's own clicks.
  useHotkey(' ', manualRoll, !autoActive);

  return (
    <OriginalPageLayout title="Dice">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Result display */}
        <div className="rounded-2xl bg-bg-card border border-edge p-5 text-center">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-2">Roll</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={lastRoll ?? 'idle'}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className={`font-mono font-bold tabular-nums leading-none ${
                lastRoll === null ? 'text-ink-dim' : lastWin ? 'text-accent' : 'text-accent-hot'
              }`}
              style={{
                fontSize: '56px',
                textShadow: lastWin
                  ? '0 0 24px rgba(31,255,122,.7)'
                  : lastRoll !== null
                    ? '0 0 24px rgba(255,61,139,.55)'
                    : 'none',
              }}
            >
              {lastRoll === null ? '—' : lastRoll.toFixed(2)}
            </motion.div>
          </AnimatePresence>
          <div className="mt-2 text-xs text-ink-dim">
            {lastWin === null ? 'Roll the dice to begin' : lastWin ? `Won ${fmtCurrency(bet * multiplier)}` : 'No win'}
          </div>
        </div>

        {/* Slider */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-mute mb-2">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
          <div className="relative h-3 bg-bg-elev rounded-full mb-3 overflow-hidden">
            {/* Lose zone (red) — opposite of the win zone, dimmed so the
             *  win zone visually dominates. Real Stake-style dice colour-
             *  codes the slider so the player reads risk at a glance. */}
            <div
              className="absolute top-0 bottom-0 bg-rose-500/20"
              style={{
                left: direction === 'over' ? '0%' : `${target}%`,
                right: direction === 'over' ? `${100 - target}%` : '0%',
              }}
            />
            {/* Win zone (vivid green so it dominates) */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: direction === 'over' ? `${target}%` : '0%',
                right: direction === 'over' ? '0%' : `${100 - target}%`,
                background:
                  'linear-gradient(180deg, rgba(31,255,122,.55), rgba(15,170,80,.32))',
                boxShadow: 'inset 0 0 12px rgba(31,255,122,.35)',
              }}
            />
            {lastRoll !== null && (
              <motion.div
                className="absolute top-0 bottom-0 w-1 rounded-full"
                style={{
                  left: `${lastRoll}%`,
                  transform: 'translateX(-50%)',
                  background: lastWin ? '#1fff7a' : '#ff3d8b',
                  boxShadow: lastWin
                    ? '0 0 12px rgba(31,255,122,.95)'
                    : '0 0 12px rgba(255,61,139,.85)',
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              />
            )}
            <div className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-ink"
                 style={{ left: `${target}%`, transform: 'translateX(-50%)' }} />
          </div>
          <input
            type="range"
            min={2}
            max={98}
            step={0.01}
            value={target}
            disabled={busy || autoActive}
            onChange={(e) => setTarget(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        {/* Stats — multiplier + chance are linked: editing one updates target */}
        <div className="grid grid-cols-3 gap-2">
          <EditableStat
            label="Multiplier"
            value={multiplier}
            disabled={busy || autoActive}
            onChange={(v) => {
              // mult = 0.99 / chance%; chance% = 0.99 / mult * 100 = 99/mult
              const chance = Math.max(2, Math.min(98, 99 / Math.max(1.01, v)));
              setTarget(direction === 'over' ? +(100 - chance).toFixed(2) : +chance.toFixed(2));
            }}
            format={(v) => fmtMultiplier(v)}
          />
          <button
            onClick={() => setDirection((d) => (d === 'over' ? 'under' : 'over'))}
            disabled={busy || autoActive}
            className="rounded-xl bg-bg-card border border-edge p-3 text-center hover:bg-bg-hover disabled:opacity-50"
          >
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Roll {direction}</div>
            <div className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums">{target.toFixed(2)}</div>
          </button>
          <EditableStat
            label="Win Chance"
            value={winChance}
            disabled={busy || autoActive}
            onChange={(v) => {
              const c = Math.max(2, Math.min(98, v));
              setTarget(direction === 'over' ? +(100 - c).toFixed(2) : +c.toFixed(2));
            }}
            format={(v) => `${v.toFixed(2)}%`}
          />
        </div>

        {/* Quick chance presets */}
        <div className="flex gap-1.5">
          {[
            { label: '50/50', chance: 49.5 },
            { label: '4×', chance: 24.75 },
            { label: '10×', chance: 9.9 },
            { label: '50×', chance: 1.98 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => setTarget(direction === 'over' ? +(100 - p.chance).toFixed(2) : +p.chance.toFixed(2))}
              disabled={busy || autoActive}
              className="flex-1 py-1.5 rounded-lg bg-bg-elev border border-edge text-ink-dim hover:text-ink text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Mode + bet panel */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive} />
          <BetInput bet={bet} onBetChange={setBet} disabled={busy || autoActive} />
          <div className="flex justify-between text-xs">
            <span className="text-ink-mute">Profit on Win</span>
            <span className="font-mono font-semibold text-accent tabular-nums">{fmtCurrency(profitOnWin)}</span>
          </div>
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <button
              onClick={manualRoll}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy ? 'Rolling…' : 'Roll Dice'}
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

        {recentRolls.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">Recent</span>
            <AnimatePresence initial={false}>
              {recentRolls.map((r) => (
                <motion.span
                  key={r.id}
                  layout
                  initial={{ scale: 0.6, opacity: 0, x: -12 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                  className={`font-mono font-semibold text-xs tabular-nums px-2 py-1 rounded-lg flex-shrink-0 ${
                    r.win ? 'bg-accent/15 text-accent' : 'bg-bg-elev text-ink-mute'
                  }`}
                >
                  {r.roll.toFixed(2)}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

// Click to edit numeric stat, Enter or blur commits — Stake's Dice has the
// same "click multiplier or chance to drive the slider" interaction.
function EditableStat({
  label,
  value,
  format,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-ink-mute">{label}</div>
      {editing ? (
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const v = parseFloat(draft);
            if (Number.isFinite(v)) onChange(v);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums bg-transparent outline-none w-full text-center"
        />
      ) : (
        <button
          onClick={() => { if (!disabled) { setDraft(value.toFixed(2)); setEditing(true); } }}
          disabled={disabled}
          className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums hover:text-accent transition w-full disabled:opacity-50"
        >
          {format(value)}
        </button>
      )}
    </div>
  );
}
