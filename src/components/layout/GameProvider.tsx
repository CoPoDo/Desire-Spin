import { ReactNode } from 'react';
import { useBalance } from '../../hooks/useBalance';
import { useFairness } from '../../hooks/useFairness';
import { useBetHistory } from '../../hooks/useBetHistory';
import { useSound } from '../../hooks/useSound';
import { GameContext } from '../../game-context';

/** Provides game-wide state (balance, fairness, history, sound) without any
 *  visual chrome. Used by both Layout (lobby/settings) and SlotPageLayout
 *  (full-screen immersive game pages). */
export function GameProvider({ children }: { children: ReactNode }) {
  const balance = useBalance();
  const fairness = useFairness();
  const history = useBetHistory();
  const sound = useSound();
  return (
    <GameContext.Provider value={{ balance, fairness, history, sound }}>
      {children}
    </GameContext.Provider>
  );
}
