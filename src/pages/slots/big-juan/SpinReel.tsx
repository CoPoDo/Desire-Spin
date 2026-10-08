import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prepareReelImages, reelProgress, reelTravelRows } from '../_shared/SpinReel';

/** Downward-scrolling reel. One integrated velocity curve carries the current
 * board through passing symbols to the exact outcome, without phase splices,
 * positional snaps, or a second bounce after the reel is already at rest. */

export type ReelSymbolId = string;

export type SpinOptions = {
  durationMs: number;
  anticipation?: boolean;
  cellHeight: number;
  cellGap: number;
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
      await runReelSpin(strip, settledSymbols, final, fillerPool, opts, controller.signal, cellMarkup);
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

/** One clock owns the entire trajectory. The previous easeOut "spin-up"
 * actually braked from 1.5× cruise speed to zero, then jumped to full speed;
 * its unrelated power-curve slowdown introduced another velocity jump. */
async function runReelSpin(
  strip: HTMLDivElement,
  currentSymbols: ReelSymbolId[],
  finalSymbols: ReelSymbolId[],
  fillerPool: readonly ReelSymbolId[],
  opts: SpinOptions,
  signal: AbortSignal,
  cellMarkup: (symbol: string) => string,
): Promise<void> {
  if (opts.instant || signal.aborted) return;
  const duration = Math.max(0, opts.durationMs);
  const travel = reelTravelRows(ROWS, duration);
  const start = Math.floor(Math.random() * fillerPool.length);
  const filler = Array.from({ length: travel - ROWS }, (_, index) => {
    if (opts.anticipation && fillerPool.includes('pinata') && index % 5 === 2) return 'pinata';
    return fillerPool[(start + index) % fillerPool.length] ?? currentSymbols[index % ROWS]!;
  });
  strip.innerHTML = [...finalSymbols, ...filler, ...currentSymbols].map(cellMarkup).join('');
  // CSS lengths remain tied to the real cell geometry during a window resize.
  const place = (offset: number) => {
    strip.style.transform = offset === 0 ? 'translate3d(0, 0px, 0)' : `translate3d(0, calc(${offset} * (var(--bj-cell-h, ${opts.cellHeight}px) + var(--bj-cell-gap, ${opts.cellGap}px))), 0)`;
  };
  strip.style.transition = 'none';
  strip.style.willChange = 'transform';
  strip.classList.remove('bj-spinning', 'bj-slowing');
  place(-travel);

  await new Promise<void>((resolve) => {
    let frame = 0;
    let started = false;
    let done = false;
    let timer = 0;
    let startTime: number | undefined;
    let disposeImages = () => {};
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      disposeImages();
      signal.removeEventListener('abort', finish);
      place(0);
      strip.style.willChange = 'auto';
      strip.classList.remove('bj-spinning', 'bj-slowing');
      resolve();
    };
    const tick = (now: number) => {
      if (done) return;
      startTime ??= now;
      const progress = duration <= 0 ? 1 : Math.min(1, (now - startTime) / duration);
      place(-travel * (1 - reelProgress(progress)));
      // Keep artwork clear during acceleration and the readable landing.
      strip.classList.toggle('bj-spinning', progress > .16 && progress < .66);
      if (progress >= 1) finish();
      else frame = requestAnimationFrame(tick);
    };
    const begin = () => {
      if (done || started) return;
      started = true;
      window.clearTimeout(timer);
      frame = requestAnimationFrame(tick);
      timer = window.setTimeout(finish, duration + 300);
    };
    signal.addEventListener('abort', finish, { once: true });
    disposeImages = prepareReelImages(strip, begin);
    if (!started) timer = window.setTimeout(begin, 2000);
  });
}
