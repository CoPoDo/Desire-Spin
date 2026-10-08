import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  AutoConfigFields,
  AutoProgressDisplay,
  ManualAutoTabs,
  type AutoConfig,
  type Mode,
  useAutoBetRunner,
} from '../_shared/AutoBetController';
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
 *  a time, cash out before hitting a mine. Auto mode randomly picks N
 *  tiles per round (player pre-selects how many) and cashes out — mirrors
 *  real Stake Mines' Auto mode. */
export function MinesGame() {
  const { balance, sound } = useGame();
  const [bet, setBet] = usePersistedBet('mines', 1);
  const [mineCount, setMineCount] = useState(3);
  const [round, setRound, roundRef] = useRoundState<MinesRoundState | null>(null);
  const [busyClick, setBusyClick, busyRef] = useRoundState(false);
  const { begin, settle, delay, onLeave, mounted, error } = useInteractiveRound('Mines');

  // Auto mode
  const [mode, setMode] = useState<Mode>('manual');
  const [tilesToReveal, setTilesToReveal] = useState(3);
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  /** When auto-bet is running we stage the displayed grid through
   *  setRound and need to highlight reveals briefly between rounds.
   *  Refs let the playOnce closure read latest values without
   *  re-creating it on every state change. */
  const stateRef = useRef({ bet, mineCount, tilesToReveal });
  stateRef.current = { bet, mineCount, tilesToReveal };

  const inGame = round !== null && !round.done;
  const picks = round?.revealed.size ?? 0;
  const currentMult = useMemo(() => multiplierFor(picks, round?.mineCount ?? mineCount), [picks, round?.mineCount, mineCount]);
  const nextMult = useMemo(() => multiplierFor(picks + 1, round?.mineCount ?? mineCount), [picks, round?.mineCount, mineCount]);
  const cashoutAmount = round ? +(round.bet * currentMult).toFixed(2) : 0;

  // Max possible tiles to pick before all safe spots are gone.
  const maxTiles = GRID_SIZE - mineCount;
  // Leaving cashes out safe picks, or returns an untouched wager.
  onLeave.current = (updateView = false) => {
    const current = roundRef.current;
    if (!current) return 0;
    const next = current.done ? current : current.revealed.size ? cashOut(current) : { ...current, done: true, payout: current.bet };
    if (updateView) setRound(next);
    return next.payout;
  };

  const showResult = useCallback((next: MinesRoundState) => {
    setRound(next);
    if (next.done) {
      settle(next.payout);
      sound.play(next.hitMine ? 'drop' : 'big-win');
    } else sound.play('win');
  }, [setRound, settle, sound]);

  const start = useCallback(() => {
    if (busyRef.current || (roundRef.current && !roundRef.current.done)) return;
    const entry = begin(bet);
    if (!entry) return;
    setRound(startRound(entry.rng, entry.bet, mineCount));
    setBusyClick(true);
    delay(() => setBusyClick(false), 100);
    sound.play('click');
  }, [begin, bet, mineCount, roundRef, busyRef, setRound, setBusyClick, delay, sound]);

  const onTile = useCallback((idx: number) => {
    if (busyRef.current || autoActive || mode !== 'manual') return;
    let current = roundRef.current;
    if (!current || current.done) {
      const entry = begin(bet);
      if (!entry) return;
      current = startRound(entry.rng, entry.bet, mineCount);
    }
    const next = reveal(current, idx);
    if (next === current) return;
    setBusyClick(true);
    showResult(next);
    delay(() => setBusyClick(false), 100);
  }, [autoActive, mode, roundRef, busyRef, begin, bet, mineCount, setBusyClick, showResult, delay]);

  const doCashOut = useCallback(() => {
    const current = roundRef.current;
    if (busyRef.current || autoActive || !current || current.done || !current.revealed.size) return;
    const next = cashOut(current);
    showResult(next);
    const mult = multiplierFor(current.revealed.size, current.mineCount);
    if (mult >= 1.5) fireConfetti({ count: mult >= 20 ? 100 : 50 });
  }, [roundRef, busyRef, autoActive, showResult]);

  const reset = useCallback(() => {
    if (!busyRef.current && roundRef.current?.done) setRound(null);
  }, [roundRef, busyRef, setRound]);

  const pickRandom = useCallback(() => {
    const current = roundRef.current;
    if (!current || current.done) return;
    const remaining = Array.from({ length: GRID_SIZE }, (_, i) => i).filter(i => !current.revealed.has(i));
    if (remaining.length) onTile(remaining[Math.floor(Math.random() * remaining.length)]!);
  }, [roundRef, onTile]);

  const playOneAutoRound = useCallback(async (): Promise<number | null> => {
    const { bet: b, mineCount: m, tilesToReveal: k } = stateRef.current;
    const cappedK = Math.min(k, GRID_SIZE - m);
    if (cappedK < 1 || !mounted.current) return null;
    const entry = begin(b);
    if (!entry) return null;
    let current = startRound(entry.rng, entry.bet, m);
    // The automatic policy is known up front. Settle it before cosmetic delay,
    // so stopping or leaving cannot cancel a loss or duplicate a win.
    const order = Array.from({ length: GRID_SIZE }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    for (let n = 0; n < cappedK && !current.done; n++) current = reveal(current, order[n]!);
    if (!current.done) current = cashOut(current);
    showResult(current);
    await new Promise<void>(resolve => setTimeout(resolve, 400));
    return current.payout - entry.bet;
  }, [begin, mounted, showResult]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 0,
    runOnce: playOneAutoRound,
    onStop: () => setAutoActive(false),
  });

  // Space-to-cashout — only when a round is in progress. Outside a
  // round Space would be ambiguous (which tile?). Real Stake binds
  // Space to "Cash Out" mid-round.
  useHotkey(' ', () => {
    if (inGame && picks > 0) doCashOut();
  }, mode === 'manual');

  return (
    <OriginalPageLayout title="Mines">
      <div className="flex flex-col p-3 gap-3 max-w-md mx-auto w-full">
        {error && <p role="alert" className="text-stake-red text-sm text-center">{error}</p>}
        {/* Status */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4 text-center">
          <AnimatePresence mode="wait">
            {!round || round.done ? (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-xs text-stake-muted">
                  {round?.hitMine ? 'Boom — tap a tile to play again'
                    : round?.done ? 'Cashed out — tap a tile for next round'
                    : autoActive ? 'Auto-bet running' : 'Tap any tile to start'}
                </div>
                {round?.done && (
                  <div className={`font-mono font-bold text-2xl mt-1 tabular-nums ${
                    round.hitMine ? 'text-stake-red' : 'text-stake-green'
                  }`}>
                    {round.hitMine ? `-${fmtCurrency(round.bet)}` : `+${fmtCurrency(round.payout - round.bet)}`}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="ingame" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="text-xs text-stake-muted">Current Multiplier</div>
                <div className="font-mono font-bold text-3xl text-stake-green tabular-nums leading-none mt-1"
                     style={{ textShadow: '0 0 18px rgba(0,231,1,.55)' }}>
                  {fmtMultiplier(currentMult)}
                </div>
                <div className="text-[11px] text-stake-muted mt-1">
                  {picks} safe · cash out for <span className="text-stake-green">{fmtCurrency(cashoutAmount)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Grid — shakes briefly when the player hits a mine. */}
        <div
          className={`rounded-lg bg-stake-card border border-stake-border p-3 ${round?.done && round.hitMine ? 'shake-medium' : ''}`}
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
                  aria-label={`Tile ${i + 1}: ${safeRevealed ? 'gem' : showMine ? 'mine' : 'unrevealed'}`}
                  onClick={() => onTile(i)}
                  // Tiles are interactive any time there's no in-progress
                  // round (so a click on an idle tile starts the round)
                  // OR the round is in-progress and the tile hasn't been
                  // revealed yet. Auto-bet locks tiles to prevent the
                  // player from mid-fight clicking through the random
                  // picks.
                  disabled={
                    autoActive || mode === 'auto' || busyClick ? true :
                    inGame ? isRevealed : balance.balance < bet || bet <= 0
                  }
                  className="relative rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-150 active:scale-95"
                  style={{
                    background: safeRevealed
                      ? 'linear-gradient(180deg, rgba(0,231,1,.2), rgba(0,231,1,.05))'
                      : showMine
                        ? lostHit
                          ? 'linear-gradient(180deg, rgba(237,65,99,.45), rgba(237,65,99,.15))'
                          : 'linear-gradient(180deg, rgba(237,65,99,.18), rgba(237,65,99,.05))'
                        : 'linear-gradient(180deg, #2f4553, #213743)',
                    border: safeRevealed
                      ? '1px solid rgba(0,231,1,.5)'
                      : showMine
                        ? '1px solid rgba(237,65,99,.5)'
                        : '1px solid #3d5564',
                    boxShadow: safeRevealed
                      ? '0 0 12px rgba(0,231,1,.3), inset 0 1px 0 rgba(0,231,1,.35)'
                      : lostHit
                        ? '0 0 18px rgba(237,65,99,.7), inset 0 1px 0 rgba(237,65,99,.5)'
                        : 'inset 0 1px 0 rgba(255,255,255,.06), 0 2px 6px rgba(0,0,0,.3)',
                  }}
                >
                  <AnimatePresence>
                    {safeRevealed && (
                      <motion.span
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(0,231,1,.7))' }}
                      >
                        💎
                      </motion.span>
                    )}
                    {showMine && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 14, delay: lostHit ? 0 : (i % 5) * 0.06 }}
                        style={{ filter: lostHit ? 'drop-shadow(0 0 12px rgba(237,65,99,.95))' : undefined }}
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

        <p className="text-[11px] text-stake-muted text-center">Leaving cashes out safe picks. An untouched bet is returned. Auto rounds finish once started.</p>

        {/* Controls */}
        <div className="rounded-lg bg-stake-panel border border-stake-border p-3 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || inGame} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || inGame} />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-stake-muted">Mines</span>
              <span className="font-mono font-semibold text-sm text-stake-text tabular-nums">{mineCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              value={mineCount}
              disabled={autoActive || inGame}
              onChange={(e) => setMineCount(parseInt(e.target.value))}
              className="dice-slider w-full appearance-none bg-stake-bg rounded-full h-2 cursor-pointer disabled:opacity-50"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {[1, 3, 5, 10, 24].map((n) => (
                <button
                  key={n}
                  onClick={() => setMineCount(n)}
                  disabled={autoActive || inGame}
                  className={`px-2.5 py-1 rounded text-xs font-semibold disabled:opacity-50 ${
                    mineCount === n ? 'bg-stake-green text-stake-bg' : 'bg-stake-input border border-stake-border text-stake-muted hover:text-stake-text'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {mode === 'auto' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-stake-muted">Tiles to Reveal per Round</span>
                  <span className="font-mono font-semibold text-sm text-stake-text tabular-nums">{Math.min(tilesToReveal, maxTiles)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, maxTiles)}
                  value={Math.min(tilesToReveal, maxTiles)}
                  disabled={autoActive}
                  onChange={(e) => setTilesToReveal(parseInt(e.target.value))}
                  className="dice-slider w-full appearance-none bg-stake-bg rounded-full h-2 cursor-pointer disabled:opacity-50"
                />
                <div className="text-[11px] text-stake-dim mt-1.5">
                  Each round picks {Math.min(tilesToReveal, maxTiles)} random tile{tilesToReveal === 1 ? '' : 's'}. If any hits a mine, you bust. Otherwise cashes out at {fmtMultiplier(multiplierFor(Math.min(tilesToReveal, maxTiles), mineCount))}.
                </div>
              </div>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
              <button
                onClick={() => { if (!busyRef.current && !(roundRef.current && !roundRef.current.done)) setAutoActive((a) => !a); }}
                disabled={!autoActive && (balance.balance < bet || bet <= 0 || inGame)}
                className={`w-full py-3.5 rounded font-bold text-sm disabled:opacity-50 transition active:scale-[0.99] ${
                  autoActive ? 'bg-stake-red text-white' : 'bg-stake-green text-stake-bg hover:bg-stake-green-hi'
                }`}
              >
                {autoActive ? 'Stop Autobet' : `Start Autobet${inGame ? ' (finish current round first)' : ''}`}
              </button>
            </>
          )}

          {mode === 'manual' && (
            <>
              {!inGame ? (
                <button
                  onClick={round?.done ? reset : start}
                  disabled={busyClick || (!round?.done && (balance.balance < bet || bet <= 0))}
                  className="w-full py-3.5 rounded bg-stake-green text-stake-bg font-bold text-sm disabled:opacity-50 transition active:scale-[0.99] hover:bg-stake-green-hi"
                >
                  {round?.done ? 'Reset Grid' : `Bet ${fmtCurrency(bet)} · or tap a tile`}
                </button>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Mines" value={`${mineCount}`} />
                    <Stat label="Total Profit" value={fmtCurrency(cashoutAmount - round!.bet)} highlight />
                    <Stat label="Next Pick" value={picks + 1 <= GRID_SIZE - mineCount ? fmtMultiplier(nextMult) : '—'} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={pickRandom}
                      disabled={busyClick}
                      className="flex-shrink-0 px-4 py-3.5 rounded bg-stake-input border border-stake-border text-stake-text hover:border-stake-dim font-bold text-sm disabled:opacity-50 transition active:scale-[0.97]"
                      title="Pick a random unrevealed tile"
                    >
                      Pick Random
                    </button>
                    <button
                      onClick={doCashOut}
                      disabled={busyClick || picks === 0}
                      className="flex-1 py-3.5 rounded bg-stake-green text-stake-bg font-bold text-sm disabled:opacity-50 transition active:scale-[0.99] hover:bg-stake-green-hi"
                    >
                      {picks === 0 ? 'Pick a tile to start' : `Cash Out ${fmtCurrency(cashoutAmount)}`}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </OriginalPageLayout>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded bg-stake-input border border-stake-border p-2.5 text-center">
      <div className="text-xs text-stake-muted">{label}</div>
      <div
        className={`font-mono font-bold text-sm mt-0.5 tabular-nums ${
          highlight ? 'text-stake-green' : 'text-stake-text'
        }`}
        style={highlight ? { textShadow: '0 0 8px rgba(0,231,1,.4)' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
