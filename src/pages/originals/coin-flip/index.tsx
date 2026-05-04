import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import { type Side, flip, multiplierAfter } from './engine';

type Phase = 'idle' | 'choosing' | 'flipping' | 'won' | 'lost';

export function CoinFlipGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [streak, setStreak] = useState(0);
  const [lastFlip, setLastFlip] = useState<Side | null>(null);
  const [history$, setHistory$] = useState<Side[]>([]);
  const [busy, setBusy] = useState(false);

  const accumMult = multiplierAfter(streak);
  const cashoutAmount = +(bet * accumMult).toFixed(2);
  const nextMult = multiplierAfter(streak + 1);

  const start = useCallback(() => {
    if (busy) return;
    if (balance.balance < bet || bet <= 0) return;
    sound.play('click');
    balance.debit(bet);
    setStreak(0);
    setLastFlip(null);
    setHistory$([]);
    setPhase('choosing');
  }, [busy, balance, bet, sound]);

  const choose = useCallback((side: Side) => {
    if (phase !== 'choosing' || busy) return;
    setBusy(true);
    sound.play('click');
    setPhase('flipping');
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const result = flip(rng);
    setTimeout(() => {
      setLastFlip(result);
      setHistory$((prev) => [result, ...prev].slice(0, 12));
      const won = result === side;
      if (won) {
        setStreak((s) => s + 1);
        sound.play('win');
        setPhase('choosing');
      } else {
        setPhase('lost');
        sound.play('drop');
        history.record({
          game: 'Coin Flip',
          bet,
          payout: 0,
          multiplier: 0,
          serverSeedHash: fairness.hash,
          clientSeed: seeds.clientSeed,
          nonce: seeds.nonce,
        });
        session.recordSpin(bet, 0, false);
      }
      setBusy(false);
    }, 800);
  }, [phase, busy, fairness, sound, history, session, bet]);

  const cashOut = useCallback(() => {
    if (phase !== 'choosing' || streak === 0) return;
    sound.play('big-win');
    balance.credit(cashoutAmount);
    history.record({
      game: 'Coin Flip',
      bet,
      payout: cashoutAmount,
      multiplier: accumMult,
      serverSeedHash: fairness.hash,
      clientSeed: '',
      nonce: 0,
    });
    session.recordSpin(bet, cashoutAmount, false);
    setPhase('won');
  }, [phase, streak, balance, bet, accumMult, cashoutAmount, fairness, history, session, sound]);

  const reset = useCallback(() => {
    setPhase('idle');
    setStreak(0);
    setLastFlip(null);
    setHistory$([]);
  }, []);

  return (
    <OriginalPageLayout title="Coin Flip">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center min-h-[200px] flex flex-col items-center justify-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase + '-' + streak}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-[10px] uppercase tracking-widest text-ink-mute"
            >
              {phase === 'idle' && 'Place your bet'}
              {phase === 'choosing' && (streak === 0 ? 'Heads or Tails?' : `Streak ${streak} · ${fmtMultiplier(accumMult)}`)}
              {phase === 'flipping' && 'Flipping…'}
              {phase === 'won' && `Cashed out · won ${fmtCurrency(cashoutAmount)}`}
              {phase === 'lost' && `Wrong call · -${fmtCurrency(bet)}`}
            </motion.div>
          </AnimatePresence>
          {/* Coin */}
          <Coin phase={phase} lastFlip={lastFlip} />
          {phase === 'choosing' && streak > 0 && (
            <div className="text-xs text-ink-dim">
              Cash out for <span className="font-mono font-bold text-accent">{fmtCurrency(cashoutAmount)}</span>
              {' · '}
              next flip <span className="font-mono text-accent">{fmtMultiplier(nextMult)}</span>
            </div>
          )}
        </div>

        {/* History */}
        {history$.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">Last flips</span>
            {history$.map((h, i) => (
              <span
                key={i}
                className="font-mono font-semibold text-[11px] uppercase tracking-wider w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: h === 'heads' ? '#22d3ee' : '#a78bfa',
                  color: '#0f1419',
                  border: '1px solid rgba(255,255,255,.2)',
                }}
              >
                {h === 'heads' ? 'H' : 'T'}
              </span>
            ))}
          </div>
        )}

        {/* Action panel */}
        {phase === 'idle' || phase === 'won' || phase === 'lost' ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <button
              onClick={phase === 'idle' ? start : () => { reset(); start(); }}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'idle' ? `Bet · ${fmtCurrency(bet)}` : 'Play Again'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => choose('heads')}
                disabled={busy}
                className="py-4 rounded-xl font-bold text-base uppercase tracking-wider transition active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #22d3ee, #0e7090)',
                  color: '#0f1419',
                  border: '1px solid rgba(34,211,238,.6)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 0 14px rgba(34,211,238,.45)',
                }}
              >
                Heads
              </button>
              <button
                onClick={() => choose('tails')}
                disabled={busy}
                className="py-4 rounded-xl font-bold text-base uppercase tracking-wider transition active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #a78bfa, #5a3aa8)',
                  color: '#0f1419',
                  border: '1px solid rgba(167,139,250,.6)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 0 14px rgba(167,139,250,.45)',
                }}
              >
                Tails
              </button>
            </div>
            <button
              onClick={cashOut}
              disabled={busy || streak === 0}
              className="w-full py-3 rounded-xl bg-accent-gold text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] shadow-[0_0_16px_rgba(255,209,102,.45)]"
            >
              {streak === 0 ? 'Pick a side first' : `Cash Out · ${fmtCurrency(cashoutAmount)}`}
            </button>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

function Coin({ phase, lastFlip }: { phase: Phase; lastFlip: Side | null }) {
  const isFlipping = phase === 'flipping';
  const showSide = !isFlipping && lastFlip;
  return (
    <motion.div
      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-bold text-3xl"
      animate={
        isFlipping
          ? { rotateY: [0, 720], scale: [1, 1.1, 1] }
          : { rotateY: 0, scale: 1 }
      }
      transition={{ duration: isFlipping ? 0.7 : 0.25 }}
      style={{
        background:
          showSide === 'heads'
            ? 'radial-gradient(circle at 35% 28%, #fff5c4 0%, #ffd37a 30%, #c8932e 100%)'
            : showSide === 'tails'
              ? 'radial-gradient(circle at 35% 28%, #d6c8ff 0%, #a78bfa 30%, #5a3aa8 100%)'
              : 'radial-gradient(circle at 35% 28%, #fff 0%, #b0b8c8 30%, #5a6480 100%)',
        boxShadow:
          '0 0 24px rgba(255,255,255,.4), inset 0 2px 0 rgba(255,255,255,.5), inset 0 -3px 0 rgba(0,0,0,.3), 0 8px 18px rgba(0,0,0,.5)',
        border: '2px solid rgba(255,255,255,.3)',
        color: '#0f1419',
      }}
    >
      {showSide === 'heads' ? 'H' : showSide === 'tails' ? 'T' : '?'}
    </motion.div>
  );
}
