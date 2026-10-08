import { useCallback, useMemo, type SetStateAction } from 'react';
import { useStoredState } from './useStoredState';
import { DEFAULT_BALANCE, MAX_MONEY, MAX_ROUND_MULTIPLIER, MAX_STAKE, moneyCents, normalizeMoney } from '../lib/accounting';

const KEY = 'balance';

export function useBalance() {
  const [balance, getBalance, commit] = useStoredState(KEY, (value) => normalizeMoney(value, DEFAULT_BALANCE));

  const canAfford = useCallback((amount: number) => {
    const current = getBalance();
    const cents = moneyCents(amount);
    return cents !== null && cents > 0 && cents <= Math.round(current * 100) &&
      current + Math.min(amount, MAX_STAKE) * MAX_ROUND_MULTIPLIER <= MAX_MONEY;
  }, [getBalance]);

  /** Returns false without changing the wallet if the whole debit cannot fit. */
  const debit = useCallback((amount: number): boolean => {
    const cents = moneyCents(amount);
    const current = getBalance();
    const available = Math.round(current * 100);
    if (cents === null || cents <= 0 || cents > available ||
      current + Math.min(amount, MAX_STAKE) * MAX_ROUND_MULTIPLIER > MAX_MONEY) return false;
    commit((available - cents) / 100);
    return true;
  }, [commit, getBalance]);

  const credit = useCallback((amount: number): boolean => {
    const cents = moneyCents(amount);
    if (cents === null) return false;
    const next = Math.round(getBalance() * 100) + cents;
    if (!Number.isSafeInteger(next) || next / 100 > MAX_MONEY) return false;
    commit(next / 100);
    return true;
  }, [commit, getBalance]);

  // Keep the public setter compatible with React's functional-setter shape,
  // but never expose React's raw setter: it bypasses the authoritative ref.
  const setBalance = useCallback((value: SetStateAction<number>): boolean => {
    const next = typeof value === 'function' ? value(getBalance()) : value;
    const cents = moneyCents(next);
    if (cents === null) return false;
    commit(cents / 100);
    return true;
  }, [commit, getBalance]);

  const reset = useCallback((to = DEFAULT_BALANCE) => setBalance(to), [setBalance]);

  return useMemo(
    () => ({ balance, setBalance, debit, credit, reset, canAfford, getBalance }),
    [balance, setBalance, debit, credit, reset, canAfford, getBalance],
  );
}
