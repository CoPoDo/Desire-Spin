import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import {
  type Bet,
  type BetType,
  colorOf,
  play,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

const CHIP_OPTIONS = [1, 5, 10, 50, 100];

type ChipMap = Record<string, number>;

function keyOf(t: BetType): string {
  switch (t.kind) {
    case 'number': return `n:${t.n}`;
    case 'color':  return `c:${t.color}`;
    case 'parity': return `p:${t.parity}`;
    case 'half':   return `h:${t.half}`;
    case 'dozen':  return `d:${t.dozen}`;
    case 'column': return `col:${t.column}`;
  }
}
function typeOf(key: string): BetType {
  const [kind, val] = key.split(':');
  if (kind === 'n') return { kind: 'number', n: parseInt(val!) };
  if (kind === 'c') return { kind: 'color', color: val as 'red' | 'black' };
  if (kind === 'p') return { kind: 'parity', parity: val as 'even' | 'odd' };
  if (kind === 'h') return { kind: 'half', half: val as 'low' | 'high' };
  if (kind === 'd') return { kind: 'dozen', dozen: parseInt(val!) as 1 | 2 | 3 };
  return { kind: 'column', column: parseInt(val!) as 1 | 2 | 3 };
}

export function RouletteGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [chip, setChip] = useState(1);
  const [chips, setChips] = useState<ChipMap>({});
  const [busy, setBusy] = useState(false);
  const [winning, setWinning] = useState<number | null>(null);
  const [result, setResult] = useState<{ totalStake: number; totalReturn: number } | null>(null);
  const [recent, setRecent] = useState<{ id: string; n: number }[]>([]);

  const placeChip = useCallback(
    (t: BetType) => {
      if (busy) return;
      sound.play('tick');
      setChips((prev) => ({
        ...prev,
        [keyOf(t)]: +((prev[keyOf(t)] ?? 0) + chip).toFixed(2),
      }));
    },
    [busy, chip, sound],
  );

  const clearBets = useCallback(() => {
    if (busy) return;
    setChips({});
    setResult(null);
  }, [busy]);

  const totalStake = useMemo(
    () => Object.values(chips).reduce((s, v) => s + v, 0),
    [chips],
  );

  const spin = useCallback(() => {
    if (busy || totalStake <= 0 || balance.balance < totalStake) return;
    setBusy(true);
    sound.play('click');
    balance.debit(totalStake);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const bets: Bet[] = Object.entries(chips).map(([k, amount]) => ({ type: typeOf(k), amount }));
    const r = play(rng, bets);
    // Animate the wheel for ~2.5s then reveal
    setTimeout(() => {
      setWinning(r.winningNumber);
      if (r.totalReturn > 0) {
        balance.credit(r.totalReturn);
        sound.play(r.totalReturn >= totalStake * 5 ? 'mega-win' : r.totalReturn >= totalStake * 2 ? 'big-win' : 'win');
        if (r.totalReturn >= totalStake * 2) {
          fireConfetti({
            count: r.totalReturn >= totalStake * 10 ? 130 : 70,
            colors: ['#1fff7a', '#c8102e', '#ffffff', '#15191f', '#ffd166'],
          });
        }
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Roulette',
        bet: totalStake,
        payout: r.totalReturn,
        multiplier: r.totalReturn / Math.max(totalStake, 0.01),
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(totalStake, r.totalReturn, false);
      setResult({ totalStake, totalReturn: r.totalReturn });
      setRecent((prev) => [{ id: `${seeds.nonce}`, n: r.winningNumber }, ...prev].slice(0, 12));
      setBusy(false);
    }, 2400);
  }, [balance, busy, chips, fairness, history, session, sound, totalStake]);

  const numberCells: number[] = useMemo(() => {
    // 12 columns, top row = 3,6,9..., middle = 2,5,8..., bottom = 1,4,7...
    // We render in 3-row × 12-col layout
    const cells: number[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 12; col++) {
        cells.push(col * 3 + (3 - row));
      }
    }
    return cells;
  }, []);

  return (
    <OriginalPageLayout title="Roulette">
      <div className="flex flex-col p-3 gap-3 max-w-md mx-auto w-full">
        {/* Wheel result */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 flex items-center justify-center min-h-[120px]">
          <AnimatePresence mode="wait">
            {busy ? (
              <motion.div key="spin" className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">Spinning</div>
                {/* Wheel hub with an off-centre ball orbiting around it.
                 *  Real roulette wheels DECELERATE over the last second
                 *  before the ball drops into a pocket — the previous
                 *  infinite-linear spin felt arcade-y. Now ramps from
                 *  0 to ~5.25 revolutions over 2.4s using ease-out
                 *  quintic so the wheel kicks off fast and settles
                 *  gently into the result reveal that fires at 2.4s. */}
                <motion.div
                  className="mt-2 relative inline-block w-16 h-16 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, #0a3a1a, #02100a)',
                    border: '2px solid #2a3142',
                    boxShadow: 'inset 0 0 12px rgba(0,0,0,.6), 0 4px 8px rgba(0,0,0,.4)',
                  }}
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 * 5 + 90 }}
                  transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Orbiting ball */}
                  <span
                    className="absolute rounded-full"
                    style={{
                      top: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '10px',
                      height: '10px',
                      background:
                        'radial-gradient(circle at 35% 30%, #ffffff, #c8c8c8 70%, #888888)',
                      boxShadow: '0 0 6px rgba(255,255,255,.85), 0 1px 2px rgba(0,0,0,.6)',
                    }}
                  />
                </motion.div>
              </motion.div>
            ) : winning !== null ? (
              <motion.div
                key={`won-${winning}`}
                className="text-center"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              >
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">Result</div>
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full font-mono font-bold text-4xl mt-1"
                  style={{
                    background:
                      colorOf(winning) === 'red'
                        ? 'radial-gradient(circle at 35% 28%, #ff7a85, #c8102e)'
                        : colorOf(winning) === 'black'
                          ? 'radial-gradient(circle at 35% 28%, #4a5168, #15191f)'
                          : 'radial-gradient(circle at 35% 28%, #5dffae, #0a7a3a)',
                    color: '#fff',
                    boxShadow: '0 0 24px currentColor, 0 8px 16px rgba(0,0,0,.5)',
                  }}
                >
                  {winning}
                </div>
                {result && (
                  <div
                    className={`font-mono font-bold mt-2 tabular-nums text-lg ${
                      result.totalReturn > result.totalStake
                        ? 'text-accent'
                        : result.totalReturn === 0
                          ? 'text-accent-hot'
                          : 'text-ink-dim'
                    }`}
                  >
                    {result.totalReturn > 0
                      ? `+${fmtCurrency(result.totalReturn - result.totalStake)}`
                      : `-${fmtCurrency(result.totalStake)}`}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="text-[11px] uppercase tracking-widest text-ink-mute">Place your bets</div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent results */}
        {recent.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">Recent</span>
            <AnimatePresence initial={false}>
              {recent.map((r) => (
                <motion.span
                  key={r.id}
                  layout
                  initial={{ scale: 0.6, opacity: 0, x: -12 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                  className="font-mono font-semibold text-[11px] tabular-nums w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      colorOf(r.n) === 'red' ? '#c8102e' :
                      colorOf(r.n) === 'black' ? '#15191f' :
                      '#0a7a3a',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,.15)',
                  }}
                >
                  {r.n}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Betting board */}
        <div className="rounded-2xl bg-bg-card border border-edge p-2 space-y-1.5">
          {/* 0 + 36 numbers */}
          <div className="flex gap-1">
            <NumberCell n={0} chip={chips[keyOf({ kind: 'number', n: 0 })]} onClick={() => placeChip({ kind: 'number', n: 0 })} className="w-12" />
            <div className="flex-1 grid grid-cols-12 gap-1">
              {numberCells.map((n) => (
                <NumberCell
                  key={n}
                  n={n}
                  chip={chips[keyOf({ kind: 'number', n })]}
                  onClick={() => placeChip({ kind: 'number', n })}
                />
              ))}
            </div>
          </div>
          {/* Dozens */}
          <div className="flex gap-1">
            <div className="w-12" />
            <div className="flex-1 grid grid-cols-3 gap-1">
              {[1, 2, 3].map((d) => (
                <BetCell
                  key={d}
                  label={`${d === 1 ? '1st' : d === 2 ? '2nd' : '3rd'} 12`}
                  chip={chips[keyOf({ kind: 'dozen', dozen: d as 1 | 2 | 3 })]}
                  onClick={() => placeChip({ kind: 'dozen', dozen: d as 1 | 2 | 3 })}
                />
              ))}
            </div>
          </div>
          {/* Outside bets */}
          <div className="flex gap-1">
            <div className="w-12" />
            <div className="flex-1 grid grid-cols-6 gap-1">
              <BetCell label="1-18" chip={chips[keyOf({ kind: 'half', half: 'low' })]} onClick={() => placeChip({ kind: 'half', half: 'low' })} />
              <BetCell label="Even" chip={chips[keyOf({ kind: 'parity', parity: 'even' })]} onClick={() => placeChip({ kind: 'parity', parity: 'even' })} />
              <BetCell label="Red" tone="red" chip={chips[keyOf({ kind: 'color', color: 'red' })]} onClick={() => placeChip({ kind: 'color', color: 'red' })} />
              <BetCell label="Black" tone="black" chip={chips[keyOf({ kind: 'color', color: 'black' })]} onClick={() => placeChip({ kind: 'color', color: 'black' })} />
              <BetCell label="Odd" chip={chips[keyOf({ kind: 'parity', parity: 'odd' })]} onClick={() => placeChip({ kind: 'parity', parity: 'odd' })} />
              <BetCell label="19-36" chip={chips[keyOf({ kind: 'half', half: 'high' })]} onClick={() => placeChip({ kind: 'half', half: 'high' })} />
            </div>
          </div>
        </div>

        {/* Chip selector */}
        <div className="rounded-xl bg-bg-card border border-edge p-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">Chip Value</div>
          <div className="flex gap-1.5">
            {CHIP_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setChip(c)}
                disabled={busy}
                className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold tabular-nums transition disabled:opacity-50 ${
                  chip === c
                    ? 'bg-accent-gold text-bg shadow-[0_0_14px_rgba(255,209,102,.55)]'
                    : 'bg-bg-elev border border-edge text-ink-dim hover:text-ink'
                }`}
              >
                ${c}
              </button>
            ))}
          </div>
        </div>

        {/* Total + actions */}
        <div className="rounded-2xl bg-bg-card border border-edge p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute">Total Stake</span>
            <span className="font-mono font-bold text-lg text-ink tabular-nums">{fmtCurrency(totalStake)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearBets}
              disabled={busy || totalStake === 0}
              className="flex-1 py-2.5 rounded-xl bg-bg-elev border border-edge text-ink-dim font-bold text-xs uppercase tracking-wider disabled:opacity-50"
            >
              Clear
            </button>
            <button
              onClick={spin}
              disabled={busy || totalStake === 0 || balance.balance < totalStake}
              className="flex-[2] py-2.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy
                ? 'Spinning…'
                : totalStake === 0
                  ? 'Place chips first'
                  : balance.balance < totalStake
                    ? 'Insufficient balance'
                    : `Spin · ${fmtCurrency(totalStake)}`}
            </button>
          </div>
        </div>
      </div>
    </OriginalPageLayout>
  );
}

function NumberCell({
  n,
  chip,
  onClick,
  className = '',
}: {
  n: number;
  chip?: number;
  onClick: () => void;
  className?: string;
}) {
  const color = colorOf(n);
  return (
    <button
      onClick={onClick}
      className={`relative aspect-square rounded font-mono font-bold text-[10px] sm:text-xs flex items-center justify-center transition active:scale-95 ${className}`}
      style={{
        background:
          color === 'red' ? '#c8102e' :
          color === 'black' ? '#15191f' :
          '#0a7a3a',
        color: '#fff',
        border: '1px solid rgba(255,255,255,.15)',
      }}
    >
      {n}
      {chip !== undefined && chip > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-gold text-bg text-[8px] font-mono font-bold flex items-center justify-center"
          style={{ boxShadow: '0 0 6px rgba(255,209,102,.7)' }}
        >
          {chip < 10 ? `$${chip}` : chip < 100 ? `$${chip}` : `${chip}`}
        </span>
      )}
    </button>
  );
}

function BetCell({
  label,
  tone,
  chip,
  onClick,
}: {
  label: string;
  tone?: 'red' | 'black';
  chip?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative aspect-[2/1] rounded font-mono font-bold text-[10px] sm:text-xs flex items-center justify-center transition active:scale-95"
      style={{
        background:
          tone === 'red' ? '#c8102e' :
          tone === 'black' ? '#15191f' :
          '#1f2530',
        color: '#fff',
        border: '1px solid rgba(255,255,255,.15)',
      }}
    >
      {label}
      {chip !== undefined && chip > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-gold text-bg text-[8px] font-mono font-bold flex items-center justify-center"
          style={{ boxShadow: '0 0 6px rgba(255,209,102,.7)' }}
        >
          ${chip}
        </span>
      )}
    </button>
  );
}
