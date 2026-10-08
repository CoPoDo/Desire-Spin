import { useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

export const PLAY_SESSION_LOCK = 'desire-spin:play-session:v1';
type Status = 'waiting' | 'active' | 'paused' | 'unsupported' | 'failed';

/**
 * Exactly one participating document can mount the game state and recover its
 * journals. Storage events alone cannot serialize read/modify/write operations
 * or a settlement spanning balance, history, and statistics.
 *
 * Do not expire or steal this lock: an idle/background owner may have an active
 * interactive round. Closing/navigating away releases it after local cleanup.
 */
export function PlaySessionGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('waiting');

  useEffect(() => {
    let manager: LockManager | undefined;
    try { manager = navigator.locks; } catch { /* A browser policy can deny access. */ }
    if (!manager || typeof manager.request !== 'function') {
      setStatus('unsupported');
      return;
    }

    let disposed = false;
    let hidden = false;
    let generation = 0;
    let controller: AbortController | undefined;
    let release: (() => void) | undefined;

    const stop = () => {
      generation++;
      controller?.abort();
      controller = undefined;
      release?.();
      release = undefined;
    };
    const acquire = () => {
      const requestGeneration = ++generation;
      controller = new AbortController();
      setStatus('waiting');
      const failed = () => {
        if (!disposed && requestGeneration === generation) setStatus('failed');
      };
      try {
        void manager.request(PLAY_SESSION_LOCK, { mode: 'exclusive', signal: controller.signal }, async () => {
          if (disposed || hidden || requestGeneration !== generation) return;
          await new Promise<void>((resolve) => {
            release = resolve;
            setStatus('active');
          });
        }).catch(failed);
      } catch { failed(); }
    };
    const onPageHide = () => {
      hidden = true;
      // Finish child cleanup/settlement synchronously while still owning the
      // lock. A BFCache restore must mount a fresh tree after reacquiring it.
      flushSync(() => setStatus('paused'));
      stop();
    };
    const onPageShow = () => {
      if (!hidden || disposed) return;
      hidden = false;
      acquire();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    acquire();
    return () => {
      disposed = true;
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      // Resolving schedules release after this synchronous unmount's child
      // effect cleanups, before a different document is granted the lock.
      stop();
    };
  }, []);

  if (status === 'active') return children;
  const unavailable = status === 'unsupported' || status === 'failed';
  return (
    <main className="min-h-dvh grid place-items-center bg-bg px-6 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-edge bg-bg-elev p-7 text-center" role="status" aria-live="polite" aria-atomic="true">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-accent">Desire Spin · Play money</p>
        <h1 className="mb-3 text-xl font-bold">
          {unavailable ? 'Safe play is unavailable in this browser' : status === 'paused' ? 'Play paused' : 'Waiting for your play session'}
        </h1>
        <p className="text-sm leading-relaxed text-ink-dim">
          {unavailable
            ? 'Your saved data has not been changed. Open this site over HTTPS in a current version of Chrome, Edge, Firefox, or Safari with Web Locks support, then try again.'
            : status === 'paused'
              ? 'Your active round has been closed. This page will check for a free play session when you return.'
              : 'Only one Desire Spin tab can play at a time to protect your credits and round history. Close the other Desire Spin tab or window. This page will continue automatically when it is available.'}
        </p>
        {unavailable && <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-5">Try again</button>}
      </section>
    </main>
  );
}
