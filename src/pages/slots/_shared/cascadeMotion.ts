import { useLayoutEffect, useRef } from 'react';

export type CascadePhase = 'clear' | 'fall' | 'land';
export type GravityCell = { key: string; col: number; row: number };
export type GravityTrack = GravityCell & { fromRow: number; incoming: boolean; delay: number; fall: number; settle: number };
export const CASCADE_CLEAR_MS = 140;
export const CASCADE_COLUMN_MS = 22;

/** One column's stream stays in order: survivors retain their old row, while
 * arrivals occupy the missing rows immediately above the clipped viewport. */
export function gravityTracks(cells: readonly GravityCell[], previous: readonly GravityCell[], fresh: ReadonlySet<string>, speed = 1): GravityTrack[] {
  const old = new Map(previous.map(cell => [cell.key, cell]));
  const incoming = new Map<number, number>();
  for (const cell of cells) if (fresh.has(cell.key) && !old.has(cell.key)) incoming.set(cell.col, (incoming.get(cell.col) ?? 0) + 1);
  return cells.map(cell => {
    const prior = old.get(cell.key);
    const isNew = fresh.has(cell.key) && !prior;
    const fromRow = prior?.col === cell.col ? prior.row : isNew ? cell.row - (incoming.get(cell.col) ?? 0) : cell.row;
    const distance = Math.max(0, cell.row - fromRow);
    return { ...cell, fromRow, incoming: isNew,
      delay: distance ? (CASCADE_CLEAR_MS + cell.col * CASCADE_COLUMN_MS) * speed : 0,
      fall: distance ? (220 + Math.sqrt(distance) * 45) * speed : 0,
      settle: distance ? 70 * speed : 0,
    };
  });
}

/** Gravity accelerates into a small damped landing, never fades in or scales.
 * Positions are row strides, so resizing cannot introduce pixel rounding jumps. */
export function gravityOffset(track: GravityTrack, elapsed: number) {
  const distance = track.row - track.fromRow;
  if (!distance || track.fall <= 0) return 0;
  if (elapsed <= track.delay) return -distance;
  const time = elapsed - track.delay;
  if (time < track.fall) {
    const t = time / track.fall;
    return -distance * (1 - t * t);
  }
  if (time < track.fall + track.settle) {
    const t = (time - track.fall) / track.settle;
    return -Math.min(.045, distance * .015) * Math.sin(Math.PI * t) * (1 - t);
  }
  return 0;
}
export function gravityTransform(rows: number, gap: number) {
  return `translate3d(0, calc(${rows * 100}% + ${rows * gap}px), 0)`;
}

/** Own the one transform on each persistent cell. Mixing Framer layout
 * projection with a calc() y animation could finish the new-cell translation
 * before the browser painted it. Set the start position in layout effect,
 * before paint, and advance both survivors and arrivals on the same clock. */
export function useGravityMotion(cells: readonly GravityCell[], fresh: ReadonlySet<string>, speed: number, gap: number, onPhase?: (phase: CascadePhase) => void) {
  const previous = useRef<readonly GravityCell[]>([]);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const plan = useRef<{ cells: readonly GravityCell[]; speed: number; tracks: GravityTrack[] }>();
  const phaseRef = useRef(onPhase);
  phaseRef.current = onPhase;
  const freshRef = useRef(fresh);
  freshRef.current = fresh;
  useLayoutEffect(() => {
    if (plan.current?.cells !== cells || plan.current.speed !== speed) {
      plan.current = { cells, speed, tracks: gravityTracks(cells, previous.current, freshRef.current, speed) };
    }
    const tracks = plan.current.tracks;
    previous.current = cells;
    let frame = 0;
    let start: number | null = null;
    let active = true;
    let falling = false;
    let landed = false;
    const hasMotion = speed > 0 && tracks.some(track => track.fall > 0);
    const apply = (elapsed: number) => {
      let moving = false;
      for (const track of tracks) {
        const node = nodes.current.get(track.key);
        if (!node) continue;
        const offset = speed > 0 ? gravityOffset(track, elapsed) : 0;
        const done = speed <= 0 || elapsed >= track.delay + track.fall + track.settle;
        const transform = gravityTransform(offset, gap);
        if (node.style.transform !== transform) node.style.transform = transform;
        const willChange = done ? '' : 'transform';
        if (node.style.willChange !== willChange) node.style.willChange = willChange;
        if (node.dataset.cascadeFromRow !== String(track.fromRow)) node.dataset.cascadeFromRow = String(track.fromRow);
        if (node.dataset.cascadeToRow !== String(track.row)) node.dataset.cascadeToRow = String(track.row);
        if (node.dataset.cascadeIncoming !== String(track.incoming)) node.dataset.cascadeIncoming = String(track.incoming);
        const phase = done ? 'settled' : elapsed < track.delay ? 'clear' : elapsed < track.delay + track.fall ? 'fall' : 'settle';
        if (node.dataset.cascadePhase !== phase) node.dataset.cascadePhase = phase;
        moving ||= !done;
        if (!done && elapsed >= track.delay && !falling) { falling = true; phaseRef.current?.('fall'); }
      }
      if (!moving && hasMotion && !landed) { landed = true; phaseRef.current?.('land'); }
      return moving;
    };
    const tick = (now: number) => {
      if (!active) return;
      start ??= now;
      if (apply(now - start)) frame = requestAnimationFrame(tick);
    };
    if (hasMotion) phaseRef.current?.('clear');
    if (apply(0)) frame = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [cells, speed, gap]);
  return (key: string) => (node: HTMLDivElement | null) => {
    if (node) nodes.current.set(key, node); else nodes.current.delete(key);
  };
}
