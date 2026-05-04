import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  COLUMN_LETTERS,
  DRAW_COUNT,
  LINES,
  PAY_TABLE,
  type BingoResult,
  computeLineMatches,
  play,
} from './engine';

type Phase = 'idle' | 'drawing' | 'reveal';

export function BingoGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BingoResult | null>(null);
  const [drawnSoFar, setDrawnSoFar] = useState<number[]>([]);
  const [marked, setMarked] = useState<Set<number>>(new Set([12])); // FREE
  const [completedLines, setCompletedLines] = useState<number[]>([]);

  const start = useCallback(() => {
    if (busy) return;
    if (balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    setPhase('drawing');
    setDrawnSoFar([]);
    setMarked(new Set([12]));
    setCompletedLines([]);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng, bet);
    setResult(r);

    // Animate draws sequentially.
    let i = 0;
    const drawNext = () => {
      if (i >= DRAW_COUNT) {
        // Final settle
        setPhase('reveal');
        if (r.payout > 0) {
          balance.credit(r.payout);
          sound.play(
            r.lineCount >= 4 ? 'mega-win' :
            r.lineCount >= 2 ? 'big-win' : 'win',
          );
        } else {
          sound.play('drop');
        }
        history.record({
          game: 'Bingo',
          bet,
          payout: r.payout,
          multiplier: r.multiplier,
          serverSeedHash: fairness.hash,
          clientSeed: seeds.clientSeed,
          nonce: seeds.nonce,
        });
        session.recordSpin(bet, r.payout, false);
        setBusy(false);
        return;
      }
      const num = r.draws[i]!;
      i++;
      sound.play('tick');
      setDrawnSoFar((prev) => [...prev, num]);
      // Check if this number is on the card
      let cardIdx = -1;
      for (let j = 0; j < 25; j++) {
        if (j !== 12 && r.card[j] === num) {
          cardIdx = j;
          break;
        }
      }
      if (cardIdx >= 0) {
        setMarked((prev) => {
          const next = new Set(prev);
          next.add(cardIdx);
          // Recompute lines after this mark
          const lines = computeLineMatches(r.card, next);
          setCompletedLines(lines);
          return next;
        });
      }
      setTimeout(drawNext, 220);
    };
    setTimeout(drawNext, 380);
  }, [busy, balance, bet, fairness, sound, history, session]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setDrawnSoFar([]);
    setMarked(new Set([12]));
    setCompletedLines([]);
  }, []);

  const profit = result ? +(result.payout - bet).toFixed(2) : 0;

  return (
    <OriginalPageLayout title="Bingo">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              {DRAW_COUNT} draws · 1+ line wins
            </div>
          )}
          {phase === 'drawing' && (
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-widest text-ink-dim">
                Drawing · {drawnSoFar.length}/{DRAW_COUNT}
              </div>
              <div className="font-mono font-bold text-base text-ink tabular-nums">
                · {completedLines.length} {completedLines.length === 1 ? 'line' : 'lines'}
              </div>
            </div>
          )}
          {phase === 'reveal' && result && (
            <div
              className={`font-mono font-bold text-lg ${
                result.payout > bet
                  ? 'text-accent'
                  : 'text-accent-hot'
              }`}
            >
              {result.lineCount} {result.lineCount === 1 ? 'line' : 'lines'} · {fmtMultiplier(result.multiplier)}
              {result.payout > 0
                ? ` · +${fmtCurrency(profit)}`
                : ` · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-bg-card border border-edge p-3">
          {/* B-I-N-G-O header */}
          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {COLUMN_LETTERS.map((letter) => (
              <div
                key={letter}
                className="text-center font-display font-extrabold text-lg text-accent-gold"
                style={{ textShadow: '0 0 12px rgba(255,209,102,.6)' }}
              >
                {letter}
              </div>
            ))}
          </div>
          <BingoCard
            card={result?.card ?? null}
            marked={marked}
            completedLines={completedLines}
          />
        </div>

        {/* Drawn numbers */}
        <div className="rounded-xl bg-bg-card border border-edge p-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">
            Drawn ({drawnSoFar.length}/{DRAW_COUNT})
          </div>
          <div className="flex flex-wrap gap-1 min-h-[28px]">
            <AnimatePresence>
              {drawnSoFar.map((n) => (
                <motion.span
                  key={n}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                  className="font-mono font-bold text-[11px] tabular-nums w-7 h-7 rounded-full flex items-center justify-center bg-accent-gold/15 text-accent-gold border border-accent-gold/40"
                >
                  {n}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Pay table */}
        <div className="rounded-xl bg-bg-card border border-edge p-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">Pay table</div>
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4].map((tier) => (
              <div key={tier} className="text-center">
                <div className="text-[10px] text-ink-dim">{tier}{tier === 4 ? '+' : ''} line{tier > 1 ? 's' : ''}</div>
                <div className="font-mono font-bold text-sm text-accent tabular-nums">
                  {PAY_TABLE[tier]}×
                </div>
              </div>
            ))}
            <div className="text-center">
              <div className="text-[10px] text-ink-dim">Lines</div>
              <div className="font-mono font-bold text-sm text-ink-mute tabular-nums">
                {LINES.length}
              </div>
            </div>
          </div>
        </div>

        {/* Bet + actions */}
        {phase !== 'drawing' ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <button
              onClick={phase === 'reveal' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Play Again' : `Buy Card · ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center text-xs text-ink-dim">
            Drawing balls…
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

function BingoCard({
  card,
  marked,
  completedLines,
}: {
  card: number[] | null;
  marked: Set<number>;
  completedLines: number[];
}) {
  // Build a set of indices that are part of any completed line for highlight.
  const winningIndices = new Set<number>();
  for (const lineIdx of completedLines) {
    for (const cellIdx of LINES[lineIdx]!) winningIndices.add(cellIdx);
  }
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: 25 }).map((_, i) => {
        const value = card?.[i] ?? null;
        const isFree = i === 12;
        const isMarked = marked.has(i);
        const isWinning = winningIndices.has(i);
        return (
          <motion.div
            key={i}
            className="relative aspect-square rounded-lg flex items-center justify-center font-mono font-bold tabular-nums"
            animate={isWinning ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{
              duration: 0.7,
              repeat: isWinning ? Infinity : 0,
              ease: 'easeInOut',
            }}
            style={{
              background: isWinning
                ? 'linear-gradient(180deg, rgba(31,255,122,.25), rgba(0,0,0,.4))'
                : isMarked
                  ? 'linear-gradient(180deg, rgba(167,139,250,.22), rgba(0,0,0,.45))'
                  : 'linear-gradient(180deg, #1a1f29, #0e1218)',
              border: isWinning
                ? '2px solid rgba(31,255,122,.85)'
                : isMarked
                  ? '1.5px solid rgba(167,139,250,.55)'
                  : '1px solid #2a3142',
              boxShadow: isWinning
                ? '0 0 14px rgba(31,255,122,.5)'
                : isMarked
                  ? '0 0 10px rgba(167,139,250,.35), inset 0 1px 0 rgba(255,255,255,.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,.04)',
              color: isFree ? '#ffd166' : isMarked ? '#fff' : '#9aa3b2',
              fontSize: isFree ? '0.7rem' : '0.95rem',
            }}
          >
            {isFree ? 'FREE' : value ?? '·'}
            {isMarked && !isFree && (
              <motion.span
                className="absolute inset-0 flex items-center justify-center pointer-events-none text-2xl text-accent-violet"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                style={{
                  textShadow: '0 0 10px rgba(167,139,250,.7)',
                  mixBlendMode: 'screen',
                }}
              >
                ●
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
