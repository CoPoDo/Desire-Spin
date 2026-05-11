import { useCallback, useEffect, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

/** Persist the bet amount per game so returning players land back on
 *  the size they were last using. Real-casino expectation: every game
 *  remembers your stake between sessions. */
export function usePersistedBet(gameKey: string, fallback: number) {
  const key = `bet:${gameKey}`;
  const [bet, setBetRaw] = useState<number>(() => {
    const v = loadJson<number>(key, fallback);
    return typeof v === 'number' && isFinite(v) && v > 0 ? v : fallback;
  });

  useEffect(() => {
    saveJson(key, bet);
  }, [key, bet]);

  const setBet = useCallback((v: number) => {
    setBetRaw(v);
  }, []);

  return [bet, setBet] as const;
}
