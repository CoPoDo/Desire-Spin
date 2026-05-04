import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  HORSE_COLORS,
  HORSE_COUNT,
  HORSE_NAMES,
  HORSE_WEIGHTS,
  multiplierForHorse,
  play,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'racing' | 'done';

export function RaceGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [winner, setWinner] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const mult = picked !== null ? multiplierForHorse(picked) : 0;
  const profitOnWin = +(bet * mult - bet).toFixed(2);

  const start = useCallback(() => {
    if (busy || picked === null) return;
    if (balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    setPhase('racing');
    setWinner(null);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const result = play(rng, bet, picked);
    // Race animation runs ~3.5s before reveal
    setTimeout(() => {
      setWinner(result.winner);
      setPhase('done');
      if (result.win) {
        balance.credit(result.payout);
        sound.play('big-win');
        fireConfetti({
          count: 80,
          colors: ['#1fff7a', '#ffd166', '#ffffff'],
        });
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Race',
        bet,
        payout: result.payout,
        multiplier: result.multiplier,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(bet, result.payout, false);
      setBusy(false);
    }, 3400);
  }, [busy, picked, balance, bet, fairness, sound, history, session]);

  const reset = useCallback(() => {
    setPhase('idle');
    setWinner(null);
  }, []);

  // Per-horse animated progress: each horse advances at slightly different
  // speeds; the winner reaches 100% first.
  // Build per-horse keyframe targets so the chosen winner crosses first.
  const horseFinalProgress = (i: number): number => {
    if (phase === 'idle') return 0;
    if (phase === 'racing' && winner === null) return 100; // animating
    return winner === i ? 100 : 70 + (i * 7) % 25; // losers stop near 70-95%
  };
  const horseDuration = (i: number): number => {
    // Winner finishes around 3s; losers slightly slower
    if (winner === i) return 3.0;
    return 3.5 + (i * 0.3) % 0.6;
  };

  return (
    <OriginalPageLayout title="Race">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              {picked === null
                ? 'Pick a horse'
                : `Horse ${picked + 1} (${HORSE_NAMES[picked]}) · ${mult}× payout`}
            </div>
          )}
          {phase === 'racing' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-dim">Racing…</div>
          )}
          {phase === 'done' && winner !== null && (
            <div
              className={`font-mono font-bold text-lg ${
                winner === picked ? 'text-accent' : 'text-accent-hot'
              }`}
            >
              Horse {winner + 1} wins
              {winner === picked
                ? ` · +${fmtCurrency(profitOnWin)}`
                : ` · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* Track */}
        <div className="rounded-2xl bg-bg-card border border-edge p-3 space-y-2">
          {Array.from({ length: HORSE_COUNT }).map((_, i) => {
            const isPicked = picked === i;
            const isWinner = winner === i;
            const final = horseFinalProgress(i);
            return (
              <div
                key={i}
                className="relative h-10 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #15191f, #0e1218)',
                  border: isPicked ? `1px solid ${HORSE_COLORS[i]}` : '1px solid #2a3142',
                  boxShadow: isPicked
                    ? `0 0 8px ${HORSE_COLORS[i]}66, inset 0 1px 0 rgba(255,255,255,.06)`
                    : 'inset 0 1px 0 rgba(255,255,255,.04)',
                }}
              >
                {/* Finish line — proper b/w checkerboard pattern instead
                 *  of a thin grey bar, matching how real horse-race
                 *  finish lines are painted. */}
                <div
                  className="absolute right-1 top-0 bottom-0 w-1.5"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, #ffffff 0 4px, #1a1f29 4px 8px), repeating-linear-gradient(0deg, #1a1f29 0 4px, #ffffff 4px 8px)',
                    backgroundSize: '50% 100%, 50% 100%',
                    backgroundPosition: '0 0, 100% 0',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                {/* Lane label */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-ink-dim tabular-nums z-0">
                  {i + 1}
                </div>
                {/* Horse */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 text-2xl"
                  initial={{ left: '8%' }}
                  animate={{ left: `calc(${final}% - 18px)` }}
                  transition={{
                    duration: phase === 'racing' || phase === 'done' ? horseDuration(i) : 0,
                    ease: 'easeInOut',
                  }}
                  style={{
                    filter: isWinner
                      ? `drop-shadow(0 0 12px ${HORSE_COLORS[i]})`
                      : isPicked
                        ? `drop-shadow(0 0 6px ${HORSE_COLORS[i]}88)`
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,.6))',
                  }}
                >
                  🐎
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Pick + bet */}
        {phase !== 'racing' ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">Pick a Horse</div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: HORSE_COUNT }).map((_, i) => {
                  const horseMult = multiplierForHorse(i);
                  const odds = HORSE_WEIGHTS[i]!;
                  return (
                    <button
                      key={i}
                      onClick={() => setPicked(i)}
                      disabled={busy}
                      className="py-2 rounded-lg font-mono font-bold transition disabled:opacity-50 flex flex-col items-center justify-center"
                      style={{
                        background: picked === i ? HORSE_COLORS[i] : 'rgba(42,49,66,.4)',
                        color: picked === i ? '#0f1419' : '#9aa3b2',
                        border: picked === i ? '1px solid rgba(255,255,255,.4)' : '1px solid #2a3142',
                        boxShadow: picked === i ? `0 0 10px ${HORSE_COLORS[i]}77` : undefined,
                      }}
                    >
                      <span className="text-sm leading-none">{i + 1}</span>
                      <span
                        className="text-[9px] tabular-nums opacity-90"
                        style={{ color: picked === i ? 'rgba(15,20,25,.85)' : '#9aa3b2' }}
                      >
                        {horseMult}× · {odds}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <div className="flex justify-between text-xs">
              <span className="text-ink-mute">Profit on Win</span>
              <span className="font-mono font-semibold text-accent tabular-nums">{fmtCurrency(profitOnWin)}</span>
            </div>
            <button
              onClick={phase === 'done' ? () => { reset(); start(); } : start}
              disabled={busy || picked === null || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'done' ? 'Race Again' : `Race · ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center text-xs text-ink-dim">
            Cheering for Horse {(picked ?? 0) + 1}…
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}
