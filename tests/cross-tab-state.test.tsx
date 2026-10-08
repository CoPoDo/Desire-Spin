import { useEffect } from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBalance } from '../src/hooks/useBalance';
import { useFairness } from '../src/hooks/useFairness';
import { useBetHistory, CURRENT_RULES_VERSION } from '../src/hooks/useBetHistory';
import { useSessionStats } from '../src/hooks/useSessionStats';
import { sha256Hex } from '../src/lib/fairness';

const prefix = 'desire-spin:v1:';
const save = (key: string, value: unknown) => localStorage.setItem(prefix + key, JSON.stringify(value));
const read = (key: string) => JSON.parse(localStorage.getItem(prefix + key) ?? 'null');
const entry = (nonce = 0) => ({
  game: 'Dice', bet: 1, payout: 2, multiplier: 2,
  serverSeedHash: sha256Hex('local-test-server'), clientSeed: 'test-client', nonce,
});
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('authoritative stored game state', () => {
  it('does not let a stale wallet instance undo an earlier debit', () => {
    const first = renderHook(useBalance);
    const second = renderHook(useBalance);
    act(() => {
      expect(first.result.current.debit(100)).toBe(true);
      expect(second.result.current.debit(100)).toBe(true);
    });
    expect(read('balance')).toBe(800);
    expect(first.result.current.balance).toBe(800);
    expect(second.result.current.balance).toBe(800);
  });

  it('does not reuse a consumed nonce in a stale hook instance', () => {
    const first = renderHook(useFairness);
    const second = renderHook(useFairness);
    act(() => {
      expect(first.result.current.consumeNonce().nonce).toBe(0);
      expect(second.result.current.consumeNonce().nonce).toBe(1);
    });
    expect(read('fairness').current.nonce).toBe(2);
  });

  it('retains rounds and totals added through another instance', () => {
    const first = renderHook(() => ({ history: useBetHistory(), session: useSessionStats() }));
    const second = renderHook(() => ({ history: useBetHistory(), session: useSessionStats() }));
    act(() => {
      first.result.current.history.record(entry(0));
      first.result.current.session.recordSpin(1, 2, false);
      second.result.current.history.record(entry(1));
      second.result.current.session.recordSpin(1, 2, false);
    });
    expect(read('bet-history').map((record: { nonce: number }) => record.nonce)).toEqual([1, 0]);
    expect(read('session-stats').spins).toBe(2);
    expect(read('session-stats').totalWagered).toBe(2);
    expect(read('session-stats').totalWon).toBe(4);
  });

  it('refreshes external writes before mutation even before the storage event arrives', () => {
    const hook = renderHook(useBalance);
    save('balance', 250);
    act(() => expect(hook.result.current.debit(25)).toBe(true));
    expect(read('balance')).toBe(225);
  });

  it('does not overwrite a newer external value in its delayed mount effect', () => {
    function ChangeSavedBalance() {
      useEffect(() => { save('balance', 18); }, []);
      return null;
    }
    function Wallet() {
      const wallet = useBalance();
      return <><span>{wallet.balance}</span><ChangeSavedBalance /></>;
    }
    render(<Wallet />);
    expect(read('balance')).toBe(18);
  });

  it('keeps the current in-memory wallet and nonce when persistence rejects writes', () => {
    const wallet = renderHook(useBalance);
    const fairness = renderHook(useFairness);
    const original = window.localStorage;
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue({
      getItem: original.getItem.bind(original),
      setItem: () => { throw new Error('Quota exceeded'); },
      removeItem: original.removeItem.bind(original),
      clear: original.clear.bind(original),
      key: original.key.bind(original),
      length: original.length,
    });
    act(() => {
      expect(wallet.result.current.debit(100)).toBe(true);
      expect(wallet.result.current.debit(100)).toBe(true);
      expect(wallet.result.current.credit(5)).toBe(true);
      expect(fairness.result.current.consumeNonce().nonce).toBe(0);
      expect(fairness.result.current.consumeNonce().nonce).toBe(1);
    });
    expect(wallet.result.current.balance).toBe(805);
    expect(fairness.result.current.seeds.nonce).toBe(2);
    // Failed saves do not pretend to have changed persisted data.
    expect(read('balance')).toBe(1000);
    expect(read('fairness').current.nonce).toBe(0);
  });

  it('does not let external seed rotation or history/stat additions get overwritten before events arrive', () => {
    const fairness = renderHook(useFairness);
    const history = renderHook(useBetHistory);
    const session = renderHook(useSessionStats);
    const current = { serverSeed: 'rotated-server', clientSeed: 'new-client', nonce: 24 };
    save('fairness', { current, currentHash: sha256Hex(current.serverSeed) });
    save('bet-history', [{ ...entry(23), id: 'other-tab', ts: Date.now() - 10 }]);
    save('session-stats', { ...session.result.current.stats, spins: 4, totalWagered: 4, totalWon: 8 });
    act(() => {
      expect(fairness.result.current.consumeNonce()).toEqual(current);
      history.result.current.record(entry(24));
      session.result.current.recordSpin(1, 2, false);
    });
    expect(read('fairness').current.nonce).toBe(25);
    expect(read('bet-history').map((record: { nonce: number }) => record.nonce)).toEqual([24, 23]);
    expect(read('session-stats').spins).toBe(5);
  });

  it('refreshes displayed values on a storage event without writing back', () => {
    const hook = renderHook(useBalance);
    act(() => {
      save('balance', 37);
      window.dispatchEvent(new StorageEvent('storage', { key: prefix + 'balance', newValue: '37' }));
    });
    expect(hook.result.current.balance).toBe(37);
    expect(read('balance')).toBe(37);
  });
});

describe('history rule revisions', () => {
  it('keeps valid legacy records without stamping a revision retroactively', () => {
    const legacy = { ...entry(12), id: 'legacy', ts: Date.now() - 10 };
    save('bet-history', [legacy]);
    const hook = renderHook(useBetHistory);
    expect(hook.result.current.history).toEqual([legacy]);
    expect(read('bet-history')).toEqual([legacy]);
  });

  it('stamps new rounds with the current revision while preserving an explicit older revision', () => {
    const hook = renderHook(useBetHistory);
    act(() => {
      expect(hook.result.current.record(entry())?.rulesVersion).toBe(CURRENT_RULES_VERSION);
      expect(hook.result.current.record({ ...entry(1), rulesVersion: '2026-10-08.1' })?.rulesVersion).toBe('2026-10-08.1');
    });
    expect(read('bet-history').map((record: { rulesVersion: string }) => record.rulesVersion))
      .toEqual(['2026-10-08.1', CURRENT_RULES_VERSION]);
  });
});
