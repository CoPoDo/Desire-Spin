import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type DiceDirection,
  multiplierFor,
  play,
  winChanceFor,
} from './engine';

/** Stake-style Dice game.
 *
 * Slider sets a target 0-100. Roll the dice; you win if your direction
 * (over / under) holds. Multiplier = 99 / winChance% (1% house edge).
 *
 * UI mirrors Stake closely:
 *   - Big result number at the top
 *   - Slider with the target threshold + win region tinted green
 *   - Three info cards: Multiplier, Roll Over/Under, Win Chance
 *   - Bet input with ½ / 2× / Max
 *   - Big bet button
 */
export function DiceGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [direction, setDirection] = useState<DiceDirection>('over');
  const [target, setTarget] = useState(50);
  const [busy, setBusy] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [recentRolls, setRecentRolls] = useState<{ id: string; roll: number; win: boolean }[]>([]);

  const winChance = useMemo(() => winChanceFor(direction, target), [direction, target]);
  const multiplier = useMemo(() => multiplierFor(direction, target), [direction, target]);
  const profitOnWin = useMemo(() => +(bet * multiplier - bet).toFixed(2), [bet, multiplier]);

  const roll = useCallback(() => {
    if (busy || balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    try {
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const result = play(rng, bet, direction, target);
      setLastRoll(result.roll);
      setLastWin(result.win);
      setRecentRolls((r) => [{ id: `${seeds.nonce}`, roll: result.roll, win: result.win }, ...r].slice(0, 8));
      if (result.win) {
        balance.credit(result.payout);
        sound.play('win');
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Dice',
        bet,
        payout: result.payout,
        multiplier: result.win ? result.multiplier : 0,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(bet, result.payout, false);
    } catch (err) {
      balance.credit(bet);
      // eslint-disable-next-line no-console
      console.error('Dice play failed:', err);
    } finally {
      setBusy(false);
    }
  }, [busy, balance, bet, direction, target, fairness, history, session, sound]);

  return (
    <OriginalPageLayout title="Dice">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Result display */}
        <div className="rounded-2xl bg-bg-card border border-edge p-5 text-center">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-2">Roll</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={lastRoll ?? 'idle'}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className={`font-mono font-bold tabular-nums leading-none ${
                lastRoll === null ? 'text-ink-dim' : lastWin ? 'text-accent' : 'text-accent-hot'
              }`}
              style={{
                fontSize: '56px',
                textShadow: lastWin
                  ? '0 0 24px rgba(31,255,122,.7)'
                  : lastRoll !== null
                    ? '0 0 24px rgba(255,61,139,.55)'
                    : 'none',
              }}
            >
              {lastRoll === null ? '—' : lastRoll.toFixed(2)}
            </motion.div>
          </AnimatePresence>
          <div className="mt-2 text-xs text-ink-dim">
            {lastWin === null ? 'Roll the dice to begin' : lastWin ? `Won ${fmtCurrency(bet * multiplier)}` : 'No win'}
          </div>
        </div>

        {/* Slider track */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-mute mb-2">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
          <div className="relative h-3 bg-bg-elev rounded-full mb-3 overflow-hidden">
            {/* Green win region */}
            <div
              className="absolute top-0 bottom-0 bg-accent/35"
              style={{
                left: direction === 'over' ? `${target}%` : '0%',
                right: direction === 'over' ? '0%' : `${100 - target}%`,
              }}
            />
            {/* Last roll marker */}
            {lastRoll !== null && (
              <motion.div
                className="absolute top-0 bottom-0 w-1 rounded-full"
                style={{
                  left: `${lastRoll}%`,
                  transform: 'translateX(-50%)',
                  background: lastWin ? '#1fff7a' : '#ff3d8b',
                  boxShadow: lastWin
                    ? '0 0 12px rgba(31,255,122,.95)'
                    : '0 0 12px rgba(255,61,139,.85)',
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              />
            )}
            {/* Target marker */}
            <div
              className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-ink"
              style={{ left: `${target}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <input
            type="range"
            min={2}
            max={98}
            step={0.01}
            value={target}
            disabled={busy}
            onChange={(e) => setTarget(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Multiplier" value={`${fmtMultiplier(multiplier)}`} />
          <button
            onClick={() => setDirection((d) => (d === 'over' ? 'under' : 'over'))}
            disabled={busy}
            className="rounded-xl bg-bg-card border border-edge p-3 text-center hover:bg-bg-hover disabled:opacity-50"
          >
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Roll {direction}</div>
            <div className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums">
              {target.toFixed(2)}
            </div>
            <div className="text-[9px] text-accent mt-0.5">tap to flip</div>
          </button>
          <Stat label="Win Chance" value={`${winChance.toFixed(2)}%`} />
        </div>

        {/* Bet input + button */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          <div className="flex justify-between text-xs">
            <span className="text-ink-mute">Profit on Win</span>
            <span className="font-mono font-semibold text-accent tabular-nums">{fmtCurrency(profitOnWin)}</span>
          </div>
          <button
            onClick={roll}
            disabled={busy || balance.balance < bet || bet <= 0}
            className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
          >
            {busy ? 'Rolling…' : 'Roll Dice'}
          </button>
        </div>

        {/* Recent rolls */}
        {recentRolls.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute mr-1 flex-shrink-0">Recent</span>
            {recentRolls.map((r) => (
              <span
                key={r.id}
                className={`font-mono font-semibold text-xs tabular-nums px-2 py-1 rounded-lg flex-shrink-0 ${
                  r.win ? 'bg-accent/15 text-accent' : 'bg-bg-elev text-ink-mute'
                }`}
              >
                {r.roll.toFixed(2)}
              </span>
            ))}
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-ink-mute">{label}</div>
      <div className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
