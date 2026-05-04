import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  MOVES,
  MOVE_EMOJI,
  type Move,
  type Outcome,
  WIN_PAYOUT,
  play,
} from './engine';

type Phase = 'idle' | 'reveal' | 'done';

const OUTCOME_TEXT: Record<Outcome, string> = {
  win: 'You win',
  tie: 'Tie · push',
  loss: 'You lose',
};

export function RpsGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [opponentMove, setOpponentMove] = useState<Move | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(
    (move: Move) => {
      if (busy) return;
      if (balance.balance < bet || bet <= 0) return;
      setBusy(true);
      setPlayerMove(move);
      setOpponentMove(null);
      setOutcome(null);
      sound.play('click');
      balance.debit(bet);
      setPhase('reveal');
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const r = play(rng, bet, move);
      // Suspense reveal — opponent's hand "shakes" then drops a move
      setTimeout(() => {
        setOpponentMove(r.opponent);
        setOutcome(r.outcome);
        setPhase('done');
        if (r.outcome === 'win') {
          balance.credit(r.payout);
          sound.play('big-win');
        } else if (r.outcome === 'tie') {
          balance.credit(r.payout); // refund
          sound.play('tick');
        } else {
          sound.play('drop');
        }
        history.record({
          game: 'RPS',
          bet,
          payout: r.payout,
          multiplier: r.multiplier,
          serverSeedHash: fairness.hash,
          clientSeed: seeds.clientSeed,
          nonce: seeds.nonce,
        });
        session.recordSpin(bet, r.payout, false);
        setBusy(false);
      }, 1100);
    },
    [busy, bet, balance, fairness, sound, history, session],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setPlayerMove(null);
    setOpponentMove(null);
    setOutcome(null);
  }, []);

  const profitOnWin = +(bet * WIN_PAYOUT - bet).toFixed(2);

  return (
    <OriginalPageLayout title="Rock Paper Scissors">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              Pick your move · {WIN_PAYOUT}× on win
            </div>
          )}
          {phase === 'reveal' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-dim">Revealing…</div>
          )}
          {phase === 'done' && outcome && (
            <div
              className={`font-mono font-bold text-lg ${
                outcome === 'win'
                  ? 'text-accent'
                  : outcome === 'tie'
                    ? 'text-ink-dim'
                    : 'text-accent-hot'
              }`}
            >
              {OUTCOME_TEXT[outcome]}
              {outcome === 'win' && ` · +${fmtCurrency(profitOnWin)}`}
              {outcome === 'loss' && ` · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* Arena — opponent (top) and player (bottom) */}
        <div className="rounded-2xl bg-bg-card border border-edge p-6 space-y-4">
          {/* Opponent */}
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1">Opponent</div>
            <AnimatePresence mode="wait">
              {opponentMove === null && phase === 'reveal' ? (
                <motion.div
                  key="shake"
                  className="text-7xl select-none inline-block"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotate: [0, -22, 22, -22, 22, -22, 22, 0],
                  }}
                  transition={{ duration: 1.0, ease: 'easeInOut' }}
                >
                  ✊
                </motion.div>
              ) : opponentMove ? (
                <motion.div
                  key={`opp-${opponentMove}`}
                  className="text-7xl select-none inline-block"
                  initial={{ scale: 0.4, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                  style={{
                    filter:
                      outcome === 'loss'
                        ? 'drop-shadow(0 0 16px rgba(255,61,139,.7))'
                        : outcome === 'win'
                          ? 'drop-shadow(0 0 12px rgba(255,255,255,.3)) grayscale(.4)'
                          : 'drop-shadow(0 4px 8px rgba(0,0,0,.5))',
                  }}
                >
                  {MOVE_EMOJI[opponentMove]}
                </motion.div>
              ) : (
                <div className="text-7xl select-none opacity-40">❔</div>
              )}
            </AnimatePresence>
          </div>

          {/* VS divider — coloured ring around "vs" reflects the round
           *  outcome so the player gets a glance-able win/loss/tie cue
           *  regardless of the emoji glow on the moves. */}
          <div className="text-center">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-full font-mono font-bold text-xs uppercase tracking-widest"
              style={{
                background:
                  outcome === 'win'
                    ? 'radial-gradient(circle, rgba(31,255,122,.25), transparent 75%)'
                    : outcome === 'loss'
                      ? 'radial-gradient(circle, rgba(255,61,139,.25), transparent 75%)'
                      : outcome === 'tie'
                        ? 'radial-gradient(circle, rgba(255,209,102,.18), transparent 75%)'
                        : 'transparent',
                border: outcome === 'win'
                  ? '1px solid rgba(31,255,122,.55)'
                  : outcome === 'loss'
                    ? '1px solid rgba(255,61,139,.55)'
                    : outcome === 'tie'
                      ? '1px solid rgba(255,209,102,.45)'
                      : '1px solid rgba(255,255,255,.08)',
                color:
                  outcome === 'win'
                    ? '#1fff7a'
                    : outcome === 'loss'
                      ? '#ff3d8b'
                      : outcome === 'tie'
                        ? '#ffd166'
                        : '#9aa3b2',
              }}
            >
              vs
            </span>
          </div>

          {/* Player */}
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1">You</div>
            {playerMove ? (
              <motion.div
                key={`you-${playerMove}`}
                className="text-7xl select-none inline-block"
                initial={{ scale: 0.4, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                style={{
                  filter:
                    outcome === 'win'
                      ? 'drop-shadow(0 0 16px rgba(31,255,122,.85))'
                      : outcome === 'loss'
                        ? 'drop-shadow(0 0 8px rgba(255,255,255,.2)) grayscale(.4)'
                        : 'drop-shadow(0 4px 8px rgba(0,0,0,.5))',
                }}
              >
                {MOVE_EMOJI[playerMove]}
              </motion.div>
            ) : (
              <div className="text-7xl select-none opacity-40">❔</div>
            )}
          </div>
        </div>

        {/* Bet + move pickers */}
        {phase === 'idle' || phase === 'done' ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <div className="flex justify-between text-xs">
              <span className="text-ink-mute">Profit on Win</span>
              <span className="font-mono font-semibold text-accent tabular-nums">
                {fmtCurrency(profitOnWin)}
              </span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">
                {phase === 'done' ? 'Play again' : 'Pick your move'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MOVES.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      if (phase === 'done') reset();
                      start(m);
                    }}
                    disabled={busy || balance.balance < bet || bet <= 0}
                    className="py-3 rounded-xl bg-bg-elev border border-edge font-bold text-3xl transition disabled:opacity-50 hover:border-accent hover:bg-accent/10 active:scale-95"
                  >
                    {MOVE_EMOJI[m]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center text-xs text-ink-dim">
            Watching the throw…
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}
