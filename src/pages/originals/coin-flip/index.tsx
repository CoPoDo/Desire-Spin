import { MAX_ROUND_MULTIPLIER } from '../../../lib/accounting';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotkey } from '../../../hooks/useHotkey';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import { type Side, flip, multiplierAfter } from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'choosing' | 'flipping' | 'won' | 'lost';

export function CoinFlipGame() {
  const { balance, sound } = useGame();
  const round = useInteractiveRound('Flip');
  const [bet, setBet] = useState(1);
  const [phase, setPhase, phaseRef] = useRoundState<Phase>('idle');
  const [streak, setStreak, streakRef] = useRoundState(0);
  const [lastFlip, setLastFlip] = useState<Side | null>(null);
  const [history$, setHistory$] = useState<Side[]>([]);
  const [busy, setBusy, busyRef] = useRoundState(false);

  const accumMult = multiplierAfter(streak);
  const committedBet = round.wager.current?.bet ?? bet;
  const cashoutAmount = +(committedBet * accumMult).toFixed(2);
  round.onLeave.current = (updateView = false) => {
    if (updateView) { setPhase('won'); setStreak(streakRef.current); setBusy(false); }
    return (round.wager.current?.bet ?? 0) * multiplierAfter(streakRef.current);
  };
  const nextMult = multiplierAfter(streak + 1);

  const start = useCallback(() => {
    if (busyRef.current || phaseRef.current === 'choosing' || phaseRef.current === 'flipping') return;
    if (!round.begin(bet)) return;
    sound.play('click');
    setStreak(0); setLastFlip(null); setHistory$([]); setPhase('choosing');
  }, [bet, round, sound, busyRef, phaseRef, setStreak, setPhase]);

  const choose = useCallback((side: Side) => {
    const wager = round.wager.current;
    if (phaseRef.current !== 'choosing' || busyRef.current || !wager || wager.settled) return;
    setBusy(true); setPhase('flipping'); sound.play('click');
    const result = flip(wager.rng);
    const won = result === side;
    // Commit the decision before animation; navigation cannot cancel a loss.
    if (won) {
      streakRef.current += 1;
      if (multiplierAfter(streakRef.current) >= MAX_ROUND_MULTIPLIER) round.settle(wager.bet * MAX_ROUND_MULTIPLIER);
    } else round.settle(0);
    round.delay(() => {
      if (round.wager.current !== wager || phaseRef.current !== 'flipping') return;
      setLastFlip(result);
      setHistory$((previous) => [result, ...previous].slice(0, 12));
      if (won) {
        setStreak(streakRef.current); setPhase(wager.settled ? 'won' : 'choosing'); sound.play('win');
      } else { setPhase('lost'); sound.play('drop'); }
      setBusy(false);
    }, 520);
  }, [round, sound, phaseRef, busyRef, setBusy, setPhase, setStreak, streakRef]);

  const cashOut = useCallback(() => {
    if (phaseRef.current !== 'choosing' || busyRef.current || streakRef.current === 0) return;
    const multiplier = multiplierAfter(streakRef.current);
    const payout = (round.wager.current?.bet ?? 0) * multiplier;
    if (!round.settle(payout)) return;
    setPhase('won');
    sound.play(multiplier >= 10 ? 'mega-win' : 'big-win');
    if (multiplier >= 2) fireConfetti({ count: multiplier >= 16 ? 130 : 70 });
  }, [round, phaseRef, busyRef, streakRef, setPhase, sound]);

  const reset = useCallback(() => {
    if (round.wager.current && !round.wager.current.settled) return;
    setPhase('idle'); setStreak(0); setLastFlip(null); setHistory$([]);
  }, [round, setPhase, setStreak]);

  // Keyboard shortcuts: H for Heads, T for Tails, C/Space for Cash Out.
  useHotkey('h', () => { if (phase === 'choosing' && !busy) choose('heads'); }, true);
  useHotkey('H', () => { if (phase === 'choosing' && !busy) choose('heads'); }, true);
  useHotkey('t', () => { if (phase === 'choosing' && !busy) choose('tails'); }, true);
  useHotkey('T', () => { if (phase === 'choosing' && !busy) choose('tails'); }, true);
  useHotkey('c', () => { if (phase === 'choosing' && streak > 0) cashOut(); }, true);
  useHotkey('C', () => { if (phase === 'choosing' && streak > 0) cashOut(); }, true);
  useHotkey(' ', () => {
    if (busy) return;
    if (phase === 'idle' || phase === 'won' || phase === 'lost') {
      if (phase !== 'idle') reset();
      start();
    } else if (phase === 'choosing' && streak > 0) {
      cashOut();
    }
  }, true);

  return (
    <OriginalPageLayout title="Flip">
      {round.error && <p role="alert" className="p-3 text-sm text-stake-red">{round.error}</p>}
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        <p className="text-[11px] text-stake-muted">Leaving cashes out your completed flips. Each successful flip multiplies your return by 1.98; the 1% edge compounds with each flip. The local simulation automatically cashes out at 10,000,000×.</p>
        {/* Status */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4 text-center min-h-[200px] flex flex-col items-center justify-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase + '-' + streak}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-[10px] uppercase tracking-widest text-stake-muted"
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
            <div className="text-xs text-stake-muted">
              Cash out for <span className="font-mono font-bold text-stake-green">{fmtCurrency(cashoutAmount)}</span>
              {' · '}
              next flip <span className="font-mono text-stake-green">{fmtMultiplier(nextMult)}</span>
            </div>
          )}
        </div>

        {/* History */}
        {history$.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-stake-muted mr-1 flex-shrink-0">Last flips</span>
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
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <button
              onClick={phase === 'idle' ? start : () => { reset(); start(); }}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
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
              className="w-full py-3 rounded-xl bg-accent-gold text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] shadow-[0_0_16px_rgba(255,209,102,.45)]"
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
          ? { rotateY: [0, 900], scale: [1, 1.12, 1] }
          : { rotateY: 0, scale: 1 }
      }
      transition={{
        duration: isFlipping ? 0.48 : 0.22,
        ease: isFlipping ? [0.16, 1, 0.3, 1] : 'easeOut',
      }}
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
      {/* Decorative inner ring (coin's beaded edge) — gives the disc
       *  some "minted" character so it doesn't read as a flat letter
       *  on a coloured circle. */}
      <span
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: '14%',
          border: '1.5px dashed rgba(0,0,0,.25)',
        }}
      />
      <span className="relative">{showSide === 'heads' ? 'H' : showSide === 'tails' ? 'T' : '?'}</span>
    </motion.div>
  );
}
