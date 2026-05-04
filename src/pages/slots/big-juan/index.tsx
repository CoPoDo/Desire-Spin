import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import {
  JACKPOTS,
  PAYLINES,
  PAYLINE_COUNT,
  SYMBOLS,
  type Grid as TGrid,
  type SpinResult,
  type WinLine,
  play,
  symbolById,
} from './engine';
import {
  BigJuanSvg,
  DiabloSvg,
  SombreroSvg,
  GuitarSvg,
  BootSvg,
  GloveSvg,
  ChilliSvg,
  PinataSvg,
  RoyalSvg,
} from './symbols';
import { BigJuanBonusRound } from './BonusRound';

const BET_PRESETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

/** Big Juan — 5×4 paylines slot with chilli wilds + piñata-scatter free
 *  spins + Wild Switch. Hacksaw-Gaming-inspired lucha libre theme. */
export function BigJuan() {
  const { balance, fairness, history, sound, session } = useGame();

  const [bet, setBet] = useState(1);
  const [busy, setBusy] = useState(false);
  const [grid, setGrid] = useState<TGrid>(() => makeBlankGrid());
  const [revealedReels, setRevealedReels] = useState(0); // 0..5
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set());
  const [activeWin, setActiveWin] = useState<WinLine | null>(null);
  const [showFsTrigger, setShowFsTrigger] = useState<number | null>(null);
  const [showWildSwitch, setShowWildSwitch] = useState(false);
  const [betSheetOpen, setBetSheetOpen] = useState(false);
  /** Active bonus round info, or null if not in bonus. */
  const [bonus, setBonus] = useState<{
    scatterCount: number;
    seeds: { serverSeed: string; clientSeed: string; nonce: number };
  } | null>(null);
  const [buyBonusConfirm, setBuyBonusConfirm] = useState(false);
  const [autoplay, setAutoplay] = useState<{ remaining: number; total: number } | null>(null);
  const [autoplaySheetOpen, setAutoplaySheetOpen] = useState(false);
  const [bigWin, setBigWin] = useState<{ payout: number; tier: 'big' | 'mega' | 'epic' } | null>(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [welcomeSplash, setWelcomeSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setWelcomeSplash(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // Big Juan only owns its game-specific UI state (paytable, autoplay,
  // bonus, big-win). Sound / Stats / History / Fairness / Settings are
  // all wired up through SlotPageLayout's shared menu — no duplicate
  // state needed here.

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // Body-scroll locking handled by SlotPageLayout (which wraps every slot
  // in the lobby). Big Juan only mounts inside its <main>, so no need to
  // duplicate the lock here.

  // Cycle through winning lines so the player can see each one
  useEffect(() => {
    if (!lastResult || lastResult.wins.length === 0) {
      setActiveWin(null);
      return;
    }
    let i = 0;
    setActiveWin(lastResult.wins[0]!);
    const tick = () => {
      i = (i + 1) % lastResult.wins.length;
      setActiveWin(lastResult.wins[i]!);
    };
    const interval = setInterval(tick, 1100);
    return () => clearInterval(interval);
  }, [lastResult]);

  const spin = useCallback(async () => {
    if (busy || bonus) return;
    if (balance.balance < bet || bet <= 0) return;
    setBusy(true);
    setActiveWin(null);
    setLastResult(null);
    setWinningCells(new Set());
    setShowFsTrigger(null);
    setShowWildSwitch(false);
    sound.play('click');
    balance.debit(bet);

    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng, false);

    // Reveal reels left-to-right (turbo cuts the stagger by 70%).
    const reelStagger = turbo ? 70 : 220;
    for (let reel = 0; reel < 5; reel++) {
      await new Promise<void>((res) => setTimeout(res, reelStagger));
      setGrid((prev) => {
        const next = [...prev];
        next[reel] = r.grid[reel]!;
        return next;
      });
      setRevealedReels(reel + 1);
      sound.play('drop');
    }

    // If wild switch triggered, do a two-stage reveal: first show the grid
    // with the original symbols (pre-switch), then flash the banner + sound,
    // then morph the affected cells into wilds with a brief delay so the
    // player visually sees the switch happen.
    if (r.wildSwitch?.switched) {
      // Build the pre-switch grid by reverting the wild-switched cells back
      // to their original symbol
      const preSwitchGrid = r.grid.map((col) => [...col]);
      for (const [reel, row] of r.wildSwitch.positions) {
        preSwitchGrid[reel]![row] = r.wildSwitch.switchedSymbol!;
      }
      // Show pre-switch grid briefly
      setGrid(preSwitchGrid);
      await new Promise<void>((res) => setTimeout(res, 380));
      // Flash banner + sound
      setShowWildSwitch(true);
      sound.play('mega-win');
      // Now reveal the wild-switched grid
      setGrid(r.grid);
      setTimeout(() => setShowWildSwitch(false), 1800);
      await new Promise<void>((res) => setTimeout(res, 500));
    }

    // Mark winning cells
    const winSet = new Set<string>();
    for (const w of r.wins) {
      for (const [reel, row] of w.positions) winSet.add(`${reel}:${row}`);
    }
    setWinningCells(winSet);
    setLastResult(r);

    // Settle
    const payout = +(bet * r.totalMultiplier).toFixed(2);
    if (payout > 0) {
      balance.credit(payout);
      sound.play(
        r.totalMultiplier >= 100 ? 'mega-win' :
        r.totalMultiplier >= 10 ? 'big-win' : 'win',
      );
      // Big-win celebration overlay for substantial multipliers.
      if (r.totalMultiplier >= 50) {
        const tier = r.totalMultiplier >= 500 ? 'epic'
          : r.totalMultiplier >= 200 ? 'mega'
          : 'big';
        setBigWin({ payout, tier });
        setTimeout(() => setBigWin(null), tier === 'epic' ? 4500 : tier === 'mega' ? 3500 : 2700);
      }
    }
    if (r.scatterCount >= 3) {
      // Trigger the BONUS ROUND (3×3 hold-and-win mini-grid). Show the
      // big celebration banner first, then mount the bonus.
      setShowFsTrigger(r.scatterCount);
      sound.play('free-spins-trigger');
      setTimeout(() => {
        setShowFsTrigger(null);
        // Use a fresh nonce for the bonus's RNG so it's reproducible
        // independently from the trigger spin.
        const bonusSeeds = fairness.consumeNonce();
        setBonus({ scatterCount: r.scatterCount, seeds: bonusSeeds });
      }, 1800);
    }
    history.record({
      game: 'Big Juan',
      bet,
      payout,
      multiplier: r.totalMultiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(bet, payout, false);
    setBusy(false);
  }, [busy, bonus, bet, balance, fairness, sound, history, session, turbo]);

  /** Bonus round resolved — pay the total mult × bet and clear bonus state. */
  const resolveBonus = useCallback((totalBonusMult: number) => {
    if (!bonus) return;
    const payout = +(bet * totalBonusMult).toFixed(2);
    if (payout > 0) {
      balance.credit(payout);
      sound.play(totalBonusMult >= 100 ? 'mega-win' : 'big-win');
    }
    history.record({
      game: 'Big Juan',
      bet,
      payout,
      multiplier: totalBonusMult,
      serverSeedHash: fairness.hash,
      clientSeed: bonus.seeds.clientSeed,
      nonce: bonus.seeds.nonce,
    });
    session.recordSpin(bet, payout, false);
    setBonus(null);
  }, [bonus, bet, balance, fairness.hash, history, session, sound]);

  const inFs = false; // legacy alias — bonus round replaces the FS auto loop
  const totalCost = bet;

  // Auto-play loop: when active, fires another spin shortly after the
  // previous one settles. Pauses while in bonus, resumes after.
  useEffect(() => {
    if (!autoplay || autoplay.remaining <= 0) return;
    if (busy || bonus) return;
    if (balance.balance < bet) {
      setAutoplay(null);
      return;
    }
    const t = setTimeout(() => {
      setAutoplay((prev) => prev ? { ...prev, remaining: prev.remaining - 1 } : null);
      void spin();
    }, 850);
    return () => clearTimeout(t);
  }, [autoplay, busy, bonus, balance.balance, bet, spin]);
  const BUY_BONUS_MULT = 100;
  const buyBonusCost = +(bet * BUY_BONUS_MULT).toFixed(2);

  const buyBonus = useCallback(() => {
    if (busy || bonus) return;
    if (balance.balance < buyBonusCost) return;
    sound.play('click');
    balance.debit(buyBonusCost);
    setBuyBonusConfirm(false);
    // Buy-bonus simulates a 4-scatter trigger (the medium-quality entry)
    const seeds = fairness.consumeNonce();
    setShowFsTrigger(4);
    sound.play('free-spins-trigger');
    setTimeout(() => {
      setShowFsTrigger(null);
      setBonus({ scatterCount: 4, seeds });
    }, 1600);
  }, [busy, bonus, balance, buyBonusCost, fairness, sound]);

  return (
    <div className="absolute inset-0 overflow-hidden text-ink flex flex-col big-juan-stage">
      {/* Backdrop */}
      <BigJuanBackdrop />

      {/* Top bar comes from SlotPageLayout (back / balance + refill / menu).
          Big Juan only owns the in-stage game UI. */}

      {/* Reels stage */}
      <main className="flex-1 min-h-0 flex items-center justify-center pt-14 pb-2 px-3 relative">
        <div
          className="relative w-full max-w-md"
          style={{ aspectRatio: '5 / 4.5' }}
        >
          {/* Reels container with wood-frame styling */}
          <div
            className="absolute inset-0 rounded-2xl p-3 overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, #2a0810 0%, #5a0810 50%, #14040a 100%)',
              border: '3px solid #c8932e',
              boxShadow:
                '0 0 0 1px rgba(255,209,102,.3), inset 0 1px 0 rgba(255,209,102,.4), inset 0 -8px 18px rgba(0,0,0,.55), 0 12px 30px rgba(0,0,0,.6)',
            }}
          >
            {/* Reel grid (5 reels × 4 rows) */}
            <div className="absolute inset-3 grid grid-cols-5 gap-1.5">
              {grid.map((reel, reelIdx) => (
                <div key={reelIdx} className="grid grid-rows-4 gap-1.5">
                  {reel.map((symId, rowIdx) => {
                    const cellKey = `${reelIdx}:${rowIdx}`;
                    const isWinning = winningCells.has(cellKey);
                    const isActiveWin =
                      activeWin?.positions.some(
                        ([r, ro]) => r === reelIdx && ro === rowIdx,
                      ) ?? false;
                    const sym = symbolById(symId);
                    const justRevealed = revealedReels > reelIdx;
                    // Cells in the same reel cascade top-to-bottom for that
                    // "settle" feel — bottom cell lands last, like a real
                    // mechanical reel decelerating into place.
                    const cellDelay = justRevealed && busy ? rowIdx * (turbo ? 0.025 : 0.06) : 0;
                    return (
                      <motion.div
                        key={`${cellKey}-${symId}`}
                        className="relative rounded-lg flex items-center justify-center select-none aspect-square"
                        initial={
                          justRevealed && busy
                            ? { y: -56, opacity: 0, scale: 0.82 }
                            : false
                        }
                        animate={
                          isActiveWin
                            ? { scale: [1, 1.12, 1], y: 0, opacity: 1 }
                            : isWinning
                              ? { scale: 1, y: 0, opacity: 1 }
                              : { y: 0, opacity: 1, scale: 1 }
                        }
                        transition={
                          isActiveWin
                            ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
                            : justRevealed && busy
                              ? { duration: turbo ? 0.18 : 0.34, ease: [0.34, 1.2, 0.5, 1], delay: cellDelay }
                              : { duration: 0.3, ease: 'easeOut' }
                        }
                        style={{
                          background: isActiveWin
                            ? `linear-gradient(180deg, ${sym?.color}40, rgba(0,0,0,.35))`
                            : isWinning
                              ? `linear-gradient(180deg, ${sym?.color}25, rgba(0,0,0,.45))`
                              : 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.45))',
                          border: isActiveWin
                            ? `2px solid ${sym?.color}`
                            : isWinning
                              ? `1.5px solid ${sym?.color}88`
                              : '1px solid rgba(200,147,46,.2)',
                          boxShadow: isActiveWin
                            ? `0 0 18px ${sym?.color}aa, inset 0 1px 0 rgba(255,255,255,.2)`
                            : isWinning
                              ? `0 0 8px ${sym?.color}55`
                              : 'inset 0 1px 0 rgba(255,255,255,.04)',
                        }}
                      >
                        <span
                          className="block w-[78%] h-[78%] sm:w-[82%] sm:h-[82%]"
                          style={{
                            filter: isActiveWin
                              ? `drop-shadow(0 0 12px ${sym?.color})`
                              : 'drop-shadow(0 2px 4px rgba(0,0,0,.6))',
                          }}
                        >
                          {renderBigJuanSymbol(symId)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Active payline overlay (visualises the line) */}
          {activeWin && (
            <PaylineOverlay
              line={PAYLINES[activeWin.lineIndex]!}
              color={symbolById(activeWin.symbolId)?.color ?? '#ffd166'}
            />
          )}
        </div>

        {/* Wild Switch banner */}
        <AnimatePresence>
          {showWildSwitch && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 16 }}
            >
              <div
                className="px-6 py-3 rounded-2xl font-display font-extrabold text-2xl text-center"
                style={{
                  background: 'linear-gradient(180deg, #ff5560, #c8102e)',
                  color: '#fff5c4',
                  border: '3px solid #ffd166',
                  boxShadow: '0 0 32px rgba(255,85,96,.85), 0 0 60px rgba(255,209,102,.5)',
                  textShadow: '0 2px 4px rgba(0,0,0,.6), 0 0 12px rgba(255,209,102,.85)',
                }}
              >
                WILD SWITCH! 🌶️
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FS trigger banner */}
        <AnimatePresence>
          {showFsTrigger !== null && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
              initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 16 }}
            >
              <div
                className="px-7 py-4 rounded-2xl font-display font-extrabold text-center"
                style={{
                  background: 'linear-gradient(180deg, #ffd166, #ff5560)',
                  color: '#1a0a04',
                  border: '3px solid #fff5c4',
                  boxShadow: '0 0 40px rgba(255,209,102,.9), 0 0 80px rgba(255,85,96,.7)',
                }}
              >
                <div className="text-3xl">🎉 BONUS ROUND</div>
                <div className="text-xl mt-1">{showFsTrigger}× SCATTER</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom bar — bet | buy | info | SPIN | turbo | auto. Same control
          set + ordering as ImmersiveSlotView so the lobby feels unified. */}
      <footer className="relative z-30 flex items-center justify-center gap-1.5 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        <button
          onClick={() => setBetSheetOpen(true)}
          disabled={busy || inFs}
          className="flex flex-col items-start px-3 py-2 rounded-xl bg-bg-card/80 backdrop-blur-sm border border-edge disabled:opacity-50 flex-shrink-0"
          aria-label="Bet amount"
        >
          <span className="text-[8px] uppercase tracking-widest text-ink-mute">Bet</span>
          <span className="font-mono font-bold text-sm text-ink tabular-nums">
            {fmtCurrency(bet)}
          </span>
        </button>
        <button
          onClick={() => setBuyBonusConfirm(true)}
          disabled={busy || !!bonus || !!autoplay || balance.balance < buyBonusCost}
          aria-label="Buy bonus"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl border disabled:opacity-50 flex-shrink-0"
          style={{
            background: 'linear-gradient(180deg, rgba(255,85,96,.25), rgba(0,0,0,.4))',
            borderColor: 'rgba(255,85,96,.6)',
          }}
        >
          <span className="text-[8px] uppercase tracking-widest text-[#ff8a8a] leading-none">Buy</span>
          <span className="text-[8px] font-mono font-bold text-[#ff8a8a] tabular-nums leading-none mt-0.5">
            {bet < 1 ? bet.toFixed(2).replace('0.', '.') : Math.round(bet * 100)}
          </span>
        </button>
        <button
          onClick={() => setPaytableOpen(true)}
          aria-label="Pay table"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-[#ffd166]/40 text-[#ffd166] text-base flex-shrink-0"
        >
          ⓘ
        </button>
        <button
          onClick={() => spin()}
          disabled={busy || !!bonus || balance.balance < bet || bet <= 0}
          className="flex-shrink-0 w-[88px] h-[60px] rounded-2xl font-display font-extrabold text-sm uppercase tracking-wider transition active:scale-[0.99]"
          style={{
            background: 'linear-gradient(180deg, #ffd166 0%, #c8932e 60%, #5a3a04 100%)',
            color: '#1a0a04',
            border: '2px solid #fff5c4',
            boxShadow:
              busy
                ? '0 4px 12px rgba(0,0,0,.4)'
                : '0 0 24px rgba(255,209,102,.65), 0 4px 14px rgba(0,0,0,.5)',
          }}
        >
          {busy ? '…' : 'Spin'}
        </button>
        <button
          aria-label="Turbo"
          onClick={() => setTurbo((t) => !t)}
          className="flex items-center justify-center w-11 h-11 rounded-full backdrop-blur-sm border text-base flex-shrink-0"
          style={{
            background: turbo ? 'rgba(31,255,122,.2)' : 'rgba(20,20,30,.6)',
            borderColor: turbo ? 'rgba(31,255,122,.6)' : 'rgba(255,255,255,.15)',
            color: turbo ? '#1fff7a' : '#9aa3b2',
          }}
        >
          ⚡
        </button>
        <button
          onClick={() => {
            if (autoplay) setAutoplay(null);
            else setAutoplaySheetOpen(true);
          }}
          disabled={busy || !!bonus}
          aria-label={autoplay ? 'Stop autoplay' : 'Auto-play'}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl border disabled:opacity-50 flex-shrink-0"
          style={{
            background: autoplay
              ? 'linear-gradient(180deg, rgba(31,255,122,.25), rgba(0,0,0,.4))'
              : 'rgba(0,0,0,.4)',
            borderColor: autoplay ? 'rgba(31,255,122,.6)' : 'rgba(255,209,102,.4)',
          }}
        >
          <span className="text-[8px] uppercase tracking-widest leading-none" style={{ color: autoplay ? '#9cffa8' : '#ffe0a8' }}>
            {autoplay ? 'Stop' : 'Auto'}
          </span>
          <span className="text-[9px] font-mono font-bold tabular-nums leading-none mt-0.5" style={{ color: autoplay ? '#1fff7a' : '#ffd166' }}>
            {autoplay ? `${autoplay.remaining}` : '∞'}
          </span>
        </button>
      </footer>

      {/* Last-win status pill — small badge above the footer (overlay so it
          doesn't push other rows around). */}
      {lastResult && lastResult.totalMultiplier > 0 && (
        <div
          className="absolute z-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tabular-nums pointer-events-none"
          style={{
            bottom: '76px',
            background: 'rgba(0,0,0,.6)',
            border: '1px solid rgba(255,209,102,.55)',
            color: '#ffd166',
            textShadow: '0 0 6px rgba(0,0,0,.85)',
          }}
        >
          Last win {fmtCurrency(bet * lastResult.totalMultiplier)}
        </div>
      )}

      {/* Bet sheet */}
      <AnimatePresence>
        {betSheetOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBetSheetOpen(false)}
            />
            <motion.div
              className="fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl bg-bg-card border-t border-edge p-4 max-w-md mx-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            >
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-2 px-1">
                Bet amount
              </div>
              <div className="grid grid-cols-3 gap-2">
                {BET_PRESETS.map((b) => (
                  <button
                    key={b}
                    onClick={() => { setBet(b); setBetSheetOpen(false); }}
                    className={`py-3 rounded-xl font-mono font-bold text-sm tabular-nums ${
                      bet === b
                        ? 'bg-accent-gold text-bg shadow-[0_0_14px_rgba(255,209,102,.55)]'
                        : 'bg-bg-elev border border-edge text-ink-dim'
                    }`}
                  >
                    {fmtCurrency(b)}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sound toggle / Stats / History / Fairness / Back-to-lobby live in
          SlotPageLayout's shared menu (consistent across every slot in the
          lobby). The pay-table button below opens the Big-Juan-specific
          modal below. */}

      {/* Bonus respins overlay */}
      <AnimatePresence>
        {bonus && (
          <BigJuanBonusRound
            bet={bet}
            scatterCount={bonus.scatterCount}
            seeds={bonus.seeds}
            onClose={resolveBonus}
          />
        )}
      </AnimatePresence>

      {/* Pay table modal */}
      <AnimatePresence>
        {paytableOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaytableOpen(false)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[160] w-[min(94vw,440px)] max-h-[88vh] overflow-y-auto rounded-2xl p-5"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              style={{
                background:
                  'linear-gradient(180deg, #2a0810 0%, #5a0810 50%, #14040a 100%)',
                border: '2px solid #c8932e',
                boxShadow: '0 0 32px rgba(255,209,102,.4), 0 16px 32px rgba(0,0,0,.6)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="font-display font-extrabold text-xl"
                  style={{
                    background: 'linear-gradient(180deg, #ffd166 0%, #ff5560 80%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  PAY TABLE
                </div>
                <button
                  onClick={() => setPaytableOpen(false)}
                  className="text-ink-mute hover:text-ink text-xl px-2"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Game info card */}
              <div className="rounded-xl p-3 mb-4 bg-black/40 border border-[#ffd166]/30">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[8px] uppercase tracking-widest text-ink-mute">RTP</div>
                    <div className="font-mono font-bold text-sm text-[#ffd166]">96.7%</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-widest text-ink-mute">Volatility</div>
                    <div className="font-mono font-bold text-sm text-[#ff5560]">High</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-widest text-ink-mute">Max win</div>
                    <div className="font-mono font-bold text-sm text-[#ffd166]">2,600×</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className="text-[9px] uppercase tracking-widest text-ink-mute">Lines</span>
                  <span className="ml-2 font-mono font-bold text-sm text-ink">{PAYLINE_COUNT}</span>
                  <span className="mx-2 text-ink-mute">·</span>
                  <span className="text-[9px] uppercase tracking-widest text-ink-mute">Grid</span>
                  <span className="ml-2 font-mono font-bold text-sm text-ink">5×4</span>
                </div>
              </div>

              {/* Symbol pays — top tier first */}
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-2">
                Symbol pays · 3 / 4 / 5 of a kind on a payline
              </div>
              <div className="space-y-1.5 mb-4">
                {SYMBOLS.filter((s) => s.pay).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{
                      background: 'rgba(0,0,0,.35)',
                      border: '1px solid rgba(255,209,102,.15)',
                    }}
                  >
                    <span className="w-8 h-8 flex items-center justify-center">
                      <span style={{ filter: `drop-shadow(0 0 4px ${s.color}aa)` }}>
                        {renderBigJuanSymbol(s.id)}
                      </span>
                    </span>
                    <span className="flex-1 text-xs text-ink-dim capitalize">
                      {s.id === 'A' || s.id === 'K' || s.id === 'Q' || s.id === 'J' || s.id === '10'
                        ? s.id
                        : s.id.replace('_', ' ')}
                    </span>
                    <span className="font-mono font-bold text-xs tabular-nums" style={{ color: s.color }}>
                      {s.pay![3]}× · {s.pay![4]}× · {s.pay![5]}×
                    </span>
                  </div>
                ))}
              </div>

              {/* Wild + scatter */}
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-2">
                Specials
              </div>
              <div
                className="rounded-lg p-3 mb-2"
                style={{
                  background: 'rgba(255,85,96,.15)',
                  border: '1px solid rgba(255,85,96,.4)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8">{renderBigJuanSymbol('chilli')}</span>
                  <span className="font-bold text-sm text-[#ff8a8a]">Chilli WILD</span>
                </div>
                <div className="text-[10px] text-ink-dim mt-1 leading-relaxed">
                  Substitutes for any non-scatter symbol. <strong className="text-[#ff8a8a]">Wild Switch:</strong> when 6+ identical
                  symbols land entirely on reels 2-4, all of them turn into wilds — sudden multi-line
                  hits.
                </div>
              </div>
              <div
                className="rounded-lg p-3 mb-4"
                style={{
                  background: 'rgba(255,209,102,.12)',
                  border: '1px solid rgba(255,209,102,.4)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8">{renderBigJuanSymbol('pinata')}</span>
                  <span className="font-bold text-sm text-[#ffd166]">Piñata SCATTER</span>
                </div>
                <div className="text-[10px] text-ink-dim mt-1 leading-relaxed">
                  3+ piñatas anywhere trigger the bonus respins round. Scatter pays 2× / 10× / 50×
                  for 3 / 4 / 5. Bonus starts with 10 / 12 / 14 respins.
                </div>
              </div>

              {/* Jackpots */}
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-2">
                Bonus jackpots (× bet)
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['mini', 'minor', 'major', 'grand'] as const).map((tier) => {
                  const c = tier === 'grand' ? '#ff5560'
                    : tier === 'major' ? '#ffae50'
                    : tier === 'minor' ? '#a78bfa'
                    : '#5fb8ff';
                  return (
                    <div
                      key={tier}
                      className="flex flex-col items-center px-2 py-2 rounded-lg"
                      style={{
                        background: `${c}15`,
                        border: `1px solid ${c}66`,
                      }}
                    >
                      <span className="text-[9px] uppercase tracking-widest" style={{ color: c }}>
                        {tier}
                      </span>
                      <span className="font-mono font-bold text-sm tabular-nums mt-0.5" style={{ color: c }}>
                        {JACKPOTS[tier]}×
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Welcome splash — first 3.5s after page load, dismissible by tap */}
      <AnimatePresence>
        {welcomeSplash && (
          <motion.button
            type="button"
            onClick={() => setWelcomeSplash(false)}
            className="absolute inset-0 z-[150] flex flex-col items-center justify-center text-center p-6"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(120,16,46,.92), rgba(15,5,5,.98) 70%)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="font-display font-extrabold text-5xl md:text-7xl mb-2"
              initial={{ scale: 0.4, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              style={{
                background: 'linear-gradient(180deg, #fff5c4 0%, #ffd166 35%, #ff5560 75%, #c8102e 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 28px rgba(255,209,102,.85)) drop-shadow(0 4px 8px rgba(0,0,0,.6))',
              }}
            >
              BIG JUAN
            </motion.div>
            <motion.div
              className="font-mono uppercase tracking-[0.32em] text-[#FFE0A8] text-[11px] mb-6"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Provably fair · play money
            </motion.div>
            <motion.div
              className="font-mono uppercase tracking-[0.32em] text-[#FFE0A8] text-[10px] mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Max Win
            </motion.div>
            <motion.div
              className="font-display font-extrabold text-3xl md:text-5xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 14 }}
              style={{
                background: 'linear-gradient(180deg, #fff5c4 0%, #ffd166 60%, #c8932e 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 22px rgba(255,209,102,.85))',
              }}
            >
              2,600×
            </motion.div>
            <motion.div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-[#FFE0A8]/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.45, 0.85, 0.45] }}
              transition={{ delay: 1, duration: 1.5, repeat: Infinity }}
            >
              Tap to begin
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Big-win celebration overlay */}
      <AnimatePresence>
        {bigWin && (
          <motion.div
            className="fixed inset-0 z-[170] flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background:
                bigWin.tier === 'epic'
                  ? 'radial-gradient(70% 60% at 50% 45%, rgba(255,209,102,.4) 0%, rgba(200,16,46,.55) 40%, rgba(0,0,0,.85) 100%)'
                  : bigWin.tier === 'mega'
                    ? 'radial-gradient(70% 60% at 50% 45%, rgba(255,209,102,.32) 0%, rgba(0,0,0,.78) 100%)'
                    : 'radial-gradient(70% 60% at 50% 45%, rgba(255,209,102,.22) 0%, rgba(0,0,0,.7) 100%)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <motion.div
              className="font-display font-extrabold mb-2 text-center"
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              style={{
                fontSize: bigWin.tier === 'epic' ? 'clamp(36px, 11vw, 64px)' : bigWin.tier === 'mega' ? 'clamp(32px, 9vw, 56px)' : 'clamp(28px, 8vw, 48px)',
                background: bigWin.tier === 'epic'
                  ? 'linear-gradient(180deg, #fff5c4 0%, #ffd166 30%, #ff5560 65%, #c8102e 100%)'
                  : 'linear-gradient(180deg, #fff5c4 0%, #ffd166 50%, #c8932e 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: bigWin.tier === 'epic'
                  ? 'drop-shadow(0 0 28px rgba(255,209,102,.95)) drop-shadow(0 0 48px rgba(255,85,96,.7)) drop-shadow(0 4px 8px rgba(0,0,0,.6))'
                  : 'drop-shadow(0 0 24px rgba(255,209,102,.9)) drop-shadow(0 4px 8px rgba(0,0,0,.6))',
              }}
            >
              {bigWin.tier === 'epic' ? 'EPIC WIN!' : bigWin.tier === 'mega' ? 'MEGA WIN!' : 'BIG WIN!'}
            </motion.div>
            <motion.div
              className="font-mono font-extrabold tabular-nums"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 240, damping: 16 }}
              style={{
                fontSize: 'clamp(28px, 8vw, 56px)',
                color: '#ffd166',
                textShadow: '0 0 32px rgba(255,209,102,.95), 0 0 64px rgba(255,85,96,.65), 0 4px 8px rgba(0,0,0,.6)',
              }}
            >
              {fmtCurrency(bigWin.payout)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Autoplay sheet */}
      <AnimatePresence>
        {autoplaySheetOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAutoplaySheetOpen(false)}
            />
            <motion.div
              className="fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl bg-bg-card border-t border-edge p-4 max-w-md mx-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            >
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-2 px-1">
                Auto-play count
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[10, 25, 50, 100, 250, 500].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setAutoplay({ remaining: n, total: n });
                      setAutoplaySheetOpen(false);
                    }}
                    className="py-3 rounded-xl font-mono font-bold text-sm tabular-nums bg-bg-elev border border-edge text-ink-dim hover:text-ink"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-ink-mute text-center mt-3">
                Auto-play pauses during the bonus round and resumes after.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Buy bonus confirmation */}
      <AnimatePresence>
        {buyBonusConfirm && (
          <>
            <motion.button
              className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBuyBonusConfirm(false)}
              aria-label="Cancel buy bonus"
            />
            <motion.div
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[160] w-[min(92vw,360px)] rounded-2xl p-5"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{
                background:
                  'radial-gradient(80% 60% at 50% 38%, #c8102e 0%, #5a0810 60%, #14040a 100%)',
                border: '2px solid #ffd166',
                boxShadow: '0 0 32px rgba(255,85,96,.55), 0 16px 32px rgba(0,0,0,.6)',
              }}
            >
              <div
                className="font-display font-extrabold text-2xl text-center mb-2"
                style={{
                  background: 'linear-gradient(180deg, #ffd166, #ff5560)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))',
                }}
              >
                BUY BONUS
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[#ffe0a8] text-center mb-4">
                Skip the wait. Enter the bonus.
              </div>
              <div className="flex justify-around mb-4">
                <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-black/40 border border-[#ffd166]/30">
                  <span className="text-[8px] uppercase tracking-widest text-ink-mute">You get</span>
                  <span className="text-2xl">🎉</span>
                  <span className="text-[10px] font-mono font-bold text-[#ffd166]">4× scatter</span>
                </div>
                <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-black/40 border border-[#ff8a8a]/30">
                  <span className="text-[8px] uppercase tracking-widest text-ink-mute">Cost</span>
                  <span className="font-mono font-bold text-lg text-[#ff8a8a] tabular-nums">
                    {fmtCurrency(buyBonusCost)}
                  </span>
                  <span className="text-[10px] text-ink-mute">{BUY_BONUS_MULT}× bet</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setBuyBonusConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-bg-elev border border-edge text-ink-dim font-bold text-xs uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={buyBonus}
                  disabled={balance.balance < buyBonusCost}
                  className="flex-[2] py-3 rounded-xl font-display font-extrabold text-sm uppercase tracking-wider disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg, #ffd166 0%, #c8932e 60%, #5a3a04 100%)',
                    color: '#1a0a04',
                    border: '2px solid #fff5c4',
                    boxShadow: '0 0 18px rgba(255,209,102,.5)',
                  }}
                >
                  Buy · {fmtCurrency(buyBonusCost)}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* totalCost is currently unused but kept for future side-bet/ante. */}
      <span className="hidden">{totalCost}</span>
      {/* Active win info badge */}
      {activeWin && (
        <div
          className="absolute z-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tabular-nums pointer-events-none"
          style={{
            bottom: '92px',
            background: 'rgba(0,0,0,.65)',
            border: `1px solid ${symbolById(activeWin.symbolId)?.color}aa`,
            color: '#fff5c4',
            textShadow: '0 0 8px rgba(0,0,0,.85)',
          }}
        >
          Line {activeWin.lineIndex + 1} · {symbolById(activeWin.symbolId)?.emoji} ×{activeWin.count} · {activeWin.multiplier}×
        </div>
      )}
      {lastResult && lastResult.scatterCount >= 3 && !showFsTrigger && (
        <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full text-[11px] font-mono font-bold tabular-nums pointer-events-none"
          style={{
            background: 'rgba(0,0,0,.65)',
            border: '1px solid rgba(255,209,102,.6)',
            color: '#ffd166',
            textShadow: '0 0 8px rgba(0,0,0,.85)',
          }}
        >
          {lastResult.scatterCount}× 🎉 · {lastResult.scatterMultiplier}× scatter
        </div>
      )}
    </div>
  );
}

/** Render the appropriate symbol art for a cell. Heroes get full SVG;
 *  the rest fall back to emoji on a tinted disc. */
function renderBigJuanSymbol(symId: string) {
  switch (symId) {
    case 'juan':     return <BigJuanSvg />;
    case 'diablo':   return <DiabloSvg />;
    case 'sombrero': return <SombreroSvg />;
    case 'guitar':   return <GuitarSvg />;
    case 'boot':     return <BootSvg />;
    case 'glove':    return <GloveSvg />;
    case 'chilli':   return <ChilliSvg />;
    case 'pinata':   return <PinataSvg />;
    case 'A':        return <RoyalSvg letter="A"  color="#ffd166" />;
    case 'K':        return <RoyalSvg letter="K"  color="#a78bfa" />;
    case 'Q':        return <RoyalSvg letter="Q"  color="#ff7ad9" />;
    case 'J':        return <RoyalSvg letter="J"  color="#1fff7a" />;
    case '10':       return <RoyalSvg letter="10" color="#22d3ee" />;
  }
  // Fallback: emoji on a disc
  const sym = symbolById(symId);
  if (!sym) return null;
  return (
    <div
      className="w-full h-full flex items-center justify-center select-none"
      style={{
        background:
          `radial-gradient(circle at 35% 30%, ${sym.color}55, ${sym.color}20 60%, transparent 80%)`,
        borderRadius: '50%',
      }}
    >
      <span style={{ fontSize: '78%', color: sym.color }}>{sym.emoji}</span>
    </div>
  );
}

function makeBlankGrid(): TGrid {
  // Default fillers so the reels aren't empty before first spin
  const fillers = ['A', 'K', 'Q', 'J', '10', 'guitar', 'boot', 'glove'];
  const grid: TGrid = [];
  for (let reel = 0; reel < 5; reel++) {
    const col: string[] = [];
    for (let row = 0; row < 4; row++) {
      col.push(fillers[(reel * 4 + row) % fillers.length]!);
    }
    grid.push(col);
  }
  return grid;
}

function PaylineOverlay({ line, color }: { line: number[]; color: string }) {
  // Compute SVG points across a 5×4 grid (in viewBox 100×80, padded for the
  // stage frame). Each reel is 20 wide; each row centred at row*20+10.
  const points = line.map((row, reel) => {
    const x = reel * 20 + 10;
    const y = row * 20 + 10;
    return `${x},${y}`;
  });
  return (
    <svg
      className="absolute inset-3 pointer-events-none z-20"
      viewBox="0 0 100 80"
      preserveAspectRatio="none"
      style={{ filter: `drop-shadow(0 0 8px ${color})` }}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

function BigJuanBackdrop() {
  // Wrestling-arena lit-stage backdrop. Spotlights, ropes, bunting.
  return (
    <div className="absolute inset-0 -z-0 overflow-hidden">
      {/* Crowd / dark stadium */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 38%, #ff5560 0%, #5a0810 40%, #14040a 75%, #02010a 100%)',
        }}
      />
      {/* Spotlight rays */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(40% 28% at 28% 22%, rgba(255,232,168,.35), transparent 70%),
            radial-gradient(40% 28% at 72% 22%, rgba(255,232,168,.35), transparent 70%),
            radial-gradient(60% 30% at 50% 60%, rgba(255,209,102,.18), transparent 75%)
          `,
          mixBlendMode: 'screen',
        }}
      />
      {/* Wrestling ring ropes (top + bottom) */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '14%',
          height: '4px',
          background: 'linear-gradient(180deg, #ffd166, #c8932e)',
          boxShadow: '0 0 8px rgba(255,209,102,.5)',
          opacity: .65,
        }}
      />
      <div
        className="absolute inset-x-0"
        style={{
          bottom: '12%',
          height: '4px',
          background: 'linear-gradient(180deg, #ffd166, #c8932e)',
          boxShadow: '0 0 8px rgba(255,209,102,.5)',
          opacity: .65,
        }}
      />
      {/* Papel picado bunting at top */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '5%',
          height: '5%',
          background: `repeating-linear-gradient(
            90deg,
            #ff5560 0 6%,
            transparent 6% 8%,
            #1fff7a 8% 14%,
            transparent 14% 16%,
            #5fb8ff 16% 22%,
            transparent 22% 24%,
            #ffd166 24% 30%,
            transparent 30% 32%,
            #c042b8 32% 38%,
            transparent 38% 40%
          )`,
          maskImage:
            'repeating-linear-gradient(90deg, #000 0 6%, transparent 6% 8%, #000 8% 14%, transparent 14% 16%, #000 16% 22%, transparent 22% 24%, #000 24% 30%, transparent 30% 32%, #000 32% 38%, transparent 38% 40%)',
          WebkitMaskImage:
            'repeating-linear-gradient(90deg, #000 0 6%, transparent 6% 8%, #000 8% 14%, transparent 14% 16%, #000 16% 22%, transparent 22% 24%, #000 24% 30%, transparent 30% 32%, #000 32% 38%, transparent 38% 40%)',
          opacity: 0.85,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 80% at 50% 50%, transparent 60%, rgba(0,0,0,.6) 100%)',
        }}
      />
    </div>
  );
}
