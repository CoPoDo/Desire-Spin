/** Imperative coin-fly animation per bible Part 8.9.
 *
 *  On Win resolution, each coin element flies from its bonus-grid cell
 *  to the win-tally display. On Boost resolution, coins stream into
 *  the centre money bag. Both are implemented here as cloned DOM
 *  elements with `position: fixed`, animated via a CSS transition on
 *  `transform` and `opacity`.
 *
 *  Why imperative (not React/framer): the flying coin is a transient
 *  visual that exists for ~600 ms. Creating React-managed elements
 *  for short-lived animations adds reconciliation cost on every frame.
 *  A raw cloneNode + style mutation pattern keeps the animation off
 *  React's render path entirely. */

export type FlyOptions = {
  /** Glyph + value caption shown on the flying coin. */
  glyph: string;
  value: number;
  /** Optional pixel scale at destination (default 0.4). */
  endScale?: number;
  /** Optional rotation at destination, degrees. */
  endRotate?: number;
  /** Animation duration in ms (default 600). */
  durationMs?: number;
};

/** Fly a coin from source rect → target rect. Returns a Promise that
 *  resolves on transition end. */
export function flyCoin(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  opts: FlyOptions,
): Promise<void> {
  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const flyEl = document.createElement('div');
  flyEl.className = 'bj-flying-coin';
  flyEl.style.left = `${sourceRect.left + sourceRect.width / 2}px`;
  flyEl.style.top = `${sourceRect.top + sourceRect.height / 2}px`;
  // translate(-50%, -50%) so positions are centre-anchored
  flyEl.style.transform = 'translate(-50%, -50%)';

  flyEl.innerHTML =
    `<div class="bj-flying-coin-glyph">${opts.glyph}</div>` +
    `<div class="bj-flying-coin-value">${opts.value.toFixed(2)}×</div>`;

  document.body.appendChild(flyEl);

  const durationMs = opts.durationMs ?? 600;
  flyEl.style.transitionDuration = `${durationMs}ms, ${durationMs}ms`;

  return new Promise<void>((resolve) => {
    // Force reflow so the transition is applied to the upcoming
    // transform change, not batched with the initial position (the
    // same reflow trick used for the reel strip — see bible Bug #1).
    void flyEl.offsetHeight;

    const dx = (targetRect.left + targetRect.width / 2) - (sourceRect.left + sourceRect.width / 2);
    const dy = (targetRect.top + targetRect.height / 2) - (sourceRect.top + sourceRect.height / 2);
    const scale = opts.endScale ?? 0.4;
    const rot = opts.endRotate ?? 0;
    flyEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale}) rotate(${rot}deg)`;
    flyEl.style.opacity = '0';

    setTimeout(() => {
      flyEl.remove();
      resolve();
    }, durationMs + 40);
  });
}
