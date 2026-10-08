import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BigBassGame } from '../src/pages/originals/big-bass';
import { BASS_ATLAS } from '../src/pages/originals/big-bass/Art';
import type { BassResult, BassRound } from '../src/pages/originals/big-bass/engine';
import metadata from '../docs/art-v2/bass/atlas-metadata.json';

const state = vi.hoisted(() => ({ game: {} as any, reduced: false, round: null as BassRound | null, plan: vi.fn(), confetti: vi.fn() }));
vi.mock('../src/game-context', () => ({ useGame: () => state.game }));
vi.mock('../src/components/layout/SlotPageLayout', () => ({ SlotPageLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../src/pages/slots/_shared/ArtworkGate', () => ({ ArtworkGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: state.confetti }));
vi.mock('../src/pages/originals/big-bass/engine', async (original) => ({
  ...await original<typeof import('../src/pages/originals/big-bass/engine')>(),
  planRound: (...args: unknown[]) => { state.plan(...args); return state.round; },
}));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  return {
    useReducedMotion: () => state.reduced,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!cache.has(tag)) cache.set(tag, React.forwardRef((props: any, ref) => {
        const { initial, animate, exit, transition, whileTap, whileHover, ...rest } = props;
        return React.createElement(tag, { ...rest, ref, 'data-motion-duration': transition?.duration, 'data-motion-y': animate?.y });
      }));
      return cache.get(tag);
    } }),
  };
});

const outcome = (overrides: Partial<BassResult> = {}): BassResult => ({
  reels: ['bigbass', 'bigbass', 'bigbass', 'ace', 'king', 'tackle', 'queen', 'jack', 'truck', 'anchor', 'ace', 'queen', 'truck', 'jack', 'king'],
  lineSymbol: 'bigbass', lineLength: 3, lineMultiplier: 5, winningPositions: [0, 1, 2], winningLines: [1], scatterCount: 0, scatterMultiplier: 0, fishermanCount: 0,
  moneyValues: new Array(15).fill(0), collectedMultiplier: 0, multiplier: 5, payout: 5, ...overrides,
});
const elapse = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const spin = () => fireEvent.click(screen.getByRole('button', { name: 'Cast reels' }));
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); state.reduced = false;
  state.round = { base: outcome(), bonusAward: 0, feature: [], totalPayout: 5 };
  state.game = {
    balance: { balance: 1000, debit: vi.fn(() => true), credit: vi.fn() },
    fairness: { hash: 'hash', consumeNonce: vi.fn(() => ({ serverSeed: 'server', clientSeed: 'client', nonce: 1 })) },
    sound: { play: vi.fn() }, history: { record: vi.fn() }, session: { recordSpin: vi.fn() },
  };
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); });

describe('Big Bass painted cabinet', () => {
  it('uses every exact padded atlas rectangle and no missing engine symbol', () => {
    expect(BASS_ATLAS.width).toBe(metadata.width); expect(BASS_ATLAS.height).toBe(metadata.height);
    for (const symbol of metadata.symbols) expect(BASS_ATLAS.rects[symbol.name]).toEqual(symbol.recommendedPaddedBboxAbsolute);
    const { container } = render(<BigBassGame />);
    expect(container.querySelectorAll('.bass-cell .painted-slot-crop img')).toHaveLength(15);
    expect(container.textContent).not.toMatch(/[🐟🐠🎣🛻⚓🚤🧔]/u);
    expect(screen.getByRole('region', { name: 'Big Bass Bonanza cabinet' })).toContainElement(screen.getByRole('button', { name: 'Cast reels' }));
  });

  it('loads the real paid target into each moving strip and keeps the same nodes after the normal stop', async () => {
    const { container } = render(<BigBassGame />); spin();
    const targetCells = [...container.querySelectorAll('[data-landing]')];
    const images = targetCells.map(cell => cell.querySelector('img'));
    const before = targetCells.map(cell => cell.getAttribute('data-bass-symbol'));
    expect(before).toEqual(Array.from({ length: 5 }, (_, reel) => [state.round!.base!.reels[reel], state.round!.base!.reels[5 + reel], state.round!.base!.reels[10 + reel]]).flat());
    expect(targetCells).toHaveLength(15);
    expect(state.game.balance.credit).toHaveBeenCalledWith(5);
    expect(screen.getByRole('button', { name: 'Choose bet' })).toBeDisabled();
    await elapse(1310); expect(container.querySelectorAll('.bass-cell-win')).toHaveLength(0);
    await elapse(170);
    expect([...container.querySelectorAll('[data-landing]')]).toEqual(targetCells);
    expect(targetCells.map(cell => cell.querySelector('img'))).toEqual(images);
    expect(container.querySelectorAll('.bass-cell-win')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Cast reels' })).toBeEnabled();
    expect(state.game.history.record).toHaveBeenCalledTimes(1);
  });

  it('shortens Turbo presentation without changing payout, targets or accounting', async () => {
    const { container } = render(<BigBassGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Turbo' })); spin();
    expect(screen.getByRole('button', { name: 'Turbo' })).toBeDisabled();
    const strips = [...container.querySelectorAll('[data-reel-outcome] > [data-motion-duration]')];
    expect(strips.map(strip => +strip.getAttribute('data-motion-duration')!)).toEqual([.8, .93, 1.06, 1.19, 1.32].map(duration => duration * .34));
    await elapse(501);
    expect(screen.getByRole('button', { name: 'Cast reels' })).toBeEnabled();
    expect(state.game.balance.debit).toHaveBeenCalledWith(1);
    expect(state.game.balance.credit).toHaveBeenCalledWith(5);
  });

  it('uses repeated busy clicks to skip one wager and retains its prepared landing', async () => {
    const { container } = render(<BigBassGame />); spin();
    const finalImages = [...container.querySelectorAll('[data-landing] img')];
    const skip = screen.getByRole('button', { name: 'Skip reveal' });
    fireEvent.click(skip); fireEvent.click(skip);
    await elapse(200);
    expect(screen.getByRole('button', { name: 'Cast reels' })).toBeEnabled();
    expect([...container.querySelectorAll('[data-landing] img')]).toEqual(finalImages);
    expect(state.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(state.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
    expect(state.game.history.record).toHaveBeenCalledTimes(1);
  });

  it('removes reel travel and confetti in reduced motion', async () => {
    state.reduced = true; state.round!.totalPayout = 100;
    const { container } = render(<BigBassGame />); spin();
    expect([...container.querySelectorAll('[data-reel-outcome] > [data-motion-duration]')].every(strip => strip.getAttribute('data-motion-duration') === '0')).toBe(true);
    await elapse(20);
    expect(screen.getByRole('button', { name: 'Cast reels' })).toBeEnabled();
    expect(state.confetti).not.toHaveBeenCalled();
    expect(state.game.balance.credit).toHaveBeenCalledWith(100);
  });

  it('discloses a 100× local purchase, lets Cancel leave all accounting untouched, and blocks background hotkeys', () => {
    render(<BigBassGame />); fireEvent.click(screen.getByRole('button', { name: 'Buy Free Spins' }));
    const dialog = screen.getByRole('dialog', { name: 'Buy Free Spins' });
    expect(dialog).toHaveTextContent('10 free spins'); expect(dialog).toHaveTextContent('Total cost · 100× bet');
    expect(dialog).toHaveTextContent('Local demo shortcut'); expect(dialog).toHaveTextContent('100.00');
    expect(dialog).not.toHaveTextContent('average return');
    fireEvent.keyDown(window, { key: ' ' });
    expect(state.game.balance.debit).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(state.game.fairness.consumeNonce).not.toHaveBeenCalled();
  });

  it('charges the confirmed current bet once and renders bonus money before its actual-target landing', async () => {
    const moneyValues = new Array(15).fill(0); moneyValues[0] = 20;
    const featureResult = outcome({ moneyValues, collectedMultiplier: 20, fishermanCount: 1, payout: 45 });
    state.round = { base: null, bonusAward: 10, feature: [{ result: featureResult, remaining: 0, collectorMultiplier: 2, addedSpins: 0, runningWin: 45 }], totalPayout: 45 };
    const { container } = render(<BigBassGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase bet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy Free Spins' }));
    const confirm = screen.getByRole('button', { name: 'Confirm · 200.00' });
    act(() => { confirm.click(); confirm.click(); });
    expect(state.game.balance.debit).toHaveBeenCalledTimes(1); expect(state.game.balance.debit).toHaveBeenCalledWith(200);
    expect(state.plan).toHaveBeenCalledWith(expect.anything(), 2, true);
    expect(state.game.balance.credit).toHaveBeenCalledWith(45);
    await elapse(1401);
    const money = container.querySelector('[data-landing="0"] .bass-money-value');
    expect(money).toHaveTextContent('20×');
    expect(container.querySelectorAll('.bass-cell-win')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Skip reveal' })); await elapse(200);
    expect(container.querySelector('[data-landing="0"] .bass-money-value')).toBe(money);
    expect(screen.getByRole('button', { name: 'Cast reels' })).toBeEnabled();
    expect(state.game.history.record).toHaveBeenCalledTimes(1);
  });

  it('settles the whole feature before departure and never repeats credit after unmount', async () => {
    const view = render(<BigBassGame />); spin(); view.unmount(); await elapse(60000);
    expect(state.game.balance.credit).toHaveBeenCalledTimes(1);
    expect(state.game.history.record).toHaveBeenCalledTimes(1);
    expect(state.game.session.recordSpin).toHaveBeenCalledTimes(1);
  });

  it('locks settings during autoplay and Stop prevents another round', async () => {
    render(<BigBassGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Autoplay settings' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Number of bets' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start Autobet' }));
    expect(state.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Buy Free Spins' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Paytable and rules' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop autoplay' }));
    await elapse(10000);
    expect(state.game.balance.debit).toHaveBeenCalledTimes(1);
  });

  it('does not accept an unaffordable bonus or a zero-stake cast', () => {
    state.game.balance.balance = 99;
    render(<BigBassGame />);
    expect(screen.getByRole('button', { name: 'Buy Free Spins' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose bet' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Bet amount' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: 'Cast reels' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Buy Free Spins' })).toBeDisabled();
  });
});

describe('Big Bass public-rules presentation', () => {
  it('shows the unchanged public paytable, two-symbol column, delayed multipliers and round cap', () => {
    render(<BigBassGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Paytable and rules' }));
    const dialog = screen.getByRole('dialog', { name: 'Paytable and rules' });
    expect(dialog.querySelector('.bass-paytable-heading')?.textContent).toBe('Symbol2345');
    expect(dialog.querySelectorAll('.bass-paytable-row')).toHaveLength(10);
    expect(dialog.querySelector('.bass-paytable-row')).toHaveTextContent('0.50×5.00×20.00×200.00×');
    expect(dialog).toHaveTextContent('published paytable is used unchanged');
    expect(dialog).toHaveTextContent('after the preceding batch ends');
    expect(dialog).toHaveTextContent('no separate scatter payout');
    expect(dialog).toHaveTextContent('2,100×');
    expect(dialog).not.toHaveTextContent('scaled returns');
  });

  it('reveals an added fish only after the paid reel landing without another wager or line calculation', async () => {
    const featureResult = outcome({ extraFish: [{ position: 3, value: 50 }], collectedMultiplier: 50, fishermanCount: 1, payout: 55 });
    state.round = { base: null, bonusAward: 10, feature: [{ result: featureResult, remaining: 0, collectorMultiplier: 1, addedSpins: 0, runningWin: 55 }], totalPayout: 55 };
    const { container } = render(<BigBassGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy Free Spins' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm · 100.00' }));
    await elapse(1401);
    const landing = container.querySelectorAll('[data-reel-outcome]')[3]!.querySelector('[data-landing="0"]');
    expect(landing).toHaveAttribute('data-bass-symbol', 'ace');
    expect(landing?.querySelector('.bass-money-value')).toBeNull();
    await elapse(1319);
    expect(landing).toHaveAttribute('data-bass-symbol', 'ace');
    await elapse(301);
    expect(landing).toHaveAttribute('data-bass-symbol', 'bigbass');
    expect(landing?.querySelector('.bass-money-value')).toHaveTextContent('50×');
    expect(state.plan).toHaveBeenCalledTimes(1);
    expect(state.game.balance.debit).toHaveBeenCalledTimes(1);
    expect(state.game.history.record).toHaveBeenCalledTimes(1);
    expect(state.game.history.record).toHaveBeenCalledWith(expect.objectContaining({ game: 'Big Bass · Demo Bonus', bet: 100, payout: 55, multiplier: .55 }));
  });

  it('settles and records one capped demo-bonus round even when its animation is interrupted', async () => {
    const featureResult = outcome({ payout: 2100, multiplier: 2100, capped: true });
    state.round = { base: null, bonusAward: 10, feature: [{ result: featureResult, remaining: 0, collectorMultiplier: 1, addedSpins: 0, runningWin: 2100 }], totalPayout: 2100, capped: true };
    const view = render(<BigBassGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy Free Spins' }));
    const confirm = screen.getByRole('button', { name: 'Confirm · 100.00' });
    act(() => { confirm.click(); confirm.click(); });
    expect(state.game.balance.debit).toHaveBeenCalledExactlyOnceWith(100);
    expect(state.game.balance.credit).toHaveBeenCalledExactlyOnceWith(2100);
    expect(state.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
    expect(state.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ game: 'Big Bass · Demo Bonus', bet: 100, payout: 2100, multiplier: 21 }));
    await elapse(1450);
    view.unmount(); await elapse(120000);
    expect(state.game.balance.credit).toHaveBeenCalledTimes(1);
    expect(state.game.history.record).toHaveBeenCalledTimes(1);
    expect(state.game.session.recordSpin).toHaveBeenCalledExactlyOnceWith(100, 2100, true, 2100);
  });
});

it('supports Enter to cast or skip while keeping settings modals and repeated wagers guarded', async () => {
  render(<BigBassGame />);
  fireEvent.click(screen.getByRole('button', { name: 'Paytable and rules' }));
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(state.game.balance.debit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Back to the lake' }));
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(state.game.balance.debit).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(window, { key: 'Enter' });
  fireEvent.keyDown(window, { key: 'Enter', repeat: true });
  await elapse(200);
  expect(screen.getByRole('button', { name: 'Cast reels' })).toBeEnabled();
  expect(state.game.balance.debit).toHaveBeenCalledTimes(1);
  expect(state.game.fairness.consumeNonce).toHaveBeenCalledTimes(1);
});
