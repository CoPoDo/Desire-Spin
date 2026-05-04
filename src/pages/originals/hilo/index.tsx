import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type Card,
  drawCard,
  higherMult,
  lowerMult,
  rankLabel,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'playing' | 'lost';

export function HiloGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [current, setCurrent] = useState<Card | null>(null);
  const [previous, setPrevious] = useState<Card | null>(null);
  const [picks, setPicks] = useState(0);
  const [accumMult, setAccumMult] = useState(1);
  const [busy, setBusy] = useState(false);

  const start = useCallback(() => {
    if (busy) return;
    if (balance.balance < bet || bet <= 0) return;
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const first = drawCard(rng);
    setCurrent(first);
    setPrevious(null);
    setPicks(0);
    setAccumMult(1);
    setPhase('playing');
  }, [busy, balance, bet, fairness, sound]);

  const guess = useCallback(
    (direction: 'higher' | 'lower') => {
      if (!current || phase !== 'playing' || busy) return;
      setBusy(true);
      sound.play('click');
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const next = drawCard(rng);

      const correct =
        direction === 'higher' ? next.rank >= current.rank : next.rank <= current.rank;

      const stepMult =
        direction === 'higher' ? higherMult(current.rank) : lowerMult(current.rank);

      setTimeout(() => {
        setPrevious(current);
        setCurrent(next);
        if (correct) {
          const nextMult = +(accumMult * stepMult).toFixed(4);
          setAccumMult(nextMult);
          setPicks((p) => p + 1);
          sound.play('win');
        } else {
          setPhase('lost');
          sound.play('drop');
          history.record({
            game: 'Hilo',
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
      }, 350);
    },
    [accumMult, balance, bet, busy, current, fairness, history, phase, session, sound],
  );

  const cashOut = useCallback(() => {
    if (phase !== 'playing' || picks === 0) return;
    sound.play('big-win');
    const payout = +(bet * accumMult).toFixed(2);
    balance.credit(payout);
    if (accumMult >= 2) {
      fireConfetti({
        count: accumMult >= 20 ? 130 : accumMult >= 5 ? 80 : 50,
      });
    }
    history.record({
      game: 'Hilo',
      bet,
      payout,
      multiplier: accumMult,
      serverSeedHash: fairness.hash,
      clientSeed: '',
      nonce: 0,
    });
    session.recordSpin(bet, payout, false);
    setPhase('idle');
    setCurrent(null);
    setPrevious(null);
    setPicks(0);
    setAccumMult(1);
  }, [phase, picks, accumMult, balance, bet, fairness, history, session, sound]);

  const skip = useCallback(() => {
    // "Skip card" — draw a new card without guessing. Real Stake has this.
    if (!current || phase !== 'playing' || busy) return;
    setBusy(true);
    sound.play('click');
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const next = drawCard(rng);
    setTimeout(() => {
      setPrevious(current);
      setCurrent(next);
      setBusy(false);
    }, 250);
  }, [current, phase, busy, fairness, sound]);

  const reset = useCallback(() => {
    setPhase('idle');
    setCurrent(null);
    setPrevious(null);
    setPicks(0);
    setAccumMult(1);
  }, []);

  const hMult = current ? higherMult(current.rank) : 0;
  const lMult = current ? lowerMult(current.rank) : 0;
  const cashoutAmount = +(bet * accumMult).toFixed(2);

  return (
    <OriginalPageLayout title="Hilo">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Card area */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 min-h-[260px] flex flex-col items-center justify-center gap-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute">
            {!current ? 'Place bet to deal' :
             phase === 'lost' ? 'Wrong guess' :
             picks === 0 ? 'Higher or lower?' :
             `Streak ${picks} · ${fmtMultiplier(accumMult)}`}
          </div>
          <div className="flex items-center gap-3">
            {previous && phase !== 'idle' && <CardView card={previous} faded />}
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={`${current.rank}-${current.suit}-${picks}`}
                  initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotateY: -90 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CardView card={current} big />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pre-game / lost */}
        {phase !== 'playing' ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} />
            {phase === 'lost' && (
              <div className="text-center text-xs text-accent-hot font-semibold">
                Lost {fmtCurrency(bet)} — better luck next round
              </div>
            )}
            <button
              onClick={phase === 'lost' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              Bet · {fmtCurrency(bet)}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Higher / Lower buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => guess('higher')}
                disabled={busy}
                className="rounded-xl bg-bg-card border border-edge p-4 hover:bg-bg-hover disabled:opacity-50 transition active:scale-[0.98]"
              >
                <div className="text-xs uppercase tracking-widest text-ink-mute">Higher or =</div>
                <div className="font-mono font-bold text-xl text-accent mt-1 tabular-nums">
                  {hMult > 0 ? fmtMultiplier(hMult) : '—'}
                </div>
              </button>
              <button
                onClick={() => guess('lower')}
                disabled={busy}
                className="rounded-xl bg-bg-card border border-edge p-4 hover:bg-bg-hover disabled:opacity-50 transition active:scale-[0.98]"
              >
                <div className="text-xs uppercase tracking-widest text-ink-mute">Lower or =</div>
                <div className="font-mono font-bold text-xl text-accent mt-1 tabular-nums">
                  {lMult > 0 ? fmtMultiplier(lMult) : '—'}
                </div>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={skip}
                disabled={busy}
                className="flex-shrink-0 px-4 py-3 rounded-xl bg-bg-elev border border-edge text-ink-dim hover:text-ink font-bold text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Skip Card
              </button>
              <button
                onClick={cashOut}
                disabled={busy || picks === 0}
                className="flex-1 py-3 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                {picks === 0 ? 'Pick a side first' : `Cash Out · ${fmtCurrency(cashoutAmount)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

function CardView({ card, big = false, faded = false }: { card: Card; big?: boolean; faded?: boolean }) {
  const red = card.suit === '♥' || card.suit === '♦';
  // Real playing cards have corner pips (small rank+suit in opposite
  // corners) so the card is readable when fanned in a hand. Adding
  // them makes our card visibly closer to a real-deck card and
  // distinct from a generic "tile with letter on it".
  return (
    <div
      className={`relative rounded-xl select-none font-bold ${
        big ? 'w-32 h-44' : 'w-16 h-24'
      } ${faded ? 'opacity-50' : ''}`}
      style={{
        background: 'linear-gradient(180deg, #f5f0e4, #e8dfc9)',
        border: '2px solid #c8932e',
        boxShadow: '0 8px 18px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6)',
        color: red ? '#c8102e' : '#1a0f00',
      }}
    >
      {/* Top-left corner pip */}
      <div
        className={`absolute leading-none flex flex-col items-center ${big ? 'top-1.5 left-2 text-base' : 'top-1 left-1 text-[10px]'}`}
      >
        <span>{rankLabel(card.rank)}</span>
        <span className={big ? 'text-sm' : 'text-[10px]'}>{card.suit}</span>
      </div>
      {/* Bottom-right corner pip (rotated) */}
      <div
        className={`absolute leading-none flex flex-col items-center rotate-180 ${big ? 'bottom-1.5 right-2 text-base' : 'bottom-1 right-1 text-[10px]'}`}
      >
        <span>{rankLabel(card.rank)}</span>
        <span className={big ? 'text-sm' : 'text-[10px]'}>{card.suit}</span>
      </div>
      {/* Centre rank + suit (bigger) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={big ? 'text-5xl leading-none' : 'text-2xl leading-none'}>
          {rankLabel(card.rank)}
        </div>
        <div className={big ? 'text-3xl mt-1' : 'text-xl mt-0.5'}>{card.suit}</div>
      </div>
    </div>
  );
}
