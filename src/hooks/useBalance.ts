import { useCallback, useEffect, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

const KEY = 'balance';
const DEFAULT_BALANCE = 1000;

export function useBalance() {
  const [balance, setBalance] = useState<number>(() =>
    loadJson<number>(KEY, DEFAULT_BALANCE),
  );

  useEffect(() => {
    saveJson(KEY, balance);
  }, [balance]);

  const debit = useCallback((amount: number) => {
    setBalance((b) => Math.max(0, +(b - amount).toFixed(2)));
  }, []);

  const credit = useCallback((amount: number) => {
    setBalance((b) => +(b + amount).toFixed(2));
  }, []);

  const reset = useCallback((to = DEFAULT_BALANCE) => {
    setBalance(to);
  }, []);

  return { balance, setBalance, debit, credit, reset };
}
