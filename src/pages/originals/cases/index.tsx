import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import { CASE_ITEMS, type CaseItem, play } from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'opening' | 'reveal';

const REEL_LENGTH = 50; // visible carousel cells in the spin animation
const ITEM_WIDTH = 80; // px (incl. gap)

export function CasesGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<CaseItem | null>(null);
  const [reel, setReel] = useState<CaseItem[]>([]);
  const [busy, setBusy] = useState(false);
  // We keep a counter so each new spin re-mounts the carousel and replays
  // the keyframe animation cleanly.
  const spinKey = useRef(0);

  const start = useCallback(() => {
    if (busy) return;
    if (balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    setPhase('opening');
    setResult(null);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng, bet);
    // Build the carousel: a long strip of random items, with the WINNING
    // item placed at the deterministic landing index (REEL_LENGTH - 6),
    // so the ticker decelerates and stops on it.
    const landingIdx = REEL_LENGTH - 6;
    const strip: CaseItem[] = [];
    for (let i = 0; i < REEL_LENGTH; i++) {
      if (i === landingIdx) {
        strip.push(r.item);
      } else {
        // Filler items — mostly low-rarity to feel realistic.
        const filler = CASE_ITEMS[rng.nextInt(CASE_ITEMS.length)]!;
        strip.push(filler);
      }
    }
    setReel(strip);
    spinKey.current += 1;
    // After scroll animation finishes (~3.0s), reveal result + payout.
    setTimeout(() => {
      setResult(r.item);
      setPhase('reveal');
      if (r.payout > bet) {
        balance.credit(r.payout);
        sound.play(r.multiplier >= 50 ? 'mega-win' : r.multiplier >= 3 ? 'big-win' : 'win');
        // Chip-shower confetti on high-value crate opens. Tinted with
        // the prize tier's colour so opening a "Legendary" crate fires
        // gold chips while a "Rare" crate fires the rare-tier blue.
        if (r.multiplier >= 3) {
          fireConfetti({
            count: r.multiplier >= 50 ? 130 : 70,
            colors: [r.item.color, '#fff5dc', '#ffffff'],
          });
        }
      } else if (r.payout > 0) {
        balance.credit(r.payout);
        sound.play('drop');
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Cases',
        bet,
        payout: r.payout,
        multiplier: r.multiplier,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(bet, r.payout, false);
      setBusy(false);
    }, 3100);
  }, [busy, balance, bet, fairness, sound, history, session]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
  }, []);

  const profit = result ? +(bet * result.multiplier - bet).toFixed(2) : 0;
  // Landing index → x offset so the indicator (centered in the carousel
  // viewport) lines up with the winning cell.
  const landingX = (REEL_LENGTH - 6) * ITEM_WIDTH;

  // Probability table for the info row — derived once.
  const prizeTable = useMemo(
    () => CASE_ITEMS.map((i) => ({ ...i, pct: (i.weight / 1000) * 100 })),
    [],
  );

  return (
    <OriginalPageLayout title="Cases">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              Open a case · weighted prizes
            </div>
          )}
          {phase === 'opening' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-dim">Opening…</div>
          )}
          {phase === 'reveal' && result && (
            <div
              className="font-mono font-bold text-lg"
              style={{ color: result.multiplier > 0 ? result.color : '#9aa3b2' }}
            >
              {result.label} · {fmtMultiplier(result.multiplier)}
              {result.multiplier > 0 ? ` · +${fmtCurrency(profit)}` : ` · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* Carousel */}
        <div className="rounded-2xl bg-bg-card border border-edge p-3 overflow-hidden relative">
          <div
            className="relative h-[88px] overflow-hidden mx-auto"
            style={{ width: '100%' }}
          >
            {/* Center indicator */}
            <div
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[72px] rounded-lg pointer-events-none z-10"
              style={{
                border: '2px solid rgba(255,209,102,.85)',
                boxShadow: '0 0 14px rgba(255,209,102,.5)',
              }}
            />
            {/* Edge fades */}
            <div className="absolute inset-y-0 left-0 w-12 z-10 pointer-events-none"
                 style={{ background: 'linear-gradient(90deg, var(--bg-card, #15191f), transparent)' }} />
            <div className="absolute inset-y-0 right-0 w-12 z-10 pointer-events-none"
                 style={{ background: 'linear-gradient(-90deg, var(--bg-card, #15191f), transparent)' }} />

            {/* Strip */}
            {reel.length > 0 ? (
              <motion.div
                key={spinKey.current}
                className="flex gap-2 items-center absolute top-0 bottom-0"
                style={{ left: 'calc(50% - 36px)' }}
                initial={{ x: 0 }}
                animate={{ x: -landingX }}
                transition={{ duration: 3.0, ease: [0.15, 0.55, 0.2, 1] }}
              >
                {reel.map((item, idx) => (
                  <CaseTile key={idx} item={item} />
                ))}
              </motion.div>
            ) : (
              <div className="flex gap-2 items-center justify-center h-full">
                {CASE_ITEMS.slice(0, 5).map((item, idx) => (
                  <CaseTile key={idx} item={item} dim />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prize table — what you can get */}
        <div className="rounded-xl bg-bg-card border border-edge p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-2 px-1">Prize Pool</div>
          <div className="grid grid-cols-7 gap-1">
            {prizeTable.map((i) => (
              <div key={i.id} className="text-center">
                <div
                  className="text-2xl mb-0.5"
                  style={{ filter: `drop-shadow(0 0 6px ${i.glow})` }}
                >
                  {i.emoji}
                </div>
                <div className="text-[9px] font-mono font-bold tabular-nums" style={{ color: i.color }}>
                  {fmtMultiplier(i.multiplier)}
                </div>
                <div className="text-[8px] font-mono text-ink-mute tabular-nums">
                  {i.pct < 1 ? i.pct.toFixed(1) : i.pct.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bet + open */}
        {phase !== 'opening' ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <button
              onClick={phase === 'reveal' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Open Again' : `Open Case · ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center text-xs text-ink-dim">
            Unlocking…
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}

function CaseTile({ item, dim = false }: { item: CaseItem; dim?: boolean }) {
  return (
    <div
      className="flex-shrink-0 rounded-lg flex flex-col items-center justify-center select-none"
      style={{
        width: 72,
        height: 72,
        background: `linear-gradient(180deg, ${item.color}22, #0e1218)`,
        border: `1.5px solid ${item.color}55`,
        boxShadow: dim ? undefined : `inset 0 1px 0 rgba(255,255,255,.06)`,
        opacity: dim ? 0.5 : 1,
      }}
    >
      <span
        className="text-3xl"
        style={{ filter: `drop-shadow(0 0 8px ${item.glow})` }}
      >
        {item.emoji}
      </span>
      <span
        className="text-[9px] font-mono font-bold tabular-nums leading-none"
        style={{ color: item.color }}
      >
        {fmtMultiplier(item.multiplier)}
      </span>
    </div>
  );
}
