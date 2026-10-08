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
import { WANTED_PROFILE } from '../src/pages/slots/wanted-wild';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';
import { buyLineBonusRound, WANTED_BONUSES } from '../src/pages/slots/_shared/lineEngine';
import type { LineSlotProfile } from '../src/pages/slots/_shared/lineEngine';

const state = vi.hoisted(() => ({ debit: vi.fn(), credit: vi.fn(), record: vi.fn(), recordSpin: vi.fn(), consumeNonce: vi.fn(), sound: vi.fn(), reduced: false, funds: 1000 }));
vi.mock('../src/game-context', () => ({ useGame: () => ({
  balance: { balance: state.funds, canAfford: (cost: number) => state.funds >= cost, debit: state.debit, credit: state.credit },
  fairness: { hash: 'hash', consumeNonce: state.consumeNonce },
  history: { record: state.record }, session: { recordSpin: state.recordSpin },
  sound: { play: state.sound, enabled: false },
}) }));
vi.mock('../src/pages/slots/_shared/ArtworkGate', () => ({ ArtworkGate: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/hooks/useMusic', () => ({ useMusic: () => ({ start: vi.fn(), stop: vi.fn(), duck: vi.fn(), musicEnabled: false, setMusicEnabled: vi.fn() }) }));
vi.mock('../src/lib/zeusVoice', () => ({ primeZeus: vi.fn(), cancelZeus: vi.fn(), speakZeus: vi.fn(), zeusLineFor: () => '' }));
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
  state.reduced = false; state.funds = 1000;
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
    expect(screen.getByRole('button', { name: 'Choose bet' })).toBeDisabled();
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
    fireEvent.click(screen.getByRole('button', { name: 'Buy free spins · 100.00' }));
    expect(state.debit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(state.debit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Buy free spins · 100.00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy · 100.00' }));
    expect(state.debit).toHaveBeenCalledWith(100);
    expect(state.record).toHaveBeenCalledTimes(1);
    expect(state.record).toHaveBeenCalledWith(expect.objectContaining({ game: 'Sugar Rush · Bonus Buy', bet: 100 }));
    expect(state.consumeNonce).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(state.record).toHaveBeenCalledTimes(1);
  });

  it('stops autoplay from the integrated cabinet without starting another paid round', async () => {
    viewTumble();
    fireEvent.click(screen.getByRole('button', { name: 'Auto play' }));
    fireEvent.click(screen.getByRole('button', { name: '10 spins' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(state.consumeNonce).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stop autoplay' }));
    expect(screen.queryByRole('button', { name: 'Stop autoplay' })).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(45000); });
    expect(state.consumeNonce).toHaveBeenCalledTimes(1);
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
    expect(screen.getByRole('button', { name: /Turbo (on|off)/ })).toBeDisabled();
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
    const viewKey = `1-${key}`;
    state.consumeNonce.mockReturnValueOnce({ serverSeed: 'sugar-control', clientSeed: 'client', nonce });
    const view = render(<SugarRush />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin · 1.00' }));
    expect(screen.getByRole('button', { name: /Turbo (on|off)/ })).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1190); });
    const candy = view.container.querySelector<HTMLElement>(`[data-slot-cell-key="${viewKey}"]`)!;
    expect(candy.dataset.position).toBe(String(oldPosition));
    const art = candy.innerHTML;
    await act(async () => { await vi.advanceTimersByTimeAsync(1190); });
    const landed = view.container.querySelector<HTMLElement>(`[data-slot-cell-key="${viewKey}"]`)!;
    expect(landed).toBe(candy);
    expect(landed.innerHTML).toBe(art);
    expect(landed.dataset.position).toBe(String(after.cellKeys.indexOf(key)));
  });

  it('does not recycle a previous paid Sugar round’s symbol identities', async () => {
    state.reduced = true;
    const view = render(<SugarRush />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Spin · 1.00' })); });
    const first = [...view.container.querySelectorAll<HTMLElement>('[data-slot-cell-key]')];
    const keys = new Set(first.map((cell) => cell.dataset.slotCellKey));
    expect(first).toHaveLength(49);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Spin · 1.00' })); });
    const second = [...view.container.querySelectorAll<HTMLElement>('[data-slot-cell-key]')];
    expect(second).toHaveLength(49);
    expect(second.every((cell) => !keys.has(cell.dataset.slotCellKey) && !first.includes(cell))).toBe(true);
    expect(view.container.querySelectorAll('[data-slot-exiting]')).toHaveLength(0);
  });

  it('displays the original Sweet Bonanza paytable without an artificial base-game scale', () => {
    render(<Paytable open onClose={() => {}} cfg={sweetBonanzaConfig} renderCell={() => null} />);
    expect(screen.queryByText('19.0×')).not.toBeInTheDocument();
    expect(screen.getAllByText('10.0×').length).toBeGreaterThan(0);
    expect(screen.queryByText('FS 10.0×')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'How to Play' }));
    expect(screen.getByText(/Multiplier symbols appear only during free spins/)).toBeInTheDocument();
  });
});


describe('Wanted bonus purchase ledger', () => {
  it.each(WANTED_BONUSES)('$label requires confirmation and debits $costMultiplier× once', async (option) => {
    const view = render(<LineSlotView profile={WANTED_PROFILE} title="Wanted" subtitle="15 lines" scene={null} symbolMap={{}} accent="#c9a45e" />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy bonus' }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(option.label) }));
    expect(state.debit).not.toHaveBeenCalled();
    expect(screen.getByText(`${option.costMultiplier}.00 credits`)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: `Buy · ${option.costMultiplier}.00` });
    fireEvent.click(confirm); fireEvent.click(confirm);
    const expected = buyLineBonusRound(createRng('control-server', 'client', 2), WANTED_PROFILE, 1, option.id);
    expect(state.debit).toHaveBeenCalledExactlyOnceWith(option.costMultiplier);
    expect(state.consumeNonce).toHaveBeenCalledTimes(1);
    expect(state.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ bet: option.costMultiplier, payout: expected.totalPayout }));
    expect(state.recordSpin).toHaveBeenCalledExactlyOnceWith(option.costMultiplier, expected.totalPayout, true);
    if (expected.totalPayout > 0) expect(state.credit).toHaveBeenCalledExactlyOnceWith(expected.totalPayout);
    fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(state.debit).toHaveBeenCalledTimes(1);
    expect(state.record).toHaveBeenCalledTimes(1);
  });
  it('does not buy on cancel or when funds are insufficient', () => {
    state.funds = 10;
    render(<LineSlotView profile={WANTED_PROFILE} title="Wanted" subtitle="15 lines" scene={null} symbolMap={{}} accent="#c9a45e" />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy bonus' }));
    fireEvent.click(screen.getByRole('button', { name: /The Great Train Robbery/ }));
    expect(screen.getByRole('button', { name: 'Buy · 80.00' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(state.debit).not.toHaveBeenCalled(); expect(state.consumeNonce).not.toHaveBeenCalled();
  });
});

it('original Olympus Ante locks the buy and charges 1.25× without changing base payout stake', () => {
  render(<MemoryRouter><ImmersiveSlotView cfg={gatesOfOlympusConfig} backdropAspect={{ w: 941, h: 1672 }} archInsets={{ left: 8, top: 27, width: 84 }} renderCell={({ symbolId }) => <span>{symbolId}</span>} /></MemoryRouter>);
  fireEvent.click(screen.getByText('Tap to begin').closest('button')!);
  fireEvent.click(screen.getByRole('button', { name: 'Ante off' }));
  expect(screen.getByRole('button', { name: /Buy free spins/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
  expect(state.debit).toHaveBeenCalledExactlyOnceWith(1.25);
});

it('Pharaoh selects 1–3 payable lines, keeps the total bet fixed, and locks line changes during a round', async () => {
  const { PharaohGold } = await import('../src/pages/slots/pharaoh-gold');
  render(<PharaohGold />);
  const selector = screen.getByRole('combobox', { name: 'Active paylines' });
  expect(selector).toHaveValue('3');
  fireEvent.change(selector, { target: { value: '1' } });
  expect(selector).toHaveValue('1');
  expect(screen.getByText('3 reels · 1 active line · Local probabilities')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Spin · 1.00' }));
  expect(state.debit).toHaveBeenCalledExactlyOnceWith(1);
  expect(selector).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(selector).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Rules & pays' }));
  expect(screen.getByText(/Two Cobras can pay/)).toBeInTheDocument();
  expect(screen.queryByText(/3 \/ 4 \/ 5\+ scatters pay/)).not.toBeInTheDocument();
});
