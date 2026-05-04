import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

const KEY = 'balance';
const DEFAULT_BALANCE = 1000;

export function useBalance() {
  const [balance, setBalance] = useState<number>(() =>
    loadJson<number>(KEY, DEFAULT_BALANCE),
  );
  const ref = useRef(balance);
  useEffect(() => {
    ref.current = balance;
  }, [balance]);

  useEffect(() => {
    saveJson(KEY, balance);
  }, [balance]);

  // Ref-based mutators so rapid debit→credit pairs in the same tick can't
  // race against React's batched state updates.
  const debit = useCallback((amount: number) => {
    const next = Math.max(0, +(ref.current - amount).toFixed(2));
    ref.current = next;
    setBalance(next);
  }, []);

  const credit = useCallback((amount: number) => {
    const next = +(ref.current + amount).toFixed(2);
    ref.current = next;
    setBalance(next);
  }, []);

  const reset = useCallback((to = DEFAULT_BALANCE) => {
    ref.current = to;
    setBalance(to);
  }, []);

  return useMemo(
    () => ({ balance, setBalance, debit, credit, reset }),
    [balance, debit, credit, reset],
  );
}
