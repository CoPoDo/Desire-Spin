import { useCallback, useEffect, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';
import { MAX_STAKE, moneyCents } from '../lib/accounting';

/** Remember each game's stake and reject malformed/sub-cent/negative values. */
export function usePersistedBet(gameKey: string, fallback: number) {
  const key = `bet:${gameKey}`;
  const fallbackCents = moneyCents(fallback);
  const defaultBet = fallbackCents !== null && fallbackCents > 0 ? fallbackCents / 100 : 1;
  const read = () => {
    const cents = moneyCents(loadJson<unknown>(key, defaultBet));
    return cents !== null && cents > 0 ? Math.min(MAX_STAKE, cents / 100) : defaultBet;
  };
  const [state, setState] = useState(() => ({ key, bet: read() }));
  // Changing games in a reused component must not copy the old stake into the
  // new game's storage. React restarts this render before committing children.
  if (state.key !== key) setState({ key, bet: read() });
  useEffect(() => {
    if (state.key === key) saveJson(key, state.bet);
  }, [key, state]);
  const setBet = useCallback((value: number) => {
    const cents = moneyCents(value);
    if (cents === null || cents <= 0) return;
    const bet = Math.min(MAX_STAKE, cents / 100);
    saveJson(key, bet);
    setState({ key, bet });
  }, [key]);
  return [state.bet, setBet] as const;
}
