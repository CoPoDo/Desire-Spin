import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type BaccaratRound,
  type Card,
  type Side,
  payoutFor,
  play,
  rankLabel,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Bets = { player: number; banker: number; tie: number };

export function BaccaratGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [bets, setBets] = useState<Bets>({ player: 0, banker: 0, tie: 0 });
  const [round, setRound] = useState<BaccaratRound | null>(null);
  const [busy, setBusy] = useState(false);

  const totalBet = bets.player + bets.banker + bets.tie;

  const place = useCallback((side: Side) => {
    if (busy) return;
    sound.play('tick');
    setBets((b) => ({ ...b, [side]: +(b[side] + bet).toFixed(2) }));
  }, [busy, bet, sound]);

  const clear = useCallback(() => {
    if (busy) return;
    setBets({ player: 0, banker: 0, tie: 0 });
    setRound(null);
  }, [busy]);

  const deal = useCallback(() => {
    if (busy || totalBet === 0 || balance.balance < totalBet) return;
    setBusy(true);
    sound.play('click');
    balance.debit(totalBet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng);
    setRound(r);
    let totalPayout = 0;
    (['player', 'banker', 'tie'] as Side[]).forEach((s) => {
      if (bets[s] > 0) totalPayout += payoutFor(s, bets[s], r.winner);
    });
    // Per-card deal SFX matching the staggered CardView entrance
    // (delay = i * 100ms in HandPanel). Both hands deal in parallel,
    // so the max card index drives total deal duration. 2-3 cards
    // per side → 600ms max.
    const totalCards = Math.max(r.player.length, r.banker.length);
    for (let i = 0; i < totalCards; i++) {
      window.setTimeout(() => sound.play('drop'), 80 + i * 180);
    }
    const settleAt = 80 + totalCards * 180 + 120;
    if (totalPayout > 0) {
      balance.credit(totalPayout);
      window.setTimeout(() => {
        sound.play(totalPayout >= totalBet * 5 ? 'mega-win' : totalPayout > totalBet ? 'big-win' : 'win');
        if (totalPayout > totalBet) {
          fireConfetti({
            count: totalPayout >= totalBet * 5 ? 130 : 70,
          });
        }
      }, settleAt);
    } else {
      window.setTimeout(() => sound.play('drop'), settleAt);
    }
    history.record({
      game: 'Baccarat',
      bet: totalBet,
      payout: totalPayout,
      multiplier: totalPayout / Math.max(totalBet, 0.01),
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(totalBet, totalPayout, false);
    setTimeout(() => setBusy(false), 800);
  }, [busy, totalBet, balance, bets, fairness, sound, history, session]);

  return (
    <OriginalPageLayout title="Baccarat">
      <div className="flex flex-col p-4 gap-3 max-w-md mx-auto w-full">
        {/* Hands */}
        <div className="grid grid-cols-2 gap-2">
          <HandPanel
            title="Player"
            cards={round?.player ?? []}
            total={round?.playerTotal}
            highlight={round?.winner === 'player'}
            tone="cyan"
          />
          <HandPanel
            title="Banker"
            cards={round?.banker ?? []}
            total={round?.bankerTotal}
            highlight={round?.winner === 'banker'}
            tone="hot"
          />
        </div>

        {/* Outcome */}
        {round && (
          <div className="rounded-xl bg-bg-card border border-edge p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Result</div>
            <div
              className={`font-mono font-bold text-base mt-0.5 ${
                round.winner === 'tie' ? 'text-accent-gold' :
                round.winner === 'player' ? 'text-accent-cyan' : 'text-accent-hot'
              }`}
            >
              {round.winner === 'tie' ? 'Tie' : `${round.winner === 'player' ? 'Player' : 'Banker'} wins · ${round.playerTotal}-${round.bankerTotal}`}
            </div>
          </div>
        )}

        {/* Betting buttons */}
        <div className="grid grid-cols-3 gap-2">
          <BetButton label="Player" mult="2×" tone="cyan" amount={bets.player} onClick={() => place('player')} />
          <BetButton label="Tie" mult="9×" tone="gold" amount={bets.tie} onClick={() => place('tie')} />
          <BetButton label="Banker" mult="1.95×" tone="hot" amount={bets.banker} onClick={() => place('banker')} />
        </div>

        {/* Bet panel */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-mute uppercase tracking-wider">Total Stake</span>
            <span className="font-mono font-bold tabular-nums">{fmtCurrency(totalBet)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clear}
              disabled={busy || totalBet === 0}
              className="flex-1 py-2.5 rounded-xl bg-bg-elev border border-edge text-ink-dim font-bold text-xs uppercase tracking-wider disabled:opacity-50"
            >
              Clear
            </button>
            <button
              onClick={deal}
              disabled={busy || totalBet === 0 || balance.balance < totalBet}
              className="flex-[2] py-2.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy
                ? 'Dealing…'
                : totalBet === 0
                  ? 'Place a bet first'
                  : balance.balance < totalBet
                    ? 'Insufficient balance'
                    : `Deal · ${fmtCurrency(totalBet)}`}
            </button>
          </div>
        </div>
      </div>
    </OriginalPageLayout>
  );
}

function HandPanel({
  title,
  cards,
  total,
  highlight,
  tone,
}: {
  title: string;
  cards: Card[];
  total?: number;
  highlight?: boolean;
  tone: 'cyan' | 'hot';
}) {
  return (
    <div
      className="rounded-2xl bg-bg-card border p-3 transition"
      style={{
        borderColor: highlight ? (tone === 'cyan' ? '#22d3ee' : '#ff3d8b') : '#2a3142',
        boxShadow: highlight
          ? `0 0 18px ${tone === 'cyan' ? 'rgba(34,211,238,.4)' : 'rgba(255,61,139,.4)'}`
          : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-ink-mute">{title}</span>
        {total !== undefined && (
          <span className="font-mono font-bold text-sm text-ink tabular-nums">{total}</span>
        )}
      </div>
      <div className="flex gap-1 justify-center min-h-[80px]">
        <AnimatePresence>
          {cards.map((c, i) => <CardView key={i} card={c} delay={i * 100} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BetButton({
  label,
  mult,
  tone,
  amount,
  onClick,
}: {
  label: string;
  mult: string;
  tone: 'cyan' | 'hot' | 'gold';
  amount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-xl py-3 transition active:scale-95"
      style={{
        background:
          tone === 'cyan' ? 'linear-gradient(180deg, #1a4a6a, #0a2530)' :
          tone === 'gold' ? 'linear-gradient(180deg, #c89832, #6a4410)' :
          'linear-gradient(180deg, #6a1a3a, #3a0810)',
        border: '1px solid rgba(255,255,255,.15)',
      }}
    >
      <div
        className="font-mono font-bold uppercase tracking-wider text-sm"
        style={{
          color: tone === 'cyan' ? '#a8e1ff' : tone === 'gold' ? '#fff5c4' : '#ffd1d6',
        }}
      >
        {label}
      </div>
      <div
        className="font-mono font-semibold text-[10px] mt-0.5"
        style={{ color: 'rgba(255,255,255,.6)' }}
      >
        {mult}
      </div>
      {amount > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full bg-accent-gold text-bg text-[9px] font-mono font-bold flex items-center justify-center"
          style={{ boxShadow: '0 0 6px rgba(255,209,102,.7)' }}
        >
          ${amount}
        </span>
      )}
    </button>
  );
}

function CardView({ card, delay = 0 }: { card: Card; delay?: number }) {
  const red = card.suit === '♥' || card.suit === '♦';
  return (
    <motion.div
      initial={{ y: -20, opacity: 0, rotateY: 180 }}
      animate={{ y: 0, opacity: 1, rotateY: 0 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 240, damping: 20 }}
      className="relative w-14 h-20 rounded-lg font-bold text-sm"
      style={{
        background: 'linear-gradient(180deg, #f5f0e4, #e8dfc9)',
        border: '2px solid #c8932e',
        boxShadow: '0 4px 10px rgba(0,0,0,.45)',
        color: red ? '#c8102e' : '#1a0f00',
      }}
    >
      {/* Corner pips for proper playing-card look */}
      <div className="absolute top-0.5 left-1 leading-none flex flex-col items-center text-[9px]">
        <span>{rankLabel(card.rank)}</span>
        <span>{card.suit}</span>
      </div>
      <div className="absolute bottom-0.5 right-1 leading-none flex flex-col items-center rotate-180 text-[9px]">
        <span>{rankLabel(card.rank)}</span>
        <span>{card.suit}</span>
      </div>
      {/* Centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div>{rankLabel(card.rank)}</div>
        <div className="mt-0.5">{card.suit}</div>
      </div>
    </motion.div>
  );
}
