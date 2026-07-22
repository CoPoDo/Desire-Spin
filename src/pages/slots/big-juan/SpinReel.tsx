import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';

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

  const spin = useCallback(async (final: ReelSymbolId[], opts: SpinOptions) => {
    const strip = stripRef.current;
    if (!strip) return;
    activeSpinRef.current?.abort();
    const controller = new AbortController();
    activeSpinRef.current = controller;
    setSpinning(true);
    try {
      await runMultiPhaseSpin(strip, symbols, final, fillerPool, opts, controller.signal);
    } finally {
      strip.style.transition = 'none';
      strip.style.transform = 'translate3d(0,0,0)';
      strip.classList.remove('bj-spinning', 'bj-slowing');
      strip.innerHTML = '';
      if (activeSpinRef.current === controller) {
        activeSpinRef.current = null;
        setSettledSymbols(final);
        setSpinning(false);
      }
    }
  }, [symbols, fillerPool]);

  const stop = useCallback(() => activeSpinRef.current?.abort(), []);

  useImperativeHandle(ref, () => ({ spin, stop }), [spin, stop]);

  return (
    <div className="spin-reel" data-reel={reelIndex}>
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
  fillerPool: readonly ReelSymbolId[],
  opts: SpinOptions,
  signal: AbortSignal,
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
  paintStrip(strip, fullStrip);

  const totalCells = fullStrip.length;
  const startPosition = -(totalCells - ROWS) * stride;
  const endPosition = 0;
  const slowDownStartPosition = endPosition - slowPhaseCells * stride;

  strip.style.transition = 'none';
  strip.style.transform = `translate3d(0, ${startPosition}px, 0)`;
  strip.classList.remove('bj-spinning', 'bj-slowing');
  void strip.offsetHeight;

  await phaseSpinUp(strip, startPosition, spinUpMs, topSpeed, signal);

  const constantStartPos = startPosition + (topSpeed / 2 * spinUpMs) / 1000;
  await phaseConstant(strip, constantStartPos, constantMs, topSpeed, slowDownStartPosition, signal);

  const currentPos = readCurrentY(strip);
  await phaseSlowDown(strip, currentPos, endPosition, slowDownMs, slowDownExponent, signal);

  await phaseSettle(strip, endPosition, signal);
}

function phaseSpinUp(
  strip: HTMLDivElement,
  startPos: number,
  durationMs: number,
  topSpeed: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise(resolve => {
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
  signal: AbortSignal,
): Promise<void> {
  return new Promise(resolve => {
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
  signal: AbortSignal,
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

function phaseSettle(strip: HTMLDivElement, finalPos: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const overshoot = 1.5;
    const durationMs = 60;
    const startTime = performance.now();

    const tick = (now: number) => {
      if (signal.aborted) { resolve(); return; }
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
    `style="border-color: ${colour}66;">` +
    `<span class="bj-spin-glyph" style="width:82%;height:82%">${glyph}</span></div>`
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
    case 'juan': return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#c52b28" d="M5 17h54l-8 9H13z"/><path fill="#d94332" d="M18 7h28l7 12H11z"/><circle cx="32" cy="35" r="15" fill="#df9b5d"/><path d="M20 38q6-7 12 0 6-7 12 0-5 8-12 3-7 5-12-3" fill="#25150e"/><circle cx="26" cy="32" r="2"/><circle cx="38" cy="32" r="2"/><path d="M16 52h32l-5 12H21z" fill="#267052"/></svg>`;
    case 'senorita': return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="16" r="9" fill="#d7925b"/><path d="M23 24h18l5 12-7 5 10 17H15l10-17-7-5z" fill="#d83c83"/><path d="M16 56q16-15 32 0" fill="none" stroke="#ffd166" stroke-width="5"/><circle cx="43" cy="10" r="6" fill="#f05b65"/></svg>`;
    case 'chihuahua': return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 23 8 6l17 10M50 23 56 6 39 16" fill="#b9743a" stroke="#6b3a1e" stroke-width="2"/><circle cx="32" cy="34" r="19" fill="#c88a4f"/><path d="M11 18h42l-7 8H18z" fill="#49a16f"/><circle cx="25" cy="32" r="2"/><circle cx="39" cy="32" r="2"/><path d="M28 40h8l-4 5z" fill="#2b1710"/></svg>`;
    case 'vihuela': return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M36 3h8v30h-8z" fill="#7f4a25"/><path d="M40 26c16 0 19 11 10 18 7 11-2 18-10 14-8 4-17-3-10-14-9-7-6-18 10-18z" fill="#b66b2f" stroke="#603619" stroke-width="2"/><circle cx="40" cy="43" r="6" fill="#3c2418"/><path d="M40 4v53" stroke="#f3d49b" stroke-width="1.5"/></svg>`;
    case 'hot_sauce': return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M25 5h14v10l5 7v34H20V22l5-7z" fill="#d32d28" stroke="#7b1b18" stroke-width="2"/><path d="M24 29h16v17H24z" fill="#f6d467"/><path d="M29 32q9 4 3 11-7-4-3-11" fill="#e43d26"/><path d="M25 5h14v7H25z" fill="#4d8c48"/></svg>`;
    case 'chili': return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M43 12q-10 5-8 14" fill="none" stroke="#3b9b52" stroke-width="6"/><path d="M37 21q20 14-3 35Q12 70 9 47q20 9 28-26" fill="#e6312d" stroke="#8f1818" stroke-width="2"/><text x="32" y="48" text-anchor="middle" font-size="12" font-weight="900" fill="#fff4b5">WILD</text></svg>`;
    case 'pinata': return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 24h34v22H15z" fill="#4ebbd0"/><path d="M13 42h13v8H13zM38 42h13v8H38z" fill="#a54ac4"/><path d="M43 18h13v20H45z" fill="#ef5c68"/><path d="m17 24 7-12 8 12" fill="#ffd166"/><path d="M15 29h34M15 35h34M15 41h34" stroke="#f3c43f" stroke-width="3"/><circle cx="51" cy="24" r="2"/></svg>`;
    case 'A':         return '<span class="bj-royal" style="color:#ff5560">A</span>';
    case 'K':         return '<span class="bj-royal" style="color:#ffd166">K</span>';
    case 'Q':         return '<span class="bj-royal" style="color:#ff7ad9">Q</span>';
    case 'J':         return '<span class="bj-royal" style="color:#1fff7a">J</span>';
    case '10':        return '<span class="bj-royal" style="color:#5fb8ff">10</span>';
  }
  return id;
}
