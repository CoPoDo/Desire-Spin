import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type Difficulty,
  type PumpRound,
  applyPump,
  cashOut,
  multiplierAt,
  maxPumpsFor,
  newRound,
  popProbFor,
  pumpOnce,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export function PumpGame() {
  const { balance, sound } = useGame();
  const [bet, setBet] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [round, setRound, roundRef] = useRoundState<PumpRound | null>(null);
  const [busy, setBusy, busyRef] = useRoundState(false);
  const { begin, settle, delay, wager, onLeave, error } = useInteractiveRound('Pump');

  const inGame = round !== null && !round.popped && !round.cashed;
  const currentMult = round ? multiplierAt(round.difficulty, round.pumps) : 1;
  const nextMult = round ? multiplierAt(round.difficulty, round.pumps + 1) : 1;
  const cashoutAmount = round ? +(round.bet * currentMult).toFixed(2) : 0;
  const popPct = +(popProbFor(difficulty) * 100).toFixed(1);

  onLeave.current = (updateView = false) => {
    const current = roundRef.current;
    if (!current) return 0;
    if (current.popped || current.cashed) return current.payout;
    const next = current.pumps ? cashOut(current) : { ...current, cashed: true, payout: current.bet };
    if (updateView) setRound(next);
    return next.payout;
  };

  const start = useCallback(() => {
    const current = roundRef.current;
    if (busyRef.current || (current && !current.cashed && !current.popped)) return;
    const entry = begin(bet);
    if (!entry) return;
    sound.play('click');
    setRound(newRound(entry.bet, difficulty));
    setBusy(true);
    delay(() => setBusy(false), 220);
  }, [roundRef, busyRef, begin, bet, difficulty, sound, setRound, setBusy, delay]);

  const onPump = useCallback(() => {
    const current = roundRef.current;
    const entry = wager.current;
    if (!current || current.popped || current.cashed || busyRef.current || !entry || entry.settled) return;
    setBusy(true);
    const next = applyPump(current, pumpOnce(entry.rng, current.difficulty, current.pumps));
    setRound(next);
    if (next.popped || next.cashed) settle(next.payout);
    sound.play(next.popped ? 'drop' : next.cashed ? 'big-win' : 'win');
    delay(() => setBusy(false), 220);
  }, [roundRef, wager, busyRef, setBusy, setRound, settle, sound, delay]);

  const doCashOut = useCallback(() => {
    const current = roundRef.current;
    if (!current || current.popped || current.cashed || current.pumps === 0 || busyRef.current) return;
    const next = cashOut(current);
    setRound(next);
    if (!settle(next.payout)) return;
    const mult = multiplierAt(current.difficulty, current.pumps);
    sound.play(mult >= 10 ? 'mega-win' : mult >= 3 ? 'big-win' : 'win');
    if (mult >= 1.5) fireConfetti({ count: mult >= 20 ? 100 : 50 });
  }, [roundRef, busyRef, setRound, settle, sound]);

  const reset = useCallback(() => {
    const current = roundRef.current;
    if (!busyRef.current && current && (current.cashed || current.popped)) setRound(null);
  }, [roundRef, busyRef, setRound]);

  // Space-to-pump hotkey. If a round is active, Space adds a pump.
  // If idle, Space starts a fresh round. Bypassed when balloon has
  // popped or been cashed (player must Reset / Play Again).
  useHotkey(' ', () => {
    if (busy) return;
    if (!round || round.cashed || round.popped) {
      if (round?.cashed || round?.popped) reset();
      start();
      return;
    }
    onPump();
  }, true);

  // Balloon size grows with pumps (capped). Pop briefly enlarges it before
  // exit animation handles fade.
  const balloonScale = round
    ? round.popped
      ? 1.5
      : Math.min(1 + round.pumps * 0.08, 2.4)
    : 1;

  return (
    <OriginalPageLayout title="Pump">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {error && <p role="alert" className="text-stake-red text-sm text-center">{error}</p>}
        {/* Status */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-3 text-center">
          {!round ? (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">
              Set bet & difficulty · {popPct}% initial pop chance
            </div>
          ) : round.popped ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-stake-red">Popped!</div>
              <div className="font-mono font-bold text-2xl mt-1 tabular-nums text-stake-red">
                -{fmtCurrency(round.bet)}
              </div>
            </>
          ) : round.cashed ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-stake-green">Cashed out</div>
              <div className="font-mono font-bold text-2xl mt-1 tabular-nums text-stake-green">
                +{fmtCurrency(round.payout - round.bet)}
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-widest text-stake-muted">Multiplier</div>
              <div
                className="font-mono font-bold text-3xl text-stake-green tabular-nums leading-none mt-1"
                style={{ textShadow: '0 0 18px rgba(0,231,1,.6)' }}
              >
                {fmtMultiplier(currentMult)}
              </div>
              <div className="text-[10px] text-stake-muted mt-1">
                {round.pumps} / {maxPumpsFor(round.difficulty)} pumps · cash out{' '}
                <span className="text-stake-green">{fmtCurrency(cashoutAmount)}</span>
              </div>
            </>
          )}
        </div>

        {/* Balloon — container shakes when the balloon pops */}
        <div
          className={`relative rounded-lg bg-stake-card border border-stake-border p-6 flex items-center justify-center min-h-[220px] overflow-hidden ${round?.popped ? 'shake-medium' : ''}`}
        >
          {/* Pop debris — 12 little balloon-shred particles fly outward
           *  radially when the balloon pops. Adds the "splat" feedback
           *  that a single 💥 emoji on its own lacks. Each particle has
           *  a randomised offset angle so they don't look mechanical. */}
          <AnimatePresence>
            {round?.popped && (
              <>
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i / 12) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
                  const dist = 90 + (i % 4) * 18;
                  const dx = Math.cos(angle) * dist;
                  const dy = Math.sin(angle) * dist;
                  return (
                    <motion.span
                      key={`debris-${i}`}
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        width: 8 + (i % 3) * 2,
                        height: 8 + (i % 3) * 2,
                        background:
                          i % 3 === 0
                            ? '#ed4163'
                            : i % 3 === 1
                              ? '#ff7aa3'
                              : '#ffd166',
                        boxShadow: '0 0 8px rgba(237,65,99,.6)',
                      }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: dx, y: dy, opacity: 0, scale: 0.4, rotate: 240 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  );
                })}
              </>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {round?.popped ? (
              <motion.div
                key="pop"
                initial={{ scale: 1.2 }}
                animate={{ scale: [1.2, 2.2, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 0.6 }}
                className="text-7xl relative z-10"
                style={{ filter: 'drop-shadow(0 0 18px rgba(237,65,99,.85))' }}
              >
                💥
              </motion.div>
            ) : (
              <motion.div
                key={`balloon-${round?.pumps ?? 0}`}
                initial={false}
                animate={{
                  scale: balloonScale,
                  rotate: round && busy ? [-2, 2, 0] : 0,
                }}
                transition={{
                  scale: { type: 'spring', stiffness: 300, damping: 15 },
                  rotate: { duration: 0.18 },
                }}
                className="text-7xl select-none"
                style={{
                  filter:
                    round?.cashed
                      ? 'drop-shadow(0 0 22px rgba(0,231,1,.8))'
                      : 'drop-shadow(0 8px 18px rgba(0,0,0,.55))',
                }}
              >
                🎈
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-[11px] text-stake-muted text-center">Leaving cashes out surviving pumps. An unpumped bet is returned. The last safe pump cashes out automatically.</p>

        {/* Controls */}
        {!inGame ? (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1.5">Difficulty</div>
              <div className="grid grid-cols-4 gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                      difficulty === d
                        ? 'bg-stake-green text-stake-bg'
                        : 'bg-stake-input border border-stake-border text-stake-muted hover:text-stake-text'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 text-[10px] text-stake-muted">
                {(popProbFor(difficulty) * 100).toFixed(1)}% initial pop risk · up to {maxPumpsFor(difficulty)} pumps · 98% RTP
              </div>
            </div>
            <button
              onClick={round?.cashed || round?.popped ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {round?.cashed || round?.popped ? 'Play Again' : `Bet ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-stake-input border border-stake-border p-2 text-center">
                <div className="text-[10px] uppercase tracking-widest text-stake-muted">Next Pump</div>
                <div className="font-mono font-bold text-base text-stake-text mt-0.5 tabular-nums">{fmtMultiplier(nextMult)}</div>
              </div>
              <div className="rounded-lg bg-stake-input border border-stake-border p-2 text-center">
                <div className="text-[10px] uppercase tracking-widest text-stake-muted">Next Pop Risk</div>
                <div className="font-mono font-bold text-base text-stake-red mt-0.5 tabular-nums">
                  {(popProbFor(round.difficulty, round.pumps) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={doCashOut}
                disabled={busy || round.pumps === 0}
                className="flex-1 py-3 rounded-xl bg-accent-gold text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] shadow-[0_0_14px_rgba(255,209,102,.45)]"
              >
                {round.pumps === 0 ? 'Pump first' : `Cash Out · ${fmtCurrency(cashoutAmount)}`}
              </button>
              <button
                onClick={onPump}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                Pump
              </button>
            </div>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}
