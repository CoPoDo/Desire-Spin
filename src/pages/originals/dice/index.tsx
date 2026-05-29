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
            colors: ['#00e701', '#22d3ee', '#ffd166', '#ffffff'],
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
      <div className="flex flex-col p-3 gap-3 max-w-md mx-auto w-full">
        {/* Recent rolls — pill row across the top, newest on the right
         *  (real Dice shows the live multiplier history here). */}
        {recentRolls.length > 0 && (
          <div className="flex items-center justify-end gap-1.5 overflow-x-auto py-0.5">
            <AnimatePresence initial={false}>
              {recentRolls.slice().reverse().map((r) => (
                <motion.span
                  key={r.id}
                  layout
                  initial={{ scale: 0.6, opacity: 0, y: -8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                  className={`font-mono font-semibold text-xs tabular-nums px-2.5 py-1 rounded-full flex-shrink-0 ${
                    r.win
                      ? 'bg-stake-green/15 text-stake-green border border-stake-green/30'
                      : 'bg-stake-card text-stake-muted border border-stake-border'
                  }`}
                >
                  {r.roll.toFixed(2)}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Game area — slider with the result marker + flying value bubble */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-5 pt-8">
          <div className="relative mb-3">
            {/* Flying result bubble that drops onto the slider position */}
            <AnimatePresence>
              {lastRoll !== null && (
                <motion.div
                  key={lastRoll}
                  className="absolute -top-7 z-10"
                  style={{ left: `${lastRoll}%`, transform: 'translateX(-50%)' }}
                  initial={{ scale: 0.4, opacity: 0, y: -6 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                >
                  <div
                    className={`px-2 py-1 rounded font-mono font-bold text-xs tabular-nums whitespace-nowrap ${
                      lastWin ? 'bg-stake-green text-stake-bg' : 'bg-stake-panel text-stake-muted border border-stake-border'
                    }`}
                  >
                    {lastRoll.toFixed(2)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Track */}
            <div className="relative h-2.5 bg-stake-bg rounded-full overflow-hidden">
              {/* Lose zone (red) */}
              <div
                className="absolute top-0 bottom-0 bg-stake-red/80"
                style={{
                  left: direction === 'over' ? '0%' : `${target}%`,
                  right: direction === 'over' ? `${100 - target}%` : '0%',
                }}
              />
              {/* Win zone (green) */}
              <div
                className="absolute top-0 bottom-0 bg-stake-green"
                style={{
                  left: direction === 'over' ? `${target}%` : '0%',
                  right: direction === 'over' ? '0%' : `${100 - target}%`,
                }}
              />
              {lastRoll !== null && (
                <motion.div
                  className="absolute top-0 bottom-0 w-1 bg-white rounded-full"
                  style={{ left: `${lastRoll}%`, transform: 'translateX(-50%)' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                />
              )}
            </div>

            {/* Draggable thumb at the target */}
            <input
              type="range"
              min={2}
              max={98}
              step={0.01}
              value={target}
              disabled={busy || autoActive}
              onChange={(e) => setTarget(parseFloat(e.target.value))}
              className="dice-slider absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer disabled:cursor-default"
            />
          </div>

          {/* Scale ticks */}
          <div className="flex items-center justify-between text-[10px] font-mono text-stake-dim tabular-nums">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>

        {/* Stat trio — Multiplier | Roll Over/Under | Win Chance */}
        <div className="grid grid-cols-3 gap-2">
          <EditableStat
            label="Multiplier"
            suffix="×"
            value={multiplier}
            disabled={busy || autoActive}
            onChange={(v) => {
              const chance = Math.max(2, Math.min(98, 99 / Math.max(1.01, v)));
              setTarget(direction === 'over' ? +(100 - chance).toFixed(2) : +chance.toFixed(2));
            }}
            format={(v) => fmtMultiplier(v)}
          />
          <button
            onClick={() => setDirection((d) => (d === 'over' ? 'under' : 'over'))}
            disabled={busy || autoActive}
            className="rounded bg-stake-input border border-stake-border p-2.5 text-left hover:border-stake-dim disabled:opacity-50 transition-colors"
          >
            <div className="text-xs text-stake-muted">Roll {direction === 'over' ? 'Over' : 'Under'}</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono font-bold text-base text-stake-text tabular-nums">{target.toFixed(2)}</span>
              <span className="text-stake-green text-sm">⇅</span>
            </div>
          </button>
          <EditableStat
            label="Win Chance"
            suffix="%"
            value={winChance}
            disabled={busy || autoActive}
            onChange={(v) => {
              const c = Math.max(2, Math.min(98, v));
              setTarget(direction === 'over' ? +(100 - c).toFixed(2) : +c.toFixed(2));
            }}
            format={(v) => `${v.toFixed(2)}`}
          />
        </div>

        {/* Bet panel */}
        <div className="rounded-lg bg-stake-panel border border-stake-border p-3 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive} />
          <BetInput bet={bet} onBetChange={setBet} disabled={busy || autoActive} />
          <div>
            <div className="text-xs text-stake-muted mb-1.5">Profit on Win</div>
            <div className="flex items-center gap-1.5 rounded bg-stake-input border border-stake-border px-3 py-2.5">
              <span className="flex-1 font-mono font-semibold text-sm text-stake-text tabular-nums">{fmtCurrency(profitOnWin)}</span>
              <span className="text-stake-dim text-sm font-mono">$</span>
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
              onClick={manualRoll}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded bg-stake-green text-stake-bg font-bold text-sm disabled:opacity-50 transition active:scale-[0.99] hover:bg-stake-green-hi"
            >
              {busy ? 'Rolling…' : 'Bet'}
            </button>
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

// Click to edit numeric stat, Enter or blur commits — driving the slider
// by typing a multiplier or win-chance, matching real Dice.
function EditableStat({
  label,
  value,
  format,
  suffix,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  suffix?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <div className="rounded bg-stake-input border border-stake-border p-2.5">
      <div className="text-xs text-stake-muted">{label}</div>
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
          className="font-mono font-bold text-base text-stake-text mt-0.5 tabular-nums bg-transparent outline-none w-full"
        />
      ) : (
        <button
          onClick={() => { if (!disabled) { setDraft(value.toFixed(2)); setEditing(true); } }}
          disabled={disabled}
          className="flex items-center justify-between w-full mt-0.5 disabled:opacity-50 group"
        >
          <span className="font-mono font-bold text-base text-stake-text tabular-nums group-hover:text-stake-green transition-colors">
            {format(value)}
          </span>
          {suffix && <span className="text-stake-dim text-sm">{suffix}</span>}
        </button>
      )}
    </div>
  );
}
