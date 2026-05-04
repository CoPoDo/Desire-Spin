import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadJson, saveJson } from '../../../lib/storage';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../../game-context';
import { useMusic } from '../../../hooks/useMusic';
import { createRng } from '../../../lib/fairness';
import { fireConfetti } from '../../../lib/confetti';
import { speakZeus, zeusLineFor, primeZeus } from '../../../lib/zeusVoice';
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
  /** URL to the painted backdrop image (e.g. /olympus-bg.png). Omit to use
   *  `backdropElement` instead — useful for games whose scene is rendered
   *  in CSS rather than a single painted image. */
  backdropSrc?: string;
  /** CSS-rendered scene to use in place of `backdropSrc`. Sized via
   *  `backdropAspect`. */
  backdropElement?: ReactNode;
  /** Native pixel dimensions of the backdrop image (or virtual canvas if
   *  using `backdropElement`), used to lock the aspect ratio of the stage. */
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
  /** Max win shown on the welcome splash (e.g. "5,000×"). */
  maxWinLabel?: string;
  /** Optional custom free-spins backdrop tint (pure CSS background). When
   *  omitted, a warm purple/amber Olympus-style overlay is used. */
  freeSpinsTint?: string;
  /** Glyph rendered as the floating decoration on the FS-trigger overlay.
   *  Defaults to ⚡ (lightning) for Olympus. Per-slot themes override:
   *  Cantina passes 🎺/🎉, Bonanza passes 🍬, etc. Accepts any short
   *  string (emoji or single character) — kept simple to avoid SVG churn. */
  fsTriggerGlyph?: string;
  /** Override the FS trigger banner copy (default: "FREE SPINS!" or
   *  "BONUS UNLOCKED" for buy-mode). Cantina uses "FIESTA TIME!", etc. */
  fsTriggerTitle?: string;
};

// Frame delays — tuned so the cells visually FINISH landing before the
// next frame fires. Cell drop in Grid.tsx uses 0.42s easing + a
// per-column 0.05s stagger, so a 6-col grid takes ~670ms for the last
// column to settle. Earlier 320ms initialDrop / 260ms tumble was way
// too fast — the wins/tumble frame fired before the cells finished
// dropping, so highlights painted on top of still-falling symbols.
// The FS frames stay long for dramatic pacing (audited in earlier pass).
const FRAME_DELAY: Record<string, number> = {
  initialDrop: 850,         // matches col-staggered drop completion
                            //   (5*80ms stagger + 420ms drop = ~820ms)
  lightningStrike: 1500,    // dramatic Zeus pause
  multipliersLanded: 480,   // subtle orb thump
  wins: 600,                // winning highlight hold
  tumble: 850,              // matches tumble cells landing in last
                            //   column (5*80ms stagger + 420ms drop ≈
                            //   820ms). Was 540 — last column was still
                            //   landing when the next frame fired.
  scattersWon: 750,         // scatter pay flash
  freeSpinsAwarded: 1100,   // award announcement
  freeSpinsBegin: 950,      // FS session start
  freeSpinsEnd: 1300,       // FS total reveal
  multiplierApplied: 1200,  // total ×N reveal
  final: 0,
};

// Per-frame minimum delay so turbo doesn't make things janky. Turbo
// mode shortens these but keeps animations from overlapping.
const TURBO_MIN_DELAY: Record<string, number> = {
  initialDrop: 380,
  lightningStrike: 800,
  multipliersLanded: 220,
  wins: 280,
  tumble: 460,
  scattersWon: 380,
  freeSpinsAwarded: 700,
  freeSpinsBegin: 600,
  freeSpinsEnd: 800,
  multiplierApplied: 600,
};

const TURBO_FACTOR = 0.30;
const SKIP_DELAY_FACTOR = 0.05;
// Big visual moments are never skippable past these floors.
const SKIP_MIN_DELAY: Record<string, number> = {
  lightningStrike: 500,
  freeSpinsAwarded: 320,
  freeSpinsBegin: 260,
  freeSpinsEnd: 360,
  multiplierApplied: 260,
};
const DEFAULT_PRESETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const AUTOPLAY_OPTIONS = [10, 25, 50, 100, 0] as const; // 0 = infinite

export function ImmersiveSlotView({
  cfg,
  renderCell,
  backdropSrc,
  backdropElement,
  backdropAspect,
  freeSpinsTint,
  fsTriggerGlyph = '⚡',
  fsTriggerTitle,
  archInsets,
  betPresets = DEFAULT_PRESETS,
  maxWinLabel = '5,000×',
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
  // Welcome splash on first visit — disappears on user interaction or 3.5s.
  // Real Pragmatic Olympus shows a "MAX WIN 5,000×" splash on game load.
  const [welcomeSplash, setWelcomeSplash] = useState<boolean>(true);
  const [retrigger, setRetrigger] = useState<{ count: number; key: number } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setWelcomeSplash(false), 3500);
    return () => clearTimeout(t);
  }, []);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [floatingMults, setFloatingMults] = useState<MultiplierLanding[]>([]);
  const [orbImpacts, setOrbImpacts] = useState<{ id: string; col: number; row: number }[]>([]);
  /** Lightning-bolt trails fired from Zeus (top-left of board) to each
   *  multiplier orb landing position. Only used on Olympus. Each entry
   *  is a unique id + the path data + the landing target. */
  const [zeusBolts, setZeusBolts] = useState<{ id: string; d: string; col: number; row: number }[]>([]);
  /** Screen rumble triggered by big multiplier orbs landing (50×+). Lower
   *  duration/intensity than a full big-win shake so it reads as "thunder
   *  rolling" rather than "screen breaking". Real Pragmatic Olympus
   *  rumbles the camera on big orbs landing. */
  const [orbRumble, setOrbRumble] = useState<'sm' | 'md' | 'lg' | null>(null);
  const [clusterPopups, setClusterPopups] = useState<{ id: string; col: number; row: number; payout: number }[]>([]);
  const [prespin, setPrespin] = useState<boolean>(false);
  // Tier-scaled lightning bolts that strike across the painted scene
  // during big-win celebrations on Olympus. Each entry is a unique key
  // + a randomised zigzag path; the SVG renders them with a fade-in /
  // flash / fade-out animation. Ported from House Edge gatesStrikeLightning.
  const [bigWinBolts, setBigWinBolts] = useState<{ id: string; d: string; tx: number; ty: number; delay: number }[]>([]);
  // Zeus eyes glow red briefly when divine events fire (multipliers
  // landing, lightning strike, free-spins trigger). Only shown on
  // Olympus since Zeus is in that backdrop. Paired with a deep TTS
  // line via lib/zeusVoice so the moment lands as "the god has
  // spoken" rather than just "a glow appeared".
  const [zeusEyesGlow, setZeusEyesGlow] = useState<boolean>(false);
  const [scatterFlashes, setScatterFlashes] = useState<{ id: string; col: number; row: number }[]>([]);
  const [anticipation, setAnticipation] = useState<number>(0); // current scatter count if >= 3
  const [fsOverlay, setFsOverlay] = useState<{ count: number; reason: 'scatter' | 'retrigger' | 'buy' } | null>(null);
  const [fsOutroOverlay, setFsOutroOverlay] = useState<{ totalPayout: number } | null>(null);
  // Mid-spin "TOTAL ×N" reveal that fires once per FS spin where multiplier
  // orbs sum together. Real Sweet Bonanza & Gates of Olympus show a
  // dramatic cumulative-multiplier number on screen at the end of every
  // FS spin where orbs were present — this banner mirrors that beat.
  const [fsMultReveal, setFsMultReveal] = useState<{ sumOfMultipliers: number; finalPayout: number } | null>(null);
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
      let lastFrameKind: string | null = null;
      // Pre-spin pause matches real game's "reels stopping" gap (~220ms).
      // Skipped under turbo + tap-to-skip — those want maximum speed.
      const presDur = turboRef.current ? (skipRef.current ? 0 : 80) : 220;
      if (presDur > 0) await sleep(presDur);
      for (const frame of frames) {
        if (!aliveRef.current) return;
        // Between-FS-spin breather: real Pragmatic pauses ~500ms between
        // free spins so the player has breathing room between cascades.
        // Detect: we're in FS, last frame was a 'final', and current is
        // a fresh 'initialDrop' (start of next spin).
        if (
          inFsLocal &&
          lastFrameKind === 'final' &&
          frame.kind === 'initialDrop'
        ) {
          const breather = turboRef.current
            ? (skipRef.current ? 0 : 240)
            : 750;
          if (breather > 0) await sleep(breather);
          if (!aliveRef.current) return;
        }
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
            if (cfg.id === 'gates-of-olympus') {
              setZeusEyesGlow(true);
              speakZeus(zeusLineFor('lightningStrike'));
              scheduleSpin(() => setZeusEyesGlow(false), 1400);
            }
            // Schedule timings scale with turbo / skip so orbs land BEFORE
            // the frame ends and the overlay clears, regardless of speed.
            const lsBase = 1500; // matches lightningStrike frame delay range
            const speedFactor = skipRef.current ? 0.4 : turboRef.current ? 0.65 : 1.0;
            const orbStart = lsBase * 0.4 * speedFactor;
            const orbStep = 110 * speedFactor;
            const overlayClear = lsBase * 0.85 * speedFactor;
            // Stagger orb thunks + impact rings during the strike for impact.
            for (let i = 0; i < frame.landings.length; i++) {
              const l = frame.landings[i]!;
              scheduleSpin(() => {
                sound.play('multiplier');
                setOrbImpacts((prev) => [...prev, { id: `oi-ls-${l.key}-${i}`, col: l.col, row: l.row }]);
              }, orbStart + i * orbStep);
            }
            // Apply the new grid (with multipliers) about 40% through the
            // strike animation so the orbs visually appear during the boom.
            scheduleSpin(() => {
              setFloatingMults(frame.landings);
              setGrid(frame.grid);
              lastGrid = frame.grid;
            }, orbStart);
            // Clear impacts + hide overlay near the end of the frame delay.
            scheduleSpin(() => setOrbImpacts([]), overlayClear + 200);
            scheduleSpin(() => setLightningStrike(false), overlayClear);
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
            // Zeus's eyes glow red + voice line when multipliers land
            // on the board — only on Olympus. Real Pragmatic Olympus
            // has a sampled VO; we approximate with deep TTS via
            // lib/zeusVoice.
            if (cfg.id === 'gates-of-olympus') {
              setZeusEyesGlow(true);
              speakZeus(zeusLineFor('multiplierLanded'));
              scheduleSpin(() => setZeusEyesGlow(false), 1100);
              // Lightning-bolt TRAIL from Zeus's hand (top-left ~18%/22%)
              // to each orb landing — real Olympus shows electric arcs
              // streaking from Zeus to where the orbs land before they
              // appear. Each bolt is a randomised zigzag path generated
              // procedurally. These render as SVG paths in the overlay.
              const bolts = frame.landings.map((l, i) => {
                const startX = 18; // Zeus hand approx, % of board width
                const startY = 22;
                const endX = ((l.col + 0.5) / cfg.cols) * 100;
                const endY = ((l.row + 0.5) / cfg.rows) * 100;
                // Build a 4-segment zigzag between start and end with
                // small lateral jitters so each bolt looks unique.
                const dx = endX - startX;
                const dy = endY - startY;
                const seg = (t: number, jitter: number) => {
                  const x = startX + dx * t + (Math.random() - 0.5) * jitter;
                  const y = startY + dy * t + (Math.random() - 0.5) * jitter;
                  return `${x.toFixed(2)} ${y.toFixed(2)}`;
                };
                const d = `M ${startX} ${startY} L ${seg(0.28, 4)} L ${seg(0.55, 5)} L ${seg(0.78, 4)} L ${endX} ${endY}`;
                return { id: `zb-${l.key}-${i}`, d, col: l.col, row: l.row };
              });
              setZeusBolts(bolts);
              scheduleSpin(() => setZeusBolts([]), 480);
            }
            // Impact rings — each orb gets an expanding ring at its
            // landing position. Real Olympus shows a shockwave + ground-
            // crack as the orb slams in.
            const impacts = frame.landings.map((l) => ({
              id: `oi-${l.key}`,
              col: l.col,
              row: l.row,
            }));
            setOrbImpacts(impacts);
            scheduleSpin(() => setOrbImpacts([]), 700);
            // Screen rumble — scaled to the highest multiplier on screen
            // so a 2× drops a small thump and a 100×+ shakes the camera
            // hard. Real Pragmatic Olympus has this exact escalation.
            const maxMult = Math.max(0, ...frame.landings.map((l) => l.value));
            if (maxMult >= 100) {
              setOrbRumble('lg');
              sound.play('thunder');
              scheduleSpin(() => setOrbRumble(null), 700);
            } else if (maxMult >= 25) {
              setOrbRumble('md');
              sound.play('thunder');
              scheduleSpin(() => setOrbRumble(null), 500);
            } else if (maxMult >= 10) {
              setOrbRumble('sm');
              scheduleSpin(() => setOrbRumble(null), 350);
            }
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
            if (cfg.id === 'gates-of-olympus') {
              setZeusEyesGlow(true);
              speakZeus(zeusLineFor('freeSpinsTrigger'));
              scheduleSpin(() => setZeusEyesGlow(false), 1800);
            }
            if (frame.reason !== 'retrigger') {
              setFsOverlay({ count: frame.count, reason: frame.reason });
              scheduleSpin(() => setFsOverlay(null), 2400);
            } else {
              // Retrigger — prominent "+5 SPINS!" callout (real Pragmatic
              // shows this exactly: gold serif italic that springs in,
              // pulses, fades out within ~1.6s). Status text also updates.
              setStatusMsg(`+${frame.count} retrigger!`);
              setRetrigger({ count: frame.count, key: Date.now() });
              scheduleSpin(() => setRetrigger(null), 1600);
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
            if (cfg.id === 'gates-of-olympus' && frame.sumOfMultipliers >= 50) {
              setZeusEyesGlow(true);
              speakZeus(zeusLineFor('bigWin'));
              scheduleSpin(() => setZeusEyesGlow(false), 1500);
            }
            // Real-game-style reveal: pop a centered "TOTAL ×N" banner
            // summing all sticky orbs on the grid, then fade. The banner
            // auto-clears under the 1200ms multiplierApplied frame-delay
            // so the next frame plays without overlap. Real Bonanza /
            // Olympus hold the reveal a beat longer than my first pass —
            // bumped from 720ms to 1000ms so the player has time to
            // register what just happened.
            setFsMultReveal({ sumOfMultipliers: frame.sumOfMultipliers, finalPayout: frame.finalPayout });
            scheduleSpin(() => setFsMultReveal(null), turboRef.current ? 540 : 1000);
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
              if (cfg.id === 'gates-of-olympus' && tier.intensity >= 1.7) {
                setZeusEyesGlow(true);
                speakZeus(zeusLineFor('bigWin'));
                scheduleSpin(() => setZeusEyesGlow(false), 1800);
              }
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
                if (cfg.id === 'gates-of-olympus' && tier.intensity >= 1.7) {
                  setZeusEyesGlow(true);
                  speakZeus(zeusLineFor('bigWin'));
                  scheduleSpin(() => setZeusEyesGlow(false), 1800);
                }
              } else if (cfg.id === 'gates-of-olympus' && Math.random() < 0.18) {
                // Zeus interjection — on ~18% of regular Olympus base
                // spins (no win, no scatter trigger, no multipliers
                // landed), Zeus randomly speaks a flavour line and
                // his eyes flash red. Mirrors real Pragmatic Olympus
                // where Zeus periodically interjects between spins
                // even when nothing dramatic happens. This GUARANTEES
                // the player sees the eye-glow + voice within a few
                // spins, not waiting for rare events to fire.
                setZeusEyesGlow(true);
                speakZeus(zeusLineFor('multiplierLanded'));
                scheduleSpin(() => setZeusEyesGlow(false), 1100);
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
        lastFrameKind = frame.kind;
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
      // Prime the Web Speech API on first user click so async voice
      // calls inside frame handlers are treated as following a user
      // gesture. Olympus's Zeus voice depends on this firing reliably.
      primeZeus();
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
      setZeusEyesGlow(false);
      setBigWinBolts([]);
      setFsMultReveal(null);
      setZeusBolts([]);
      setOrbRumble(null);
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
    // Visual chip-shower in the slot's accent palette. Burst count
    // scales with the win tier (BIG ≈ 60, MEGA ≈ 100, MAX ≈ 160) and
    // a second smaller burst fires partway through for sustained
    // visual energy.
    const burstCount = Math.round(50 + bigWin.tier.intensity * 25);
    const palette = [
      cfg.theme.accent,
      '#fff5dc',
      '#ffe9a8',
      '#ffd166',
      '#ffffff',
    ];
    fireConfetti({ count: burstCount, colors: palette });
    if (bigWin.tier.intensity >= 1.7) {
      coinTimers.push(
        window.setTimeout(
          () => fireConfetti({ count: Math.round(burstCount * 0.5), colors: palette }),
          totalMs * 0.45,
        ),
      );
    }
    // Tier-scaled lightning bolts strike across the scene on Olympus
    // only — Zeus's signature flourish for big wins. Bolt count scales
    // with intensity (BIG → 3, HUGE → 5, MEGA → 7, EPIC → 9, COLOSSAL
    // → 12). Each bolt has a randomised zigzag path and staggered start.
    if (cfg.id === 'gates-of-olympus' && bigWin.tier.intensity >= 0.8) {
      const boltCount = Math.min(12, Math.round(2 + bigWin.tier.intensity * 2.2));
      const newBolts: typeof bigWinBolts = [];
      for (let i = 0; i < boltCount; i++) {
        // Random target inside the upper grid area (in 100x100 viewBox)
        const tx = 8 + Math.random() * 84;
        const ty = 30 + Math.random() * 50;
        const sx = tx + (Math.random() - 0.5) * 24;
        const sy = -2;
        const segs = 4 + Math.floor(Math.random() * 3);
        let path = `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
        for (let s = 1; s <= segs; s++) {
          const t = s / segs;
          const baseX = sx + (tx - sx) * t;
          const baseY = sy + (ty - sy) * t;
          const jitter = s === segs ? 0 : (Math.random() - 0.5) * 12;
          path += ` L ${(baseX + jitter).toFixed(1)} ${baseY.toFixed(1)}`;
        }
        newBolts.push({
          id: `bw-bolt-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          d: path,
          tx,
          ty,
          delay: i * 65, // ms stagger between strikes
        });
      }
      setBigWinBolts(newBolts);
      coinTimers.push(window.setTimeout(() => setBigWinBolts([]), totalMs - 200));
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
  // out of balance, or the user stops it.
  //
  // Pauses while any of these are active so a player isn't dragged into
  // the next spin before they've absorbed the celebration:
  //   - bigWin overlay (BIG/HUGE/MEGA/EPIC/SENSATIONAL/COLOSSAL)
  //   - free spins trigger overlay
  //   - free spins outro overlay
  //   - lightning strike overlay
  //   - retrigger callout
  // Real Pragmatic also pauses autoplay on big wins by default.
  useEffect(() => {
    if (!autoplay || busyRef.current || freeSpins) return;
    if (bigWin || fsOverlay || fsOutroOverlay || lightningStrike || retrigger) return;
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
  }, [autoplay, busy, freeSpins, bigWin, fsOverlay, fsOutroOverlay, lightningStrike, retrigger, ante, balance.balance, bet, cfg.ante.betMultiplier, runRound]);

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
        <div
          className="absolute top-[max(env(safe-area-inset-top),6px)] mt-[52px] left-1/2 -translate-x-1/2 z-[35] flex items-stretch gap-2 px-3 py-1.5 rounded-2xl whitespace-nowrap olympus-fs-counter"
          // Override the .olympus-fs-counter gold gradient with the
          // slot's own accent so the FS HUD feels native — Bonanza
          // glows pink, Cantina warm orange, Wolf violet, etc.
          style={{
            background: `linear-gradient(180deg, ${cfg.theme.accent}38, ${cfg.theme.accent}11)`,
            borderColor: `${cfg.theme.accent}8c`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,.06), 0 0 18px ${cfg.theme.glow}, 0 4px 14px rgba(0,0,0,.45)`,
          }}
        >
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
          // Stage container — gets a shake class while a big-win
          // celebration is playing OR a heavy multiplier orb just
          // landed (orbRumble). Tier intensity decides shake strength:
          // BIG → light, HUGE → medium, MEGA+ → heavy. Orb rumble
          // overlays a brief shorter shake during multiplier landings.
          className={`relative h-full ${inFree ? 'olympus-fs-mode' : ''} ${
            bigWin
              ? bigWin.tier.intensity >= 1.7
                ? 'shake-heavy'
                : bigWin.tier.intensity >= 1.0
                  ? 'shake-medium'
                  : 'shake-light'
              : orbRumble === 'lg'
                ? 'shake-medium'
                : orbRumble === 'md'
                  ? 'shake-light'
                  : orbRumble === 'sm'
                    ? 'shake-light'
                    : ''
          }`}
          style={{
            aspectRatio: `${backdropAspect.w} / ${backdropAspect.h}`,
            // height: 100% via flex parent; width derived from aspect-ratio.
            // If the aspect-derived width > parent width, max-width caps it.
            maxWidth: '100%',
          }}
        >
          {backdropSrc ? (
            <>
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
              {/* Zeus eye-glow overlay (Olympus only). Two red dots
               *  positioned over the painted Zeus's face, lit only when
               *  zeusEyesGlow is true. Real Pragmatic Olympus shows
               *  Zeus's eyes flash when he intervenes; we approximate
               *  with two pulsing red radial-gradients positioned at
               *  approximate eye coordinates of the painted figure. */}
              {cfg.id === 'gates-of-olympus' && (
                <AnimatePresence>
                  {zeusEyesGlow && (
                    <motion.div
                      className="absolute pointer-events-none z-[8]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 1, 0.6, 1] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      style={{ inset: 0 }}
                    >
                      {/* Zeus's eyes — sized 3% wide so they're clearly
                       *  visible against the painted backdrop. The bg is
                       *  a tight white-hot core fading through fierce red.
                       *  Outer drop-shadow halo extends the glow well
                       *  beyond the dot itself so it reads as RAGE-LIT. */}
                      {/* Left eye — positioned over the painted Zeus's left
                       *  eye in olympus-bg.png. The painted Zeus is in the
                       *  upper-left; his eyes sit at approximately
                       *  (14%, 12%) and (18%, 12%) of the stage container.
                       *  Earlier coords (top:18%) put the eyes on his
                       *  chest, which is why the user "didn't see them
                       *  flash" — they were lit but not over the face. */}
                      <span
                        className="absolute rounded-full bj-zeus-eye"
                        style={{
                          left: '14%',
                          top: '11.5%',
                          width: '2.6%',
                          aspectRatio: '1 / 1',
                          background:
                            'radial-gradient(circle, #ffffff 0%, #ff5050 30%, #c8102e 55%, transparent 75%)',
                          boxShadow:
                            '0 0 12px #ff3030, 0 0 28px rgba(255,40,40,.95), 0 0 56px rgba(200,16,46,.8)',
                          mixBlendMode: 'screen',
                        }}
                      />
                      {/* Right eye */}
                      <span
                        className="absolute rounded-full bj-zeus-eye"
                        style={{
                          left: '18%',
                          top: '11.5%',
                          width: '2.6%',
                          aspectRatio: '1 / 1',
                          background:
                            'radial-gradient(circle, #ffffff 0%, #ff5050 30%, #c8102e 55%, transparent 75%)',
                          boxShadow:
                            '0 0 12px #ff3030, 0 0 28px rgba(255,40,40,.95), 0 0 56px rgba(200,16,46,.8)',
                          mixBlendMode: 'screen',
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </>
          ) : backdropElement ? (
            <div
              className="absolute inset-0 w-full h-full overflow-hidden"
              style={{
                borderRadius: '14px',
                boxShadow: '0 12px 40px rgba(0,0,0,.6)',
              }}
            >
              {backdropElement}
            </div>
          ) : (
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                borderRadius: '14px',
                background:
                  'radial-gradient(60% 100% at 50% 50%, #2a1148 0%, #160628 60%, #050308 100%)',
              }}
            />
          )}
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
                    freeSpinsTint ??
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
          {/* Grid positioned inside the arch. The pre-spin transition
              matches what the real-game inspiration does — see
              prespinStyle docs in types.ts. */}
          <div
            className="absolute"
            style={(() => {
              const base = {
                left: `${liveInsets.left}%`,
                top: `${liveInsets.top}%`,
                width: `${liveInsets.width}%`,
              } as const;
              if (!prespin) {
                return {
                  ...base,
                  transition:
                    'transform 220ms ease-out, opacity 220ms ease-out, filter 220ms ease-out',
                };
              }
              switch (cfg.theme.prespinStyle) {
                case 'fall':
                  // Tumble slots: old symbols drop down off the grid with
                  // gravity-like acceleration (ease-in). New ones cascade
                  // in from above when initialDrop fires.
                  return {
                    ...base,
                    transform: 'translateY(22%)',
                    opacity: 0,
                    transition:
                      'transform 220ms cubic-bezier(.5,0,1,1), opacity 220ms ease-in',
                  };
                case 'puff':
                  // Cluster slots (Sugar Rush): cells shrink-pop in place
                  // rather than fall, then new ones drop in from above.
                  return {
                    ...base,
                    transform: 'scale(0.86)',
                    opacity: 0,
                    filter: 'brightness(1.2) saturate(1.15)',
                    transition:
                      'transform 200ms ease-in, opacity 200ms ease-in, filter 200ms ease-out',
                  };
                case 'reel-spin':
                  // Real reel slots (Wolf Gold, Wanted): reels scroll
                  // upward fast. CSS has no directional blur, so we fake
                  // vertical motion with a stretchY scale + fast upward
                  // translate + a small symmetric blur. Reads as "reels
                  // smeared upward" rather than "out-of-focus image".
                  return {
                    ...base,
                    transform: 'translateY(-10%) scaleY(1.18)',
                    transformOrigin: 'top center',
                    filter: 'blur(1.5px) brightness(0.78)',
                    opacity: 0.6,
                    transition:
                      'transform 200ms ease-out, filter 200ms ease-out, opacity 200ms ease-out',
                  };
                default:
                  // Legacy fallback for slots not yet migrated.
                  return {
                    ...base,
                    filter: 'blur(4px) brightness(0.65)',
                    transform: 'scale(0.98)',
                    transition: 'filter 160ms ease-out, transform 160ms ease-out',
                  };
              }
            })()}
          >
            <Grid grid={grid} cfg={cfg} winning={winning} newKeys={newKeys} renderCell={renderCell} bare />
          </div>

          {/* Scatter columns pulse with subtle gold light when 3+ scatters
              are visible — entire columns containing scatters glow softly,
              drawing the eye to potential bonus triggers. Real Pragmatic
              does the same column-light sweep for tension. */}
          {anticipation >= 3 && (() => {
            const cols = new Set<number>();
            for (let c = 0; c < grid.length; c++) {
              const column = grid[c]!;
              for (const cell of column) {
                if (cell.symbolId === cfg.scatterId) { cols.add(c); break; }
              }
            }
            return Array.from(cols).map((c) => (
              <motion.div
                key={`scatcol-${c}`}
                className="absolute pointer-events-none z-[3]"
                style={{
                  left: `${liveInsets.left + c * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top}%`,
                  width: `${liveInsets.width / cfg.cols}%`,
                  height: `${liveInsets.width / cfg.cols * (cfg.rows / 1.2)}%`,
                  background:
                    'linear-gradient(180deg, rgba(255,233,168,0.0) 0%, rgba(255,200,80,0.18) 50%, rgba(255,233,168,0.0) 100%)',
                  mixBlendMode: 'screen',
                  borderRadius: '8px',
                }}
                animate={{ opacity: [0.4, 0.95, 0.4] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              />
            ));
          })()}

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

          {/* Lightning-bolt trails from Zeus to each multiplier orb
              landing. Real Pragmatic Olympus shows a brief electric arc
              from Zeus's outstretched hand (top-left of stage) to each
              orb position before the orb materialises. Renders as a
              single SVG covering the whole board area; the d-paths are
              built in the multipliersLanded handler. */}
          {zeusBolts.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none z-[7]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(255,233,168,1)) drop-shadow(0 0 12px rgba(255,200,80,.85))',
              }}
            >
              {zeusBolts.map((b, i) => (
                <g key={b.id}>
                  {/* Outer warm halo stroke */}
                  <path
                    d={b.d}
                    stroke="#ffe9a8"
                    strokeWidth="0.9"
                    strokeLinejoin="miter"
                    strokeLinecap="round"
                    fill="none"
                    style={{
                      animation: `zeusBoltFlash 0.45s ease-out ${i * 0.04}s forwards`,
                      opacity: 0,
                    }}
                  />
                  {/* Bright inner core */}
                  <path
                    d={b.d}
                    stroke="#fffbe1"
                    strokeWidth="0.35"
                    strokeLinejoin="miter"
                    strokeLinecap="round"
                    fill="none"
                    style={{
                      animation: `zeusBoltFlash 0.45s ease-out ${i * 0.04 + 0.04}s forwards`,
                      opacity: 0,
                    }}
                  />
                </g>
              ))}
            </svg>
          )}

          {/* Multiplier orb impact rings — accent-tinted shockwave at each
              landing position. On Olympus this pairs with the lightning
              trail above to feel like Zeus throwing a charged orb that
              cracks the ground when it lands. */}
          <AnimatePresence>
            {orbImpacts.map((imp) => (
              <motion.div
                key={imp.id}
                className="absolute pointer-events-none rounded-full z-[6]"
                style={{
                  left: `${liveInsets.left + (imp.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top + (imp.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  width: `${liveInsets.width / cfg.cols * 0.9}%`,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                  // Orb-impact halo tinted to the slot's accent so the
                  // landing flash matches each game's palette (Bonanza
                  // pink, Olympus gold, Sugar Rush magenta, etc.).
                  background: `radial-gradient(circle at 50% 50%, ${cfg.theme.accent}8c 0%, ${cfg.theme.accent}40 50%, transparent 75%)`,
                  mixBlendMode: 'screen',
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.1], opacity: [0, 0.7, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>

          {/* Electric crackle sparks around each landed orb — small bright
              pixels that arc outward from the landing point. Stays on
              briefly to suggest residual charge. Olympus only. */}
          {cfg.id === 'gates-of-olympus' && (
            <AnimatePresence>
              {orbImpacts.map((imp) =>
                Array.from({ length: 6 }).map((_, i) => {
                  const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
                  const dist = 22 + Math.random() * 18;
                  const dx = Math.cos(angle) * dist;
                  const dy = Math.sin(angle) * dist;
                  return (
                    <motion.div
                      key={`${imp.id}-spark-${i}`}
                      className="absolute pointer-events-none z-[8] rounded-full"
                      style={{
                        left: `${liveInsets.left + (imp.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                        top: `${liveInsets.top + (imp.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                        width: '4px',
                        height: '4px',
                        background: '#fffbe1',
                        boxShadow: '0 0 8px #ffe9a8, 0 0 16px rgba(255,200,80,.85)',
                        transform: 'translate(-50%, -50%)',
                      }}
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                      animate={{ x: dx, y: dy, opacity: [0, 1, 0], scale: [0.6, 1.4, 0.4] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                    />
                  );
                })
              )}
            </AnimatePresence>
          )}

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

          {/* Cell halo on each freshly-landed scatter — soft radial glow only.
              The previous version fired a vertical 3px gold lightning streak
              down the entire column on every scatter landing; that read as a
              hard drawn line cutting through the symbols and felt like a
              rendering artefact rather than an effect. Now it's just a
              localised sparkle halo around the cell so the player knows a
              scatter dropped without the screen feeling cut. */}
          <AnimatePresence>
            {scatterFlashes.map((f) => (
              <motion.div
                key={f.id}
                className="absolute pointer-events-none z-[6]"
                style={{
                  left: `${liveInsets.left + (f.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top + (f.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  width: `${liveInsets.width / cfg.cols * 1.4}%`,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(255,233,168,0.8) 0%, rgba(255,200,80,.4) 35%, transparent 70%)',
                  mixBlendMode: 'screen',
                  filter: 'blur(2px)',
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.1, 1], opacity: [0, 0.85, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
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

          {/* Lit background around winning cluster centroids — warm gold
              radial glow behind each cluster makes the painted scene feel
              illuminated by the win. Real Pragmatic does this. */}
          <AnimatePresence>
            {clusterPopups.map((p) => (
              <motion.div
                key={`winlit-${p.id}`}
                className="absolute pointer-events-none z-[1] rounded-full"
                style={{
                  left: `${liveInsets.left + (p.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top + (p.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  width: `${liveInsets.width / cfg.cols * 3}%`,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(255,200,80,0.45) 0%, rgba(255,140,40,0.2) 35%, transparent 65%)',
                  filter: 'blur(8px)',
                  mixBlendMode: 'screen',
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.85, 0.65], scale: [0.5, 1.2, 1] }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.55 }}
              />
            ))}
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
                    // Per-slot gradient: Olympus uses gold (default look),
                    // Bonanza/Sugar Rush use pink, Cantina warm orange, etc.
                    // The cfg.theme.accent provides the slot's signature
                    // colour; we wrap white-cream-accent-darker into a vertical
                    // gradient so the popup reads native to the slot.
                    background: `linear-gradient(180deg, #FFFFFF 0%, #FFF5DC 30%, ${cfg.theme.accent} 65%, rgba(0,0,0,.55) 100%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: `drop-shadow(0 0 14px ${cfg.theme.glow}) drop-shadow(0 2px 4px rgba(0,0,0,.7))`,
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
          {/* Big-win lightning strikes (Olympus only). 3-12 bolts strike
              the scene with staggered timings during the big-win moment. */}
          {bigWinBolts.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none z-[9]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%' }}
            >
              {bigWinBolts.map((b) => (
                <g key={b.id} style={{ animation: `tierBoltFlash 0.7s ease-out ${b.delay}ms forwards`, opacity: 0 }}>
                  {/* Outer wide glow */}
                  <path
                    d={b.d}
                    stroke="#ffe9a8"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="miter"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(255,233,168,1)) drop-shadow(0 0 14px rgba(255,180,40,.85))',
                    }}
                  />
                  {/* Inner bright core */}
                  <path
                    d={b.d}
                    stroke="#fffbe1"
                    strokeWidth="0.5"
                    fill="none"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Impact ring at target */}
                  <circle cx={b.tx} cy={b.ty} r="2.2" fill="rgba(255,233,168,.55)" stroke="#ffe9a8" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
                </g>
              ))}
            </svg>
          )}
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
                {/* Bright halo behind the title — theme-tinted via
                    cfg.theme.accent so each slot's big-win celebration
                    has its own colour wash (Bonanza pink, Sugar Rush
                    magenta, Olympus gold, etc.) instead of a shared
                    Olympus-gold halo on every game. */}
                <motion.div
                  className="absolute"
                  style={{
                    width: '85%',
                    height: '50%',
                    background: `radial-gradient(ellipse at center, ${cfg.theme.accent}73 0%, ${cfg.theme.accent}33 35%, transparent 65%)`,
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
                    className="font-serif italic font-bold"
                    style={{
                      fontSize: `clamp(${24 + bigWin.tier.intensity * 6}px, ${8 + bigWin.tier.intensity * 1.5}vw, ${48 + bigWin.tier.intensity * 12}px)`,
                      letterSpacing: '-0.015em',
                      // Per-slot gradient: same approach as the cluster
                      // popup theming. White cream → slot accent → dark
                      // anchor reads natively for each game.
                      background: `linear-gradient(180deg, #ffffff 0%, #fff5dc 30%, ${cfg.theme.accent} 65%, rgba(0,0,0,.55) 100%)`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                      filter: `drop-shadow(0 0 24px ${cfg.theme.glow}) drop-shadow(0 4px 8px rgba(0,0,0,.6))`,
                      WebkitTextStroke:
                        bigWin.tier.intensity >= 2.4 ? `1px ${cfg.theme.accent}66` : undefined,
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
                    className="block font-serif italic font-extrabold mt-1"
                    style={{
                      fontSize: `clamp(${22 + bigWin.tier.intensity * 4}px, ${7 + bigWin.tier.intensity * 1}vw, ${42 + bigWin.tier.intensity * 8}px)`,
                      letterSpacing: '-0.015em',
                      background: `linear-gradient(180deg, #ffffff 0%, #fff5dc 30%, ${cfg.theme.accent} 65%, rgba(0,0,0,.55) 100%)`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                      filter: `drop-shadow(0 0 24px ${cfg.theme.glow}) drop-shadow(0 4px 8px rgba(0,0,0,.6))`,
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
            className={winTotal > 0 ? 'font-semibold' : 'text-ink-mute'}
            style={winTotal > 0 ? { color: cfg.theme.accent } : undefined}
          />
        </span>
        {statusMsg ? (
          <span
            className="truncate max-w-[60vw]"
            style={{ color: cfg.theme.accent }}
          >{statusMsg}</span>
        ) : autoplay ? (
          <span
            className="flex items-center gap-1.5"
            style={{ color: cfg.theme.accent }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: cfg.theme.accent }}
            />
            AUTO {autoplay.infinite ? '∞' : autoplay.remaining}
          </span>
        ) : !busy && !inFree && winTotal === 0 ? (
          balance.balance < (ante ? bet * cfg.ante.betMultiplier : bet) ? (
            <span className="text-[#ff5560] uppercase tracking-[0.18em] text-[10px] font-bold">
              Insufficient Balance
            </span>
          ) : (
            <span className="text-ink-mute uppercase tracking-[0.18em] text-[10px]">
              Place Your Bet
            </span>
          )
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
              // Theme-tinted Buy Bonus button — bright accent at top
              // fading into a deeper anchor at the bottom. Was a fixed
              // magenta/purple gradient that clashed with non-Bonanza
              // palettes (Olympus gold, Wanted rust, etc.).
              background: `linear-gradient(180deg, ${cfg.theme.accent} 0%, ${cfg.theme.accent}c0 35%, rgba(20,8,30,.7) 70%, rgba(20,8,30,.95) 100%)`,
              border: '1.5px solid #ffd37a',
              boxShadow: `inset 0 1px 0 rgba(255,233,168,.55), inset 0 -2px 0 rgba(20,8,30,.55), 0 0 14px ${cfg.theme.glow}, 0 4px 8px rgba(0,0,0,.5)`,
            }}
          >
            <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#fff7d6] leading-none"
                 style={{ textShadow: '0 1px 0 rgba(20,8,30,.7), 0 0 6px rgba(255,200,80,.7)' }}>
              Buy Free Spins
            </div>
            <div className="text-[11px] font-mono font-bold text-[#fff7d6] mt-0.5 leading-none tabular-nums"
                 style={{ textShadow: '0 1px 0 rgba(20,8,30,.7), 0 0 6px rgba(255,200,80,.95)' }}>
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
          data-fs={inFree ? '1' : undefined}
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
                // Theme-tinted dialog backdrop. Was hardcoded Olympus
                // amber + amethyst.
                background: `radial-gradient(ellipse at 50% 0%, ${cfg.theme.accent}40, rgba(15,8,12,.96) 70%), linear-gradient(180deg, ${cfg.theme.accent}20 0%, rgba(8,4,8,.95) 60%, rgba(4,2,4,1) 100%)`,
                border: `2px solid ${cfg.theme.accent}8c`,
                boxShadow: `inset 0 1px 0 ${cfg.theme.accent}55, 0 0 60px ${cfg.theme.glow}, 0 24px 80px rgba(0,0,0,.7)`,
              }}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              {/* Corner decoration — uses the slot's FS-trigger glyph
               *  (lightning for Olympus, chili for Cantina, sheriff star
               *  for Wanted, etc.) so the buy-bonus dialog matches the
               *  game's theme. */}
              <span className="absolute top-3 left-3 text-2xl" style={{ color: cfg.theme.accent, textShadow: `0 0 12px ${cfg.theme.glow}` }}>{fsTriggerGlyph}</span>
              <span className="absolute top-3 right-3 text-2xl" style={{ color: cfg.theme.accent, textShadow: `0 0 12px ${cfg.theme.glow}` }}>{fsTriggerGlyph}</span>

              <div className="p-6 pt-10 text-center">
                <div
                  className="font-serif italic font-bold mb-1"
                  style={{
                    fontSize: 'clamp(22px, 6vw, 32px)',
                    background: `linear-gradient(180deg, #ffffff 0%, #fff5dc 30%, ${cfg.theme.accent} 65%, rgba(0,0,0,.55) 100%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: `drop-shadow(0 0 18px ${cfg.theme.glow}) drop-shadow(0 4px 6px rgba(0,0,0,.6))`,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Buy Free Spins
                </div>
                <div
                  className="text-[10px] mb-5 uppercase tracking-[0.3em]"
                  style={{ color: `${cfg.theme.accent}c8` }}
                >
                  Skip the wait. Enter the bonus.
                </div>

                <div className="card bg-bg-elev/60 p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-dim uppercase tracking-wider">You Get</span>
                    <span
                      className="font-serif italic font-bold text-2xl"
                      style={{
                        color: cfg.theme.accent,
                        textShadow: `0 0 12px ${cfg.theme.glow}`,
                      }}
                    >
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
                    className="btn flex-1 py-3 disabled:opacity-50 font-bold"
                    style={{
                      // Theme-tinted Confirm button — accent gradient
                      // matches the Buy Bonus button itself.
                      background: `linear-gradient(180deg, ${cfg.theme.accent} 0%, ${cfg.theme.accent}c0 50%, rgba(20,8,30,.85) 100%)`,
                      color: '#fff',
                      border: `1.5px solid ${cfg.theme.accent}`,
                      boxShadow: `0 0 14px ${cfg.theme.glow}, inset 0 1px 0 rgba(255,255,255,.25)`,
                      textShadow: '0 1px 0 rgba(0,0,0,.45), 0 0 6px rgba(255,255,255,.4)',
                    }}
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
                          // Active preset uses theme accent gradient so
                          // each slot's bet picker feels native.
                          background: `linear-gradient(180deg, #fff5dc 0%, ${cfg.theme.accent} 30%, ${cfg.theme.accent} 70%, rgba(40,18,0,.7) 100%)`,
                          border: `1.5px solid ${cfg.theme.accent}`,
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,.6), 0 0 18px ${cfg.theme.glow}`,
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

      {/* === Free-spins retrigger callout — '+5 SPINS!' === */}
      <AnimatePresence>
        {retrigger && (
          <motion.div
            key={retrigger.key}
            className="absolute inset-0 pointer-events-none z-[115] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.4, y: 30, rotate: -4 }}
              animate={{
                scale: [0.4, 1.2, 1, 1.05, 1],
                y: [30, -8, 0, -4, -2],
                rotate: [-4, 2, 0, 0, 0],
              }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="font-serif italic font-bold olympus-fs-title"
                style={{ fontSize: 'clamp(34px, 9vw, 64px)' }}
              >
                +{retrigger.count}
              </div>
              <div
                className="font-mono uppercase tracking-[0.3em] font-bold"
                style={{
                  fontSize: 'clamp(10px, 2.6vw, 16px)',
                  color: '#FFE0A8',
                  textShadow: '0 0 12px rgba(255,200,40,.85), 0 1px 2px rgba(0,0,0,.6)',
                }}
              >
                Free Spins
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Lightning Strike: simplified for clarity ===
          A single bright white flash + bolt + screen shake. No dim overlay,
          no title — the player should just see Zeus strike and orbs slam in,
          not be confused by a layered overlay obscuring the board. */}
      <AnimatePresence>
        {lightningStrike && (
          <motion.div
            className="absolute inset-0 z-[110] pointer-events-none overflow-hidden rounded-[14px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {/* Single white screen flash — quick, then gone */}
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0, 0.25, 0] }}
              transition={{ duration: 0.55, times: [0, 0.05, 0.2, 0.3, 0.5] }}
            />

            {/* Jagged forked lightning bolt down the centre — real
                Pragmatic Olympus shows a proper zigzag bolt with a side
                fork, not a straight bar. SVG strokes give the
                zigzag-with-fork shape; outer halo + inner bright core
                stack creates the "lit-from-inside" gold glow. */}
            <motion.svg
              className="absolute"
              viewBox="0 0 20 100"
              preserveAspectRatio="none"
              style={{
                left: '50%',
                top: '5%',
                bottom: '15%',
                width: '10%',
                transform: 'translateX(-50%)',
                filter:
                  'drop-shadow(0 0 12px rgba(255,233,168,1)) drop-shadow(0 0 40px rgba(255,180,40,.85))',
              }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: [0, 1, 0.4, 0.9, 0], scaleY: [0.3, 1, 1, 1, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {/* Outer wider yellow halo */}
              <path
                d="M 11 0 L 7 28 L 12 32 L 6 58 L 13 62 L 4 100"
                stroke="#ffe9a8"
                strokeWidth="3.5"
                strokeLinejoin="miter"
                strokeLinecap="round"
                fill="none"
              />
              {/* Inner bright core */}
              <path
                d="M 11 0 L 7 28 L 12 32 L 6 58 L 13 62 L 4 100"
                stroke="#fffbe1"
                strokeWidth="1.4"
                strokeLinejoin="miter"
                strokeLinecap="round"
                fill="none"
              />
              {/* Side fork branching off near the bottom */}
              <path
                d="M 6 58 L 18 72 L 14 80"
                stroke="#ffe9a8"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />
              <path
                d="M 6 58 L 18 72 L 14 80"
                stroke="#fffbe1"
                strokeWidth="0.8"
                strokeLinecap="round"
                fill="none"
              />
            </motion.svg>

            {/* Subtle Zeus area highlight (less intrusive than before) */}
            <motion.div
              className="absolute"
              style={{
                left: '-5%',
                top: '0%',
                width: '45%',
                height: '50%',
                background:
                  'radial-gradient(ellipse at 30% 30%, rgba(255,233,168,0.5) 0%, rgba(255,200,80,0.25) 35%, transparent 70%)',
                mixBlendMode: 'screen',
                filter: 'blur(6px)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.4] }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Free-spins outro overlay ===
          Plays at the end of a free-spins session showing the total won. */}
      <AnimatePresence>
        {fsOutroOverlay && (
          <motion.div
            className="fixed inset-0 z-[120] flex flex-col items-center justify-center text-center p-6 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${cfg.theme.accent}38, rgba(10,4,8,.96) 70%)`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              className="text-[10px] md:text-sm mb-2 uppercase tracking-[0.42em] font-mono font-bold"
              style={{
                color: cfg.theme.accent,
                textShadow: `0 0 14px ${cfg.theme.glow}, 0 2px 4px rgba(0,0,0,.5)`,
              }}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              Free Spins Complete
            </motion.div>
            <motion.div
              className="font-serif italic font-bold"
              style={{
                fontSize: 'clamp(28px, 8vw, 56px)',
                background: `linear-gradient(180deg, #ffffff 0%, #fff5dc 30%, ${cfg.theme.accent} 65%, rgba(0,0,0,.55) 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: `drop-shadow(0 0 24px ${cfg.theme.glow}) drop-shadow(0 4px 8px rgba(0,0,0,.6))`,
                letterSpacing: '-0.02em',
              }}
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

      {/* Mid-spin total-multiplier reveal — shown briefly at the end of
          each FS spin where orbs summed. Theme-tinted via cfg.theme.accent
          so each slot's reveal feels native (gold for Olympus, hot pink
          for Bonanza, etc.). Pure CSS animation; no engine changes. */}
      <AnimatePresence>
        {fsMultReveal && (
          <motion.div
            className="fixed inset-0 z-[115] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="flex flex-col items-center"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.18, 1], opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.34, 1.6, 0.64, 1] }}
            >
              <div
                className="font-mono uppercase tracking-widest"
                style={{
                  fontSize: 'clamp(10px, 2vw, 14px)',
                  color: cfg.theme.accent,
                  textShadow: `0 0 12px ${cfg.theme.glow}`,
                }}
              >
                Total Multiplier
              </div>
              <div
                className="font-mono font-black leading-none mt-1"
                style={{
                  fontSize: 'clamp(64px, 16vw, 144px)',
                  color: '#fffbe1',
                  WebkitTextStroke: `2px ${cfg.theme.accent}`,
                  textShadow: `0 0 32px ${cfg.theme.glow}, 0 0 64px ${cfg.theme.glow}, 0 6px 14px rgba(0,0,0,.7)`,
                  letterSpacing: '-0.04em',
                }}
              >
                ×{fmtMultiplier(fsMultReveal.sumOfMultipliers)}
              </div>
              <div
                className="font-mono font-bold mt-2"
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 32px)',
                  color: cfg.theme.accent,
                  textShadow: `0 0 16px ${cfg.theme.glow}, 0 4px 8px rgba(0,0,0,.6)`,
                }}
              >
                {fmtCurrency(fsMultReveal.finalPayout)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free-spins trigger overlay */}
      <AnimatePresence>
        {fsOverlay && (
          <motion.div
            className="fixed inset-0 z-[120] flex flex-col items-center justify-center text-center p-6 pointer-events-none"
            // Per-slot tinted backdrop for the FS-trigger moment.
            // Was the shared olympus-fs-overlay (warm amber radial)
            // — now uses the slot's accent so each game's trigger
            // moment feels native.
            style={{
              background: `radial-gradient(ellipse at center, ${cfg.theme.accent}38, rgba(10,4,8,.96) 70%)`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
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
              {fsOverlay.reason === 'buy'
                ? 'BONUS UNLOCKED'
                : (fsTriggerTitle ?? 'FREE SPINS!')}
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
                    // Glyph colour pulled from the slot's accent. White-
                    // ish base with a theme-tinted halo so emoji-rendered
                    // glyphs (chili 🌶, sheriff star ⭐, full moon 🌕,
                    // scarab 🪲) keep their natural colour while the
                    // surrounding glow matches the game palette.
                    color: '#ffffff',
                    textShadow: `0 0 18px ${cfg.theme.accent}f0, 0 0 36px ${cfg.theme.glow}`,
                  }}
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], rotate: [180, 20, 0], opacity: [0, 1, 1] }}
                  transition={{ duration: 0.8, delay, ease: 'easeOut' }}
                >{fsTriggerGlyph}</motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <Paytable open={paytableOpen} onClose={() => setPaytableOpen(false)} cfg={cfg} renderCell={renderCell} />

      {/* Welcome splash — first 3.5s after page load, dismissible by tap.
          Real Pragmatic shows the game name + max win on every load. */}
      <AnimatePresence>
        {welcomeSplash && (
          <motion.button
            type="button"
            onClick={() => {
              setWelcomeSplash(false);
              // Prime Zeus voice on first user gesture so the
              // SpeechSynthesis API has permission to speak when the
              // first multiplier or scatter event fires. Browsers
              // require a user gesture before audio/speech can play;
              // tapping the welcome splash is the earliest possible
              // gesture in the slot session, so we use it.
              if (cfg.id === 'gates-of-olympus') {
                primeZeus();
              }
            }}
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center text-center p-6"
            style={{
              // Welcome splash background tinted with the slot's accent —
              // each game gets a backdrop in its own colour family rather
              // than the shared warm-brown that read as Olympus regardless
              // of which slot was loading. Ellipse: dim accent at centre →
              // near-black at the edges keeps focus on the game-name text.
              background: `radial-gradient(ellipse at center, ${cfg.theme.accent}28, rgba(10,4,8,.97) 70%)`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="font-serif italic font-bold text-4xl md:text-6xl mb-2"
              style={{
                background: `linear-gradient(180deg, #ffffff 0%, #fff5dc 30%, ${cfg.theme.accent} 65%, rgba(0,0,0,.55) 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: `drop-shadow(0 0 24px ${cfg.theme.glow}) drop-shadow(0 4px 8px rgba(0,0,0,.6))`,
                letterSpacing: '-0.02em',
              }}
              initial={{ scale: 0.4, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            >
              {cfg.name}
            </motion.div>
            <motion.div
              className="olympus-fs-sub text-xs md:text-base mb-8"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Provably fair · play money
            </motion.div>
            <motion.div
              className="font-mono uppercase tracking-[0.32em] text-[#FFE0A8] text-[11px] mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Max Win
            </motion.div>
            <motion.div
              className="font-serif italic font-bold text-3xl md:text-5xl"
              style={{
                background: `linear-gradient(180deg, #ffffff 0%, #fff5dc 30%, ${cfg.theme.accent} 65%, rgba(0,0,0,.55) 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: `drop-shadow(0 0 24px ${cfg.theme.glow}) drop-shadow(0 4px 8px rgba(0,0,0,.6))`,
                letterSpacing: '-0.02em',
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 14 }}
            >
              {maxWinLabel}
            </motion.div>
            <motion.div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em]"
              style={{ color: `${cfg.theme.accent}b3` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.45, 0.85, 0.45] }}
              transition={{ delay: 1, duration: 1.5, repeat: Infinity }}
            >
              Tap to begin
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

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
