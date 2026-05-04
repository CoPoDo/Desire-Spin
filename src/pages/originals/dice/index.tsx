import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
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

export function DiceGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
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
        sound.play('win');
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
            <div
              className="absolute top-0 bottom-0 bg-accent/35"
              style={{
                left: direction === 'over' ? `${target}%` : '0%',
                right: direction === 'over' ? '0%' : `${100 - target}%`,
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Multiplier" value={fmtMultiplier(multiplier)} />
          <button
            onClick={() => setDirection((d) => (d === 'over' ? 'under' : 'over'))}
            disabled={busy || autoActive}
            className="rounded-xl bg-bg-card border border-edge p-3 text-center hover:bg-bg-hover disabled:opacity-50"
          >
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Roll {direction}</div>
            <div className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums">{target.toFixed(2)}</div>
          </button>
          <Stat label="Win Chance" value={`${winChance.toFixed(2)}%`} />
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
            {recentRolls.map((r) => (
              <span
                key={r.id}
                className={`font-mono font-semibold text-xs tabular-nums px-2 py-1 rounded-lg flex-shrink-0 ${
                  r.win ? 'bg-accent/15 text-accent' : 'bg-bg-elev text-ink-mute'
                }`}
              >
                {r.roll.toFixed(2)}
              </span>
            ))}
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-ink-mute">{label}</div>
      <div className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
