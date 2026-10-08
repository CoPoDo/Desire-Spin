import { useEffect, useRef } from 'react';

/** Keep keyboard play outside an open sheet, then return to its opener. */
export function useDialogFocus<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]',
    ));
    (controls()[0] ?? dialog).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = controls();
      const first = elements[0] ?? dialog;
      const last = elements.at(-1) ?? dialog;
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog
          || (!event.shiftKey && document.activeElement === last)
          || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}
