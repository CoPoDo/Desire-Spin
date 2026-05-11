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
import { SpinReel, type SpinReelHandle } from './SpinReel';
import { JuanCharacter, type JuanMood } from './JuanCharacter';
import { animateCountUp } from './winCounter';

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
  /** Last result. The UI uses it for the win-cycle, last-win pill,
   *  and the scatter status badge. */
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set());
  const [activeWin, setActiveWin] = useState<WinLine | null>(null);
  /** Reel-5 anticipation glow flag — managed at the parent level so the
   *  glow can fade in/out independently of the SpinReel's internal
   *  animation. */
  const [anticipating, setAnticipating] = useState(false);
  /** FS trigger banner. Number is scatter count (3/4/5). */
  const [showFsTrigger, setShowFsTrigger] = useState<number | null>(null);
  /** Multi-phase trigger animation per bible Part 8.1:
   *    'pulse'  → piñatas pulse + Juan reacts (1.4-1.8s)
   *    'banner' → BONUS! + respin-count banner (2.2-2.5s)
   *    null     → idle / mount the bonus
   *  Tracked alongside showFsTrigger so the rendered banner content
   *  can match the current phase. */
  const [triggerPhase, setTriggerPhase] = useState<'pulse' | 'banner' | null>(null);
  const [showWildSwitch, setShowWildSwitch] = useState(false);
  /** Wild-switch positions in flame mid-transition (for the burst-into-flames
   *  visual). When set, those cells animate; cleared once the new grid lands. */
  const [igniteCells, setIgniteCells] = useState<Set<string>>(new Set());
  /** Animated Big Juan mascot reaction state. Driven by spin outcomes:
   *  bonus trigger → pistols, big win → cheer, dry spin → bored. */
  const [juanMood, setJuanMood] = useState<JuanMood>('idle');
  /** Visible win display. Animated by animateCountUp; reset to 0 on
   *  each spin start. */
  const [winDisplay, setWinDisplay] = useState(0);
  const winDisplayElRef = useRef<HTMLSpanElement>(null);
  const winValueRef = useRef(0);
  useEffect(() => { winValueRef.current = winDisplay; }, [winDisplay]);

  /** Refs to each of the 5 SpinReels — used by spin() to call into the
   *  imperative strip animation on each reel with the right options. */
  const reelRefs = useRef<(SpinReelHandle | null)[]>([null, null, null, null, null]);

  /** Measured cell pixel dimensions. The CSS sets --bj-cell-h /
   *  --bj-cell-gap on the reel-bank from these values, and SpinReel
   *  receives them per-spin so the strip's final translateY math
   *  matches the actually-rendered cell stride.
   *
   *  We derive cell height from the spin-reel viewport's *measured*
   *  height (which comes from the parent's aspect-ratio'd height), not
   *  from cell width. This way the reels always fit inside the frame
   *  on every screen size — even narrow phones — so the footer
   *  buttons never get pushed off-screen. */
  const reelBankRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState({ height: 60, gap: 6 });
  useEffect(() => {
    const el = reelBankRef.current;
    if (!el) return;
    const recompute = () => {
      // Look at the first spin-reel viewport to find the height
      // available for 4 cells + 3 gaps.
      const firstReel = el.querySelector('.spin-reel') as HTMLElement | null;
      const viewportH = firstReel?.clientHeight ?? el.clientHeight;
      const gap = 6;
      if (viewportH <= 0) return;
      const cellH = Math.max(36, Math.floor((viewportH - gap * 3) / 4));
      el.style.setProperty('--bj-cell-h', `${cellH}px`);
      el.style.setProperty('--bj-cell-gap', `${gap}px`);
      setCellPx((prev) => (prev.height === cellH && prev.gap === gap ? prev : { height: cellH, gap }));
    };
    // Wait one frame so the layout has settled (the spin-reel's
    // height comes from its parent's aspect-ratio'd height).
    requestAnimationFrame(recompute);
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    setJuanMood('idle');
    // Reset the visible win display to zero at the start of every spin.
    setWinDisplay(0);
    winValueRef.current = 0;
    if (winDisplayElRef.current) winDisplayElRef.current.textContent = fmtCurrency(0);
    sound.play('click');
    balance.debit(bet);

    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng);

    // ── Drive each SpinReel imperatively per the bible Part 4 spec.
    //    Reel-to-reel stagger + each reel spins longer than the last;
    //    reel 5 gets two-phase anticipation when 2+ piñatas already
    //    visible on reels 1-4 (spec §10b.2). ───────────────────────
    const reelStaggerMs = turbo ? 60 : 130;
    const baseDurationMs = turbo ? 360 : 900;
    const perReelIncrementMs = turbo ? 50 : 110;

    // Bible Part 4.4: build all final symbol arrays, then start each reel
    // with a stagger. We use Promise.all so the staggered starts run
    // concurrently but spin() awaits them all.
    const reelPromises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      const isLast = i === 4;
      const useAnticipation = isLast && r.anticipation;
      // Reel duration grows with each reel — the bible's reel-5 always
      // lands last for tension. Anticipation adds a slow tail.
      let duration = baseDurationMs + i * perReelIncrementMs;
      if (useAnticipation) duration += turbo ? 600 : 1200;

      const p = (async () => {
        await new Promise<void>((res) => setTimeout(res, i * reelStaggerMs));
        if (useAnticipation) {
          setAnticipating(true);
          sound.play('big-win'); // anticipation horn sting
        }
        await reelRefs.current[i]?.spin(r.initialGrid[i]!, {
          durationMs: duration,
          anticipation: useAnticipation,
          cellHeight: cellPx.height,
          cellGap: cellPx.gap,
          reelIndex: i,
        });
        sound.play('drop');
        if (isLast) setAnticipating(false);
      })();
      reelPromises.push(p);
    }
    await Promise.all(reelPromises);

    // Promote the React rest-view to the pre-switch grid. (SpinReel
    // hands off cleanly: its imperative strip is now empty + hidden,
    // and the React grid takes over the display.)
    setGrid(r.initialGrid);

    // ── Pay pre-switch line wins (spec §5: paid first, BEFORE switch) ──
    let runningCredit = 0;
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
          // Animate the count-up on the visible WIN display.
          runningCredit += prePayout;
          if (winDisplayElRef.current) {
            await animateCountUp(
              winDisplayElRef.current,
              winValueRef.current,
              runningCredit,
              (n) => fmtCurrency(n),
              { bet, durationMs: turbo ? 600 : 1500 },
            );
            winValueRef.current = runningCredit;
            setWinDisplay(runningCredit);
          }
        }
      }
      // Brief pause to let the player see the line wins before switch.
      await new Promise<void>((res) => setTimeout(res, turbo ? 200 : 400));
    }

    // ── Wild Switch (if triggered) — spec §6 + §10b.4 ──────────────
    if (r.wildSwitch.switched) {
      const positions = r.wildSwitch.positions;
      const igniteSet = new Set(positions.map(([reel, row]) => `${reel}:${row}`));
      setIgniteCells(igniteSet);
      setShowWildSwitch(true);
      sound.play('mega-win');
      // Flame burst beat (~600-900ms).
      await new Promise<void>((res) => setTimeout(res, turbo ? 500 : 900));
      // Transform cells: swap to the post-switch grid.
      setGrid(r.grid);
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
            runningCredit += postPayout;
            if (winDisplayElRef.current) {
              await animateCountUp(
                winDisplayElRef.current,
                winValueRef.current,
                runningCredit,
                (n) => fmtCurrency(n),
                { bet, durationMs: turbo ? 600 : 1500 },
              );
              winValueRef.current = runningCredit;
              setWinDisplay(runningCredit);
            }
          }
        }
      }
      setTimeout(() => setShowWildSwitch(false), 1400);
      await new Promise<void>((res) => setTimeout(res, turbo ? 200 : 400));
    }

    // ── Headline result + big-win banner ────────────────────────────
    const winSet = new Set<string>();
    for (const w of r.wins) for (const [reel, row] of w.positions) winSet.add(`${reel}:${row}`);
    setWinningCells(winSet);
    setLastResult(r);

    const baseMult = r.baseMultiplier;
    const basePayout = +(bet * baseMult).toFixed(2);

    // Big-win tier banner — spec §10b.10 thresholds. Juan reacts.
    const tier = bigWinTierFor(baseMult);
    if (tier) {
      setBigWin({ payout: basePayout, tier });
      setJuanMood(tier.name === 'max' || tier.name === 'epic' ? 'pistols' : 'cheer');
      const dismissMs = turbo ? Math.max(2200, tier.durationMs * 0.6) : tier.durationMs;
      setTimeout(() => setBigWin(null), dismissMs);
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

    // ── Bonus trigger (3+ scatters) — spec §10b.5 / bible Part 8.1 ──
    //
    //  Multi-phase trigger sequence:
    //    Phase 1 "pulse"  — scatter cells throb + Juan fires pistols
    //                       (1.4-1.8s).
    //    Phase 2 "banner" — BONUS! + N FREE RESPINS banner sweeps in
    //                       (2.2-2.5s).
    //    Phase 3 — mount the bonus overlay (3x3 grid slides in).
    //
    //  Turbo compresses the durations by ~40% but does not skip any
    //  phase — bible Part 10b.14 says celebrations are LOCKED. */
    if (r.triggersBonus) {
      setJuanMood('pistols');
      setShowFsTrigger(r.scatterCount);
      setTriggerPhase('pulse');
      sound.play('free-spins-trigger');
      const pulseMs = turbo ? 850 : 1500;
      const bannerMs = turbo ? 1400 : 2200;
      setTimeout(() => {
        if (!aliveRef.current) return;
        setTriggerPhase('banner');
        sound.play('big-win');
      }, pulseMs);
      setTimeout(() => {
        if (!aliveRef.current) return;
        setShowFsTrigger(null);
        setTriggerPhase(null);
        const bonusSeeds = fairness.consumeNonce();
        setBonus({ scatterCount: r.scatterCount, seeds: bonusSeeds });
      }, pulseMs + bannerMs);
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
    setTriggerPhase('pulse');
    sound.play('free-spins-trigger');
    setJuanMood('pistols');
    const pulseMs = turbo ? 700 : 1300;
    const bannerMs = turbo ? 1300 : 1800;
    setTimeout(() => {
      if (!aliveRef.current) return;
      setTriggerPhase('banner');
      sound.play('big-win');
    }, pulseMs);
    setTimeout(() => {
      if (!aliveRef.current) return;
      setShowFsTrigger(null);
      setTriggerPhase(null);
      const bonusSeeds = fairness.consumeNonce();
      setBonus({
        scatterCount: entry.scatters,
        initialRespinsOverride: entry.respinsAwarded,
        seeds: bonusSeeds,
      });
    }, pulseMs + bannerMs);
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

      {/* Reels stage. The frame container has aspect-ratio so its height
       *  is derived from its width — for 5 columns × 4 rows of roughly-
       *  square cells with 12px frame padding + 6px gaps, the natural
       *  ratio works out to ~1.18:1. We sit slightly wider (1.22) so
       *  the footer always has room below on narrow phones.
       *  pt-12 keeps the jackpot ribbon clear; main is flex-1 so it
       *  absorbs slack on tall phones without pushing the footer down. */}
      <main className="flex-1 min-h-0 flex items-center justify-center pt-[88px] pb-2 px-3 relative">
        <div className="relative w-full max-w-md" style={{ aspectRatio: '1.22 / 1' }}>
          <div
            className="absolute inset-0 rounded-2xl p-3 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #2a0810 0%, #5a0810 50%, #14040a 100%)',
              border: '3px solid #c8932e',
              boxShadow:
                '0 0 0 1px rgba(255,209,102,.3), inset 0 1px 0 rgba(255,209,102,.4), inset 0 -8px 18px rgba(0,0,0,.55), 0 12px 30px rgba(0,0,0,.6)',
            }}
          >
            {/* Bible Part 4: viewport-and-strip pattern. Each reel is a
             *  fixed-size viewport (.spin-reel) with overflow:hidden.
             *  During the spin the SpinReel paints an imperative strip
             *  of symbols and animates translateY; at rest the React
             *  cells with hero SVG art and class-driven highlights
             *  take over (.bj-rest-cells). The bank wraps all five
             *  reels so the --bj-cell-h / --bj-cell-gap CSS variables
             *  apply consistently. */}
            <div
              ref={reelBankRef}
              className="bj-reel-bank absolute inset-3 grid grid-cols-5 gap-1.5"
            >
              {grid.map((reelSymbols, reelIdx) => {
                const winningRows = new Set<number>();
                for (const w of lastResult?.wins ?? []) {
                  for (const [r2, row] of w.positions) {
                    if (r2 === reelIdx) winningRows.add(row);
                  }
                }
                // Recompute from current winningCells too (the active
                // post-Wild-Switch set, which may differ from lastResult).
                for (const key of winningCells) {
                  const [r2, row] = key.split(':').map(Number);
                  if (r2 === reelIdx) winningRows.add(row!);
                }
                const activeWinRow = activeWin ? (activeWin.positions.find(([r2]) => r2 === reelIdx)?.[1] ?? null) : null;
                const igniteRows = new Set<number>();
                for (const key of igniteCells) {
                  const [r2, row] = key.split(':').map(Number);
                  if (r2 === reelIdx) igniteRows.add(row!);
                }
                return (
                  <SpinReel
                    key={reelIdx}
                    reelIndex={reelIdx}
                    ref={(h) => { reelRefs.current[reelIdx] = h; }}
                    symbols={reelSymbols}
                    winningRows={winningRows}
                    activeWinRow={activeWinRow}
                    igniteRows={igniteRows}
                    renderCell={renderBigJuanSymbol}
                    fillerPool={REEL_FILLER_POOL}
                    showAnticipationGlow={reelIdx === 4 && anticipating}
                  />
                );
              })}
            </div>
          </div>

          {/* Active payline overlay — drawn polyline animates across the
           *  cells of the active win. SVG overlay sits over the wood
           *  frame so it stays anchored to the reels even during win
           *  cycling. */}
          {activeWin && (
            <PaylineOverlay
              line={PAYLINES[activeWin.lineIndex]!}
              color={symbolById(activeWin.symbolId)?.color ?? '#ffd166'}
            />
          )}
        </div>

        {/* Animated Big Juan mascot beside the reels. Idle bobbing by
         *  default; transitions to cheer/pistols/dance on game events. */}
        <JuanCharacter mood={juanMood} />

        {/* Wild Switch banner */}
        {/* Wild Switch banner — flex-centered wrapper so the animated
         *  motion.div's transform (scale) doesn't clobber the centering
         *  translate (which Tailwind's -translate-x-1/2 would have set
         *  via the same CSS `transform` property). */}
        <AnimatePresence>
          {showWildSwitch && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 16 }}
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* FS trigger banner — multi-phase per bible Part 8.1. */}
        <AnimatePresence>
          {showFsTrigger !== null && triggerPhase === 'pulse' && (
            <div key="trigger-pulse-wrap" className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1, 1.18, 1], opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block"
                style={{ width: 88, height: 88, filter: 'drop-shadow(0 0 30px rgba(255,209,102,.95))' }}
              >
                <PinataSvg />
              </motion.span>
            </div>
          )}
          {showFsTrigger !== null && triggerPhase === 'banner' && (
            <div key="trigger-banner-wrap" className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 16 }}
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
                  ¡BONUS!
                </div>
                <div className="text-base mt-1">
                  {showFsTrigger}× PIÑATA · {showFsTrigger === 3 ? 10 : showFsTrigger === 4 ? 12 : 15} FREE RESPINS
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom bar — bet | buy | info | SPIN | turbo | auto.
       *  flex-shrink-0 + min-height guarantee the footer stays on screen
       *  even when the reel stage tries to claim the full main area. */}
      <footer className="relative z-30 flex-shrink-0 flex items-center justify-center gap-1.5 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 min-h-[80px]">
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

      {/* Big-win banner — per-tier typography in CSS (bj-bigwin-tier-*)
       *  with screen-shake on Super+ and rainbow shimmer on Epic+ per
       *  bible Part 9. Tap-anywhere dismisses the banner after the
       *  minimum display time. */}
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
              className={`bj-bigwin-banner bj-bigwin-tier-${bigWin.tier.name} mb-3`}
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
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
            {/* Centering wrapper — Tailwind's -translate-x-1/2 was being
             *  overwritten by framer-motion's animated transform (scale),
             *  which kept the modal's left edge at left:50% and pushed it
             *  off-screen on phones. A non-animated flex parent centers
             *  the modal so the motion.div is free to animate transforms
             *  without affecting positioning. */}
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                className="pointer-events-auto w-[min(92vw,360px)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl p-5"
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
            </div>
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

/** Symbol pool used by SpinReel to populate the random filler cells
 *  during the spin animation. Skip the scatter (we don't want piñatas
 *  flashing past during the spin since they hint at the bonus) and
 *  weight lows heavier than highs to match the reel distribution. */
const REEL_FILLER_POOL: string[] = [
  'A', 'A', 'K', 'K', 'Q', 'Q', 'J', 'J', '10', '10',
  'vihuela', 'hot_sauce', 'chihuahua', 'senorita', 'juan',
  'chili',
];

// =============================================================================
// Payline overlay
// =============================================================================

function PaylineOverlay({ line, color }: { line: number[]; color: string }) {
  // Bible Part 6.4: animated polyline draw across the cells of the
  // winning payline. The .bj-winline CSS class drives the stroke-
  // dasharray draw-in animation. The key on the polyline forces a
  // re-mount when the active win cycles to the next line so the
  // animation plays again.
  const points = line.map((row, reel) => {
    const x = reel * 20 + 10;
    const y = row * 20 + 10;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg
      className="absolute inset-3 pointer-events-none z-20"
      viewBox="0 0 100 80"
      preserveAspectRatio="none"
      style={{ filter: `drop-shadow(0 0 8px ${color})` }}
    >
      <polyline
        key={points}
        className="bj-winline"
        points={points}
        style={{ stroke: color, filter: `drop-shadow(0 0 6px ${color})` }}
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
          {/* Centering wrapper — see Buy Bonus modal for why this is
           *  separated from the animated motion.div (Tailwind translate
           *  + framer-motion scale conflict pushes the modal off-screen). */}
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 pointer-events-none">
          <motion.div
            className="pointer-events-auto w-[min(94vw,440px)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl p-5"
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
          </div>
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
