import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
import { useRoundPlayback } from '../_shared/useRoundPlayback';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type CupsResult,
  type Difficulty,
  cupCountFor,
  multiplierFor,
  play,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
type Phase = 'idle' | 'reveal-ball' | 'shuffling' | 'pick' | 'reveal';

export function CupsGame() {
  const { balance, sound } = useGame();
  const round = useInteractiveRound('3 Cups');
  const { wait, schedule } = useRoundPlayback();
  const [bet, setBet] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [phase, setPhase, phaseRef] = useRoundState<Phase>('idle');
  const [result, setResult] = useState<CupsResult | null>(null);
  const [busy, setBusy, busyRef] = useRoundState(false);
  /** cupOrder[visualPos] = cupId — represents which cup is at each
   *  visible position. Shuffled by repeatedly swapping pairs so cups
   *  visibly slide between positions (like a real shell-game where
   *  the dealer's hands cross). The "ball" stays under cup ID 0
   *  throughout (chosen at round-start via the engine's ballAt) — we
   *  just don't tell the player which visual position that is. */
  const cupCount = cupCountFor(difficulty);
  const [cupOrder, setCupOrder] = useState<number[]>(() => Array.from({ length: cupCount }, (_, i) => i));
  /** The ID of the cup that hides the ball this round. Picked from the
   *  engine's ballAt before the shuffle so the shuffle has somewhere
   *  to be hiding. Null when no round is in progress. */
  const [ballCupId, setBallCupId] = useState<number | null>(null);

  const mult = multiplierFor(difficulty);

  // Keep cupOrder in sync with difficulty (cup count changes)
  useEffect(() => {
    setCupOrder(Array.from({ length: cupCount }, (_, i) => i));
    setBallCupId(null);
    setResult(null);
    setPhase('idle');
  }, [cupCount]);

  round.onLeave.current = (updateView = false) => {
    if (updateView) { setPhase('idle'); setBusy(false); setResult(null); setBallCupId(null); }
    return round.wager.current?.bet ?? 0;
  };

  const start = useCallback(async () => {
    if (busyRef.current || !['idle', 'reveal'].includes(phaseRef.current)) return;
    const wager = round.begin(bet);
    if (!wager) return;
    sound.play('click'); setResult(null); setBusy(true);
    const r = play(wager.rng, bet, 0, difficulty);
    setBallCupId(r.ballAt);
    let order = Array.from({ length: cupCount }, (_, index) => index);
    setCupOrder(order); setPhase('reveal-ball');
    if (!(await wait(650)) || wager.settled) return;
    setPhase('shuffling');
    const swaps = cupCount === 3 ? 5 : cupCount === 4 ? 6 : 7;
    for (let swap = 0; swap < swaps; swap++) {
      sound.play('tick');
      const left = wager.rng.nextInt(cupCount);
      const draw = wager.rng.nextInt(cupCount - 1);
      const right = draw >= left ? draw + 1 : draw;
      order = [...order];
      [order[left], order[right]] = [order[right]!, order[left]!];
      setCupOrder(order);
      if (!(await wait(280)) || wager.settled) return;
    }
    setPhase('pick'); setBusy(false);
  }, [bet, difficulty, cupCount, sound, round, busyRef, phaseRef, setBusy, setPhase, wait]);

  const pick = useCallback((cupId: number) => {
    const wager = round.wager.current;
    if (phaseRef.current !== 'pick' || busyRef.current || ballCupId === null || !wager || wager.settled) return;
    setBusy(true); sound.play('click');
    const win = cupId === ballCupId;
    const payout = win ? +(wager.bet * mult).toFixed(2) : 0;
    round.settle(payout);
    setResult({ ballAt: ballCupId, pickedAt: cupId, win, multiplier: win ? mult : 0, payout });
    setPhase('reveal');
    sound.play(win ? 'big-win' : 'drop');
    if (win) fireConfetti({ count: 70 });
    schedule(() => setBusy(false), 320);
  }, [round, phaseRef, busyRef, ballCupId, mult, setBusy, setPhase, sound, schedule]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setBallCupId(null);
    setCupOrder(Array.from({ length: cupCount }, (_, i) => i));
  }, [cupCount]);

  return (
    <OriginalPageLayout title="3 Cups">
      {round.error && <p role="alert" className="p-3 text-sm text-stake-red">{round.error}</p>}
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        <p className="text-[11px] text-stake-muted">Follow the ball, then choose a cup. Leaving before choosing returns your stake.</p>
        {/* Status */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-3 text-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">
              Find the ball · {fmtMultiplier(mult)} payout
            </div>
          )}
          {phase === 'reveal-ball' && (
            <div className="text-[10px] uppercase tracking-widest text-accent-cyan">Watch the ball…</div>
          )}
          {phase === 'shuffling' && (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">Shuffling…</div>
          )}
          {phase === 'pick' && (
            <div className="text-[10px] uppercase tracking-widest text-stake-green">Pick a cup</div>
          )}
          {phase === 'reveal' && result && (
            <div
              className={`font-mono font-bold text-xl ${
                result.win ? 'text-stake-green' : 'text-stake-red'
              }`}
            >
              {result.win
                ? `Won ${fmtCurrency(result.payout)} · ${fmtMultiplier(result.multiplier)}`
                : `Wrong cup · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* Cups arena */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-6 min-h-[220px] flex items-center justify-center overflow-hidden">
          <div className="flex gap-3 relative">
            {cupOrder.map((cupId, visualPos) => {
              const isBall = cupId === ballCupId;
              const isPicked = result?.pickedAt === cupId;
              const isReveal = phase === 'reveal';
              const isBallReveal = phase === 'reveal-ball';
              // Show ball position during the initial reveal AND on
              // the final reveal so the player sees where it ended up.
              const showBall = isBall && (isBallReveal || isReveal);
              return (
                <motion.button
                  key={cupId}
                  onClick={() => pick(cupId)}
                  disabled={phase !== 'pick'}
                  className="relative cursor-pointer"
                  // layout makes framer-motion smoothly animate the
                  // cup to its new flex-row index when cupOrder
                  // permutes — visible left-right swap motion.
                  layout
                  layoutId={`cup-${cupId}`}
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                  whileHover={phase === 'pick' ? { y: -8, scale: 1.05 } : undefined}
                  whileTap={phase === 'pick' ? { scale: 0.95 } : undefined}
                  // Position-sort helps framer track which is at index N
                  style={{ order: visualPos }}
                >
                  <motion.div
                    className="text-6xl select-none"
                    animate={
                      // Lift the cup during reveal-ball (showing where
                      // the ball starts), AND during final reveal for
                      // the picked + ball cups so player sees both
                      // outcomes.
                      isBallReveal && isBall
                        ? { y: -18 }
                        : isReveal && (isBall || isPicked)
                          ? { y: -15 }
                          : { y: 0 }
                    }
                    transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                    style={{
                      filter:
                        isReveal && isPicked && !result?.win
                          ? 'drop-shadow(0 0 14px rgba(237,65,99,.7)) hue-rotate(-30deg)'
                          : isReveal && isBall
                            ? 'drop-shadow(0 0 14px rgba(0,231,1,.85))'
                            : isBallReveal && isBall
                              ? 'drop-shadow(0 0 14px rgba(34,211,238,.75))'
                              : 'drop-shadow(0 6px 12px rgba(0,0,0,.55))',
                    }}
                  >
                    🥤
                  </motion.div>
                  <AnimatePresence>
                    {showBall && (
                      <motion.div
                        className="absolute left-1/2 -translate-x-1/2 text-3xl"
                        style={{ bottom: '8px' }}
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: 10, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.1 }}
                      >
                        ⚪
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        {phase === 'idle' || phase === 'reveal' ? (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1.5">Cups</div>
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    disabled={busy}
                    className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                      difficulty === d
                        ? 'bg-stake-green text-stake-bg'
                        : 'bg-stake-input border border-stake-border text-stake-muted hover:text-stake-text'
                    }`}
                  >
                    {cupCountFor(d)} · {fmtMultiplier(multiplierFor(d))}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={phase === 'reveal' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Play Again' : `Bet ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 text-center text-xs text-stake-muted">
            {phase === 'reveal-ball' ? 'Memorise the cup…' :
             phase === 'shuffling' ? 'Cups are shuffling…' :
             'Tap a cup to find the ball'}
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

