import { createContext, useContext } from 'react';
import { useBalance } from './hooks/useBalance';
import { useFairness } from './hooks/useFairness';
import { useBetHistory } from './hooks/useBetHistory';
import { useSound } from './hooks/useSound';
import { useSessionStats } from './hooks/useSessionStats';
import { useFavorites } from './hooks/useFavorites';

export type GameContextValue = {
  balance: ReturnType<typeof useBalance>;
  fairness: ReturnType<typeof useFairness>;
  history: ReturnType<typeof useBetHistory>;
  sound: ReturnType<typeof useSound>;
  session: ReturnType<typeof useSessionStats>;
  favorites: ReturnType<typeof useFavorites>;
};

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <Layout>');
  return ctx;
}
