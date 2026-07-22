import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import { CASE_POOLS, type CaseItem, type CaseRisk, play } from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'opening' | 'reveal';

const REEL_LENGTH = 50; // visible carousel cells in the spin animation
const ITEM_WIDTH = 80; // px (incl. gap)

export function CasesGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [risk, setRisk] = useState<CaseRisk>('medium');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<CaseItem | null>(null);
  const [reel, setReel] = useState<CaseItem[]>([]);
  const [busy, setBusy] = useState(false);
  /** Rare-reveal flash overlay — fires when the opened item is
   *  rare / legendary / mythic. Real CS:GO-style cases have a
   *  dramatic golden beam reveal for high-tier drops; this is the
   *  emulator equivalent. Auto-clears after ~2.4s. */
  const [rareFlash, setRareFlash] = useState<CaseItem | null>(null);
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
    const r = play(rng, bet, risk);
    const activePool = CASE_POOLS[risk];
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
        const filler = activePool[rng.nextInt(activePool.length)]!;
        strip.push(filler);
      }
    }
    setReel(strip);
    spinKey.current += 1;
    // Ratcheting tick SFX matching the carousel's deceleration. Real
    // CS:GO / Stake case-opening has a distinctive "tick tick … tick …
    // … tick" sound as each tile slides past the indicator, slowing
    // toward the reveal. Without it the visual feels mute. Schedule
    // is sampled from the ease curve [0.15, 0.55, 0.2, 1] so ticks
    // pile up at the start and space out toward the end.
    const tickAt = [
      80, 165, 245, 325, 410, 495, 590, 690, 800, 920,   // dense early
      1050, 1190, 1340, 1500, 1670, 1850, 2040,           // mid-spacing
      2230, 2420, 2610, 2790, 2950, 3060,                 // anticipation
    ];
    const tickTimers: number[] = [];
    for (const t of tickAt) {
      tickTimers.push(window.setTimeout(() => sound.play('tick'), t));
    }
    // After scroll animation finishes (~3.0s), reveal result + payout.
    setTimeout(() => {
      tickTimers.forEach((id) => clearTimeout(id));
    }, 3100);
    setTimeout(() => {
      setResult(r.item);
      setPhase('reveal');
      // Rare-tier flash: any item at 'rare' rarity or higher triggers
      // a dramatic overlay, matching real CS:GO case-opening reveals.
      // Cleared automatically after 2400ms.
      if (r.item.rarity === 'rare' || r.item.rarity === 'legendary' || r.item.rarity === 'mythic') {
        setRareFlash(r.item);
        window.setTimeout(() => setRareFlash(null), 2400);
      }
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
  }, [busy, balance, bet, risk, fairness, sound, history, session]);

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
    () => CASE_POOLS[risk].map((i) => ({ ...i, pct: (i.weight / 1_000_000) * 100 })),
    [risk],
  );

  return (
    <OriginalPageLayout title="Cases">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">
              Open a case · weighted prizes
            </div>
          )}
          {phase === 'opening' && (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">Opening…</div>
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
        <div className="rounded-lg bg-stake-card border border-stake-border p-3 overflow-hidden relative">
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
                {CASE_POOLS[risk].slice(0, 5).map((item, idx) => (
                  <CaseTile key={idx} item={item} dim />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prize table — what you can get */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-2 px-1">Prize Pool</div>
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
                <div className="text-[8px] font-mono text-stake-muted tabular-nums">
                  {i.pct < 1 ? i.pct.toFixed(1) : i.pct.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bet + open */}
        {phase !== 'opening' ? (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
            <div className="grid grid-cols-4 gap-1.5">
              {(['easy', 'medium', 'hard', 'expert'] as CaseRisk[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={busy}
                  onClick={() => setRisk(value)}
                  className={`rounded-md py-2 text-[10px] font-bold uppercase tracking-wide transition ${risk === value ? 'bg-stake-green text-stake-bg' : 'bg-stake-input border border-stake-border text-stake-muted'}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <button
              onClick={phase === 'reveal' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Open Again' : `Open Case · ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-stake-card border border-stake-border p-4 text-center text-xs text-stake-muted">
            Unlocking…
          </div>
        )}
      </div>
      {/* Rare-reveal overlay — fires for rare / legendary / mythic
          items. Tints the screen in the item's colour with a vertical
          golden beam behind the item, then dismisses after 2.4s. */}
      <AnimatePresence>
        {rareFlash && (
          <motion.button
            type="button"
            onClick={() => setRareFlash(null)}
            className="fixed inset-0 z-[180] flex flex-col items-center justify-center pointer-events-auto"
            style={{
              background: `radial-gradient(ellipse at center, ${rareFlash.glow} 0%, rgba(0,0,0,.9) 70%)`,
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            {/* Vertical light beam — animates expanding from a thin
                line to a wide glow shaft behind the item. */}
            <motion.div
              className="absolute"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: [0, 0.9, 0.6] }}
              transition={{ duration: 0.7, times: [0, 0.4, 1] }}
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                height: '100vh',
                background: `linear-gradient(180deg, transparent 0%, ${rareFlash.color}cc 40%, ${rareFlash.color}cc 60%, transparent 100%)`,
                filter: `blur(40px)`,
              }}
            />
            <motion.div
              className="text-[10px] uppercase tracking-[0.4em] mb-2 z-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ color: rareFlash.color }}
            >
              {rareFlash.rarity}
            </motion.div>
            <motion.div
              className="text-8xl z-10"
              initial={{ scale: 0.3, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              style={{
                filter: `drop-shadow(0 0 32px ${rareFlash.color}) drop-shadow(0 0 64px ${rareFlash.glow})`,
              }}
            >
              {rareFlash.emoji}
            </motion.div>
            <motion.div
              className="font-display font-extrabold mt-2 z-10"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 220, damping: 16 }}
              style={{
                fontSize: 'clamp(28px, 8vw, 48px)',
                color: rareFlash.color,
                textShadow: `0 0 24px ${rareFlash.glow}, 0 4px 8px rgba(0,0,0,.7)`,
              }}
            >
              {rareFlash.label}
            </motion.div>
            <motion.div
              className="font-mono font-bold text-2xl mt-1 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              style={{
                color: '#fff',
                textShadow: `0 0 18px ${rareFlash.glow}`,
              }}
            >
              {fmtMultiplier(rareFlash.multiplier)}
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
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
