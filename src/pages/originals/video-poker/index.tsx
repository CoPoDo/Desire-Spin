import { forwardRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type Card,
  type HandRank,
  dealCards,
  drawHand,
  payForRank,
  payoutMultiplier,
  rankLabel,
  rankLabel2,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'hold' | 'done';

const RANKS_ORDER: HandRank[] = [
  'royal-flush',
  'straight-flush',
  'four-of-a-kind',
  'full-house',
  'flush',
  'straight',
  'three-of-a-kind',
  'two-pair',
  'jacks-or-better',
];

export function VideoPokerGame() {
  const { balance, sound } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase, phaseRef] = useRoundState<Phase>('idle');
  const [hand, setHand, handRef] = useRoundState<Card[]>([]);
  const [held, setHeld, heldRef] = useRoundState<boolean[]>([false, false, false, false, false]);
  const [result, setResult] = useState<{ rank: HandRank; multiplier: number; payout: number } | null>(null);
  const [busy, setBusy, busyRef] = useRoundState(false);
  const { begin, settle, delay, wager, onLeave, error } = useInteractiveRound('Video Poker');

  // Navigation completes the selected draw; a dealt hand is never refunded.
  onLeave.current = (updateView = false) => {
    const entry = wager.current;
    if (!entry || phaseRef.current !== 'hold') return 0;
    const cards = drawHand(entry.rng, handRef.current, heldRef.current);
    const evaluated = payoutMultiplier(cards);
    const payout = +(entry.bet * evaluated.multiplier).toFixed(2);
    if (updateView) { setHand(cards); setResult({ ...evaluated, payout }); setPhase('done'); }
    return payout;
  };

  const deal = useCallback(() => {
    if (busyRef.current || phaseRef.current === 'hold') return;
    const entry = begin(bet);
    if (!entry) return;
    setBusy(true);
    sound.play('click');
    setHand(dealCards(entry.rng, 5));
    setHeld([false, false, false, false, false]);
    setResult(null);
    setPhase('hold');
    delay(() => setBusy(false), 220);
  }, [busyRef, phaseRef, begin, bet, setBusy, sound, setHand, setHeld, setPhase, delay]);

  const drawCards = useCallback(() => {
    const entry = wager.current;
    if (phaseRef.current !== 'hold' || busyRef.current || !entry || entry.settled) return;
    setBusy(true);
    const cards = drawHand(entry.rng, handRef.current, heldRef.current);
    const r = payoutMultiplier(cards);
    const payout = +(entry.bet * r.multiplier).toFixed(2);
    setHand(cards);
    setResult({ ...r, payout });
    setPhase('done');
    settle(payout);
    sound.play(r.multiplier >= 50 ? 'mega-win' : r.multiplier >= 4 ? 'big-win' : payout > 0 ? 'win' : 'drop');
    if (r.multiplier >= 4) fireConfetti({ count: r.multiplier >= 50 ? 100 : 60 });
    delay(() => setBusy(false), 220);
  }, [wager, phaseRef, busyRef, setBusy, handRef, heldRef, setHand, setPhase, settle, sound, delay]);

  const toggleHold = useCallback((idx: number) => {
    if (phaseRef.current !== 'hold' || busyRef.current) return;
    sound.play('tick');
    setHeld(previous => previous.map((value, i) => i === idx ? !value : value));
  }, [phaseRef, busyRef, sound, setHeld]);

  return (
    <OriginalPageLayout title="Video Poker">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {error && <p role="alert" className="text-stake-red text-sm text-center">{error}</p>}
        {/* Paytable */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1.5 px-1">Pays per 1× bet</div>
          <div className="space-y-0.5 text-[11px]">
            {RANKS_ORDER.map((r) => {
              const isCurrent = result?.rank === r;
              return (
                <div
                  key={r}
                  className={`flex items-center justify-between px-2 py-1 rounded ${
                    isCurrent ? 'bg-stake-green/15 border border-stake-green/40' : ''
                  }`}
                  style={isCurrent ? { boxShadow: '0 0 10px rgba(0,231,1,.35)' } : undefined}
                >
                  <span className={isCurrent ? 'text-stake-green font-semibold' : 'text-stake-muted'}>
                    {rankLabel2(r)}
                  </span>
                  <span className={`font-mono font-bold tabular-nums ${
                    isCurrent ? 'text-stake-green' : 'text-stake-muted'
                  }`}>
                    {payForRank(r)}×
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hand */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-3 min-h-[160px]">
          {hand.length === 0 ? (
            <div className="flex items-center justify-center min-h-[140px] text-[11px] text-stake-muted uppercase tracking-widest">
              Place a bet to deal
            </div>
          ) : (
            <div className="flex justify-center gap-2">
              {/* AnimatePresence directly wraps each per-card key so a
                  draw replacing only some cards animates only those
                  cards out — held cards keep their key (held flag in
                  the index part) and don't re-animate. mode="popLayout"
                  keeps the row from collapsing during the exit. */}
              <AnimatePresence mode="popLayout" initial={false}>
                {hand.map((c, i) => (
                  <CardView
                    key={`${i}-${c.rank}-${c.suit}`}
                    card={c}
                    held={held[i]}
                    onToggle={() => toggleHold(i)}
                    interactive={phase === 'hold' && !busy}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Outcome */}
        {result && (
          <div className="rounded-xl bg-stake-card border border-stake-border p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">Result</div>
            <div className={`font-mono font-bold text-base mt-0.5 ${
              result.multiplier >= 50 ? 'text-accent-gold' :
              result.multiplier >= 4 ? 'text-stake-green' :
              result.multiplier > 0 ? 'text-accent-cyan' : 'text-stake-red'
            }`}>
              {rankLabel2(result.rank)}{result.multiplier > 0 ? ` · ${fmtCurrency(result.payout)}` : ''}
            </div>
          </div>
        )}

        <p className="text-[11px] text-stake-muted text-center">Leaving completes your draw using the current holds and settles the hand.</p>

        {/* Controls */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
          {phase !== 'hold' && (
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          )}
          {phase === 'idle' && (
            <button
              onClick={deal}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              Deal · {fmtCurrency(bet)}
            </button>
          )}
          {phase === 'hold' && (
            <>
              <p className="text-[10px] text-stake-muted text-center">
                Tap cards to toggle HOLD, then draw
              </p>
              <button
                onClick={drawCards}
                disabled={busy}
                className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                Draw
              </button>
            </>
          )}
          {phase === 'done' && (
            <button
              onClick={() => { setPhase('idle'); setHand([]); setResult(null); }}
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              Play Again
            </button>
          )}
        </div>
      </div>
    </OriginalPageLayout>
  );
}

const CardView = forwardRef<HTMLButtonElement, {
  card: Card;
  held?: boolean;
  onToggle: () => void;
  interactive: boolean;
}>(function CardView({
  card,
  held,
  onToggle,
  interactive,
}, ref) {
  const red = card.suit === '♥' || card.suit === '♦';
  return (
    <motion.button
      ref={ref}
      aria-label={`Hold ${rankLabel(card.rank)} ${card.suit}`}
      aria-pressed={!!held}
      onClick={onToggle}
      disabled={!interactive}
      className="relative active:scale-95 transition"
      // Deal-in / discard animations live on the outer button so
      // AnimatePresence (above) can drive them via key changes. When
      // the player presses Draw, replaced cards (whose key changes)
      // exit by flipping & dropping; replacements flip in from above.
      initial={{ y: -20, opacity: 0, rotateY: 180 }}
      animate={{ y: 0, opacity: 1, rotateY: 0 }}
      exit={{ y: 50, opacity: 0, rotateY: -180, transition: { duration: 0.22 } }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
    >
      <div
        className="relative w-14 h-20 sm:w-16 sm:h-24 rounded-xl font-bold"
        style={{
          background: 'linear-gradient(180deg, #f5f0e4, #e8dfc9)',
          border: held ? '2px solid #00e701' : '2px solid #c8932e',
          boxShadow: held
            ? '0 0 14px rgba(0,231,1,.55), inset 0 1px 0 rgba(255,255,255,.6)'
            : '0 6px 14px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6)',
          color: red ? '#c8102e' : '#1a0f00',
        }}
      >
        {/* Corner pips for proper playing-card look (matches Hilo / BJ /
         *  Baccarat) — small but always visible. */}
        <div className="absolute top-1 left-1 leading-none flex flex-col items-center text-[10px]">
          <span>{rankLabel(card.rank)}</span>
          <span>{card.suit}</span>
        </div>
        <div className="absolute bottom-1 right-1 leading-none flex flex-col items-center rotate-180 text-[10px]">
          <span>{rankLabel(card.rank)}</span>
          <span>{card.suit}</span>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl leading-none">{rankLabel(card.rank)}</div>
          <div className="text-xl mt-0.5">{card.suit}</div>
        </div>
      </div>
      {held && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase"
          style={{ background: '#00e701', color: '#0a3a14', boxShadow: '0 0 8px rgba(0,231,1,.55)' }}
        >
          Hold
        </div>
      )}
    </motion.button>
  );
});
