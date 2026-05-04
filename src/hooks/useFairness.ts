import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // Authoritative copy for synchronous reads (setState updater timing in React
  // 18 makes it unsafe to assume the updater has run before the call returns).
  const ref = useRef<FairnessState>(state);
  // Keep ref in sync whenever state changes from anywhere.
  useEffect(() => {
    ref.current = state;
  }, [state]);

  useEffect(() => {
    saveJson(KEY, state);
  }, [state]);

  const setClientSeed = useCallback((clientSeed: string) => {
    const trimmed = clientSeed.trim() || generateClientSeed();
    ref.current = { ...ref.current, current: { ...ref.current.current, clientSeed: trimmed } };
    setState(ref.current);
  }, []);

  /**
   * Increment nonce — call once per bet committed. Returns the seeds *as used
   * by this bet* (i.e. the nonce value the engine should sign with). Reads
   * and mutates a ref so we get a synchronous, race-free snapshot regardless
   * of React's batching / StrictMode behavior.
   */
  const consumeNonce = useCallback((): Seeds => {
    const snapshot: Seeds = { ...ref.current.current };
    ref.current = {
      ...ref.current,
      current: { ...ref.current.current, nonce: ref.current.current.nonce + 1 },
    };
    setState(ref.current);
    return snapshot;
  }, []);

  /** Reveal current server seed and rotate to a new one. */
  const rotate = useCallback(() => {
    const newServer = generateServerSeed();
    const next: FairnessState = {
      current: {
        serverSeed: newServer,
        clientSeed: ref.current.current.clientSeed,
        nonce: 0,
      },
      currentHash: sha256Hex(newServer),
      previous: { ...ref.current.current, revealed: true },
    };
    ref.current = next;
    setState(next);
  }, []);

  /** Wipe and start fresh. */
  const resetSeeds = useCallback(() => {
    const fresh = makeFresh();
    ref.current = fresh;
    setState(fresh);
  }, []);

  const view = useMemo(
    () => ({
      seeds: state.current,
      hash: state.currentHash,
      previous: state.previous,
    }),
    [state],
  );

  return useMemo(
    () => ({ ...view, setClientSeed, consumeNonce, rotate, resetSeeds }),
    [view, setClientSeed, consumeNonce, rotate, resetSeeds],
  );
}
