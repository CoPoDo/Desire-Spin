import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
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
  const { balance, sound } = useGame();
  const [bet, setBet] = usePersistedBet('tower', 1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [round, setRound, roundRef] = useRoundState<TowerRound | null>(null);
  const { begin, settle, onLeave, error } = useInteractiveRound('Dragon Tower');

  const cfg = configFor(round?.difficulty ?? difficulty);
  const inGame = round !== null && !round.done;
  const currentMult = round ? multiplierAt(round.difficulty, round.step) : 1;
  const nextMult = round ? multiplierAt(round.difficulty, round.step + 1) : 1;
  const cashoutAmount = round ? +(round.bet * currentMult).toFixed(2) : 0;

  onLeave.current = (updateView = false) => {
    const current = roundRef.current;
    if (!current) return 0;
    const next = current.done ? current : current.step ? cashOut(current) : { ...current, done: true, payout: current.bet };
    if (updateView) setRound(next);
    return next.payout;
  };

  const start = useCallback(() => {
    if (roundRef.current && !roundRef.current.done) return;
    const entry = begin(bet);
    if (!entry) return;
    sound.play('click');
    setRound(startRound(entry.rng, entry.bet, difficulty));
  }, [roundRef, begin, bet, difficulty, sound, setRound]);

  const onTile = useCallback((row: number, tile: number) => {
    const current = roundRef.current;
    if (!current || current.done || row !== current.step) return;
    const next = pickTile(current, tile);
    if (next === current) return;
    setRound(next);
    if (next.done) settle(next.payout);
    sound.play(next.hitSkull ? 'drop' : next.done ? 'mega-win' : next.step >= 4 ? 'big-win' : 'win');
  }, [roundRef, setRound, settle, sound]);

  const doCashOut = useCallback(() => {
    const current = roundRef.current;
    if (!current || current.done || current.step === 0) return;
    const next = cashOut(current);
    setRound(next);
    if (!settle(next.payout)) return;
    const mult = multiplierAt(current.difficulty, current.step);
    sound.play(mult >= 10 ? 'mega-win' : 'big-win');
    if (mult >= 1.5) fireConfetti({ count: mult >= 50 ? 100 : 50 });
  }, [roundRef, setRound, settle, sound]);

  const reset = useCallback(() => {
    if (roundRef.current?.done) setRound(null);
  }, [roundRef, setRound]);

  /** Pick a random tile on the current row — matches Mines's "?"
   *  button. Useful for autopilot-style play or when you can't decide. */
  const pickRandom = useCallback(() => {
    if (!round || round.done) return;
    const tile = Math.floor(Math.random() * cfg.tiles);
    onTile(round.step, tile);
  }, [round, cfg.tiles, onTile]);

  // Keyboard shortcuts:
  //   1-4 → pick that-numbered tile in the current row (if valid)
  //   R   → pick random
  //   Space → cash out (or start round if idle)
  useHotkey('1', () => { if (round && !round.done && 0 < cfg.tiles) onTile(round.step, 0); }, true);
  useHotkey('2', () => { if (round && !round.done && 1 < cfg.tiles) onTile(round.step, 1); }, true);
  useHotkey('3', () => { if (round && !round.done && 2 < cfg.tiles) onTile(round.step, 2); }, true);
  useHotkey('4', () => { if (round && !round.done && 3 < cfg.tiles) onTile(round.step, 3); }, true);
  useHotkey('r', () => pickRandom(), true);
  useHotkey('R', () => pickRandom(), true);
  useHotkey(' ', () => {
    if (!round || round.done) {
      start();
    } else if (round.step > 0) {
      doCashOut();
    }
  }, true);

  return (
    <OriginalPageLayout title="Dragon Tower">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {error && <p role="alert" className="text-stake-red text-sm text-center">{error}</p>}
        {/* Status */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-3 text-center">
          {!round || round.done ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-stake-muted">
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
                    round.hitSkull ? 'text-stake-red' : 'text-stake-green'
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
              <div className="text-[10px] uppercase tracking-widest text-stake-muted">Multiplier</div>
              <div
                className="font-mono font-bold text-3xl text-stake-green tabular-nums leading-none mt-1"
                style={{ textShadow: '0 0 18px rgba(0,231,1,.6)' }}
              >
                {fmtMultiplier(currentMult)}
              </div>
              <div className="text-[10px] text-stake-muted mt-1">
                Row {round.step + 1} / {ROWS} · cash out{' '}
                <span className="text-stake-green">{fmtCurrency(cashoutAmount)}</span>
              </div>
            </>
          )}
        </div>

        {/* Tower grid (top → bottom, current row highlighted) */}
        {/* Tower grid — shakes when the player picks a skull tile.
         *  Same shake-medium utility used by Mines for consistency. */}
        <div
          className={`rounded-lg bg-stake-card border border-stake-border p-3 ${round?.done && round.hitSkull ? 'shake-medium' : ''}`}
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
                        aria-label={`Row ${rowIdx + 1}, tile ${tile + 1}${showSkull ? ': skull' : showSafe ? ': safe' : ''}`}
                        onClick={() => onTile(rowIdx, tile)}
                        disabled={!isActive}
                        className="flex-1 aspect-[2/1] rounded-lg flex items-center justify-center text-lg font-bold transition-all active:scale-95"
                        style={{
                          background: isLost && isPicked
                            ? 'linear-gradient(180deg, rgba(237,65,99,.5), rgba(237,65,99,.18))'
                            : showSkull
                              ? 'linear-gradient(180deg, rgba(237,65,99,.18), rgba(237,65,99,.05))'
                              : showSafe
                                ? 'linear-gradient(180deg, rgba(0,231,1,.2), rgba(0,231,1,.05))'
                                : isActive
                                  ? 'linear-gradient(180deg, #2a3142, #1f2530)'
                                  : isFuture
                                    ? 'linear-gradient(180deg, #15191f, #0e1218)'
                                    : 'linear-gradient(180deg, #1a1f29, #15191f)',
                          border: isActive ? '1px solid rgba(0,231,1,.4)' : showSkull ? '1px solid rgba(237,65,99,.5)' : showSafe ? '1px solid rgba(0,231,1,.5)' : '1px solid #2a3142',
                          boxShadow:
                            isActive ? '0 0 12px rgba(0,231,1,.25), inset 0 1px 0 rgba(0,231,1,.2)' :
                            isLost && isPicked ? '0 0 18px rgba(237,65,99,.7)' :
                            showSafe ? '0 0 8px rgba(0,231,1,.25)' :
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

        <p className="text-[11px] text-stake-muted text-center">Leaving cashes out completed rows. A bet with no tile picked is returned.</p>

        {/* Controls */}
        {!inGame ? (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1.5">Difficulty</div>
              <div className="grid grid-cols-5 gap-1">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
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
                {configFor(difficulty).tiles - configFor(difficulty).deaths} safe of {configFor(difficulty).tiles} per row
              </div>
            </div>
            <button
              onClick={round?.done ? () => { reset(); start(); } : start}
              disabled={balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {round?.done ? 'Play Again' : `Bet ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-stake-input border border-stake-border p-2 text-center">
                <div className="text-[10px] uppercase tracking-widest text-stake-muted">Next Row</div>
                <div className="font-mono font-bold text-base text-stake-text mt-0.5 tabular-nums">{fmtMultiplier(nextMult)}</div>
              </div>
              <div className="rounded-lg bg-stake-input border border-stake-border p-2 text-center">
                <div className="text-[10px] uppercase tracking-widest text-stake-muted">Skulls / Row</div>
                <div className="font-mono font-bold text-base text-stake-text mt-0.5 tabular-nums">{cfg.deaths}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={pickRandom}
                className="flex-shrink-0 px-4 py-3 rounded-xl bg-stake-input border border-stake-border text-stake-text hover:bg-stake-panel font-bold text-sm uppercase tracking-wider transition active:scale-[0.97]"
                title="Pick a random tile in the current row"
              >
                Pick Random
              </button>
              <button
                onClick={doCashOut}
                disabled={round.step === 0}
                className="flex-1 py-3 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                {round.step === 0 ? 'Pick a tile to start climbing' : `Cash Out · ${fmtCurrency(cashoutAmount)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}
