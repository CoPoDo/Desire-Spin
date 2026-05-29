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
import { play, winChanceFor } from './engine';
import { CountUp } from '../../../components/ui/CountUp';
import { fireConfetti } from '../../../lib/confetti';

export function LimboGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = usePersistedBet('limbo', 1);
  const [target, setTarget] = useState(2.0);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [recent, setRecent] = useState<{ id: string; result: number; win: boolean }[]>([]);
  const stateRef = useRef({ bet, target });
  stateRef.current = { bet, target };

  const winChance = useMemo(() => winChanceFor(target), [target]);
  const profitOnWin = useMemo(() => +(bet * target - bet).toFixed(2), [bet, target]);

  const playOnce = useCallback(async (): Promise<number> => {
    const { bet: b, target: t } = stateRef.current;
    if (balance.balance < b || b <= 0 || t < 1.01) return 0;
    setBusy(true);
    sound.play('click');
    balance.debit(b);
    try {
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const r = play(rng, b, t);
      setLastResult(r.result);
      setLastWin(r.win);
      setRecent((prev) => [{ id: `${seeds.nonce}`, result: r.result, win: r.win }, ...prev].slice(0, 8));
      // Rocket-climb beats during the 700ms CountUp animation — three
      // accelerating ticks then the result chime lands at the moment
      // the number stops climbing. Real Stake Limbo has a whoosh that
      // peaks just before the reveal; the previous code fired the
      // win/lose chime instantly while the CountUp was still running,
      // which spoiled the reveal moment. Now the celebration lands ON
      // the final number.
      window.setTimeout(() => sound.play('tick'), 120);
      window.setTimeout(() => sound.play('tick'), 360);
      window.setTimeout(() => sound.play('tick'), 580);
      if (r.win) {
        balance.credit(r.payout);
        window.setTimeout(
          () => sound.play(t >= 10 ? 'mega-win' : t >= 3 ? 'big-win' : 'win'),
          720,
        );
        if (t >= 3) {
          window.setTimeout(() => {
            fireConfetti({
              count: t >= 50 ? 130 : t >= 10 ? 80 : 50,
              colors: ['#00e701', '#22d3ee', '#ffd166', '#ffffff'],
            });
          }, 720);
        }
      } else {
        window.setTimeout(() => sound.play('drop'), 720);
      }
      history.record({
        game: 'Limbo',
        bet: b,
        payout: r.payout,
        multiplier: r.win ? t : 0,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(b, r.payout, false);
      return r.payout - b;
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

  const manualPlay = useCallback(() => {
    if (busy || balance.balance < bet || bet <= 0 || target < 1.01) return;
    void playOnce();
  }, [busy, balance, bet, target, playOnce]);

  // Space-to-bet hotkey — real Stake parity.
  useHotkey(' ', manualPlay, !autoActive);

  return (
    <OriginalPageLayout title="Limbo">
      <div className="flex flex-col p-3 gap-3 max-w-md mx-auto w-full">
        {/* Recent results — pill row, newest on the right */}
        {recent.length > 0 && (
          <div className="flex items-center justify-end gap-1.5 overflow-x-auto py-0.5">
            <AnimatePresence initial={false}>
              {recent.slice().reverse().map((r) => (
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
                  {r.result.toFixed(2)}×
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Game area — giant rocket-climb multiplier */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-6 text-center min-h-[200px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={lastResult ?? 'idle'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              className={`font-mono font-bold tabular-nums leading-none ${
                lastResult === null ? 'text-stake-dim' : lastWin ? 'text-stake-green' : 'text-stake-muted'
              }`}
              style={{
                fontSize: '64px',
                textShadow: lastWin
                  ? '0 0 28px rgba(0,231,1,.7), 0 0 60px rgba(0,231,1,.35)'
                  : 'none',
              }}
            >
              {lastResult === null ? (
                '1.00×'
              ) : (
                <CountUp
                  value={lastResult}
                  duration={700}
                  format={(n) => `${n.toFixed(2)}×`}
                />
              )}
            </motion.div>
          </AnimatePresence>
          {lastResult !== null && (
            <div className="relative w-full max-w-[260px] h-1.5 mt-4 rounded-full bg-stake-bg overflow-hidden">
              <motion.div
                key={`bar-${lastResult}`}
                className="absolute inset-y-0 left-0 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, (lastResult / Math.max(target, 1.01)) * 100)}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: lastWin ? '#00e701' : '#ed4163' }}
              />
              <div className="absolute inset-y-[-2px] w-px bg-white/50" style={{ left: '100%', transform: 'translateX(-1px)' }} />
            </div>
          )}
          <div className="mt-3 text-xs text-stake-muted">
            {lastWin === null
              ? `Target ${target.toFixed(2)}× to win`
              : lastWin
                ? `Won ${fmtCurrency(bet * target)}`
                : `Below ${target.toFixed(2)}×`}
          </div>
        </div>

        {/* Target slider + quick picks */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-stake-muted">Target Multiplier</span>
            <input
              type="number"
              inputMode="decimal"
              min={1.01}
              step={0.01}
              value={target}
              disabled={busy || autoActive}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) setTarget(Math.max(1.01, Math.min(1_000_000, v)));
              }}
              className="font-mono font-semibold text-sm tabular-nums bg-stake-input border border-stake-border rounded px-2 py-1 w-24 text-right text-stake-text outline-none focus:border-stake-dim"
            />
          </div>
          <input
            type="range"
            min={1.01}
            max={100}
            step={0.01}
            value={Math.min(target, 100)}
            disabled={busy || autoActive}
            onChange={(e) => setTarget(parseFloat(e.target.value))}
            className="dice-slider w-full appearance-none bg-stake-bg rounded-full h-2 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] font-mono text-stake-dim mt-2 tabular-nums">
            <span>1.01×</span><span>5×</span><span>25×</span><span>100×</span>
          </div>
          <div className="flex gap-1.5 mt-3">
            {[1.5, 2, 4, 10, 100].map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                disabled={busy || autoActive}
                className={`flex-1 py-1.5 rounded text-[11px] font-mono font-bold tabular-nums transition disabled:opacity-50 ${
                  Math.abs(target - t) < 0.01
                    ? 'bg-stake-green text-stake-bg'
                    : 'bg-stake-input border border-stake-border text-stake-muted hover:text-stake-text hover:border-stake-dim'
                }`}
              >
                {t}×
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Target Payout" value={fmtMultiplier(target)} />
          <Stat label="Win Chance" value={`${winChance.toFixed(4)}%`} />
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
              onClick={manualPlay}
              disabled={busy || balance.balance < bet || bet <= 0 || target < 1.01}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-stake-input border border-stake-border p-2.5">
      <div className="text-xs text-stake-muted">{label}</div>
      <div className="font-mono font-bold text-base text-stake-text mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
