import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** SpinReel v3 — true downward-scrolling slot reel.
 *
 *  Physical slot reels rotate so symbols flow DOWNWARD through the
 *  viewport (new symbols enter from the top, old symbols exit from the
 *  bottom). The previous version scrolled upward, which fights the
 *  unconscious mental model of a real slot machine.
 *
 *  Strip composition (top→bottom):
 *    FINAL   (4 cells)    — the actual result, revealed last
 *    SLOW    (6-14 cells) — pass slowly during deceleration; readable
 *    FILLER  (30+ cells)  — blur past during constant phase
 *    CURRENT (4 cells)    — currently visible cells (initial state)
 *
 *  Animation phases (per-reel, requestAnimationFrame driven):
 *    1. SPIN-UP   (~150ms, easeOutCubic): accelerate from 0 to top speed
 *    2. CONSTANT  (~600-1000ms, linear):  true constant velocity
 *    3. SLOW-DOWN (~500ms, power-5..9):   single smooth curve, no jitter
 *    4. SETTLE    (~60ms, sine):          1.5px downward bounce
 *
 *  Position goes from startPosition (negative) to 0 over the animation.
 *  Motion blur (vertical-only SVG filter) applies during fast phases.
 */

export type ReelSymbolId = string;

export type SpinOptions = {
  durationMs: number;
  anticipation?: boolean;
  fillerCount?: number;
  cellHeight: number;
  cellGap: number;
  /** Optional per-reel tuning. Defaults derived from durationMs. */
  spinUpMs?: number;
  slowDownMs?: number;
  topSpeed?: number;
  slowDownExponent?: number;
  slowPhaseCells?: number;
  reelIndex?: number;
  /** Skip RAF movement while still handing off the deterministic final grid. */
  instant?: boolean;
};

export type SpinReelHandle = {
  spin: (final: ReelSymbolId[], options: SpinOptions) => Promise<void>;
  stop: () => void;
};

const ROWS = 4;

export const SpinReel = forwardRef<SpinReelHandle, {
  reelIndex: number;
  symbols: ReelSymbolId[];
  winningRows: ReadonlySet<number>;
  activeWinRow: number | null;
  igniteRows: ReadonlySet<number>;
  renderCell: (symbolId: ReelSymbolId) => ReactNode;
  fillerPool: readonly ReelSymbolId[];
  showAnticipationGlow?: boolean;
}>(function SpinReel(
  { reelIndex, symbols, winningRows, activeWinRow, igniteRows, renderCell, fillerPool, showAnticipationGlow },
  ref,
) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeSpinRef = useRef<AbortController | null>(null);
  const [spinning, setSpinning] = useState(false);
  // Keep the just-landed column locally until React promotes the complete
  // result grid. Without this hand-off, an early reel briefly showed its
  // previous symbols while the remaining reels were still decelerating.
  const [settledSymbols, setSettledSymbols] = useState<ReelSymbolId[]>(symbols);

  useEffect(() => {
    setSettledSymbols(symbols);
  }, [symbols]);

  useEffect(() => () => activeSpinRef.current?.abort(), []);

  // One renderer owns both the moving strip and the resting symbols. A
  // separate lightweight glyph set made every landed symbol visibly morph.
  const cellMarkup = useMemo(() => {
    const cache = new Map<string, string>();
    return (symbol: string) => {
      let html = cache.get(symbol);
      if (!html) {
        html = renderToStaticMarkup(
          <div className="bj-spin-cell" data-symbol-id={symbol}>
            <span className="bj-spin-glyph">{renderCell(symbol)}</span>
          </div>,
        );
        cache.set(symbol, html);
      }
      return html;
    };
  }, [renderCell]);

  // The final strip stays visible until React has painted exactly the same
  // column in the rest layer. Layout effects run before the browser paints,
  // so there is no blank frame between an imperative stop and React's commit.
  useLayoutEffect(() => {
    if (spinning || activeSpinRef.current) return;
    const strip = stripRef.current;
    if (strip) strip.replaceChildren();
  }, [spinning, settledSymbols]);

  const spin = useCallback(async (final: ReelSymbolId[], opts: SpinOptions) => {
    const strip = stripRef.current;
    if (!strip) return;
    activeSpinRef.current?.abort();
    const controller = new AbortController();
    activeSpinRef.current = controller;
    setSpinning(true);
    try {
      await runMultiPhaseSpin(strip, settledSymbols, final, fillerPool, opts, controller.signal, cellMarkup);
    } finally {
      // A superseded animation must never erase its replacement's strip.
      if (activeSpinRef.current !== controller) return;
      strip.style.transition = 'none';
      strip.style.transform = 'translate3d(0,0,0)';
      strip.classList.remove('bj-spinning', 'bj-slowing');
      if (activeSpinRef.current === controller) {
        activeSpinRef.current = null;
        setSettledSymbols(final);
        setSpinning(false);
      }
    }
  }, [settledSymbols, fillerPool, cellMarkup]);

  const stop = useCallback(() => activeSpinRef.current?.abort(), []);

  useImperativeHandle(ref, () => ({ spin, stop }), [spin, stop]);

  return (
    <div className="spin-reel" data-reel={reelIndex} role="group" aria-label={`Reel ${reelIndex + 1}`} aria-busy={spinning}>
      <div
        className="bj-rest-cells"
        style={{ visibility: spinning ? 'hidden' : 'visible' }}
      >
        {settledSymbols.map((sym, row) => {
          const isWinning = winningRows.has(row);
          const isActiveWin = activeWinRow === row;
          const isIgniting = igniteRows.has(row);
          const classes = ['bj-spin-cell'];
          if (isWinning) classes.push('bj-cell-winning');
          if (isActiveWin) classes.push('bj-cell-active-win');
          if (isIgniting) classes.push('bj-cell-igniting');
          return (
            <div key={row} className={classes.join(' ')} data-symbol-id={sym} role="img" aria-label={sym === 'chili' ? 'Chili wild' : sym === 'pinata' ? 'Piñata scatter' : sym.replaceAll('_', ' ')}>
              <span className="bj-spin-glyph">{renderCell(sym)}</span>
            </div>
          );
        })}
      </div>

      <div className="spin-reel-strip" ref={stripRef} aria-hidden="true" />

      {showAnticipationGlow && <div className="bj-anticipation-glow" />}
    </div>
  );
});

// ───────────────────────────────────────────────────────────────────────────
// Multi-phase RAF spin animation
// ───────────────────────────────────────────────────────────────────────────

async function runMultiPhaseSpin(
  strip: HTMLDivElement,
  currentSymbols: ReelSymbolId[],
  finalSymbols: ReelSymbolId[],
  fillerPool: readonly ReelSymbolId[],
  opts: SpinOptions,
  signal: AbortSignal,
  cellMarkup: (symbol: string) => string,
): Promise<void> {
  const {
    durationMs,
    cellHeight,
    cellGap,
    anticipation = false,
    reelIndex = 0,
  } = opts;
  if (opts.instant || signal.aborted) return;
  const stride = cellHeight + cellGap;

  const spinUpMs = opts.spinUpMs ?? Math.min(150, Math.max(40, durationMs * 0.10));
  const slowDownMs = opts.slowDownMs ?? (anticipation
    ? Math.max(1800, durationMs * 0.55)
    : Math.max(450, durationMs * 0.35));
  const constantMs = Math.max(60, durationMs - spinUpMs - slowDownMs);

  // Reel 5 slightly heavier (longer deceleration = more tension).
  const topSpeed = opts.topSpeed ?? (2800 + reelIndex * 100);

  // Single high-exponent curve, no two-phase artifact (no jitter).
  const slowDownExponent = opts.slowDownExponent ??
    (anticipation ? 9 : 5 + Math.min(2, reelIndex * 0.4));

  const slowPhaseCells = opts.slowPhaseCells ?? (anticipation ? 14 : 7);

  const fastDistance = (topSpeed * constantMs) / 1000 + (topSpeed / 2 * spinUpMs) / 1000;
  const fillerCount = Math.max(20, Math.ceil(fastDistance / stride) + 4);

  // Strip order (top→bottom): FINAL → SLOW → FILLER → CURRENT
  const filler: ReelSymbolId[] = [];
  const stripStart = Math.floor(Math.random() * fillerPool.length);
  for (let i = 0; i < fillerCount; i++) {
    // Cells are traversed bottom-to-top by the animation, so build in
    // reverse to display the provider strip in its published order.
    filler.push(fillerPool[(stripStart - i + fillerPool.length * 4) % fillerPool.length]!);
  }
  const slowPhase: ReelSymbolId[] = [];
  for (let i = 0; i < slowPhaseCells; i++) {
    // Inject piñatas during anticipation slow-down for "heartbeat" near-miss moments.
    if (anticipation && fillerPool.includes('pinata') && (i === 3 || i === 6 || i === 9)) {
      slowPhase.push('pinata');
    } else {
      slowPhase.push(
        fillerPool[(stripStart - fillerCount - i + fillerPool.length * 8) % fillerPool.length]!,
      );
    }
  }

  const fullStrip = [
    ...finalSymbols,    // top of strip (visible LAST)
    ...slowPhase,
    ...filler,
    ...currentSymbols,  // bottom of strip (visible FIRST)
  ];
  strip.innerHTML = fullStrip.map(cellMarkup).join('');

  const totalCells = fullStrip.length;
  const startPosition = -(totalCells - ROWS) * stride;
  const endPosition = 0;
  const slowDownStartPosition = endPosition - slowPhaseCells * stride;

  strip.style.transition = 'none';
  strip.style.transform = `translate3d(0, ${startPosition}px, 0)`;
  strip.classList.remove('bj-spinning', 'bj-slowing');
  void strip.offsetHeight;

  await phaseSpinUp(strip, startPosition, spinUpMs, topSpeed, signal);
  if (signal.aborted) return;

  const constantStartPos = startPosition + (topSpeed / 2 * spinUpMs) / 1000;
  await phaseConstant(strip, constantStartPos, constantMs, topSpeed, slowDownStartPosition, signal);
  if (signal.aborted) return;

  const currentPos = readCurrentY(strip);
  await phaseSlowDown(strip, currentPos, endPosition, slowDownMs, slowDownExponent, signal);
  if (signal.aborted) return;

  await phaseSettle(strip, endPosition, signal);
}

function phaseSpinUp(
  strip: HTMLDivElement,
  startPos: number,
  durationMs: number,
  topSpeed: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise(resolvePromise => {
    let frame = 0;
    const resolve = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener('abort', resolve);
      resolvePromise();
    };
    if (signal.aborted) { resolve(); return; }
    signal.addEventListener('abort', resolve, { once: true });
    strip.classList.add('bj-spinning');
    const startTime = performance.now();
    const distance = (topSpeed / 2) * (durationMs / 1000);

    const tick = (now: number) => {
      if (signal.aborted) { resolve(); return; }
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const y = startPos + eased * distance;
      strip.style.transform = `translate3d(0, ${y}px, 0)`;

      if (t < 1) frame = requestAnimationFrame(tick);
      else resolve();
    };
    frame = requestAnimationFrame(tick);
  });
}

function phaseConstant(
  strip: HTMLDivElement,
  startPos: number,
  durationMs: number,
  topSpeed: number,
  slowDownStartPos: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise(resolvePromise => {
    let frame = 0;
    const resolve = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener('abort', resolve);
      resolvePromise();
    };
    if (signal.aborted) { resolve(); return; }
    signal.addEventListener('abort', resolve, { once: true });
    const startTime = performance.now();

    const tick = (now: number) => {
      if (signal.aborted) { resolve(); return; }
      const elapsed = now - startTime;
      const y = startPos + (topSpeed * elapsed) / 1000;

      if (y >= slowDownStartPos) {
        strip.style.transform = `translate3d(0, ${slowDownStartPos}px, 0)`;
        resolve();
        return;
      }

      strip.style.transform = `translate3d(0, ${y}px, 0)`;

      if (elapsed < durationMs) frame = requestAnimationFrame(tick);
      else resolve();
    };
    frame = requestAnimationFrame(tick);
  });
}

function phaseSlowDown(
  strip: HTMLDivElement,
  startPos: number,
  endPos: number,
  durationMs: number,
  exponent: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise(resolvePromise => {
    let frame = 0;
    const resolve = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener('abort', resolve);
      resolvePromise();
    };
    if (signal.aborted) { resolve(); return; }
    signal.addEventListener('abort', resolve, { once: true });
    strip.classList.remove('bj-spinning');
    strip.classList.add('bj-slowing');

    const startTime = performance.now();
    const distance = endPos - startPos;

    // Cell tracking: brightness only (no scale) to avoid layout shifts.
    const cellEls = Array.from(strip.children) as HTMLElement[];
    let lastHighlighted = -1;
    const stride = cellEls.length > 0
      ? cellEls[0]!.offsetHeight + parseFloat(getComputedStyle(strip).gap || '6')
      : 66;

    const tick = (now: number) => {
      if (signal.aborted) { resolve(); return; }
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      // Single high-exponent curve — no velocity discontinuity, no jitter.
      const eased = 1 - Math.pow(1 - t, exponent);
      const y = startPos + distance * eased;
      strip.style.transform = `translate3d(0, ${y}px, 0)`;

      if (cellEls.length > 0) {
        const centerIdx = Math.floor((-y / stride) + 1.5);
        if (centerIdx !== lastHighlighted && centerIdx >= 0 && centerIdx < cellEls.length) {
          if (lastHighlighted >= 0 && cellEls[lastHighlighted]) {
            cellEls[lastHighlighted]!.classList.remove('bj-passing-center');
          }
          cellEls[centerIdx]!.classList.add('bj-passing-center');
          lastHighlighted = centerIdx;
        }
      }

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        if (lastHighlighted >= 0 && cellEls[lastHighlighted]) {
          cellEls[lastHighlighted]!.classList.remove('bj-passing-center');
        }
        strip.style.transform = `translate3d(0, ${endPos}px, 0)`;
        resolve();
      }
    };
    frame = requestAnimationFrame(tick);
  });
}

function phaseSettle(strip: HTMLDivElement, finalPos: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolvePromise => {
    let frame = 0;
    const resolve = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener('abort', resolve);
      resolvePromise();
    };
    if (signal.aborted) { resolve(); return; }
    signal.addEventListener('abort', resolve, { once: true });
    const overshoot = 1.5;
    const durationMs = 60;
    const startTime = performance.now();

    const tick = (now: number) => {
      if (signal.aborted) { resolve(); return; }
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const bounce = Math.sin(t * Math.PI) * overshoot;
      strip.style.transform = `translate3d(0, ${finalPos + bounce}px, 0)`;

      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        strip.style.transform = `translate3d(0, ${finalPos}px, 0)`;
        strip.classList.remove('bj-slowing');
        resolve();
      }
    };
    frame = requestAnimationFrame(tick);
  });
}

function readCurrentY(strip: HTMLDivElement): number {
  const transform = strip.style.transform;
  const m = transform.match(/translate3d\(\s*0\s*,\s*(-?[\d.]+)px/);
  return m ? parseFloat(m[1]!) : 0;
}
