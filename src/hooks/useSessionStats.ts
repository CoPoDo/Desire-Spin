import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';
import { isCount, isNonNegativeNumber, isRecord, MAX_MONEY, moneyCents, normalizeMoney } from '../lib/accounting';

const KEY = 'session-stats';

export type SessionStats = {
  /** Start of the current tracking period; persists until the user resets it. */
  startedAt: number;
  spins: number;
  freeSpinsTriggered: number;
  totalWagered: number;
  totalWon: number;
  biggestWin: number;
  biggestMultiplier: number;
};

export const blankStats = (now = Date.now()): SessionStats => ({
  startedAt: now,
  spins: 0,
  freeSpinsTriggered: 0,
  totalWagered: 0,
  totalWon: 0,
  biggestWin: 0,
  biggestMultiplier: 0,
});

/** Repair damaged fields without wiping independent, valid existing totals. */
export function normalizeStats(value: unknown, now = Date.now()): SessionStats {
  if (!isRecord(value)) return blankStats(now);
  return {
    startedAt: isCount(value.startedAt) && value.startedAt > 0 && value.startedAt <= now ? value.startedAt : now,
    spins: isCount(value.spins) ? value.spins : 0,
    freeSpinsTriggered: isCount(value.freeSpinsTriggered) ? value.freeSpinsTriggered : 0,
    totalWagered: normalizeMoney(value.totalWagered),
    totalWon: normalizeMoney(value.totalWon),
    biggestWin: normalizeMoney(value.biggestWin),
    biggestMultiplier: isNonNegativeNumber(value.biggestMultiplier) ? value.biggestMultiplier : 0,
  };
}

export function useSessionStats() {
  const [stats, setStats] = useState(() => normalizeStats(loadJson<unknown>(KEY, null)));
  const ref = useRef(stats);
  useEffect(() => { saveJson(KEY, ref.current); }, []);

  const commit = useCallback((next: SessionStats) => {
    ref.current = next;
    saveJson(KEY, next);
    setStats(next);
  }, []);

  /** One completed round/spin. For free spins pass payout / the base stake as
   *  multiplier; a zero-cost round alone has no meaningful payout/cost ratio. */
  const recordSpin = useCallback((wagered: number, won: number, hadFreeSpins: boolean, multiplier?: number): boolean => {
    const wagerCents = moneyCents(wagered);
    const wonCents = moneyCents(won);
    if (wagerCents === null || wonCents === null || (multiplier !== undefined && !isNonNegativeNumber(multiplier))) return false;
    const s = ref.current;
    const ratio = multiplier ?? (wagerCents > 0 ? wonCents / wagerCents : 0);
    commit({
      ...s,
      spins: Math.min(Number.MAX_SAFE_INTEGER, s.spins + 1),
      freeSpinsTriggered: Math.min(Number.MAX_SAFE_INTEGER, s.freeSpinsTriggered + (hadFreeSpins ? 1 : 0)),
      totalWagered: Math.min(MAX_MONEY, (Math.round(s.totalWagered * 100) + wagerCents) / 100),
      totalWon: Math.min(MAX_MONEY, (Math.round(s.totalWon * 100) + wonCents) / 100),
      biggestWin: Math.max(s.biggestWin, wonCents / 100),
      biggestMultiplier: Math.max(s.biggestMultiplier, ratio),
    });
    return true;
  }, [commit]);

  const reset = useCallback(() => commit(blankStats()), [commit]);

  return useMemo(() => ({ stats, recordSpin, reset }), [stats, recordSpin, reset]);
}
