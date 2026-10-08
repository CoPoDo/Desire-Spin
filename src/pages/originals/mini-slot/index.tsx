import { ReelStrip } from '../_shared/ReelStrip';
import { useRoundPlayback } from '../_shared/useRoundPlayback';
import { useCallback, useRef, useState } from 'react';
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
import { SYMBOLS, type SymbolId, spin, symbolMeta } from './engine';
import { fireConfetti } from '../../../lib/confetti';

export function MiniSlotGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const { busy, busyRef, setBusy, wait } = useRoundPlayback();
  const [reels, setReels] = useState<SymbolId[]>(['cherry', 'lemon', 'grape']);
  const [winning, setWinning] = useState<boolean[]>([false, false, false]);
  const [reelRound, setReelRound] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<{ outcome: string; payout: number; mult: number } | null>(null);
  const stateRef = useRef({ bet });
  stateRef.current = { bet };

  const playOnce = useCallback(async (): Promise<number | null> => {
    const { bet: b } = stateRef.current;
    if (!balance.canAfford(b)) return null;
    if (busyRef.current || !balance.debit(b)) return null;
    setBusy(true);
    sound.play('click');

    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = spin(rng, b);
    if (r.payout > 0) balance.credit(r.payout);
    history.record({
      game: 'Classic 3-Reel Slot',
      bet: b,
      payout: r.payout,
      multiplier: r.multiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(b, r.payout, false);


    setWinning([false, false, false]); setLastOutcome(null);
    setReels(r.reels); setReelRound((id) => id + 1);
    // The last symbol is physically part of each moving strip.
    if (!(await wait(1120))) return null;
    sound.play('drop');
    // Highlight winning cells
    if (r.multiplier > 0) {
      const win =
        r.reels[0] === r.reels[1] && r.reels[1] === r.reels[2]
          ? [true, true, true]
          : r.reels.map((s) => s === 'cherry');
      setWinning(win);
      sound.play(r.multiplier >= 100 ? 'mega-win' : r.multiplier >= 10 ? 'big-win' : 'win');
      // Confetti shower for 3-of-a-kind wins (audit's signature
      // big-win flourish, ported from House Edge in lib/confetti).
      if (r.multiplier >= 10) {
        fireConfetti({ count: r.multiplier >= 100 ? 120 : 70 });
      }
    } else {
      sound.play('drop');
    }
    setLastOutcome({ outcome: r.outcome, payout: r.payout, mult: r.multiplier });

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

  useHotkey(' ', () => { if (mode === 'manual') void playOnce(); }, !autoActive);

  return (
    <OriginalPageLayout title="Classic 3-Reel Slot">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Reels */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {reels.map((symbol, reel) => (
              <ReelStrip key={reel} reel={reel} roundId={reelRound} symbols={[symbol]}
                pool={SYMBOLS.map((item) => item.id)} duration={0.76 + reel * 0.18}
                renderSymbol={(id, row) => (
                  <div className={`w-full h-full rounded-lg flex items-center justify-center text-5xl sm:text-6xl border ${row !== null && winning[reel] ? 'border-stake-green bg-stake-green/15' : 'border-stake-border bg-stake-bg'}`}>
                    {symbolMeta(id as SymbolId).emoji}
                  </div>
                )} />
            ))}
          </div>
        </div>

        {/* Outcome */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {lastOutcome ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-stake-muted">
                {lastOutcome.outcome}
              </div>
              <div className={`font-mono font-bold text-lg mt-0.5 tabular-nums ${
                lastOutcome.mult >= 100 ? 'text-accent-gold' :
                lastOutcome.mult >= 10 ? 'text-stake-green' :
                lastOutcome.mult > 0 ? 'text-accent-cyan' : 'text-stake-muted'
              }`}>
                {lastOutcome.mult > 0 ? `${lastOutcome.mult}× = ${fmtCurrency(lastOutcome.payout)}` : '— no win —'}
              </div>
            </>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">Spin to play</div>
          )}
        </div>

        {/* Paytable */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1.5 px-1">3-of-a-kind pays</div>
          <div className="grid grid-cols-5 gap-1">
            {SYMBOLS.map((s) => (
              <div key={s.id} className="text-center">
                <div className="text-2xl">{s.emoji}</div>
                <div className="text-[10px] font-mono font-bold tabular-nums text-stake-muted">
                  {s.mult}×
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-[10px] text-stake-muted text-center">+ any 2× 🍒 pays 2×</div>
        </div>

        {/* Controls */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || busy} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || busy} />
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {(autoActive || progress.stopReason) && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <button
              onClick={() => void playOnce()}
              disabled={busy || !balance.canAfford(bet)}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy ? 'Spinning…' : `Spin · ${fmtCurrency(bet)}`}
            </button>
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (busy || !balance.canAfford(bet))}
              className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] ${
                autoActive ? 'bg-stake-red text-white' : 'bg-stake-green text-stake-bg'
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
