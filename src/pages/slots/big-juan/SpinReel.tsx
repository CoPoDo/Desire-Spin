import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type ReactNode } from 'react';

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
  const [spinning, setSpinning] = useState(false);

  const spin = useCallback(async (final: ReelSymbolId[], opts: SpinOptions) => {
    const strip = stripRef.current;
    if (!strip) return;
    setSpinning(true);
    try {
      await runMultiPhaseSpin(strip, symbols, final, fillerPool, opts);
    } finally {
      strip.style.transition = 'none';
      strip.style.transform = 'translate3d(0,0,0)';
      strip.classList.remove('bj-spinning', 'bj-slowing');
      strip.innerHTML = '';
      setSpinning(false);
    }
  }, [symbols, fillerPool]);

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  return (
    <div className="spin-reel" data-reel={reelIndex}>
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

      <div className="spin-reel-strip" ref={stripRef} />

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
  fillerPool: ReelSymbolId[],
  opts: SpinOptions,
): Promise<void> {
  const {
    durationMs,
    cellHeight,
    cellGap,
    anticipation = false,
    reelIndex = 0,
  } = opts;
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
  for (let i = 0; i < fillerCount; i++) {
    filler.push(fillerPool[Math.floor(Math.random() * fillerPool.length)]!);
  }
  const slowPhase: ReelSymbolId[] = [];
  for (let i = 0; i < slowPhaseCells; i++) {
    // Inject piñatas during anticipation slow-down for "heartbeat" near-miss moments.
    if (anticipation && fillerPool.includes('pinata') && (i === 3 || i === 6 || i === 9)) {
      slowPhase.push('pinata');
    } else {
      slowPhase.push(fillerPool[Math.floor(Math.random() * fillerPool.length)]!);
    }
  }

  const fullStrip = [
    ...finalSymbols,    // top of strip (visible LAST)
    ...slowPhase,
    ...filler,
    ...currentSymbols,  // bottom of strip (visible FIRST)
  ];
  paintStrip(strip, fullStrip);

  const totalCells = fullStrip.length;
  const startPosition = -(totalCells - ROWS) * stride;
  const endPosition = 0;
  const slowDownStartPosition = endPosition - slowPhaseCells * stride;

  strip.style.transition = 'none';
  strip.style.transform = `translate3d(0, ${startPosition}px, 0)`;
  strip.classList.remove('bj-spinning', 'bj-slowing');
  void strip.offsetHeight;

  await phaseSpinUp(strip, startPosition, spinUpMs, topSpeed);

  const constantStartPos = startPosition + (topSpeed / 2 * spinUpMs) / 1000;
  await phaseConstant(strip, constantStartPos, constantMs, topSpeed, slowDownStartPosition);

  const currentPos = readCurrentY(strip);
  await phaseSlowDown(strip, currentPos, endPosition, slowDownMs, slowDownExponent);

  await phaseSettle(strip, endPosition);
}

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

    // Cell tracking: brightness only (no scale) to avoid layout shifts.
    const cellEls = Array.from(strip.children) as HTMLElement[];
    let lastHighlighted = -1;
    const stride = cellEls.length > 0
      ? cellEls[0]!.offsetHeight + parseFloat(getComputedStyle(strip).gap || '6')
      : 66;

    const tick = (now: number) => {
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
        requestAnimationFrame(tick);
      } else {
        if (lastHighlighted >= 0 && cellEls[lastHighlighted]) {
          cellEls[lastHighlighted]!.classList.remove('bj-passing-center');
        }
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
