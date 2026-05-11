import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';

/** SpinReel v4 — React-managed strip with multi-phase RAF animation.
 *
 *  KEY FIX from v3: the spinning strip and the resting strip are now
 *  the SAME div, rendered through React with the SAME renderCell prop.
 *  v3 used innerHTML manipulation during spin (with emoji fallbacks)
 *  and then handed off to a separate React-rendered "rest cells" div
 *  when the spin completed — which caused every character to visibly
 *  "switch" the instant the animation finished (emoji → SVG).
 *
 *  In v4 there is no handoff. The strip's content is React state. At
 *  rest it contains 4 cells (the current symbols). During a spin it
 *  contains ~60 cells (final + slow-phase + filler + current) and is
 *  animated via CSS transform. When the spin finishes the state shrinks
 *  back to 4 cells, but because the visible cells (indices 0–3 at
 *  transform: 0) hold the final symbols and use stable keys, React
 *  keeps those DOM nodes mounted — so the user sees zero visual change
 *  between the last frame of spin and the resting state.
 *
 *  Strip composition during spin (top → bottom):
 *    FINAL   (4 cells)    — the actual result, revealed last
 *    SLOW    (6–14 cells) — pass slowly during deceleration; readable
 *    FILLER  (30+ cells)  — blur past during the constant phase
 *    CURRENT (4 cells)    — initial visible cells, at the bottom
 *
 *  Animation phases (per-reel, requestAnimationFrame driven):
 *    1. SPIN-UP   (~150ms, easeOutCubic): accelerate from 0 to top speed
 *    2. CONSTANT  (~600–1000ms, linear):  true constant velocity
 *    3. SLOW-DOWN (~500ms, power-5..9):   single smooth curve, no jitter
 *    4. SETTLE    (~60ms, sine):          1.5px downward bounce
 *
 *  Position goes from startPosition (negative, far above) to 0 over the
 *  course of the animation. Motion blur (vertical-only SVG filter)
 *  applies during the fast phases via the .bj-spinning class. */

export type ReelSymbolId = string;

export type SpinOptions = {
  durationMs: number;
  anticipation?: boolean;
  cellHeight: number;
  cellGap: number;
  /** Optional per-reel tuning. Defaults derived from durationMs. */
  spinUpMs?: number;
  slowDownMs?: number;
  topSpeed?: number;
  slowDownExponent?: number;
  slowPhaseCells?: number;
  reelIndex?: number;
};

export type SpinReelHandle = {
  spin: (final: ReelSymbolId[], options: SpinOptions) => Promise<void>;
};

const ROWS = 4;

export const SpinReel = forwardRef<SpinReelHandle, {
  reelIndex: number;
  symbols: ReelSymbolId[];
  winningRows: ReadonlySet<number>;
  activeWinRow: number | null;
  igniteRows: ReadonlySet<number>;
  renderCell: (symbolId: ReelSymbolId) => ReactNode;
  fillerPool: ReelSymbolId[];
  showAnticipationGlow?: boolean;
}>(function SpinReel(
  { reelIndex, symbols, winningRows, activeWinRow, igniteRows, renderCell, fillerPool, showAnticipationGlow },
  ref,
) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripContent, setStripContent] = useState<ReelSymbolId[]>(symbols);
  const [spinning, setSpinning] = useState(false);
  // Refs let spin() read the freshest props without rebinding the callback.
  const symbolsRef = useRef(symbols);
  const fillerPoolRef = useRef(fillerPool);
  symbolsRef.current = symbols;
  fillerPoolRef.current = fillerPool;

  // Mirror the symbols prop into the resting strip whenever it changes
  // while we're not actively spinning (e.g., grid updated externally).
  useEffect(() => {
    if (!spinning) setStripContent(symbols);
  }, [symbols, spinning]);

  const spin = useCallback(async (final: ReelSymbolId[], opts: SpinOptions) => {
    const strip = stripRef.current;
    if (!strip) return;

    const { cellHeight, cellGap, anticipation = false } = opts;
    const reelIdx = opts.reelIndex ?? 0;
    const stride = cellHeight + cellGap;

    // ── Phase timing ─────────────────────────────────────────────────
    const spinUpMs = opts.spinUpMs ?? Math.min(150, Math.max(40, opts.durationMs * 0.10));
    const slowDownMs = opts.slowDownMs ?? (anticipation
      ? Math.max(1800, opts.durationMs * 0.55)
      : Math.max(450, opts.durationMs * 0.35));
    const constantMs = Math.max(60, opts.durationMs - spinUpMs - slowDownMs);

    // Reel 5 is slightly heavier (more deceleration = more tension).
    const topSpeed = opts.topSpeed ?? (2800 + reelIdx * 100);
    // Single high-exponent curve — avoids the two-phase artifact (jitter).
    const slowDownExponent = opts.slowDownExponent ??
      (anticipation ? 9 : 5 + Math.min(2, reelIdx * 0.4));
    const slowPhaseCells = opts.slowPhaseCells ?? (anticipation ? 14 : 7);

    // ── Strip composition ────────────────────────────────────────────
    const fastDistance = (topSpeed * constantMs) / 1000 + (topSpeed / 2 * spinUpMs) / 1000;
    const fillerCount = Math.max(20, Math.ceil(fastDistance / stride) + 4);

    const pool = fillerPoolRef.current;
    const filler: ReelSymbolId[] = [];
    for (let i = 0; i < fillerCount; i++) {
      filler.push(pool[Math.floor(Math.random() * pool.length)]!);
    }
    const slowPhase: ReelSymbolId[] = [];
    for (let i = 0; i < slowPhaseCells; i++) {
      // Inject piñatas during anticipation slow-down for "heartbeat" near-miss moments.
      if (anticipation && pool.includes('pinata') && (i === 3 || i === 6 || i === 9)) {
        slowPhase.push('pinata');
      } else {
        slowPhase.push(pool[Math.floor(Math.random() * pool.length)]!);
      }
    }

    // Top → bottom: FINAL (top, revealed last) → SLOW → FILLER → CURRENT (bottom, visible first)
    const fullStrip = [...final, ...slowPhase, ...filler, ...symbolsRef.current];

    // Push the long strip into state. Wait one frame for React to commit.
    setSpinning(true);
    setStripContent(fullStrip);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    try {
      const totalCells = fullStrip.length;
      const startPosition = -(totalCells - ROWS) * stride;
      const endPosition = 0;
      const slowDownStartPosition = endPosition - slowPhaseCells * stride;

      strip.style.transition = 'none';
      strip.style.transform = `translate3d(0, ${startPosition}px, 0)`;
      strip.classList.remove('bj-spinning', 'bj-slowing');
      void strip.offsetHeight; // force reflow before animating

      await phaseSpinUp(strip, startPosition, spinUpMs, topSpeed);

      const constantStartPos = startPosition + (topSpeed / 2 * spinUpMs) / 1000;
      await phaseConstant(strip, constantStartPos, constantMs, topSpeed, slowDownStartPosition);

      const currentPos = readCurrentY(strip);
      await phaseSlowDown(strip, currentPos, endPosition, slowDownMs, slowDownExponent);

      await phaseSettle(strip, endPosition);

      // Strip sits at transform: 0 with the FINAL cells filling indices 0–3.
      // Shrink state back to those 4 cells. React keeps the DOM nodes at
      // keys 0–3 mounted (same content, same keys) so there is no visual
      // jump — the off-screen cells beneath simply unmount.
      strip.style.transform = 'translate3d(0, 0, 0)';
      strip.classList.remove('bj-spinning', 'bj-slowing');
      setStripContent(final);
    } finally {
      setSpinning(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  return (
    <div className="spin-reel" data-reel={reelIndex}>
      <div className="spin-reel-strip" ref={stripRef}>
        {stripContent.map((sym, i) => {
          // Win / ignite highlights only apply at rest. While spinning,
          // most cells are off-screen and the visible window changes
          // every frame — applying highlights then would be incorrect
          // and would also flash on the off-screen filler cells.
          const isStatic = !spinning && i < ROWS;
          const isWinning = isStatic && winningRows.has(i);
          const isActiveWin = isStatic && activeWinRow === i;
          const isIgniting = isStatic && igniteRows.has(i);

          const classes = ['bj-spin-cell'];
          if (isWinning) classes.push('bj-cell-winning');
          if (isActiveWin) classes.push('bj-cell-active-win');
          if (isIgniting) classes.push('bj-cell-igniting');

          return (
            <div key={i} className={classes.join(' ')} data-symbol-id={sym}>
              <span className="bj-spin-glyph">{renderCell(sym)}</span>
            </div>
          );
        })}
      </div>

      {showAnticipationGlow && <div className="bj-anticipation-glow" />}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
//  Multi-phase RAF animation
// ═══════════════════════════════════════════════════════════════════════

function phaseSpinUp(
  strip: HTMLDivElement,
  startPos: number,
  durationMs: number,
  topSpeed: number,
): Promise<void> {
  return new Promise(resolve => {
    strip.classList.add('bj-spinning');
    const startTime = performance.now();
    const distance = (topSpeed / 2) * (durationMs / 1000);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const y = startPos + eased * distance;
      strip.style.transform = `translate3d(0, ${y}px, 0)`;

      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function phaseConstant(
  strip: HTMLDivElement,
  startPos: number,
  durationMs: number,
  topSpeed: number,
  slowDownStartPos: number,
): Promise<void> {
  return new Promise(resolve => {
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const y = startPos + (topSpeed * elapsed) / 1000;

      // If we've reached the slow-down start position, hand off cleanly.
      if (y >= slowDownStartPos) {
        strip.style.transform = `translate3d(0, ${slowDownStartPos}px, 0)`;
        resolve();
        return;
      }

      strip.style.transform = `translate3d(0, ${y}px, 0)`;

      if (elapsed < durationMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function phaseSlowDown(
  strip: HTMLDivElement,
  startPos: number,
  endPos: number,
  durationMs: number,
  exponent: number,
): Promise<void> {
  return new Promise(resolve => {
    strip.classList.remove('bj-spinning');
    strip.classList.add('bj-slowing');

    const startTime = performance.now();
    const distance = endPos - startPos;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      // Single high-exponent curve — no velocity discontinuity, no jitter.
      const eased = 1 - Math.pow(1 - t, exponent);
      const y = startPos + distance * eased;
      strip.style.transform = `translate3d(0, ${y}px, 0)`;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        strip.style.transform = `translate3d(0, ${endPos}px, 0)`;
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

function phaseSettle(strip: HTMLDivElement, finalPos: number): Promise<void> {
  return new Promise(resolve => {
    const overshoot = 1.5;
    const durationMs = 60;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const bounce = Math.sin(t * Math.PI) * overshoot;
      strip.style.transform = `translate3d(0, ${finalPos + bounce}px, 0)`;

      if (t < 1) requestAnimationFrame(tick);
      else {
        strip.style.transform = `translate3d(0, ${finalPos}px, 0)`;
        strip.classList.remove('bj-slowing');
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

function readCurrentY(strip: HTMLDivElement): number {
  const transform = strip.style.transform;
  const m = transform.match(/translate3d\(\s*0\s*,\s*(-?[\d.]+)px/);
  return m ? parseFloat(m[1]!) : 0;
}
