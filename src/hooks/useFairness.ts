import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';
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
  const [state, setState] = useState(() => normalizeFairness(loadJson<unknown>(KEY, null)));
  const ref = useRef(state);
  useEffect(() => { saveJson(KEY, ref.current); }, []);

  const commit = useCallback((next: FairnessState) => {
    ref.current = next;
    saveJson(KEY, next);
    setState(next);
  }, []);

  const setClientSeed = useCallback((clientSeed: string) => {
    const trimmed = clientSeed.trim();
    if (trimmed.length > 1024) return false;
    commit({ ...ref.current, current: { ...ref.current.current, clientSeed: trimmed || generateClientSeed() } });
    return true;
  }, [commit]);

  /** Synchronous snapshot, durably consumed before a game computes its outcome. */
  const consumeNonce = useCallback((): Seeds => {
    if (ref.current.current.nonce >= Number.MAX_SAFE_INTEGER - 1) {
      throw new Error('This seed has no nonces left. Rotate the local seed to continue.');
    }
    const snapshot = { ...ref.current.current };
    commit({ ...ref.current, current: { ...snapshot, nonce: snapshot.nonce + 1 } });
    return snapshot;
  }, [commit]);

  const rotate = useCallback(() => {
    const serverSeed = generateServerSeed();
    commit({
      current: { serverSeed, clientSeed: ref.current.current.clientSeed, nonce: 0 },
      currentHash: sha256Hex(serverSeed),
      previous: { ...ref.current.current, revealed: true },
    });
  }, [commit]);

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
