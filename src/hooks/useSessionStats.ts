import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

const KEY = 'session-stats';

export type SessionStats = {
  /** ISO timestamp of session start (used to identify if a new browser tab
   *  is a new session; we treat each page load as a session for simplicity). */
  startedAt: number;
  spins: number;
  freeSpinsTriggered: number;
  totalWagered: number;
  totalWon: number;
  biggestWin: number;
  biggestMultiplier: number;
};

const blankStats = (): SessionStats => ({
  startedAt: Date.now(),
  spins: 0,
  freeSpinsTriggered: 0,
  totalWagered: 0,
  totalWon: 0,
  biggestWin: 0,
  biggestMultiplier: 0,
});

/** Tracks session-wide stats: spins played, wagered, won, biggest single win.
 *  Persisted across reloads in localStorage; user can reset via the menu. */
export function useSessionStats() {
  const [stats, setStats] = useState<SessionStats>(() =>
    loadJson<SessionStats | null>(KEY, null) ?? blankStats(),
  );

  useEffect(() => saveJson(KEY, stats), [stats]);

  const recordSpin = useCallback((wagered: number, won: number, hadFreeSpins: boolean) => {
    setStats((s) => {
      const ratio = won / Math.max(wagered, 0.01);
      return {
        ...s,
        spins: s.spins + 1,
        freeSpinsTriggered: s.freeSpinsTriggered + (hadFreeSpins ? 1 : 0),
        totalWagered: +(s.totalWagered + wagered).toFixed(2),
        totalWon: +(s.totalWon + won).toFixed(2),
        biggestWin: Math.max(s.biggestWin, won),
        biggestMultiplier: Math.max(s.biggestMultiplier, ratio),
      };
    });
  }, []);

  const reset = useCallback(() => setStats(blankStats()), []);

  return useMemo(() => ({ stats, recordSpin, reset }), [stats, recordSpin, reset]);
}
