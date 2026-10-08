import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { MAX_ROUND_MULTIPLIER } from '../../../lib/accounting';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type Card,
  drawCard,
  higherChance,
  lowerChance,
  rankLabel,
  isWinningGuess,
  advanceMultiplier,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'playing' | 'lost';

export function HiloGame() {
  const { balance, sound } = useGame();
  const [bet, setBet] = usePersistedBet('hilo', 1);
  const [phase, setPhase, phaseRef] = useRoundState<Phase>('idle');
  const [current, setCurrent, currentRef] = useRoundState<Card | null>(null);
  const [previous, setPrevious] = useState<Card | null>(null);
  /** History of drawn cards across the current streak. Most recent
   *  first. Real Stake Hilo shows this strip so players can track
   *  which way the deck has been going. Cleared on round end. */
  const [cardHistory, setCardHistory] = useState<Card[]>([]);
  const [picks, setPicks, picksRef] = useRoundState(0);
  const [accumMult, setAccumMult, multRef] = useRoundState(1);
  const [busy, setBusy, busyRef] = useRoundState(false);
  const [lastBet, setLastBet] = useState(bet);
  const [skips, setSkips, skipsRef] = useRoundState(0);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const { begin, settle, delay, wager, onLeave, error } = useInteractiveRound('Hilo');

  onLeave.current = (updateView = false) => {
    const entry = wager.current;
    if (!entry || phaseRef.current !== 'playing') return 0;
    const payout = picksRef.current ? +(entry.bet * multRef.current).toFixed(2) : entry.bet;
    if (updateView) { setPhase('idle'); setCurrent(null); setLastPayout(payout); }
    return payout;
  };

  const start = useCallback(() => {
    if (busyRef.current || phaseRef.current === 'playing') return;
    const entry = begin(bet);
    if (!entry) return;
    const first = drawCard(entry.rng);
    setCurrent(first);
    setPrevious(null);
    setPicks(0);
    setAccumMult(1);
    setCardHistory([first]);
    setPhase('playing');
    setLastBet(entry.bet);
    setSkips(0);
    setLastPayout(null);
    setBusy(true);
    delay(() => setBusy(false), 250);
    sound.play('click');
  }, [busyRef, phaseRef, begin, bet, setCurrent, setPicks, setAccumMult, setPhase, setBusy, delay, sound, setSkips]);

  const guess = useCallback((direction: 'higher' | 'lower') => {
    const card = currentRef.current;
    const entry = wager.current;
    if (!card || phaseRef.current !== 'playing' || busyRef.current || !entry || entry.settled) return;
    setBusy(true);
    const next = drawCard(entry.rng);
    const correct = isWinningGuess(card.rank, next.rank, direction);
    setPrevious(card);
    setCurrent(next);
    setCardHistory(h => [next, ...h].slice(0, 12));
    if (correct) {
      const nextMult = Math.min(MAX_ROUND_MULTIPLIER, advanceMultiplier(multRef.current, card.rank, direction, picksRef.current === 0));
      setAccumMult(nextMult);
      setPicks(picksRef.current + 1);
      sound.play('win');
      if (nextMult >= MAX_ROUND_MULTIPLIER) {
        const payout = +(entry.bet * nextMult).toFixed(2);
        settle(payout);
        setLastPayout(payout);
        setPhase('idle');
      }
    } else {
      setPhase('lost');
      settle(0);
      sound.play('drop');
    }
    delay(() => setBusy(false), 350);
  }, [currentRef, wager, phaseRef, busyRef, setBusy, setCurrent, multRef, picksRef, setAccumMult, setPicks, sound, settle, setPhase, delay]);

  const cashOut = useCallback(() => {
    const entry = wager.current;
    if (phaseRef.current !== 'playing' || busyRef.current || !picksRef.current || !entry || entry.settled) return;
    const payout = +(entry.bet * multRef.current).toFixed(2);
    if (!settle(payout)) return;
    sound.play(multRef.current >= 10 ? 'mega-win' : multRef.current >= 3 ? 'big-win' : 'win');
    if (multRef.current >= 2) fireConfetti({ count: multRef.current >= 20 ? 100 : 50 });
    setLastPayout(payout);
    setPhase('idle');
    setCurrent(null);
    setPrevious(null);
    setPicks(0);
    setAccumMult(1);
  }, [wager, phaseRef, busyRef, picksRef, multRef, settle, sound, setPhase, setCurrent, setPicks, setAccumMult]);

  const skip = useCallback(() => {
    const card = currentRef.current;
    const entry = wager.current;
    if (!card || phaseRef.current !== 'playing' || busyRef.current || skipsRef.current >= 52 || !entry || entry.settled) return;
    setBusy(true);
    setSkips(skipsRef.current + 1);
    const next = drawCard(entry.rng);
    setPrevious(card);
    setCurrent(next);
    setCardHistory(h => [next, ...h].slice(0, 12));
    sound.play('click');
    delay(() => setBusy(false), 250);
  }, [currentRef, wager, phaseRef, busyRef, setBusy, setCurrent, sound, delay, skipsRef, setSkips]);

  const reset = useCallback(() => {
    if (busyRef.current || phaseRef.current === 'playing') return;
    setPhase('idle');
    setCurrent(null);
    setPrevious(null);
    setPicks(0);
    setAccumMult(1);
    setCardHistory([]);
  }, [busyRef, phaseRef, setPhase, setCurrent, setPicks, setAccumMult]);

  // Keyboard shortcuts — real Stake binds:
  //   ArrowUp / H → Higher
  //   ArrowDown / L → Lower
  //   S → Skip card
  //   Space → Cash Out (or Bet if idle)
  useHotkey('h', () => { if (phase === 'playing' && !busy) guess('higher'); }, true);
  useHotkey('H', () => { if (phase === 'playing' && !busy) guess('higher'); }, true);
  useHotkey('ArrowUp', () => { if (phase === 'playing' && !busy) guess('higher'); }, true);
  useHotkey('l', () => { if (phase === 'playing' && !busy) guess('lower'); }, true);
  useHotkey('L', () => { if (phase === 'playing' && !busy) guess('lower'); }, true);
  useHotkey('ArrowDown', () => { if (phase === 'playing' && !busy) guess('lower'); }, true);
  useHotkey('s', () => { if (phase === 'playing' && !busy) skip(); }, true);
  useHotkey('S', () => { if (phase === 'playing' && !busy) skip(); }, true);
  useHotkey(' ', () => {
    if (busy) return;
    if (phase === 'idle' || phase === 'lost') {
      if (phase === 'lost') reset();
      start();
    } else if (phase === 'playing' && picks > 0) {
      cashOut();
    }
  }, true);

  const hMult = current ? Math.min(MAX_ROUND_MULTIPLIER, advanceMultiplier(accumMult, current.rank, 'higher', picks === 0)) : 0;
  const lMult = current ? Math.min(MAX_ROUND_MULTIPLIER, advanceMultiplier(accumMult, current.rank, 'lower', picks === 0)) : 0;
  const hPct = current ? higherChance(current.rank) * 100 : 0;
  const lPct = current ? lowerChance(current.rank) * 100 : 0;
  // Real Stake Hilo label convention: at the boundary cards (Ace
  // can't go lower, King can't go higher) the button just reads
  // "Same" since that's the only winning outcome. Middle cards use
  // "Higher or Same" / "Lower or Same" matching our engine's
  // inclusive rule.
  const hLabel = current?.rank === 13 ? 'Same' : current?.rank === 1 ? 'Higher' : 'Higher or =';
  const lLabel = current?.rank === 1 ? 'Same' : current?.rank === 13 ? 'Lower' : 'Lower or =';
  const cashoutAmount = +((wager.current?.bet ?? bet) * accumMult).toFixed(2);

  return (
    <OriginalPageLayout title="Hilo">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {error && <p role="alert" className="text-stake-red text-sm text-center">{error}</p>}
        {/* Card area */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4 min-h-[260px] flex flex-col items-center justify-center gap-3">
          {/* Header streak/multiplier display — scale-pops on each correct
           *  guess so the chain build-up reads as progress (rather than a
           *  silently incrementing number). Real Stake Hilo's win chain
           *  feels alive; the previous static text felt stuck. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`hdr-${phase}-${picks}-${current ? '1' : '0'}`}
              initial={picks > 0 && phase === 'playing' ? { scale: 0.7, opacity: 0, y: -4 } : { scale: 1, opacity: 1, y: 0 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 480, damping: 22 }}
              className={`text-[10px] uppercase tracking-widest ${
                phase === 'playing' && picks > 0 ? 'text-stake-green font-bold' :
                phase === 'lost' ? 'text-stake-red' : 'text-stake-muted'
              }`}
            >
              {!current ? 'Place bet to deal' :
               phase === 'lost' ? 'Wrong guess' :
               picks === 0 ? 'Higher or lower?' :
               `Streak ${picks} · ${fmtMultiplier(accumMult)}`}
            </motion.div>
          </AnimatePresence>
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

        {/* Streak ladder — recent cards drawn this round. Real Stake
            Hilo shows this strip so players can track which way the
            deck has been going. Most recent first; cleared on reset. */}
        {cardHistory.length > 1 && (
          <div className="rounded-xl bg-stake-card border border-stake-border p-2.5">
            <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1.5 px-1">
              This streak ({cardHistory.length})
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              <AnimatePresence initial={false}>
                {cardHistory.map((c, i) => {
                  const red = c.suit === '♥' || c.suit === '♦';
                  return (
                    <motion.span
                      key={`${i}-${c.rank}-${c.suit}`}
                      layout
                      initial={{ scale: 0.5, opacity: 0, x: -8 }}
                      animate={{ scale: 1, opacity: 1, x: 0 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                      className="font-mono font-bold text-[11px] tabular-nums min-w-[28px] h-[28px] px-1 rounded-md flex flex-col items-center justify-center flex-shrink-0 leading-none"
                      style={{
                        background: i === 0
                          ? 'linear-gradient(180deg, #fffbe1, #ffe9a8)'
                          : 'linear-gradient(180deg, #f5f0e4, #e8dfc9)',
                        border: i === 0 ? '1.5px solid #c8932e' : '1px solid rgba(200,147,46,.5)',
                        color: red ? '#c8102e' : '#1a0f00',
                        boxShadow: i === 0 ? '0 0 8px rgba(255,209,102,.5)' : 'none',
                      }}
                    >
                      <span>{rankLabel(c.rank)}</span>
                      <span className="text-[9px]">{c.suit}</span>
                    </motion.span>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        <p className="text-[11px] text-stake-muted text-center">Leaving cashes out your resolved streak. A bet with no guesses is returned. Simulation max win: 10,000,000×, with automatic cashout. Up to 52 skips per round.</p>
        {lastPayout !== null && <p role="status" className="text-stake-green text-center text-sm">Cashed out {fmtCurrency(lastPayout)}</p>}

        {/* Pre-game / lost */}
        {phase !== 'playing' ? (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} />
            {phase === 'lost' && (
              <div className="text-center text-xs text-stake-red font-semibold">
                Lost {fmtCurrency(lastBet)} — better luck next round
              </div>
            )}
            <button
              onClick={phase === 'lost' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              Bet · {fmtCurrency(bet)}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Higher / Lower buttons. Real Stake Hilo always shows the
                win chance directly on each button so the player can
                weigh risk vs payout at a glance. The arrow icon makes
                the direction unmistakable on phones. */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => guess('higher')}
                disabled={busy}
                className="rounded-xl bg-stake-card border border-stake-border p-3 hover:bg-stake-panel disabled:opacity-50 transition active:scale-[0.98]"
              >
                <div className="text-[10px] uppercase tracking-widest text-stake-muted flex items-center justify-center gap-1">
                  <span className="text-stake-green">▲</span> {hLabel}
                </div>
                <div className="font-mono font-bold text-xl text-stake-green mt-1 tabular-nums">
                  {hMult > 0 ? fmtMultiplier(hMult) : '—'}
                </div>
                <div className="text-[9px] font-mono text-stake-muted tabular-nums mt-0.5">
                  {hPct > 0 ? `${hPct.toFixed(1)}%` : '—'}
                </div>
              </button>
              <button
                onClick={() => guess('lower')}
                disabled={busy}
                className="rounded-xl bg-stake-card border border-stake-border p-3 hover:bg-stake-panel disabled:opacity-50 transition active:scale-[0.98]"
              >
                <div className="text-[10px] uppercase tracking-widest text-stake-muted flex items-center justify-center gap-1">
                  <span className="text-stake-green">▼</span> {lLabel}
                </div>
                <div className="font-mono font-bold text-xl text-stake-green mt-1 tabular-nums">
                  {lMult > 0 ? fmtMultiplier(lMult) : '—'}
                </div>
                <div className="text-[9px] font-mono text-stake-muted tabular-nums mt-0.5">
                  {lPct > 0 ? `${lPct.toFixed(1)}%` : '—'}
                </div>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={skip}
                disabled={busy || skips >= 52}
                className="flex-shrink-0 px-4 py-3 rounded-xl bg-stake-input border border-stake-border text-stake-muted hover:text-stake-text font-bold text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Skip Card ({52 - skips})
              </button>
              <button
                onClick={cashOut}
                disabled={busy || picks === 0}
                className="flex-1 py-3 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
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
