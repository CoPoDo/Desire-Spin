import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const FRAME_DELAY = {
  initialDrop: 380,
  multipliersLanded: 600,
  wins: 700,
  tumble: 340,
  scattersWon: 800,
  freeSpinsAwarded: 1100,
  freeSpinsBegin: 900,
  freeSpinsEnd: 1100,
  multiplierApplied: 1100,
  final: 0,
} as const;

const DEFAULT_PRESETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

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
  const [bigWin, setBigWin] = useState<{ payout: number; multiplier: number } | null>(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [floatingMults, setFloatingMults] = useState<MultiplierLanding[]>([]);
  const [fsOverlay, setFsOverlay] = useState<{ count: number; reason: 'scatter' | 'retrigger' | 'buy' } | null>(null);
  const [betSheetOpen, setBetSheetOpen] = useState(false);
  const aliveRef = useRef(true);
  const busyRef = useRef(false);

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
            setNewKeys(fresh);
            setFloatingMults([]);
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
            sound.play('big-win');
            if (frame.reason !== 'retrigger') {
              setFsOverlay({ count: frame.count, reason: frame.reason });
              setTimeout(() => setFsOverlay(null), 2200);
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
            break;
          }
          case 'multiplierApplied': {
            sound.play('big-win');
            setStatusMsg(`×${fmtMultiplier(frame.sumOfMultipliers)} → ${fmtCurrency(frame.finalPayout)}`);
            break;
          }
          case 'freeSpinsEnd': {
            setFreeSpins(null);
            sound.play('big-win');
            const mx = frame.totalPayout / Math.max(betUsed, 0.01);
            if (mx >= 20) setBigWin({ payout: frame.totalPayout, multiplier: mx });
            break;
          }
          case 'final': {
            if (mode === 'free') {
              setFreeSpins((s) =>
                s ? { ...s, remaining: Math.max(0, s.remaining - 1), running: s.running + frame.spinPayout } : s,
              );
            }
            const mx = frame.spinPayout / Math.max(betUsed, 0.01);
            if (mode === 'base' && mx >= 20) {
              setBigWin({ payout: frame.spinPayout, multiplier: mx });
            }
            break;
          }
        }
        const delay = FRAME_DELAY[frame.kind] ?? 200;
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
      setBigWin(null);
      setFloatingMults([]);
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
      {/* Painted backdrop scene fills available space, preserves aspect ratio.
          pt-12 clears the floating top bar; min-h-0 + overflow-hidden lets the
          flex-1 area shrink properly so the bottom bar is always in view. */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden pt-12 pb-1 px-2">
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

          {/* Big win celebration centered on grid */}
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
                  initial={{ scale: 0.5, rotate: -4 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                  onAnimationComplete={() => setTimeout(() => setBigWin(null), 1700)}
                >
                  <div className="font-serif italic font-bold olympus-fs-title" style={{ fontSize: 'clamp(28px, 9vw, 56px)' }}>
                    {bigWin.multiplier >= 100 ? 'MEGA WIN' : bigWin.multiplier >= 50 ? 'BIG WIN' : 'NICE WIN'}
                  </div>
                  <div className="font-mono font-semibold mt-1" style={{
                    fontSize: 'clamp(18px, 5vw, 32px)',
                    color: '#FFE9A8',
                    textShadow: '0 0 18px rgba(255,200,40,.8), 0 2px 4px rgba(0,0,0,.6)',
                  }}>
                    {fmtCurrency(bigWin.payout)}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status row above the bottom bar */}
      <div className="flex items-center justify-between px-4 h-7 text-[11px] font-mono">
        <span className="text-ink-dim">
          Last win <span className={winTotal > 0 ? 'text-[#ffe9a8]' : 'text-ink-mute'}>{fmtCurrency(winTotal)}</span>
        </span>
        {inFree ? (
          <span className="olympus-fs-counter px-2 py-0.5 rounded text-[#ffe9a8]">
            FS {(freeSpins!.total - freeSpins!.remaining)}/{freeSpins!.total} · won {fmtCurrency(freeSpins!.running)}
          </span>
        ) : statusMsg ? (
          <span className="text-[#ffe9a8]">{statusMsg}</span>
        ) : null}
      </div>

      {/* Bottom action bar — Pragmatic-style mobile spin controls */}
      <div
        className="flex items-stretch justify-between gap-2 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] bg-gradient-to-t from-black/80 via-black/55 to-transparent"
      >
        {/* Bet stepper */}
        <div className="flex flex-col items-center justify-center min-w-[88px]">
          <div className="text-[9px] uppercase tracking-[0.18em] text-ink-mute">Bet</div>
          <div className="flex items-center gap-1 mt-0.5">
            <button
              aria-label="Decrease bet"
              onClick={stepDown}
              disabled={busy || presetIdx === 0}
              className="w-7 h-7 rounded-full bg-bg-card border border-edge text-ink hover:bg-bg-hover disabled:opacity-40 flex items-center justify-center text-base leading-none"
            >−</button>
            <button
              onClick={() => setBetSheetOpen(true)}
              disabled={busy}
              className="font-mono font-semibold text-sm tabular-nums text-[#ffe9a8] min-w-[52px] text-center"
              style={{ textShadow: '0 0 10px rgba(255,200,40,.5)' }}
            >
              {fmtCurrency(bet)}
            </button>
            <button
              aria-label="Increase bet"
              onClick={stepUp}
              disabled={busy || presetIdx === betPresets.length - 1}
              className="w-7 h-7 rounded-full bg-bg-card border border-edge text-ink hover:bg-bg-hover disabled:opacity-40 flex items-center justify-center text-base leading-none"
            >+</button>
          </div>
        </div>

        {/* Big round SPIN button */}
        <button
          aria-label={inFree ? 'Free spin' : 'Spin'}
          onClick={() => runRound('spin')}
          disabled={busy || balance.balance < (ante ? bet * cfg.ante.betMultiplier : bet)}
          className="spin-btn flex-shrink-0"
        >
          <span className="spin-btn-inner">
            <span className="spin-btn-text">
              {busy ? (inFree ? `${freeSpins!.remaining}` : '…') : inFree ? freeSpins!.remaining : 'SPIN'}
            </span>
          </span>
        </button>

        {/* Buy bonus + ante toggle */}
        <div className="flex flex-col items-center justify-center min-w-[88px] gap-1">
          <button
            onClick={() => runRound('buy')}
            disabled={busy || inFree || balance.balance < buyCost}
            className="w-full px-2 py-1.5 rounded-lg bg-gradient-to-b from-[#5a2a8a] to-[#2c1147] border border-[#a78bfa]/40 text-[#e6d4ff] text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:saturate-50"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), 0 0 14px rgba(167,139,250,.25)' }}
          >
            Buy {cfg.buyBonusCost}×
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-wider text-ink-dim">
            <input
              type="checkbox"
              checked={ante}
              onChange={(e) => setAnte(e.target.checked)}
              disabled={busy || inFree}
              className="accent-[#ffc62a] w-3 h-3"
            />
            Ante
          </label>
        </div>
      </div>

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
