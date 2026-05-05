import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  GRID_SIZE,
  type MinesRoundState,
  cashOut,
  multiplierFor,
  reveal,
  startRound,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

/** Stake-style Mines: 5×5 grid, choose mine count, reveal safe gems one at
 *  a time, cash out before hitting a mine. */
export function MinesGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [mineCount, setMineCount] = useState(3);
  const [round, setRound] = useState<MinesRoundState | null>(null);
  const [busyClick, setBusyClick] = useState(false);

  const inGame = round !== null && !round.done;
  const picks = round?.revealed.size ?? 0;
  const currentMult = useMemo(() => multiplierFor(picks, mineCount), [picks, mineCount]);
  const nextMult = useMemo(() => multiplierFor(picks + 1, mineCount), [picks, mineCount]);
  const cashoutAmount = round ? +(round.bet * currentMult).toFixed(2) : 0;

  const start = useCallback(() => {
    if (round && !round.done) return;
    if (balance.balance < bet || bet <= 0) return;
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    setRound(startRound(rng, bet, mineCount));
  }, [balance, bet, mineCount, round, fairness, sound]);

  const onTile = useCallback((idx: number) => {
    if (!round || round.done || round.revealed.has(idx) || busyClick) return;
    setBusyClick(true);
    const next = reveal(round, idx);
    setRound(next);
    if (next.hitMine) {
      sound.play('drop');
      // Reveal all mines briefly
      setTimeout(() => {
        history.record({
          game: 'Mines',
          bet: round.bet,
          payout: 0,
          multiplier: 0,
          serverSeedHash: fairness.hash,
          clientSeed: '',
          nonce: 0,
        });
        session.recordSpin(round.bet, 0, false);
      }, 100);
    } else {
      sound.play('win');
    }
    setTimeout(() => setBusyClick(false), 100);
  }, [round, busyClick, sound, history, fairness, session]);

  const doCashOut = useCallback(() => {
    if (!round || round.done || round.revealed.size === 0) return;
    // Tier SFX with cash-out multiplier — Mines with 20+ mines can
    // chain to 100×+ with the right risk; flat 'big-win' sounded the
    // same as a 1.05× safety hop. Now ≥10× = mega.
    sound.play(currentMult >= 10 ? 'mega-win' : 'big-win');
    const next = cashOut(round);
    setRound(next);
    balance.credit(next.payout);
    // Confetti scaled to multiplier — small for low cashouts, big for
    // brave 20×+ holdouts.
    if (currentMult >= 1.5) {
      fireConfetti({
        count: currentMult >= 20 ? 130 : currentMult >= 5 ? 80 : 50,
        colors: ['#1fff7a', '#ffd166', '#22d3ee', '#ffffff'],
      });
    }
    history.record({
      game: 'Mines',
      bet: round.bet,
      payout: next.payout,
      multiplier: currentMult,
      serverSeedHash: fairness.hash,
      clientSeed: '',
      nonce: 0,
    });
    session.recordSpin(round.bet, next.payout, false);
  }, [round, balance, sound, history, fairness, session, currentMult]);

  const reset = useCallback(() => setRound(null), []);

  /** Pick a random unrevealed tile — Stake's "?" button. */
  const pickRandom = useCallback(() => {
    if (!round || round.done) return;
    const remaining: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      if (!round.revealed.has(i)) remaining.push(i);
    }
    if (remaining.length === 0) return;
    const idx = remaining[Math.floor(Math.random() * remaining.length)]!;
    onTile(idx);
  }, [round, onTile]);

  return (
    <OriginalPageLayout title="Mines">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center">
          <AnimatePresence mode="wait">
            {!round || round.done ? (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                  {round?.hitMine ? 'Boom — try again' : round?.done ? 'Cashed out' : 'Set your bet & mines'}
                </div>
                {round?.done && (
                  <div className={`font-mono font-bold text-2xl mt-1 tabular-nums ${
                    round.hitMine ? 'text-accent-hot' : 'text-accent'
                  }`}>
                    {round.hitMine ? `-${fmtCurrency(round.bet)}` : `+${fmtCurrency(round.payout - round.bet)}`}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="ingame" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">Current Multiplier</div>
                <div className="font-mono font-bold text-3xl text-accent tabular-nums leading-none mt-1"
                     style={{ textShadow: '0 0 18px rgba(31,255,122,.6)' }}>
                  {fmtMultiplier(currentMult)}
                </div>
                <div className="text-[10px] text-ink-dim mt-1">
                  {picks} safe · cash out for <span className="text-accent">{fmtCurrency(cashoutAmount)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Grid — shakes briefly when the player hits a mine. The
         *  shake-medium class fires a single 0.55s wobble cycle; React
         *  swaps it off when the round resets so it can re-trigger on
         *  the next loss. */}
        <div
          className={`rounded-2xl bg-bg-card border border-edge p-3 ${round?.done && round.hitMine ? 'shake-medium' : ''}`}
        >
          <div className="grid grid-cols-5 gap-1.5 aspect-square">
            {Array.from({ length: GRID_SIZE }).map((_, i) => {
              const isRevealed = round?.revealed.has(i) ?? false;
              const isMine = round?.mineSet.has(i) ?? false;
              const showMine = round?.done && isMine;
              const safeRevealed = isRevealed && !isMine;
              const lostHit = round?.done && round.hitMine && isRevealed && isMine;
              return (
                <button
                  key={i}
                  onClick={() => onTile(i)}
                  disabled={!inGame || isRevealed}
                  className="relative rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-150 active:scale-95"
                  style={{
                    background: safeRevealed
                      ? 'linear-gradient(180deg, rgba(31,255,122,.2), rgba(31,255,122,.05))'
                      : showMine
                        ? lostHit
                          ? 'linear-gradient(180deg, rgba(255,61,139,.45), rgba(255,61,139,.15))'
                          : 'linear-gradient(180deg, rgba(255,61,139,.18), rgba(255,61,139,.05))'
                        : 'linear-gradient(180deg, #1a1f29, #15191f)',
                    border: safeRevealed
                      ? '1px solid rgba(31,255,122,.5)'
                      : showMine
                        ? '1px solid rgba(255,61,139,.5)'
                        : '1px solid #2a3142',
                    boxShadow: safeRevealed
                      ? '0 0 12px rgba(31,255,122,.3), inset 0 1px 0 rgba(31,255,122,.4)'
                      : lostHit
                        ? '0 0 18px rgba(255,61,139,.7), inset 0 1px 0 rgba(255,61,139,.5)'
                        : 'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 6px rgba(0,0,0,.3)',
                  }}
                >
                  <AnimatePresence>
                    {safeRevealed && (
                      <motion.span
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(31,255,122,.7))' }}
                      >
                        💎
                      </motion.span>
                    )}
                    {showMine && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 14, delay: lostHit ? 0 : Math.random() * 0.3 }}
                        style={{ filter: lostHit ? 'drop-shadow(0 0 12px rgba(255,61,139,.95))' : undefined }}
                      >
                        💣
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        {!inGame ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-widest text-ink-mute">Mines</span>
                <span className="font-mono font-semibold text-sm text-ink tabular-nums">{mineCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={mineCount}
                onChange={(e) => setMineCount(parseInt(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {[1, 3, 5, 10, 24].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMineCount(n)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      mineCount === n ? 'bg-accent text-bg' : 'bg-bg-elev border border-edge text-ink-dim'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={round?.done ? reset : start}
              disabled={!round?.done && (balance.balance < bet || bet <= 0)}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {round?.done ? 'Play Again' : `Bet ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Mines" value={`${mineCount}`} />
              <Stat label="Total Profit" value={fmtCurrency(cashoutAmount - round!.bet)} highlight />
              <Stat label="Next Pick" value={picks + 1 <= GRID_SIZE - mineCount ? fmtMultiplier(nextMult) : '—'} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={pickRandom}
                disabled={busyClick}
                className="flex-shrink-0 px-4 py-3.5 rounded-xl bg-bg-elev border border-edge text-ink hover:bg-bg-hover font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.97]"
                title="Pick a random unrevealed tile"
              >
                Pick Random
              </button>
              <button
                onClick={doCashOut}
                disabled={picks === 0}
                className="flex-1 py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                {picks === 0 ? 'Pick a tile to start' : `Cash Out ${fmtCurrency(cashoutAmount)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-bg-elev border border-edge p-2.5 text-center">
      <div className="text-[10px] uppercase tracking-widest text-ink-mute">{label}</div>
      <div
        className={`font-mono font-bold text-sm mt-0.5 tabular-nums ${
          highlight ? 'text-accent' : 'text-ink'
        }`}
        style={highlight ? { textShadow: '0 0 8px rgba(31,255,122,.45)' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
