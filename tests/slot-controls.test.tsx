import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LineSlotView } from '../src/pages/slots/_shared/LineSlotView';
import { SugarRush } from '../src/pages/slots/sugar-rush';
import { ImmersiveSlotView } from '../src/pages/slots/_shared/ImmersiveSlotView';
import { Paytable } from '../src/pages/slots/_shared/Paytable';
import { sweetBonanzaConfig } from '../src/pages/slots/sweet-bonanza/config';
import { playSugarRound } from '../src/pages/slots/sugar-rush/engine';
import { createRng } from '../src/lib/fairness';
import type { LineSlotProfile } from '../src/pages/slots/_shared/lineEngine';

const state = vi.hoisted(() => ({ debit: vi.fn(), credit: vi.fn(), record: vi.fn(), recordSpin: vi.fn(), consumeNonce: vi.fn(), sound: vi.fn(), reduced: false }));
vi.mock('../src/game-context', () => ({ useGame: () => ({
  balance: { balance: 1000, canAfford: () => true, debit: state.debit, credit: state.credit },
  fairness: { hash: 'hash', consumeNonce: state.consumeNonce },
  history: { record: state.record }, session: { recordSpin: state.recordSpin },
  sound: { play: state.sound, enabled: false },
}) }));
vi.mock('../src/hooks/useMusic', () => ({ useMusic: () => ({ start: vi.fn(), stop: vi.fn(), duck: vi.fn(), musicEnabled: false, setMusicEnabled: vi.fn() }) }));
vi.mock('../src/lib/zeusVoice', () => ({ primeZeus: vi.fn(), speakZeus: vi.fn(), zeusLineFor: () => '' }));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: vi.fn() }));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  return {
    useReducedMotion: () => state.reduced,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!cache.has(tag)) cache.set(tag, React.forwardRef((props: Record<string, unknown>, ref) => {
        const { initial, animate, exit, transition, whileTap, whileHover, layout, ...rest } = props;
        return React.createElement(tag, { ...rest, ref });
      }));
      return cache.get(tag);
    } }),
  };
});
const profile: LineSlotProfile = { id: 'fixture', cols: 3, rows: 3, paylines: [[0, 0, 0], [1, 1, 1], [2, 2, 2]], maxWin: 50, feature: 'classic', freeSpins: 0, symbols: [{ id: 'a', weight: 1, pay: { 3: 3 } }] };
const viewLine = () => render(<LineSlotView profile={profile} title="Test reels" subtitle="Three reels" scene={null} symbolMap={{}} accent="#fff" />);
const viewTumble = () => {
  const view = render(<MemoryRouter><ImmersiveSlotView cfg={sweetBonanzaConfig} backdropAspect={{ w: 941, h: 1672 }} archInsets={{ left: 8, top: 27, width: 84 }} renderCell={({ symbolId }) => <span>{symbolId}</span>} /></MemoryRouter>);
  fireEvent.click(screen.getByText('Tap to begin').closest('button')!);
  return view;
};

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear();
  state.reduced = false;
  state.debit.mockReturnValue(true);
  state.consumeNonce.mockReturnValue({ serverSeed: 'control-server', clientSeed: 'client', nonce: 2 });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('slot round ownership and accessible controls', () => {
  it('locks the stake and saves line outcomes once before visual playback; repeated clicks skip', async () => {
    const view = viewLine();
    fireEvent.click(screen.getByRole('button', { name: 'Spin · 1.00' }));
    expect(state.debit).toHaveBeenCalledWith(1);
    expect(state.credit).toHaveBeenCalledWith(3);
    expect(state.record).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('spinbutton', { name: 'Bet amount' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(state.debit).toHaveBeenCalledTimes(1);
    expect(state.credit).toHaveBeenCalledTimes(1);
    expect(state.recordSpin).toHaveBeenCalledTimes(1);
  });

  it('does not generate a result when a fresh debit is declined', async () => {
    state.debit.mockReturnValue(false);
    viewLine();
    fireEvent.click(screen.getByRole('button', { name: 'Spin · 1.00' }));
    expect(state.consumeNonce).not.toHaveBeenCalled();
    expect(state.record).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Spin · 1.00' })).toBeEnabled();
  });

  it('refunds a result-generation error and unlocks the next spin', () => {
    state.consumeNonce.mockImplementationOnce(() => { throw new Error('nonce unavailable'); });
    viewLine();
    fireEvent.click(screen.getByRole('button', { name: 'Spin · 1.00' }));
    expect(state.credit).toHaveBeenCalledWith(1);
    expect(screen.getByRole('alert')).toHaveTextContent('stake was returned');
    expect(screen.getByRole('button', { name: 'Spin · 1.00' })).toBeEnabled();
  });

  it('confirms a Sugar bonus purchase and records the entire cost plus result once', async () => {
    const view = render(<SugarRush />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy 10 free spins · 100.00' }));
    expect(state.debit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(state.debit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Buy 10 free spins · 100.00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy · 100.00' }));
    expect(state.debit).toHaveBeenCalledWith(100);
    expect(state.record).toHaveBeenCalledTimes(1);
    expect(state.record).toHaveBeenCalledWith(expect.objectContaining({ game: 'Sugar Rush · Bonus Buy', bet: 100 }));
    expect(state.consumeNonce).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(state.record).toHaveBeenCalledTimes(1);
  });

  it('saves tumble outcomes before playback and does not refund on navigation', async () => {
    const view = viewTumble();
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    expect(state.record).toHaveBeenCalledTimes(1);
    const credits = state.credit.mock.calls.length;
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(state.credit).toHaveBeenCalledTimes(credits);
    expect(state.recordSpin).toHaveBeenCalledTimes(1);
  });

  it('allows a tumble reel to be skipped immediately without a second wager', async () => {
    viewTumble();
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
    await act(async () => { await Promise.resolve(); });
    expect(state.debit).toHaveBeenCalledTimes(1);
    expect(state.record).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Spin' })).toBeEnabled();
  });

  it('retains the actual Sugar candy DOM nodes as survivors fall into their new cells', async () => {
    let nonce = 0;
    let round = playSugarRound(createRng('sugar-control', 'client', nonce), 1);
    while (round.spins[0]!.result.frames.length < 3 && nonce < 200) round = playSugarRound(createRng('sugar-control', 'client', ++nonce), 1);
    const before = round.spins[0]!.result.frames[1]!;
    const after = round.spins[0]!.result.frames[2]!;
    expect(before.winningPositions.length).toBeGreaterThan(0);
    const oldPosition = before.cellKeys.findIndex((key, position) => after.cellKeys.includes(key) && after.cellKeys.indexOf(key) > position);
    expect(oldPosition).toBeGreaterThanOrEqual(0);
    const key = before.cellKeys[oldPosition]!;
    state.consumeNonce.mockReturnValueOnce({ serverSeed: 'sugar-control', clientSeed: 'client', nonce });
    const view = render(<SugarRush />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin · 1.00' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(380); });
    const candy = view.container.querySelector<HTMLElement>(`[data-slot-cell-key="${key}"]`)!;
    expect(candy.dataset.position).toBe(String(oldPosition));
    const art = candy.innerHTML;
    await act(async () => { await vi.advanceTimersByTimeAsync(520); });
    const landed = view.container.querySelector<HTMLElement>(`[data-slot-cell-key="${key}"]`)!;
    expect(landed).toBe(candy);
    expect(landed.innerHTML).toBe(art);
    expect(landed.dataset.position).toBe(String(after.cellKeys.indexOf(key)));
  });

  it('displays Sweet Bonanza’s actual base pay with a separate free-spin amount', () => {
    render(<Paytable open onClose={() => {}} cfg={sweetBonanzaConfig} renderCell={() => null} />);
    expect(screen.getAllByText('19.0×').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FS 10.0×').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'How to Play' }));
    expect(screen.getByText(/Multiplier symbols appear only during free spins/)).toBeInTheDocument();
  });
});
