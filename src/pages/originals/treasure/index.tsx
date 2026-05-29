import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  GRID_SIZE,
  POOL_VALUES,
  TRAP_COUNT,
  type Tile,
  generateGrid,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'playing' | 'lost' | 'cashed';

export function TreasureGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(Array(GRID_SIZE).fill(false));
  const [accumulated, setAccumulated] = useState(0);
  const [seedsUsed, setSeedsUsed] = useState<{ serverSeed: string; clientSeed: string; nonce: number } | null>(null);

  const start = useCallback(() => {
    if (phase === 'playing') return;
    if (balance.balance < bet || bet <= 0) return;
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    setTiles(generateGrid(rng));
    setRevealed(Array(GRID_SIZE).fill(false));
    setAccumulated(0);
    setSeedsUsed({ serverSeed: seeds.serverSeed, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
    setPhase('playing');
  }, [phase, balance, bet, fairness, sound]);

  const reveal = useCallback(
    (idx: number) => {
      if (phase !== 'playing' || revealed[idx] || !tiles[idx]) return;
      const tile = tiles[idx]!;
      setRevealed((prev) => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
      if (tile.kind === 'trap') {
        sound.play('drop');
        setPhase('lost');
        if (seedsUsed) {
          history.record({
            game: 'Treasure',
            bet,
            payout: 0,
            multiplier: 0,
            serverSeedHash: fairness.hash,
            clientSeed: seedsUsed.clientSeed,
            nonce: seedsUsed.nonce,
          });
          session.recordSpin(bet, 0, false);
        }
      } else {
        // Tier the SFX by tile value so a 50× treasure feels audibly
        // different from a 0.3× scrap. Pre-fix all tiles played the
        // same dull 'tick' regardless of size, missing the "treasure
        // hunt" thrill.
        sound.play(tile.multiplier >= 5 ? 'coin' : 'tick');
        setAccumulated((prev) => +(prev + tile.multiplier).toFixed(2));
      }
    },
    [phase, revealed, tiles, sound, seedsUsed, history, session, fairness.hash, bet],
  );

  const cashOut = useCallback(() => {
    if (phase !== 'playing' || accumulated <= 0) return;
    const payout = +(bet * accumulated).toFixed(2);
    balance.credit(payout);
    sound.play(accumulated >= 10 ? 'mega-win' : accumulated >= 2 ? 'big-win' : 'win');
    setPhase('cashed');
    if (accumulated >= 1.5) {
      fireConfetti({
        count: accumulated >= 30 ? 130 : accumulated >= 10 ? 80 : 50,
      });
    }
    if (seedsUsed) {
      history.record({
        game: 'Treasure',
        bet,
        payout,
        multiplier: accumulated,
        serverSeedHash: fairness.hash,
        clientSeed: seedsUsed.clientSeed,
        nonce: seedsUsed.nonce,
      });
      session.recordSpin(bet, payout, false);
    }
  }, [phase, accumulated, bet, balance, sound, seedsUsed, history, session, fairness.hash]);

  const reset = useCallback(() => {
    setPhase('idle');
    setTiles([]);
    setRevealed(Array(GRID_SIZE).fill(false));
    setAccumulated(0);
    setSeedsUsed(null);
  }, []);

  const safeRevealed = revealed.filter((r, i) => r && tiles[i]?.kind === 'treasure').length;
  const inGame = phase === 'playing';
  const profit = +(bet * accumulated - bet).toFixed(2);
  const cashOutValue = +(bet * accumulated).toFixed(2);

  // Show all traps when game ends (lost or cashed) for transparency.
  const revealAll = phase === 'lost' || phase === 'cashed';

  // Status pool legend at top
  const poolLegend = useMemo(() => POOL_VALUES, []);

  return (
    <OriginalPageLayout title="Treasure Hunt">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-stake-muted">Total</span>
            <span className="font-mono font-bold text-lg text-stake-text tabular-nums">
              {fmtMultiplier(accumulated)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-stake-muted">Tiles</span>
            <span className="font-mono font-semibold text-sm text-stake-muted tabular-nums">
              {safeRevealed}/{GRID_SIZE - TRAP_COUNT}
            </span>
          </div>
        </div>

        {/* Outcome */}
        {phase !== 'idle' && phase !== 'playing' && (
          <div
            className={`rounded-xl bg-stake-card border border-stake-border p-3 text-center ${
              phase === 'cashed' ? 'border-stake-green/40' : 'border-accent-hot/40'
            }`}
          >
            <div
              className={`font-mono font-bold text-lg ${
                phase === 'cashed' ? 'text-stake-green' : 'text-stake-red'
              }`}
            >
              {phase === 'cashed'
                ? `Cashed out · ${fmtMultiplier(accumulated)} · +${fmtCurrency(profit)}`
                : `Trap! · -${fmtCurrency(bet)}`}
            </div>
          </div>
        )}

        {/* 5x5 grid — shakes when the player hits a trap, like Mines/
         *  Tower/Pump. */}
        <div
          className={`rounded-lg bg-stake-card border border-stake-border p-3 ${phase === 'lost' ? 'shake-medium' : ''}`}
        >
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: GRID_SIZE }).map((_, i) => {
              const tile = tiles[i] ?? null;
              const isRevealed = revealed[i] || (revealAll && tile);
              const isTrap = tile?.kind === 'trap';
              const justRevealed = revealed[i] === true;
              return (
                <button
                  key={i}
                  onClick={() => reveal(i)}
                  disabled={phase !== 'playing' || revealed[i]}
                  className="relative aspect-square rounded-lg overflow-hidden transition active:scale-95"
                  style={{
                    background:
                      !isRevealed
                        ? 'linear-gradient(180deg, #2a3142, #15191f)'
                        : isTrap
                          ? 'linear-gradient(180deg, #5a0810, #2a0408)'
                          : 'linear-gradient(180deg, #102a18, #0a1812)',
                    border: !isRevealed
                      ? '1px solid #3a4258'
                      : isTrap
                        ? `2px solid ${justRevealed ? '#ff5560' : 'rgba(200,16,46,.5)'}`
                        : `1.5px solid rgba(31,255,122,.5)`,
                    boxShadow: justRevealed && isTrap
                      ? '0 0 22px rgba(255,85,96,.7)'
                      : justRevealed && !isTrap
                        ? '0 0 12px rgba(31,255,122,.45)'
                        : 'inset 0 1px 0 rgba(255,255,255,.05)',
                  }}
                >
                  {isRevealed && tile ? (
                    isTrap ? (
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center text-3xl"
                        initial={justRevealed ? { scale: 0.4, rotate: -8 } : false}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 14 }}
                      >
                        💣
                      </motion.div>
                    ) : (
                      <motion.div
                        className="absolute inset-0 flex flex-col items-center justify-center"
                        initial={justRevealed ? { scale: 0.5, opacity: 0 } : false}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                      >
                        <span className="text-2xl">💎</span>
                        <span
                          className="font-mono font-bold text-[11px] tabular-nums leading-none"
                          style={{ color: tile.multiplier >= 10 ? '#ffd166' : tile.multiplier >= 1 ? '#1fff7a' : '#9aa3b2' }}
                        >
                          {fmtMultiplier(tile.multiplier)}
                        </span>
                      </motion.div>
                    )
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl text-stake-muted opacity-50">
                      ?
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pool legend */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-2">
          <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1.5 px-1">
            Tile multipliers · {TRAP_COUNT} traps
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {poolLegend.map((m, i) => (
              <span
                key={i}
                className="font-mono font-bold text-[10px] tabular-nums px-2 py-0.5 rounded"
                style={{
                  background:
                    m >= 10 ? 'rgba(255,209,102,.15)' :
                    m >= 1 ? 'rgba(31,255,122,.15)' :
                    'rgba(154,163,178,.15)',
                  color: m >= 10 ? '#ffd166' : m >= 1 ? '#1fff7a' : '#9aa3b2',
                  border: '1px solid rgba(255,255,255,.05)',
                }}
              >
                {fmtMultiplier(m)}
              </span>
            ))}
          </div>
        </div>

        {/* Controls */}
        {!inGame ? (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} />
            <button
              onClick={phase === 'idle' ? start : () => { reset(); start(); }}
              disabled={balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'idle' ? `Start · ${fmtCurrency(bet)}` : 'Play Again'}
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stake-muted uppercase tracking-widest text-[10px]">
                Cash out value
              </span>
              <span className="font-mono font-bold text-base text-stake-green tabular-nums">
                {fmtCurrency(cashOutValue)}
              </span>
            </div>
            <button
              onClick={cashOut}
              disabled={accumulated <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              Cash Out · {fmtCurrency(cashOutValue)}
            </button>
            <div className="text-[10px] text-stake-muted text-center">
              Tap a tile to reveal a multiplier or hit a trap
            </div>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}
