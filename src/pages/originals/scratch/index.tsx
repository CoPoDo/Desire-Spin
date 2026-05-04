import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import { SCRATCH_SYMBOLS, type ScratchResult, play } from './engine';

type Phase = 'idle' | 'reveal' | 'done';

export function ScratchGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<ScratchResult | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>(Array(9).fill(false));
  const [busy, setBusy] = useState(false);

  const start = useCallback(() => {
    if (busy) return;
    if (balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng, bet);
    setResult(r);
    setRevealed(Array(9).fill(false));
    setPhase('reveal');
    history.record({
      game: 'Scratch',
      bet,
      payout: r.payout,
      multiplier: r.multiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(bet, r.payout, false);
    setBusy(false);
  }, [busy, bet, balance, fairness, sound, history, session]);

  const revealTile = useCallback(
    (idx: number) => {
      if (phase !== 'reveal' || revealed[idx]) return;
      sound.play('tick');
      setRevealed((prev) => {
        const next = [...prev];
        next[idx] = true;
        const allRevealed = next.every(Boolean);
        if (allRevealed) {
          // Settle round: credit win, play sound
          if (result) {
            if (result.payout > bet) {
              balance.credit(result.payout);
              sound.play(
                result.multiplier >= 50
                  ? 'mega-win'
                  : result.multiplier >= 5
                    ? 'big-win'
                    : 'win',
              );
            } else if (result.payout > 0) {
              balance.credit(result.payout);
              sound.play('win');
            } else {
              sound.play('drop');
            }
          }
          setPhase('done');
        }
        return next;
      });
    },
    [phase, revealed, result, bet, balance, sound],
  );

  const revealAll = useCallback(() => {
    if (phase !== 'reveal' || !result) return;
    sound.play('click');
    setRevealed(Array(9).fill(true));
    if (result.payout > bet) {
      balance.credit(result.payout);
      sound.play(result.multiplier >= 50 ? 'mega-win' : result.multiplier >= 5 ? 'big-win' : 'win');
    } else if (result.payout > 0) {
      balance.credit(result.payout);
      sound.play('win');
    } else {
      sound.play('drop');
    }
    setPhase('done');
  }, [phase, result, bet, balance, sound]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setRevealed(Array(9).fill(false));
  }, []);

  const profit = result ? +(result.payout - bet).toFixed(2) : 0;
  const allRevealed = revealed.every(Boolean);

  return (
    <OriginalPageLayout title="Scratch Card">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              Match 3 symbols to win · 200× max
            </div>
          )}
          {phase === 'reveal' && (
            <div className="text-[10px] uppercase tracking-widest text-accent">
              Tap each tile to reveal
            </div>
          )}
          {phase === 'done' && result && (
            <div
              className="font-mono font-bold text-lg"
              style={{
                color: result.payout > bet
                  ? result.winningSymbol?.color
                  : '#9aa3b2',
              }}
            >
              {result.winningSymbol
                ? `${result.winningSymbol.emoji} × 3 · ${fmtMultiplier(result.multiplier)} · +${fmtCurrency(profit)}`
                : `No match · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* 3×3 scratch grid */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <ScratchTile
                key={i}
                idx={i}
                tile={result?.tiles[i] ?? null}
                revealed={revealed[i] === true}
                isWinning={result?.winningPositions.includes(i) ?? false}
                onReveal={() => revealTile(i)}
                phase={phase}
              />
            ))}
          </div>
        </div>

        {/* Prize pool legend (compact) */}
        <div className="rounded-xl bg-bg-card border border-edge p-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">
            Prize pool
          </div>
          <div className="grid grid-cols-7 gap-1">
            {SCRATCH_SYMBOLS.map((s) => (
              <div key={s.id} className="text-center">
                <div
                  className="text-2xl"
                  style={{ filter: `drop-shadow(0 0 6px ${s.glow})` }}
                >
                  {s.emoji}
                </div>
                <div
                  className="text-[10px] font-mono font-bold tabular-nums"
                  style={{ color: s.color }}
                >
                  {fmtMultiplier(s.multiplier)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bet + actions */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <BetInput bet={bet} onBetChange={setBet} disabled={busy || phase === 'reveal'} />
          {phase === 'reveal' && !allRevealed ? (
            <button
              onClick={revealAll}
              className="w-full py-3.5 rounded-xl bg-bg-elev border border-edge text-ink-dim font-bold text-sm uppercase tracking-wider transition active:scale-[0.99]"
            >
              Reveal All
            </button>
          ) : (
            <button
              onClick={phase === 'done' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0 || phase === 'reveal'}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'done' ? 'Play Again' : `Buy Card · ${fmtCurrency(bet)}`}
            </button>
          )}
        </div>
      </div>
    </OriginalPageLayout>
  );
}

function ScratchTile({
  tile,
  revealed,
  isWinning,
  onReveal,
  phase,
}: {
  idx: number;
  tile: ReturnType<typeof play>['tiles'][number] | null;
  revealed: boolean;
  isWinning: boolean;
  onReveal: () => void;
  phase: Phase;
}) {
  return (
    <button
      onClick={onReveal}
      disabled={phase !== 'reveal' || revealed}
      className="relative aspect-square rounded-xl overflow-hidden transition active:scale-95"
      style={{
        background: revealed
          ? `linear-gradient(180deg, ${tile?.color}15, #0e1218)`
          : 'linear-gradient(180deg, #5a4a30, #2a1f10)',
        border: isWinning && revealed
          ? `2px solid ${tile?.color}`
          : revealed
            ? `1.5px solid ${tile?.color}55`
            : '1px solid #4a3820',
        boxShadow: isWinning && revealed
          ? `0 0 18px ${tile?.glow}, inset 0 1px 0 rgba(255,255,255,.1)`
          : 'inset 0 1px 0 rgba(255,255,255,.06)',
      }}
    >
      <AnimatePresence mode="wait">
        {revealed && tile ? (
          <motion.div
            key="revealed"
            className="absolute inset-0 flex flex-col items-center justify-center select-none"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={
              isWinning
                ? {
                    rotateY: 0,
                    opacity: 1,
                    scale: [1, 1.18, 1],
                  }
                : { rotateY: 0, opacity: 1, scale: 1 }
            }
            transition={{
              duration: 0.35,
              ease: 'easeOut',
              scale: {
                duration: 0.7,
                repeat: isWinning ? Infinity : 0,
                ease: 'easeInOut',
              },
            }}
          >
            <span
              className="text-4xl"
              style={{
                filter: isWinning
                  ? `drop-shadow(0 0 12px ${tile.glow})`
                  : `drop-shadow(0 2px 4px rgba(0,0,0,.55))`,
              }}
            >
              {tile.emoji}
            </span>
            <span
              className="text-[10px] font-mono font-bold tabular-nums mt-0.5"
              style={{ color: tile.color }}
            >
              {fmtMultiplier(tile.multiplier)}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="hidden"
            className="absolute inset-0 flex items-center justify-center select-none"
            exit={{ opacity: 0 }}
          >
            {/* Scratch-card foil pattern */}
            <div
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 4px, transparent 4px 8px)`,
              }}
            />
            <span className="text-3xl opacity-60">?</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
