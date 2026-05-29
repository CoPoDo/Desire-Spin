import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type BetKind,
  type Card,
  DRAGON_TIGER_PAYOUT,
  TIE_PAYOUT,
  play,
  rankLabel,
  suitGlyph,
  suitIsRed,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'dealing' | 'reveal';

type Chips = { dragon: number; tie: number; tiger: number };

export function DragonTigerGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  /** Chips placed on each cell. Real Dragon Tiger lets you bet on
   *  multiple options simultaneously (e.g. Dragon + Tie) — our old
   *  single-pick radio forced you to choose just one. */
  const [chips, setChips] = useState<Chips>({ dragon: 0, tie: 0, tiger: 0 });
  const [phase, setPhase] = useState<Phase>('idle');
  const [dragon, setDragon] = useState<Card | null>(null);
  const [tiger, setTiger] = useState<Card | null>(null);
  const [revealedDragon, setRevealedDragon] = useState(false);
  const [revealedTiger, setRevealedTiger] = useState(false);
  const [winner, setWinner] = useState<'dragon' | 'tiger' | 'tie' | null>(null);
  const [totalReturn, setTotalReturn] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const totalStake = chips.dragon + chips.tie + chips.tiger;

  const placeChip = useCallback((kind: BetKind) => {
    if (busy) return;
    sound.play('tick');
    setChips((c) => ({ ...c, [kind]: +(c[kind] + bet).toFixed(2) }));
  }, [busy, bet, sound]);

  const clearChips = useCallback(() => {
    if (busy) return;
    setChips({ dragon: 0, tie: 0, tiger: 0 });
  }, [busy]);

  const start = useCallback(() => {
    if (busy || totalStake <= 0 || balance.balance < totalStake) return;
    setBusy(true);
    sound.play('click');
    balance.debit(totalStake);
    setPhase('dealing');
    setRevealedDragon(false);
    setRevealedTiger(false);
    setWinner(null);
    setTotalReturn(0);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const activeBets: { kind: BetKind; amount: number }[] = [];
    if (chips.dragon > 0) activeBets.push({ kind: 'dragon', amount: chips.dragon });
    if (chips.tie > 0) activeBets.push({ kind: 'tie', amount: chips.tie });
    if (chips.tiger > 0) activeBets.push({ kind: 'tiger', amount: chips.tiger });
    const r = play(rng, activeBets);
    setDragon(r.dragon);
    setTiger(r.tiger);
    setTimeout(() => {
      setRevealedDragon(true);
      sound.play('drop');
    }, 700);
    setTimeout(() => {
      setRevealedTiger(true);
      sound.play('drop');
    }, 1300);
    setTimeout(() => {
      setPhase('reveal');
      setWinner(r.winner);
      setTotalReturn(r.totalReturn);
      const p = r.totalReturn - r.totalStake;
      if (r.totalReturn > r.totalStake) {
        balance.credit(r.totalReturn);
        sound.play(p >= r.totalStake * 5 ? 'mega-win' : 'big-win');
        fireConfetti({
          count: p >= r.totalStake * 5 ? 130 : 70,
          colors: ['#ffd166', '#c8102e', '#1fff7a', '#ffffff'],
        });
      } else if (r.totalReturn === r.totalStake) {
        balance.credit(r.totalReturn);
        sound.play('tick');
      } else if (r.totalReturn > 0) {
        balance.credit(r.totalReturn);
        sound.play('win');
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Dragon Tiger',
        bet: r.totalStake,
        payout: r.totalReturn,
        multiplier: r.totalReturn / Math.max(r.totalStake, 0.01),
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(r.totalStake, r.totalReturn, false);
      setBusy(false);
    }, 1700);
  }, [busy, balance, chips, totalStake, fairness, sound, history, session]);

  const reset = useCallback(() => {
    setPhase('idle');
    setDragon(null);
    setTiger(null);
    setRevealedDragon(false);
    setRevealedTiger(false);
    setWinner(null);
    setTotalReturn(0);
  }, []);

  // Space-to-deal. After a reveal, Space resets and deals again so
  // the player can rapid-fire rounds with chips kept in place.
  useHotkey(' ', () => {
    if (busy || totalStake <= 0) return;
    if (phase === 'reveal') reset();
    start();
  }, true);

  const profit = totalReturn - totalStake;

  return (
    <OriginalPageLayout title="Dragon Tiger">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">
              Place chips on Dragon / Tie / Tiger
            </div>
          )}
          {phase === 'dealing' && (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">Dealing…</div>
          )}
          {phase === 'reveal' && winner && (
            <div
              className={`font-mono font-bold text-lg ${
                profit > 0 ? 'text-stake-green' : profit === 0 ? 'text-stake-muted' : 'text-stake-red'
              }`}
            >
              {winner === 'tie'
                ? 'Tie'
                : winner === 'dragon'
                  ? 'Dragon wins'
                  : 'Tiger wins'}
              {profit > 0 && ` · +${fmtCurrency(profit)}`}
              {profit === 0 && totalStake > 0 && ' · push'}
              {profit < 0 && ` · ${fmtCurrency(profit)}`}
            </div>
          )}
        </div>

        {/* Cards + tie badge as chip-betting cells */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4">
          <div className="grid grid-cols-2 gap-3">
            <CardSlot
              label="Dragon"
              card={dragon}
              revealed={revealedDragon}
              winning={winner === 'dragon'}
              accent="#ff5560"
              icon="🐉"
              chip={chips.dragon}
              onClick={() => placeChip('dragon')}
              disabled={busy}
              payoutLabel={`${DRAGON_TIGER_PAYOUT}×`}
            />
            <CardSlot
              label="Tiger"
              card={tiger}
              revealed={revealedTiger}
              winning={winner === 'tiger'}
              accent="#ffc62a"
              icon="🐅"
              chip={chips.tiger}
              onClick={() => placeChip('tiger')}
              disabled={busy}
              payoutLabel={`${DRAGON_TIGER_PAYOUT}×`}
            />
          </div>
          {/* Tie cell — now a chip-bettable button matching the cards */}
          <div className="mt-3">
            <button
              onClick={() => placeChip('tie')}
              disabled={busy}
              className={`relative w-full py-2.5 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                winner === 'tie'
                  ? 'bg-stake-green text-stake-bg'
                  : chips.tie > 0
                    ? 'bg-accent-violet/30 border border-accent-violet text-accent-violet'
                    : 'bg-stake-input border border-stake-border text-stake-muted hover:text-stake-text'
              }`}
            >
              {winner === 'tie' ? 'Tie!' : `Tie · ${TIE_PAYOUT}×`}
              {chips.tie > 0 && (
                <span
                  className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent-gold text-stake-bg text-[10px] font-mono font-bold flex items-center justify-center"
                  style={{ boxShadow: '0 0 6px rgba(255,209,102,.7)' }}
                >
                  ${chips.tie}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bet panel */}
        {phase !== 'dealing' ? (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <div className="flex items-center justify-between text-xs">
              <span className="text-stake-muted uppercase tracking-wider">Total Stake</span>
              <span className="font-mono font-bold tabular-nums">{fmtCurrency(totalStake)}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearChips}
                disabled={busy || totalStake === 0}
                className="flex-1 py-2.5 rounded-xl bg-stake-input border border-stake-border text-stake-muted font-bold text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={phase === 'reveal' ? () => { reset(); start(); } : start}
                disabled={busy || totalStake === 0 || balance.balance < totalStake}
                className="flex-[2] py-2.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                {phase === 'reveal'
                  ? `Deal Again · ${fmtCurrency(totalStake)}`
                  : totalStake === 0
                    ? 'Place chips first'
                    : `Deal · ${fmtCurrency(totalStake)}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 text-center text-xs text-stake-muted">
            Dealing the cards…
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

function CardSlot({
  label,
  card,
  revealed,
  winning,
  accent,
  icon,
  chip,
  onClick,
  disabled,
  payoutLabel,
}: {
  label: string;
  card: Card | null;
  revealed: boolean;
  winning: boolean;
  accent: string;
  icon: string;
  chip: number;
  onClick: () => void;
  disabled: boolean;
  payoutLabel: string;
}) {
  const picked = chip > 0;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-center w-full transition active:scale-[0.98] disabled:opacity-90 disabled:cursor-default"
    >
      <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1 flex items-center justify-center gap-1">
        <span>{icon}</span>
        <span style={{ color: picked ? accent : undefined }}>{label}</span>
        <span className="text-stake-muted font-mono">· {payoutLabel}</span>
      </div>
      <motion.div
        className="relative aspect-[3/4] rounded-xl overflow-hidden"
        animate={
          winning
            ? {
                // Pulse on victory: glow ramps up + frame brightens
                // briefly. Real Stake D/T flashes the winning slot for
                // ~600ms before the result text settles.
                boxShadow: [
                  `0 0 18px ${accent}66`,
                  `0 0 36px ${accent}ff`,
                  `0 0 24px ${accent}aa`,
                ],
                scale: [1, 1.04, 1],
              }
            : {}
        }
        transition={{ duration: 0.55, times: [0, 0.45, 1], ease: 'easeOut' }}
        style={{
          background: revealed
            ? 'linear-gradient(180deg, #f8f5ee, #d4cfc0)'
            : `linear-gradient(135deg, ${accent}33, #15191f)`,
          border: winning
            ? `2px solid ${accent}`
            : picked
              ? `1.5px solid ${accent}99`
              : '1px solid #2a3142',
          boxShadow: winning
            ? `0 0 24px ${accent}aa`
            : picked
              ? `0 0 12px ${accent}44`
              : 'inset 0 1px 0 rgba(255,255,255,.06)',
        }}
      >
        <AnimatePresence mode="wait">
          {revealed && card ? (
            <motion.div
              key={`${card.rank}-${card.suit}`}
              className="absolute inset-0"
              // Springy flip with a small scale-pop on landing — the
              // previous flat easeOut had no "snap" moment, so the
              // reveal felt like a slow rotation rather than a card
              // flicked into place.
              initial={{ rotateY: 110, opacity: 0, scale: 0.85 }}
              animate={{ rotateY: 0, opacity: 1, scale: [0.85, 1.05, 1] }}
              transition={{
                duration: 0.42,
                ease: [0.16, 1, 0.3, 1],
                scale: { duration: 0.42, times: [0, 0.7, 1] },
              }}
              style={{
                color: suitIsRed(card.suit) ? '#c8102e' : '#15191f',
                transformOrigin: 'center center',
              }}
            >
              {/* Corner pips matching the rest of the card games */}
              <div className="absolute top-2 left-3 leading-none flex flex-col items-center text-sm font-bold">
                <span>{rankLabel(card.rank)}</span>
                <span>{suitGlyph(card.suit)}</span>
              </div>
              <div className="absolute bottom-2 right-3 leading-none flex flex-col items-center rotate-180 text-sm font-bold">
                <span>{rankLabel(card.rank)}</span>
                <span>{suitGlyph(card.suit)}</span>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display font-extrabold text-5xl leading-none">
                  {rankLabel(card.rank)}
                </div>
                <div className="text-4xl mt-1">{suitGlyph(card.suit)}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-4xl opacity-80">{icon}</div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Chip badge overlay — shows the staked amount on this side */}
        {chip > 0 && (
          <span
            className="absolute top-1.5 right-1.5 min-w-[24px] h-[24px] px-1.5 rounded-full bg-accent-gold text-stake-bg text-[10px] font-mono font-bold flex items-center justify-center"
            style={{ boxShadow: '0 0 8px rgba(255,209,102,.75)' }}
          >
            ${chip}
          </span>
        )}
      </motion.div>
    </button>
  );
}
