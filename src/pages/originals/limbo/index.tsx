import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import { play, winChanceFor } from './engine';

/** Stake-style Limbo: pick target multiplier, RNG rolls, win if RNG ≥ target.
 *  Same provably-fair engine, same 99% RTP as Dice. */
export function LimboGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [target, setTarget] = useState(2.0);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [recent, setRecent] = useState<{ id: string; result: number; win: boolean }[]>([]);

  const winChance = useMemo(() => winChanceFor(target), [target]);
  const profitOnWin = useMemo(() => +(bet * target - bet).toFixed(2), [bet, target]);

  const rollPlay = useCallback(() => {
    if (busy || balance.balance < bet || bet <= 0 || target < 1.01) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    try {
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const r = play(rng, bet, target);
      setLastResult(r.result);
      setLastWin(r.win);
      setRecent((prev) => [{ id: `${seeds.nonce}`, result: r.result, win: r.win }, ...prev].slice(0, 8));
      if (r.win) {
        balance.credit(r.payout);
        sound.play(target >= 10 ? 'mega-win' : target >= 3 ? 'big-win' : 'win');
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Limbo',
        bet,
        payout: r.payout,
        multiplier: r.win ? target : 0,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(bet, r.payout, false);
    } catch (err) {
      balance.credit(bet);
      // eslint-disable-next-line no-console
      console.error('Limbo play failed:', err);
    } finally {
      setBusy(false);
    }
  }, [busy, balance, bet, target, fairness, history, session, sound]);

  return (
    <OriginalPageLayout title="Limbo">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Result display — big multiplier number */}
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
                lastResult === null
                  ? 'text-ink-dim'
                  : lastWin
                    ? 'text-accent'
                    : 'text-accent-hot'
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
              {lastResult === null ? '0.00×' : `${lastResult.toFixed(2)}×`}
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

        {/* Target slider */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute">Target Multiplier</span>
            <input
              type="number"
              inputMode="decimal"
              min={1.01}
              step={0.01}
              value={target}
              disabled={busy}
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
            disabled={busy}
            onChange={(e) => setTarget(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-mute mt-2">
            <span>1.01×</span>
            <span>5×</span>
            <span>25×</span>
            <span>100×</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Multiplier" value={fmtMultiplier(target)} />
          <Stat label="Win Chance" value={`${winChance.toFixed(2)}%`} />
        </div>

        {/* Bet input + button */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          <div className="flex justify-between text-xs">
            <span className="text-ink-mute">Profit on Win</span>
            <span className="font-mono font-semibold text-accent tabular-nums">{fmtCurrency(profitOnWin)}</span>
          </div>
          <button
            onClick={rollPlay}
            disabled={busy || balance.balance < bet || bet <= 0 || target < 1.01}
            className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
          >
            {busy ? 'Rolling…' : 'Bet'}
          </button>
        </div>

        {/* Recent results */}
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
