import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type Card,
  type HandRank,
  dealCards,
  payForRank,
  payoutMultiplier,
  rankLabel,
  rankLabel2,
} from './engine';

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
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [result, setResult] = useState<{ rank: HandRank; multiplier: number; payout: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const deal = useCallback(() => {
    if (busy || balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const cards = dealCards(rng, 5);
    setHand(cards);
    setHeld([false, false, false, false, false]);
    setResult(null);
    setPhase('hold');
    setBusy(false);
  }, [busy, balance, bet, fairness, sound]);

  const drawCards = useCallback(() => {
    if (phase !== 'hold' || busy) return;
    setBusy(true);
    sound.play('click');
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const newCards = [...hand];
    const replacementsNeeded = held.filter((h) => !h).length;
    if (replacementsNeeded > 0) {
      const draws = dealCards(rng, replacementsNeeded, hand.filter((_, i) => held[i]));
      let dIdx = 0;
      for (let i = 0; i < 5; i++) {
        if (!held[i]) {
          newCards[i] = draws[dIdx++]!;
        }
      }
      setHand(newCards);
    }
    const r = payoutMultiplier(newCards);
    const payout = +(bet * r.multiplier).toFixed(2);
    setResult({ rank: r.rank, multiplier: r.multiplier, payout });
    if (payout > 0) {
      balance.credit(payout);
      sound.play(r.multiplier >= 50 ? 'mega-win' : r.multiplier >= 4 ? 'big-win' : 'win');
    } else {
      sound.play('drop');
    }
    history.record({
      game: 'Video Poker',
      bet,
      payout,
      multiplier: r.multiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(bet, payout, false);
    setPhase('done');
    setTimeout(() => setBusy(false), 220);
  }, [phase, busy, hand, held, bet, balance, fairness, history, session, sound]);

  const toggleHold = useCallback((idx: number) => {
    if (phase !== 'hold' || busy) return;
    setHeld((prev) => prev.map((h, i) => (i === idx ? !h : h)));
  }, [phase, busy]);

  return (
    <OriginalPageLayout title="Video Poker">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Paytable */}
        <div className="rounded-2xl bg-bg-card border border-edge p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">Pays per 1× bet</div>
          <div className="space-y-0.5 text-[11px]">
            {RANKS_ORDER.map((r) => {
              const isCurrent = result?.rank === r;
              return (
                <div
                  key={r}
                  className={`flex items-center justify-between px-2 py-1 rounded ${
                    isCurrent ? 'bg-accent/15 border border-accent/40' : ''
                  }`}
                  style={isCurrent ? { boxShadow: '0 0 10px rgba(31,255,122,.35)' } : undefined}
                >
                  <span className={isCurrent ? 'text-accent font-semibold' : 'text-ink-dim'}>
                    {rankLabel2(r)}
                  </span>
                  <span className={`font-mono font-bold tabular-nums ${
                    isCurrent ? 'text-accent' : 'text-ink-dim'
                  }`}>
                    {payForRank(r)}×
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hand */}
        <div className="rounded-2xl bg-bg-card border border-edge p-3 min-h-[160px]">
          <AnimatePresence>
            {hand.length === 0 ? (
              <div className="flex items-center justify-center min-h-[140px] text-[11px] text-ink-mute uppercase tracking-widest">
                Place a bet to deal
              </div>
            ) : (
              <div className="flex justify-center gap-2">
                {hand.map((c, i) => (
                  <CardView
                    key={`${i}-${c.rank}-${c.suit}`}
                    card={c}
                    held={held[i]}
                    onToggle={() => toggleHold(i)}
                    interactive={phase === 'hold'}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Outcome */}
        {result && (
          <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Result</div>
            <div className={`font-mono font-bold text-base mt-0.5 ${
              result.multiplier >= 50 ? 'text-accent-gold' :
              result.multiplier >= 4 ? 'text-accent' :
              result.multiplier > 0 ? 'text-accent-cyan' : 'text-accent-hot'
            }`}>
              {rankLabel2(result.rank)}{result.multiplier > 0 ? ` · ${fmtCurrency(result.payout)}` : ''}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          {phase !== 'hold' && (
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          )}
          {phase === 'idle' && (
            <button
              onClick={deal}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              Deal · {fmtCurrency(bet)}
            </button>
          )}
          {phase === 'hold' && (
            <>
              <p className="text-[10px] text-ink-mute text-center">
                Tap cards to toggle HOLD, then draw
              </p>
              <button
                onClick={drawCards}
                disabled={busy}
                className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                Draw
              </button>
            </>
          )}
          {phase === 'done' && (
            <button
              onClick={() => { setPhase('idle'); setHand([]); setResult(null); }}
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              Play Again
            </button>
          )}
        </div>
      </div>
    </OriginalPageLayout>
  );
}

function CardView({
  card,
  held,
  onToggle,
  interactive,
}: {
  card: Card;
  held?: boolean;
  onToggle: () => void;
  interactive: boolean;
}) {
  const red = card.suit === '♥' || card.suit === '♦';
  return (
    <button
      onClick={onToggle}
      disabled={!interactive}
      className="relative active:scale-95 transition"
    >
      <motion.div
        initial={{ y: -20, opacity: 0, rotateY: 180 }}
        animate={{ y: 0, opacity: 1, rotateY: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl flex flex-col items-center justify-center font-bold"
        style={{
          background: 'linear-gradient(180deg, #f5f0e4, #e8dfc9)',
          border: held ? '2px solid #1fff7a' : '2px solid #c8932e',
          boxShadow: held
            ? '0 0 14px rgba(31,255,122,.55), inset 0 1px 0 rgba(255,255,255,.6)'
            : '0 6px 14px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6)',
          color: red ? '#c8102e' : '#1a0f00',
        }}
      >
        <div className="text-2xl leading-none">{rankLabel(card.rank)}</div>
        <div className="text-xl mt-0.5">{card.suit}</div>
      </motion.div>
      {held && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase"
          style={{ background: '#1fff7a', color: '#0a3a14', boxShadow: '0 0 8px rgba(31,255,122,.55)' }}
        >
          Hold
        </div>
      )}
    </button>
  );
}
