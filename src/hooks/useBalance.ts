import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { loadJson, saveJson } from '../lib/storage';
import { DEFAULT_BALANCE, MAX_MONEY, MAX_ROUND_MULTIPLIER, MAX_STAKE, moneyCents, normalizeMoney } from '../lib/accounting';

const KEY = 'balance';

export function useBalance() {
  const [balance, setBalanceState] = useState(() =>
    normalizeMoney(loadJson<unknown>(KEY, DEFAULT_BALANCE), DEFAULT_BALANCE),
  );
  const ref = useRef(balance);

  // Persist a sanitized legacy value on mount. Read the ref because a child
  // may already have recovered a pending round before this effect runs.
  useEffect(() => { saveJson(KEY, ref.current); }, []);

  const commit = useCallback((next: number) => {
    ref.current = next;
    saveJson(KEY, next);
    setBalanceState(next);
  }, []);

  const getBalance = useCallback(() => ref.current, []);
  const canAfford = useCallback((amount: number) => {
    const cents = moneyCents(amount);
    return cents !== null && cents > 0 && cents <= Math.round(ref.current * 100) &&
      ref.current + Math.min(amount, MAX_STAKE) * MAX_ROUND_MULTIPLIER <= MAX_MONEY;
  }, []);

  /** Returns false without changing the wallet if the whole debit cannot fit. */
  const debit = useCallback((amount: number): boolean => {
    const cents = moneyCents(amount);
    const available = Math.round(ref.current * 100);
    if (cents === null || cents <= 0 || cents > available ||
      ref.current + Math.min(amount, MAX_STAKE) * MAX_ROUND_MULTIPLIER > MAX_MONEY) return false;
    commit((available - cents) / 100);
    return true;
  }, [commit]);

  const credit = useCallback((amount: number): boolean => {
    const cents = moneyCents(amount);
    if (cents === null) return false;
    const next = Math.round(ref.current * 100) + cents;
    if (!Number.isSafeInteger(next) || next / 100 > MAX_MONEY) return false;
    commit(next / 100);
    return true;
  }, [commit]);

  // Keep the public setter compatible with React's functional-setter shape,
  // but never expose React's raw setter: it bypasses the authoritative ref.
  const setBalance = useCallback((value: SetStateAction<number>): boolean => {
    const next = typeof value === 'function' ? value(ref.current) : value;
    const cents = moneyCents(next);
    if (cents === null) return false;
    commit(cents / 100);
    return true;
  }, [commit]);

  const reset = useCallback((to = DEFAULT_BALANCE) => setBalance(to), [setBalance]);

  return useMemo(
    () => ({ balance, setBalance, debit, credit, reset, canAfford, getBalance }),
    [balance, setBalance, debit, credit, reset, canAfford, getBalance],
  );
}
