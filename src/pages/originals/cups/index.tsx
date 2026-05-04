import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type CupsResult,
  type Difficulty,
  cupCountFor,
  multiplierFor,
  play,
} from './engine';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
type Phase = 'idle' | 'shuffling' | 'pick' | 'reveal';

export function CupsGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<CupsResult | null>(null);
  const [busy, setBusy] = useState(false);

  const cupCount = cupCountFor(difficulty);
  const mult = multiplierFor(difficulty);

  const start = useCallback(() => {
    if (busy) return;
    if (balance.balance < bet || bet <= 0) return;
    sound.play('click');
    balance.debit(bet);
    setResult(null);
    setPhase('shuffling');
    setBusy(true);
    // Brief shuffle animation, then ready to pick
    setTimeout(() => {
      setPhase('pick');
      setBusy(false);
    }, 1200);
  }, [busy, balance, bet, sound]);

  const pick = useCallback(
    (idx: number) => {
      if (phase !== 'pick' || busy) return;
      setBusy(true);
      sound.play('click');
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const r = play(rng, bet, idx, difficulty);
      setResult(r);
      setPhase('reveal');
      if (r.win) {
        balance.credit(r.payout);
        sound.play(r.multiplier >= 4 ? 'big-win' : 'win');
      } else {
        sound.play('drop');
      }
      history.record({
        game: '3 Cups',
        bet,
        payout: r.payout,
        multiplier: r.multiplier,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(bet, r.payout, false);
      setTimeout(() => setBusy(false), 320);
    },
    [phase, busy, bet, difficulty, fairness, sound, history, session, balance],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
  }, []);

  return (
    <OriginalPageLayout title="3 Cups">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              Find the ball · {fmtMultiplier(mult)} payout
            </div>
          )}
          {phase === 'shuffling' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-dim">Shuffling…</div>
          )}
          {phase === 'pick' && (
            <div className="text-[10px] uppercase tracking-widest text-accent">Pick a cup</div>
          )}
          {phase === 'reveal' && result && (
            <div
              className={`font-mono font-bold text-xl ${
                result.win ? 'text-accent' : 'text-accent-hot'
              }`}
            >
              {result.win
                ? `Won ${fmtCurrency(result.payout)} · ${fmtMultiplier(result.multiplier)}`
                : `Wrong cup · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* Cups */}
        <div className="rounded-2xl bg-bg-card border border-edge p-6 min-h-[200px] flex items-center justify-center">
          <div className="flex gap-3">
            {Array.from({ length: cupCount }).map((_, i) => {
              const isPicked = result?.pickedAt === i;
              const wasBall = result?.ballAt === i;
              const reveal = phase === 'reveal';
              return (
                <motion.button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={phase !== 'pick'}
                  className="relative cursor-pointer"
                  animate={
                    phase === 'shuffling'
                      ? { x: [0, (i % 2 === 0 ? 30 : -30), 0, (i % 2 === 0 ? -30 : 30), 0], rotate: [0, -5, 5, -3, 0] }
                      : { x: 0, rotate: 0 }
                  }
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  whileHover={phase === 'pick' ? { y: -8, scale: 1.05 } : undefined}
                  whileTap={phase === 'pick' ? { scale: 0.95 } : undefined}
                >
                  <motion.div
                    className="text-6xl select-none"
                    animate={
                      reveal && wasBall
                        ? { y: -15 }
                        : { y: 0 }
                    }
                    transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                    style={{
                      filter:
                        reveal && isPicked && !result?.win
                          ? 'drop-shadow(0 0 14px rgba(255,61,139,.7)) hue-rotate(-30deg)'
                          : reveal && wasBall
                            ? 'drop-shadow(0 0 14px rgba(31,255,122,.85))'
                            : 'drop-shadow(0 6px 12px rgba(0,0,0,.55))',
                    }}
                  >
                    🥤
                  </motion.div>
                  <AnimatePresence>
                    {reveal && wasBall && (
                      <motion.div
                        className="absolute left-1/2 -translate-x-1/2 text-3xl"
                        style={{ bottom: '8px' }}
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
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
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">Cups</div>
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    disabled={busy}
                    className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                      difficulty === d
                        ? 'bg-accent text-bg'
                        : 'bg-bg-elev border border-edge text-ink-dim hover:text-ink'
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
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Play Again' : `Bet ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center text-xs text-ink-dim">
            {phase === 'shuffling' ? 'Cups are shuffling…' : 'Tap a cup to find the ball'}
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}
