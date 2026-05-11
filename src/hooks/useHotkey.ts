import { useEffect, useRef } from 'react';

/** Listen for a single keystroke and fire the handler. Skips when the
 *  user is typing into an input/textarea so Space doesn't trigger a
 *  bet while they're editing the bet amount.
 *
 *  Real Stake supports Space-to-bet on most games — this is the
 *  shared implementation. */
export function useHotkey(key: string, handler: () => void, enabled = true) {
  // Latest handler via ref so re-mounting the listener isn't needed
  // on every state change.
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      // Don't fire when focused inside an input/textarea/select — let
      // the user type freely. contenteditable elements report tagName
      // as their underlying tag, so we also check isContentEditable.
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (t.isContentEditable) return;
      }
      e.preventDefault();
      handlerRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, enabled]);
}
