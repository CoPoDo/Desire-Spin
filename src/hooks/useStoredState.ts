import { useCallback, useEffect, useRef, useState } from 'react';
import { readStorageSnapshot, saveJson, subscribeStorage } from '../lib/storage';

function parse(raw: string | null | undefined): unknown {
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Keep mounted state in sync with the latest saved value. This is not a
 * cross-document transaction: PlaySessionGuard supplies exclusive ownership
 * before the game tree mounts. Reading before mutation also protects stale
 * callbacks/duplicate providers without relying on storage-event timing.
 */
export function useStoredState<T>(key: string, normalize: (value: unknown) => T) {
  const normalizer = useRef(normalize);
  normalizer.current = normalize;
  const [initial] = useState(() => {
    const raw = readStorageSnapshot(key);
    return { raw, value: normalize(parse(raw)) };
  });
  const ref = useRef(initial);
  const [state, setState] = useState(initial.value);

  const read = useCallback((): T => {
    const raw = readStorageSnapshot(key);
    // Undefined means unavailable, not missing. Keep the in-memory session
    // intact if storage becomes blocked or a write fails due to its quota.
    if (raw !== undefined && raw !== ref.current.raw) {
      const value = normalizer.current(parse(raw));
      ref.current = { raw, value };
    }
    return ref.current.value;
  }, [key]);

  const commit = useCallback((value: T) => {
    // Update the ref before notifying any other instance in this document.
    ref.current.value = value;
    saveJson(key, value);
    const raw = readStorageSnapshot(key);
    if (raw !== undefined) ref.current.raw = raw;
    ref.current.value = value;
    setState(ref.current.value);
  }, [key]);

  useEffect(() => {
    // Children can recover a journal before this effect runs. Re-read the
    // saved value rather than persisting the initial render's stale snapshot.
    commit(read());
    return subscribeStorage(key, () => { setState(read()); });
  }, [key, read, commit]);

  return [state, read, commit] as const;
}
