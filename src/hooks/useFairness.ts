import { useCallback, useMemo } from 'react';
import { useStoredState } from './useStoredState';
import { isCount, isRecord } from '../lib/accounting';
import { type Seeds, generateClientSeed, generateServerSeed, sha256Hex } from '../lib/fairness';

const KEY = 'fairness';
export type FairnessState = {
  current: Seeds;
  currentHash: string;
  previous?: Seeds & { revealed: true };
};

function makeFresh(): FairnessState {
  const serverSeed = generateServerSeed();
  return { current: { serverSeed, clientSeed: generateClientSeed(), nonce: 0 }, currentHash: sha256Hex(serverSeed) };
}

function validSeeds(value: unknown): value is Seeds {
  return isRecord(value) && typeof value.serverSeed === 'string' && value.serverSeed.length > 0 &&
    value.serverSeed.length <= 1024 && typeof value.clientSeed === 'string' && value.clientSeed.length > 0 &&
    value.clientSeed.length <= 1024 && isCount(value.nonce) && value.nonce < Number.MAX_SAFE_INTEGER;
}

export function normalizeFairness(value: unknown): FairnessState {
  if (!isRecord(value) || !validSeeds(value.current)) return makeFresh();
  const { serverSeed, clientSeed, nonce } = value.current;
  // A saved hash is derived data; repair it without discarding valid seeds.
  const next: FairnessState = { current: { serverSeed, clientSeed, nonce }, currentHash: sha256Hex(serverSeed) };
  if (isRecord(value.previous) && value.previous.revealed === true && validSeeds(value.previous)) {
    next.previous = {
      serverSeed: value.previous.serverSeed,
      clientSeed: value.previous.clientSeed,
      nonce: value.previous.nonce,
      revealed: true,
    };
  }
  return next;
}

export function useFairness() {
  const [state, read, commit] = useStoredState(KEY, normalizeFairness);

  const setClientSeed = useCallback((clientSeed: string) => {
    const trimmed = clientSeed.trim();
    if (trimmed.length > 1024) return false;
    const current = read();
    commit({ ...current, current: { ...current.current, clientSeed: trimmed || generateClientSeed() } });
    return true;
  }, [commit, read]);

  /** Consume before computing an outcome; persistence is best-effort when storage is unavailable. */
  const consumeNonce = useCallback((): Seeds => {
    const current = read();
    if (current.current.nonce >= Number.MAX_SAFE_INTEGER - 1) {
      throw new Error('This seed has no nonces left. Rotate the local seed to continue.');
    }
    const snapshot = { ...current.current };
    commit({ ...current, current: { ...snapshot, nonce: snapshot.nonce + 1 } });
    return snapshot;
  }, [commit, read]);

  const rotate = useCallback(() => {
    const current = read();
    const serverSeed = generateServerSeed();
    commit({
      current: { serverSeed, clientSeed: current.current.clientSeed, nonce: 0 },
      currentHash: sha256Hex(serverSeed),
      previous: { ...current.current, revealed: true },
    });
  }, [commit, read]);

  const resetSeeds = useCallback(() => commit(makeFresh()), [commit]);

  return useMemo(() => ({
    seeds: state.current,
    hash: state.currentHash,
    previous: state.previous,
    setClientSeed,
    consumeNonce,
    rotate,
    resetSeeds,
  }), [state, setClientSeed, consumeNonce, rotate, resetSeeds]);
}
