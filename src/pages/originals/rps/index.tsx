import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
import { MOVES, pickOpponent, createRpsRound, advanceRpsRound, cashOutRpsRound, multiplierAfterWins, RPS_MAX_WINS, type Move, type RpsRoundState } from './engine';

type Phase = 'ready' | 'revealing' | 'choosing' | 'done';
const LETTER: Record<Move, string> = { rock: 'R', paper: 'P', scissors: 'S' };
const LABEL: Record<Move, string> = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };

/** One stake and one RNG stream per streak. Pictures never cancel a throw. */
export function RpsGame() {
  const { balance, sound } = useGame();
  const reduced = useReducedMotion();
  const round = useInteractiveRound('Rock Paper Scissors');
  const [bet, setBet] = usePersistedBet('rps', 1);
  const [state, setState, stateRef] = useRoundState<RpsRoundState | null>(null);
  const [phase, setPhase, phaseRef] = useRoundState<Phase>('ready');
  const [busy, setBusy, busyRef] = useRoundState(false);
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [opponentMove, setOpponentMove] = useState<Move | null>(null);
  const [throws, setThrows] = useState<{ move: Move; outcome: string }[]>([]);
  const active = !!state && !state.done;
  const wins = state?.wins ?? 0;
  const potential = +((state?.bet ?? bet) * multiplierAfterWins(wins)).toFixed(2);

  round.onLeave.current = (updateView = false) => {
    const committed = stateRef.current;
    if (!committed) return round.wager.current?.bet ?? 0;
    const final = committed.done ? committed : committed.wins > 0 ? cashOutRpsRound(committed) : { ...committed, done: true, payout: committed.bet };
    stateRef.current = final;
    if (updateView) { setState(final); setPhase('done'); setBusy(false); }
    return final.payout;
  };

  const choose = useCallback((move: Move) => {
    if (busyRef.current) return;
    let current = stateRef.current;
    let wager = round.wager.current;
    if (!current || current.done || !wager || wager.settled) {
      wager = round.begin(bet);
      if (!wager) return;
      current = createRpsRound(wager.bet);
      setState(current);
      setThrows([]);
    }
    setBusy(true);
    setPhase('revealing');
    setPlayerMove(move);
    setOpponentMove(null);
    sound.play('click');
    const opponent = pickOpponent(wager.rng);
    const next = advanceRpsRound(current, move, opponent);
    // Synchronous authoritative state survives a departure mid-animation.
    stateRef.current = next;
    if (next.done) round.settle(next.payout);
    round.delay(() => {
      if (round.wager.current !== wager || phaseRef.current !== 'revealing') return;
      setState(next);
      setOpponentMove(opponent);
      setThrows((previous) => [...previous, { move: opponent, outcome: next.lastResult!.outcome }].slice(-12));
      setPhase(next.done ? 'done' : 'choosing');
      setBusy(false);
      sound.play(next.lastResult?.outcome === 'win' ? 'win' : next.lastResult?.outcome === 'tie' ? 'tick' : 'drop');
    }, reduced ? 0 : 650);
  }, [bet, round, reduced, sound, busyRef, phaseRef, stateRef, setState, setBusy, setPhase]);

  const cashOut = useCallback(() => {
    const current = stateRef.current;
    if (busyRef.current || !current || current.done || current.wins === 0) return;
    const final = cashOutRpsRound(current);
    if (!round.settle(final.payout)) return;
    setState(final);
    setPhase('done');
    sound.play('win');
  }, [busyRef, stateRef, round, setState, setPhase, sound]);

  useHotkey('r', () => choose('rock'));
  useHotkey('p', () => choose('paper'));
  useHotkey('s', () => choose('scissors'));
  useHotkey('c', cashOut);
  useHotkey(' ', cashOut, active && wins > 0);

  const outcome = state?.lastResult?.outcome;
  const message = busy ? 'Rock. Paper. Scissors…' : phase === 'done'
    ? state?.payout ? `Cashed out · ${fmtCurrency(state.payout)} credits` : 'Streak ended'
    : phase === 'choosing' ? outcome === 'tie' ? 'Tie. Your streak stays alive.' : `${wins} ${wins === 1 ? 'win' : 'wins'} · cash out or keep playing`
    : 'Choose a move to begin';

  return <OriginalPageLayout title="Rock Paper Scissors">
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="rounded-xl border border-stake-border bg-stake-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-stake-border"><span className="text-xs tracking-[.15em] uppercase text-stake-muted">Streak game</span><span className="text-xs text-stake-muted">{wins} / {RPS_MAX_WINS} wins</span></div>
        <div className="grid grid-cols-[1fr_36px_1fr] items-center max-w-xl mx-auto gap-4 px-6 py-7 sm:py-10">
          <MoveCard move={playerMove} label="You" active={outcome === 'win' && !busy} />
          <span className="text-center font-serif italic text-stake-muted">vs</span>
          <motion.div animate={busy && !reduced ? { y: [0, -7, 0, -7, 0] } : { y: 0 }} transition={{ duration: .6, ease: 'easeInOut' }}><MoveCard move={opponentMove} label="Opponent" active={outcome === 'loss' && !busy} /></motion.div>
        </div>
        <p className="px-4 pb-5 min-h-10 text-center text-sm text-stake-text" role="status" aria-live="polite">{message}</p>
        <div className="grid grid-cols-2 border-t border-stake-border bg-stake-bg/40"><div className="p-4 text-center border-r border-stake-border"><span className="block text-[10px] uppercase tracking-widest text-stake-muted">Current return</span><strong className="mt-1 block font-mono text-xl text-stake-text">{fmtMultiplier(multiplierAfterWins(wins))}</strong></div><div className="p-4 text-center"><span className="block text-[10px] uppercase tracking-widest text-stake-muted">Next win</span><strong className="mt-1 block font-mono text-xl text-stake-green">{fmtMultiplier(multiplierAfterWins(Math.min(RPS_MAX_WINS, wins + 1)))}</strong></div></div>
      </div>
      <div className="rounded-xl border border-stake-border bg-stake-card p-4 space-y-4">
        <BetInput bet={bet} onBetChange={setBet} disabled={active || busy} />
        <div className="grid grid-cols-3 gap-2">{MOVES.map((move) => <button key={move} aria-label={`Choose ${LABEL[move]}`} onClick={() => choose(move)} disabled={busy || (!active && !balance.canAfford(bet))} className="min-h-14 rounded-lg border border-stake-border bg-stake-input px-2 py-3 font-semibold text-sm text-stake-text hover:border-stake-green transition-colors disabled:opacity-40"><span className="mr-2 font-serif text-lg">{LETTER[move]}</span>{LABEL[move]}</button>)}</div>
        <button onClick={cashOut} disabled={!active || busy || wins === 0} className="min-h-12 w-full rounded-lg bg-stake-green text-stake-bg font-bold text-sm disabled:opacity-35">Cash out · {fmtCurrency(potential)}</button>
        {round.error && <p role="alert" className="text-sm text-stake-red">{round.error}</p>}
      </div>
      {throws.length > 0 && <div className="flex items-center gap-2 overflow-auto"><span className="text-xs text-stake-muted shrink-0">Throws</span>{throws.map((item, index) => <span key={index} aria-label={`${LABEL[item.move]}, ${item.outcome}`} className={`grid place-items-center w-8 h-8 shrink-0 rounded border font-serif text-sm ${item.outcome === 'win' ? 'border-stake-green text-stake-green' : item.outcome === 'loss' ? 'border-stake-red text-stake-red' : 'border-stake-border text-stake-muted'}`}>{LETTER[item.move]}</span>)}</div>}
      <p className="text-xs leading-relaxed text-stake-muted">One stake per streak. The first win returns 1.96×; later wins double the return. Ties keep your stake and streak in play. A loss ends the round. Cash out after a win, or reach 20 wins for an automatic cashout. Leaving settles the completed throws, including a throw already revealing. Keyboard: R / P / S to choose, C to cash out.</p>
    </div>
  </OriginalPageLayout>;
}

function MoveCard({ move, label, active }: { move: Move | null; label: string; active: boolean }) {
  return <div className="text-center"><span className="block mb-3 text-[10px] uppercase tracking-widest text-stake-muted">{label}</span><div className={`mx-auto aspect-[3/4] w-full max-w-36 rounded-lg border-2 shadow-lg flex flex-col items-center justify-center ${active ? 'border-stake-green bg-[#ecf5e9]' : 'border-[#cec9bc] bg-[#e9e5d9]'}`}><span className="font-serif font-bold text-5xl sm:text-6xl text-[#263b36]">{move ? LETTER[move] : '?'}</span><span className="mt-3 text-[10px] uppercase tracking-[.15em] text-[#56615b]">{move ? LABEL[move] : 'Hidden'}</span></div></div>;
}
