/** Animated count-up for the WIN display per bible Part 6.5.
 *
 *  Runs on requestAnimationFrame (NOT setInterval) so it syncs to the
 *  display refresh rate. Duration scales with the magnitude of the win
 *  multiplier (× bet):
 *    < 1×       → 800 ms
 *    1×  – 10×  → 1500 ms
 *    10× – 50×  → 2500 ms
 *    50× – 500× → 4000 ms
 *    500× +     → 5000 ms
 *  Caller can override with an explicit `durationMs`.
 *
 *  The DOM target element is passed in so the same helper can drive any
 *  display (base-game win pill, bonus-round tally, end-of-feature total).
 *
 *  Returns a cancel handle. Calling cancel() stops the animation and
 *  paints the current intermediate value (does not snap to final). */

export type CountUpHandle = { cancel: () => void };

export function animateCountUp(
  target: HTMLElement,
  from: number,
  to: number,
  format: (n: number) => string,
  options: { bet?: number; durationMs?: number } = {},
): Promise<void> & CountUpHandle {
  let cancelled = false;
  const bet = options.bet ?? 1;
  const mult = (to - from) / Math.max(bet, 0.01);
  const durationMs = options.durationMs ?? durationForMagnitude(mult);

  let resolve!: () => void;
  const promise = new Promise<void>((res) => { resolve = res; });

  const start = performance.now();
  function tick() {
    if (cancelled) { resolve(); return; }
    const elapsed = performance.now() - start;
    const t = Math.min(elapsed / durationMs, 1);
    // Cubic ease-out — fast start, slow finish (bible Part 6.5).
    const eased = 1 - Math.pow(1 - t, 3);
    const current = from + (to - from) * eased;
    target.textContent = format(current);
    if (t < 1) requestAnimationFrame(tick);
    else { target.textContent = format(to); resolve(); }
  }
  requestAnimationFrame(tick);

  const handle = promise as Promise<void> & CountUpHandle;
  handle.cancel = () => { cancelled = true; };
  return handle;
}

function durationForMagnitude(mult: number): number {
  const a = Math.abs(mult);
  if (a < 1) return 800;
  if (a < 10) return 1500;
  if (a < 50) return 2500;
  if (a < 500) return 4000;
  return 5000;
}
