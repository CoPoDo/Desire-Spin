import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createRng, type Rng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { useGame } from '../../../game-context';
import {
  JACKPOTS,
  JACKPOT_THRESHOLD,
  type FourthReelOutcome,
  type JackpotTier,
  type RespinSymbol,
  resolveRespin,
  rollRespin,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';
import { PinataSvg } from './symbols';
import { flyCoin } from './coinFly';

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/** Big Juan Respins feature — full clone of the spec §7 mechanics.
 *
 *  Layout:
 *
 *    ┌───┬───┬───┐   ┌─────┐
 *    │ 0 │ 1 │ 2 │   │     │
 *    ├───┼───┼───┤   │ 4th │
 *    │ 3 │BAG│ 4 │   │ R   │   ← single tall cell, 3 outcomes
 *    ├───┼───┼───┤   │     │
 *    │ 5 │ 6 │ 7 │   └─────┘
 *    └───┴───┴───┘
 *
 *  Each respin: 8 outer cells + 4th-reel cell roll. Resolution depends on
 *  the 4th reel:
 *    BLANK → nothing collects; respin -= 1
 *    WIN   → coins + bag pay out, jackpot meters tick, +extra-spin tokens
 *            add to respin counter; respin -= 1
 *    BOOST → coins added permanently to bag value; jackpot/extra DO NOT
 *            collect; respin -= 1
 *
 *  Per spec §7.3 the bag starts at 1× bet. Jackpot meters fill at 3/4/5/5.
 *  Cap = 2,600× bet hits → end immediately.
 */

export type BonusRoundProps = {
  bet: number;
  scatterCount: number;
  /** Pre-rolled override: if set, the bonus's first roll uses this scatter
   *  count to seed the initial respins. Used by Bonus Buy. */
  initialRespinsOverride?: number;
  seeds: { serverSeed: string; clientSeed: string; nonce: number };
  onClose: (totalPayoutMultiplier: number) => void;
};

const RESPIN_AWARD: Record<number, number> = { 3: 10, 4: 12, 5: 15 };

export function BigJuanBonusRound({
  bet,
  scatterCount,
  initialRespinsOverride,
  seeds,
  onClose,
}: BonusRoundProps) {
  const { sound } = useGame();

  // Single shared RNG — entire bonus reproducible from a single nonce.
  const rngRef = useRef<Rng | null>(null);
  if (!rngRef.current) {
    rngRef.current = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
  }

  // ── Round state ─────────────────────────────────────────
  const initialRespins = initialRespinsOverride ?? RESPIN_AWARD[scatterCount] ?? 10;
  const [respinsLeft, setRespinsLeft] = useState(initialRespins);
  const [bagValue, setBagValue] = useState(1); // Spec §7.3: starts at 1× bet
  const [meters, setMeters] = useState<Record<JackpotTier, number>>({
    mini: 0, minor: 0, major: 0, grand: 0,
  });
  const [cumulativeMult, setCumulativeMult] = useState(0);
  const [outer, setOuter] = useState<RespinSymbol[]>(() => Array(8).fill({ kind: 'blank' as const }));
  const [fourth, setFourth] = useState<FourthReelOutcome | null>(null);
  const [phase, setPhase] = useState<'intro' | 'spinning' | 'fourth' | 'resolving' | 'idle' | 'jackpot' | 'finished'>('intro');
  const [jackpotFiring, setJackpotFiring] = useState<{ tier: JackpotTier; amount: number } | null>(null);
  const [lastRespinKind, setLastRespinKind] = useState<FourthReelOutcome | null>(null);
  const [coinsLanded, setCoinsLanded] = useState<Set<number>>(new Set());
  // Note: extra-spin token animations are inlined via coin-stream visuals
  // rather than a separate counter overlay (kept simple per spec §10b.8).
  /** Cap-hit flag — when the running total or pending payout would exceed
   *  2,600× bet. End immediately per spec §7.7. */
  const [cappedAtMax, setCappedAtMax] = useState(false);

  const totalPayoutMult = cumulativeMult;
  const totalPayout = bet * totalPayoutMult;

  // ── Intro: short "GET READY" beat before the first respin ──────────
  useEffect(() => {
    if (phase !== 'intro') return;
    const t = setTimeout(() => setPhase('idle'), 800);
    return () => clearTimeout(t);
  }, [phase]);

  // ── End-of-feature confetti shower ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'finished') return;
    const tier = totalPayoutMult >= 1000 ? 'epic' : totalPayoutMult >= 100 ? 'big' : 'small';
    fireConfetti({
      count: tier === 'epic' ? 240 : tier === 'big' ? 150 : 80,
      colors: ['#ff5560', '#ffd166', '#1fff7a', '#5fb8ff', '#c042b8', '#ffae50', '#ffffff'],
    });
  }, [phase, totalPayoutMult]);

  // ── Auto-start each respin from idle ───────────────────────────────
  useEffect(() => {
    if (phase !== 'idle') return;
    if (respinsLeft <= 0 || cappedAtMax) {
      // End-of-feature — emit final fanfare then call onClose.
      setPhase('finished');
      sound.play(totalPayoutMult >= 100 ? 'mega-win' : 'big-win');
      const t = setTimeout(() => onClose(totalPayoutMult), 3200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => kickRespin(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, respinsLeft, cappedAtMax]);

  // ── Kick off a respin: roll, then animate outer cells, then 4th reel ──
  const kickRespin = useCallback(() => {
    setPhase('spinning');
    setLastRespinKind(null);
    setCoinsLanded(new Set());
    setFourth(null);
    sound.play('click');

    const rng = rngRef.current!;
    const sample = rollRespin(rng);

    // Outer cells reveal staggered (~80ms per cell). Real spec §10b.7
    // says ~0.6s for the 8 cells to land.
    sample.outer.forEach((sym, i) => {
      setTimeout(() => {
        setOuter((prev) => {
          const next = [...prev];
          next[i] = sym;
          return next;
        });
        if (sym.kind === 'coin' || sym.kind === 'extra' ||
            sym.kind === 'mini' || sym.kind === 'minor' ||
            sym.kind === 'major' || sym.kind === 'grand') {
          sound.play('drop');
        }
      }, 80 * (i + 1));
    });

    // 4th reel spins ~1.2s after the last outer cell.
    setTimeout(() => {
      setPhase('fourth');
      // 4th reel "spins" visually for ~1.2s before settling.
      setTimeout(() => {
        setFourth(sample.fourth);
        // Settle SFX based on outcome.
        if (sample.fourth === 'win') sound.play('big-win');
        else if (sample.fourth === 'boost') sound.play('coin');
        else sound.play('drop');
        // Resolve after a short settle. resolve() is async — fire-and-
        // forget since the phase state machine handles the next respin.
        setTimeout(() => { void resolve(sample); }, 480);
      }, 1200);
    }, 80 * 9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound]);

  // ── Resolve the respin against current state ─────────────────────────
  //
  //  Bible Part 8.9 describes the resolution beats in detail. We mirror
  //  them here:
  //
  //    WIN  → each coin element flies one-by-one to the WIN tally with
  //           a small stagger; the money bag also fires its value to
  //           the tally. Jackpot symbols pop to their meters.
  //    BOOST→ each coin streams into the centre money bag, then the
  //           bag pulses and its displayed value counts up.
  //    BLANK→ cells just fade out — no flying coins, no SFX besides
  //           the disappointment sting.
  //
  //  The resolve function became async to await the staggered fly
  //  animations. State updates that affect React layout still happen
  //  immediately after the animation phase so the next respin can
  //  start from a clean slate. */
  const resolve = useCallback(async (sample: { outer: RespinSymbol[]; fourth: FourthReelOutcome }) => {
    setPhase('resolving');
    const res = resolveRespin(sample, { bagValue, meters, cumulativeMult });
    setLastRespinKind(res.kind);
    const animSet = new Set<number>();
    sample.outer.forEach((s, i) => {
      if (s.kind !== 'blank') animSet.add(i);
    });
    setCoinsLanded(animSet);

    // ── WIN: fly coins to tally, jackpot symbols to meters ───────────
    if (res.kind === 'win') {
      const tallyEl = document.querySelector('[data-bj-tally]') as HTMLElement | null;
      const bagEl = document.querySelector('[data-bj-money-bag]') as HTMLElement | null;
      // Each coin element flies → tally with a small stagger.
      for (let i = 0; i < sample.outer.length; i++) {
        const s = sample.outer[i]!;
        const cellEl = document.querySelector(`[data-bj-outer-cell="${i}"]`) as HTMLElement | null;
        if (!cellEl || !tallyEl) continue;
        if (s.kind === 'coin') {
          flyCoin(cellEl, tallyEl, { glyph: '🪙', value: s.value, durationMs: 580 });
          sound.play('coin');
          await sleep(140);
        }
      }
      // Money bag fires its value to the tally.
      if (bagEl && tallyEl && res.bagPaid > 0) {
        flyCoin(bagEl, tallyEl, { glyph: '💰', value: res.bagPaid, durationMs: 600 });
        sound.play('coin');
        await sleep(280);
      }
      // Jackpot symbols pop to their meters with particles.
      for (let i = 0; i < sample.outer.length; i++) {
        const s = sample.outer[i]!;
        if (s.kind !== 'mini' && s.kind !== 'minor' && s.kind !== 'major' && s.kind !== 'grand') continue;
        const cellEl = document.querySelector(`[data-bj-outer-cell="${i}"]`) as HTMLElement | null;
        const meterEl = document.querySelector(`[data-bj-meter="${s.kind}"]`) as HTMLElement | null;
        if (cellEl && meterEl) {
          flyCoin(cellEl, meterEl, {
            glyph: s.kind === 'grand' ? '💎' : s.kind === 'major' ? '🔴' : s.kind === 'minor' ? '🟡' : '🔵',
            value: 0,
            durationMs: 480,
            endScale: 0.6,
            endRotate: 360,
          });
          sound.play('drop');
          await sleep(100);
        }
      }
    }

    // ── BOOST: stream coins into the money bag ───────────────────────
    if (res.kind === 'boost') {
      const bagEl = document.querySelector('[data-bj-money-bag]') as HTMLElement | null;
      for (let i = 0; i < sample.outer.length; i++) {
        const s = sample.outer[i]!;
        if (s.kind !== 'coin') continue;
        const cellEl = document.querySelector(`[data-bj-outer-cell="${i}"]`) as HTMLElement | null;
        if (cellEl && bagEl) {
          flyCoin(cellEl, bagEl, {
            glyph: '🪙',
            value: s.value,
            durationMs: 520,
            endScale: 0.3,
            endRotate: 180,
          });
          sound.play('coin');
          await sleep(120);
        }
      }
    }

    // Apply state changes after the fly animations have played.
    const applyDelay = res.kind === 'blank' ? 350 : res.jackpotHits.length > 0 ? 600 : 350;
    setTimeout(() => {
      setBagValue(res.newBagValue);
      setMeters(res.newMeters);
      setCumulativeMult((prev) => +(prev + res.paid).toFixed(4));
      setRespinsLeft((prev) => Math.max(0, prev - 1 + res.extraSpins));

      if (res.cappedAtMax) setCappedAtMax(true);

      if (res.jackpotHits.length > 0) {
        setPhase('jackpot');
        let i = 0;
        const playNext = () => {
          if (i >= res.jackpotHits.length) {
            setOuter((prev) => prev.map(() => ({ kind: 'blank' })));
            setPhase('idle');
            return;
          }
          const hit = res.jackpotHits[i]!;
          setJackpotFiring(hit);
          sound.play('mega-win');
          const dur = hit.tier === 'grand' ? 4500 : hit.tier === 'major' ? 2800 : hit.tier === 'minor' ? 2200 : 1800;
          setTimeout(() => {
            setJackpotFiring(null);
            i++;
            setTimeout(playNext, 300);
          }, dur);
        };
        setTimeout(playNext, 250);
      } else {
        setTimeout(() => {
          setOuter((prev) => prev.map(() => ({ kind: 'blank' })));
          setPhase('idle');
        }, 500);
      }
    }, applyDelay);
  }, [bagValue, meters, cumulativeMult, sound]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-start p-3 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background:
          'radial-gradient(80% 60% at 50% 38%, #c8102e 0%, #5a0810 50%, #14040a 90%, #02010a 100%)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Header: title + scatter trigger */}
      <div className="text-center pt-12 pb-2">
        <div
          className="font-display font-extrabold text-2xl mb-0.5"
          style={{
            background: 'linear-gradient(180deg, #ffd166 0%, #ff5560 80%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6)) drop-shadow(0 0 14px rgba(255,209,102,.55))',
          }}
        >
          RESPINS
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[#FFE0A8] flex items-center justify-center gap-1.5">
          <span className="inline-block w-3 h-3"><PinataSvg /></span>
          {scatterCount} scatter trigger
        </div>
      </div>

      {/* Main play area — jackpot meters | 3x3 grid | 4th reel */}
      <div className="flex items-center justify-center gap-2 flex-1 w-full max-w-md">
        {/* Left rail: 4 jackpot meters stacked. Each shows tier + payout
            + segment progress (filled / required). Per spec §9: floats
            on the left side of the feature screen. */}
        <div className="flex flex-col gap-1.5 w-[68px] flex-shrink-0">
          {(['mini', 'minor', 'major', 'grand'] as JackpotTier[]).map((tier) => (
            <JackpotMeter
              key={tier}
              tier={tier}
              filled={meters[tier]}
              threshold={JACKPOT_THRESHOLD[tier]}
              payoutMult={JACKPOTS[tier]}
            />
          ))}
        </div>

        {/* Centre: 3x3 grid with sticky bag, and 4th reel to the right. */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <BonusGrid
            outer={outer}
            bagValue={bagValue}
            phase={phase}
            coinsLanded={coinsLanded}
            lastRespinKind={lastRespinKind}
          />
          <FourthReelCell phase={phase} value={fourth} />
        </div>
      </div>

      {/* Stats bar — respins / total win / bag value */}
      <div className="flex items-center justify-center gap-2 w-full max-w-md mt-3 mb-1 px-3">
        <StatTile label="Respins" value={String(respinsLeft)} accent="#ffd166" />
        <StatTile label="Total Win" value={fmtCurrency(totalPayout)} accent="#1fff7a" wide tallyTarget />
        <StatTile label="Money Bag" value={`${bagValue.toFixed(2)}×`} accent="#ff8a40" />
      </div>

      {/* Current respin status hint */}
      <div className="text-[10px] uppercase tracking-widest text-[#FFE0A8]/70 h-4 mb-1">
        {phase === 'intro' && 'Get ready…'}
        {phase === 'spinning' && 'Rolling…'}
        {phase === 'fourth' && 'Awaiting 4th reel…'}
        {phase === 'resolving' && lastRespinKind === 'win' && 'WIN — collecting'}
        {phase === 'resolving' && lastRespinKind === 'boost' && 'BOOST — bag growing'}
        {phase === 'resolving' && lastRespinKind === 'blank' && 'No win'}
        {phase === 'jackpot' && '🎉 JACKPOT!'}
        {phase === 'finished' && (cappedAtMax ? 'MAX WIN!' : 'Round complete')}
        {phase === 'idle' && respinsLeft > 0 && 'Next respin…'}
      </div>

      {/* Jackpot fanfare overlay — fires once per filled meter, sequentially. */}
      <AnimatePresence>
        {jackpotFiring && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.35, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.25, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              className="px-8 py-5 rounded-3xl font-display font-extrabold text-center"
              style={{
                background:
                  jackpotFiring.tier === 'grand'
                    ? 'linear-gradient(180deg, #a78bfa, #5a1aa8)'
                    : jackpotFiring.tier === 'major'
                      ? 'linear-gradient(180deg, #ff8a40, #c8102e)'
                      : jackpotFiring.tier === 'minor'
                        ? 'linear-gradient(180deg, #ffd166, #c8932e)'
                        : 'linear-gradient(180deg, #5fb8ff, #1a5a8a)',
                color: '#fff5e0',
                border: '3px solid #fff5c4',
                boxShadow: '0 0 60px rgba(255,209,102,.9), 0 0 100px rgba(255,85,96,.6)',
                textShadow: '0 2px 6px rgba(0,0,0,.7)',
              }}
            >
              <div className="text-[11px] uppercase tracking-widest opacity-85">{jackpotFiring.tier}</div>
              <div className="text-3xl mt-1 mb-1">JACKPOT!</div>
              <div className="text-xl font-mono tabular-nums">
                {fmtCurrency(jackpotFiring.amount * bet)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End-of-feature TOTAL WIN banner */}
      <AnimatePresence>
        {phase === 'finished' && (
          <motion.div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'radial-gradient(70% 50% at 50% 42%, rgba(255,209,102,.22), rgba(0,0,0,.78) 70%)',
            }}
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="font-display font-extrabold text-3xl tracking-widest mb-1"
              style={{
                background: 'linear-gradient(180deg, #fff5c4 0%, #ffd166 50%, #ff5560 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 28px rgba(255,209,102,.95))',
              }}
            >
              {cappedAtMax ? 'MAX WIN!' : '¡FIESTA!'}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] uppercase tracking-[0.32em] text-[#FFE0A8] mb-3"
            >
              Total Bonus Win
            </motion.div>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 240, damping: 18 }}
              className="font-mono font-extrabold text-4xl tabular-nums text-[#fff5c4]"
              style={{ textShadow: '0 0 24px rgba(255,209,102,.85), 0 4px 8px rgba(0,0,0,.6)' }}
            >
              {fmtCurrency(totalPayout)}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-[11px] mt-2 font-mono text-[#ffd166]/85 tabular-nums"
            >
              {totalPayoutMult.toFixed(2)}× bet
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatTile({ label, value, accent, wide, tallyTarget }: { label: string; value: string; accent: string; wide?: boolean; tallyTarget?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center px-3 py-1.5 rounded-xl bg-black/55 border ${wide ? 'flex-1' : ''}`}
      style={{ borderColor: `${accent}55` }}
      // Marker for the flying-coin destination during Win resolution.
      // The coinFly helper queries [data-bj-tally] to find this element.
      data-bj-tally={tallyTarget ? 'true' : undefined}
    >
      <span className="text-[8px] uppercase tracking-widest text-[#FFE0A8]/65">{label}</span>
      <span className="font-mono font-bold text-base tabular-nums" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

function JackpotMeter({
  tier, filled, threshold, payoutMult,
}: {
  tier: JackpotTier;
  filled: number;
  threshold: number;
  payoutMult: number;
}) {
  const color =
    tier === 'grand' ? '#a78bfa'
    : tier === 'major' ? '#ff5560'
    : tier === 'minor' ? '#ffd166'
    : '#5fb8ff';
  const segments = Array.from({ length: threshold }, (_, i) => i < filled);
  return (
    <div
      data-bj-meter={tier}
      className="rounded-lg px-1.5 py-1 border"
      style={{
        background: `linear-gradient(180deg, ${color}25, rgba(0,0,0,.55))`,
        borderColor: `${color}88`,
        boxShadow: filled > 0 ? `0 0 6px ${color}66, inset 0 1px 0 rgba(255,255,255,.1)` : 'inset 0 1px 0 rgba(255,255,255,.08)',
      }}
    >
      <div className="text-[7px] uppercase tracking-widest font-display font-bold leading-none text-center"
           style={{ color, textShadow: `0 0 4px ${color}88` }}>
        {tier}
      </div>
      <div className="text-[8px] font-mono font-bold tabular-nums leading-none text-center text-[#fff5e0] mt-0.5"
           style={{ textShadow: `0 0 4px ${color}88, 0 1px 1px rgba(0,0,0,.6)` }}>
        {payoutMult}×
      </div>
      <div className="flex gap-0.5 justify-center mt-1">
        {segments.map((isOn, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 5, height: 5,
              background: isOn ? color : 'rgba(255,255,255,.1)',
              boxShadow: isOn ? `0 0 4px ${color}` : 'inset 0 0 1px rgba(0,0,0,.4)',
              transition: 'background 0.3s, box-shadow 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BonusGrid({
  outer, bagValue, phase, coinsLanded, lastRespinKind,
}: {
  outer: RespinSymbol[];
  bagValue: number;
  phase: string;
  coinsLanded: Set<number>;
  lastRespinKind: FourthReelOutcome | null;
}) {
  // 9-cell grid. Index 4 = sticky money bag. Outer indices 0,1,2,3,5,6,7,8
  // map to the outer[0..7] array (skipping the center).
  return (
    <div
      className="rounded-2xl p-2 relative"
      style={{
        background: 'linear-gradient(180deg, #2a0810 0%, #5a0810 50%, #14040a 100%)',
        border: '3px solid #c8932e',
        boxShadow: '0 0 0 1px rgba(255,209,102,.3), inset 0 1px 0 rgba(255,209,102,.4), 0 12px 30px rgba(0,0,0,.6)',
      }}
    >
      <div className="grid grid-cols-3 gap-1.5" style={{ width: 'min(220px, 64vw)' }}>
        {Array.from({ length: 9 }).map((_, gridIdx) => {
          if (gridIdx === 4) {
            return (
              <MoneyBagCell
                key="bag"
                value={bagValue}
                pulse={phase === 'resolving' && lastRespinKind === 'boost'}
              />
            );
          }
          // Map 9 grid positions (0..8) onto the 8-element `outer` array
          // (skipping index 4, which is the centre money bag).
          //   grid 0,1,2,3       → outer 0,1,2,3
          //   grid 4              → BAG (handled above)
          //   grid 5,6,7,8       → outer 4,5,6,7
          // The previous formula had an off-by-one bug for grid 6/7/8 —
          // it subtracted 2 instead of 1, so the bottom row showed the
          // same symbols as the middle/right and outer[7] never rendered.
          const outerIdx = gridIdx < 4 ? gridIdx : gridIdx - 1;
          const sym = outer[outerIdx]!;
          return (
            <OuterCell
              key={gridIdx}
              outerIdx={outerIdx}
              symbol={sym}
              spinning={phase === 'spinning' && sym.kind === 'blank'}
              landed={coinsLanded.has(outerIdx)}
              fadingOut={phase === 'resolving' && lastRespinKind === 'blank' && sym.kind !== 'blank'}
              collectingForWin={phase === 'resolving' && lastRespinKind === 'win' && sym.kind !== 'blank'}
              streamingToBag={phase === 'resolving' && lastRespinKind === 'boost' && sym.kind === 'coin'}
            />
          );
        })}
      </div>
    </div>
  );
}

function MoneyBagCell({ value, pulse }: { value: number; pulse: boolean }) {
  return (
    <motion.div
      data-bj-money-bag="true"
      className="relative aspect-square rounded-lg flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(circle at 35% 30%, #ffd166 0%, #c8932e 40%, #5a3a04 90%)',
        border: '2px solid #fff5c4',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4), 0 0 14px rgba(255,209,102,.5), 0 4px 8px rgba(0,0,0,.5)',
      }}
      animate={pulse ? { scale: [1, 1.18, 1.08], rotate: [0, -2, 2, 0] } : { scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <span className="text-2xl drop-shadow-md leading-none">💰</span>
      <span
        className="font-mono font-extrabold text-[11px] tabular-nums mt-1 leading-none"
        style={{
          color: '#5a0810',
          textShadow: '0 1px 0 rgba(255,255,255,.4)',
        }}
      >
        {value.toFixed(2)}×
      </span>
    </motion.div>
  );
}

function OuterCell({
  outerIdx, symbol, spinning, landed, fadingOut, collectingForWin, streamingToBag,
}: {
  outerIdx: number;
  symbol: RespinSymbol;
  spinning: boolean;
  landed: boolean;
  fadingOut: boolean;
  collectingForWin: boolean;
  streamingToBag: boolean;
}) {
  const baseStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.45))',
    border: '1px solid rgba(200,147,46,.25)',
  };
  return (
    <motion.div
      data-bj-outer-cell={outerIdx}
      className="aspect-square rounded-lg flex items-center justify-center relative overflow-hidden"
      style={baseStyle}
      initial={landed ? { scale: 0.5, opacity: 0 } : false}
      animate={
        collectingForWin
          ? { scale: [1, 1.15, 0.4], opacity: [1, 1, 0], y: [0, -4, 30] }
          : streamingToBag
            ? { scale: [1, 1.1, 0.5], opacity: [1, 1, 0], x: 8, y: 4 }
            : fadingOut
              ? { scale: 0.85, opacity: 0 }
              : landed
                ? { scale: 1, opacity: 1 }
                : { scale: 1, opacity: 1 }
      }
      transition={
        collectingForWin
          ? { duration: 0.7, ease: 'easeIn' }
          : streamingToBag
            ? { duration: 0.55, ease: 'easeIn' }
            : fadingOut
              ? { duration: 0.4 }
              : { duration: 0.25, ease: [0.34, 1.4, 0.5, 1] }
      }
    >
      <RespinSymbolGlyph symbol={symbol} spinning={spinning} />
    </motion.div>
  );
}

function RespinSymbolGlyph({ symbol, spinning }: { symbol: RespinSymbol; spinning: boolean }) {
  if (spinning) {
    // "?" flicker while the cell is rolling.
    return (
      <motion.span
        className="font-display font-extrabold text-2xl text-[#ffd166]/70"
        animate={{ opacity: [0.3, 0.95, 0.3], scale: [0.85, 1.05, 0.85] }}
        transition={{ duration: 0.32, repeat: Infinity, ease: 'easeInOut' }}
      >
        ?
      </motion.span>
    );
  }
  if (symbol.kind === 'blank') return null;
  if (symbol.kind === 'coin') {
    return (
      <div className="flex flex-col items-center justify-center">
        <span className="text-xl leading-none">🪙</span>
        <span
          className="font-mono font-extrabold text-[10px] tabular-nums leading-none mt-0.5"
          style={{ color: '#fff5c4', textShadow: '0 1px 1px rgba(0,0,0,.6), 0 0 4px rgba(255,209,102,.85)' }}
        >
          {symbol.value}×
        </span>
      </div>
    );
  }
  if (symbol.kind === 'extra') {
    return (
      <div className="flex flex-col items-center justify-center">
        <span className="text-xl leading-none">🎊</span>
        <span
          className="font-mono font-bold text-[9px] tabular-nums leading-none mt-0.5"
          style={{ color: '#1fff7a', textShadow: '0 0 4px rgba(31,255,122,.85)' }}
        >
          +1
        </span>
      </div>
    );
  }
  // Jackpot symbols
  const color =
    symbol.kind === 'grand' ? '#a78bfa'
    : symbol.kind === 'major' ? '#ff5560'
    : symbol.kind === 'minor' ? '#ffd166'
    : '#5fb8ff';
  const glyph =
    symbol.kind === 'grand' ? '💎'
    : symbol.kind === 'major' ? '🔴'
    : symbol.kind === 'minor' ? '🟡'
    : '🔵';
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-lg leading-none" style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }}>
        {glyph}
      </span>
      <span
        className="font-display font-extrabold text-[7px] uppercase tracking-widest leading-none mt-0.5"
        style={{ color, textShadow: `0 0 3px ${color}88` }}
      >
        {symbol.kind}
      </span>
    </div>
  );
}

function FourthReelCell({ phase, value }: { phase: string; value: FourthReelOutcome | null }) {
  const spinning = phase === 'spinning' || phase === 'fourth';
  // "Tall" cell to the right of the 3x3.
  return (
    <div
      className="rounded-2xl p-2 flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #2a0810 0%, #5a0810 50%, #14040a 100%)',
        border: '3px solid #c8932e',
        boxShadow: '0 0 0 1px rgba(255,209,102,.3), inset 0 1px 0 rgba(255,209,102,.4), 0 12px 30px rgba(0,0,0,.6)',
        width: 'min(76px, 22vw)',
        height: 'min(220px, 64vw)',
      }}
    >
      <div
        className="w-full h-full rounded-lg flex items-center justify-center text-center overflow-hidden relative"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.55))',
          border: '1px solid rgba(200,147,46,.3)',
        }}
      >
        <AnimatePresence mode="wait">
          {spinning && value === null ? (
            <motion.div
              key="spin"
              className="font-display font-extrabold text-3xl text-[#ffd166]/65"
              animate={{ opacity: [0.3, 0.95, 0.3], y: [-8, 8, -8] }}
              transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
              exit={{ opacity: 0 }}
            >
              ?
            </motion.div>
          ) : value === 'win' ? (
            <motion.div
              key="win"
              initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
              animate={{ scale: [0.4, 1.15, 1], opacity: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: [0.34, 1.4, 0.5, 1] }}
              exit={{ opacity: 0 }}
              className="font-display font-extrabold text-base px-2 py-1 rounded-md"
              style={{
                background: 'linear-gradient(180deg, #ffd166 0%, #c8932e 100%)',
                color: '#5a0810',
                border: '2px solid #fff5c4',
                boxShadow: '0 0 16px rgba(255,209,102,.85)',
                textShadow: '0 1px 0 rgba(255,255,255,.45)',
              }}
            >
              WIN
            </motion.div>
          ) : value === 'boost' ? (
            <motion.div
              key="boost"
              initial={{ scale: 0.4, opacity: 0, rotate: 6 }}
              animate={{ scale: [0.4, 1.15, 1], opacity: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: [0.34, 1.4, 0.5, 1] }}
              exit={{ opacity: 0 }}
              className="font-display font-extrabold text-[12px] px-2 py-1 rounded-md leading-tight"
              style={{
                background: 'linear-gradient(180deg, #ff8a40 0%, #c8102e 100%)',
                color: '#fff5c4',
                border: '2px solid #fff5c4',
                boxShadow: '0 0 16px rgba(255,138,64,.85)',
                textShadow: '0 1px 1px rgba(0,0,0,.6)',
              }}
            >
              BOOST
            </motion.div>
          ) : value === 'blank' ? (
            <motion.div
              key="blank"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[#ffd166]/30 text-xs uppercase tracking-widest"
            >
              —
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
