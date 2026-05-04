import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadJson, saveJson } from '../../../lib/storage';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../../game-context';
import { useMusic } from '../../../hooks/useMusic';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import type {
  Frame,
  Grid as TGrid,
  MultiplierLanding,
  SlotConfig,
  SpinMode,
} from './types';
import { Grid } from './Grid';
import type { CellRenderer } from './Grid';
import { Paytable } from './Paytable';
import { buyBonusRound, playRound } from './engine';
import { CountUp } from '../../../components/ui/CountUp';
import { CoinShower } from '../../../components/ui/CoinShower';
import {
  TurboIcon, AutoplayIcon, InfoIcon, MusicIcon, MusicMutedIcon,
  PlusIcon, MinusIcon, StopIcon, SpinArrowIcon,
} from '../../../components/ui/icons';

/**
 * Mobile-first immersive slot view. The whole viewport is the game:
 *  - Painted backdrop fills the available space (preserving aspect ratio)
 *  - Grid is positioned absolutely inside the arch opening of the backdrop
 *  - Compact bottom action bar is pinned to the safe-area-aware bottom
 *  - No scrolling: everything fits in 100dvh on portrait phones
 *
 * Designed for Pragmatic Play-style slots like Gates of Olympus where the
 * backdrop image already provides the framing (columns, gold trim, etc).
 *
 * Backdrop image is configured via `backdropSrc`; arch coordinates (where the
 * reels sit inside the image) are configured via `archInsets`.
 */
export type ImmersiveSlotViewProps = {
  cfg: SlotConfig;
  renderCell: CellRenderer;
  /** URL to the painted backdrop image (e.g. /olympus-bg.png). */
  backdropSrc: string;
  /** Native pixel dimensions of the backdrop image, used to lock aspect ratio. */
  backdropAspect: { w: number; h: number };
  /** Where to place the reel grid inside the image, as percentages. */
  archInsets: {
    /** % of image width — left edge of grid */
    left: number;
    /** % of image height — top edge of grid */
    top: number;
    /** % of image width — grid width */
    width: number;
  };
  /** Optional bet preset list. */
  betPresets?: number[];
};

// Frame delays calibrated against real Pragmatic Olympus mobile pacing
// (measured from gameplay videos — the values represent how long that
// frame's animation should remain on screen before the next frame fires).
const FRAME_DELAY: Record<string, number> = {
  initialDrop: 480,        // real ~500: drop + settle
  lightningStrike: 2000,   // real ~2000-2500: dramatic Zeus pause
  multipliersLanded: 650,  // real ~600-700: orb fall + bounce
  wins: 800,               // real ~700-900: hold winning highlight
  tumble: 400,             // real ~400-500: clear + new drops settle
  scattersWon: 900,        // scatter pay flash
  freeSpinsAwarded: 1300,  // award announcement
  freeSpinsBegin: 1200,    // FS session start drumroll
  freeSpinsEnd: 1500,      // FS total reveal
  multiplierApplied: 1200, // total multiplier × payout reveal
  final: 0,
};

// Per-frame minimum delay so turbo doesn't make things janky (avoids stacking
// multiple state changes within a single render frame which can drop animations).
const TURBO_MIN_DELAY: Record<string, number> = {
  initialDrop: 200,
  lightningStrike: 900, // Lightning Strike never goes super fast — too iconic
  multipliersLanded: 280,
  wins: 320,
  tumble: 200,
  scattersWon: 400,
  freeSpinsAwarded: 800,
  freeSpinsBegin: 700,
  freeSpinsEnd: 900,
  multiplierApplied: 600,
};

const TURBO_FACTOR = 0.30;
const SKIP_DELAY_FACTOR = 0.05;
// Big visual moments are never skippable past these floors — keeps the
// celebration legible even when the user is mashing.
const SKIP_MIN_DELAY: Record<string, number> = {
  lightningStrike: 600,
  freeSpinsAwarded: 400,
  freeSpinsBegin: 350,
  freeSpinsEnd: 450,
  multiplierApplied: 350,
};
const DEFAULT_PRESETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const AUTOPLAY_OPTIONS = [10, 25, 50, 100, 0] as const; // 0 = infinite

export function ImmersiveSlotView({
  cfg,
  renderCell,
  backdropSrc,
  backdropAspect,
  archInsets,
  betPresets = DEFAULT_PRESETS,
}: ImmersiveSlotViewProps) {
  const { balance, fairness, history, sound, session } = useGame();
  const music = useMusic({ soundEnabled: sound.enabled });
  const [bet, setBet] = useState(1);
  const [ante, setAnte] = useState(false);
  const [busy, setBusy] = useState(false);
  const [grid, setGrid] = useState<TGrid>(() => makeBlank(cfg));
  const [winning, setWinning] = useState<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const [winTotal, setWinTotal] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [freeSpins, setFreeSpins] = useState<{ remaining: number; total: number; running: number } | null>(null);
  const [bigWin, setBigWin] = useState<{ payout: number; tier: WinTier } | null>(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [floatingMults, setFloatingMults] = useState<MultiplierLanding[]>([]);
  const [orbImpacts, setOrbImpacts] = useState<{ id: string; col: number; row: number }[]>([]);
  const [clusterPopups, setClusterPopups] = useState<{ id: string; col: number; row: number; payout: number }[]>([]);
  const [prespin, setPrespin] = useState<boolean>(false);
  const [scatterFlashes, setScatterFlashes] = useState<{ id: string; col: number; row: number }[]>([]);
  const [anticipation, setAnticipation] = useState<number>(0); // current scatter count if >= 3
  const [fsOverlay, setFsOverlay] = useState<{ count: number; reason: 'scatter' | 'retrigger' | 'buy' } | null>(null);
  const [fsOutroOverlay, setFsOutroOverlay] = useState<{ totalPayout: number } | null>(null);
  const [lightningStrike, setLightningStrike] = useState<boolean>(false);
  const [betSheetOpen, setBetSheetOpen] = useState(false);
  const [buyBonusOpen, setBuyBonusOpen] = useState(false);
  const [turbo, setTurbo] = useState<boolean>(() => loadJson<boolean>('turbo', false));
  const [autoplay, setAutoplay] = useState<{ remaining: number; infinite: boolean } | null>(null);
  const [autoplaySheetOpen, setAutoplaySheetOpen] = useState(false);
  // Skip flag — when set true mid-spin, the playFrames loop fast-forwards to
  // the end with near-zero delays. Real-Olympus parity: tap-to-skip cascades.
  const skipRef = useRef(false);
  const aliveRef = useRef(true);
  const busyRef = useRef(false);
  const turboRef = useRef(turbo);
  // Track every state-mutating setTimeout we schedule during a spin so we
  // can clear them at the start of the NEXT spin. Without this, a stale
  // "clear scatterFlashes after 1100ms" from spin N could clobber state
  // mid-spin (N+1) — visible bug where flashes/orbs vanish unexpectedly.
  const spinTimers = useRef<number[]>([]);
  const scheduleSpin = useCallback((fn: () => void, ms: number): number => {
    const id = window.setTimeout(fn, ms);
    spinTimers.current.push(id);
    return id;
  }, []);
  const clearSpinTimers = useCallback(() => {
    for (const id of spinTimers.current) clearTimeout(id);
    spinTimers.current = [];
  }, []);
  useEffect(() => { turboRef.current = turbo; saveJson('turbo', turbo); }, [turbo]);

  // ----- Tune mode (?tune=1) lets the user dial in the arch coordinates live.
  // URL params al/at/aw override the configured archInsets. Drag-friendly
  // sliders appear at the bottom of the screen.
  const [searchParams, setSearchParams] = useSearchParams();
  const tuneMode = searchParams.get('tune') === '1';
  const liveInsets = useMemo<{ left: number; top: number; width: number }>(() => ({
    left: parseFloat(searchParams.get('al') ?? String(archInsets.left)),
    top: parseFloat(searchParams.get('at') ?? String(archInsets.top)),
    width: parseFloat(searchParams.get('aw') ?? String(archInsets.width)),
  }), [searchParams, archInsets]);
  const setInset = useCallback((key: 'al' | 'at' | 'aw', value: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value.toFixed(1));
      next.set('tune', '1');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      music.stop(); // stop music when leaving the slot page
      clearSpinTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playFrames = useCallback(
    async (frames: Frame[], betUsed: number, mode: SpinMode) => {
      let lastGrid: TGrid | null = null;
      // Track whether we're currently inside a free-spins session (set by
      // freeSpinsBegin, cleared by freeSpinsEnd). The outer `mode` arg only
      // tells us how the round STARTED — the inner spins inside playRound's
      // FS loop emit their own final frames, and those should NOT trigger
      // base-game bigWin celebrations (the freeSpinsEnd does that once at
      // the end with the total payout).
      let inFsLocal = mode === 'free';
      // Pre-spin pause matches real game's "reels stopping" gap (~220ms).
      // Skipped under turbo + tap-to-skip — those want maximum speed.
      const presDur = turboRef.current ? (skipRef.current ? 0 : 80) : 220;
      if (presDur > 0) await sleep(presDur);
      for (const frame of frames) {
        if (!aliveRef.current) return;
        switch (frame.kind) {
          case 'initialDrop': {
            const keys = new Set<string>();
            for (const col of frame.grid) for (const c of col) keys.add(c.key);
            setNewKeys(keys);
            setGrid(frame.grid);
            setWinning(new Set());
            setPrespin(false); // clear blur — fresh reels are dropping
            lastGrid = frame.grid;
            sound.play('drop');
            // Detect scatter cells; play scatter-land sound + lightning flash
            // over each one staggered. >=3 triggers anticipation effect.
            const scatterPositions = scatterPositionsInGrid(frame.grid, cfg.scatterId);
            if (scatterPositions.length > 0) {
              const flashes = scatterPositions.map((p, i) => ({
                id: `sf-init-${i}-${Math.random().toString(36).slice(2, 6)}`,
                col: p.col,
                row: p.row,
              }));
              setScatterFlashes(flashes);
              for (let i = 0; i < scatterPositions.length; i++) {
                scheduleSpin(() => sound.play('scatter-land'), 100 + i * 130);
              }
              // Set anticipation level: 2 = subtle tease, 3+ = full anticipation
              if (scatterPositions.length >= 2) {
                setAnticipation(scatterPositions.length);
                if (scatterPositions.length >= 3) sound.play('thunder');
              }
              scheduleSpin(() => setScatterFlashes([]), 1100);
            }
            break;
          }
          case 'lightningStrike': {
            // Real-Olympus signature: Zeus appears, lifts arm, lightning slams
            // multiplier orbs onto the board. Dramatic full-screen overlay.
            sound.play('lightning-strike');
            setLightningStrike(true);
            // Stagger orb thunks + impact rings during the strike for impact.
            for (let i = 0; i < frame.landings.length; i++) {
              const l = frame.landings[i]!;
              scheduleSpin(() => {
                sound.play('multiplier');
                setOrbImpacts((prev) => [...prev, { id: `oi-ls-${l.key}-${i}`, col: l.col, row: l.row }]);
              }, 600 + i * 110);
            }
            // Apply the new grid (with multipliers) about 80% through the
            // strike animation so the orbs visually appear during the boom.
            scheduleSpin(() => {
              setFloatingMults(frame.landings);
              setGrid(frame.grid);
              lastGrid = frame.grid;
            }, 600);
            // Clear impacts + hide overlay near the end of the frame delay.
            scheduleSpin(() => setOrbImpacts([]), 1700);
            scheduleSpin(() => setLightningStrike(false), 1700);
            break;
          }
          case 'wins': {
            const win = new Set<string>();
            for (const w of frame.wins) for (const [c, r] of w.positions) win.add(`${c}:${r}`);
            setGrid(frame.grid);
            setWinning(win);
            // Escalating chain sounds: chain 1-2 plays standard win,
            // 3-4 escalates to big-win, 5+ goes mega — builds tension.
            const chainSound: 'win' | 'big-win' | 'mega-win' =
              frame.tumbleIdx <= 2 ? 'win' : frame.tumbleIdx <= 4 ? 'big-win' : 'mega-win';
            sound.play(chainSound);
            setStatusMsg(`+${fmtCurrency(frame.chainPayout)}`);
            lastGrid = frame.grid;
            // Per-cluster popups: position over the centroid of each win group.
            const popups = frame.wins.map((w) => {
              let sumC = 0, sumR = 0;
              for (const [c, r] of w.positions) { sumC += c; sumR += r; }
              return {
                id: `wp-${frame.tumbleIdx}-${w.symbolId}-${Math.random().toString(36).slice(2, 6)}`,
                col: sumC / w.positions.length,
                row: sumR / w.positions.length,
                payout: w.payout,
              };
            });
            setClusterPopups(popups);
            // Update the running spin total so the Last Win meter ticks up.
            setWinTotal((t) => +(t + frame.chainPayout).toFixed(2));
            break;
          }
          case 'multipliersLanded': {
            setFloatingMults(frame.landings);
            setGrid(frame.grid);
            lastGrid = frame.grid;
            sound.play('multiplier');
            // Impact rings — each orb gets an expanding gold ring at its
            // landing position. Real Olympus shows a similar shockwave.
            const impacts = frame.landings.map((l) => ({
              id: `oi-${l.key}`,
              col: l.col,
              row: l.row,
            }));
            setOrbImpacts(impacts);
            scheduleSpin(() => setOrbImpacts([]), 700);
            break;
          }
          case 'tumble': {
            const oldKeys = new Set<string>();
            if (lastGrid) for (const col of lastGrid) for (const c of col) oldKeys.add(c.key);
            const fresh = new Set<string>();
            for (const col of frame.grid) for (const c of col) {
              if (!oldKeys.has(c.key)) fresh.add(c.key);
            }
            // Detect any newly-tumbled-in scatter cells (key not in old grid)
            // and flash lightning over them. Updates anticipation if needed.
            const newScatters: { col: number; row: number }[] = [];
            for (let c = 0; c < frame.grid.length; c++) {
              const col = frame.grid[c]!;
              for (let r = 0; r < col.length; r++) {
                const cell = col[r]!;
                if (cell.symbolId === cfg.scatterId && fresh.has(cell.key)) {
                  newScatters.push({ col: c, row: r });
                }
              }
            }
            if (newScatters.length > 0) {
              const flashes = newScatters.map((p, i) => ({
                id: `sf-tum-${i}-${Math.random().toString(36).slice(2, 6)}`,
                col: p.col,
                row: p.row,
              }));
              setScatterFlashes(flashes);
              for (let i = 0; i < newScatters.length; i++) {
                scheduleSpin(() => sound.play('scatter-land'), 80 + i * 110);
              }
              scheduleSpin(() => setScatterFlashes([]), 900);
            }
            const totalScatters = countScattersInGrid(frame.grid, cfg.scatterId);
            if (totalScatters >= 2) {
              setAnticipation(totalScatters);
              if (totalScatters >= 3 && newScatters.length > 0) sound.play('thunder');
            } else {
              setAnticipation(0);
            }
            setNewKeys(fresh);
            setFloatingMults([]);
            setClusterPopups([]); // popups disappear when winners tumble away
            setGrid(frame.grid);
            setWinning(new Set());
            lastGrid = frame.grid;
            sound.play('drop');
            break;
          }
          case 'scattersWon': {
            sound.play('big-win');
            setStatusMsg(`Scatters +${fmtCurrency(frame.payout)}`);
            break;
          }
          case 'freeSpinsAwarded': {
            sound.play('free-spins-trigger');
            if (frame.reason !== 'retrigger') {
              setFsOverlay({ count: frame.count, reason: frame.reason });
              scheduleSpin(() => setFsOverlay(null), 2400);
            } else {
              // retrigger gets a small "+5" pulse via status, no big overlay
              setStatusMsg(`+${frame.count} retrigger!`);
            }
            setFreeSpins((s) => {
              if (frame.reason === 'retrigger' && s) {
                return { ...s, total: s.total + frame.count, remaining: s.remaining + frame.count };
              }
              return null;
            });
            break;
          }
          case 'freeSpinsBegin': {
            setFreeSpins({ remaining: frame.total, total: frame.total, running: 0 });
            sound.play('free-spins-trigger');
            inFsLocal = true;
            break;
          }
          case 'multiplierApplied': {
            sound.play('mega-win');
            setStatusMsg(`×${fmtMultiplier(frame.sumOfMultipliers)} → ${fmtCurrency(frame.finalPayout)}`);
            break;
          }
          case 'freeSpinsEnd': {
            sound.play('free-spins-end');
            // Show outro overlay summarizing the FS session win.
            setFsOutroOverlay({ totalPayout: frame.totalPayout });
            scheduleSpin(() => setFsOutroOverlay(null), 2800);
            setFreeSpins(null);
            inFsLocal = false;
            const tier = winTierFor(frame.totalPayout, betUsed);
            if (tier) {
              setBigWin({ payout: frame.totalPayout, tier });
              sound.play(tier.sound);
            }
            break;
          }
          case 'final': {
            if (inFsLocal) {
              // Inside an FS session — decrement remaining + add to running.
              // Do NOT trigger bigWin per-spin; freeSpinsEnd handles the
              // session-total celebration.
              setFreeSpins((s) =>
                s ? { ...s, remaining: Math.max(0, s.remaining - 1), running: s.running + frame.spinPayout } : s,
              );
            } else {
              // Base spin (no FS triggered, or before FS triggered).
              const tier = winTierFor(frame.spinPayout, betUsed);
              if (tier) {
                setBigWin({ payout: frame.spinPayout, tier });
                sound.play(tier.sound);
              }
            }
            break;
          }
        }
        const baseDelay = FRAME_DELAY[frame.kind] ?? 200;
        let delay = baseDelay;
        if (turboRef.current) {
          delay = Math.max(baseDelay * TURBO_FACTOR, TURBO_MIN_DELAY[frame.kind] ?? 0);
        }
        if (skipRef.current) {
          delay = Math.max(baseDelay * SKIP_DELAY_FACTOR, SKIP_MIN_DELAY[frame.kind] ?? 0);
        }
        if (delay > 0) await sleep(delay);
      }
    },
    [sound],
  );

  const runRound = useCallback(
    async (mode: 'spin' | 'buy') => {
      if (busyRef.current) return;
      const baseBet = bet;
      const adjBet = ante ? +(bet * cfg.ante.betMultiplier).toFixed(2) : bet;
      const cost = mode === 'buy' ? cfg.buyBonusCost * baseBet : adjBet;
      if (balance.balance < cost) {
        setStatusMsg('Insufficient balance');
        return;
      }
      busyRef.current = true;
      setBusy(true);
      skipRef.current = false; // reset skip on each spin
      clearSpinTimers(); // kill any stale scheduled state mutations
      setBigWin(null);
      setFloatingMults([]);
      setOrbImpacts([]);
      setClusterPopups([]);
      setScatterFlashes([]);
      setAnticipation(0);
      setStatusMsg('');
      setWinTotal(0);
      // Pre-spin: blur+darken the previous grid for ~180ms so the swap to
      // the new grid feels like a real "reels stopped" transition.
      setPrespin(true);
      sound.play('spin');
      // Kick off background music on first user interaction (browser autoplay
      // policy requires a user gesture). switchIntensity is no-op if already
      // playing the right track.
      music.start(freeSpins ? 'free' : 'base');
      balance.debit(cost);

      try {
        const seeds = fairness.consumeNonce();
        if (!seeds || !seeds.serverSeed) {
          balance.credit(cost);
          setStatusMsg('Could not load seeds — try refreshing.');
          return;
        }
        const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
        const result =
          mode === 'buy'
            ? buyBonusRound(rng, cfg, { bet: baseBet, ante: false })
            : playRound(rng, cfg, { bet: baseBet, ante });

        await playFrames(result.frames, baseBet, mode === 'buy' ? 'free' : 'base');

        const payout = result.totalPayout;
        setWinTotal(payout);
        if (payout > 0) balance.credit(payout);
        history.record({
          game: cfg.name,
          bet: cost,
          payout,
          multiplier: payout / Math.max(cost, 0.01),
          serverSeedHash: fairness.hash,
          clientSeed: seeds.clientSeed,
          nonce: seeds.nonce,
        });
        session.recordSpin(cost, payout, result.freeSpinsAwarded > 0);
      } catch (err) {
        balance.credit(cost);
        setStatusMsg('Spin failed — bet refunded.');
        // eslint-disable-next-line no-console
        console.error('Spin failed:', err);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [ante, balance, bet, cfg, fairness, history, playFrames, sound],
  );

  // Ambient lightning — every 12-30s a faint distant lightning flash flickers
  // across the painted scene's sky area. Pure atmosphere, independent of
  // any game event. Real Pragmatic Olympus has stormy ambient effects too.
  const [ambientLightning, setAmbientLightning] = useState<number>(0);
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      const wait = 12000 + Math.random() * 18000; // 12–30s
      timer = window.setTimeout(() => {
        setAmbientLightning((n) => n + 1);
        schedule();
      }, wait);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Idle cell glints — occasional sparkles on random cells while at rest.
  // Real Pragmatic shows tiny glint highlights on its symbols even between
  // spins for ambient liveliness.
  const [idleGlint, setIdleGlint] = useState<{ id: string; col: number; row: number } | null>(null);
  useEffect(() => {
    if (busy || autoplay) return;
    let timer: number;
    const schedule = () => {
      const wait = 2400 + Math.random() * 4000; // 2.4-6.4s
      timer = window.setTimeout(() => {
        setIdleGlint({
          id: `gl-${Date.now()}`,
          col: Math.floor(Math.random() * cfg.cols),
          row: Math.floor(Math.random() * cfg.rows),
        });
        // Auto-clear so the next schedule can fire
        setTimeout(() => setIdleGlint(null), 900);
        schedule();
      }, wait);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [busy, autoplay, cfg.cols, cfg.rows]);

  // Switch music intensity to match game state (base / free spins).
  // Tracks change immediately when entering or exiting a free-spins session.
  const fsActive = freeSpins !== null;
  useEffect(() => {
    music.start(fsActive ? 'free' : 'base');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fsActive]);

  // Duck music briefly during big-win celebrations + auto-dismiss the
  // overlay after a duration scaled by tier intensity. Plus coin-drop tinkles
  // staggered through the coin shower so each visible coin has audio impact.
  useEffect(() => {
    if (!bigWin) return;
    const totalMs = 2200 + bigWin.tier.intensity * 400;
    music.duck(totalMs, 0.2);
    // Spaced coin tink sounds during the shower (more for bigger wins)
    const coinCount = Math.min(20, Math.round(8 + bigWin.tier.intensity * 4));
    const coinTimers: number[] = [];
    for (let i = 0; i < coinCount; i++) {
      const at = 200 + (i / coinCount) * (totalMs - 800) + Math.random() * 80;
      coinTimers.push(window.setTimeout(() => sound.play('coin'), at));
    }
    const dismissT = setTimeout(() => setBigWin(null), totalMs);
    return () => {
      clearTimeout(dismissT);
      coinTimers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bigWin]);

  // Auto-play loop: when autoplay state is set, the effect kicks off
  // sequential spins, decrementing the counter each time, until exhausted,
  // out of balance, or the user stops it. Doesn't run during free spins
  // (those self-execute inside playRound's frames).
  useEffect(() => {
    if (!autoplay || busyRef.current || freeSpins) return;
    const adjBet = ante ? +(bet * cfg.ante.betMultiplier).toFixed(2) : bet;
    if (balance.balance < adjBet) {
      setAutoplay(null);
      return;
    }
    const t = setTimeout(() => {
      runRound('spin').then(() => {
        setAutoplay((s) => {
          if (!s) return null;
          if (s.infinite) return s;
          const remaining = s.remaining - 1;
          return remaining > 0 ? { ...s, remaining } : null;
        });
      });
    }, 200);
    return () => clearTimeout(t);
  }, [autoplay, busy, freeSpins, ante, balance.balance, bet, cfg.ante.betMultiplier, runRound]);

  const buyCost = useMemo(() => cfg.buyBonusCost * bet, [cfg.buyBonusCost, bet]);
  const inFree = freeSpins !== null;
  // Sum of multiplier values currently on the grid (live, ticks as they land).
  // Real Olympus shows this prominently during free spins as TOTAL MULTIPLIER.
  const gridMultiplierTotal = useMemo(() => {
    let total = 0;
    for (const col of grid) for (const cell of col) if (cell.multiplier !== undefined) total += cell.multiplier;
    return total;
  }, [grid]);
  const presetIdx = useMemo(() => {
    let idx = 0;
    let dist = Infinity;
    for (let i = 0; i < betPresets.length; i++) {
      const d = Math.abs(betPresets[i]! - bet);
      if (d < dist) { dist = d; idx = i; }
    }
    return idx;
  }, [bet, betPresets]);
  const stepDown = useCallback(() => {
    setBet(betPresets[Math.max(0, presetIdx - 1)]!);
  }, [betPresets, presetIdx]);
  const stepUp = useCallback(() => {
    setBet(betPresets[Math.min(betPresets.length - 1, presetIdx + 1)]!);
  }, [betPresets, presetIdx]);

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Persistent free-spins HUD — fixed top, shows over the floating top
          bar during a free-spins session. Three stats: spin counter, current
          on-grid multiplier total (sum of all visible orbs), and total won.
          Real-Olympus parity. */}
      {inFree && freeSpins && (
        <div className="absolute top-[max(env(safe-area-inset-top),6px)] mt-[52px] left-1/2 -translate-x-1/2 z-[35] flex items-stretch gap-2 px-3 py-1.5 rounded-2xl olympus-fs-counter whitespace-nowrap">
          <div className="flex flex-col items-center px-1.5">
            <span className="text-[8px] uppercase tracking-widest text-[#FFE0A8]">Spins</span>
            <span className="font-serif italic font-bold text-lg leading-none text-[#ffe9a8] tabular-nums"
                  style={{ textShadow: '0 0 12px rgba(255,200,40,.8)' }}>
              {(freeSpins.total - freeSpins.remaining)}/{freeSpins.total}
            </span>
          </div>
          <span className="text-[#FFE0A8]/40 self-center">·</span>
          {/* TOTAL MULTIPLIER — more prominent: brighter when active, springs/
              pulses when value increases. Real Olympus emphasizes this stat. */}
          <motion.div
            className="flex flex-col items-center px-2 rounded-xl"
            animate={gridMultiplierTotal > 0 ? {
              scale: [1, 1.08, 1],
            } : { scale: 1 }}
            transition={{ duration: 0.6 }}
            key={gridMultiplierTotal}
            style={gridMultiplierTotal > 0 ? {
              background: 'linear-gradient(180deg, rgba(255,200,80,.18), rgba(180,40,40,.08))',
              boxShadow: '0 0 14px rgba(255,200,40,.4)',
            } : undefined}
          >
            <span className="text-[8px] uppercase tracking-widest text-[#FFE0A8]">Total Mult</span>
            <CountUp
              value={gridMultiplierTotal}
              format={(n) => `${n.toFixed(0)}×`}
              duration={350}
              className={`font-serif italic font-extrabold text-xl leading-none tabular-nums ${
                gridMultiplierTotal > 0 ? 'text-[#fff7d6]' : 'text-[#FFE0A8]/55'
              }`}
              style={gridMultiplierTotal > 0 ? {
                textShadow: '0 0 14px rgba(255,200,40,1), 0 0 24px rgba(255,140,40,.7)',
              } : undefined}
            />
          </motion.div>
          <span className="text-[#FFE0A8]/40 self-center">·</span>
          <div className="flex flex-col items-center px-1.5">
            <span className="text-[8px] uppercase tracking-widest text-[#FFE0A8]">Won</span>
            <CountUp
              value={freeSpins.running}
              format={fmtCurrency}
              className="font-serif italic font-bold text-lg leading-none text-[#ffe9a8] tabular-nums"
              style={{ textShadow: '0 0 12px rgba(255,200,40,.8)' }}
            />
          </div>
        </div>
      )}

      {/* "Tap to skip" hint — pulses subtly during a busy spin to remind the
          player they can fast-forward. Hidden on autoplay (which already
          shows AUTO indicator) and during the FS overlays (those are short).
          Real Pragmatic Olympus shows a similar hint. */}
      <AnimatePresence>
        {busy && !autoplay && !fsOverlay && !fsOutroOverlay && !lightningStrike && !bigWin && (
          <motion.div
            className="absolute z-20 left-1/2 pointer-events-none px-3 py-1 rounded-full text-[9px] uppercase tracking-[0.24em] font-mono font-semibold text-[#FFE0A8]"
            style={{
              bottom: '120px',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,233,168,.3)',
              textShadow: '0 0 10px rgba(255,200,40,.5)',
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0.45, 0.85, 0.45] }}
            exit={{ opacity: 0, y: 4 }}
            transition={{
              opacity: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            Tap to skip
          </motion.div>
        )}
      </AnimatePresence>

      {/* Painted backdrop scene fills available space, preserves aspect ratio.
          pt-12 clears the floating top bar; min-h-0 + overflow-hidden lets the
          flex-1 area shrink properly so the bottom bar is always in view.
          Tapping anywhere during an active spin fast-forwards animations. */}
      <button
        type="button"
        onClick={() => { if (busyRef.current) { skipRef.current = true; } }}
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden pt-12 pb-1 px-2 cursor-default focus:outline-none"
        aria-label={busy ? 'Tap to skip animation' : 'Reels'}
      >
        <div
          className={`relative h-full ${inFree ? 'olympus-fs-mode' : ''}`}
          style={{
            aspectRatio: `${backdropAspect.w} / ${backdropAspect.h}`,
            // height: 100% via flex parent; width derived from aspect-ratio.
            // If the aspect-derived width > parent width, max-width caps it.
            maxWidth: '100%',
          }}
        >
          <img
            src={backdropSrc}
            alt=""
            className="absolute inset-0 w-full h-full select-none"
            draggable={false}
            // If the painted backdrop fails to load, fall back to the
            // gradient — the game still plays, just no painted scene.
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            style={{
              filter: 'drop-shadow(0 12px 40px rgba(0,0,0,.6))',
              borderRadius: '14px',
              background:
                'radial-gradient(60% 100% at 50% 50%, #2a1148 0%, #160628 60%, #050308 100%)',
            }}
          />
          {/* Free-spins backdrop tint — adds a deeper purple/amber overlay
              during FS sessions so the scene feels visibly shifted into a
              higher-stakes mode. Real Pragmatic darkens + warms the bg
              during bonus play. */}
          <AnimatePresence>
            {inFree && (
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-[14px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  background:
                    'linear-gradient(180deg, rgba(120, 40, 10, 0.18) 0%, rgba(60, 10, 80, 0.32) 50%, rgba(20, 5, 40, 0.4) 100%)',
                  mixBlendMode: 'multiply',
                }}
              />
            )}
          </AnimatePresence>
          {/* Twinkling stars on top */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(2px 2px at 22% 14%, rgba(255,233,168,.6), transparent 60%),
                radial-gradient(1.4px 1.4px at 78% 12%, rgba(255,233,168,.5), transparent 60%),
                radial-gradient(1px 1px at 12% 18%, rgba(255,233,168,.55), transparent 60%),
                radial-gradient(1.6px 1.6px at 88% 22%, rgba(212,181,245,.5), transparent 60%)
              `,
              opacity: 0.7,
              mixBlendMode: 'screen',
              animation: 'olympusStars 8s ease-in-out infinite',
            }}
          />
          {/* Ambient distant lightning — flashes every 12-30s in the sky */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`amb-${ambientLightning}`}
              className="absolute inset-x-0 top-0 pointer-events-none"
              style={{ height: '30%' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.35, 0, 0.55, 0, 0.2, 0] }}
              transition={{ duration: 0.8, times: [0, 0.05, 0.15, 0.25, 0.45, 0.6, 1], ease: 'easeOut' }}
            >
              <div className="absolute inset-0" style={{
                background: `linear-gradient(180deg, rgba(255,253,225,${ambientLightning ? 1 : 0}) 0%, rgba(255,200,80,.6) 30%, transparent 100%)`,
                mixBlendMode: 'screen',
              }} />
            </motion.div>
          </AnimatePresence>
          {/* Grid positioned inside the arch. The blur+darken on .prespin
              gives a "reels stopping" feel right before initialDrop. */}
          <div
            className="absolute"
            style={{
              left: `${liveInsets.left}%`,
              top: `${liveInsets.top}%`,
              width: `${liveInsets.width}%`,
              filter: prespin ? 'blur(4px) brightness(0.65)' : undefined,
              transform: prespin ? 'scale(0.98)' : undefined,
              transition: 'filter 160ms ease-out, transform 160ms ease-out',
            }}
          >
            <Grid grid={grid} cfg={cfg} winning={winning} newKeys={newKeys} renderCell={renderCell} bare />
          </div>

          {/* Idle cell glint — random subtle sparkle when no spin running */}
          <AnimatePresence>
            {idleGlint && (
              <motion.div
                key={idleGlint.id}
                className="absolute pointer-events-none rounded-full z-[2]"
                style={{
                  left: `${liveInsets.left + (idleGlint.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top + (idleGlint.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  width: `${liveInsets.width / cfg.cols * 0.6}%`,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,233,168,0.4) 30%, transparent 70%)',
                  mixBlendMode: 'screen',
                }}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: [0.3, 1.0, 0.6], opacity: [0, 0.85, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* Multiplier orb impact rings — expand outward from each landing
              cell with a fading glow. Real Olympus shows a shockwave on
              every orb drop. */}
          <AnimatePresence>
            {orbImpacts.map((imp) => (
              <motion.div
                key={imp.id}
                className="absolute pointer-events-none rounded-full z-[6]"
                style={{
                  left: `${liveInsets.left + (imp.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top + (imp.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  width: `${liveInsets.width / cfg.cols * 1.4}%`,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(255,233,168,0.9) 0%, rgba(255,200,40,0.6) 30%, rgba(255,140,40,0.3) 55%, transparent 70%)',
                  mixBlendMode: 'screen',
                }}
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [0.2, 1.0, 1.6], opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </AnimatePresence>

          {/* Floating multiplier value text — flies out of each orb landing */}
          <AnimatePresence>
            {floatingMults.map((m) => (
              <motion.div
                key={`fm-${m.key}`}
                className="absolute pointer-events-none font-serif italic font-bold z-[7]"
                style={{
                  color: '#FFE9A8',
                  left: `${liveInsets.left + (m.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top + (m.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  textShadow: '0 0 18px rgba(255,200,40,.95), 0 2px 4px rgba(0,0,0,.7)',
                  fontSize: 'clamp(20px, 5vw, 32px)',
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ scale: 0.4, opacity: 0, y: 10 }}
                animate={{ scale: [0.4, 1.4, 1], opacity: [0, 1, 1], y: 0 }}
                exit={{ scale: 0.6, opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {m.value}×
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Lightning flash over each freshly-landed scatter cell. Real Olympus
              flashes a vertical bolt down each scatter column at landing. */}
          <AnimatePresence>
            {scatterFlashes.map((f) => (
              <motion.div
                key={f.id}
                className="absolute pointer-events-none z-[6]"
                style={{
                  left: `${liveInsets.left + f.col * (liveInsets.width / cfg.cols)}%`,
                  top: 0,
                  width: `${liveInsets.width / cfg.cols}%`,
                  bottom: 0,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.5, 0.9, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, times: [0, 0.08, 0.2, 0.35, 1], ease: 'easeOut' }}
              >
                {/* Vertical lightning streak through the column */}
                <div
                  className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
                  style={{
                    width: 3,
                    background:
                      'linear-gradient(180deg, transparent 0%, #fffbe1 20%, #ffe9a8 50%, #ffc62a 80%, transparent 100%)',
                    filter: 'drop-shadow(0 0 16px rgba(255,200,80,.95)) drop-shadow(0 0 32px rgba(255,140,40,.7))',
                    transform: 'translate(-50%, 0) skewX(-4deg)',
                  }}
                />
                {/* Glow halo around the cell location */}
                <div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: `${(f.row + 0.5) * 100 / cfg.rows}%`,
                    width: '120%',
                    height: '40%',
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(ellipse at center, rgba(255,233,168,.65) 0%, transparent 65%)',
                    filter: 'blur(2px)',
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Scatter near-miss tease (2 scatters visible — still need 2 more
              for a trigger but enough to start the anticipation). Real game
              starts subtle pulses here. */}
          <AnimatePresence>
            {anticipation === 2 && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-[3] rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow: 'inset 0 0 50px rgba(255,200,80,.25)',
                  }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Anticipation: stronger pulsing amber-red border + on-screen
              callout when 3+ scatters are visible (one away from a free
              spins trigger). Real Olympus does this exact tension build. */}
          <AnimatePresence>
            {anticipation >= 3 && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-[4] rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow: 'inset 0 0 80px rgba(255,140,40,.55), inset 0 0 24px rgba(255,40,40,.4)',
                  }}
                  animate={{ opacity: [0.55, 0.95, 0.55] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-mono font-bold text-[11px] text-[#fff7d6] uppercase tracking-widest"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,180,40,.85), rgba(180,40,40,.65))',
                    border: '1px solid rgba(255,233,168,.6)',
                    boxShadow: '0 0 18px rgba(255,140,40,.7)',
                    textShadow: '0 0 8px rgba(255,200,40,.9), 0 1px 2px rgba(0,0,0,.6)',
                  }}
                >
                  {anticipation} scatters · 1 from bonus!
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Win amount popup over each winning cluster (real Olympus parity).
              Positioned at the centroid of the winning cells. Floats up with
              gold serif text, fades out as the tumble starts. */}
          <AnimatePresence>
            {clusterPopups.map((p) => (
              <motion.div
                key={p.id}
                className="absolute pointer-events-none flex items-center justify-center z-[5]"
                style={{
                  left: `${liveInsets.left + (p.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top + (p.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ scale: 0.2, opacity: 0, y: 12 }}
                animate={{ scale: [0.2, 1.2, 1], opacity: [0, 1, 1], y: [-2, -16, -22] }}
                exit={{ opacity: 0, y: -32, scale: 0.85 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <span
                  className="font-serif italic font-bold whitespace-nowrap leading-none"
                  style={{
                    fontSize: 'clamp(14px, 4vw, 26px)',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #FFE9A8 35%, #FFC850 65%, #C8932F 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: 'drop-shadow(0 0 14px rgba(255,200,40,.95)) drop-shadow(0 2px 4px rgba(0,0,0,.7))',
                    letterSpacing: '-0.01em',
                  }}
                >
                  +{fmtCurrency(p.payout)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Accumulating WIN counter during winning cascades — appears center-
              top of the grid area whenever there's an active win, grows with
              each chain payout. Hidden when no win in this spin. Size scales
              with magnitude (subtle for small wins, big for huge ones). */}
          <AnimatePresence>
            {winTotal > 0 && !bigWin && (() => {
              const ratio = winTotal / Math.max(bet, 0.01);
              const sizeStep = ratio >= 25 ? 2 : ratio >= 10 ? 1 : 0;
              const fontSize = 16 + sizeStep * 6; // 16px / 22px / 28px
              const labelSize = 8 + sizeStep * 1;
              return (
                <motion.div
                  key="cascadewin"
                  className="absolute pointer-events-none z-[7]"
                  style={{
                    left: '50%',
                    top: `${Math.max(liveInsets.top - 7, 6)}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{
                    scale: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                    opacity: { duration: 0.25 },
                  }}
                >
                  <div
                    className="flex flex-col items-center px-4 py-1 rounded-full backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(180deg, rgba(80,40,5,.78), rgba(40,20,2,.9))',
                      border: '1.5px solid rgba(255,233,168,.6)',
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,.3), 0 0 22px rgba(255,200,40,.55), 0 4px 10px rgba(0,0,0,.5)',
                    }}
                  >
                    <span className="uppercase tracking-widest text-[#FFE0A8] leading-none"
                          style={{ fontSize: `${labelSize}px` }}>
                      Win
                    </span>
                    <CountUp
                      value={winTotal}
                      format={fmtCurrency}
                      duration={500}
                      className="font-serif italic font-bold text-[#fff7d6] leading-none tabular-nums"
                      style={{
                        fontSize: `${fontSize}px`,
                        textShadow: '0 0 14px rgba(255,200,40,.95), 0 1px 2px rgba(0,0,0,.6)',
                      }}
                    />
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Tiered Big/Huge/Mega/Epic Win celebration centered on grid.
              Title pulses, payout counts up live, vignette darkens scene
              behind the title for emphasis. Intensity scales tier. */}
          <AnimatePresence>
            {bigWin && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Vignette darkens the surrounding scene so the title pops */}
                <motion.div
                  className="absolute inset-0 rounded-[14px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background:
                      'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 80%)',
                  }}
                />
                {/* Bright halo behind the title */}
                <motion.div
                  className="absolute"
                  style={{
                    width: '85%',
                    height: '50%',
                    background: 'radial-gradient(ellipse at center, rgba(255,200,80,0.45) 0%, rgba(255,140,40,0.2) 35%, transparent 65%)',
                    filter: 'blur(8px)',
                  }}
                  animate={{ scale: [0.8, 1.05, 0.95, 1], opacity: [0, 1, 0.8, 0.9] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />

                <motion.div
                  className="text-center relative"
                  initial={{ scale: 0.4, rotate: -6 }}
                  animate={{
                    scale: [0.4, 1.15, 1],
                    rotate: [-6, 2, 0],
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 12,
                    duration: 0.6,
                  }}
                >
                  <motion.div
                    className="font-serif italic font-bold olympus-fs-title"
                    style={{
                      fontSize: `clamp(${24 + bigWin.tier.intensity * 6}px, ${8 + bigWin.tier.intensity * 1.5}vw, ${48 + bigWin.tier.intensity * 12}px)`,
                      letterSpacing: '-0.015em',
                      // Outer dramatic stroke for higher tiers
                      WebkitTextStroke: bigWin.tier.intensity >= 2.4 ? '1px rgba(255,233,168,0.4)' : undefined,
                    }}
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {bigWin.tier.label}
                  </motion.div>
                  <CountUp
                    value={bigWin.payout}
                    duration={1400}
                    format={fmtCurrency}
                    className="block font-serif italic font-extrabold mt-1 olympus-fs-title"
                    style={{
                      fontSize: `clamp(${22 + bigWin.tier.intensity * 4}px, ${7 + bigWin.tier.intensity * 1}vw, ${42 + bigWin.tier.intensity * 8}px)`,
                      letterSpacing: '-0.015em',
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      {/* Status row above the bottom bar — switches between Last win,
          live cascade message, autoplay indicator, and the idle "Place
          your bet" prompt that real game shows when reels are at rest. */}
      <div className="flex items-center justify-between px-4 h-6 text-[11px] font-mono">
        <span className="text-ink-dim">
          Last win{' '}
          <CountUp
            value={winTotal}
            format={fmtCurrency}
            className={winTotal > 0 ? 'text-[#ffe9a8] font-semibold' : 'text-ink-mute'}
          />
        </span>
        {statusMsg ? (
          <span className="text-[#ffe9a8] truncate max-w-[60vw]">{statusMsg}</span>
        ) : autoplay ? (
          <span className="text-[#ffe9a8] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffc62a] animate-pulse" />
            AUTO {autoplay.infinite ? '∞' : autoplay.remaining}
          </span>
        ) : !busy && !inFree && winTotal === 0 ? (
          <span className="text-ink-mute uppercase tracking-[0.18em] text-[10px]">
            Place Your Bet
          </span>
        ) : null}
      </div>

      {/* Bottom action bar — Pragmatic-style mobile spin controls */}
      <div
        className="flex items-stretch justify-between gap-2 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] bg-gradient-to-t from-black/85 via-black/55 to-transparent"
      >
        {/* Left column: bet stepper + buy bonus stacked */}
        <div className="flex flex-col items-center justify-end gap-1.5 min-w-[96px]">
          <div className="flex items-center gap-1 mt-0.5">
            <button
              aria-label="Decrease bet"
              onClick={stepDown}
              disabled={busy || autoplay !== null || presetIdx === 0}
              className="w-8 h-8 rounded-full bg-bg-card border border-edge text-ink hover:bg-bg-hover disabled:opacity-40 flex items-center justify-center"
            >
              <MinusIcon />
            </button>
            <button
              onClick={() => setBetSheetOpen(true)}
              disabled={busy || autoplay !== null}
              className="flex flex-col items-center"
            >
              <span className="text-[8px] uppercase tracking-[0.2em] text-ink-mute leading-none">
                {ante ? 'Total' : 'Bet'}
              </span>
              <span className="font-mono font-semibold text-sm tabular-nums text-[#ffe9a8] min-w-[52px] text-center"
                    style={{ textShadow: '0 0 10px rgba(255,200,40,.5)' }}>
                {fmtCurrency(ante ? bet * cfg.ante.betMultiplier : bet)}
              </span>
            </button>
            <button
              aria-label="Increase bet"
              onClick={stepUp}
              disabled={busy || autoplay !== null || presetIdx === betPresets.length - 1}
              className="w-8 h-8 rounded-full bg-bg-card border border-edge text-ink hover:bg-bg-hover disabled:opacity-40 flex items-center justify-center"
            >
              <PlusIcon />
            </button>
          </div>
          <button
            onClick={() => setBuyBonusOpen(true)}
            disabled={busy || inFree || autoplay !== null || balance.balance < buyCost}
            className="w-full px-2 py-1.5 rounded-lg disabled:opacity-40 disabled:saturate-50 relative overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, #ff5cd7 0%, #b03dff 35%, #5a1ea8 70%, #2c1147 100%)',
              border: '1.5px solid #ffd37a',
              boxShadow:
                'inset 0 1px 0 rgba(255,233,168,.55), inset 0 -2px 0 rgba(40,8,80,.55), 0 0 14px rgba(176,61,255,.55), 0 4px 8px rgba(0,0,0,.5)',
            }}
          >
            <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#fff7d6] leading-none"
                 style={{ textShadow: '0 1px 0 rgba(40,8,80,.7), 0 0 6px rgba(255,200,80,.7)' }}>
              Buy Free Spins
            </div>
            <div className="text-[11px] font-mono font-bold text-[#fff7d6] mt-0.5 leading-none tabular-nums"
                 style={{ textShadow: '0 1px 0 rgba(40,8,80,.7), 0 0 6px rgba(255,200,80,.95)' }}>
              {fmtCurrency(buyCost)}
            </div>
          </button>
        </div>

        {/* Big round SPIN button (or stop button when autoplaying) */}
        <button
          aria-label={autoplay ? 'Stop autoplay' : inFree ? 'Free spin' : 'Spin'}
          onClick={() => {
            if (autoplay) { setAutoplay(null); return; }
            runRound('spin');
          }}
          disabled={!autoplay && (busy || balance.balance < (ante ? bet * cfg.ante.betMultiplier : bet))}
          className="spin-btn flex-shrink-0"
        >
          <span className="spin-btn-inner">
            {autoplay ? (
              <span className="text-[#fff7d6] flex items-center justify-center" style={{ filter: 'drop-shadow(0 0 8px rgba(255,200,80,.95))' }}>
                <StopIcon size={26} />
              </span>
            ) : inFree && freeSpins ? (
              // FS mode — show remaining count prominently. Real Pragmatic
              // shows the FS counter on the spin button during bonus.
              <span className="flex flex-col items-center justify-center leading-none">
                <span className="font-serif italic font-extrabold text-[#fff7d6] tabular-nums"
                      style={{ fontSize: 'clamp(20px, 5.2vw, 30px)', textShadow: '0 0 10px rgba(255,200,80,.95), 0 1px 0 rgba(60,30,5,.7)' }}>
                  {freeSpins.remaining}
                </span>
                <span className="font-mono text-[#fff7d6]/70 leading-none mt-0.5"
                      style={{ fontSize: 'clamp(7px, 1.8vw, 10px)', letterSpacing: '0.18em', textShadow: '0 1px 0 rgba(60,30,5,.6)' }}>
                  FREE
                </span>
              </span>
            ) : busy ? (
              <span className="text-[#fff7d6] flex items-center justify-center animate-spin" style={{ filter: 'drop-shadow(0 0 8px rgba(255,200,80,.95))' }}>
                <SpinArrowIcon size={28} />
              </span>
            ) : (
              <span className="text-[#fff7d6] flex items-center justify-center" style={{ filter: 'drop-shadow(0 0 10px rgba(255,200,80,.95))' }}>
                <SpinArrowIcon size={32} strokeWidth={2.6} />
              </span>
            )}
          </span>
        </button>

        {/* Right column: turbo + auto + ante */}
        <div className="flex flex-col items-center justify-end gap-1.5 min-w-[96px]">
          <div className="flex items-center gap-1.5">
            <button
              aria-label={turbo ? 'Turbo on' : 'Turbo off'}
              onClick={() => setTurbo((t) => !t)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                turbo
                  ? 'bg-gradient-to-b from-[#ffc62a] to-[#c8932e] border-[#ffe9a8] text-[#1a0f00] shadow-[0_0_14px_rgba(255,198,42,.6)]'
                  : 'bg-bg-card border-edge text-ink-dim'
              }`}
            >
              <TurboIcon size={16} />
            </button>
            <button
              aria-label="Auto play"
              onClick={() => setAutoplaySheetOpen(true)}
              disabled={busy || inFree}
              className="w-8 h-8 rounded-full bg-bg-card border border-edge text-ink-dim hover:bg-bg-hover disabled:opacity-40 flex items-center justify-center"
            >
              <AutoplayIcon size={16} />
            </button>
            <button
              aria-label="Game info / paytable"
              onClick={() => setPaytableOpen(true)}
              className="w-8 h-8 rounded-full bg-bg-card border border-edge text-ink-dim hover:bg-bg-hover flex items-center justify-center"
            >
              <InfoIcon size={16} />
            </button>
            <button
              aria-label={music.musicEnabled ? 'Music on' : 'Music off'}
              onClick={() => music.setMusicEnabled(!music.musicEnabled)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                music.musicEnabled
                  ? 'bg-bg-card border-[#ffc62a]/40 text-[#ffe9a8]'
                  : 'bg-bg-card border-edge text-ink-mute'
              }`}
            >
              {music.musicEnabled ? <MusicIcon size={16} /> : <MusicMutedIcon size={16} />}
            </button>
          </div>
          <button
            onClick={() => setAnte((v) => !v)}
            disabled={busy || inFree || autoplay !== null}
            aria-pressed={ante}
            className="w-full px-2 py-1 rounded-lg text-[10px] uppercase tracking-[0.16em] font-bold leading-none transition disabled:opacity-40"
            style={
              ante
                ? {
                    background: 'linear-gradient(180deg, #ffd37a 0%, #c8932e 100%)',
                    color: '#1a0f00',
                    border: '1px solid #fff5c4',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,.5), 0 0 14px rgba(255,198,42,.55)',
                    textShadow: '0 1px 0 rgba(255,255,255,.4)',
                  }
                : {
                    background: 'rgba(255,233,168,.06)',
                    color: '#FFE0A8',
                    border: '1px solid rgba(255,198,42,.35)',
                  }
            }
          >
            Ante Bet
          </button>
        </div>
      </div>

      {/* Buy Bonus confirmation dialog (real Olympus parity).
          Shows guaranteed FS count + cost + warning before charging the user. */}
      <AnimatePresence>
        {buyBonusOpen && (
          <>
            <motion.button
              aria-label="Close buy bonus"
              onClick={() => setBuyBonusOpen(false)}
              className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[145] max-w-sm mx-auto rounded-3xl overflow-hidden"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(120,60,20,.55), rgba(20,5,10,.95) 70%), linear-gradient(180deg, #1a0f36 0%, #0a0716 60%, #050308 100%)',
                border: '2px solid rgba(255,198,42,.55)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,233,168,.35), 0 0 60px rgba(255,180,40,.3), 0 24px 80px rgba(0,0,0,.7)',
              }}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              {/* Decorative lightning bolts in the corners */}
              <span className="absolute top-3 left-3 text-2xl" style={{ color: '#FFE9A8', textShadow: '0 0 12px rgba(255,200,40,.9)' }}>⚡</span>
              <span className="absolute top-3 right-3 text-2xl" style={{ color: '#FFE9A8', textShadow: '0 0 12px rgba(255,200,40,.9)' }}>⚡</span>

              <div className="p-6 pt-10 text-center">
                <div className="font-serif italic font-bold olympus-fs-title mb-1" style={{ fontSize: 'clamp(22px, 6vw, 32px)' }}>
                  Buy Free Spins
                </div>
                <div className="olympus-fs-sub text-[10px] mb-5">Skip the wait. Enter the bonus.</div>

                <div className="card bg-bg-elev/60 p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-dim uppercase tracking-wider">You Get</span>
                    <span className="font-serif italic font-bold text-2xl text-[#ffe9a8]"
                          style={{ textShadow: '0 0 12px rgba(255,200,40,.7)' }}>
                      {cfg.freeSpinsAwardOnTrigger} Free Spins
                    </span>
                  </div>
                  <div className="border-t border-edge" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-dim uppercase tracking-wider">Cost</span>
                    <span className="font-mono font-bold text-2xl text-ink">
                      {fmtCurrency(buyCost)}
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-mute">
                    {cfg.buyBonusCost}× your current bet ({fmtCurrency(bet)})
                  </div>
                </div>

                <p className="text-[11px] text-ink-mute mb-4 leading-relaxed">
                  In free spins, multipliers persist on the grid and sum to apply at the
                  end of each spin. Average return ≈ {fmtCurrency(buyCost * 0.96)}, but
                  variance is high.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setBuyBonusOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-bg-hover border border-edge text-ink-dim font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={balance.balance < buyCost}
                    onClick={() => {
                      setBuyBonusOpen(false);
                      runRound('buy');
                    }}
                    className="btn-olympus btn flex-1 py-3 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Autoplay sheet — Olympus-themed */}
      {autoplaySheetOpen && (
        <>
          <button
            aria-label="Close autoplay menu"
            onClick={() => setAutoplaySheetOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-4 pb-[max(env(safe-area-inset-bottom),16px)] animate-rise overflow-hidden"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(120,60,20,.4), rgba(20,5,10,.96) 70%), linear-gradient(180deg, #1a0f36 0%, #0a0716 60%, #050308 100%)',
              border: '1.5px solid rgba(255,198,42,.45)',
              borderBottom: 'none',
              boxShadow: 'inset 0 1px 0 rgba(255,233,168,.3), 0 -8px 24px rgba(0,0,0,.6), 0 0 32px rgba(255,180,40,.18)',
            }}
          >
            <span className="absolute top-2 left-3 text-base opacity-80" style={{ color: '#FFE9A8', textShadow: '0 0 8px rgba(255,200,40,.7)' }}>⚡</span>
            <span className="absolute top-2 right-3 text-base opacity-80" style={{ color: '#FFE9A8', textShadow: '0 0 8px rgba(255,200,40,.7)' }}>⚡</span>

            <div className="flex items-center justify-between mb-1 mt-1">
              <h3 className="font-serif italic font-bold olympus-fs-title text-lg">Auto-Play</h3>
              <button onClick={() => setAutoplaySheetOpen(false)} className="text-[#FFE0A8] text-lg w-6 h-6 flex items-center justify-center">✕</button>
            </div>
            <p className="text-[11px] text-[#FFE0A8]/70 mb-3 leading-relaxed">
              Reels spin automatically with the current bet. Tap STOP any time, or it'll
              pause if your balance dips below the bet.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {AUTOPLAY_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setAutoplay({ remaining: n === 0 ? 0 : n, infinite: n === 0 });
                    setAutoplaySheetOpen(false);
                    sound.play('click');
                  }}
                  className="py-3 rounded-xl font-mono font-semibold text-sm text-[#FFE0A8] hover:text-[#fff7d6] transition"
                  style={{
                    background: 'rgba(255,233,168,.04)',
                    border: '1px solid rgba(255,198,42,.25)',
                  }}
                >
                  {n === 0 ? '∞' : n}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAutoplaySheetOpen(false)}
              className="mt-3 w-full py-2.5 rounded-xl text-[#FFE0A8] text-sm"
              style={{
                background: 'rgba(255,233,168,.06)',
                border: '1px solid rgba(255,198,42,.25)',
              }}
            >Cancel</button>
          </div>
        </>
      )}

      {/* Bet preset sheet — Olympus-themed */}
      {betSheetOpen && (
        <>
          <button
            aria-label="Close bet menu"
            onClick={() => setBetSheetOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-4 pb-[max(env(safe-area-inset-bottom),16px)] animate-rise overflow-hidden"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(120,60,20,.4), rgba(20,5,10,.96) 70%), linear-gradient(180deg, #1a0f36 0%, #0a0716 60%, #050308 100%)',
              border: '1.5px solid rgba(255,198,42,.45)',
              borderBottom: 'none',
              boxShadow: 'inset 0 1px 0 rgba(255,233,168,.3), 0 -8px 24px rgba(0,0,0,.6), 0 0 32px rgba(255,180,40,.18)',
            }}
          >
            {/* Decorative corner bolts */}
            <span className="absolute top-2 left-3 text-base opacity-80" style={{ color: '#FFE9A8', textShadow: '0 0 8px rgba(255,200,40,.7)' }}>⚡</span>
            <span className="absolute top-2 right-3 text-base opacity-80" style={{ color: '#FFE9A8', textShadow: '0 0 8px rgba(255,200,40,.7)' }}>⚡</span>

            <div className="flex items-center justify-between mb-1 mt-1">
              <h3 className="font-serif italic font-bold olympus-fs-title text-lg">Bet Amount</h3>
              <button onClick={() => setBetSheetOpen(false)} className="text-[#FFE0A8] text-lg w-6 h-6 flex items-center justify-center">✕</button>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-ink-mute mb-3">
              {ante ? `Ante on · total per spin ${fmtCurrency(bet * cfg.ante.betMultiplier)}` : 'Per spin'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {betPresets.map((v) => (
                <button
                  key={v}
                  onClick={() => { setBet(v); setBetSheetOpen(false); sound.play('click'); }}
                  className={`py-3 rounded-xl font-mono font-semibold text-sm transition relative ${
                    bet === v
                      ? 'text-[#1a0f00]'
                      : 'text-[#FFE0A8] hover:bg-[#ffe9a8]/10'
                  }`}
                  style={
                    bet === v
                      ? {
                          background: 'linear-gradient(180deg, #fff5c4 0%, #ffd37a 25%, #c8932e 75%, #6a4410 100%)',
                          border: '1.5px solid #FFE9A8',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6), 0 0 18px rgba(255,198,42,.55)',
                          textShadow: '0 1px 0 rgba(255,255,255,.4)',
                        }
                      : {
                          background: 'rgba(255,233,168,.04)',
                          border: '1px solid rgba(255,198,42,.25)',
                        }
                  }
                >
                  {fmtCurrency(v)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setBetSheetOpen(false)}
              className="mt-3 w-full py-2.5 rounded-xl text-[#FFE0A8] text-sm"
              style={{
                background: 'rgba(255,233,168,.06)',
                border: '1px solid rgba(255,198,42,.25)',
              }}
            >Cancel</button>
          </div>
        </>
      )}

      {/* Coin shower for big wins (tier-scaled intensity) */}
      <CoinShower active={bigWin !== null} intensity={bigWin?.tier.intensity ?? 1} />

      {/* === Lightning Strike (Zeus arm-raise) overlay ===
          Real-Olympus signature feature: dramatic dim, lightning streaks
          across the screen radiating from Zeus's position, Zeus area glows
          brightly (he's the source), and multiplier orbs slam onto the
          board (handled by the playFrames staggered timeouts). */}
      <AnimatePresence>
        {lightningStrike && (
          <motion.div
            className="fixed inset-0 z-[110] pointer-events-none flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Dim background */}
            <div className="absolute inset-0" style={{
              background:
                'radial-gradient(ellipse at center, rgba(80,30,10,.55) 0%, rgba(0,0,0,.85) 65%)',
            }} />

            {/* Bright Zeus-area highlight — the painted Zeus statue lives in
                the upper-left of the backdrop. A localized warm radial
                makes him visibly the source of the lightning. */}
            <motion.div
              className="absolute"
              style={{
                left: '-10%',
                top: '-5%',
                width: '60%',
                height: '60%',
                background:
                  'radial-gradient(ellipse at 30% 30%, rgba(255,233,168,0.7) 0%, rgba(255,200,80,0.45) 25%, rgba(255,140,40,0.18) 50%, transparent 75%)',
                mixBlendMode: 'screen',
                filter: 'blur(4px)',
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0.85, 1, 0.7], scale: [0.6, 1, 0.95, 1, 1] }}
              transition={{ duration: 1.2, times: [0, 0.15, 0.4, 0.6, 1], ease: 'easeOut' }}
            />

            {/* Lightning bolts — radiating from upper-left (Zeus's bolt)
                toward the grid area in three diverging directions. */}
            {[0, 1, 2].map((i) => {
              // Each bolt starts near Zeus (upper-left) and angles down-right
              const startX = 18 + Math.random() * 8;
              const angle = -8 + i * 12;
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${startX}%`,
                    top: '12%',
                    bottom: '20%',
                    width: '3px',
                    background:
                      'linear-gradient(180deg, transparent, #fffbe1 8%, #ffe9a8 25%, #ffc62a 65%, transparent 100%)',
                    filter:
                      'drop-shadow(0 0 24px rgba(255,200,80,.95)) drop-shadow(0 0 60px rgba(255,140,40,.8))',
                    transform: `skewX(${angle}deg) translateX(${i * 80}px)`,
                    transformOrigin: 'top',
                  }}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: [0, 1, 0.9, 0], scaleY: [0.4, 1, 1, 1] }}
                  transition={{ duration: 0.55, delay: i * 0.18, ease: 'easeOut' }}
                />
              );
            })}

            {/* Screen flash */}
            <motion.div
              className="absolute inset-0 bg-[#fffbe1]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.55, 0, 0.3, 0] }}
              transition={{ duration: 0.7, times: [0, 0.05, 0.18, 0.25, 0.4] }}
            />

            {/* "LIGHTNING STRIKE" title */}
            <motion.div
              className="relative z-10 text-center"
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.3 }}
            >
              <div className="font-serif italic font-bold olympus-fs-title"
                   style={{ fontSize: 'clamp(34px, 9vw, 64px)' }}>
                LIGHTNING<br/>STRIKE
              </div>
              <div className="olympus-fs-sub mt-2 text-[10px] md:text-sm">
                Zeus has spoken
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Free-spins outro overlay ===
          Plays at the end of a free-spins session showing the total won. */}
      <AnimatePresence>
        {fsOutroOverlay && (
          <motion.div
            className="olympus-fs-overlay fixed inset-0 z-[120] flex flex-col items-center justify-center text-center p-6 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              className="olympus-fs-sub text-[10px] md:text-sm mb-2"
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              Free Spins Complete
            </motion.div>
            <motion.div
              className="olympus-fs-title"
              style={{ fontSize: 'clamp(28px, 8vw, 56px)' }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            >
              TOTAL WIN
            </motion.div>
            <motion.div
              className="font-mono font-bold mt-2"
              style={{
                fontSize: 'clamp(28px, 9vw, 56px)',
                color: '#FFE9A8',
                textShadow: '0 0 24px rgba(255,200,40,.9), 0 4px 8px rgba(0,0,0,.6)',
              }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, type: 'spring' }}
            >
              {fmtCurrency(fsOutroOverlay.totalPayout)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free-spins trigger overlay */}
      <AnimatePresence>
        {fsOverlay && (
          <motion.div
            className="olympus-fs-overlay fixed inset-0 z-[120] flex flex-col items-center justify-center text-center p-6 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              className="olympus-fs-title text-5xl md:text-7xl mb-2"
              initial={{ scale: 0.3, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            >
              {fsOverlay.reason === 'buy' ? 'BONUS UNLOCKED' : 'FREE SPINS!'}
            </motion.div>
            <motion.div
              className="olympus-fs-sub text-xs md:text-base"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {fsOverlay.count} spins awarded
            </motion.div>
            {[...Array(8)].map((_, i) => {
              const left = 8 + (i * 11) + (i % 2 === 0 ? 4 : 0);
              const top = 12 + ((i * 17) % 70);
              const delay = (i * 0.08) % 0.5;
              return (
                <motion.span
                  key={i}
                  className="absolute text-4xl md:text-5xl"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    color: '#FFE9A8',
                    textShadow: '0 0 18px rgba(255,200,40,.95), 0 0 36px rgba(255,140,40,.7)',
                  }}
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], rotate: [180, 20, 0], opacity: [0, 1, 1] }}
                  transition={{ duration: 0.8, delay, ease: 'easeOut' }}
                >⚡</motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <Paytable open={paytableOpen} onClose={() => setPaytableOpen(false)} cfg={cfg} renderCell={renderCell} />

      {/* ?tune=1 — interactive arch-fit tuner. Drag sliders, see grid move
          in real time, then tell me the values. */}
      {tuneMode && (
        <div
          className="fixed left-0 right-0 z-[200] p-3 bg-black/85 border-t border-[#ffc62a]/40 backdrop-blur"
          style={{ bottom: 0 }}
        >
          <div className="text-[10px] uppercase tracking-widest text-[#ffe9a8] mb-2 flex items-center justify-between">
            <span>Tune arch coords (tell me these values)</span>
            <button
              className="px-2 py-0.5 rounded bg-bg-card border border-edge text-ink-dim hover:text-ink"
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
            >Exit</button>
          </div>
          {([
            ['al', 'Left',  0,  60, 'left'],
            ['at', 'Top',   10, 75, 'top'],
            ['aw', 'Width', 30, 90, 'width'],
          ] as const).map(([key, label, min, max, prop]) => (
            <div key={key} className="flex items-center gap-3 mb-1">
              <span className="w-12 text-[11px] font-mono text-ink-dim">{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={0.5}
                value={liveInsets[prop]}
                onChange={(e) => setInset(key, parseFloat(e.target.value))}
                className="flex-1 accent-[#ffc62a]"
              />
              <span className="w-14 text-right text-[11px] font-mono text-[#ffe9a8] tabular-nums">
                {liveInsets[prop].toFixed(1)}%
              </span>
            </div>
          ))}
          <div className="text-[10px] font-mono text-ink-mute mt-2">
            archInsets={`{ left: ${liveInsets.left.toFixed(1)}, top: ${liveInsets.top.toFixed(1)}, width: ${liveInsets.width.toFixed(1)} }`}
          </div>
        </div>
      )}
    </div>
  );
}

function makeBlank(cfg: SlotConfig): TGrid {
  const grid: TGrid = [];
  for (let c = 0; c < cfg.cols; c++) {
    const col = [];
    for (let r = 0; r < cfg.rows; r++) {
      const candidates = cfg.symbols.filter((s) => s.id !== cfg.scatterId && s.tier !== 'multiplier');
      const sym = candidates[(c * cfg.rows + r) % candidates.length]!;
      col.push({ symbolId: sym.id, key: `init-${c}-${r}` });
    }
    grid.push(col);
  }
  return grid;
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

function countScattersInGrid(grid: TGrid, scatterId: string): number {
  let n = 0;
  for (const col of grid) for (const cell of col) if (cell.symbolId === scatterId) n++;
  return n;
}

function scatterPositionsInGrid(grid: TGrid, scatterId: string): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  for (let c = 0; c < grid.length; c++) {
    const col = grid[c]!;
    for (let r = 0; r < col.length; r++) {
      if (col[r]!.symbolId === scatterId) out.push({ col: c, row: r });
    }
  }
  return out;
}

/** Real Pragmatic Olympus win tiers, by payout-to-bet ratio.
 *  Real game uses an escalating set: BIG → HUGE → MEGA → EPIC →
 *  SENSATIONAL → INCREDIBLE / COLOSSAL for the rarest tier. */
type WinTier = { label: string; intensity: number; sound: 'big-win' | 'mega-win' };
function winTierFor(payout: number, bet: number): WinTier | null {
  const ratio = payout / Math.max(bet, 0.01);
  if (ratio >= 500) return { label: 'COLOSSAL WIN',     intensity: 4.0, sound: 'mega-win' };
  if (ratio >= 200) return { label: 'SENSATIONAL WIN',  intensity: 3.2, sound: 'mega-win' };
  if (ratio >= 100) return { label: 'EPIC WIN',         intensity: 2.4, sound: 'mega-win' };
  if (ratio >= 50)  return { label: 'MEGA WIN',         intensity: 1.7, sound: 'mega-win' };
  if (ratio >= 25)  return { label: 'HUGE WIN',         intensity: 1.2, sound: 'big-win' };
  if (ratio >= 10)  return { label: 'BIG WIN',          intensity: 0.8, sound: 'big-win' };
  return null;
}
