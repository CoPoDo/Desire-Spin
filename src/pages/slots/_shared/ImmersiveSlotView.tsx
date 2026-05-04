import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadJson, saveJson } from '../../../lib/storage';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../../game-context';
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

const FRAME_DELAY: Record<string, number> = {
  initialDrop: 380,
  lightningStrike: 1500,
  multipliersLanded: 600,
  wins: 700,
  tumble: 340,
  scattersWon: 800,
  freeSpinsAwarded: 1200,
  freeSpinsBegin: 1100,
  freeSpinsEnd: 1400,
  multiplierApplied: 1100,
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
  const { balance, fairness, history, sound } = useGame();
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
  const [clusterPopups, setClusterPopups] = useState<{ id: string; col: number; row: number; payout: number }[]>([]);
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
    return () => { aliveRef.current = false; };
  }, []);

  const playFrames = useCallback(
    async (frames: Frame[], betUsed: number, mode: SpinMode) => {
      let lastGrid: TGrid | null = null;
      for (const frame of frames) {
        if (!aliveRef.current) return;
        switch (frame.kind) {
          case 'initialDrop': {
            const keys = new Set<string>();
            for (const col of frame.grid) for (const c of col) keys.add(c.key);
            setNewKeys(keys);
            setGrid(frame.grid);
            setWinning(new Set());
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
                setTimeout(() => sound.play('scatter-land'), 100 + i * 130);
              }
              if (scatterPositions.length >= 3) {
                setAnticipation(scatterPositions.length);
                sound.play('thunder');
              }
              setTimeout(() => setScatterFlashes([]), 1100);
            }
            break;
          }
          case 'lightningStrike': {
            // Real-Olympus signature: Zeus appears, lifts arm, lightning slams
            // multiplier orbs onto the board. Dramatic full-screen overlay.
            sound.play('lightning-strike');
            setLightningStrike(true);
            // Stagger orb thunks during the strike for impact.
            for (let i = 0; i < frame.landings.length; i++) {
              setTimeout(() => sound.play('multiplier'), 600 + i * 110);
            }
            // Apply the new grid (with multipliers) about 80% through the
            // strike animation so the orbs visually appear during the boom.
            setTimeout(() => {
              setFloatingMults(frame.landings);
              setGrid(frame.grid);
              lastGrid = frame.grid;
            }, 600);
            // Hide overlay near the end of the frame delay.
            setTimeout(() => setLightningStrike(false), 1300);
            break;
          }
          case 'wins': {
            const win = new Set<string>();
            for (const w of frame.wins) for (const [c, r] of w.positions) win.add(`${c}:${r}`);
            setGrid(frame.grid);
            setWinning(win);
            sound.play('win');
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
                setTimeout(() => sound.play('scatter-land'), 80 + i * 110);
              }
              setTimeout(() => setScatterFlashes([]), 900);
            }
            const totalScatters = countScattersInGrid(frame.grid, cfg.scatterId);
            if (totalScatters >= 3) {
              setAnticipation(totalScatters);
              if (newScatters.length > 0) sound.play('thunder');
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
              setTimeout(() => setFsOverlay(null), 2400);
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
            setTimeout(() => setFsOutroOverlay(null), 2800);
            setFreeSpins(null);
            const tier = winTierFor(frame.totalPayout, betUsed);
            if (tier) {
              setBigWin({ payout: frame.totalPayout, tier });
              sound.play(tier.sound);
            }
            break;
          }
          case 'final': {
            if (mode === 'free') {
              setFreeSpins((s) =>
                s ? { ...s, remaining: Math.max(0, s.remaining - 1), running: s.running + frame.spinPayout } : s,
              );
            }
            if (mode === 'base') {
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
      setBigWin(null);
      setFloatingMults([]);
      setClusterPopups([]);
      setScatterFlashes([]);
      setAnticipation(0);
      setStatusMsg('');
      setWinTotal(0);
      sound.play('spin');
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
      {/* Persistent free-spins counter — fixed top, shows over the floating
          top bar during a free-spins session. Real-Olympus parity. */}
      {inFree && freeSpins && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-1.5 rounded-full olympus-fs-counter">
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-widest text-[#FFE0A8]">Free Spins</span>
            <span className="font-serif italic font-bold text-lg leading-none text-[#ffe9a8] tabular-nums"
                  style={{ textShadow: '0 0 12px rgba(255,200,40,.8)' }}>
              {(freeSpins.total - freeSpins.remaining)}/{freeSpins.total}
            </span>
          </div>
          <span className="text-[#FFE0A8]/40 text-lg">·</span>
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-widest text-[#FFE0A8]">Total Won</span>
            <CountUp
              value={freeSpins.running}
              format={fmtCurrency}
              className="font-serif italic font-bold text-lg leading-none text-[#ffe9a8] tabular-nums"
              style={{ textShadow: '0 0 12px rgba(255,200,40,.8)' }}
            />
          </div>
        </div>
      )}

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
          className="relative h-full"
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
            style={{
              filter: 'drop-shadow(0 12px 40px rgba(0,0,0,.6))',
              borderRadius: '14px',
            }}
          />
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
          {/* Grid positioned inside the arch */}
          <div
            className="absolute"
            style={{
              left: `${liveInsets.left}%`,
              top: `${liveInsets.top}%`,
              width: `${liveInsets.width}%`,
            }}
          >
            <Grid grid={grid} cfg={cfg} winning={winning} newKeys={newKeys} renderCell={renderCell} bare />
          </div>

          {/* Floating multipliers overlay */}
          <AnimatePresence>
            {floatingMults.map((m) => (
              <motion.div
                key={`fm-${m.key}`}
                className="absolute pointer-events-none font-serif italic font-bold"
                style={{
                  color: '#FFE9A8',
                  left: `${liveInsets.left + (m.col + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  top: `${liveInsets.top + (m.row + 0.5) * (liveInsets.width / cfg.cols)}%`,
                  textShadow: '0 0 18px rgba(255,200,40,.95)',
                  fontSize: 'clamp(20px, 5vw, 32px)',
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
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

          {/* Anticipation: pulsing amber-red border + dim when 3+ scatters
              are visible (one away from a free spins trigger). Real Olympus
              has the same tension-build during cascades. */}
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
              Positioned at the centroid of the winning cells. */}
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
                initial={{ scale: 0.3, opacity: 0, y: 8 }}
                animate={{ scale: [0.3, 1.15, 1], opacity: 1, y: -10 }}
                exit={{ opacity: 0, y: -22, scale: 0.9 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <span
                  className="font-serif italic font-bold text-[#fff7d6] px-2 py-0.5 rounded-md whitespace-nowrap"
                  style={{
                    fontSize: 'clamp(13px, 3.4vw, 22px)',
                    background: 'linear-gradient(180deg, rgba(80,40,5,.85), rgba(40,20,2,.9))',
                    border: '1px solid rgba(255,233,168,.6)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,.25), 0 0 16px rgba(255,200,40,.55), 0 4px 10px rgba(0,0,0,.5)',
                    textShadow: '0 0 10px rgba(255,200,40,.85), 0 1px 2px rgba(0,0,0,.6)',
                  }}
                >
                  +{fmtCurrency(p.payout)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Tiered Big/Huge/Mega/Epic Win celebration centered on grid.
              Title pulses, payout counts up live, intensity scales with tier. */}
          <AnimatePresence>
            {bigWin && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="text-center"
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
                  onAnimationComplete={() =>
                    setTimeout(() => setBigWin(null), 2200 + bigWin.tier.intensity * 400)
                  }
                >
                  <motion.div
                    className="font-serif italic font-bold olympus-fs-title"
                    style={{ fontSize: `clamp(${24 + bigWin.tier.intensity * 6}px, ${8 + bigWin.tier.intensity * 1.5}vw, ${48 + bigWin.tier.intensity * 12}px)` }}
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {bigWin.tier.label}
                  </motion.div>
                  <CountUp
                    value={bigWin.payout}
                    duration={1400}
                    format={fmtCurrency}
                    className="block font-mono font-bold mt-1"
                    style={{
                      fontSize: 'clamp(22px, 7vw, 42px)',
                      color: '#FFE9A8',
                      textShadow: '0 0 22px rgba(255,200,40,.9), 0 4px 8px rgba(0,0,0,.6)',
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      {/* Status row above the bottom bar */}
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
              className="w-8 h-8 rounded-full bg-bg-card border border-edge text-ink hover:bg-bg-hover disabled:opacity-40 flex items-center justify-center text-lg leading-none"
            >−</button>
            <button
              onClick={() => setBetSheetOpen(true)}
              disabled={busy || autoplay !== null}
              className="flex flex-col items-center"
            >
              <span className="text-[8px] uppercase tracking-[0.2em] text-ink-mute leading-none">Bet</span>
              <span className="font-mono font-semibold text-sm tabular-nums text-[#ffe9a8] min-w-[52px] text-center"
                    style={{ textShadow: '0 0 10px rgba(255,200,40,.5)' }}>
                {fmtCurrency(bet)}
              </span>
            </button>
            <button
              aria-label="Increase bet"
              onClick={stepUp}
              disabled={busy || autoplay !== null || presetIdx === betPresets.length - 1}
              className="w-8 h-8 rounded-full bg-bg-card border border-edge text-ink hover:bg-bg-hover disabled:opacity-40 flex items-center justify-center text-lg leading-none"
            >+</button>
          </div>
          <button
            onClick={() => setBuyBonusOpen(true)}
            disabled={busy || inFree || autoplay !== null || balance.balance < buyCost}
            className="w-full px-2 py-1 rounded-lg bg-gradient-to-b from-[#5a2a8a] to-[#2c1147] border border-[#a78bfa]/40 text-[#e6d4ff] text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:saturate-50"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), 0 0 14px rgba(167,139,250,.25)' }}
          >
            Buy {cfg.buyBonusCost}×
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
            <span className="spin-btn-text">
              {autoplay
                ? 'STOP'
                : busy
                  ? (inFree ? `${freeSpins!.remaining}` : '…')
                  : inFree ? freeSpins!.remaining : 'SPIN'}
            </span>
          </span>
        </button>

        {/* Right column: turbo + auto + ante */}
        <div className="flex flex-col items-center justify-end gap-1.5 min-w-[96px]">
          <div className="flex items-center gap-1.5">
            <button
              aria-label={turbo ? 'Turbo on' : 'Turbo off'}
              onClick={() => setTurbo((t) => !t)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-base leading-none transition ${
                turbo
                  ? 'bg-gradient-to-b from-[#ffc62a] to-[#c8932e] border-[#ffe9a8] text-[#1a0f00] shadow-[0_0_14px_rgba(255,198,42,.6)]'
                  : 'bg-bg-card border-edge text-ink-dim'
              }`}
            >⚡</button>
            <button
              aria-label="Auto play"
              onClick={() => setAutoplaySheetOpen(true)}
              disabled={busy || inFree}
              className="w-8 h-8 rounded-full bg-bg-card border border-edge text-ink-dim hover:bg-bg-hover disabled:opacity-40 flex items-center justify-center text-base leading-none"
            >↻</button>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-wider text-ink-dim w-full justify-center">
            <input
              type="checkbox"
              checked={ante}
              onChange={(e) => setAnte(e.target.checked)}
              disabled={busy || inFree || autoplay !== null}
              className="accent-[#ffc62a] w-3 h-3"
            />
            Ante
          </label>
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

      {/* Autoplay sheet */}
      {autoplaySheetOpen && (
        <>
          <button
            aria-label="Close autoplay menu"
            onClick={() => setAutoplaySheetOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-bg-card border-t border-edge p-4 pb-[max(env(safe-area-inset-bottom),16px)] animate-rise">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold">Auto-play</h3>
              <button onClick={() => setAutoplaySheetOpen(false)} className="text-ink-dim text-xl">✕</button>
            </div>
            <p className="text-xs text-ink-dim mb-3">
              The reels spin automatically with the current bet. Tap STOP at any time, or it'll
              pause if your balance dips below the bet.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {AUTOPLAY_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setAutoplay({ remaining: n === 0 ? 0 : n, infinite: n === 0 });
                    setAutoplaySheetOpen(false);
                  }}
                  className="py-3 rounded-xl font-mono font-semibold text-sm bg-bg-elev border border-edge text-ink hover:bg-bg-hover"
                >
                  {n === 0 ? '∞' : n}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAutoplaySheetOpen(false)}
              className="mt-3 w-full py-2.5 rounded-xl bg-bg-hover text-ink-dim text-sm"
            >Cancel</button>
          </div>
        </>
      )}

      {/* Bet preset sheet */}
      {betSheetOpen && (
        <>
          <button
            aria-label="Close bet menu"
            onClick={() => setBetSheetOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-bg-card border-t border-edge p-4 pb-[max(env(safe-area-inset-bottom),16px)] animate-rise">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold">Bet amount</h3>
              <button onClick={() => setBetSheetOpen(false)} className="text-ink-dim text-xl">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {betPresets.map((v) => (
                <button
                  key={v}
                  onClick={() => { setBet(v); setBetSheetOpen(false); }}
                  className={`py-3 rounded-xl font-mono font-semibold text-sm transition ${
                    bet === v
                      ? 'bg-gradient-to-b from-[#f5c56f] to-[#c8932e] text-[#1a0f00] shadow-[0_0_18px_rgba(255,198,42,.5)]'
                      : 'bg-bg-elev border border-edge text-ink hover:bg-bg-hover'
                  }`}
                >
                  {fmtCurrency(v)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setBetSheetOpen(false)}
              className="mt-3 w-full py-2.5 rounded-xl bg-bg-hover text-ink-dim text-sm"
            >Cancel</button>
          </div>
        </>
      )}

      {/* Coin shower for big wins (tier-scaled intensity) */}
      <CoinShower active={bigWin !== null} intensity={bigWin?.tier.intensity ?? 1} />

      {/* === Lightning Strike (Zeus arm-raise) overlay ===
          Real-Olympus signature feature: dramatic dim, lightning streaks
          across the screen, Zeus silhouette glows, and multiplier orbs
          slam onto the board (handled by the playFrames staggered timeouts). */}
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
            {/* Lightning bolts — three thick zags zip across at staggered times */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + i * 28}%`,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background:
                    'linear-gradient(180deg, transparent, #fffbe1 12%, #ffe9a8 30%, #ffc62a 60%, transparent 100%)',
                  filter: 'drop-shadow(0 0 24px rgba(255,200,80,.95)) drop-shadow(0 0 60px rgba(255,140,40,.8))',
                  transform: `skewX(${i % 2 === 0 ? -8 : 8}deg)`,
                }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: [0, 1, 0.9, 0], scaleY: [0.4, 1, 1, 1] }}
                transition={{ duration: 0.55, delay: i * 0.18, ease: 'easeOut' }}
              />
            ))}
            {/* Screen flash */}
            <motion.div
              className="absolute inset-0 bg-[#fffbe1]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.55, 0, 0.3, 0] }}
              transition={{ duration: 0.7, times: [0, 0.05, 0.18, 0.25, 0.4] }}
            />
            {/* Zeus title */}
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

/** Real Pragmatic Olympus win tiers, by payout-to-bet ratio. */
type WinTier = { label: string; intensity: number; sound: 'big-win' | 'mega-win' };
function winTierFor(payout: number, bet: number): WinTier | null {
  const ratio = payout / Math.max(bet, 0.01);
  if (ratio >= 100) return { label: 'EPIC WIN',  intensity: 2.4, sound: 'mega-win' };
  if (ratio >= 50)  return { label: 'MEGA WIN',  intensity: 1.7, sound: 'mega-win' };
  if (ratio >= 25)  return { label: 'HUGE WIN',  intensity: 1.2, sound: 'big-win' };
  if (ratio >= 10)  return { label: 'BIG WIN',   intensity: 0.8, sound: 'big-win' };
  return null;
}
