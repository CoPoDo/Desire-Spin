import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { useGame } from '../../../game-context';
import { MAX_MONEY, MAX_ROUND_MULTIPLIER, MAX_STAKE } from '../../../lib/accounting';
import { createRng, sha256Hex, type Rng, type Seeds } from '../../../lib/fairness';

/** State plus a synchronous authoritative copy for click/keyboard races. */
export function useRoundState<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const ref = useRef(value);
  const update = useCallback((action: SetStateAction<T>) => {
    ref.current = typeof action === 'function'
      ? (action as (previous: T) => T)(ref.current)
      : action;
    setValue(ref.current);
  }, []);
  return [value, update, ref] as const;
}

type Wager = { seeds: Seeds; hash: string; rng: Rng; bet: number; settled: boolean };

/** One wager, one RNG stream, one ledger entry. Animation never owns money. */
export function useInteractiveRound(game: string) {
  const services = useGame();
  const [error, setError] = useState<string | null>(null);
  const servicesRef = useRef(services);
  servicesRef.current = services;
  const wager = useRef<Wager | null>(null);
  const onLeave = useRef<((updateView?: boolean) => number) | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);

  const settle = useCallback((payout: number) => {
    const current = wager.current;
    if (!current || current.settled) return false;
    if (!Number.isFinite(payout) || payout < 0) throw new Error('Invalid interactive round payout');
    const { balance, history, session } = servicesRef.current;
    const paid = +payout.toFixed(2);
    if (paid > 0 && !balance.credit(paid)) {
      if (mounted.current) setError('This payout exceeds the local wallet limit. Reset your demo balance before continuing.');
      return false;
    }
    current.settled = true;
    history.record({
      game, bet: current.bet, payout: paid, multiplier: paid / current.bet,
      serverSeedHash: current.hash, clientSeed: current.seeds.clientSeed, nonce: current.seeds.nonce,
    });
    session.recordSpin(current.bet, paid, false);
    return true;
  }, [game]);

  const begin = useCallback((bet: number) => {
    if (!mounted.current || (wager.current && !wager.current.settled)) return null;
    const { balance, fairness } = servicesRef.current;
    if (!Number.isFinite(bet) || bet <= 0 || bet > MAX_STAKE) {
      setError(`Choose a stake between 0.01 and ${MAX_STAKE.toLocaleString()} credits.`);
      return null;
    }
    // Reserve headroom for the largest supported win before accepting money.
    if (balance.getBalance() + bet * (MAX_ROUND_MULTIPLIER - 1) > MAX_MONEY) {
      setError('This stake could exceed the local wallet limit. Lower the stake or reset your demo balance.');
      return null;
    }
    if (!balance.debit(bet)) { setError('Not enough credits for this bet.'); return null; }
    setError(null);
    const seeds = fairness.consumeNonce();
    const current: Wager = {
      seeds, hash: sha256Hex(seeds.serverSeed),
      rng: createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce),
      bet: +bet.toFixed(2), settled: false,
    };
    wager.current = current;
    return current;
  }, []);

  const addStake = useCallback((amount: number) => {
    const current = wager.current;
    if (!current || current.settled || !servicesRef.current.balance.debit(amount)) return false;
    current.bet = +(current.bet + amount).toFixed(2);
    return true;
  }, []);

  const delay = useCallback((callback: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      if (mounted.current) callback();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const leavePage = () => {
      if (wager.current && !wager.current.settled) settle(onLeave.current?.(true) ?? 0);
    };
    window.addEventListener('pagehide', leavePage);
    return () => {
      window.removeEventListener('pagehide', leavePage);
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      if (wager.current && !wager.current.settled) {
        settle(onLeave.current ? onLeave.current() : 0);
      }
    };
  }, [settle]);

  return { begin, addStake, settle, delay, wager, onLeave, mounted, error };
}
