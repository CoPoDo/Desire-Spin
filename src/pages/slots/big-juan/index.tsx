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
                <div className="text-3xl flex items-center justify-center gap-2">
                  <span className="inline-block" style={{ width: 36, height: 36 }}>
                    <PinataSvg />
                  </span>
                  BONUS ROUND
                </div>
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
          className={`flex-shrink-0 w-[88px] h-[60px] rounded-2xl font-display font-extrabold text-sm uppercase tracking-wider transition active:scale-[0.99] ${
            !busy && !bonus ? 'spin-btn-idle' : ''
          }`}
          style={{
            background: 'linear-gradient(180deg, #ffd166 0%, #c8932e 60%, #5a3a04 100%)',
            color: '#1a0a04',
            border: '2px solid #fff5c4',
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
                  <span className="inline-block" style={{ width: 28, height: 28 }}>
                    <PinataSvg />
                  </span>
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
          <span className="inline-flex items-center gap-1.5">
            {lastResult.scatterCount}×
            <span className="inline-block align-middle" style={{ width: 14, height: 14 }}>
              <PinataSvg />
            </span>
            · {lastResult.scatterMultiplier}× scatter
          </span>
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
      {/* Centre spotlight beam — bright gold radial behind the reel area
       * (the lucha arena's main spotlight on the centre of the ring). */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          height: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,209,102,.32) 0%, rgba(255,150,80,.16) 40%, transparent 75%)',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Crowd silhouettes — dark cheering audience beyond the ring ropes,
       * visible top-bottom of the screen. Two rows of bobbing-head shapes
       * to suggest a packed wrestling arena instead of an empty void. */}
      <svg
        className="absolute inset-x-0"
        style={{ top: '14%', height: '6%', width: '100%', opacity: 0.55 }}
        viewBox="0 0 100 6"
        preserveAspectRatio="none"
      >
        <path
          d="M 0,6
             L 0,4 Q 2,2.5 4,4 Q 6,2 8,4 Q 10,1.8 12,4 Q 14,2.4 16,4 Q 18,2 20,4
             Q 22,2.6 24,4 Q 26,2.2 28,4 Q 30,2.8 32,4 Q 34,2 36,4 Q 38,2.4 40,4
             Q 42,2 44,4 Q 46,2.6 48,4 Q 50,1.8 52,4 Q 54,2.2 56,4 Q 58,2.8 60,4
             Q 62,2 64,4 Q 66,2.4 68,4 Q 70,2.6 72,4 Q 74,2 76,4 Q 78,2.8 80,4
             Q 82,2.2 84,4 Q 86,2 88,4 Q 90,2.6 92,4 Q 94,2.4 96,4 Q 98,2 100,4
             L 100,6 Z"
          fill="#02010a"
        />
      </svg>
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '12%', height: '6%', width: '100%', opacity: 0.55 }}
        viewBox="0 0 100 6"
        preserveAspectRatio="none"
      >
        <path
          d="M 0,6
             L 0,4 Q 2,2 4,4 Q 6,2.6 8,4 Q 10,2.2 12,4 Q 14,2.8 16,4 Q 18,2.4 20,4
             Q 22,2 24,4 Q 26,2.6 28,4 Q 30,2.2 32,4 Q 34,2.8 36,4 Q 38,2 40,4
             Q 42,2.4 44,4 Q 46,2 48,4 Q 50,2.8 52,4 Q 54,2.2 56,4 Q 58,2.6 60,4
             Q 62,2.4 64,4 Q 66,2 68,4 Q 70,2.8 72,4 Q 74,2.2 76,4 Q 78,2.6 80,4
             Q 82,2 84,4 Q 86,2.8 88,4 Q 90,2.4 92,4 Q 94,2 96,4 Q 98,2.6 100,4
             L 100,6 Z"
          fill="#02010a"
        />
      </svg>

      {/* Wrestling ring ropes (top + bottom) — sit just inside the crowd
       * silhouettes so they read as the front rope of the squared circle */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '14%',
          height: '4px',
          background: 'linear-gradient(180deg, #ffd166, #c8932e)',
          boxShadow: '0 0 8px rgba(255,209,102,.5)',
          opacity: .8,
        }}
      />
      <div
        className="absolute inset-x-0"
        style={{
          bottom: '12%',
          height: '4px',
          background: 'linear-gradient(180deg, #ffd166, #c8932e)',
          boxShadow: '0 0 8px rgba(255,209,102,.5)',
          opacity: .8,
        }}
      />
      {/* Turnbuckles (red/yellow padding at the corners of the ring) */}
      <div
        className="absolute"
        style={{
          top: '13.4%', left: 0, width: '5%', height: '1.6%',
          background: 'linear-gradient(180deg, #ff5560, #c8102e)',
          borderRadius: '0 4px 4px 0',
          boxShadow: '0 0 6px rgba(255,85,96,.6)',
        }}
      />
      <div
        className="absolute"
        style={{
          top: '13.4%', right: 0, width: '5%', height: '1.6%',
          background: 'linear-gradient(180deg, #ff5560, #c8102e)',
          borderRadius: '4px 0 0 4px',
          boxShadow: '0 0 6px rgba(255,85,96,.6)',
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '11.4%', left: 0, width: '5%', height: '1.6%',
          background: 'linear-gradient(180deg, #ffd166, #c8932e)',
          borderRadius: '0 4px 4px 0',
          boxShadow: '0 0 6px rgba(255,209,102,.6)',
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '11.4%', right: 0, width: '5%', height: '1.6%',
          background: 'linear-gradient(180deg, #ffd166, #c8932e)',
          borderRadius: '4px 0 0 4px',
          boxShadow: '0 0 6px rgba(255,209,102,.6)',
        }}
      />
      {/* Papel picado bunting at top — triangular SVG pennants on a sagging
       *  string. Matches the Cantina scene's bunting so the two
       *  Mexican-themed slots visually share the same fiesta language. */}
      <svg
        className="absolute inset-x-0"
        style={{
          top: '3%',
          height: '7%',
          width: '100%',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.4))',
          opacity: 0.92,
        }}
        viewBox="0 0 100 7"
        preserveAspectRatio="none"
      >
        {/* Sagging string */}
        <path
          d="M 0 1 Q 25 2.4 50 1.4 T 100 1"
          fill="none"
          stroke="rgba(0,0,0,.6)"
          strokeWidth=".15"
        />
        {(() => {
          const colors = ['#ff5560', '#1fff7a', '#5fb8ff', '#ffd166', '#c042b8', '#ffae50'];
          const N = 16;
          return Array.from({ length: N }).map((_, i) => {
            const x = (i + 0.5) * (100 / N);
            const yTop =
              x < 50
                ? 1 + 1.4 * (1 - Math.abs(x - 25) / 25)
                : 1 + 1.4 * (1 - Math.abs(x - 75) / 25);
            const w = 100 / N - 0.6;
            const color = colors[i % colors.length]!;
            const tipY = yTop + 4;
            const cx = x;
            const cy = yTop + 2;
            return (
              <g key={i}>
                <path
                  d={`M ${cx - w / 2} ${yTop} L ${cx + w / 2} ${yTop} L ${cx} ${tipY} Z`}
                  fill={color}
                  stroke="rgba(0,0,0,.45)"
                  strokeWidth=".08"
                  opacity=".92"
                />
                <path
                  d={`M ${cx} ${cy - 0.55} L ${cx + 0.45} ${cy} L ${cx} ${cy + 0.55} L ${cx - 0.45} ${cy} Z`}
                  fill="rgba(0,0,0,.35)"
                />
                <circle cx={cx - 0.85} cy={cy + 0.2} r=".16" fill="rgba(0,0,0,.3)" />
                <circle cx={cx + 0.85} cy={cy + 0.2} r=".16" fill="rgba(0,0,0,.3)" />
                <path
                  d={`M ${cx - w / 2 + 0.1} ${yTop + 0.15} L ${cx} ${tipY - 0.2}`}
                  stroke="rgba(255,255,255,.35)"
                  strokeWidth=".1"
                />
              </g>
            );
          });
        })()}
      </svg>
      {/* Floating confetti sparks — small coloured rectangles drift up
       * from the bottom in the fiesta palette. Adds ambient lucha-arena
       * energy without competing with the reels. */}
      {[
        { left: '8%',  size: 5, dur: 8,  delay: 0,    color: '#ff5560' },
        { left: '18%', size: 4, dur: 10, delay: 2.4,  color: '#1fff7a' },
        { left: '32%', size: 6, dur: 9,  delay: 4.0,  color: '#ffd166' },
        { left: '46%', size: 4, dur: 11, delay: 1.2,  color: '#5fb8ff' },
        { left: '58%', size: 5, dur: 8.5, delay: 5.6, color: '#c042b8' },
        { left: '72%', size: 4, dur: 9.5, delay: 0.8, color: '#ff5560' },
        { left: '84%', size: 6, dur: 10.5, delay: 3.6, color: '#ffd166' },
        { left: '92%', size: 4, dur: 8,  delay: 6.4,  color: '#1fff7a' },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: c.left,
            bottom: '-10%',
            width: `${c.size}px`,
            height: `${c.size * 1.8}px`,
            background: c.color,
            borderRadius: '1px',
            boxShadow: `0 0 4px ${c.color}aa`,
            animation: `bigJuanConfetti ${c.dur}s linear ${c.delay}s infinite`,
            mixBlendMode: 'screen',
          }}
        />
      ))}

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
