import { ReactNode } from 'react';
import { useBalance } from '../../hooks/useBalance';
import { useFairness } from '../../hooks/useFairness';
import { useBetHistory } from '../../hooks/useBetHistory';
import { useSound } from '../../hooks/useSound';
import { useSessionStats } from '../../hooks/useSessionStats';
import { useFavorites } from '../../hooks/useFavorites';
import { GameContext } from '../../game-context';

/** Provides game-wide state (balance, fairness, history, sound, sessionStats)
 *  without any visual chrome. Used by both Layout (lobby/settings) and
 *  SlotPageLayout (full-screen immersive game pages). */
export function GameProvider({ children }: { children: ReactNode }) {
  const balance = useBalance();
  const fairness = useFairness();
  const history = useBetHistory();
  const sound = useSound();
  const session = useSessionStats();
  const favorites = useFavorites();
  return (
    <GameContext.Provider value={{ balance, fairness, history, sound, session, favorites }}>
      {children}
    </GameContext.Provider>
  );
}
