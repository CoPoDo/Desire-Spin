import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  WinGroup,
} from './types';
import { BetControls } from './BetControls';
import { Grid } from './Grid';
import type { CellRenderer } from './Grid';
import { Paytable } from './Paytable';
import { buyBonusRound, playRound } from './engine';

const FRAME_DELAY = {
  initialDrop: 380,
  multipliersLanded: 600,
  wins: 720,
  tumble: 350,
  scattersWon: 800,
  freeSpinsAwarded: 1100,
  freeSpinsBegin: 900,
  freeSpinsEnd: 1100,
  multiplierApplied: 1100,
  final: 0,
} as const;

const BET_PRESETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

export type SlotShellProps = {
  cfg: SlotConfig;
  /** Renders one cell's symbol (SVG / styling). */
  renderCell: CellRenderer;
  /** Render an empty grid placeholder before first spin (for symbol intro art). */
  initialGrid?: TGrid;
};

export function SlotShell({ cfg, renderCell, initialGrid }: SlotShellProps) {
  const { balance, fairness, history, sound } = useGame();
  const [bet, setBet] = useState(1);
  const [ante, setAnte] = useState(false);
  const [busy, setBusy] = useState(false);
  const [grid, setGrid] = useState<TGrid>(() => initialGrid ?? makeBlank(cfg));
  const [winning, setWinning] = useState<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const [statusMsg, setStatusMsg] = useState<string>('Place your bet to spin.');
  const [winTotal, setWinTotal] = useState(0);
  const [freeSpins, setFreeSpins] = useState<{ remaining: number; total: number; running: number } | null>(null);
  const [bigWin, setBigWin] = useState<{ payout: number; multiplier: number } | null>(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [floatingMults, setFloatingMults] = useState<MultiplierLanding[]>([]);
  const [fsOverlay, setFsOverlay] = useState<{ count: number; reason: 'scatter' | 'retrigger' | 'buy' } | null>(null);
  const aliveRef = useRef(true);
  // busyRef shadows the busy state for synchronous re-entry guards — clicking
  // Spin twice rapidly won't double-debit because the ref flips immediately.
  const busyRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const playFrames = useCallback(
    async (frames: Frame[], betUsed: number, mode: SpinMode) => {
      let totalThisRound = 0;
      let lastGrid: TGrid | null = null;
      for (const frame of frames) {
        if (!aliveRef.current) return totalThisRound;
        switch (frame.kind) {
          case 'initialDrop': {
            // Mark all cells as fresh for drop animation
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
            const payChainText = formatChainCallout(frame.wins, frame.chainPayout);
            setStatusMsg(payChainText);
            lastGrid = frame.grid;
            break;
          }
          case 'multipliersLanded': {
            setFloatingMults(frame.landings);
            setGrid(frame.grid);
            lastGrid = frame.grid;
            sound.play('multiplier');
            setStatusMsg(`Multiplier${frame.landings.length > 1 ? 's' : ''} dropped!`);
            break;
          }
          case 'tumble': {
            // Diff old vs new for fresh keys
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
            setStatusMsg(`Scatters paid ${fmtCurrency(frame.payout)} (×${frame.count})`);
            break;
          }
          case 'freeSpinsAwarded': {
            sound.play('big-win');
            setStatusMsg(
              frame.reason === 'retrigger'
                ? `+${frame.count} free spins (retrigger!)`
                : frame.reason === 'buy'
                  ? `Bonus purchased: ${frame.count} free spins`
                  : `Free spins won! ${frame.count} awarded.`,
            );
            // Show full-screen overlay only for the initial trigger / buy.
            if (frame.reason !== 'retrigger') {
              setFsOverlay({ count: frame.count, reason: frame.reason });
              setTimeout(() => setFsOverlay(null), 2200);
            }
            setFreeSpins((s) => {
              if (frame.reason === 'retrigger' && s) {
                return { ...s, total: s.total + frame.count, remaining: s.remaining + frame.count };
              }
              return null; // begin frame will set actual state
            });
            break;
          }
          case 'freeSpinsBegin': {
            setFreeSpins({ remaining: frame.total, total: frame.total, running: 0 });
            setStatusMsg(`Free spins · 0 / ${frame.total}`);
            break;
          }
          case 'multiplierApplied': {
            sound.play('big-win');
            setStatusMsg(
              `Total multiplier ${fmtMultiplier(frame.sumOfMultipliers)} → ${fmtCurrency(frame.finalPayout)}`,
            );
            break;
          }
          case 'freeSpinsEnd': {
            setFreeSpins(null);
            sound.play('big-win');
            const mx = frame.totalPayout / Math.max(betUsed, 0.01);
            if (mx >= 20) setBigWin({ payout: frame.totalPayout, multiplier: mx });
            setStatusMsg(`Free spins ended · paid ${fmtCurrency(frame.totalPayout)}`);
            break;
          }
          case 'final': {
            totalThisRound += 0; // running total updated via wins frames already
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
      return totalThisRound;
    },
    [sound],
  );

  const runRound = useCallback(
    async (mode: 'spin' | 'buy') => {
      if (busyRef.current) return;
      const baseBet = bet;
      const adjBet = ante ? +(bet * cfg.ante.betMultiplier).toFixed(2) : bet;
      const cost = mode === 'buy' ? cfg.buyBonusCost * baseBet : adjBet;
      if (balance.balance < cost) return;

      busyRef.current = true;
      setBusy(true);
      sound.play('spin');
      setBigWin(null);
      setFloatingMults([]);
      setStatusMsg(mode === 'buy' ? 'Bonus round!' : 'Spinning…');
      balance.debit(cost);

      try {
        const seeds = fairness.consumeNonce();
        if (!seeds || !seeds.serverSeed || !seeds.clientSeed) {
          // Defensive: should never happen now that consumeNonce is ref-backed,
          // but if it ever did we'd refund and bail with a visible message.
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
        if (payout > 0) {
          balance.credit(payout);
          setStatusMsg(`Won ${fmtCurrency(payout)}!`);
        } else {
          setStatusMsg('No win. Spin again?');
        }
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
        // Refund on engine error so we never silently eat the bet.
        balance.credit(cost);
        setStatusMsg('Spin failed — bet refunded. See console for details.');
        // eslint-disable-next-line no-console
        console.error('Spin failed:', err);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [ante, balance, bet, cfg, fairness, history, playFrames, sound],
  );

  const presets = useMemo(() => BET_PRESETS, []);
  const buyCost = useMemo(() => cfg.buyBonusCost * bet, [cfg.buyBonusCost, bet]);
  const inFree = freeSpins !== null;

  return (
    <div className={`space-y-4 ${cfg.theme.stageClass ?? ''}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${cfg.theme.stageClass === 'olympus-stage' ? 'font-serif italic' : 'font-display'}`}
              style={cfg.theme.stageClass === 'olympus-stage' ? {
                background: 'linear-gradient(180deg, #ffffff 0%, #ffe9a8 50%, #c8932f 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              } : undefined}>
            {cfg.name}
          </h1>
          <p className="text-xs md:text-sm text-ink-dim">{statusMsg}</p>
        </div>
        <div className="flex items-center gap-2">
          {inFree && (
            <div className={`px-3 py-1.5 text-xs rounded-xl ${cfg.theme.stageClass === 'olympus-stage' ? 'olympus-fs-counter' : 'card'}`}>
              <span className="label mr-2">Free spins</span>
              <span className="font-mono">
                {(freeSpins!.total - freeSpins!.remaining)}/{freeSpins!.total}
              </span>
              <span className="ml-3 label mr-2">Won</span>
              <span className="font-mono">{fmtCurrency(freeSpins!.running)}</span>
            </div>
          )}
          <button className="btn-ghost text-xs" onClick={() => setPaytableOpen(true)}>
            Paytable
          </button>
        </div>
      </div>

      <div className={
        cfg.theme.stageClass === 'olympus-stage'
          ? 'grid grid-cols-1 lg:grid-cols-[minmax(280px,460px)_1fr] gap-6 justify-items-center lg:justify-items-stretch'
          : 'grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4'
      }>
        <div className="relative w-full max-w-[480px] lg:max-w-none">
          {cfg.theme.stageClass === 'olympus-stage' ? (
            // Painted Olympus scene with the reels positioned inside the arch.
            <div className="olympus-scene">
              <div className="olympus-arch-grid">
                <Grid grid={grid} cfg={cfg} winning={winning} newKeys={newKeys} renderCell={renderCell} bare />
              </div>

              <AnimatePresence>
                {bigWin && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="text-center"
                      initial={{ scale: 0.6, rotate: -3 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                      onAnimationComplete={() => setTimeout(() => setBigWin(null), 1800)}
                    >
                      <div className="font-serif italic font-bold text-4xl md:text-6xl olympus-fs-title">
                        {bigWin.multiplier >= 100
                          ? 'MEGA WIN'
                          : bigWin.multiplier >= 50
                            ? 'BIG WIN'
                            : 'NICE WIN'}
                      </div>
                      <div className="text-xl md:text-3xl mt-2 font-mono text-[#ffe9a8]"
                           style={{ textShadow: '0 0 18px rgba(255,200,40,.8), 0 2px 4px rgba(0,0,0,.6)' }}>
                        {fmtCurrency(bigWin.payout)}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Grid grid={grid} cfg={cfg} winning={winning} newKeys={newKeys} renderCell={renderCell} />
          )}

          <AnimatePresence>
            {floatingMults.map((m) => (
              <motion.div
                key={`mp-${m.key}`}
                className="absolute font-display font-extrabold pointer-events-none text-3xl"
                style={{ color: cfg.theme.accent, textShadow: `0 0 20px ${cfg.theme.glow}` }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
              />
            ))}
          </AnimatePresence>

          <div className="mt-2 flex items-center justify-between text-xs text-ink-dim w-full">
            <span>Last win: <span className="font-mono text-ink">{fmtCurrency(winTotal)}</span></span>
            <span>Balance: <span className="font-mono text-ink">{fmtCurrency(balance.balance)}</span></span>
          </div>

          {cfg.theme.stageClass !== 'olympus-stage' && (
            <AnimatePresence>
              {bigWin && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="font-display font-extrabold text-center"
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                    onAnimationComplete={() => setTimeout(() => setBigWin(null), 1800)}
                  >
                    <div
                      className="text-5xl md:text-7xl"
                      style={{ color: cfg.theme.accent, textShadow: `0 0 30px ${cfg.theme.glow}` }}
                    >
                      {bigWin.multiplier >= 100
                        ? 'MEGA WIN'
                        : bigWin.multiplier >= 50
                          ? 'BIG WIN'
                          : 'NICE WIN'}
                    </div>
                    <div className="text-2xl md:text-4xl mt-2 font-mono">
                      {fmtCurrency(bigWin.payout)}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <BetControls
          bet={bet}
          onBetChange={setBet}
          presets={presets}
          ante={ante}
          onAnteChange={setAnte}
          busy={busy}
          balance={balance.balance}
          onSpin={() => runRound('spin')}
          onBuyBonus={() => runRound('buy')}
          buyBonusCost={buyCost}
          inFreeSpins={inFree}
          freeSpinsRemaining={freeSpins?.remaining}
          spinButtonClass={cfg.theme.stageClass === 'olympus-stage' ? 'btn-olympus' : undefined}
        />
      </div>

      <Paytable open={paytableOpen} onClose={() => setPaytableOpen(false)} cfg={cfg} renderCell={renderCell} />

      <AnimatePresence>
        {fsOverlay && (
          <motion.div
            className={`olympus-fs-overlay fixed inset-0 z-[120] flex flex-col items-center justify-center text-center p-6 pointer-events-none`}
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
              className="olympus-fs-sub text-sm md:text-base"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {fsOverlay.count} spins awarded
            </motion.div>
            {/* Lightning bolts */}
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
                >
                  ⚡
                </motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function makeBlank(cfg: SlotConfig): TGrid {
  // Visually pleasant pre-spin grid: random non-scatter symbols.
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

function formatChainCallout(wins: WinGroup[], chainPayout: number): string {
  if (wins.length === 1) {
    return `${wins[0]!.positions.length}× ${wins[0]!.symbolId} → ${fmtCurrency(chainPayout)}`;
  }
  return `${wins.length} symbols hit → ${fmtCurrency(chainPayout)}`;
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}
