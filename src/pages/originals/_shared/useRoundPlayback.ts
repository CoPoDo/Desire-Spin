import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** A synchronous interaction lock and cancellable cosmetic playback.
 * Resolve deterministic accounting before starting playback, so leaving a
 * game never strands a wager. Cancellation only stops pictures and sounds. */
export function useRoundPlayback() {
  const [busy, updateBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const timers = useRef(new Map<ReturnType<typeof setTimeout>, (() => void) | undefined>());

  const setBusy = useCallback((next: boolean) => {
    busyRef.current = next;
    if (mounted.current) updateBusy(next);
  }, []);

  const schedule = useCallback((callback: () => void, milliseconds: number, onCancel?: () => void) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      if (mounted.current) callback();
      else onCancel?.();
    }, milliseconds);
    timers.current.set(timer, onCancel);
    return timer;
  }, []);

  const wait = useCallback((milliseconds: number) => new Promise<boolean>((resolve) => {
    if (!mounted.current) { resolve(false); return; }
    schedule(() => resolve(true), milliseconds, () => resolve(false));
  }), [schedule]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const [timer, onCancel] of timers.current) {
        clearTimeout(timer);
        onCancel?.();
      }
      timers.current.clear();
    };
  }, []);

  return useMemo(() => ({ busy, busyRef, setBusy, schedule, wait, mounted }), [busy, setBusy, schedule, wait]);
}
