import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpinReel, type SpinReelHandle } from '../src/pages/slots/big-juan/SpinReel';
import { animateCountUp } from '../src/pages/slots/big-juan/winCounter';
import { flyCoin } from '../src/pages/slots/big-juan/coinFly';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function reel() {
  const ref = createRef<SpinReelHandle>();
  const view = render(<SpinReel ref={ref} reelIndex={0} symbols={['A', 'K', 'Q', 'J']}
    winningRows={new Set()} activeWinRow={null} igniteRows={new Set()}
    renderCell={(id) => id} fillerPool={['A', 'K', 'Q', 'J']} />);
  return { ref, ...view };
}
const options = { durationMs: 900, cellHeight: 60, cellGap: 6 };

describe('Big Juan interruptible presentation', () => {
  it('stops immediately and preserves the result even with suspended RAF', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 123));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const { ref, container } = reel();
    let completion!: Promise<void>;
    act(() => { completion = ref.current!.spin(['10', 'J', 'K', 'Q'], options); });
    await act(async () => { ref.current!.stop(); await completion; });
    expect(container.querySelector('.spin-reel')).toHaveAttribute('aria-busy', 'false');
    expect(Array.from(container.querySelectorAll('.bj-rest-cells [data-symbol-id]')).map((e) => e.getAttribute('data-symbol-id')))
      .toEqual(['10', 'J', 'K', 'Q']);
    expect(container.querySelector('.spin-reel-strip')?.children).toHaveLength(0);
  });

  it('does not let an interrupted spin erase a replacement strip', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 123));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const { ref, container } = reel();
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => { first = ref.current!.spin(['10', 'J', 'K', 'Q'], options); });
    await act(async () => {
      second = ref.current!.spin(['K', 'Q', 'J', '10'], options);
      await first;
    });
    expect(container.querySelector('.spin-reel-strip')!.children.length).toBeGreaterThan(0);
    expect(container.querySelector('.spin-reel')).toHaveAttribute('aria-busy', 'true');
    await act(async () => { ref.current!.stop(); await second; });
    expect(container.querySelector('.bj-rest-cells [data-symbol-id]')).toHaveAttribute('data-symbol-id', 'K');
  });

  it('lands the exact outcome artwork before handing off to the resting column', async () => {
    let now = 0;
    let nextFrame = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const ref = createRef<SpinReelHandle>();
    const initial = ['A', 'K', 'Q', 'J'];
    const final = ['juan', 'chili', 'pinata', 'senorita'];
    const renderer = (id: string) => <svg viewBox="0 0 64 64" data-original-art={id}><path d="M1 1h40v40z" /><text>{id}</text></svg>;
    const props = { reelIndex: 0, symbols: initial, winningRows: new Set<number>(), activeWinRow: null,
      igniteRows: new Set<number>(), renderCell: renderer, fillerPool: [...initial, ...final] };
    const view = render(<SpinReel ref={ref} {...props} />);
    let completion!: Promise<void>;
    act(() => { completion = ref.current!.spin(final, options); });
    const strip = view.container.querySelector('.spin-reel-strip') as HTMLElement;
    const landedNodes = Array.from(strip.children).slice(0, 4);
    expect(landedNodes.map((node) => node.getAttribute('data-symbol-id'))).toEqual(final);
    const landingArtwork = landedNodes.map((node) => node.querySelector('.bj-spin-glyph')!.innerHTML);
    expect(landingArtwork.every((html) => html.includes('data-original-art'))).toBe(true);
    const frame = async (ms: number) => {
      await act(async () => {
        now += ms;
        const callbacks = [...frames.values()];
        frames.clear();
        for (const callback of callbacks) callback(now);
      });
    };
    await frame(200); // spin-up
    await frame(1000); // constant
    await frame(1000); // deceleration reaches the real outcome
    expect(strip.style.transform).toBe('translate3d(0, 0px, 0)');
    expect(Array.from(strip.children).slice(0, 4)).toEqual(landedNodes);
    await frame(60); // small mechanical settle, then React handoff
    await act(async () => { await completion; });
    const rest = () => Array.from(view.container.querySelectorAll('.bj-rest-cells .bj-spin-glyph'));
    expect(rest().map((node) => node.innerHTML)).toEqual(landingArtwork);
    expect(strip.children).toHaveLength(0);
    // The parent can still show the preceding full grid while other columns
    // decelerate. This already-landed column must not revert to that grid.
    view.rerender(<SpinReel ref={ref} {...props} />);
    expect(rest().map((node) => node.innerHTML)).toEqual(landingArtwork);
    // Promoting the complete result leaves these same resting DOM nodes intact.
    const restingNodes = rest();
    view.rerender(<SpinReel ref={ref} {...props} symbols={final} />);
    expect(rest()).toEqual(restingNodes);
    expect(rest().map((node) => node.innerHTML)).toEqual(landingArtwork);
  });

  it('cancels count-up without waiting for another animation frame', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 456));
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const element = document.createElement('span');
    const animation = animateCountUp(element, 0, 25, String);
    animation.cancel();
    await animation;
    expect(cancel).toHaveBeenCalledWith(456);
  });

  it('paints a zero-duration count immediately without a NaN frame', async () => {
    const element = document.createElement('span');
    await animateCountUp(element, 0, 25, String, { durationMs: 0 });
    expect(element.textContent).toBe('25');
  });

  it('removes flying coins immediately when the feature unmounts', async () => {
    const controller = new AbortController();
    const source = document.createElement('div');
    const target = document.createElement('div');
    const flight = flyCoin(source, target, { glyph: '$', value: 1, signal: controller.signal });
    expect(document.querySelector('.bj-flying-coin')).not.toBeNull();
    controller.abort();
    await flight;
    expect(document.querySelector('.bj-flying-coin')).toBeNull();
  });
});
