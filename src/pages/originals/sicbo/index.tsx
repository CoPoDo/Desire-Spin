import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import {
  type Bet,
  type Roll,
  ANY_TRIPLE_PAYOUT,
  ODD_EVEN_PAYOUT,
  SMALL_BIG_PAYOUT,
  SPECIFIC_TRIPLE_PAYOUT,
  SUM_PAYOUTS,
  play,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

const CHIP_OPTIONS = [1, 5, 10, 50, 100];

type ChipMap = Record<string, number>;

function keyOf(bet: Bet): string {
  switch (bet.kind) {
    case 'small': return 'small';
    case 'big': return 'big';
    case 'odd': return 'odd';
    case 'even': return 'even';
    case 'anyTriple': return 'anyTriple';
    case 'specificTriple': return `triple:${bet.face}`;
    case 'total': return `total:${bet.sum}`;
  }
}
function betOf(key: string): Bet {
  if (key === 'small' || key === 'big' || key === 'odd' || key === 'even' || key === 'anyTriple') {
    return { kind: key };
  }
  if (key.startsWith('triple:')) {
    return { kind: 'specificTriple', face: parseInt(key.slice(7)) };
  }
  // total:N
  return { kind: 'total', sum: parseInt(key.slice(6)) };
}

export function SicBoGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [chip, setChip] = useState(1);
  const [chips, setChips] = useState<ChipMap>({});
  const [busy, setBusy] = useState(false);
  const [dice, setDice] = useState<Roll | null>(null);
  const [result, setResult] = useState<{ totalStake: number; totalReturn: number } | null>(null);
  const [recent, setRecent] = useState<{ id: string; sum: number }[]>([]);

  const placeChip = useCallback(
    (bet: Bet) => {
      if (busy) return;
      sound.play('tick');
      setChips((prev) => ({
        ...prev,
        [keyOf(bet)]: +((prev[keyOf(bet)] ?? 0) + chip).toFixed(2),
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

  const rollDice = useCallback(() => {
    if (busy || totalStake <= 0 || balance.balance < totalStake) return;
    setBusy(true);
    sound.play('click');
    balance.debit(totalStake);
    setDice(null);
    setResult(null);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const bets = Object.entries(chips).map(([k, amount]) => ({
      bet: betOf(k),
      amount,
    }));
    const r = play(rng, bets);
    setTimeout(() => {
      setDice(r.dice);
      if (r.totalReturn > 0) {
        balance.credit(r.totalReturn);
        sound.play(
          r.totalReturn >= totalStake * 10 ? 'mega-win' :
          r.totalReturn >= totalStake * 2 ? 'big-win' : 'win',
        );
        if (r.totalReturn >= totalStake * 2) {
          fireConfetti({
            count: r.totalReturn >= totalStake * 30 ? 130 : 70,
            colors: ['#c8102e', '#ffd166', '#ffffff'],
          });
        }
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Sic Bo',
        bet: totalStake,
        payout: r.totalReturn,
        multiplier: r.totalReturn / Math.max(totalStake, 0.01),
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(totalStake, r.totalReturn, false);
      setResult({ totalStake, totalReturn: r.totalReturn });
      setRecent((prev) => [{ id: `${seeds.nonce}`, sum: r.sum }, ...prev].slice(0, 12));
      setBusy(false);
    }, 1300);
  }, [balance, busy, chips, fairness, history, session, sound, totalStake]);

  return (
    <OriginalPageLayout title="Sic Bo">
      <div className="flex flex-col p-3 gap-3 max-w-md mx-auto w-full">
        {/* Dice + result */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 flex flex-col items-center justify-center min-h-[140px]">
          <AnimatePresence mode="wait">
            {busy && !dice ? (
              <motion.div key="rolling" className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {[0, 1, 2].map((i) => (
                  // Real-die rolling: tumble + bounce a proper Die
                  // component rather than a 🎲 emoji. Each die shows a
                  // different fixed face so the pips read consistently;
                  // the rotation + bounce sells the "rolling in mid-air"
                  // motion.
                  <motion.div
                    key={i}
                    animate={{ rotate: [0, 360], y: [0, -8, 0] }}
                    transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
                  >
                    <Die value={[3, 5, 1][i]!} />
                  </motion.div>
                ))}
              </motion.div>
            ) : dice ? (
              <motion.div
                key="result"
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              >
                <div className="flex gap-3">
                  {dice.map((d, i) => (
                    <Die key={i} value={d} />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono font-bold text-lg text-ink tabular-nums">Sum: {dice[0] + dice[1] + dice[2]}</span>
                  {result && (
                    <span
                      className={`font-mono font-bold text-lg tabular-nums ${
                        result.totalReturn > result.totalStake
                          ? 'text-accent'
                          : 'text-accent-hot'
                      }`}
                    >
                      {result.totalReturn > 0
                        ? `+${fmtCurrency(result.totalReturn - result.totalStake)}`
                        : `-${fmtCurrency(result.totalStake)}`}
                    </span>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="text-[11px] uppercase tracking-widest text-ink-mute">Place your bets</div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent sums */}
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
                  className={`font-mono font-semibold text-[11px] tabular-nums w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                    r.sum >= 11 && r.sum <= 17 ? 'bg-accent-hot/30 text-accent-hot' :
                    r.sum >= 4 && r.sum <= 10 ? 'bg-accent/30 text-accent' :
                    'bg-accent-gold/30 text-accent-gold'
                  }`}
                >
                  {r.sum}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Outside bets: Small / Big / Odd / Even */}
        <div className="rounded-2xl bg-bg-card border border-edge p-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <BetCell
              label="Small"
              sub="4–10"
              payout={SMALL_BIG_PAYOUT}
              chip={chips[keyOf({ kind: 'small' })]}
              onClick={() => placeChip({ kind: 'small' })}
              tone="cyan"
            />
            <BetCell
              label="Big"
              sub="11–17"
              payout={SMALL_BIG_PAYOUT}
              chip={chips[keyOf({ kind: 'big' })]}
              onClick={() => placeChip({ kind: 'big' })}
              tone="hot"
            />
            <BetCell
              label="Odd"
              sub=""
              payout={ODD_EVEN_PAYOUT}
              chip={chips[keyOf({ kind: 'odd' })]}
              onClick={() => placeChip({ kind: 'odd' })}
              tone="violet"
            />
            <BetCell
              label="Even"
              sub=""
              payout={ODD_EVEN_PAYOUT}
              chip={chips[keyOf({ kind: 'even' })]}
              onClick={() => placeChip({ kind: 'even' })}
              tone="violet"
            />
          </div>
        </div>

        {/* Triples row */}
        <div className="rounded-2xl bg-bg-card border border-edge p-2 space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute px-1 mb-1">Triples</div>
          <div className="grid grid-cols-7 gap-1">
            <BetCell
              label="Any"
              sub="3-of-a-kind"
              payout={ANY_TRIPLE_PAYOUT}
              chip={chips[keyOf({ kind: 'anyTriple' })]}
              onClick={() => placeChip({ kind: 'anyTriple' })}
              tone="gold"
              compact
            />
            {[1, 2, 3, 4, 5, 6].map((face) => (
              <BetCell
                key={face}
                label={`${face}·${face}·${face}`}
                sub=""
                payout={SPECIFIC_TRIPLE_PAYOUT}
                chip={chips[keyOf({ kind: 'specificTriple', face })]}
                onClick={() => placeChip({ kind: 'specificTriple', face })}
                tone="gold"
                compact
              />
            ))}
          </div>
        </div>

        {/* Total bets 4-17 */}
        <div className="rounded-2xl bg-bg-card border border-edge p-2 space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute px-1 mb-1">Total Sum</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 14 }, (_, i) => i + 4).map((sum) => (
              <BetCell
                key={sum}
                label={String(sum)}
                sub={`${(SUM_PAYOUTS[sum] ?? 0).toFixed(0)}×`}
                payout={SUM_PAYOUTS[sum] ?? 0}
                chip={chips[keyOf({ kind: 'total', sum })]}
                onClick={() => placeChip({ kind: 'total', sum })}
                tone="violet"
                compact
                hidePayout
              />
            ))}
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
              onClick={rollDice}
              disabled={busy || totalStake === 0 || balance.balance < totalStake}
              className="flex-[2] py-2.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy
                ? 'Rolling…'
                : totalStake === 0
                  ? 'Place chips first'
                  : balance.balance < totalStake
                    ? 'Insufficient balance'
                    : `Roll · ${fmtCurrency(totalStake)}`}
            </button>
          </div>
        </div>
      </div>
    </OriginalPageLayout>
  );
}

const TONE: Record<string, { bg: string; border: string; chipBg: string }> = {
  cyan: { bg: '#0e3a4a', border: '#22d3ee', chipBg: 'rgba(34,211,238,.15)' },
  hot: { bg: '#3a0e1a', border: '#ff3d8b', chipBg: 'rgba(255,61,139,.15)' },
  violet: { bg: '#1f1640', border: '#a78bfa', chipBg: 'rgba(167,139,250,.15)' },
  gold: { bg: '#3a2a10', border: '#ffd166', chipBg: 'rgba(255,209,102,.15)' },
};

function BetCell({
  label,
  sub,
  payout,
  chip,
  onClick,
  tone,
  compact = false,
  hidePayout = false,
}: {
  label: string;
  sub: string;
  payout: number;
  chip?: number;
  onClick: () => void;
  tone: 'cyan' | 'hot' | 'violet' | 'gold';
  compact?: boolean;
  hidePayout?: boolean;
}) {
  const t = TONE[tone]!;
  return (
    <button
      onClick={onClick}
      className={`relative rounded-lg flex flex-col items-center justify-center transition active:scale-95 ${
        compact ? 'py-1.5 px-1' : 'py-3 px-2'
      }`}
      style={{
        background: chip ? t.chipBg : t.bg,
        border: `1px solid ${chip ? t.border : 'rgba(255,255,255,.08)'}`,
        boxShadow: chip ? `0 0 10px ${t.border}66` : 'inset 0 1px 0 rgba(255,255,255,.04)',
      }}
    >
      <span className={`font-bold ${compact ? 'text-[10px]' : 'text-sm'} text-ink`}>{label}</span>
      {sub && (
        <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} text-ink-mute`}>{sub}</span>
      )}
      {!hidePayout && (
        <span
          className={`font-mono font-semibold ${compact ? 'text-[8px]' : 'text-[10px]'} tabular-nums`}
          style={{ color: t.border }}
        >
          {payout.toFixed(2)}×
        </span>
      )}
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

function Die({ value }: { value: number }) {
  // Render a 3×3 grid of dot positions per pip.
  const dots: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
  };
  return (
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center relative"
      style={{
        background: 'linear-gradient(180deg, #f8f5ee, #d4cfc0)',
        border: '2px solid #b8b1a0',
        boxShadow: '0 4px 8px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)',
      }}
    >
      <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const filled = (dots[value] ?? []).some(([r, c]) => r === row && c === col);
          return (
            <div
              key={i}
              className="rounded-full"
              style={{
                background: filled ? '#15191f' : 'transparent',
                boxShadow: filled ? 'inset 0 1px 1px rgba(0,0,0,.4)' : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
