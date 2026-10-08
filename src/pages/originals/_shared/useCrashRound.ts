import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../../../game-context';
import { createRng, sha256Hex, type Seeds } from '../../../lib/fairness';
import { multiplierAt, rollBust } from '../crash/engine';
import { rollCrash as rollAviator, AVIATOR_MAX_MULTIPLIER } from '../aviator/engine';
import { fireConfetti } from '../../../lib/confetti';
import { type AutoConfig, type Mode, useAutoBetRunner } from './AutoBetController';

export type CrashSlotId = 'a' | 'b';
export type CrashSlot = {
  bet: number; autoCashout: number; autoEnabled: boolean; active: boolean;
  status: 'idle' | 'live' | 'cashed' | 'busted'; cashedAt: number | null;
};
const initialSlot = (active: boolean, target: number): CrashSlot => ({
  bet: 1, autoCashout: target, autoEnabled: false, active, status: 'idle', cashedAt: null,
});

/** Both live games use the same authoritative clock and exactly-once ledger.
 * React paint timing is never used to decide whether a cashout was in time. */
export function useCrashRound(game: 'Crash' | 'Aviator', livePhase: 'running' | 'flying') {
  const { balance, fairness, history, session, sound } = useGame();
  const services = useRef({ balance, fairness, history, session, sound });
  services.current = { balance, fairness, history, session, sound };
  const [slots, setSlots] = useState({ a: initialSlot(true, 2), b: initialSlot(false, 5) });
  const slotsRef = useRef(slots);
  const [phase, setPhase] = useState<'idle' | 'running' | 'flying' | 'done'>('idle');
  const phaseRef = useRef(phase);
  const [bust, setBust] = useState<number | null>(null);
  const [currentMult, setCurrentMult] = useState(1);
  const [recent, setRecent] = useState<{ id: string; bust: number; cashedAt: number | null }[]>([]);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const mounted = useRef(true);
  const animation = useRef<number>();
  const round = useRef<{ started: number; bust: number; seeds: Seeds; hash: string } | null>(null);
  const autoResolve = useRef<((delta: number | null) => void) | null>(null);

  const updateSlot = useCallback((id: CrashSlotId, value: CrashSlot) => {
    slotsRef.current = { ...slotsRef.current, [id]: value };
    if (mounted.current) setSlots(slotsRef.current);
  }, []);
  const setSlotA = useCallback((slot: CrashSlot) => {
    if (phaseRef.current !== livePhase) updateSlot('a', slot);
  }, [livePhase, updateSlot]);
  const setSlotB = useCallback((slot: CrashSlot) => {
    if (phaseRef.current !== livePhase) updateSlot('b', slot);
  }, [livePhase, updateSlot]);

  const settle = useCallback((id: CrashSlotId, at: number | null, quiet = false) => {
    const slot = slotsRef.current[id];
    const committed = round.current;
    if (!committed || slot.status !== 'live') return;
    // Lock first: delayed frames and double clicks cannot finalize twice.
    updateSlot(id, { ...slot, status: at === null ? 'busted' : 'cashed', cashedAt: at });
    const payout = at === null ? 0 : +(slot.bet * at).toFixed(2);
    const svc = services.current;
    if (payout > 0) svc.balance.credit(payout);
    svc.history.record({ game: id === 'a' ? game : `${game} (B)`, bet: slot.bet, payout,
      multiplier: at ?? 0, serverSeedHash: committed.hash,
      clientSeed: committed.seeds.clientSeed, nonce: committed.seeds.nonce });
    svc.session.recordSpin(slot.bet, payout, false);
    if (!quiet && at !== null) {
      svc.sound.play(at >= 10 ? 'mega-win' : at >= 3 ? 'big-win' : 'win');
      if (at >= 2) fireConfetti({ count: at >= 20 ? 130 : 60 });
    }
  }, [game, updateSlot]);

  const finish = useCallback((quiet = false) => {
    const committed = round.current;
    if (!committed || phaseRef.current !== livePhase) return;
    phaseRef.current = 'done';
    if (animation.current !== undefined) cancelAnimationFrame(animation.current);
    const a = slotsRef.current.a;
    if (mounted.current) {
      setPhase('done');
      setCurrentMult(committed.bust);
      setRecent((previous) => [{ id: `${committed.hash}-${committed.seeds.nonce}`, bust: committed.bust, cashedAt: a.cashedAt }, ...previous].slice(0, 20));
    }
    if (!quiet) services.current.sound.play('drop');
    const delta = a.status === 'cashed' ? +(a.bet * (a.cashedAt ?? 0) - a.bet).toFixed(2) : -a.bet;
    autoResolve.current?.(delta);
    autoResolve.current = null;
  }, [livePhase]);

  const advance = useCallback((quiet = false) => {
    const committed = round.current;
    if (!committed || phaseRef.current !== livePhase) return;
    const m = multiplierAt((performance.now() - committed.started) / 1000);
    if (mounted.current) setCurrentMult(Math.min(m, committed.bust));
    for (const id of ['a', 'b'] as const) {
      const slot = slotsRef.current[id];
      if (slot.status === 'live' && slot.autoEnabled && slot.autoCashout <= m && slot.autoCashout <= committed.bust && committed.bust > 1) {
        settle(id, slot.autoCashout, quiet);
      }
    }
    if (m >= committed.bust) {
      settle('a', null, quiet);
      settle('b', null, quiet);
      finish(quiet);
    }
  }, [livePhase, settle, finish]);

  const tickRef = useRef<() => void>(() => undefined);
  tickRef.current = () => {
    advance();
    if (phaseRef.current === livePhase && mounted.current) animation.current = requestAnimationFrame(tickRef.current);
  };

  const begin = useCallback((automatic: boolean) => {
    if (phaseRef.current === livePhase) return false;
    const configured = slotsRef.current;
    const next = {
      a: { ...configured.a, active: automatic || configured.a.active, autoEnabled: automatic || configured.a.autoEnabled },
      b: { ...configured.b, active: !automatic && configured.b.active },
    };
    const participating = [next.a, next.b].filter((slot) => slot.active);
    if (!participating.length || participating.some((slot) => !Number.isFinite(slot.bet) || slot.bet < 0.01 || (slot.autoEnabled && (!Number.isFinite(slot.autoCashout) || slot.autoCashout < 1.01 || slot.autoCashout > (game === 'Aviator' ? AVIATOR_MAX_MULTIPLIER : 1_000_000))))) return false;
    const total = +participating.reduce((sum, slot) => sum + slot.bet, 0).toFixed(2);
    const svc = services.current;
    if (!svc.balance.debit(total)) return false;
    phaseRef.current = livePhase;
    const seeds = svc.fairness.consumeNonce();
    const point = (game === 'Aviator' ? rollAviator : rollBust)(createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce));
    round.current = { started: performance.now(), bust: point, seeds, hash: sha256Hex(seeds.serverSeed) };
    for (const id of ['a', 'b'] as const) updateSlot(id, { ...next[id], status: next[id].active ? 'live' : 'idle', cashedAt: null });
    setPhase(livePhase); setBust(point); setCurrentMult(1);
    svc.sound.play('click');
    animation.current = requestAnimationFrame(tickRef.current);
    return true;
  }, [game, livePhase, updateSlot]);

  const start = useCallback(() => { begin(false); }, [begin]);
  const cashOutSlot = useCallback((id: CrashSlotId) => {
    advance();
    if (phaseRef.current !== livePhase || !round.current) return;
    const m = multiplierAt((performance.now() - round.current.started) / 1000);
    if (m < round.current.bust) settle(id, m);
  }, [advance, livePhase, settle]);
  const reset = useCallback(() => {
    if (phaseRef.current === livePhase) return;
    phaseRef.current = 'idle'; setPhase('idle'); setBust(null); setCurrentMult(1);
    for (const id of ['a', 'b'] as const) updateSlot(id, { ...slotsRef.current[id], status: 'idle', cashedAt: null });
  }, [livePhase, updateSlot]);
  const autoRunOnce = useCallback(() => new Promise<number | null>((resolve) => {
    if (!begin(true)) { resolve(null); return; }
    autoResolve.current = resolve;
  }), [begin]);
  const progress = useAutoBetRunner({ active: autoActive, config: autoConfig, intervalMs: 600,
    runOnce: autoRunOnce, onStop: () => setAutoActive(false) });

  const leaveRef = useRef<() => void>(() => undefined);
  leaveRef.current = () => {
    advance(true);
    if (phaseRef.current === livePhase && round.current) {
      const m = multiplierAt((performance.now() - round.current.started) / 1000);
      for (const id of ['a', 'b'] as const) settle(id, m < round.current.bust ? m : null, true);
      finish(true);
    }
  };
  useEffect(() => {
    mounted.current = true;
    const onPageHide = () => { setAutoActive(false); leaveRef.current(); };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      mounted.current = false;
      if (animation.current !== undefined) cancelAnimationFrame(animation.current);
      leaveRef.current();
    };
  }, []);

  const activeSlots = [slots.a, slots.b].filter((slot) => slot.active);
  const totalBet = +activeSlots.reduce((sum, slot) => sum + slot.bet, 0).toFixed(2);
  return { slotA: slots.a, slotB: slots.b, setSlotA, setSlotB, phase, bust, currentMult, recent,
    mode, setMode, autoConfig, setAutoConfig, autoActive, setAutoActive, progress,
    activeSlots, totalBet, start, cashOutSlot, reset };
}
