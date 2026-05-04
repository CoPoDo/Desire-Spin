import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
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

export function DragonTigerGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [pick, setPick] = useState<BetKind>('dragon');
  const [phase, setPhase] = useState<Phase>('idle');
  const [dragon, setDragon] = useState<Card | null>(null);
  const [tiger, setTiger] = useState<Card | null>(null);
  const [revealedDragon, setRevealedDragon] = useState(false);
  const [revealedTiger, setRevealedTiger] = useState(false);
  const [winner, setWinner] = useState<'dragon' | 'tiger' | 'tie' | null>(null);
  const [payout, setPayout] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const start = useCallback(() => {
    if (busy) return;
    if (balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    setPhase('dealing');
    setRevealedDragon(false);
    setRevealedTiger(false);
    setWinner(null);
    setPayout(0);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng, bet, pick);
    setDragon(r.dragon);
    setTiger(r.tiger);
    // Brief deal pause, then flip reveal
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
      setPayout(r.payout);
      if (r.payout > bet) {
        balance.credit(r.payout);
        sound.play(r.multiplier >= TIE_PAYOUT ? 'mega-win' : 'big-win');
        fireConfetti({
          count: r.multiplier >= TIE_PAYOUT ? 130 : 70,
          colors: ['#ffd166', '#c8102e', '#1fff7a', '#ffffff'],
        });
      } else if (r.payout === bet) {
        balance.credit(r.payout); // push refund
        sound.play('tick');
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Dragon Tiger',
        bet,
        payout: r.payout,
        multiplier: r.multiplier,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(bet, r.payout, false);
      setBusy(false);
    }, 1700);
  }, [busy, bet, pick, balance, fairness, sound, history, session]);

  const reset = useCallback(() => {
    setPhase('idle');
    setDragon(null);
    setTiger(null);
    setRevealedDragon(false);
    setRevealedTiger(false);
    setWinner(null);
    setPayout(0);
  }, []);

  const profitOnWin =
    pick === 'tie'
      ? +(bet * TIE_PAYOUT - bet).toFixed(2)
      : +(bet * DRAGON_TIGER_PAYOUT - bet).toFixed(2);

  return (
    <OriginalPageLayout title="Dragon Tiger">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              Place your bet · highest card wins
            </div>
          )}
          {phase === 'dealing' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-dim">Dealing…</div>
          )}
          {phase === 'reveal' && winner && (
            <div
              className={`font-mono font-bold text-lg ${
                payout > bet
                  ? 'text-accent'
                  : payout === bet
                    ? 'text-ink-dim'
                    : 'text-accent-hot'
              }`}
            >
              {winner === 'tie'
                ? 'Tie'
                : winner === 'dragon'
                  ? 'Dragon wins'
                  : 'Tiger wins'}
              {payout > bet && ` · +${fmtCurrency(payout - bet)}`}
              {payout === bet && winner === 'tie' && pick !== 'tie' && ' · push'}
              {payout === 0 && ` · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="grid grid-cols-2 gap-3">
            <CardSlot
              label="Dragon"
              card={dragon}
              revealed={revealedDragon}
              winning={winner === 'dragon'}
              accent="#ff5560"
              icon="🐉"
              picked={pick === 'dragon'}
            />
            <CardSlot
              label="Tiger"
              card={tiger}
              revealed={revealedTiger}
              winning={winner === 'tiger'}
              accent="#ffc62a"
              icon="🐅"
              picked={pick === 'tiger'}
            />
          </div>
          {/* Tie badge between */}
          <div className="mt-3 text-center">
            <div
              className={`inline-block px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider ${
                winner === 'tie'
                  ? 'bg-accent text-bg'
                  : pick === 'tie'
                    ? 'bg-accent-violet/30 border border-accent-violet text-accent-violet'
                    : 'bg-bg-elev border border-edge text-ink-dim'
              }`}
            >
              {winner === 'tie' ? 'Tie!' : `Tie pays ${TIE_PAYOUT}×`}
            </div>
          </div>
        </div>

        {/* Pick + bet */}
        {phase !== 'dealing' ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">
                Bet on
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['dragon', 'tie', 'tiger'] as BetKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setPick(k)}
                    disabled={busy}
                    className={`py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                      pick === k
                        ? k === 'dragon'
                          ? 'bg-[#ff5560] text-white shadow-[0_0_14px_rgba(255,85,96,.5)]'
                          : k === 'tiger'
                            ? 'bg-[#ffc62a] text-bg shadow-[0_0_14px_rgba(255,198,42,.5)]'
                            : 'bg-accent-violet text-white shadow-[0_0_14px_rgba(167,139,250,.5)]'
                        : 'bg-bg-elev border border-edge text-ink-dim hover:text-ink'
                    }`}
                  >
                    {k === 'dragon'
                      ? `🐉 ${DRAGON_TIGER_PAYOUT}×`
                      : k === 'tiger'
                        ? `🐅 ${DRAGON_TIGER_PAYOUT}×`
                        : `Tie ${TIE_PAYOUT}×`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-mute">Profit on Win</span>
              <span className="font-mono font-semibold text-accent tabular-nums">
                {fmtCurrency(profitOnWin)}
              </span>
            </div>
            <button
              onClick={phase === 'reveal' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Deal Again' : `Deal · ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center text-xs text-ink-dim">
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
  picked,
}: {
  label: string;
  card: Card | null;
  revealed: boolean;
  winning: boolean;
  accent: string;
  icon: string;
  picked: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1 flex items-center justify-center gap-1">
        <span>{icon}</span>
        <span style={{ color: picked ? accent : undefined }}>{label}</span>
      </div>
      <div
        className="relative aspect-[3/4] rounded-xl overflow-hidden"
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
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                color: suitIsRed(card.suit) ? '#c8102e' : '#15191f',
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
      </div>
    </div>
  );
}
