import { createContext, useContext } from 'react';
import { useBalance } from './hooks/useBalance';
import { useFairness } from './hooks/useFairness';
import { useBetHistory } from './hooks/useBetHistory';
import { useSound } from './hooks/useSound';

export type GameContextValue = {
  balance: ReturnType<typeof useBalance>;
  fairness: ReturnType<typeof useFairness>;
  history: ReturnType<typeof useBetHistory>;
  sound: ReturnType<typeof useSound>;
};

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <Layout>');
  return ctx;
}
