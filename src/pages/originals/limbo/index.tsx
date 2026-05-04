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
import { play, winChanceFor } from './engine';
import { CountUp } from '../../../components/ui/CountUp';
import { fireConfetti } from '../../../lib/confetti';

export function LimboGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
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
      if (r.win) {
        balance.credit(r.payout);
        sound.play(t >= 10 ? 'mega-win' : t >= 3 ? 'big-win' : 'win');
        if (t >= 3) {
          fireConfetti({
            count: t >= 50 ? 130 : t >= 10 ? 80 : 50,
            colors: ['#1fff7a', '#22d3ee', '#ffd166', '#ffffff'],
          });
        }
      } else {
        sound.play('drop');
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

  return (
    <OriginalPageLayout title="Limbo">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        <div className="rounded-2xl bg-bg-card border border-edge p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-3">Result</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={lastResult ?? 'idle'}
              initial={{ scale: 0.5, opacity: 0, rotateX: -25 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              className={`font-mono font-bold tabular-nums leading-none ${
                lastResult === null ? 'text-ink-dim' : lastWin ? 'text-accent' : 'text-accent-hot'
              }`}
              style={{
                fontSize: '64px',
                textShadow: lastWin
                  ? '0 0 28px rgba(31,255,122,.85), 0 0 60px rgba(31,255,122,.4)'
                  : lastResult !== null
                    ? '0 0 24px rgba(255,61,139,.55)'
                    : 'none',
              }}
            >
              {lastResult === null ? (
                '0.00×'
              ) : (
                /* CountUp climbs from 0 to the result over 700ms with
                 * ease-out cubic — mimics the rocket launch feel real
                 * Stake Limbo has, where the multiplier rapidly climbs
                 * before settling on the final number. */
                <CountUp
                  value={lastResult}
                  duration={700}
                  format={(n) => `${n.toFixed(2)}×`}
                />
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-3 text-xs text-ink-dim">
            {lastWin === null
              ? `Target ${target.toFixed(2)}× to win`
              : lastWin
                ? `Won ${fmtCurrency(bet * target)}`
                : `Below target (${target.toFixed(2)}×)`}
          </div>
        </div>

        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute">Target Multiplier</span>
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
              className="font-mono font-semibold text-sm tabular-nums bg-bg-elev border border-edge rounded-lg px-2 py-1 w-24 text-right outline-none focus:border-accent/60"
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
            className="w-full accent-accent"
          />
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-mute mt-2">
            <span>1.01×</span><span>5×</span><span>25×</span><span>100×</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Multiplier" value={fmtMultiplier(target)} />
          <Stat label="Win Chance" value={`${winChance.toFixed(2)}%`} />
        </div>

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
              onClick={manualPlay}
              disabled={busy || balance.balance < bet || bet <= 0 || target < 1.01}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy ? 'Rolling…' : 'Bet'}
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

        {recent.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">Recent</span>
            {recent.map((r) => (
              <span
                key={r.id}
                className={`font-mono font-semibold text-xs tabular-nums px-2 py-1 rounded-lg flex-shrink-0 ${
                  r.win ? 'bg-accent/15 text-accent' : 'bg-bg-elev text-ink-mute'
                }`}
              >
                {r.result.toFixed(2)}×
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
