import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import {
  type Bet,
  type BetType,
  EVEN_MONEY_PAYOUT,
  POCKETS,
  QUAD_PAYOUT,
  STRAIGHT_PAYOUT,
  colorOf,
  play,
} from './engine';

const CHIP_OPTIONS = [1, 5, 10, 50, 100];

type ChipMap = Record<string, number>;

function keyOf(t: BetType): string {
  switch (t.kind) {
    case 'number': return `n:${t.n}`;
    case 'color':  return `c:${t.color}`;
    case 'parity': return `p:${t.parity}`;
    case 'half':   return `h:${t.half}`;
    case 'quad':   return `q:${t.quad}`;
  }
}
function typeOf(key: string): BetType {
  const [kind, val] = key.split(':');
  if (kind === 'n') return { kind: 'number', n: parseInt(val!) };
  if (kind === 'c') return { kind: 'color', color: val as 'red' | 'black' };
  if (kind === 'p') return { kind: 'parity', parity: val as 'even' | 'odd' };
  if (kind === 'h') return { kind: 'half', half: val as 'low' | 'high' };
  return { kind: 'quad', quad: parseInt(val!) as 1 | 2 | 3 };
}

export function MiniRouletteGame() {
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
    const bets: Bet[] = Object.entries(chips).map(([k, amount]) => ({
      type: typeOf(k),
      amount,
    }));
    const r = play(rng, bets);
    setTimeout(() => {
      setWinning(r.winning);
      if (r.totalReturn > 0) {
        balance.credit(r.totalReturn);
        sound.play(
          r.totalReturn >= totalStake * 5
            ? 'mega-win'
            : r.totalReturn >= totalStake * 2
              ? 'big-win'
              : 'win',
        );
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Mini Roulette',
        bet: totalStake,
        payout: r.totalReturn,
        multiplier: r.totalReturn / Math.max(totalStake, 0.01),
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(totalStake, r.totalReturn, false);
      setResult({ totalStake, totalReturn: r.totalReturn });
      setRecent((prev) =>
        [{ id: `${seeds.nonce}`, n: r.winning }, ...prev].slice(0, 12),
      );
      setBusy(false);
    }, 2000);
  }, [balance, busy, chips, fairness, history, session, sound, totalStake]);

  // Wheel rotation for animation. Each spin, target rotation = many full
  // turns plus a fraction landing the winning pocket at the indicator (top).
  const spinTo = useMemo(() => {
    if (winning === null) return 0;
    const segAngle = 360 / POCKETS;
    // Indicator is at top (0°), pocket b is centered at angle (b * segAngle).
    // Rotate the wheel BACKWARDS by that amount so the pocket aligns at top.
    return -(winning * segAngle) - 6 * 360; // 6 full turns for drama
  }, [winning]);

  return (
    <OriginalPageLayout title="Mini Roulette">
      <div className="flex flex-col p-3 gap-3 max-w-md mx-auto w-full">
        {/* Wheel + result */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 flex items-center justify-center min-h-[220px]">
          <div className="relative w-full max-w-[260px] aspect-square">
            <Wheel spinTo={spinTo} winning={winning} busy={busy} />
            {/* Result number overlay (only after stop) */}
            <AnimatePresence>
              {!busy && winning !== null && (
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                >
                  <div
                    className="w-14 h-14 rounded-full font-mono font-extrabold text-2xl flex items-center justify-center"
                    style={{
                      background:
                        colorOf(winning) === 'red'
                          ? 'radial-gradient(circle at 35% 28%, #ff8b95, #c8102e)'
                          : colorOf(winning) === 'black'
                            ? 'radial-gradient(circle at 35% 28%, #4a5168, #15191f)'
                            : 'radial-gradient(circle at 35% 28%, #5dffae, #0a7a3a)',
                      color: '#fff',
                      boxShadow:
                        '0 0 28px currentColor, 0 8px 18px rgba(0,0,0,.6)',
                      border: '2px solid rgba(255,255,255,.6)',
                    }}
                  >
                    {winning}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Result delta */}
        {result && !busy && (
          <div className="rounded-xl bg-bg-card border border-edge p-2 text-center">
            <span
              className={`font-mono font-bold text-base tabular-nums ${
                result.totalReturn > result.totalStake
                  ? 'text-accent'
                  : 'text-accent-hot'
              }`}
            >
              {result.totalReturn > 0
                ? `+${fmtCurrency(result.totalReturn - result.totalStake)}`
                : `-${fmtCurrency(result.totalStake)}`}
            </span>
          </div>
        )}

        {/* Recent results */}
        {recent.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">
              Recent
            </span>
            {recent.map((r) => (
              <span
                key={r.id}
                className="font-mono font-semibold text-[11px] tabular-nums w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    colorOf(r.n) === 'red'
                      ? '#c8102e'
                      : colorOf(r.n) === 'black'
                        ? '#15191f'
                        : '#0a7a3a',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,.15)',
                }}
              >
                {r.n}
              </span>
            ))}
          </div>
        )}

        {/* Number grid: 0 + 1–12 */}
        <div className="rounded-2xl bg-bg-card border border-edge p-2 space-y-1.5">
          <div className="flex gap-1">
            <NumberCell
              n={0}
              chip={chips[keyOf({ kind: 'number', n: 0 })]}
              onClick={() => placeChip({ kind: 'number', n: 0 })}
              className="w-12"
            />
            <div className="flex-1 grid grid-cols-6 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <NumberCell
                  key={n}
                  n={n}
                  chip={chips[keyOf({ kind: 'number', n })]}
                  onClick={() => placeChip({ kind: 'number', n })}
                />
              ))}
            </div>
          </div>
          {/* Quads */}
          <div className="flex gap-1">
            <div className="w-12" />
            <div className="flex-1 grid grid-cols-3 gap-1">
              {[1, 2, 3].map((q) => (
                <BetCell
                  key={q}
                  label={q === 1 ? '1-4' : q === 2 ? '5-8' : '9-12'}
                  payout={QUAD_PAYOUT}
                  chip={chips[keyOf({ kind: 'quad', quad: q as 1 | 2 | 3 })]}
                  onClick={() => placeChip({ kind: 'quad', quad: q as 1 | 2 | 3 })}
                />
              ))}
            </div>
          </div>
          {/* Outside bets */}
          <div className="flex gap-1">
            <div className="w-12" />
            <div className="flex-1 grid grid-cols-6 gap-1">
              <BetCell
                label="1-6"
                payout={EVEN_MONEY_PAYOUT}
                chip={chips[keyOf({ kind: 'half', half: 'low' })]}
                onClick={() => placeChip({ kind: 'half', half: 'low' })}
              />
              <BetCell
                label="Even"
                payout={EVEN_MONEY_PAYOUT}
                chip={chips[keyOf({ kind: 'parity', parity: 'even' })]}
                onClick={() => placeChip({ kind: 'parity', parity: 'even' })}
              />
              <BetCell
                label="Red"
                tone="red"
                payout={EVEN_MONEY_PAYOUT}
                chip={chips[keyOf({ kind: 'color', color: 'red' })]}
                onClick={() => placeChip({ kind: 'color', color: 'red' })}
              />
              <BetCell
                label="Black"
                tone="black"
                payout={EVEN_MONEY_PAYOUT}
                chip={chips[keyOf({ kind: 'color', color: 'black' })]}
                onClick={() => placeChip({ kind: 'color', color: 'black' })}
              />
              <BetCell
                label="Odd"
                payout={EVEN_MONEY_PAYOUT}
                chip={chips[keyOf({ kind: 'parity', parity: 'odd' })]}
                onClick={() => placeChip({ kind: 'parity', parity: 'odd' })}
              />
              <BetCell
                label="7-12"
                payout={EVEN_MONEY_PAYOUT}
                chip={chips[keyOf({ kind: 'half', half: 'high' })]}
                onClick={() => placeChip({ kind: 'half', half: 'high' })}
              />
            </div>
          </div>
        </div>

        {/* Chip selector */}
        <div className="rounded-xl bg-bg-card border border-edge p-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">
            Chip Value
          </div>
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
            <span className="text-[10px] uppercase tracking-widest text-ink-mute">
              Total Stake
            </span>
            <span className="font-mono font-bold text-lg text-ink tabular-nums">
              {fmtCurrency(totalStake)}
            </span>
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
              {busy ? 'Spinning…' : 'Spin'}
            </button>
          </div>
        </div>
      </div>
    </OriginalPageLayout>
  );
}

function Wheel({
  spinTo,
  winning,
  busy,
}: {
  spinTo: number;
  winning: number | null;
  busy: boolean;
}) {
  const segAngle = 360 / POCKETS;
  // SVG is centered on (50, 50); pockets render outward from radius 22 to 48.
  return (
    <div className="relative w-full h-full">
      {/* Indicator (top arrow) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-20"
        style={{
          top: '-2px',
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '14px solid #ffd166',
          filter: 'drop-shadow(0 0 6px rgba(255,209,102,.85))',
        }}
      />
      <motion.svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        animate={{ rotate: winning === null ? 0 : spinTo }}
        transition={{
          duration: busy ? 2.0 : 0,
          ease: [0.18, 0.7, 0.2, 1],
        }}
        style={{ transformOrigin: '50% 50%' }}
      >
        <defs>
          <radialGradient id="mr-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#15191f" />
            <stop offset="80%" stopColor="#0a0d12" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
        </defs>
        {/* Outer rim */}
        <circle cx="50" cy="50" r="49" fill="url(#mr-bg)" stroke="#ffd166" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,209,102,.3)" strokeWidth="0.4" />
        {/* Pocket segments */}
        {Array.from({ length: POCKETS }).map((_, i) => {
          const startAngle = i * segAngle - segAngle / 2 - 90;
          const endAngle = startAngle + segAngle;
          const r1 = 22;
          const r2 = 48;
          const a1 = (startAngle * Math.PI) / 180;
          const a2 = (endAngle * Math.PI) / 180;
          const x1 = 50 + r2 * Math.cos(a1);
          const y1 = 50 + r2 * Math.sin(a1);
          const x2 = 50 + r2 * Math.cos(a2);
          const y2 = 50 + r2 * Math.sin(a2);
          const x3 = 50 + r1 * Math.cos(a2);
          const y3 = 50 + r1 * Math.sin(a2);
          const x4 = 50 + r1 * Math.cos(a1);
          const y4 = 50 + r1 * Math.sin(a1);
          const fill =
            i === 0
              ? '#0a7a3a'
              : colorOf(i) === 'red'
                ? '#c8102e'
                : '#1a1f29';
          // Number label positioned at radius ~35
          const labelAngle = (i * segAngle - 90) * (Math.PI / 180);
          const lx = 50 + 35 * Math.cos(labelAngle);
          const ly = 50 + 35 * Math.sin(labelAngle);
          const isWin = winning === i;
          return (
            <g key={i}>
              <path
                d={`M${x1} ${y1} A ${r2} ${r2} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r1} ${r1} 0 0 0 ${x4} ${y4} Z`}
                fill={fill}
                stroke={isWin ? '#ffffff' : 'rgba(255,255,255,.12)'}
                strokeWidth={isWin ? 1.2 : 0.4}
                style={isWin && !busy ? {
                  filter: `drop-shadow(0 0 4px ${fill}) drop-shadow(0 0 8px ${fill})`,
                } : undefined}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="6.5"
                fontFamily="ui-monospace, monospace"
                fontWeight="700"
                fill="#fff"
                transform={`rotate(${i * segAngle} ${lx} ${ly})`}
              >
                {i}
              </text>
            </g>
          );
        })}
        {/* Inner hub */}
        <circle cx="50" cy="50" r="22" fill="#15191f" stroke="#ffd166" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="6" fill="#1a1f29" stroke="#ffd166" strokeWidth="0.5" />
      </motion.svg>
    </div>
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
      className={`relative aspect-square rounded font-mono font-bold text-xs sm:text-sm flex items-center justify-center transition active:scale-95 ${className}`}
      style={{
        background: color === 'red' ? '#c8102e' : color === 'black' ? '#15191f' : '#0a7a3a',
        color: '#fff',
        border: '1px solid rgba(255,255,255,.15)',
      }}
    >
      {n}
      <span
        className="absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[7px] font-mono opacity-70 pointer-events-none"
      >
        {STRAIGHT_PAYOUT}×
      </span>
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

function BetCell({
  label,
  tone,
  payout,
  chip,
  onClick,
}: {
  label: string;
  tone?: 'red' | 'black';
  payout: number;
  chip?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative aspect-[2/1] rounded font-mono font-bold text-[10px] flex flex-col items-center justify-center transition active:scale-95"
      style={{
        background:
          tone === 'red' ? '#c8102e' : tone === 'black' ? '#15191f' : '#1f2530',
        color: '#fff',
        border: '1px solid rgba(255,255,255,.15)',
      }}
    >
      <span>{label}</span>
      <span className="text-[8px] opacity-70">{payout.toFixed(2)}×</span>
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
