import { StrictMode, useEffect, type ReactNode } from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBalance } from '../src/hooks/useBalance';
import { useBetHistory, MAX_HISTORY } from '../src/hooks/useBetHistory';
import { useSessionStats } from '../src/hooks/useSessionStats';
import { useFairness } from '../src/hooks/useFairness';
import { usePersistedBet } from '../src/hooks/usePersistedBet';
import { useFavorites } from '../src/hooks/useFavorites';
import { useSound } from '../src/hooks/useSound';
import { useMusic } from '../src/hooks/useMusic';
import { GameProvider } from '../src/components/layout/GameProvider';
import { useGame, type GameContextValue } from '../src/game-context';
import { loadJson, saveJson, removeKey } from '../src/lib/storage';
import { MAX_MONEY } from '../src/lib/accounting';
import { sha256Hex } from '../src/lib/fairness';

const PREFIX = 'desire-spin:v1:';
const NOW = 1_750_000_000_000;
const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
const entry = (nonce = 0) => ({
  game: 'Dice', bet: 1, payout: 2, multiplier: 2,
  serverSeedHash: sha256Hex('local-test-server'), clientSeed: 'test-client', nonce,
});
const save = (key: string, value: unknown) => localStorage.setItem(PREFIX + key, JSON.stringify(value));
const read = (key: string) => JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null');

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('safe storage', () => {
  it('handles malformed JSON and validators without deleting other settings', () => {
    localStorage.setItem(PREFIX + 'broken', '{');
    save('flag', 'true');
    save('good', 42);
    expect(loadJson('broken', 7)).toBe(7);
    expect(loadJson('flag', false, (v) => typeof v === 'boolean')).toBe(false);
    expect(loadJson('good', 0)).toBe(42);
  });

  it('handles browsers that expose storage but reject reads or writes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    expect(loadJson('balance', 1000)).toBe(1000);
    expect(() => saveJson('balance', 25)).not.toThrow();
    expect(() => removeKey('balance')).not.toThrow();
  });
});

describe('atomic play-money wallet', () => {
  it.each([null, '50', {}, -5, 1e100])('repairs invalid stored balance %j', (value) => {
    save('balance', value);
    const { result } = renderHook(useBalance, { wrapper: strict });
    expect(result.current.balance).toBe(1000);
    expect(read('balance')).toBe(1000);
  });

  it('preserves valid legacy balance, including an empty wallet', () => {
    save('balance', 0);
    const hook = renderHook(useBalance);
    expect(hook.result.current.balance).toBe(0);
    hook.unmount();
    save('balance', 25.127);
    const restored = renderHook(useBalance);
    expect(restored.result.current.balance).toBe(25.13);
    expect(read('balance')).toBe(25.13);
  });

  it('rejects negative, non-finite, tiny, and insufficient debits without minting money', () => {
    save('balance', 1);
    const { result } = renderHook(useBalance);
    act(() => {
      for (const amount of [-1, NaN, Infinity, -Infinity, 0, 0.001, 1.01]) {
        expect(result.current.debit(amount)).toBe(false);
      }
      for (const amount of [-1, NaN, Infinity]) expect(result.current.credit(amount)).toBe(false);
      expect(result.current.reset(NaN)).toBe(false);
    });
    expect(result.current.balance).toBe(1);
    expect(read('balance')).toBe(1);
  });

  it('serializes same-tick and stale-closure debit/credit/setter sequences', () => {
    save('balance', 1);
    const { result } = renderHook(useBalance, { wrapper: strict });
    const first = result.current;
    act(() => {
      expect(first.debit(0.6)).toBe(true);
      expect(first.getBalance()).toBe(0.4);
      expect(first.canAfford(0.6)).toBe(false);
      expect(first.debit(0.6)).toBe(false);
      expect(first.credit(0.1)).toBe(true);
      expect(first.setBalance((current) => current + 0.25)).toBe(true);
      expect(first.debit(0.75)).toBe(true);
      expect(read('balance')).toBe(0); // durable even before React commits
    });
    expect(result.current.balance).toBe(0);
    expect(first.canAfford(0.01)).toBe(false);
  });

  it('never drifts across repeated decimal transactions or overflows on credit', () => {
    save('balance', 10);
    const { result } = renderHook(useBalance);
    act(() => { for (let i = 0; i < 100; i++) expect(result.current.debit(0.1)).toBe(true); });
    expect(result.current.balance).toBe(0);
    act(() => {
      expect(result.current.reset(MAX_MONEY)).toBe(true);
      expect(result.current.credit(MAX_MONEY)).toBe(false);
    });
    expect(result.current.balance).toBe(MAX_MONEY);
  });

  it('does not let a mount effect overwrite a child recovery credit', () => {
    let wallet: GameContextValue['balance'] | undefined;
    function Recover() {
      const game = useGame();
      wallet = game.balance;
      useEffect(() => { game.balance.credit(12.5); }, []);
      return null;
    }
    render(<GameProvider><Recover /></GameProvider>);
    expect(wallet?.balance).toBe(1012.5);
    expect(read('balance')).toBe(1012.5);
  });
});

describe('play statistics', () => {
  it('repairs fields independently while preserving valid existing totals', () => {
    save('session-stats', {
      startedAt: NOW - 120000, spins: 7, freeSpinsTriggered: -3,
      totalWagered: 14.5, totalWon: 'NaN', biggestWin: 9.9, biggestMultiplier: null,
    });
    const { result } = renderHook(useSessionStats);
    expect(result.current.stats).toEqual({
      startedAt: NOW - 120000, spins: 7, freeSpinsTriggered: 0,
      totalWagered: 14.5, totalWon: 0, biggestWin: 9.9, biggestMultiplier: 0,
    });
    expect(read('session-stats')).toEqual(result.current.stats);
  });

  it('accounts for paid, losing, refunded, and free rounds without a fake free-spin ratio', () => {
    const { result } = renderHook(useSessionStats, { wrapper: strict });
    act(() => {
      result.current.recordSpin(2, 5, true);
      result.current.recordSpin(1, 0, false);
      result.current.recordSpin(1, 1, false);
      result.current.recordSpin(0, 12, false);
      result.current.recordSpin(0, 3, false, 3);
    });
    expect(result.current.stats).toEqual({
      startedAt: NOW, spins: 5, freeSpinsTriggered: 1,
      totalWagered: 4, totalWon: 21, biggestWin: 12, biggestMultiplier: 3,
    });
    expect(read('session-stats')).toEqual(result.current.stats);
  });

  it('rejects invalid records and updates reset plus record atomically', () => {
    const { result } = renderHook(useSessionStats);
    act(() => {
      expect(result.current.recordSpin(-1, 1, false)).toBe(false);
      expect(result.current.recordSpin(1, NaN, false)).toBe(false);
      expect(result.current.recordSpin(0, 1, false, Infinity)).toBe(false);
      result.current.recordSpin(20, 30, false);
      result.current.reset();
      result.current.recordSpin(0.1, 0.3, false);
    });
    expect(result.current.stats.spins).toBe(1);
    expect(result.current.stats.totalWagered).toBe(0.1);
    expect(result.current.stats.totalWon).toBe(0.3);
    expect(result.current.stats.biggestMultiplier).toBe(3);
  });
});

describe('bounded durable history', () => {
  it('drops only malformed or duplicate legacy records and retains valid data', () => {
    const valid = { ...entry(), id: 'kept', ts: NOW };
    save('bet-history', [null, { ...valid, id: 'negative', bet: -3 }, valid, valid, { ...valid, id: 'old', ts: NOW - 100 }]);
    const { result } = renderHook(useBetHistory);
    expect(result.current.history.map((record) => record.id)).toEqual(['kept', 'old']);
    expect(read('bet-history')).toEqual(result.current.history);
  });

  it('handles a wrong stored container shape', () => {
    save('bet-history', { history: [] });
    const { result } = renderHook(useBetHistory);
    expect(result.current.history).toEqual([]);
  });

  it('keeps the latest 50 entries through a rapid batch and immediate reload', () => {
    const hook = renderHook(useBetHistory, { wrapper: strict });
    act(() => {
      for (let i = 0; i < MAX_HISTORY + 5; i++) hook.result.current.record(entry(i));
      expect(read('bet-history')).toHaveLength(MAX_HISTORY);
    });
    expect(hook.result.current.history.map((record) => record.nonce)).toEqual(
      Array.from({ length: MAX_HISTORY }, (_, index) => MAX_HISTORY + 4 - index),
    );
    expect(new Set(hook.result.current.history.map((record) => record.id)).size).toBe(MAX_HISTORY);
    hook.unmount();
    const restored = renderHook(useBetHistory);
    expect(restored.result.current.history[0]?.nonce).toBe(54);
  });

  it('rejects invalid records, then supports clear and record within one batch', () => {
    const { result } = renderHook(useBetHistory);
    act(() => {
      expect(result.current.record({ ...entry(), payout: NaN })).toBe(null);
      result.current.record(entry(1));
      result.current.clear();
      result.current.record(entry(2));
    });
    expect(result.current.history.map((record) => record.nonce)).toEqual([2]);
    expect(read('bet-history')[0].nonce).toBe(2);
  });
});

describe('fairness and preference recovery', () => {
  it('preserves valid local seeds and nonce while repairing a stale derived hash', () => {
    const current = { serverSeed: 'valid-server', clientSeed: 'valid-client', nonce: 17 };
    save('fairness', { current, currentHash: 'damaged', previous: {} });
    const { result } = renderHook(useFairness, { wrapper: strict });
    expect(result.current.seeds).toEqual(current);
    expect(result.current.hash).toBe(sha256Hex('valid-server'));
    expect(result.current.previous).toBeUndefined();
    act(() => {
      expect(result.current.consumeNonce().nonce).toBe(17);
      expect(result.current.consumeNonce().nonce).toBe(18);
      expect(read('fairness').current.nonce).toBe(19);
    });
    expect(result.current.seeds.nonce).toBe(19);
  });

  it('replaces malformed fairness state with a usable new seed pair', () => {
    save('fairness', { current: { serverSeed: null, clientSeed: [], nonce: -2 } });
    const { result } = renderHook(useFairness);
    expect(result.current.seeds.serverSeed).toMatch(/^[0-9a-f]{64}$/);
    expect(result.current.seeds.nonce).toBe(0);
    expect(result.current.hash).toBe(sha256Hex(result.current.seeds.serverSeed));
  });

  it('rotates and reveals exactly the seed pair previously in use', () => {
    const { result } = renderHook(useFairness);
    let before: typeof result.current.seeds;
    act(() => {
      result.current.setClientSeed('  stable-client  ');
      result.current.consumeNonce();
    });
    before = result.current.seeds;
    act(() => result.current.rotate());
    expect(result.current.previous).toEqual({ ...before, revealed: true });
    expect(result.current.seeds.clientSeed).toBe('stable-client');
    expect(result.current.seeds.nonce).toBe(0);
    expect(result.current.seeds.serverSeed).not.toBe(before.serverSeed);
    expect(read('fairness').currentHash).toBe(result.current.hash);
  });

  it('repairs persisted stakes and switches game keys without overwriting another game', () => {
    save('bet:dice', 'bad');
    save('bet:mines', 7.25);
    const { result, rerender } = renderHook(({ game }) => usePersistedBet(game, 1), { initialProps: { game: 'dice' } });
    expect(result.current[0]).toBe(1);
    act(() => { result.current[1](NaN); result.current[1](-1); result.current[1](0.001); });
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](1.235));
    expect(result.current[0]).toBe(1.24);
    rerender({ game: 'mines' });
    expect(result.current[0]).toBe(7.25);
    expect(read('bet:dice')).toBe(1.24);
    expect(read('bet:mines')).toBe(7.25);
  });

  it('repairs malformed preferences and preserves valid favorite routes', () => {
    save('favorites', ['/originals/dice', '/originals/dice', null, '/slots/big-juan', 'javascript:alert(1)']);
    save('sound-on', 'false');
    save('music-on', {});
    const favorites = renderHook(useFavorites);
    const sound = renderHook(useSound);
    const music = renderHook(() => useMusic({ soundEnabled: false }));
    expect(favorites.result.current.list).toEqual(['/originals/dice', '/slots/big-juan']);
    expect(sound.result.current.enabled).toBe(true);
    expect(music.result.current.musicEnabled).toBe(true);
    act(() => { favorites.result.current.toggle('/originals/dice'); favorites.result.current.toggle('/originals/dice'); });
    expect(new Set(favorites.result.current.list)).toEqual(new Set(['/originals/dice', '/slots/big-juan']));
  });
});
