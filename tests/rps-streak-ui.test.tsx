import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRng, sha256Hex } from '../src/lib/fairness';
import { pickOpponent, type Move } from '../src/pages/originals/rps/engine';
import { RpsGame } from '../src/pages/originals/rps';
const fixture = vi.hoisted(() => ({ game: {} as any, credits: 1000, nonce: 0 }));
vi.mock('../src/game-context', () => ({ useGame: () => fixture.game }));
vi.mock('../src/components/layout/OriginalPageLayout', () => ({ OriginalPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const SERVER = 'rps-streak-regression';
const CLIENT = 'client';
function selectSequence(sequence: Move[]) {
  for (let nonce = 0; nonce < 10000; nonce++) {
    const rng = createRng(SERVER, CLIENT, nonce);
    if (sequence.every((move) => pickOpponent(rng) === move)) { fixture.nonce = nonce; return; }
  }
  throw new Error('No fixture seed');
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); fixture.credits = 1000; fixture.nonce = 0;
  fixture.game = {
    balance: { get balance() { return fixture.credits; }, getBalance: () => fixture.credits,
      canAfford: (cost: number) => cost > 0 && cost <= fixture.credits,
      debit: vi.fn((cost: number) => { if (cost <= 0 || cost > fixture.credits) return false; fixture.credits = +(fixture.credits - cost).toFixed(2); return true; }),
      credit: vi.fn((amount: number) => { fixture.credits = +(fixture.credits + amount).toFixed(2); return true; }) },
    fairness: { hash: sha256Hex(SERVER), consumeNonce: vi.fn(() => ({ serverSeed: SERVER, clientSeed: CLIENT, nonce: fixture.nonce++ })) },
    history: { record: vi.fn() }, session: { recordSpin: vi.fn() }, sound: { play: vi.fn() },
  };
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); });
const reveal = () => act(() => vi.advanceTimersByTime(700));
const rock = () => fireEvent.click(screen.getByRole('button', { name: 'Choose Rock' }));
describe('RPS streak UI accounting', () => {
  it('uses one stake/nonce across wins and ties, then pays 3.92× only on cashout', () => {
    selectSequence(['scissors', 'rock', 'scissors']); render(<RpsGame />);
    rock(); reveal(); rock(); reveal(); rock(); reveal();
    expect(fixture.game.balance.debit).toHaveBeenCalledExactlyOnceWith(1);
    expect(fixture.game.fairness.consumeNonce).toHaveBeenCalledOnce();
    expect(fixture.game.balance.credit).not.toHaveBeenCalled();
    expect(fixture.game.history.record).not.toHaveBeenCalled();
    const button = screen.getByRole('button', { name: 'Cash out · 3.92' });
    fireEvent.click(button); fireEvent.click(button);
    expect(fixture.credits).toBe(1002.92);
    expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ game: 'Rock Paper Scissors', bet: 1, payout: 3.92, multiplier: 3.92 }));
  });
  it('does not let a repeated click duplicate a throw and loss settles once', () => {
    selectSequence(['paper']); render(<RpsGame />);
    rock(); rock(); reveal();
    expect(fixture.credits).toBe(999);
    expect(fixture.game.balance.debit).toHaveBeenCalledOnce();
    expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ payout: 0 }));
  });
  it('settles the committed winning throw when leaving during its animation', () => {
    selectSequence(['scissors']); const view = render(<RpsGame />); rock(); view.unmount(); reveal();
    expect(fixture.credits).toBe(1000.96);
    expect(fixture.game.history.record).toHaveBeenCalledOnce();
    expect(fixture.game.session.recordSpin).toHaveBeenCalledExactlyOnceWith(1, 1.96, false);
  });
  it('returns an undecided tied stake on pagehide without duplicate settlement', () => {
    selectSequence(['rock']); render(<RpsGame />); rock(); reveal();
    expect(screen.getByRole('button', { name: 'Cash out · 1.00' })).toBeDisabled();
    act(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pagehide')); });
    expect(fixture.credits).toBe(1000);
    expect(fixture.game.history.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ bet: 1, payout: 1 }));
  });
});
