import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmtCurrency } from '../../../lib/format';
import { useGame } from '../../../game-context';
import {
  JACKPOTS,
  JACKPOT_THRESHOLD,
  type FourthReelOutcome,
  type JackpotTier,
  type RespinRoundOutcome,
  type RespinSymbol,
  type RespinTimelineEvent,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';
import { PinataSvg } from './symbols';
import { flyCoin } from './coinFly';

/** Big Juan Respins feature reconstructed from the pinned sver=5 rules and
 * observed runtime event ordering, using locally calibrated hidden weights.
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
 *    WIN   → coins + bag pay out and jackpot meters tick; respin -= 1
 *    BOOST → coins added permanently to bag value; jackpots do not collect;
 *            respin -= 1
 *    EXTRA SPIN tokens add one respin independently of the fourth reel.
 *
 *  Per spec §7.3 the bag starts at 1× bet. Jackpot meters fill at 3/4/5/5.
 *  Cap = 2,600× bet hits → end immediately.
 */

export type BonusRoundProps = {
  bet: number;
  scatterCount: number;
  /** Immutable seeded math timeline. Rendering only replays these events. */
  outcome: RespinRoundOutcome;
  /** Playback speed. Values above 1 shorten feature delays; default is 1. */
  speedMultiplier?: number;
  onClose: (totalPayoutMultiplier: number) => void;
};

export function BigJuanBonusRound({
  bet,
  scatterCount,
  outcome,
  speedMultiplier = 1,
  onClose,
}: BonusRoundProps) {
  const { sound } = useGame();

  // Every delay owned by this component goes through one scheduler so it can
  // be sped up consistently and cancelled when the feature unmounts.
  const mountedRef = useRef(true);
  const timeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const safeSpeed = Number.isFinite(speedMultiplier) && speedMultiplier > 0
    ? speedMultiplier
    : 1;
  const scaledMs = useCallback(
    (ms: number) => Math.max(0, Math.round(ms / safeSpeed)),
    [safeSpeed],
  );
  const schedule = useCallback((callback: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutIdsRef.current.delete(id);
      if (mountedRef.current) callback();
    }, scaledMs(ms));
    timeoutIdsRef.current.add(id);
    return id;
  }, [scaledMs]);
  const cancelScheduled = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timeoutIdsRef.current.delete(id);
  }, []);
  const sleep = useCallback(
    (ms: number) => new Promise<void>((resolveSleep) => {
      schedule(resolveSleep, ms);
    }),
    [schedule],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const id of timeoutIdsRef.current) clearTimeout(id);
      timeoutIdsRef.current.clear();
    };
  }, []);

  const eventCursorRef = useRef(0);

  // ── Round state ─────────────────────────────────────────
  const initialRespins = outcome.initialRespins;
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
  // Extra-spin token animations feed directly into the visible counter.
  /** Cap-hit flag — when the running total or pending payout would exceed
   *  2,600× bet. End immediately per spec §7.7. */
  const [cappedAtMax, setCappedAtMax] = useState(
    () => outcome.cappedAtMax && outcome.events.length === 0,
  );

  const totalPayoutMult = cumulativeMult;
  const totalPayout = bet * totalPayoutMult;

  // Live presentation refs prevent timer callbacks from reading stale state.
  const metersRef = useRef(meters);
  metersRef.current = meters;
  const cumulativeRef = useRef(cumulativeMult);
  cumulativeRef.current = cumulativeMult;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const soundRef = useRef(sound);
  soundRef.current = sound;

  // ── Intro: short "GET READY" beat before the first respin ──────────
  useEffect(() => {
    if (phase !== 'intro') return;
    const t = schedule(() => setPhase('idle'), 800);
    return () => cancelScheduled(t);
  }, [phase, schedule, cancelScheduled]);

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
      // Enter the finished presentation. Closing is deliberately handled by
      // a separate effect so this phase change cannot cancel its own timer.
      setPhase('finished');
      return;
    }
    const t = schedule(() => kickRespin(), 600);
    return () => cancelScheduled(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, respinsLeft, cappedAtMax, schedule, cancelScheduled]);

  // Keep the completion delay alive for the whole finished phase. In the old
  // combined effect, setPhase('finished') immediately ran cleanup and cleared
  // the onClose timer before it could commit the payout.
  useEffect(() => {
    if (phase !== 'finished') return;
    const finalFeatureMultiplier = cumulativeRef.current;
    soundRef.current.play(finalFeatureMultiplier >= 100 ? 'mega-win' : 'big-win');
    const t = schedule(
      () => onCloseRef.current(finalFeatureMultiplier),
      3200,
    );
    return () => cancelScheduled(t);
  }, [phase, schedule, cancelScheduled]);

  // ── Replay the next precomputed respin event ─────────────────────
  const kickRespin = useCallback(() => {
    setPhase('spinning');
    setLastRespinKind(null);
    setCoinsLanded(new Set());
    setFourth(null);
    sound.play('click');

    const event = outcome.events[eventCursorRef.current];
    if (!event) {
      setRespinsLeft(0);
      setPhase('idle');
      return;
    }
    eventCursorRef.current += 1;
    const sample = event.sample;

    // Outer cells use a reference-tuned stagger; this timing is presentation,
    // not a published probability or protocol value.
    sample.outer.forEach((sym, i) => {
      schedule(() => {
        setOuter((prev) => {
          const next = [...prev];
          next[i] = sym;
          return next;
        });
        if (sym.kind === 'coin' || sym.kind === 'extra' ||
            sym.kind === 'mini' || sym.kind === 'minor' ||
            sym.kind === 'major' || sym.kind === 'grand') {
          sound.play('juan-reel-stop');
        }
      }, 80 * (i + 1));
    });

    // 4th reel spins ~1.2s after the last outer cell.
    schedule(() => {
      setPhase('fourth');
      // 4th reel "spins" visually for ~1.2s before settling.
      schedule(() => {
        setFourth(sample.fourth);
        // Settle SFX based on outcome.
        if (sample.fourth === 'win') sound.play('juan-fanfare');
        else if (sample.fourth === 'boost') sound.play('juan-coin');
        else sound.play('juan-reel-stop');
        // Resolve after a short settle. resolve() is async — fire-and-
        // forget since the phase state machine handles the next respin.
        schedule(() => { void resolve(event); }, 480);
      }, 1200);
    }, 80 * 9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound, schedule, outcome]);

  // ── Resolve the respin against current state ─────────────────────────
  //
  //  The renderer mirrors the observed resolution beats:
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
  const resolve = useCallback(async (event: RespinTimelineEvent) => {
    setPhase('resolving');
    const { sample, resolution: res } = event;
    setLastRespinKind(res.kind);
    const animSet = new Set<number>();
    sample.outer.forEach((s, i) => {
      if (s.kind !== 'blank') animSet.add(i);
    });
    setCoinsLanded(animSet);

    // The official queue resolves Extras first, before WIN/BOOST/blank.
    const respinCounterEl = document.querySelector('[data-bj-respins]') as HTMLElement | null;
    for (let i = 0; i < sample.outer.length; i++) {
      if (sample.outer[i]!.kind !== 'extra') continue;
      const cellEl = document.querySelector(`[data-bj-outer-cell="${i}"]`) as HTMLElement | null;
      if (cellEl && respinCounterEl) {
        flyCoin(cellEl, respinCounterEl, {
          glyph: '+1', value: 0, durationMs: scaledMs(500), endScale: 0.7,
        });
        sound.play('juan-reel-stop');
        await sleep(200);
      }
    }
    if (res.extraSpins > 0) {
      setRespinsLeft((previous) => previous + res.extraSpins);
    }

    // WIN resolves jackpot tokens, meter fills/awards/resets, and only then
    // Money plus the Bag. This ordering is visible in the reference queue.
    if (res.kind === 'win') {
      const tallyEl = document.querySelector('[data-bj-tally]') as HTMLElement | null;
      const bagEl = document.querySelector('[data-bj-money-bag]') as HTMLElement | null;
      const visualMeters: Record<JackpotTier, number> = { ...metersRef.current };
      for (const tier of ['mini', 'minor', 'major', 'grand'] as const) {
        for (let i = 0; i < sample.outer.length; i++) {
          const s = sample.outer[i]!;
          if (s.kind !== tier) continue;
          const cellEl = document.querySelector(`[data-bj-outer-cell="${i}"]`) as HTMLElement | null;
          const meterEl = document.querySelector(`[data-bj-meter="${tier}"]`) as HTMLElement | null;
          if (cellEl && meterEl) {
            flyCoin(cellEl, meterEl, {
              glyph: tier.toUpperCase(),
              value: 0,
              durationMs: scaledMs(480),
              endScale: 0.6,
              endRotate: 360,
            });
            sound.play('juan-reel-stop');
            await sleep(100);
          }
          visualMeters[tier] += 1;
          setMeters({ ...visualMeters });
          await sleep(120);

          if (visualMeters[tier] >= JACKPOT_THRESHOLD[tier]) {
            const hit = { tier, amount: JACKPOTS[tier] };
            setPhase('jackpot');
            setJackpotFiring(hit);
            sound.play('mega-win');
            const duration = tier === 'grand'
              ? 4500
              : tier === 'major'
                ? 2800
                : tier === 'minor'
                  ? 2200
                  : 1800;
            await sleep(duration);
            visualMeters[tier] -= JACKPOT_THRESHOLD[tier];
            setMeters({ ...visualMeters });
            setJackpotFiring(null);
            setPhase('resolving');
            await sleep(300);
          }
        }
      }
      // Each coin element flies → tally with a small stagger.
      for (let i = 0; i < sample.outer.length; i++) {
        const s = sample.outer[i]!;
        const cellEl = document.querySelector(`[data-bj-outer-cell="${i}"]`) as HTMLElement | null;
        if (!cellEl || !tallyEl) continue;
        if (s.kind === 'coin') {
          flyCoin(cellEl, tallyEl, { glyph: '$', value: s.value, durationMs: scaledMs(580) });
          sound.play('juan-coin');
          await sleep(140);
        }
      }
      // Money bag fires its value to the tally.
      if (bagEl && tallyEl && res.bagPaid > 0) {
        flyCoin(bagEl, tallyEl, { glyph: 'BAG', value: res.bagPaid, durationMs: scaledMs(600) });
        sound.play('juan-coin');
        await sleep(280);
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
            glyph: '$',
            value: s.value,
            durationMs: scaledMs(520),
            endScale: 0.3,
            endRotate: 180,
          });
          sound.play('juan-coin');
          await sleep(120);
        }
      }
    }

    // Commit the resolved state after all visible collection beats.
    await sleep(350);
    setBagValue(res.newBagValue);
    setMeters(res.newMeters);
    setCumulativeMult(event.cumulativeAfter);
    setRespinsLeft(event.respinsAfter);
    if (res.cappedAtMax) setCappedAtMax(true);
    setOuter((previous) => previous.map(() => ({ kind: 'blank' })));
    await sleep(500);
    setPhase('idle');
  }, [sleep, sound, scaledMs]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-start p-3 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background:
          'radial-gradient(circle at 78% 14%, rgba(255,246,194,.9) 0 3%, rgba(122,145,213,.2) 9%, transparent 20%), linear-gradient(180deg, #111c55 0%, #30215f 38%, #6e293e 70%, #160813 100%)',
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
      <div className="flex items-center justify-center gap-2 flex-1 w-full max-w-3xl">
        {/* Left rail: 4 jackpot meters stacked. Each shows tier + payout
            + segment progress (filled / required). Per spec §9: floats
            on the left side of the feature screen. */}
        <div className="flex flex-col gap-1.5 w-[clamp(52px,14vw,90px)] flex-shrink-0">
          {(['grand', 'major', 'minor', 'mini'] as JackpotTier[]).map((tier) => (
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
        <div data-bj-respins="true">
          <StatTile label="Respins" value={String(respinsLeft)} accent="#ffd166" />
        </div>
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
        {phase === 'jackpot' && 'JACKPOT!'}
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
        background: 'linear-gradient(145deg, #fff0a6 0%, #bf7d14 42%, #6d3b07 100%)',
        border: '3px solid #fff5c4',
        boxShadow: '0 0 0 2px #8d510d, inset 0 1px 0 rgba(255,255,255,.75), 0 14px 32px rgba(0,0,0,.65)',
      }}
    >
      <div className="grid grid-cols-3 gap-1.5" style={{ width: 'clamp(150px, 48vw, 320px)' }}>
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
        background: 'radial-gradient(circle at 35% 28%, #1aa875 0%, #087151 48%, #063c32 100%)',
        border: '2px solid #ffd166',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), 0 0 14px rgba(255,209,102,.55), 0 4px 8px rgba(0,0,0,.5)',
      }}
      animate={pulse ? { scale: [1, 1.18, 1.08], rotate: [0, -2, 2, 0] } : { scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-8 w-8 drop-shadow-md">
        <path d="M20 16h24l-4 10c9 7 13 17 9 26H15c-4-9 0-19 9-26z" fill="#f4b73f" stroke="#6f3f0a" strokeWidth="3" />
        <path d="M20 16q12 7 24 0M23 26h18" fill="none" stroke="#fff0a6" strokeWidth="3" />
        <text x="32" y="46" textAnchor="middle" fontSize="18" fontWeight="900" fill="#6f3f0a">$</text>
      </svg>
      <span
        className="font-mono font-extrabold text-[11px] tabular-nums mt-1 leading-none"
        style={{
          color: '#fff5c4',
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
    background: 'linear-gradient(100deg, #edf8ff 0%, #b9d3e2 47%, #f7fdff 74%, #94b4ca 100%)',
    border: '1px solid rgba(126,78,12,.5)',
    boxShadow: 'inset 0 0 12px rgba(70,116,145,.2)',
  };
  return (
    <div
      data-bj-outer-cell={outerIdx}
      className="aspect-square rounded-lg flex items-center justify-center relative overflow-hidden"
      style={baseStyle}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={landed ? { scale: 0.5, opacity: 0 } : false}
        animate={{
          scale: 1,
          opacity: fadingOut || collectingForWin || streamingToBag ? 0 : 1,
        }}
        transition={{ duration: fadingOut || collectingForWin || streamingToBag ? 0.4 : 0.25 }}
      >
        <RespinSymbolGlyph symbol={symbol} spinning={spinning} />
      </motion.div>
    </div>
  );
}

function RespinSymbolGlyph({ symbol, spinning }: { symbol: RespinSymbol; spinning: boolean }) {
  if (spinning) {
    return (
      <motion.div
        className="absolute inset-x-0 top-0 flex flex-col items-center gap-2 py-2"
        animate={{ y: [0, -610] }}
        transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}
      >
        {[...RESPIN_DISPLAY_TOKENS, ...RESPIN_DISPLAY_TOKENS.slice(0, 3)].map((token, index) => (
          <span
            key={`${token}-${index}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-display text-[7px] font-black uppercase"
            style={respinTokenStyle(token)}
          >
            {token === 'money' ? '$' : token}
          </span>
        ))}
      </motion.div>
    );
  }
  if (symbol.kind === 'blank') return null;
  if (symbol.kind === 'coin') {
    return (
      <div className="flex flex-col items-center justify-center">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#fff0a6] bg-gradient-to-br from-[#fff0a6] via-[#e6a72d] to-[#8d510d] font-display text-xs font-black text-[#6f3f0a] shadow-[0_0_8px_rgba(255,209,102,.65)]"
        >
          $
        </span>
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
        <span className="flex h-9 w-9 rotate-6 items-center justify-center rounded-[35%] border-2 border-[#d6ffca] bg-[#15984f] font-display text-[11px] font-black text-white shadow-[0_0_8px_rgba(31,255,122,.65)]">+1</span>
      </div>
    );
  }
  // Jackpot symbols
  const color =
    symbol.kind === 'grand' ? '#a78bfa'
    : symbol.kind === 'major' ? '#ff5560'
    : symbol.kind === 'minor' ? '#ffd166'
    : '#5fb8ff';
  return (
    <div className="flex flex-col items-center justify-center">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-md border-2 font-display text-[7px] font-black uppercase tracking-tight text-white"
        style={{ background: `linear-gradient(145deg, ${color}, #281335)`, borderColor: '#fff0a6', boxShadow: `0 0 8px ${color}aa` }}
      >
        {symbol.kind}
      </span>
    </div>
  );
}

const RESPIN_DISPLAY_TOKENS = [
  'major', 'money', 'mini', 'major', 'money', 'grand', 'extra', 'mini',
  'money', 'extra', 'grand', 'money', 'minor', 'money', 'grand', 'minor',
] as const;

function respinTokenStyle(token: typeof RESPIN_DISPLAY_TOKENS[number]): CSSProperties {
  const color = token === 'grand' ? '#8d5de8'
    : token === 'major' ? '#d13a45'
    : token === 'minor' ? '#d49a19'
    : token === 'mini' ? '#338bc0'
    : token === 'extra' ? '#15984f'
    : '#e6a72d';
  return {
    color: '#fff',
    background: `linear-gradient(145deg, ${color}, #281335)`,
    borderColor: '#fff0a6',
    boxShadow: `0 0 7px ${color}99`,
  };
}

const FOURTH_REEL_DISPLAY_STRIP: FourthReelOutcome[] = [
  'boost', 'win', 'blank', 'boost', 'blank', 'boost', 'boost', 'boost', 'win', 'win',
  'blank', 'blank', 'boost', 'blank', 'boost', 'win', 'win', 'win', 'blank', 'win',
  'win', 'blank', 'boost', 'blank', 'blank',
];

function FourthReelCell({ phase, value }: { phase: string; value: FourthReelOutcome | null }) {
  const spinning = phase === 'spinning' || phase === 'fourth';
  // "Tall" cell to the right of the 3x3.
  return (
    <div
      className="rounded-2xl p-2 flex items-center justify-center"
      style={{
        background: 'linear-gradient(145deg, #fff0a6 0%, #bf7d14 42%, #6d3b07 100%)',
        border: '3px solid #fff5c4',
        boxShadow: '0 0 0 2px #8d510d, inset 0 1px 0 rgba(255,255,255,.75), 0 12px 30px rgba(0,0,0,.65)',
        width: 'clamp(52px, 16vw, 100px)',
        height: 'clamp(150px, 48vw, 320px)',
      }}
    >
      <div
        className="w-full h-full rounded-lg flex items-center justify-center text-center overflow-hidden relative"
        style={{
          background: 'linear-gradient(100deg, #edf8ff 0%, #b9d3e2 47%, #f7fdff 74%, #94b4ca 100%)',
          border: '1px solid rgba(126,78,12,.5)',
        }}
      >
        <AnimatePresence mode="wait">
          {spinning && value === null ? (
            <motion.div
              key="spin"
              className="absolute inset-x-0 top-0 flex flex-col items-stretch font-display font-extrabold"
              animate={{ y: [0, -900] }}
              transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}
              exit={{ opacity: 0 }}
            >
              {FOURTH_REEL_DISPLAY_STRIP.map((outcome, index) => (
                <div
                  key={`${outcome}-${index}`}
                  className="flex h-12 shrink-0 items-center justify-center border-b border-[#c8932e]/25 text-[10px] uppercase"
                  style={{
                    color: outcome === 'win' ? '#ffd166' : outcome === 'boost' ? '#ff8a40' : '#8f7786',
                    background: outcome === 'blank' ? 'rgba(0,0,0,.26)' : 'rgba(255,209,102,.07)',
                  }}
                >
                  {outcome === 'blank' ? '—' : outcome}
                </div>
              ))}
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
