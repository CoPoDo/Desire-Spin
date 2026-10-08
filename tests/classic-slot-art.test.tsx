import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MiniSlotGame, classicReelTiming } from '../src/pages/originals/mini-slot';
import { CLASSIC_ATLAS, CLASSIC_SYMBOL_ART, ClassicSlotArt, ClassicSymbol } from '../src/pages/originals/mini-slot/Art';
import { SYMBOLS, spin } from '../src/pages/originals/mini-slot/engine';
import { createRng, sha256Hex } from '../src/lib/fairness';
import { fireConfetti } from '../src/lib/confetti';

const fixture = vi.hoisted(() => ({ game: {} as any, credits: 1000, nonce: 0, reduced: false }));
vi.mock('../src/game-context', () => ({ useGame: () => fixture.game }));
vi.mock('../src/components/layout/SlotPageLayout', () => ({ SlotPageLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../src/pages/slots/_shared/ArtworkGate', () => ({ ArtworkGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: vi.fn() }));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const components = new Map();
  return { useReducedMotion: () => fixture.reduced, motion: new Proxy({}, { get: (_, tag: string) => {
    if (!components.has(tag)) components.set(tag, React.forwardRef((props: any, ref) => {
      const { animate, initial, exit, transition, layout, ...rest } = props;
      return React.createElement(tag, { ...rest, ref, 'data-motion-y': animate?.y, 'data-motion-duration': transition?.duration });
    }));
    return components.get(tag);
  } }) };
});

const SERVER = 'classic-painted-reel';
const CLIENT = 'continuity';
const result = (nonce: number) => spin(createRng(SERVER, CLIENT, nonce), 1);
const tick = async (milliseconds: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); }); };
const findNonce = (accept: (outcome: ReturnType<typeof spin>) => boolean) => {
  for (let nonce = 0; nonce < 10000; nonce++) if (accept(result(nonce))) return nonce;
  throw new Error('Missing deterministic test result');
};

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); fixture.credits = 1000; fixture.nonce = 0; fixture.reduced = false;
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  fixture.game = {
    balance: {
      get balance() { return fixture.credits; },
      canAfford: (amount: number) => Number.isFinite(amount) && amount > 0 && amount <= fixture.credits,
      debit: vi.fn((amount: number) => { if (!Number.isFinite(amount) || amount <= 0 || amount > fixture.credits) return false; fixture.credits = +(fixture.credits - amount).toFixed(2); return true; }),
      credit: vi.fn((amount: number) => { fixture.credits = +(fixture.credits + amount).toFixed(2); return true; }),
    },
    fairness: { hash: sha256Hex(SERVER), consumeNonce: vi.fn(() => ({ serverSeed: SERVER, clientSeed: CLIENT, nonce: fixture.nonce++ })) },
    history: { record: vi.fn() }, session: { recordSpin: vi.fn() }, sound: { play: vi.fn() },
  };
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Classic painted cabinet', () => {
  it('maps all five engine identities to independent valid atlas rectangles, including the lemon', () => {
    expect(Object.keys(CLASSIC_SYMBOL_ART.rects)).toEqual(SYMBOLS.map(symbol => symbol.id));
    for (const { id } of SYMBOLS) {
      const [left, top, right, bottom] = CLASSIC_SYMBOL_ART.rects[id]!;
      expect(left).toBeGreaterThanOrEqual(0); expect(top).toBeGreaterThanOrEqual(0);
      expect(right).toBeGreaterThan(left); expect(bottom).toBeGreaterThan(top);
      expect(right).toBeLessThanOrEqual(CLASSIC_SYMBOL_ART.width); expect(bottom).toBeLessThanOrEqual(CLASSIC_SYMBOL_ART.height);
      const view = render(<ClassicSymbol id={id} />);
      expect(view.container.querySelector('[data-symbol-id]')).toHaveAttribute('data-symbol-id', id);
      expect(view.container.querySelector('img')).toHaveAttribute('src', CLASSIC_ATLAS);
      expect(view.container.textContent).toBe(''); view.unmount();
    }
    const card = render(<ClassicSlotArt />);
    expect([...card.container.querySelectorAll('[data-symbol-id]')].map(node => node.getAttribute('data-symbol-id'))).toEqual(['cherry', 'seven', 'diamond']);
  });

  it('shows the exact engine paytable and named controls without emoji fallbacks', () => {
    render(<MiniSlotGame />);
    for (const { id, mult } of SYMBOLS) expect(screen.getByLabelText(new RegExp(`Three ${id === 'cherry' ? 'Cherries' : id === 'grape' ? 'Grapes' : id === 'lemon' ? 'Lemons' : id === 'seven' ? 'Sevens' : 'Diamonds'} pays ${mult} times your bet`))).toBeInTheDocument();
    expect(screen.getByText('Any two cherries pay 2×')).toBeInTheDocument();
    for (const name of ['manual', 'auto', 'Turbo', 'Halve bet', 'Double bet']) expect(screen.getByRole('button', { name })).toBeEnabled();
    expect(screen.getByRole('spinbutton', { name: 'Bet amount' })).toBeEnabled();
    expect(document.body.textContent).not.toMatch(/🍒|🍋|🍇|7️⃣|💎/u);
  });

  it.each([['normal', false, false], ['turbo', true, false], ['reduced motion', false, true]] as const)(
    'keeps the same physical painted target DOM through settlement and the next round in %s', async (_label, turbo, reduced) => {
      fixture.reduced = reduced;
      render(<MiniSlotGame />);
      if (turbo) fireEvent.click(screen.getByRole('button', { name: 'Turbo' }));
      let previous = ['cherry', 'lemon', 'grape'];
      const timing = classicReelTiming(turbo, reduced);
      for (let nonce = 0; nonce < 3; nonce++) {
        const expected = result(nonce);
        const button = screen.getByRole('button', { name: /^Spin ·/ });
        act(() => { button.click(); button.click(); fireEvent.keyDown(window, { key: ' ' }); });
        expect(fixture.game.balance.debit).toHaveBeenCalledTimes(nonce + 1);
        expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledTimes(nonce + 1);
        expect(fixture.game.history.record).toHaveBeenLastCalledWith(expect.objectContaining({ bet: 1, payout: expected.payout, multiplier: expected.multiplier, nonce, game: 'Classic 3-Reel Slot', clientSeed: CLIENT, serverSeedHash: sha256Hex(SERVER) }));
        expect(screen.getByRole('button', { name: 'Turbo' })).toBeDisabled();
        expect(screen.getByRole('spinbutton', { name: 'Bet amount' })).toBeDisabled();
        const reels = screen.getAllByRole('img', { name: /^Reel / });
        const strips = reels.map(reel => reel.firstElementChild!);
        const targets = strips.map(strip => strip.lastElementChild!);
        const images = targets.map(target => target.querySelector('img'));
        strips.forEach((strip, index) => {
          expect(strip).toHaveAttribute('data-motion-duration', String(timing.durations[index]));
          expect(strip.firstElementChild!.querySelector('[data-symbol-id]')).toHaveAttribute('data-symbol-id', previous[index]);
          expect(targets[index]!.querySelector('[data-symbol-id]')).toHaveAttribute('data-symbol-id', expected.reels[index]);
          const count = strip.children.length;
          expect(Number(strip.getAttribute('data-motion-y')!.replace('%', ''))).toBeCloseTo(-100 * (count - 1) / count, 12);
        });
        await tick(timing.settleMs + 1);
        reels.forEach((reel, index) => {
          expect(reel.firstElementChild).toBe(strips[index]);
          expect(strips[index]!.lastElementChild).toBe(targets[index]);
          expect(targets[index]!.querySelector('img')).toBe(images[index]);
          expect(reel).toHaveAttribute('data-reel-outcome', expected.reels[index]);
        });
        expect(screen.getByRole('button', { name: /^Spin ·/ })).toBeEnabled();
        previous = expected.reels;
      }
    },
  );

  it('highlights only the real two-cherry winners and records the unchanged two-times payout', async () => {
    fixture.nonce = findNonce(outcome => outcome.multiplier === 2);
    const expected = result(fixture.nonce);
    const view = render(<MiniSlotGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Spin ·/ }));
    await tick(1200);
    expect(screen.getByText('Two Cherries')).toBeInTheDocument();
    expect(fixture.credits).toBe(1001);
    expect(fixture.game.balance.credit).toHaveBeenCalledOnce();
    const winning = [...view.container.querySelectorAll('.classic-reel-cell-winning')];
    expect(winning).toHaveLength(2);
    expect(winning.every(cell => cell.getAttribute('data-result-symbol') === 'cherry')).toBe(true);
    expect(expected.reels.filter(id => id === 'cherry')).toHaveLength(2);
  });

  it('respects reduced motion for winning effects without changing prizes', async () => {
    fixture.reduced = true; fixture.nonce = findNonce(outcome => outcome.multiplier >= 10);
    const expected = result(fixture.nonce);
    render(<MiniSlotGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Spin ·/ }));
    await tick(1);
    expect(fixture.credits).toBe(+(999 + expected.payout).toFixed(2));
    expect(fireConfetti).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Spin ·/ })).toBeEnabled();
  });

  it('settles accounting before departure and cancels only cosmetic playback', async () => {
    fixture.nonce = findNonce(outcome => outcome.payout > 0);
    const expected = result(fixture.nonce);
    const view = render(<MiniSlotGame />);
    fireEvent.click(screen.getByRole('button', { name: /^Spin ·/ }));
    expect(fixture.credits).toBe(+(999 + expected.payout).toFixed(2));
    expect(fixture.game.history.record).toHaveBeenCalledOnce();
    view.unmount(); const sounds = fixture.game.sound.play.mock.calls.length;
    await tick(5000);
    expect(fixture.game.sound.play).toHaveBeenCalledTimes(sounds);
    expect(fixture.game.history.record).toHaveBeenCalledOnce();
    expect(fixture.game.balance.credit).toHaveBeenCalledOnce();
  });

  it('stops autoplay during a spin without a second wager or late duplicate settlement', async () => {
    render(<MiniSlotGame />);
    fireEvent.click(screen.getByRole('button', { name: 'auto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Autobet' }));
    expect(fixture.game.history.record).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Stop Autobet' }));
    await tick(5000);
    expect(fixture.game.balance.debit).toHaveBeenCalledOnce();
    expect(fixture.game.history.record).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Start Autobet' })).toBeEnabled();
  });
});
