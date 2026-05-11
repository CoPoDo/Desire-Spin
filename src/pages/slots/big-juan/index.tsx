import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { loadJson, saveJson } from '../../../lib/storage';
import {
  AUTOPLAY_OPTIONS,
  BET_MAX,
  BET_MIN,
  BIG_WIN_TIERS,
  BUY_BONUS_COST_MULTIPLIER,
  COIN_VALUES,
  COINS_PER_LINE,
  JACKPOTS,
  PAYLINES,
  PAYLINE_COUNT,
  SYMBOLS,
  type Grid as TGrid,
  type SpinResult,
  type SymbolDef,
  type WinLine,
  bigWinTierFor,
  play,
  rollBonusBuyEntry,
  symbolById,
  totalBetFor,
} from './engine';
import {
  BigJuanSvg,
  ChihuahuaSvg,
  ChilliSvg,
  GuitarSvg,
  HotSauceSvg,
  PinataSvg,
  RoyalSvg,
  SenoritaSvg,
} from './symbols';
import { BigJuanBonusRound } from './BonusRound';
import { fireConfetti } from '../../../lib/confetti';

/** Big Juan — full Pragmatic Play clone per the public spec.
 *
 *  5×4 grid, 40 paylines, RTP 96.70% / 96.53% buy, max win 2,600× bet.
 *  Features: Wild Switch (6+ same on reels 2-3-4 → all wild), Respins
 *  feature (3×3 + 4th-reel cell, sticky Money Bag, jackpot meters).
 *
 *  See `/root/.claude/uploads/.../big_juan_spec.md` for the complete
 *  reference document this file implements. */
export function BigJuan() {
  const { balance, fairness, history, sound, session } = useGame();

  // ── Bet structure — spec §1: total_bet = coin × cpl × 40 ─────────
  // Persist coin value + coins-per-line so the player's stake survives
  // a page reload (matches the cross-game persistedBet pattern).
  const [coinValue, setCoinValue] = useState<number>(() => {
    const v = loadJson<number>('bj:coin', 0.025);
    return COIN_VALUES.includes(v as never) ? v : 0.025;
  });
  const [coinsPerLine, setCoinsPerLine] = useState<number>(() => {
    const v = loadJson<number>('bj:cpl', 1);
    return COINS_PER_LINE.includes(v as never) ? v : 1;
  });
  useEffect(() => { saveJson('bj:coin', coinValue); }, [coinValue]);
  useEffect(() => { saveJson('bj:cpl', coinsPerLine); }, [coinsPerLine]);

  // Total bet — derived. Spec §1: total = coin × cpl × 40.
  const bet = useMemo(() => totalBetFor(coinValue, coinsPerLine), [coinValue, coinsPerLine]);

  // ── Round + UI state ──────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [grid, setGrid] = useState<TGrid>(() => makeBlankGrid());
  const [revealedReels, setRevealedReels] = useState(0); // 0..5
  /** Last result. The UI uses it for the win-cycle, the last-win pill,
   *  and the scatter status badge. */
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set());
  const [activeWin, setActiveWin] = useState<WinLine | null>(null);
  /** Reels currently in the "spinning blur" state (during reveal). */
  const [spinningReels, setSpinningReels] = useState<Set<number>>(new Set());
  /** Reel-5 anticipation flag — when 2+ piñatas visible on reels 1-4
   *  and reel 5 still spinning. Triggers slow-spin animation. */
  const [anticipating, setAnticipating] = useState(false);
  /** FS trigger banner. Number is scatter count (3/4/5). */
  const [showFsTrigger, setShowFsTrigger] = useState<number | null>(null);
  const [showWildSwitch, setShowWildSwitch] = useState(false);
  /** Wild-switch positions in flame mid-transition (for the burst-into-flames
   *  visual). When set, those cells animate; cleared once the new grid lands. */
  const [igniteCells, setIgniteCells] = useState<Set<string>>(new Set());

  // ── Sheets / overlays ─────────────────────────────────────────────
  const [betSheetOpen, setBetSheetOpen] = useState(false);
  const [autoplaySheetOpen, setAutoplaySheetOpen] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [buyBonusConfirm, setBuyBonusConfirm] = useState(false);
  const [welcomeSplash, setWelcomeSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setWelcomeSplash(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // ── Bonus round mount state ───────────────────────────────────────
  const [bonus, setBonus] = useState<{
    scatterCount: number;
    /** When set, overrides the default 10/12/15 award (used by Bonus
     *  Buy to force the spec-pinned 12 or 15). */
    initialRespinsOverride?: number;
    seeds: { serverSeed: string; clientSeed: string; nonce: number };
  } | null>(null);

  // ── Autoplay + turbo + big-win banner ────────────────────────────
  const [autoplay, setAutoplay] = useState<{ remaining: number; total: number } | null>(null);
  const [bigWin, setBigWin] = useState<{ payout: number; tier: typeof BIG_WIN_TIERS[number] } | null>(null);
  const [turbo, setTurbo] = useState<boolean>(() => loadJson<boolean>('bj:turbo', false));
  useEffect(() => { saveJson('bj:turbo', turbo); }, [turbo]);

  // ── Aux refs ─────────────────────────────────────────────────────
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // ── Win-line cycling ─────────────────────────────────────────────
  useEffect(() => {
    if (!lastResult || lastResult.wins.length === 0) { setActiveWin(null); return; }
    let i = 0;
    setActiveWin(lastResult.wins[0]!);
    const tick = () => {
      i = (i + 1) % lastResult.wins.length;
      setActiveWin(lastResult.wins[i]!);
    };
    const interval = setInterval(tick, 1100);
    return () => clearInterval(interval);
  }, [lastResult]);

  // ── Spin ─────────────────────────────────────────────────────────
  const spin = useCallback(async () => {
    if (busy || bonus) return;
    if (balance.balance < bet || bet <= 0) return;
    setBusy(true);
    setActiveWin(null);
    setLastResult(null);
    setWinningCells(new Set());
    setShowFsTrigger(null);
    setShowWildSwitch(false);
    setIgniteCells(new Set());
    sound.play('click');
    balance.debit(bet);

    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng);

    // ── Reveal pre-switch grid left → right ────────────────────────
    // Spec §10b.1 — reel-to-reel stagger ~100ms (Quick Spin 50ms,
    // Turbo 20ms). We use 220ms / 70ms — slightly slower than real
    // because the player has no haptic feedback to compensate.
    const reelStagger = turbo ? 80 : 200;
    const settleMs = turbo ? 90 : 220;
    setSpinningReels(new Set([0, 1, 2, 3, 4]));
    setRevealedReels(0);

    for (let reel = 0; reel < 5; reel++) {
      // Reel-5 anticipation: if scatters_on_first_four >= 2 AND final
      // scatter count would be 3+, slow reel 5 dramatically. Spec §10b.2
      // says ~1.5-2.2s of slow spin; we cap it tighter for tempo here.
      if (reel === 4 && r.anticipation) {
        setAnticipating(true);
        // Tense pause before reel 5 lands.
        await new Promise<void>((res) => setTimeout(res, turbo ? 700 : 1400));
        sound.play('big-win'); // anticipation horn sting
      } else {
        await new Promise<void>((res) => setTimeout(res, reelStagger));
      }
      setGrid((prev) => {
        const next = [...prev];
        // Reveal the INITIAL grid (pre-switch); Wild Switch fires later.
        next[reel] = r.initialGrid[reel]!;
        return next;
      });
      setRevealedReels(reel + 1);
      setSpinningReels((prev) => {
        const next = new Set(prev);
        next.delete(reel);
        return next;
      });
      sound.play('drop');
      await new Promise<void>((res) => setTimeout(res, settleMs));
    }
    setAnticipating(false);

    // ── Pay pre-switch line wins (spec §5: paid first, BEFORE switch) ──
    if (r.preSwitchWins.length > 0) {
      const winSet = new Set<string>();
      for (const w of r.preSwitchWins) for (const [reel, row] of w.positions) winSet.add(`${reel}:${row}`);
      setWinningCells(winSet);
      const preMult = r.preSwitchWins.reduce((s, w) => s + w.multiplier, 0);
      if (preMult > 0) {
        const prePayout = +(bet * preMult).toFixed(2);
        if (prePayout > 0) {
          balance.credit(prePayout);
          sound.play(preMult >= 50 ? 'mega-win' : preMult >= 10 ? 'big-win' : 'win');
        }
      }
      // Brief pause to let the player see the line wins before switch.
      await new Promise<void>((res) => setTimeout(res, turbo ? 380 : 800));
    }

    // ── Wild Switch (if triggered) — spec §6 + §10b.4 ──────────────
    if (r.wildSwitch.switched) {
      // Burst-into-flames: mark the triggering cells, brief flame anim,
      // then transform them to wilds + re-evaluate.
      const positions = r.wildSwitch.positions;
      const igniteSet = new Set(positions.map(([reel, row]) => `${reel}:${row}`));
      setIgniteCells(igniteSet);
      setShowWildSwitch(true);
      sound.play('mega-win');

      // Flame burst beat (~600-900ms).
      await new Promise<void>((res) => setTimeout(res, turbo ? 500 : 900));

      // Transform cells: switch their symbol id to 'chili' so they
      // render as wilds.
      setGrid(r.grid); // post-switch grid

      // Hold ignite glow briefly so the wild reveal pops, then clear.
      await new Promise<void>((res) => setTimeout(res, turbo ? 250 : 500));
      setIgniteCells(new Set());

      // Pay post-switch line wins.
      if (r.postSwitchWins.length > 0) {
        const winSet = new Set<string>();
        for (const w of r.postSwitchWins) for (const [reel, row] of w.positions) winSet.add(`${reel}:${row}`);
        setWinningCells((prev) => new Set([...prev, ...winSet]));
        const postMult = r.postSwitchWins.reduce((s, w) => s + w.multiplier, 0);
        if (postMult > 0) {
          const postPayout = +(bet * postMult).toFixed(2);
          if (postPayout > 0) {
            balance.credit(postPayout);
            sound.play(postMult >= 50 ? 'mega-win' : 'big-win');
          }
        }
      }
      setTimeout(() => setShowWildSwitch(false), 1400);
      await new Promise<void>((res) => setTimeout(res, turbo ? 300 : 600));
    }

    // ── Headline result + big-win banner ────────────────────────────
    const winSet = new Set<string>();
    for (const w of r.wins) for (const [reel, row] of w.positions) winSet.add(`${reel}:${row}`);
    setWinningCells(winSet);
    setLastResult(r);

    const baseMult = r.baseMultiplier;
    const basePayout = +(bet * baseMult).toFixed(2);

    // Big-win tier banner — spec §10b.10 thresholds.
    const tier = bigWinTierFor(baseMult);
    if (tier) {
      setBigWin({ payout: basePayout, tier });
      const dismissMs = turbo ? Math.max(2200, tier.durationMs * 0.6) : tier.durationMs;
      setTimeout(() => setBigWin(null), dismissMs);
      // Confetti for bigger tiers.
      const confettiCount =
        tier.name === 'max' ? 280
        : tier.name === 'epic' ? 220
        : tier.name === 'huge' ? 180
        : tier.name === 'super' ? 140
        : tier.name === 'mega' ? 100
        : tier.name === 'big' ? 70
        : 50;
      fireConfetti({
        count: confettiCount,
        colors: ['#ff5560', '#ffd166', '#1fff7a', '#5fb8ff', '#c042b8', '#ffffff'],
      });
    }

    // ── Bonus trigger (3+ scatters) — spec §10b.5 ───────────────────
    if (r.triggersBonus) {
      setShowFsTrigger(r.scatterCount);
      sound.play('free-spins-trigger');
      // Generous beat so the player sees "BONUS!" before the bonus mounts.
      const triggerMs = turbo ? 1400 : 2200;
      setTimeout(() => {
        if (!aliveRef.current) return;
        setShowFsTrigger(null);
        const bonusSeeds = fairness.consumeNonce();
        setBonus({ scatterCount: r.scatterCount, seeds: bonusSeeds });
      }, triggerMs);
    }

    // ── History + session ──────────────────────────────────────────
    history.record({
      game: 'Big Juan',
      bet,
      payout: basePayout,
      multiplier: baseMult,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(bet, basePayout, false);
    setBusy(false);
  }, [busy, bonus, bet, balance, fairness, sound, history, session, turbo]);

  // ── Bonus resolved ────────────────────────────────────────────────
  const resolveBonus = useCallback((totalBonusMult: number) => {
    if (!bonus) return;
    const payout = +(bet * totalBonusMult).toFixed(2);
    if (payout > 0) {
      balance.credit(payout);
      // Bonus tier banner (use BIG_WIN_TIERS the same way the base game does).
      const tier = bigWinTierFor(totalBonusMult);
      if (tier) {
        setBigWin({ payout, tier });
        const dismissMs = turbo ? Math.max(2200, tier.durationMs * 0.6) : tier.durationMs;
        setTimeout(() => setBigWin(null), dismissMs);
        fireConfetti({
          count: tier.name === 'max' ? 300 : tier.name === 'epic' ? 220 : 160,
          colors: ['#ff5560', '#ffd166', '#1fff7a', '#5fb8ff', '#c042b8', '#ffffff'],
        });
      }
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
  }, [bonus, bet, balance, fairness.hash, history, session, sound, turbo]);

  // ── Autoplay loop ─────────────────────────────────────────────────
  useEffect(() => {
    if (!autoplay || autoplay.remaining <= 0) return;
    if (busy || bonus) return;
    if (bigWin) return; // Spec §10b.14: autoplay pauses on Big Win+.
    if (balance.balance < bet) {
      setAutoplay(null);
      return;
    }
    const t = setTimeout(() => {
      setAutoplay((prev) => prev ? { ...prev, remaining: prev.remaining - 1 } : null);
      void spin();
    }, turbo ? 280 : 720);
    return () => clearTimeout(t);
  }, [autoplay, busy, bonus, bigWin, balance.balance, bet, spin, turbo]);

  // ── Bonus Buy ────────────────────────────────────────────────────
  const buyBonusCost = +(bet * BUY_BONUS_COST_MULTIPLIER).toFixed(2);
  const buyBonus = useCallback(() => {
    if (busy || bonus) return;
    if (balance.balance < buyBonusCost) return;
    sound.play('click');
    balance.debit(buyBonusCost);
    setBuyBonusConfirm(false);

    // Spec §8: buy entry rolls 4 or 5 piñatas (weighted 85/15). Use a
    // fresh nonce so the entry roll is provably-fair and reproducible
    // from history.
    const seeds = fairness.consumeNonce();
    const entryRng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const entry = rollBonusBuyEntry(entryRng);

    setShowFsTrigger(entry.scatters);
    sound.play('free-spins-trigger');
    setTimeout(() => {
      if (!aliveRef.current) return;
      setShowFsTrigger(null);
      // Consume a second nonce for the bonus's RNG stream so the entry
      // roll doesn't bleed into the respin RNG.
      const bonusSeeds = fairness.consumeNonce();
      setBonus({
        scatterCount: entry.scatters,
        initialRespinsOverride: entry.respinsAwarded,
        seeds: bonusSeeds,
      });
    }, turbo ? 1300 : 1800);
  }, [busy, bonus, balance, buyBonusCost, fairness, sound, turbo]);

  // ── Hotkeys ──────────────────────────────────────────────────────
  useHotkey(' ', () => {
    if (autoplay) { setAutoplay(null); return; }
    if (busy || bonus || balance.balance < bet) return;
    void spin();
  }, !autoplay && !bonus);

  // Esc closes open sheets / banners.
  useHotkey('Escape', () => {
    if (betSheetOpen) { setBetSheetOpen(false); return; }
    if (autoplaySheetOpen) { setAutoplaySheetOpen(false); return; }
    if (paytableOpen) { setPaytableOpen(false); return; }
    if (buyBonusConfirm) { setBuyBonusConfirm(false); return; }
    if (welcomeSplash) { setWelcomeSplash(false); return; }
    if (autoplay) { setAutoplay(null); return; }
  }, true);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 overflow-hidden text-ink flex flex-col big-juan-stage">
      <BigJuanBackdrop />

      {/* Jackpot tier ribbon — top of screen, Grand → Mini. Values in
       *  currency (× bet). Real Big Juan shows this prominently. */}
      <div className="absolute z-20 left-1/2 -translate-x-1/2 top-12 flex gap-1 px-2 pointer-events-none">
        {(['grand', 'major', 'minor', 'mini'] as const).map((tier) => {
          const c = tier === 'grand' ? '#a78bfa'
            : tier === 'major' ? '#ff5560'
            : tier === 'minor' ? '#ffd166'
            : '#5fb8ff';
          const value = bet * JACKPOTS[tier];
          return (
            <div
              key={tier}
              className="bj-jackpot-tier flex flex-col items-center px-1.5 py-1 rounded-md"
              style={{
                background: `linear-gradient(180deg, ${c}25, rgba(0,0,0,.55))`,
                border: `1px solid ${c}88`,
                boxShadow: `0 0 8px ${c}44, inset 0 1px 0 rgba(255,255,255,.12)`,
                minWidth: '54px',
              }}
            >
              <span className="text-[7px] uppercase tracking-widest font-display font-bold leading-none"
                    style={{ color: c, textShadow: `0 0 4px ${c}88` }}>
                {tier}
              </span>
              <span className="text-[9px] font-mono font-extrabold tabular-nums leading-none mt-0.5"
                    style={{ color: '#fff5e0', textShadow: `0 0 4px ${c}88, 0 1px 1px rgba(0,0,0,.6)` }}>
                {fmtCurrency(value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reels stage */}
      <main className="flex-1 min-h-0 flex items-center justify-center pt-14 pb-2 px-3 relative">
        <div className="relative w-full max-w-md" style={{ aspectRatio: '5 / 4.5' }}>
          <div
            className="absolute inset-0 rounded-2xl p-3 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #2a0810 0%, #5a0810 50%, #14040a 100%)',
              border: '3px solid #c8932e',
              boxShadow:
                '0 0 0 1px rgba(255,209,102,.3), inset 0 1px 0 rgba(255,209,102,.4), inset 0 -8px 18px rgba(0,0,0,.55), 0 12px 30px rgba(0,0,0,.6)',
            }}
          >
            <div className="absolute inset-3 grid grid-cols-5 gap-1.5">
              {grid.map((reel, reelIdx) => {
                const isLastReelAnticipating = reelIdx === 4 && anticipating && spinningReels.has(4);
                return (
                  <div key={reelIdx} className="grid grid-rows-4 gap-1.5 relative">
                    {/* Reel-5 anticipation overlay — pulsing glow when 2+ piñatas on 1-4 */}
                    {isLastReelAnticipating && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none rounded-lg"
                        style={{
                          boxShadow: 'inset 0 0 24px rgba(255,209,102,.65), 0 0 24px rgba(255,209,102,.55)',
                          background: 'radial-gradient(60% 80% at 50% 50%, rgba(255,209,102,.18), transparent 70%)',
                        }}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 0.45, repeat: Infinity }}
                      />
                    )}
                    {reel.map((symId, rowIdx) => {
                      const cellKey = `${reelIdx}:${rowIdx}`;
                      const isWinning = winningCells.has(cellKey);
                      const isActiveWin = activeWin?.positions.some(
                        ([r, ro]) => r === reelIdx && ro === rowIdx,
                      ) ?? false;
                      const isIgniting = igniteCells.has(cellKey);
                      const sym = symbolById(symId);
                      const justRevealed = revealedReels > reelIdx;
                      const cellDelay = justRevealed && busy ? rowIdx * (turbo ? 0.025 : 0.06) : 0;
                      return (
                        <motion.div
                          key={`${cellKey}-${symId}-${isIgniting ? 'ignite' : 'norm'}`}
                          className="relative rounded-lg flex items-center justify-center select-none aspect-square overflow-hidden"
                          initial={
                            justRevealed && busy
                              ? { y: -56, opacity: 0, scale: 0.82 }
                              : false
                          }
                          animate={
                            isIgniting
                              ? {
                                  scale: [1, 1.12, 0.9, 1],
                                  opacity: 1,
                                  filter: [
                                    'brightness(1)',
                                    'brightness(1.6) hue-rotate(-12deg)',
                                    'brightness(2.2) saturate(1.8)',
                                    'brightness(1.3)',
                                  ],
                                }
                              : isActiveWin
                                ? { scale: [1, 1.12, 1], y: 0, opacity: 1 }
                                : isWinning
                                  ? { scale: 1, y: 0, opacity: 1 }
                                  : { y: 0, opacity: 1, scale: 1 }
                          }
                          transition={
                            isIgniting
                              ? { duration: 0.75, ease: 'easeOut' }
                              : isActiveWin
                                ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
                                : justRevealed && busy
                                  ? { duration: turbo ? 0.18 : 0.34, ease: [0.34, 1.2, 0.5, 1], delay: cellDelay }
                                  : { duration: 0.3, ease: 'easeOut' }
                          }
                          style={{
                            background: isIgniting
                              ? 'radial-gradient(circle at 50% 60%, #ffd166 0%, #ff8a40 35%, #c8102e 75%, #5a0810 100%)'
                              : isActiveWin
                                ? `linear-gradient(180deg, ${sym?.color}40, rgba(0,0,0,.35))`
                                : isWinning
                                  ? `linear-gradient(180deg, ${sym?.color}25, rgba(0,0,0,.45))`
                                  : 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.45))',
                            border: isIgniting
                              ? '2px solid #ffd166'
                              : isActiveWin
                                ? `2px solid ${sym?.color}`
                                : isWinning
                                  ? `1.5px solid ${sym?.color}88`
                                  : '1px solid rgba(200,147,46,.2)',
                            boxShadow: isIgniting
                              ? '0 0 24px rgba(255,138,64,.95), inset 0 0 18px rgba(255,209,102,.65)'
                              : isActiveWin
                                ? `0 0 18px ${sym?.color}aa, inset 0 1px 0 rgba(255,255,255,.2)`
                                : isWinning
                                  ? `0 0 8px ${sym?.color}55`
                                  : 'inset 0 1px 0 rgba(255,255,255,.04)',
                          }}
                        >
                          {/* Flame layer that pops over the symbol mid-ignite */}
                          {isIgniting && (
                            <motion.div
                              className="absolute inset-0 pointer-events-none"
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: [0, 1, 0.7, 0], scale: [0.6, 1.3, 1.5, 1.7] }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              style={{
                                background:
                                  'radial-gradient(circle at 50% 60%, rgba(255,255,255,.95) 0%, rgba(255,209,102,.85) 18%, rgba(255,138,64,.7) 40%, rgba(200,16,46,.5) 65%, transparent 85%)',
                                mixBlendMode: 'screen',
                              }}
                            />
                          )}
                          <span
                            className="block w-[78%] h-[78%] sm:w-[82%] sm:h-[82%] relative"
                            style={{
                              filter: isIgniting
                                ? 'drop-shadow(0 0 14px #ffd166) drop-shadow(0 0 22px #ff8a40)'
                                : isActiveWin
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
                );
              })}
            </div>
          </div>

          {/* Active payline overlay */}
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
                  ¡FIESTA!
                </div>
                <div className="text-base mt-1">
                  {showFsTrigger}× PIÑATA · {showFsTrigger === 3 ? 10 : showFsTrigger === 4 ? 12 : 15} RESPINS
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom bar — bet | buy | info | SPIN | turbo | auto */}
      <footer className="relative z-30 flex items-center justify-center gap-1.5 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        <button
          onClick={() => setBetSheetOpen(true)}
          disabled={busy}
          className="flex flex-col items-start px-3 py-2 rounded-xl bg-bg-card/80 backdrop-blur-sm border border-edge disabled:opacity-50 flex-shrink-0 transition active:scale-95 disabled:active:scale-100"
          aria-label="Bet amount"
        >
          <span className="text-[8px] uppercase tracking-widest text-ink-mute">Total bet</span>
          <span className="font-mono font-bold text-sm text-ink tabular-nums">
            {fmtCurrency(bet)}
          </span>
        </button>
        <button
          onClick={() => setBuyBonusConfirm(true)}
          disabled={busy || !!bonus || !!autoplay || balance.balance < buyBonusCost}
          aria-label="Buy bonus"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl border disabled:opacity-50 flex-shrink-0 transition active:scale-95 disabled:active:scale-100"
          style={{
            background: 'linear-gradient(180deg, rgba(255,85,96,.25), rgba(0,0,0,.4))',
            borderColor: 'rgba(255,85,96,.6)',
          }}
        >
          <span className="text-[8px] uppercase tracking-widest text-[#ff8a8a] leading-none">Buy</span>
          <span className="text-[9px] font-mono font-bold text-[#ff8a8a] tabular-nums leading-none mt-0.5">
            {BUY_BONUS_COST_MULTIPLIER}×
          </span>
        </button>
        <button
          onClick={() => setPaytableOpen(true)}
          aria-label="Pay table"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-[#ffd166]/40 text-[#ffd166] text-base flex-shrink-0 transition active:scale-90"
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
          className="flex items-center justify-center w-11 h-11 rounded-full backdrop-blur-sm border text-base flex-shrink-0 transition active:scale-90"
          style={{
            background: turbo ? 'rgba(31,255,122,.2)' : 'rgba(20,20,30,.6)',
            borderColor: turbo ? 'rgba(31,255,122,.6)' : 'rgba(255,255,255,.15)',
            color: turbo ? '#1fff7a' : '#9aa3b2',
          }}
        >
          ⚡
        </button>
        <button
          onClick={() => { if (autoplay) setAutoplay(null); else setAutoplaySheetOpen(true); }}
          disabled={busy || !!bonus}
          aria-label={autoplay ? 'Stop autoplay' : 'Auto-play'}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl border disabled:opacity-50 flex-shrink-0 transition active:scale-95 disabled:active:scale-100"
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

      {/* Last-win pill */}
      {lastResult && lastResult.baseMultiplier > 0 && (
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
          Last win {fmtCurrency(bet * lastResult.baseMultiplier)}
        </div>
      )}

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
          {symbolById(activeWin.symbolId)?.label ?? activeWin.symbolId} ×{activeWin.count} · {activeWin.multiplier}× bet
        </div>
      )}

      {/* Bet sheet — coin value × coins per line × 40 */}
      <BetSheet
        open={betSheetOpen}
        onClose={() => setBetSheetOpen(false)}
        coinValue={coinValue}
        coinsPerLine={coinsPerLine}
        onCoinValue={setCoinValue}
        onCoinsPerLine={setCoinsPerLine}
      />

      {/* Bonus respins overlay */}
      <AnimatePresence>
        {bonus && (
          <BigJuanBonusRound
            bet={bet}
            scatterCount={bonus.scatterCount}
            initialRespinsOverride={bonus.initialRespinsOverride}
            seeds={bonus.seeds}
            onClose={resolveBonus}
          />
        )}
      </AnimatePresence>

      {/* Pay table modal */}
      <Paytable
        open={paytableOpen}
        onClose={() => setPaytableOpen(false)}
        bet={bet}
      />

      {/* Welcome splash */}
      <AnimatePresence>
        {welcomeSplash && (
          <motion.button
            type="button"
            onClick={() => setWelcomeSplash(false)}
            className="absolute inset-0 z-[150] flex flex-col items-center justify-center text-center p-6"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(120,16,46,.92), rgba(15,5,5,.98) 70%)',
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

      {/* Big-win banner — uses BIG_WIN_TIERS for label + duration */}
      <AnimatePresence>
        {bigWin && (
          <motion.div
            className="fixed inset-0 z-[170] flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background:
                bigWin.tier.name === 'max'
                  ? 'radial-gradient(70% 60% at 50% 45%, rgba(255,209,102,.55) 0%, rgba(200,16,46,.7) 35%, rgba(0,0,0,.92) 100%)'
                  : bigWin.tier.name === 'epic'
                    ? 'radial-gradient(70% 60% at 50% 45%, rgba(255,209,102,.4) 0%, rgba(200,16,46,.55) 40%, rgba(0,0,0,.85) 100%)'
                    : bigWin.tier.name === 'huge' || bigWin.tier.name === 'super'
                      ? 'radial-gradient(70% 60% at 50% 45%, rgba(255,209,102,.32) 0%, rgba(0,0,0,.82) 100%)'
                      : bigWin.tier.name === 'mega'
                        ? 'radial-gradient(70% 60% at 50% 45%, rgba(255,209,102,.25) 0%, rgba(0,0,0,.7) 100%)'
                        : 'radial-gradient(70% 60% at 50% 45%, rgba(255,209,102,.2) 0%, rgba(0,0,0,.6) 100%)',
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
                fontSize:
                  bigWin.tier.name === 'max' ? 'clamp(40px, 13vw, 78px)'
                  : bigWin.tier.name === 'epic' ? 'clamp(36px, 11vw, 64px)'
                  : bigWin.tier.name === 'huge' || bigWin.tier.name === 'super' ? 'clamp(34px, 10vw, 60px)'
                  : bigWin.tier.name === 'mega' ? 'clamp(32px, 9vw, 56px)'
                  : 'clamp(28px, 8vw, 48px)',
                background: bigWin.tier.name === 'max' || bigWin.tier.name === 'epic'
                  ? 'linear-gradient(180deg, #fff5c4 0%, #ffd166 30%, #ff5560 65%, #c8102e 100%)'
                  : 'linear-gradient(180deg, #fff5c4 0%, #ffd166 50%, #c8932e 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter:
                  bigWin.tier.name === 'max'
                    ? 'drop-shadow(0 0 36px rgba(255,209,102,.95)) drop-shadow(0 0 64px rgba(255,85,96,.85)) drop-shadow(0 4px 8px rgba(0,0,0,.6))'
                    : bigWin.tier.name === 'epic'
                      ? 'drop-shadow(0 0 28px rgba(255,209,102,.95)) drop-shadow(0 0 48px rgba(255,85,96,.7)) drop-shadow(0 4px 8px rgba(0,0,0,.6))'
                      : 'drop-shadow(0 0 24px rgba(255,209,102,.9)) drop-shadow(0 4px 8px rgba(0,0,0,.6))',
              }}
            >
              {bigWin.tier.label}
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
            <motion.div
              className="text-[10px] uppercase tracking-[0.32em] text-[#FFE0A8] mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ delay: 0.5 }}
            >
              tap anywhere to dismiss
            </motion.div>
            {/* Click-through layer to dismiss early */}
            <button
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={() => setBigWin(null)}
              style={{ pointerEvents: 'auto', background: 'transparent' }}
              aria-label="Dismiss banner"
            />
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
              aria-label="Cancel autoplay"
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
              <div className="grid grid-cols-4 gap-2">
                {AUTOPLAY_OPTIONS.map((n) => (
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
                Auto-play pauses during the bonus round and on Big Win+.
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[160] w-[min(92vw,360px)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl p-5"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{
                background: 'radial-gradient(80% 60% at 50% 38%, #c8102e 0%, #5a0810 60%, #14040a 100%)',
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
                Enter the Respins feature with 4 or 5 piñatas
              </div>
              <div className="flex justify-around mb-4">
                <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-black/40 border border-[#ffd166]/30">
                  <span className="text-[8px] uppercase tracking-widest text-ink-mute">You get</span>
                  <span className="inline-block" style={{ width: 28, height: 28 }}>
                    <PinataSvg />
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#ffd166]">4 or 5×</span>
                </div>
                <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-black/40 border border-[#ff8a8a]/30">
                  <span className="text-[8px] uppercase tracking-widest text-ink-mute">Cost</span>
                  <span className="font-mono font-bold text-lg text-[#ff8a8a] tabular-nums">
                    {fmtCurrency(buyBonusCost)}
                  </span>
                  <span className="text-[10px] text-ink-mute">{BUY_BONUS_COST_MULTIPLIER}× bet</span>
                </div>
              </div>
              <div className="text-[10px] text-ink-mute text-center mb-4 leading-relaxed">
                Buy RTP 96.53%. 4-scatter entry is more common than 5.
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
    </div>
  );
}

// =============================================================================
// Symbol renderer
// =============================================================================

function renderBigJuanSymbol(symId: string) {
  switch (symId) {
    case 'juan':      return <BigJuanSvg />;
    case 'senorita':  return <SenoritaSvg />;
    case 'chihuahua': return <ChihuahuaSvg />;
    case 'vihuela':   return <GuitarSvg />;
    case 'hot_sauce': return <HotSauceSvg />;
    case 'chili':     return <ChilliSvg />;
    case 'pinata':    return <span className="bj-pinata-sway block w-full h-full"><PinataSvg /></span>;
    case 'A':         return <RoyalSvg letter="A"  color="#ff5560" />;
    case 'K':         return <RoyalSvg letter="K"  color="#ffd166" />;
    case 'Q':         return <RoyalSvg letter="Q"  color="#ff7ad9" />;
    case 'J':         return <RoyalSvg letter="J"  color="#1fff7a" />;
    case '10':        return <RoyalSvg letter="10" color="#5fb8ff" />;
  }
  return null;
}

function makeBlankGrid(): TGrid {
  const fillers = ['A', 'K', 'Q', 'J', '10', 'vihuela', 'hot_sauce', 'chihuahua'];
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

// =============================================================================
// Payline overlay
// =============================================================================

function PaylineOverlay({ line, color }: { line: number[]; color: string }) {
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

// =============================================================================
// Bet sheet — coin value × coins per line × 40 paylines
// =============================================================================

function BetSheet({
  open, onClose, coinValue, coinsPerLine, onCoinValue, onCoinsPerLine,
}: {
  open: boolean;
  onClose: () => void;
  coinValue: number;
  coinsPerLine: number;
  onCoinValue: (v: number) => void;
  onCoinsPerLine: (v: number) => void;
}) {
  const total = useMemo(() => totalBetFor(coinValue, coinsPerLine), [coinValue, coinsPerLine]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close bet"
          />
          <motion.div
            className="fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl bg-bg-card border-t border-edge p-4 max-w-md mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-widest text-ink-mute">Bet</div>
              <div className="text-[10px] uppercase tracking-widest text-[#ffd166]">
                {PAYLINE_COUNT} lines · {fmtCurrency(BET_MIN)}–{fmtCurrency(BET_MAX)}
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-ink-mute">Coin value</span>
                <span className="font-mono font-bold text-sm text-[#ffd166] tabular-nums">
                  {fmtCurrency(coinValue)}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {COIN_VALUES.map((v) => (
                  <button
                    key={v}
                    onClick={() => onCoinValue(v)}
                    className={`py-2 rounded-lg font-mono font-bold text-[11px] tabular-nums transition ${
                      coinValue === v
                        ? 'bg-[#ffd166] text-[#1a0a04] shadow-[0_0_10px_rgba(255,209,102,.55)]'
                        : 'bg-bg-elev border border-edge text-ink-dim'
                    }`}
                  >
                    {fmtCurrency(v)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-ink-mute">Coins per line</span>
                <span className="font-mono font-bold text-sm text-[#ffd166] tabular-nums">
                  {coinsPerLine}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {COINS_PER_LINE.map((v) => (
                  <button
                    key={v}
                    onClick={() => onCoinsPerLine(v)}
                    className={`py-2 rounded-lg font-mono font-bold text-[11px] tabular-nums transition ${
                      coinsPerLine === v
                        ? 'bg-[#ffd166] text-[#1a0a04] shadow-[0_0_10px_rgba(255,209,102,.55)]'
                        : 'bg-bg-elev border border-edge text-ink-dim'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-3 bg-black/30 border border-[#ffd166]/30 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                Total bet
              </div>
              <div className="font-mono font-extrabold text-xl tabular-nums text-[#ffd166]">
                {fmtCurrency(total)}
              </div>
            </div>
            <div className="text-[9px] text-ink-mute text-center mt-2">
              {fmtCurrency(coinValue)} × {coinsPerLine} × 40 lines
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Paytable modal
// =============================================================================

function Paytable({
  open, onClose, bet,
}: {
  open: boolean; onClose: () => void; bet: number;
}) {
  // Group symbols for display: lows together, highs individually, wild + scatter
  const lowsForDisplay = SYMBOLS.filter((s) => s.kind === 'low');
  const highsForDisplay = SYMBOLS.filter((s) => s.kind === 'high');
  const wild = SYMBOLS.find((s) => s.kind === 'wild');
  const scatter = SYMBOLS.find((s) => s.kind === 'scatter');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close paytable"
          />
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[160] w-[min(94vw,440px)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl p-5"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            style={{
              background: 'linear-gradient(180deg, #2a0810 0%, #5a0810 50%, #14040a 100%)',
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
                onClick={onClose}
                className="text-ink-mute hover:text-ink text-xl px-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Game info */}
            <div className="rounded-xl p-3 mb-4 bg-black/40 border border-[#ffd166]/30">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="RTP" value="96.70%" color="#ffd166" />
                <Stat label="Volatility" value="5/5" color="#ff5560" />
                <Stat label="Max Win" value="2,600×" color="#ffd166" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Grid" value="5×4" color="#fff5c4" />
                <Stat label="Lines" value={String(PAYLINE_COUNT)} color="#fff5c4" />
                <Stat label="Buy RTP" value="96.53%" color="#ff8a8a" />
              </div>
            </div>

            {/* High pays */}
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">
              High pays · 3 / 4 / 5 on a line (× total bet)
            </div>
            <div className="space-y-1 mb-3">
              {highsForDisplay.map((s) => (
                <PayRow key={s.id} sym={s} />
              ))}
            </div>

            {/* Low pays — all five share the same pay row */}
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">
              Card pays · 3 / 4 / 5 on a line (× total bet) — all 5 share this row
            </div>
            <div
              className="rounded-lg p-2 flex items-center gap-2 mb-3"
              style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,209,102,.15)' }}
            >
              <div className="flex -space-x-2">
                {lowsForDisplay.map((s) => (
                  <span key={s.id} className="w-7 h-7 inline-block" style={{ filter: `drop-shadow(0 0 3px ${s.color}aa)` }}>
                    {renderBigJuanSymbol(s.id)}
                  </span>
                ))}
              </div>
              <span className="flex-1 text-xs text-ink-dim ml-2">10 / J / Q / K / A</span>
              <span className="font-mono font-bold text-xs tabular-nums text-[#ffd166]">
                0.125× · 0.25× · 1.00×
              </span>
            </div>

            {/* Wild */}
            {wild && (
              <div
                className="rounded-lg p-3 mb-2"
                style={{ background: 'rgba(255,85,96,.15)', border: '1px solid rgba(255,85,96,.4)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8">{renderBigJuanSymbol('chili')}</span>
                  <span className="font-bold text-sm text-[#ff8a8a]">Red Chili WILD</span>
                  <span className="ml-auto font-mono font-bold text-xs tabular-nums text-[#ff8a8a]">
                    1.25× · 3.75× · 12.50×
                  </span>
                </div>
                <div className="text-[10px] text-ink-dim mt-1 leading-relaxed">
                  Substitutes for any non-scatter symbol. Pays as its own symbol at the top tier.
                  <strong className="text-[#ff8a8a]"> Wild Switch:</strong> when 6+ identical symbols
                  land entirely on reels 2-3-4, all of them transform into Chili Wilds — paylines
                  re-evaluate for a second pay. Tie-break: highest-paying symbol wins.
                </div>
              </div>
            )}

            {/* Scatter */}
            {scatter && (
              <div
                className="rounded-lg p-3 mb-3"
                style={{ background: 'rgba(255,209,102,.12)', border: '1px solid rgba(255,209,102,.4)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8">{renderBigJuanSymbol('pinata')}</span>
                  <span className="font-bold text-sm text-[#ffd166]">Piñata SCATTER</span>
                </div>
                <div className="text-[10px] text-ink-dim mt-1 leading-relaxed">
                  Pays nothing by itself. <strong className="text-[#ffd166]">3 / 4 / 5 piñatas</strong>{' '}
                  anywhere trigger the Respins feature with{' '}
                  <strong className="text-[#ffd166]">10 / 12 / 15</strong> respins.
                </div>
              </div>
            )}

            {/* Respins jackpots */}
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">
              Respins jackpots (× total bet)
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(['mini', 'minor', 'major', 'grand'] as const).map((tier) => {
                const c = tier === 'grand' ? '#a78bfa'
                  : tier === 'major' ? '#ff5560'
                  : tier === 'minor' ? '#ffd166'
                  : '#5fb8ff';
                const need = tier === 'mini' ? 3 : tier === 'minor' ? 4 : 5;
                return (
                  <div
                    key={tier}
                    className="flex flex-col items-center px-2 py-2 rounded-lg"
                    style={{ background: `${c}15`, border: `1px solid ${c}66` }}
                  >
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: c }}>
                      {tier}
                    </span>
                    <span className="font-mono font-bold text-sm tabular-nums mt-0.5" style={{ color: c }}>
                      {JACKPOTS[tier]}×
                    </span>
                    <span className="text-[8px] uppercase tracking-widest text-ink-mute mt-0.5">
                      need {need}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Respins explainer */}
            <div className="rounded-lg p-3 mb-3 bg-black/30 border border-[#ffd166]/20">
              <div className="text-[11px] font-bold text-[#ffd166] mb-1">Respins feature</div>
              <div className="text-[10px] text-ink-dim leading-relaxed">
                3×3 grid with a sticky <strong>Money Bag</strong> in the center starting at 1× bet.
                Each respin a separate <strong>4th reel</strong> lands one of three outcomes:
                <span className="block mt-1.5">
                  <strong className="text-[#ffd166]">WIN</strong> — collect all visible coins + bag,
                  jackpot meters tick, +1-respin tokens add.
                </span>
                <span className="block mt-1">
                  <strong className="text-[#ff8a40]">BOOST</strong> — coins on the grid are added{' '}
                  permanently to the Money Bag (grows for future Wins).
                </span>
                <span className="block mt-1">
                  <strong className="text-ink-mute">BLANK</strong> — nothing collects; respin -1.
                </span>
                <span className="block mt-1.5">
                  Coin values: 1× / 2× / 3× / 5× / 10× / 15× / 20× / 25× / 50× / 100× / 250× bet.
                </span>
              </div>
            </div>

            {/* Sample multiplier preview */}
            <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">
              At your current bet ({fmtCurrency(bet)})
            </div>
            <div className="rounded-lg p-3 bg-black/30 border border-edge text-[10px] grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-ink-mute">Buy Bonus cost</div>
                <div className="font-mono font-bold text-[#ff8a8a]">
                  {fmtCurrency(bet * BUY_BONUS_COST_MULTIPLIER)}
                </div>
              </div>
              <div>
                <div className="text-ink-mute">Max win possible</div>
                <div className="font-mono font-bold text-[#ffd166]">
                  {fmtCurrency(bet * 2600)}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[8px] uppercase tracking-widest text-ink-mute">{label}</div>
      <div className="font-mono font-bold text-sm" style={{ color }}>{value}</div>
    </div>
  );
}

function PayRow({ sym }: { sym: SymbolDef }) {
  if (!sym.pay) return null;
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
      style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,209,102,.15)' }}
    >
      <span className="w-8 h-8 flex items-center justify-center">
        <span style={{ filter: `drop-shadow(0 0 4px ${sym.color}aa)` }}>
          {renderBigJuanSymbol(sym.id)}
        </span>
      </span>
      <span className="flex-1 text-xs text-ink-dim">{sym.label}</span>
      <span className="font-mono font-bold text-xs tabular-nums" style={{ color: sym.color }}>
        {sym.pay[3]}× · {sym.pay[4]}× · {sym.pay[5]}×
      </span>
    </div>
  );
}

// =============================================================================
// Backdrop — fiesta cantina scene (papel picado, string lights, sunset)
// =============================================================================

function BigJuanBackdrop() {
  return (
    <div className="absolute inset-0 -z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(80% 60% at 50% 38%, #ff8a55 0%, #c8102e 30%, #5a0810 60%, #14040a 85%, #02010a 100%)',
        }}
      />
      {/* Distant village silhouette */}
      <svg
        className="absolute inset-x-0"
        style={{ top: '32%', height: '5%', width: '100%', opacity: 0.6 }}
        viewBox="0 0 100 5"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 5 L 0 3 L 4 3 L 4 1.5 L 8 1.5 L 8 3 L 12 3 L 12 2 L 18 2 L 18 3.4 L 22 3.4 L 22 1.8 L 28 1.8 L 28 3 L 34 3 L 34 2.2 L 40 2.2 L 40 3.4 L 46 3.4 L 46 1.6 L 52 1.6 L 52 3 L 58 3 L 58 2 L 64 2 L 64 3.4 L 70 3.4 L 70 1.8 L 76 1.8 L 76 3 L 82 3 L 82 2.2 L 88 2.2 L 88 3.4 L 94 3.4 L 94 2 L 100 2 L 100 5 Z"
          fill="#1a0408"
        />
      </svg>
      {/* Spotlight glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(40% 30% at 30% 22%, rgba(255,180,100,.32), transparent 70%),
            radial-gradient(40% 30% at 70% 22%, rgba(255,180,100,.32), transparent 70%),
            radial-gradient(60% 30% at 50% 60%, rgba(255,209,102,.20), transparent 75%)
          `,
          mixBlendMode: 'screen',
          animation: 'bjSpotlightPulse 3.4s ease-in-out infinite',
        }}
      />
      {/* Stage glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%', top: '46%', transform: 'translate(-50%, -50%)',
          width: '92%', height: '50%',
          background: 'radial-gradient(ellipse at center, rgba(255,209,102,.32) 0%, rgba(255,150,80,.18) 40%, transparent 75%)',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />
      {/* String lights */}
      <svg
        className="absolute inset-x-0"
        style={{ top: '12%', height: '4%', width: '100%' }}
        viewBox="0 0 100 4"
        preserveAspectRatio="none"
      >
        <path d="M 0 1 Q 25 2.4 50 1.6 T 100 1" fill="none" stroke="rgba(0,0,0,.5)" strokeWidth=".15" />
        {(() => {
          const colors = ['#ff5560', '#ffd166', '#1fff7a', '#5fb8ff', '#c042b8', '#ffae50'];
          const N = 22;
          return Array.from({ length: N }).map((_, i) => {
            const x = (i + 0.5) * (100 / N);
            const yWire = x < 50 ? 1 + 1.4 * (1 - Math.abs(x - 25) / 25) : 1 + 1.4 * (1 - Math.abs(x - 75) / 25);
            const color = colors[i % colors.length]!;
            return (
              <g key={i}>
                <line x1={x} y1={yWire} x2={x} y2={yWire + 0.3} stroke="#222" strokeWidth=".1" />
                <ellipse
                  cx={x} cy={yWire + 0.7} rx="0.35" ry="0.5"
                  fill={color} opacity={0.9}
                  style={{
                    filter: `drop-shadow(0 0 1.2px ${color})`,
                    animation: `bjBulbTwinkle 1.${(i % 9) + 1}s ease-in-out infinite`,
                    animationDelay: `${(i * 0.13).toFixed(2)}s`,
                  }}
                />
              </g>
            );
          });
        })()}
      </svg>
      {/* Adobe walls left + right */}
      <div className="absolute" style={{ left: 0, top: '14%', bottom: '12%', width: '4%', background: 'linear-gradient(90deg, rgba(60,16,8,.85), rgba(120,40,16,.5) 60%, transparent 100%)' }} />
      <div className="absolute" style={{ right: 0, top: '14%', bottom: '12%', width: '4%', background: 'linear-gradient(270deg, rgba(60,16,8,.85), rgba(120,40,16,.5) 60%, transparent 100%)' }} />
      {/* Papel picado bunting */}
      <svg
        className="absolute inset-x-0"
        style={{ top: '3%', height: '7%', width: '100%', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.4))', opacity: 0.92 }}
        viewBox="0 0 100 7"
        preserveAspectRatio="none"
      >
        <path d="M 0 1 Q 25 2.4 50 1.4 T 100 1" fill="none" stroke="rgba(0,0,0,.6)" strokeWidth=".15" />
        {(() => {
          const colors = ['#ff5560', '#1fff7a', '#5fb8ff', '#ffd166', '#c042b8', '#ffae50'];
          const N = 16;
          return Array.from({ length: N }).map((_, i) => {
            const x = (i + 0.5) * (100 / N);
            const yTop = x < 50 ? 1 + 1.4 * (1 - Math.abs(x - 25) / 25) : 1 + 1.4 * (1 - Math.abs(x - 75) / 25);
            const w = 100 / N - 0.6;
            const color = colors[i % colors.length]!;
            const tipY = yTop + 4;
            const cx = x;
            const cy = yTop + 2;
            return (
              <g key={i}>
                <path
                  d={`M ${cx - w / 2} ${yTop} L ${cx + w / 2} ${yTop} L ${cx} ${tipY} Z`}
                  fill={color} stroke="rgba(0,0,0,.45)" strokeWidth=".08" opacity=".92"
                />
                <path d={`M ${cx} ${cy - 0.55} L ${cx + 0.45} ${cy} L ${cx} ${cy + 0.55} L ${cx - 0.45} ${cy} Z`} fill="rgba(0,0,0,.35)" />
                <circle cx={cx - 0.85} cy={cy + 0.2} r=".16" fill="rgba(0,0,0,.3)" />
                <circle cx={cx + 0.85} cy={cy + 0.2} r=".16" fill="rgba(0,0,0,.3)" />
                <path d={`M ${cx - w / 2 + 0.1} ${yTop + 0.15} L ${cx} ${tipY - 0.2}`} stroke="rgba(255,255,255,.35)" strokeWidth=".1" />
              </g>
            );
          });
        })()}
      </svg>
      {/* Floating confetti sparks */}
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
            left: c.left, bottom: '-10%',
            width: `${c.size}px`, height: `${c.size * 1.8}px`,
            background: c.color, borderRadius: '1px',
            boxShadow: `0 0 4px ${c.color}aa`,
            animation: `bigJuanConfetti ${c.dur}s linear ${c.delay}s infinite`,
            mixBlendMode: 'screen',
          }}
        />
      ))}
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(80% 80% at 50% 50%, transparent 60%, rgba(0,0,0,.6) 100%)' }}
      />
    </div>
  );
}
