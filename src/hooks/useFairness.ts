import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';
import {
  Seeds,
  generateClientSeed,
  generateServerSeed,
  sha256Hex,
} from '../lib/fairness';

const KEY = 'fairness';

type FairnessState = {
  current: Seeds;
  currentHash: string;
  /** Last revealed (rotated-out) server seed pair, for verification UX. */
  previous?: Seeds & { revealed: true };
};

function makeFresh(): FairnessState {
  const serverSeed = generateServerSeed();
  return {
    current: { serverSeed, clientSeed: generateClientSeed(), nonce: 0 },
    currentHash: sha256Hex(serverSeed),
  };
}

export function useFairness() {
  const [state, setState] = useState<FairnessState>(() =>
    loadJson<FairnessState | null>(KEY, null) ?? makeFresh(),
  );

  useEffect(() => {
    saveJson(KEY, state);
  }, [state]);

  const setClientSeed = useCallback((clientSeed: string) => {
    setState((s) => ({
      ...s,
      current: { ...s.current, clientSeed: clientSeed.trim() || generateClientSeed() },
    }));
  }, []);

  /** Increment nonce — call once per bet committed. Returns the seeds for that bet. */
  const consumeNonce = useCallback((): Seeds => {
    let snapshot: Seeds | null = null;
    setState((s) => {
      snapshot = { ...s.current };
      return { ...s, current: { ...s.current, nonce: s.current.nonce + 1 } };
    });
    return snapshot!;
  }, []);

  /** Reveal current server seed and rotate to a new one. */
  const rotate = useCallback(() => {
    setState((s) => {
      const newServer = generateServerSeed();
      return {
        current: {
          serverSeed: newServer,
          clientSeed: s.current.clientSeed,
          nonce: 0,
        },
        currentHash: sha256Hex(newServer),
        previous: { ...s.current, revealed: true },
      };
    });
  }, []);

  /** Wipe and start fresh. */
  const resetSeeds = useCallback(() => {
    setState(makeFresh());
  }, []);

  const view = useMemo(
    () => ({
      seeds: state.current,
      hash: state.currentHash,
      previous: state.previous,
    }),
    [state],
  );

  return { ...view, setClientSeed, consumeNonce, rotate, resetSeeds };
}
