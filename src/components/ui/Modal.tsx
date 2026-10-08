import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

/** A portalled, keyboard-contained sheet. Background game shortcuts are paused. */
export function Modal({ open, onClose, title, children, width = 'md' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((item) => !item.hidden && item.getAttribute('aria-hidden') !== 'true');
      if (!items.length) { event.preventDefault(); dialogRef.current?.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', containFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', containFocus);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  const widthCls = width === 'sm' ? 'max-w-md' : width === 'lg' ? 'max-w-3xl' : 'max-w-xl';
  return createPortal(
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }}>
        <div aria-hidden="true" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
        <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`relative w-full ${widthCls} card p-0 max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] flex flex-col rounded-b-none sm:rounded-b-2xl`} initial={reducedMotion ? { opacity: 0 } : { y: 20, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-edge shrink-0">
            <h2 id={titleId} className="font-display font-bold text-lg">{title}</h2>
            <button type="button" aria-label="Close dialog" className="text-ink-dim hover:text-ink w-11 h-11 shrink-0 rounded-lg hover:bg-bg-hover" onClick={onClose}>✕</button>
          </div>
          <div className="overflow-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>, document.body,
  );
}
