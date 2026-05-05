import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type Card,
  type RoundState,
  dealRound,
  double,
  handValue,
  hit,
  rankLabel,
  stand,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

export function BlackjackGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [round, setRound] = useState<RoundState | null>(null);
  // We keep one RNG per round so subsequent hits draw from the same stream
  const [rngState, setRngState] = useState<{ serverSeed: string; clientSeed: string; nonce: number; pos: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const done = round?.phase === 'done';

  const startHand = useCallback(() => {
    if (busy || balance.balance < bet || bet <= 0) return;
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    // Make a fresh RNG and remember its identity so we can recreate it
    // partway through the round (each hit/double advances cursor).
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = dealRound(rng, bet);
    setRound(r);
    setRngState({ ...seeds, pos: 0 });
    if (r.phase === 'done') {
      // Immediate resolution (blackjack / dealer blackjack / push)
      if (r.payout > 0) balance.credit(r.payout);
      sound.play(r.outcome === 'player-blackjack' ? 'big-win' : r.outcome === 'push' ? 'click' : 'drop');
      history.record({
        game: 'Blackjack',
        bet,
        payout: r.payout,
        multiplier: r.payout / bet,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(bet, r.payout, false);
    }
  }, [busy, balance, bet, fairness, sound, history, session]);

  /** Advance using a fresh RNG keyed off the next nonce — keeps each
   *  draw provably-fair while letting the player make decisions. */
  const nextRng = useCallback(() => {
    const seeds = fairness.consumeNonce();
    return createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
  }, [fairness]);

  const finalizeRound = useCallback(
    (r: RoundState) => {
      if (r.phase !== 'done') return;
      if (r.payout > 0) balance.credit(r.payout);
      const profit = r.payout - r.bet;
      if (r.outcome === 'player-blackjack' || profit > r.bet) {
        fireConfetti({ count: r.outcome === 'player-blackjack' ? 130 : 70 });
      }
      sound.play(
        r.outcome === 'player-blackjack' || profit > r.bet ? 'big-win' :
        profit > 0 ? 'win' :
        profit === 0 ? 'click' :
        'drop',
      );
      history.record({
        game: 'Blackjack',
        bet: r.bet,
        payout: r.payout,
        multiplier: r.payout / Math.max(r.bet, 0.01),
        serverSeedHash: fairness.hash,
        clientSeed: '',
        nonce: 0,
      });
      session.recordSpin(r.bet, r.payout, false);
    },
    [balance, sound, history, fairness, session],
  );

  const onHit = useCallback(() => {
    if (!round || round.phase !== 'player' || busy) return;
    setBusy(true);
    const rng = nextRng();
    const r = hit(rng, round);
    setRound(r);
    sound.play('click');
    if (r.phase === 'done') {
      finalizeRound(r);
    }
    setTimeout(() => setBusy(false), 220);
  }, [round, busy, nextRng, sound, finalizeRound]);

  const onStand = useCallback(() => {
    if (!round || round.phase !== 'player' || busy) return;
    setBusy(true);
    const rng = nextRng();
    const r = stand(rng, round);
    setRound(r);
    // Schedule a 'drop' SFX for each new dealer card revealed during
    // the deal-out animation. The entry animation delays each card
    // by index*450ms so we mirror that with audible deals.
    const newDealerCards = r.dealer.length - 1; // hole card flip + each new draw
    for (let i = 0; i < newDealerCards; i++) {
      window.setTimeout(() => sound.play('drop'), 50 + i * 450);
    }
    // Finalize after the deal-out completes so the outcome chime lands
    // *after* the dealer's final card flips into place (was firing
    // simultaneously with the first card, drowning out the reveal).
    const settleAt = 200 + newDealerCards * 450;
    window.setTimeout(() => {
      finalizeRound(r);
      setBusy(false);
    }, settleAt);
  }, [round, busy, nextRng, finalizeRound, sound]);

  const onDouble = useCallback(() => {
    if (!round || round.phase !== 'player' || busy || round.player.length !== 2) return;
    if (balance.balance < round.initialBet) return;
    setBusy(true);
    sound.play('click');
    balance.debit(round.initialBet);
    const rng = nextRng();
    const r = double(rng, round);
    setRound(r);
    // Same staggered reveal as Stand — double draws one player card
    // (counted via the new dealer-card count) plus the dealer's full
    // hand. SFX per card; finalize after the last one lands.
    const newDealerCards = r.dealer.length - 1;
    for (let i = 0; i < newDealerCards; i++) {
      window.setTimeout(() => sound.play('drop'), 50 + i * 450);
    }
    const settleAt = 200 + newDealerCards * 450;
    window.setTimeout(() => {
      finalizeRound(r);
      setBusy(false);
    }, settleAt);
  }, [round, busy, balance, sound, nextRng, finalizeRound]);

  const reset = useCallback(() => {
    setRound(null);
    setRngState(null);
  }, []);

  const playerVal = round ? handValue(round.player) : null;
  // Show only the dealer's first card while player is still acting
  const dealerVisible = round
    ? round.phase === 'player'
      ? [round.dealer[0]!]
      : round.dealer
    : [];
  const dealerVal = round && round.phase !== 'player' ? handValue(round.dealer) : null;

  return (
    <OriginalPageLayout title="Blackjack">
      <div className="flex flex-col p-4 gap-3 max-w-md mx-auto w-full">
        {/* Dealer */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute">Dealer</span>
            {dealerVal && (
              <span className="font-mono font-bold text-base tabular-nums text-ink">
                {dealerVal.value}{dealerVal.soft ? ' (soft)' : ''}{dealerVal.bust ? ' bust' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2 justify-center min-h-[100px]">
            {/* Dealer cards: during the player phase only the first card
                shows + a face-down placeholder. After stand, each new
                dealer card eases in 450ms apart (was 100ms) so the
                player can read each rank as it lands. The first card
                stays mounted (delay=0) and only NEW cards animate. */}
            {dealerVisible.map((c, i) => (
              <CardView key={i} card={c} delay={i === 0 ? 0 : (i - 1) * 450 + 50} />
            ))}
            {round && round.phase === 'player' && (
              <CardView hidden delay={100} />
            )}
            {!round && (
              <div className="text-[11px] text-ink-mute self-center">Place a bet to deal</div>
            )}
          </div>
        </div>

        {/* Player */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-ink-mute">You</span>
            {playerVal && (
              <span className="font-mono font-bold text-base tabular-nums text-ink">
                {playerVal.value}{playerVal.soft ? ' (soft)' : ''}{playerVal.bust ? ' bust' : ''}
                {playerVal.blackjack ? ' · BLACKJACK' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2 justify-center min-h-[100px]">
            {round?.player.map((c, i) => <CardView key={i} card={c} delay={i * 100} />)}
          </div>
        </div>

        {/* Outcome */}
        {done && round?.outcome && (
          <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
            <div
              className={`font-mono font-bold text-lg ${
                round.outcome === 'player-blackjack' || round.outcome === 'player-win'
                  ? 'text-accent'
                  : round.outcome === 'push'
                    ? 'text-ink-dim'
                    : 'text-accent-hot'
              }`}
            >
              {round.outcome === 'player-blackjack' ? `BLACKJACK · +${fmtCurrency(round.payout - round.bet)}` :
               round.outcome === 'player-win' ? `Win · +${fmtCurrency(round.payout - round.bet)}` :
               round.outcome === 'push' ? `Push · ${fmtCurrency(round.bet)} returned` :
               round.outcome === 'player-bust' ? `Bust · -${fmtCurrency(round.bet)}` :
               `Dealer wins · -${fmtCurrency(round.bet)}`}
            </div>
          </div>
        )}

        {/* Controls */}
        {!round || done ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <button
              onClick={done ? () => { reset(); startHand(); } : startHand}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {done ? 'Deal Again' : `Deal · ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onHit}
              disabled={busy}
              className="py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.99]"
            >
              Hit
            </button>
            <button
              onClick={onStand}
              disabled={busy}
              className="py-3.5 rounded-xl bg-accent-hot text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.99]"
            >
              Stand
            </button>
            <button
              onClick={onDouble}
              disabled={busy || round.player.length !== 2 || balance.balance < round.initialBet}
              className="py-3.5 rounded-xl bg-accent-gold text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.99]"
            >
              Double
            </button>
          </div>
        )}
        {/* Suppress lint */}
        {rngState && null}
      </div>
    </OriginalPageLayout>
  );
}

function CardView({ card, hidden, delay = 0 }: { card?: Card; hidden?: boolean; delay?: number }) {
  if (hidden) {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0, rotateY: 90 }}
        animate={{ y: 0, opacity: 1, rotateY: 0 }}
        transition={{ delay: delay / 1000, type: 'spring', stiffness: 240, damping: 20 }}
        className="relative w-16 h-24 rounded-xl flex items-center justify-center"
        style={{
          background:
            'repeating-linear-gradient(45deg, #2a3142, #2a3142 4px, #1a1f29 4px, #1a1f29 8px)',
          border: '2px solid #c8932e',
          boxShadow: '0 8px 18px rgba(0,0,0,.5)',
        }}
      >
        {/* Gold diamond ornament — proper card-back filigree instead
         *  of a ⚡ emoji placeholder. */}
        <div
          className="rotate-45"
          style={{
            width: 18,
            height: 18,
            background: 'linear-gradient(135deg, #ffd166, #c8932e)',
            border: '1px solid rgba(255,209,102,.65)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4)',
          }}
        />
      </motion.div>
    );
  }
  if (!card) return null;
  const red = card.suit === '♥' || card.suit === '♦';
  return (
    <motion.div
      initial={{ y: -30, opacity: 0, rotateY: 180 }}
      animate={{ y: 0, opacity: 1, rotateY: 0 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 240, damping: 20 }}
      className="relative w-16 h-24 rounded-xl select-none font-bold"
      style={{
        background: 'linear-gradient(180deg, #f5f0e4, #e8dfc9)',
        border: '2px solid #c8932e',
        boxShadow: '0 8px 18px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6)',
        color: red ? '#c8102e' : '#1a0f00',
      }}
    >
      {/* Top-left corner pip */}
      <div className="absolute top-1 left-1 leading-none flex flex-col items-center text-[10px]">
        <span>{rankLabel(card.rank)}</span>
        <span>{card.suit}</span>
      </div>
      {/* Bottom-right corner pip (rotated) */}
      <div className="absolute bottom-1 right-1 leading-none flex flex-col items-center rotate-180 text-[10px]">
        <span>{rankLabel(card.rank)}</span>
        <span>{card.suit}</span>
      </div>
      {/* Centre rank + suit */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl leading-none">{rankLabel(card.rank)}</div>
        <div className="text-xl mt-0.5">{card.suit}</div>
      </div>
    </motion.div>
  );
}
