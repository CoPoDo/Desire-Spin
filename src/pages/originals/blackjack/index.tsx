import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { useInteractiveRound, useRoundState } from '../_shared/useInteractiveRound';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type Card,
  type Hand,
  type RoundState,
  canSplit,
  dealRound,
  double,
  handValue,
  hit,
  rankLabel,
  split,
  splitCost,
  stand,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

export function BlackjackGame() {
  const { balance, sound } = useGame();
  const [bet, setBet] = usePersistedBet('blackjack', 1);
  const [round, setRound, roundRef] = useRoundState<RoundState | null>(null);
  const [busy, setBusy, busyRef] = useRoundState(false);
  const lifecycle = useInteractiveRound('Blackjack');
  const { begin, addStake, settle, delay, wager, onLeave, error } = lifecycle;
  const done = round?.phase === 'done';

  // Leaving the table stands every unfinished hand, including split hands.
  onLeave.current = (updateView = false) => {
    let current = roundRef.current;
    const rng = wager.current?.rng;
    if (!current || !rng) return 0;
    while (current.phase === 'player') current = stand(rng, current);
    if (updateView) setRound(current);
    return current.payout;
  };

  const finish = useCallback((r: RoundState) => {
    setRound(r);
    if (r.phase === 'done' && settle(r.payout)) {
      const totalBet = r.hands.reduce((sum, hand) => sum + hand.bet, 0);
      const profit = r.payout - totalBet;
      sound.play(r.outcome === 'player-blackjack' ? 'big-win' : profit > 0 ? 'win' : profit === 0 ? 'click' : 'drop');
      if (r.outcome === 'player-blackjack') fireConfetti({ count: 100 });
    }
    delay(() => setBusy(false), r.phase === 'done' ? 550 : 220);
  }, [setRound, settle, sound, delay, setBusy]);

  const startHand = useCallback(() => {
    if (busyRef.current || (roundRef.current && roundRef.current.phase !== 'done')) return;
    const entry = begin(bet);
    if (!entry) return;
    setBusy(true);
    sound.play('click');
    finish(dealRound(entry.rng, entry.bet));
  }, [begin, bet, busyRef, roundRef, setBusy, sound, finish]);

  const act = useCallback((action: 'hit' | 'stand' | 'double' | 'split') => {
    const current = roundRef.current;
    const entry = wager.current;
    if (!current || current.phase !== 'player' || busyRef.current || !entry || entry.settled) return;
    const hand = current.hands[current.activeIdx];
    if (!hand || hand.done) return;
    if (action === 'double' && (hand.cards.length !== 2 || !addStake(hand.bet))) return;
    if (action === 'split' && (!canSplit(current) || !addStake(splitCost(current)))) return;
    setBusy(true);
    sound.play('click');
    const move = { hit, stand, double, split }[action];
    finish(move(entry.rng, current));
  }, [roundRef, wager, busyRef, addStake, setBusy, sound, finish]);

  const onHit = useCallback(() => act('hit'), [act]);
  const onStand = useCallback(() => act('stand'), [act]);
  const onDouble = useCallback(() => act('double'), [act]);
  const onSplit = useCallback(() => act('split'), [act]);
  const reset = useCallback(() => {
    if (!busyRef.current && roundRef.current?.phase === 'done') setRound(null);
  }, [busyRef, roundRef, setRound]);

  // Keyboard shortcuts — desktop blackjack convention:
  //   H → Hit       S → Stand
  //   D → Double    P → Split
  //   Space → Deal / Deal Again
  useHotkey('h', () => onHit(), true);
  useHotkey('H', () => onHit(), true);
  useHotkey('s', () => onStand(), true);
  useHotkey('S', () => onStand(), true);
  useHotkey('d', () => onDouble(), true);
  useHotkey('D', () => onDouble(), true);
  useHotkey('p', () => onSplit(), true);
  useHotkey('P', () => onSplit(), true);
  useHotkey(' ', () => {
    if (!round || done) {
      if (done) reset();
      startHand();
    }
  }, true);

  // Show only the dealer's first card while player is still acting
  const dealerVisible = round
    ? round.phase === 'player'
      ? [round.dealer[0]!]
      : round.dealer
    : [];
  const dealerVal = round && round.phase !== 'player' ? handValue(round.dealer) : null;

  // Convenience accessors for the active hand
  const activeHand = round?.hands[round.activeIdx];
  const splitAvailable = round ? canSplit(round) && balance.balance >= splitCost(round) : false;
  const doubleAvailable = round && round.phase === 'player' && activeHand && activeHand.cards.length === 2 && !activeHand.done && balance.balance >= activeHand.bet;
  const totalBet = round ? round.hands.reduce((s, h) => s + h.bet, 0) : 0;
  const totalProfit = round?.phase === 'done' ? round.payout - totalBet : 0;

  return (
    <OriginalPageLayout title="Blackjack">
      <div className="flex flex-col p-4 gap-3 max-w-md mx-auto w-full">
        {error && <p role="alert" className="text-stake-red text-sm text-center">{error}</p>}
        {/* Dealer */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-stake-muted">Dealer</span>
            {dealerVal && (
              <span className="font-mono font-bold text-base tabular-nums text-stake-text">
                {dealerVal.value}{dealerVal.soft ? ' (soft)' : ''}{dealerVal.bust ? ' bust' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2 justify-center min-h-[100px]">
            {dealerVisible.map((c, i) => (
              <CardView key={i} card={c} delay={i === 0 ? 0 : (i - 1) * 450 + 50} />
            ))}
            {round && round.phase === 'player' && (
              <CardView hidden delay={100} />
            )}
            {!round && (
              <div className="text-[11px] text-stake-muted self-center">Place a bet to deal</div>
            )}
          </div>
        </div>

        {/* Player hands — one panel per hand (1 normally, 2-4 when split).
            Active hand gets a glowing border so the player knows where
            their next action applies. */}
        {round && (
          <div className={`grid gap-2 ${round.hands.length === 1 ? 'grid-cols-1' : round.hands.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {round.hands.map((h, i) => (
              <PlayerHandPanel
                key={i}
                hand={h}
                isActive={round.phase === 'player' && round.activeIdx === i}
                isMultiHand={round.hands.length > 1}
                handIdx={i + 1}
                doneSummary={round.phase === 'done' ? h.outcome : null}
              />
            ))}
          </div>
        )}

        {/* Outcome */}
        {done && round && (
          <div className="rounded-xl bg-stake-card border border-stake-border p-3 text-center">
            <div
              className={`font-mono font-bold text-lg ${
                totalProfit > 0 ? 'text-stake-green' : totalProfit === 0 ? 'text-stake-muted' : 'text-stake-red'
              }`}
            >
              {round.outcome === 'player-blackjack'
                ? `BLACKJACK · +${fmtCurrency(totalProfit)}`
                : totalProfit > 0
                  ? `Win · +${fmtCurrency(totalProfit)}`
                  : totalProfit === 0
                    ? `Push · ${fmtCurrency(totalBet)} returned`
                    : `Loss · ${fmtCurrency(totalProfit)}`}
            </div>
            {round.hands.length > 1 && (
              <div className="text-[10px] text-stake-muted mt-1">
                {round.hands.map((h, i) =>
                  `Hand ${i + 1}: ${outcomeText(h.outcome)}`
                ).join(' · ')}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        {!round || done ? (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <button
              onClick={done ? () => { reset(); startHand(); } : startHand}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {done ? 'Deal Again' : `Deal · ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={onHit}
              disabled={busy}
              className="py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.99]"
            >
              Hit
            </button>
            <button
              onClick={onStand}
              disabled={busy}
              className="py-3.5 rounded-xl bg-stake-red text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.99]"
            >
              Stand
            </button>
            <button
              onClick={onDouble}
              disabled={busy || !doubleAvailable}
              className="py-3.5 rounded-xl bg-accent-gold text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.99]"
              title={doubleAvailable ? `Double bet to ${fmtCurrency(activeHand!.bet * 2)} and draw one card` : 'Double unavailable on this hand'}
            >
              Double
            </button>
            <button
              onClick={onSplit}
              disabled={busy || !splitAvailable}
              className="py-3.5 rounded-xl bg-accent-violet text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.99]"
              title={splitAvailable ? `Split pair into 2 hands (costs ${fmtCurrency(round?.initialBet ?? bet)})` : 'Split unavailable — needs a matching-rank pair on the current hand'}
            >
              Split
            </button>
          </div>
        )}
        <p className="text-[11px] text-stake-muted text-center">Leaving the table automatically stands and settles every unfinished hand.</p>
      </div>
    </OriginalPageLayout>
  );
}

function outcomeText(outcome: Hand['outcome']): string {
  switch (outcome) {
    case 'player-blackjack': return 'Blackjack';
    case 'player-win': return 'Win';
    case 'push': return 'Push';
    case 'player-bust': return 'Bust';
    case 'dealer-win': return 'Loss';
    default: return '—';
  }
}

function PlayerHandPanel({
  hand,
  isActive,
  isMultiHand,
  handIdx,
  doneSummary,
}: {
  hand: Hand;
  isActive: boolean;
  isMultiHand: boolean;
  handIdx: number;
  doneSummary: Hand['outcome'] | null;
}) {
  const v = handValue(hand.cards);
  const outcomeColor = doneSummary === 'player-blackjack' || doneSummary === 'player-win'
    ? '#00e701'
    : doneSummary === 'push'
      ? '#9aa3b2'
      : doneSummary
        ? '#ff5560'
        : '#9aa3b2';
  return (
    <motion.div
      animate={isActive ? { scale: 1.0 } : { scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg bg-stake-card border p-3 transition-colors"
      style={{
        borderColor: isActive
          ? 'rgba(0,231,1,.65)'
          : doneSummary
            ? `${outcomeColor}55`
            : '#2a3142',
        boxShadow: isActive
          ? '0 0 14px rgba(0,231,1,.35)'
          : doneSummary
            ? `0 0 10px ${outcomeColor}33`
            : 'inset 0 1px 0 rgba(255,255,255,.04)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-stake-muted">
          {isMultiHand ? `Hand ${handIdx}` : 'You'}
          {hand.doubled && ' · 2×'}
          {hand.fromSplit && ' · split'}
        </span>
        <span className="font-mono font-bold text-base tabular-nums" style={{ color: doneSummary ? outcomeColor : '#e5e9f0' }}>
          {v.value}{v.soft ? ' (s)' : ''}{v.bust ? ' bust' : ''}
          {v.blackjack && !hand.fromSplit ? ' · BJ' : ''}
        </span>
      </div>
      <div className={`flex gap-1.5 justify-center ${isMultiHand ? 'min-h-[70px]' : 'min-h-[100px]'}`}>
        {hand.cards.map((c, i) => (
          <CardView key={i} card={c} delay={i * 100} compact={isMultiHand} />
        ))}
      </div>
    </motion.div>
  );
}

function CardView({ card, hidden, delay = 0, compact = false }: { card?: Card; hidden?: boolean; delay?: number; compact?: boolean }) {
  const wCls = compact ? 'w-12 h-16' : 'w-16 h-24';
  const cornerTxt = compact ? 'text-[8px]' : 'text-[10px]';
  const centreRank = compact ? 'text-xl' : 'text-2xl';
  const centreSuit = compact ? 'text-base' : 'text-xl';
  if (hidden) {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0, rotateY: 90 }}
        animate={{ y: 0, opacity: 1, rotateY: 0 }}
        transition={{ delay: delay / 1000, type: 'spring', stiffness: 240, damping: 20 }}
        className={`relative rounded-xl flex items-center justify-center ${wCls}`}
        style={{
          background:
            'repeating-linear-gradient(45deg, #2a3142, #2a3142 4px, #1a1f29 4px, #1a1f29 8px)',
          border: '2px solid #c8932e',
          boxShadow: '0 8px 18px rgba(0,0,0,.5)',
        }}
      >
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
      className={`relative rounded-xl select-none font-bold ${wCls}`}
      style={{
        background: 'linear-gradient(180deg, #f5f0e4, #e8dfc9)',
        border: '2px solid #c8932e',
        boxShadow: '0 8px 18px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6)',
        color: red ? '#c8102e' : '#1a0f00',
      }}
    >
      <div className={`absolute top-1 left-1 leading-none flex flex-col items-center ${cornerTxt}`}>
        <span>{rankLabel(card.rank)}</span>
        <span>{card.suit}</span>
      </div>
      <div className={`absolute bottom-1 right-1 leading-none flex flex-col items-center rotate-180 ${cornerTxt}`}>
        <span>{rankLabel(card.rank)}</span>
        <span>{card.suit}</span>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`${centreRank} leading-none`}>{rankLabel(card.rank)}</div>
        <div className={`${centreSuit} mt-0.5`}>{card.suit}</div>
      </div>
    </motion.div>
  );
}
