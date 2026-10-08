import { useCallback, useEffect, useRef, useState } from 'react';

/** Presentation is cancellable. The deterministic round settles before playback. */
export function useSlotPlayback() {
  const alive = useRef(true);
  const locked = useRef(false);
  const skipped = useRef(false);
  const pending = useRef(new Map<ReturnType<typeof setTimeout>, () => void>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const flush = useCallback(() => {
    for (const [timer, resolve] of pending.current) {
      clearTimeout(timer);
      resolve();
    }
    pending.current.clear();
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; skipped.current = true; flush(); };
  }, [flush]);
  const start = useCallback(() => {
    if (locked.current || !alive.current) return false;
    locked.current = true;
    skipped.current = false;
    setError('');
    setBusy(true);
    return true;
  }, []);
  const finish = useCallback(() => {
    locked.current = false;
    if (alive.current) setBusy(false);
  }, []);
  const skip = useCallback(() => { skipped.current = true; flush(); }, [flush]);
  const wait = useCallback((ms: number) => {
    if (!alive.current || skipped.current || ms <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => { pending.current.delete(timer); resolve(); }, ms);
      pending.current.set(timer, resolve);
    });
  }, []);
  return { alive, busy, error, setError, start, finish, skip, skipped, wait };
}
