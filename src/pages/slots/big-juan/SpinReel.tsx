import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type ReactNode } from 'react';

/** SpinReel — single reel rendered as a viewport (overflow:hidden) plus
 *  two stacked views:
 *
 *    REST VIEW (React-managed) — 4 cells with full SVG hero art and CSS
 *      class-driven highlight states (winning, active-win, igniting).
 *      Visible only when the reel is at rest.
 *
 *    SPIN VIEW (imperative DOM) — long vertical strip of lightweight
 *      cells (emoji glyphs) that translates upward to scroll symbols
 *      past the viewport. Visible only during the spin animation.
 *
 *  This split is the bible Part 4 viewport-and-strip pattern: cheap
 *  GPU-friendly painting during the spin, full React reconciliation
 *  with hero art at rest.
 *
 *  Critical CSS contract (defined in globals.css):
 *    - `.spin-reel` has overflow:hidden and a fixed pixel height of
 *      calc(var(--bj-cell-h)*4 + var(--bj-cell-gap)*3).
 *    - `.spin-reel-strip` has will-change:transform.
 *    - `.bj-spin-cell` has height:var(--bj-cell-h) and flex-shrink:0.
 *    - The parent `.bj-reel-bank` element sets --bj-cell-h and
 *      --bj-cell-gap inline based on measured layout width.
 */

export type ReelSymbolId = string;

export type SpinOptions = {
  durationMs: number;
  anticipation?: boolean;
  fillerCount?: number;
  cellHeight: number;
  cellGap: number;
};

export type SpinReelHandle = {
  spin: (final: ReelSymbolId[], options: SpinOptions) => Promise<void>;
};

const ROWS = 4;

export const SpinReel = forwardRef<SpinReelHandle, {
  reelIndex: number;
  /** 4 settled symbols. Drives the rest-view React render. */
  symbols: ReelSymbolId[];
  /** Row indices that should pulse with the win-glow. */
  winningRows: ReadonlySet<number>;
  /** Row that's currently the "active" win in the cycling display. */
  activeWinRow: number | null;
  /** Row indices currently burst-into-flames mid-Wild-Switch. */
  igniteRows: ReadonlySet<number>;
  /** Hero-art renderer the parent passes in. */
  renderCell: (symbolId: ReelSymbolId) => ReactNode;
  /** Pool used for random filler during the spin animation. */
  fillerPool: ReelSymbolId[];
  /** Optional anticipation-glow overlay flag (parent controls). */
  showAnticipationGlow?: boolean;
}>(function SpinReel(
  { reelIndex, symbols, winningRows, activeWinRow, igniteRows, renderCell, fillerPool, showAnticipationGlow },
  ref,
) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [spinning, setSpinning] = useState(false);

  const spin = useCallback(async (final: ReelSymbolId[], opts: SpinOptions) => {
    const strip = stripRef.current;
    if (!strip) return;
    // Show the strip on top of the rest view. The strip is always
    // present in the DOM (no display toggle) so transitions on
    // transform fire reliably.
    setSpinning(true);
    try {
      if (opts.anticipation) {
        await runAnticipationSpin(strip, symbols, final, fillerPool, opts);
      } else {
        await runStandardSpin(strip, symbols, final, fillerPool, opts);
      }
    } finally {
      // Clear the strip and hand back to the React rest-view. Strip
      // transform is reset so the next spin starts from a clean baseline.
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0px)';
      strip.innerHTML = '';
      setSpinning(false);
    }
  }, [symbols, fillerPool]);

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  return (
    <div className="spin-reel" data-reel={reelIndex}>
      {/* REST VIEW — React-managed. Sits behind the strip; only visible
       *  when the strip is empty (between spins). */}
      <div
        className="bj-rest-cells"
        style={{ visibility: spinning ? 'hidden' : 'visible' }}
      >
        {symbols.map((sym, row) => {
          const isWinning = winningRows.has(row);
          const isActiveWin = activeWinRow === row;
          const isIgniting = igniteRows.has(row);
          const classes = ['bj-spin-cell'];
          if (isWinning) classes.push('bj-cell-winning');
          if (isActiveWin) classes.push('bj-cell-active-win');
          if (isIgniting) classes.push('bj-cell-igniting');
          return (
            <div key={row} className={classes.join(' ')} data-symbol-id={sym}>
              <span className="bj-spin-glyph">{renderCell(sym)}</span>
            </div>
          );
        })}
      </div>

      {/* SPIN VIEW — imperative strip painted by spin(). ALWAYS laid out
       *  in the DOM (no display:none toggle) so transitions on transform
       *  fire reliably. When not spinning the strip's innerHTML is empty
       *  so it doesn't visually cover the rest view. */}
      <div className="spin-reel-strip" ref={stripRef} />

      {showAnticipationGlow && <div className="bj-anticipation-glow" />}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Imperative strip painters
// ---------------------------------------------------------------------------

function paintStrip(strip: HTMLDivElement, symbols: ReelSymbolId[]) {
  strip.innerHTML = symbols.map((sym) => renderCellHtml(sym)).join('');
}

function renderCellHtml(symbolId: ReelSymbolId): string {
  const colour = COLOR_FOR.get(symbolId) ?? '#888';
  const glyph = symbolGlyph(symbolId);
  return (
    `<div class="bj-spin-cell" data-symbol-id="${symbolId}" ` +
    `style="background: linear-gradient(180deg, ${colour}44, ${colour}10); border-color: ${colour}55;">` +
    `<span class="bj-spin-glyph">${glyph}</span></div>`
  );
}

const COLOR_FOR = new Map<string, string>([
  ['juan',      '#ff5560'],
  ['senorita',  '#ff7ad9'],
  ['chihuahua', '#d8a060'],
  ['vihuela',   '#c8932e'],
  ['hot_sauce', '#ff8a40'],
  ['chili',     '#ff5560'],
  ['pinata',    '#ffd166'],
  ['A',         '#ff5560'],
  ['K',         '#ffd166'],
  ['Q',         '#ff7ad9'],
  ['J',         '#1fff7a'],
  ['10',        '#5fb8ff'],
]);

function symbolGlyph(id: string): string {
  switch (id) {
    case 'juan':      return '🤠';
    case 'senorita':  return '💃';
    case 'chihuahua': return '🐕';
    case 'vihuela':   return '🎸';
    case 'hot_sauce':
    case 'chili':     return '🌶';
    case 'pinata':    return '🎉';
    case 'A':         return '<span class="bj-royal" style="color:#ff5560">A</span>';
    case 'K':         return '<span class="bj-royal" style="color:#ffd166">K</span>';
    case 'Q':         return '<span class="bj-royal" style="color:#ff7ad9">Q</span>';
    case 'J':         return '<span class="bj-royal" style="color:#1fff7a">J</span>';
    case '10':        return '<span class="bj-royal" style="color:#5fb8ff">10</span>';
  }
  return id;
}

// ---------------------------------------------------------------------------
// Standard single-phase spin
// ---------------------------------------------------------------------------

async function runStandardSpin(
  strip: HTMLDivElement,
  currentSymbols: ReelSymbolId[],
  final: ReelSymbolId[],
  fillerPool: ReelSymbolId[],
  opts: SpinOptions,
): Promise<void> {
  const { durationMs, cellHeight, cellGap } = opts;
  const baseFiller = opts.fillerCount ?? 30;
  const fillerCount = baseFiller + Math.floor(Math.random() * 8);

  const filler: ReelSymbolId[] = [];
  for (let i = 0; i < fillerCount; i++) {
    filler.push(fillerPool[Math.floor(Math.random() * fillerPool.length)]!);
  }
  const fullStrip = [...currentSymbols, ...filler, ...final];

  paintStrip(strip, fullStrip);
  strip.style.transition = 'none';
  strip.style.transform = 'translateY(0px)';
  // FORCE REFLOW — see bible Bug #1 in Part 4.6
  void strip.offsetHeight;

  // Each cell occupies cellHeight + cellGap of vertical space (the gap
  // applies BETWEEN cells but flex-gap adds it AFTER each item before
  // the next, which is geometrically the same per-cell stride).
  const stride = cellHeight + cellGap;
  const finalY = -((fullStrip.length - ROWS) * stride);

  strip.style.transition = `transform ${durationMs}ms cubic-bezier(0.32, 0.94, 0.6, 1)`;
  strip.style.transform = `translateY(${finalY}px)`;

  await waitTransitionEnd(strip, durationMs);
}

// ---------------------------------------------------------------------------
// Two-phase anticipation spin
// ---------------------------------------------------------------------------

async function runAnticipationSpin(
  strip: HTMLDivElement,
  currentSymbols: ReelSymbolId[],
  final: ReelSymbolId[],
  fillerPool: ReelSymbolId[],
  opts: SpinOptions,
): Promise<void> {
  const { durationMs, cellHeight, cellGap } = opts;
  const stride = cellHeight + cellGap;
  const phase1Ms = Math.round(durationMs * 0.42);
  const phase2Ms = durationMs - phase1Ms;
  const phase1Cells = 28 + Math.floor(Math.random() * 4);
  const phase2Cells = 6;

  const f1: ReelSymbolId[] = [];
  for (let i = 0; i < phase1Cells; i++) {
    f1.push(fillerPool[Math.floor(Math.random() * fillerPool.length)]!);
  }
  const f2: ReelSymbolId[] = [];
  for (let i = 0; i < phase2Cells; i++) {
    f2.push(fillerPool[Math.floor(Math.random() * fillerPool.length)]!);
  }
  const fullStrip = [...currentSymbols, ...f1, ...f2, ...final];
  paintStrip(strip, fullStrip);

  strip.style.transition = 'none';
  strip.style.transform = 'translateY(0px)';
  void strip.offsetHeight;

  const phase1EndY = -(phase1Cells) * stride;
  strip.style.transition = `transform ${phase1Ms}ms cubic-bezier(0.4, 0, 0.7, 0.4)`;
  strip.style.transform = `translateY(${phase1EndY}px)`;
  await waitTransitionEnd(strip, phase1Ms);

  const phase2EndY = phase1EndY - (phase2Cells + ROWS) * stride;
  strip.style.transition = `transform ${phase2Ms}ms cubic-bezier(0.4, 0, 0.8, 0.5)`;
  strip.style.transform = `translateY(${phase2EndY}px)`;
  await waitTransitionEnd(strip, phase2Ms);
}

// ---------------------------------------------------------------------------
// transitionend helper
// ---------------------------------------------------------------------------

function waitTransitionEnd(strip: HTMLDivElement, durationMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      strip.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      finish();
    };
    strip.addEventListener('transitionend', onEnd);
    setTimeout(finish, durationMs + 120);
  });
}
