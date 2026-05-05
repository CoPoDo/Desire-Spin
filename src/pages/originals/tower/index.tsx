import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  ROWS,
  type Difficulty,
  type TowerRound,
  cashOut,
  configFor,
  multiplierAt,
  pickTile,
  startRound,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert', 'master'];

export function TowerGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [round, setRound] = useState<TowerRound | null>(null);

  const cfg = configFor(difficulty);
  const inGame = round !== null && !round.done;
  const currentMult = round ? multiplierAt(round.difficulty, round.step) : 1;
  const nextMult = round ? multiplierAt(round.difficulty, round.step + 1) : 1;
  const cashoutAmount = round ? +(round.bet * currentMult).toFixed(2) : 0;

  const start = useCallback(() => {
    if (round && !round.done) return;
    if (balance.balance < bet || bet <= 0) return;
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    setRound(startRound(rng, bet, difficulty));
  }, [round, balance, bet, difficulty, fairness, sound]);

  const onTile = useCallback(
    (row: number, tile: number) => {
      if (!round || round.done || row !== round.step) return;
      const next = pickTile(round, tile);
      setRound(next);
      if (next.hitSkull) {
        sound.play('drop');
        history.record({
          game: 'Tower',
          bet: round.bet,
          payout: 0,
          multiplier: 0,
          serverSeedHash: fairness.hash,
          clientSeed: '',
          nonce: 0,
        });
        session.recordSpin(round.bet, 0, false);
      } else if (next.done) {
        // Topped out
        balance.credit(next.payout);
        sound.play('mega-win');
        history.record({
          game: 'Tower',
          bet: round.bet,
          payout: next.payout,
          multiplier: multiplierAt(round.difficulty, ROWS),
          serverSeedHash: fairness.hash,
          clientSeed: '',
          nonce: 0,
        });
        session.recordSpin(round.bet, next.payout, false);
      } else {
        sound.play('win');
      }
    },
    [round, balance, fairness, history, session, sound],
  );

  const doCashOut = useCallback(() => {
    if (!round || round.done || round.step === 0) return;
    // Tier SFX with cash-out multiplier — Hardcore mode can chain to
    // 100×+, Easy peaks at ~10×; flat 'big-win' sounded the same for
    // both. Now ≥10× = mega, otherwise big.
    sound.play(currentMult >= 10 ? 'mega-win' : 'big-win');
    const next = cashOut(round);
    setRound(next);
    balance.credit(next.payout);
    if (currentMult >= 1.5) {
      fireConfetti({
        count: currentMult >= 50 ? 130 : currentMult >= 10 ? 80 : 50,
      });
    }
    history.record({
      game: 'Tower',
      bet: round.bet,
      payout: next.payout,
      multiplier: currentMult,
      serverSeedHash: fairness.hash,
      clientSeed: '',
      nonce: 0,
    });
    session.recordSpin(round.bet, next.payout, false);
  }, [round, balance, currentMult, fairness, history, session, sound]);

  const reset = useCallback(() => setRound(null), []);

  return (
    <OriginalPageLayout title="Tower">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-2xl bg-bg-card border border-edge p-3 text-center">
          {!round || round.done ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                {round?.hitSkull
                  ? 'You hit a skull'
                  : round?.done
                    ? round.step >= ROWS
                      ? 'Reached the top!'
                      : 'Cashed out'
                    : 'Set bet & difficulty'}
              </div>
              {round?.done && (
                <div
                  className={`font-mono font-bold text-2xl mt-1 tabular-nums ${
                    round.hitSkull ? 'text-accent-hot' : 'text-accent'
                  }`}
                >
                  {round.hitSkull
                    ? `-${fmtCurrency(round.bet)}`
                    : `+${fmtCurrency(round.payout - round.bet)}`}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute">Multiplier</div>
              <div
                className="font-mono font-bold text-3xl text-accent tabular-nums leading-none mt-1"
                style={{ textShadow: '0 0 18px rgba(31,255,122,.6)' }}
              >
                {fmtMultiplier(currentMult)}
              </div>
              <div className="text-[10px] text-ink-dim mt-1">
                Row {round.step + 1} / {ROWS} · cash out{' '}
                <span className="text-accent">{fmtCurrency(cashoutAmount)}</span>
              </div>
            </>
          )}
        </div>

        {/* Tower grid (top → bottom, current row highlighted) */}
        {/* Tower grid — shakes when the player picks a skull tile.
         *  Same shake-medium utility used by Mines for consistency. */}
        <div
          className={`rounded-2xl bg-bg-card border border-edge p-3 ${round?.done && round.hitSkull ? 'shake-medium' : ''}`}
        >
          <div className="flex flex-col-reverse gap-1">
            {Array.from({ length: ROWS }).map((_, rowIdx) => {
              const tiles = cfg.tiles;
              const isActive = round && !round.done && round.step === rowIdx;
              const isCompleted = round && rowIdx < round.step;
              const isFuture = round && rowIdx > round.step && !round.done;
              const isLost = round?.done && round.hitSkull && rowIdx === round.step;
              const skulls = round?.skulls[rowIdx] ?? [];
              const playerPick = round?.picks[rowIdx];
              return (
                <div key={rowIdx} className="flex gap-1">
                  {Array.from({ length: tiles }).map((_, tile) => {
                    const isSkull = skulls.includes(tile);
                    const isPicked = playerPick === tile;
                    const reveal = round?.done || isCompleted;
                    const showSkull = reveal && isSkull;
                    const showSafe = reveal && !isSkull && (isCompleted || (round?.done && !round.hitSkull));
                    return (
                      <button
                        key={tile}
                        onClick={() => onTile(rowIdx, tile)}
                        disabled={!isActive}
                        className="flex-1 aspect-[2/1] rounded-lg flex items-center justify-center text-lg font-bold transition-all active:scale-95"
                        style={{
                          background: isLost && isPicked
                            ? 'linear-gradient(180deg, rgba(255,61,139,.5), rgba(255,61,139,.18))'
                            : showSkull
                              ? 'linear-gradient(180deg, rgba(255,61,139,.18), rgba(255,61,139,.05))'
                              : showSafe
                                ? 'linear-gradient(180deg, rgba(31,255,122,.2), rgba(31,255,122,.05))'
                                : isActive
                                  ? 'linear-gradient(180deg, #2a3142, #1f2530)'
                                  : isFuture
                                    ? 'linear-gradient(180deg, #15191f, #0e1218)'
                                    : 'linear-gradient(180deg, #1a1f29, #15191f)',
                          border: isActive ? '1px solid rgba(31,255,122,.4)' : showSkull ? '1px solid rgba(255,61,139,.5)' : showSafe ? '1px solid rgba(31,255,122,.5)' : '1px solid #2a3142',
                          boxShadow:
                            isActive ? '0 0 12px rgba(31,255,122,.25), inset 0 1px 0 rgba(31,255,122,.2)' :
                            isLost && isPicked ? '0 0 18px rgba(255,61,139,.7)' :
                            showSafe ? '0 0 8px rgba(31,255,122,.25)' :
                            'inset 0 1px 0 rgba(255,255,255,.04)',
                          opacity: isFuture ? 0.5 : 1,
                        }}
                      >
                        <AnimatePresence>
                          {showSkull && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>💀</motion.span>
                          )}
                          {showSafe && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>💎</motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        {!inGame ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">Difficulty</div>
              <div className="grid grid-cols-5 gap-1">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                      difficulty === d
                        ? 'bg-accent text-bg'
                        : 'bg-bg-elev border border-edge text-ink-dim hover:text-ink'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 text-[10px] text-ink-mute">
                {configFor(difficulty).tiles - configFor(difficulty).deaths} safe of {configFor(difficulty).tiles} per row
              </div>
            </div>
            <button
              onClick={round?.done ? () => { reset(); start(); } : start}
              disabled={balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {round?.done ? 'Play Again' : `Bet ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-bg-elev border border-edge p-2 text-center">
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">Next Row</div>
                <div className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums">{fmtMultiplier(nextMult)}</div>
              </div>
              <div className="rounded-lg bg-bg-elev border border-edge p-2 text-center">
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">Skulls / Row</div>
                <div className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums">{cfg.deaths}</div>
              </div>
            </div>
            <button
              onClick={doCashOut}
              disabled={round.step === 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {round.step === 0 ? 'Pick a tile to start climbing' : `Cash Out · ${fmtCurrency(cashoutAmount)}`}
            </button>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}
