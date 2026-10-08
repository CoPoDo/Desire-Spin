import { StrictMode, useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaySessionGuard, PLAY_SESSION_LOCK } from '../src/components/PlaySessionGuard';
import { GameProvider } from '../src/components/layout/GameProvider';
import { useGame } from '../src/game-context';
import { useInteractiveRound } from '../src/pages/originals/_shared/useInteractiveRound';
import { loadJson, removeKey, saveJson } from '../src/lib/storage';

/** Models the browser's asynchronous exclusive-lock queue, including aborts. */
function createLocks() {
  type Request = { name: string; start: () => void; cancelled: boolean };
  const queue: Request[] = [];
  let held = false;
  let maximumHeld = 0;
  const pump = () => {
    if (held) return;
    const next = queue.shift();
    if (!next) return;
    if (next.cancelled) { pump(); return; }
    held = true;
    maximumHeld = Math.max(maximumHeld, 1);
    queueMicrotask(next.start);
  };
  const request = vi.fn((name: string, options: LockOptions, callback: LockGrantedCallback<unknown>) => new Promise((resolve, reject) => {
    let started = false;
    const item: Request = { name, cancelled: false, start: () => {
      started = true;
      options.signal?.removeEventListener('abort', abort);
      if (item.cancelled) { held = false; pump(); return; }
      Promise.resolve(callback({ name, mode: 'exclusive' })).then(resolve, reject).finally(() => { held = false; pump(); });
    } };
    const abort = () => {
      if (started) return;
      item.cancelled = true;
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort', abort, { once: true });
    queue.push(item);
    pump();
  }));
  return { request, get held() { return held; }, get maximumHeld() { return maximumHeld; } };
}
const flush = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };
let locks: ReturnType<typeof createLocks>;
beforeEach(() => {
  localStorage.clear();
  locks = createLocks();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: locks });
});
afterEach(async () => {
  cleanup();
  await flush();
  Reflect.deleteProperty(navigator, 'locks');
  vi.restoreAllMocks();
});

describe('single-document play ownership', () => {
  it('does not mount or sanitize game state while another document holds the lock', async () => {
    let releaseOther!: () => void;
    void locks.request(PLAY_SESSION_LOCK, {}, () => new Promise<void>((resolve) => { releaseOther = resolve; }));
    await flush();
    localStorage.setItem('desire-spin:v1:balance', '37.125');
    render(<PlaySessionGuard><GameProvider><span>Game ready</span></GameProvider></PlaySessionGuard>);
    expect(screen.queryByText('Game ready')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Close the other Desire Spin tab');
    expect(localStorage.getItem('desire-spin:v1:balance')).toBe('37.125');
    releaseOther();
    await flush();
    expect(screen.getByText('Game ready')).toBeInTheDocument();
    expect(loadJson('balance', 0)).toBe(37.13);
  });

  it('lets the next tab load final state after the owner settles and unmounts, without replaying its journal', async () => {
    const mounts: string[] = [];
    let settlements = 0;
    function Round({ name }: { name: string }) {
      const game = useGame();
      useEffect(() => {
        mounts.push(name);
        const settle = () => {
          const pending = loadJson<number | null>('guard-test-pending', null);
          if (pending !== null) {
            game.balance.credit(pending);
            removeKey('guard-test-pending');
            settlements++;
          }
        };
        settle();
        return settle;
      }, []);
      return <span>{name}: {game.balance.balance}</span>;
    }
    const first = render(<PlaySessionGuard><GameProvider><Round name="First" /></GameProvider></PlaySessionGuard>);
    await flush();
    act(() => saveJson('guard-test-pending', 7));
    render(<PlaySessionGuard><GameProvider><Round name="Second" /></GameProvider></PlaySessionGuard>);
    await flush();
    expect(mounts).toEqual(['First']);
    expect(settlements).toBe(0);
    first.unmount();
    await flush();
    expect(mounts).toEqual(['First', 'Second']);
    expect(screen.getByText('Second: 1007')).toBeInTheDocument();
    expect(settlements).toBe(1);
  });

  it('cancels a queued waiter and survives StrictMode cleanup plus a fast remount', async () => {
    const first = render(<StrictMode><PlaySessionGuard><span>Owner one</span></PlaySessionGuard></StrictMode>);
    await flush();
    expect(screen.getByText('Owner one')).toBeInTheDocument();
    const cancelled = render(<PlaySessionGuard><span>Cancelled waiter</span></PlaySessionGuard>);
    cancelled.unmount();
    first.unmount();
    render(<StrictMode><PlaySessionGuard><span>Owner two</span></PlaySessionGuard></StrictMode>);
    await flush();
    expect(screen.queryByText('Cancelled waiter')).not.toBeInTheDocument();
    expect(screen.getByText('Owner two')).toBeInTheDocument();
    expect(locks.maximumHeld).toBe(1);
    expect(locks.request.mock.calls.every(([, options]) => options.steal !== true)).toBe(true);
  });

  it('settles children before releasing on pagehide and reacquires before a fresh pageshow mount', async () => {
    let cleanupCount = 0;
    let mountCount = 0;
    function Round() {
      useEffect(() => { mountCount++; return () => { cleanupCount++; }; }, []);
      return <span>Live round</span>;
    }
    render(<PlaySessionGuard><Round /></PlaySessionGuard>);
    await flush();
    let releaseOther!: () => void;
    let otherSawCleanup = -1;
    void locks.request(PLAY_SESSION_LOCK, {}, () => {
      otherSawCleanup = cleanupCount;
      return new Promise<void>((resolve) => { releaseOther = resolve; });
    });
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(screen.queryByText('Live round')).not.toBeInTheDocument();
    await flush();
    expect(otherSawCleanup).toBe(1);
    act(() => window.dispatchEvent(new Event('pageshow')));
    await flush();
    expect(mountCount).toBe(1);
    releaseOther();
    await flush();
    expect(screen.getByText('Live round')).toBeInTheDocument();
    expect(mountCount).toBe(2);
  });

  it('settles an actual interactive wager once across pagehide and reacquisition', async () => {
    function InteractiveRound() {
      const round = useInteractiveRound('Guard regression');
      round.onLeave.current = () => 12.2;
      return <button onClick={() => round.begin(10)}>Start round</button>;
    }
    render(<PlaySessionGuard><GameProvider><InteractiveRound /></GameProvider></PlaySessionGuard>);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
    expect(loadJson('balance', 0)).toBe(990);
    let releaseOther!: () => void;
    void locks.request(PLAY_SESSION_LOCK, {}, () => new Promise<void>((resolve) => { releaseOther = resolve; }));
    act(() => window.dispatchEvent(new Event('pagehide')));
    await flush();
    expect(loadJson('balance', 0)).toBe(1002.2);
    expect(loadJson<unknown[]>('bet-history', [])).toHaveLength(1);
    expect(loadJson<{ spins: number }>('session-stats', { spins: 0 }).spins).toBe(1);
    act(() => window.dispatchEvent(new Event('pageshow')));
    releaseOther();
    await flush();
    act(() => window.dispatchEvent(new Event('pagehide')));
    await flush();
    expect(loadJson('balance', 0)).toBe(1002.2);
    expect(loadJson<unknown[]>('bet-history', [])).toHaveLength(1);
    expect(loadJson<{ current: { nonce: number } }>('fairness', { current: { nonce: 0 } }).current.nonce).toBe(1);
  });

  it('fails closed without touching saved data when Web Locks is absent', async () => {
    Reflect.deleteProperty(navigator, 'locks');
    saveJson('balance', 42);
    render(<PlaySessionGuard><GameProvider><span>Game ready</span></GameProvider></PlaySessionGuard>);
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Your saved data has not been changed');
    expect(screen.queryByText('Game ready')).not.toBeInTheDocument();
    expect(loadJson('balance', 0)).toBe(42);
    expect(localStorage.getItem('desire-spin:v1:fairness')).toBeNull();
  });

  it('guards the actual App before any provider initializes saved state', async () => {
    Reflect.deleteProperty(navigator, 'locks');
    localStorage.setItem('desire-spin:v1:balance', '18.125');
    render(<MemoryRouter><App /></MemoryRouter>);
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Safe play is unavailable');
    expect(localStorage.getItem('desire-spin:v1:balance')).toBe('18.125');
    expect(localStorage.getItem('desire-spin:v1:fairness')).toBeNull();
  });

  it('handles browser policy rejection without mounting the game', async () => {
    locks.request.mockRejectedValue(new DOMException('Denied', 'SecurityError'));
    render(<PlaySessionGuard><span>Game ready</span></PlaySessionGuard>);
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Safe play is unavailable');
    expect(screen.queryByText('Game ready')).not.toBeInTheDocument();
  });
});
