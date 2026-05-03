import { useCallback, useEffect, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

export type BetRecord = {
  id: string;
  game: string;
  bet: number;
  payout: number;
  multiplier: number;
  ts: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
};

const KEY = 'bet-history';
const MAX = 50;

export function useBetHistory() {
  const [history, setHistory] = useState<BetRecord[]>(() =>
    loadJson<BetRecord[]>(KEY, []),
  );

  useEffect(() => {
    saveJson(KEY, history);
  }, [history]);

  const record = useCallback((entry: Omit<BetRecord, 'id' | 'ts'>) => {
    const id = Math.random().toString(36).slice(2, 10);
    const item: BetRecord = { ...entry, id, ts: Date.now() };
    setHistory((h) => [item, ...h].slice(0, MAX));
  }, []);

  const clear = useCallback(() => setHistory([]), []);

  return { history, record, clear };
}
