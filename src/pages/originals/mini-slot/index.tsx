import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
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
import { SYMBOLS, type SymbolId, spin, symbolMeta } from './engine';

export function MiniSlotGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reels, setReels] = useState<SymbolId[]>(['cherry', 'lemon', 'grape']);
  const [winning, setWinning] = useState<boolean[]>([false, false, false]);
  const [lastOutcome, setLastOutcome] = useState<{ outcome: string; payout: number; mult: number } | null>(null);
  const stateRef = useRef({ bet });
  stateRef.current = { bet };

  const playOnce = useCallback(async (): Promise<number> => {
    const { bet: b } = stateRef.current;
    if (balance.balance < b || b <= 0) return 0;
    setBusy(true);
    sound.play('click');
    balance.debit(b);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = spin(rng, b);

    // Reveal reels one at a time for drama
    setWinning([false, false, false]);
    setLastOutcome(null);
    for (let i = 0; i < 3; i++) {
      await new Promise<void>((res) => setTimeout(res, 280));
      setReels((prev) => {
        const next = [...prev];
        next[i] = r.reels[i]!;
        return next;
      });
      sound.play('drop');
    }
    // Highlight winning cells
    if (r.multiplier > 0) {
      const win =
        r.reels[0] === r.reels[1] && r.reels[1] === r.reels[2]
          ? [true, true, true]
          : r.reels.map((s) => s === 'cherry');
      setWinning(win);
      sound.play(r.multiplier >= 100 ? 'mega-win' : r.multiplier >= 10 ? 'big-win' : 'win');
      balance.credit(r.payout);
    } else {
      sound.play('drop');
    }
    setLastOutcome({ outcome: r.outcome, payout: r.payout, mult: r.multiplier });
    history.record({
      game: 'Mini Slot',
      bet: b,
      payout: r.payout,
      multiplier: r.multiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(b, r.payout, false);
    setBusy(false);
    return r.payout - b;
  }, [balance, fairness, history, session, sound]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 350,
    runOnce: playOnce,
    onStop: () => setAutoActive(false),
  });

  return (
    <OriginalPageLayout title="Mini Slot">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Reels */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {reels.map((s, i) => {
              const meta = symbolMeta(s);
              const isWin = winning[i];
              return (
                <motion.div
                  key={i}
                  className="rounded-xl flex items-center justify-center text-5xl sm:text-6xl aspect-square w-[28%] select-none"
                  animate={
                    isWin
                      ? { scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] }
                      : busy
                        ? { y: [0, -4, 0] }
                        : { scale: 1, y: 0 }
                  }
                  transition={{
                    duration: isWin ? 0.6 : 0.35,
                    repeat: isWin ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                  style={{
                    background: isWin
                      ? 'linear-gradient(180deg, rgba(31,255,122,.25), rgba(31,255,122,.05))'
                      : 'linear-gradient(180deg, #1a1f29, #0e1218)',
                    border: isWin
                      ? '2px solid rgba(31,255,122,.6)'
                      : '1px solid #2a3142',
                    boxShadow: isWin
                      ? '0 0 18px rgba(31,255,122,.4), inset 0 1px 0 rgba(31,255,122,.3)'
                      : 'inset 0 1px 0 rgba(255,255,255,.06)',
                  }}
                >
                  {meta.emoji}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Outcome */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {lastOutcome ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                {lastOutcome.outcome}
              </div>
              <div className={`font-mono font-bold text-lg mt-0.5 tabular-nums ${
                lastOutcome.mult >= 100 ? 'text-accent-gold' :
                lastOutcome.mult >= 10 ? 'text-accent' :
                lastOutcome.mult > 0 ? 'text-accent-cyan' : 'text-ink-mute'
              }`}>
                {lastOutcome.mult > 0 ? `${lastOutcome.mult}× = ${fmtCurrency(lastOutcome.payout)}` : '— no win —'}
              </div>
            </>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Spin to play</div>
          )}
        </div>

        {/* Paytable */}
        <div className="rounded-xl bg-bg-card border border-edge p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">3-of-a-kind pays</div>
          <div className="grid grid-cols-5 gap-1">
            {SYMBOLS.map((s) => (
              <div key={s.id} className="text-center">
                <div className="text-2xl">{s.emoji}</div>
                <div className="text-[10px] font-mono font-bold tabular-nums text-ink-dim">
                  {s.mult}×
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-[10px] text-ink-mute text-center">+ any 2× 🍒 pays 2×</div>
        </div>

        {/* Controls */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || busy} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || busy} />
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <button
              onClick={() => void playOnce()}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy ? 'Spinning…' : `Spin · ${fmtCurrency(bet)}`}
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
      </div>
    </OriginalPageLayout>
  );
}
