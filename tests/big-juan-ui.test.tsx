vi.mock('../src/pages/slots/_shared/ArtworkGate', () => ({ ArtworkGate: ({ children }: { children: React.ReactNode }) => children }));
import { StrictMode, forwardRef, useImperativeHandle } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BigJuan } from '../src/pages/slots/big-juan';
import { BigJuanBonusRound } from '../src/pages/slots/big-juan/BonusRound';
import { resolveRespin, type RespinRoundOutcome } from '../src/pages/slots/big-juan/engine';

const state = vi.hoisted(() => ({
  reduced: false,
  holdCount: false,
  countStarted: false,
  countResolve: null as null | (() => void),
  debit: vi.fn(() => true),
  credit: vi.fn(),
  record: vi.fn(),
  recordSpin: vi.fn(),
  consumeNonce: vi.fn(() => ({ serverSeed: 'server', clientSeed: 'client', nonce: 0 })),
  spinReel: vi.fn(() => Promise.resolve()),
  stopReel: vi.fn(),
  confetti: vi.fn(),
  payoutMultiplier: 1,
  wildTransform: false,
}));
vi.mock('../src/game-context', () => ({
  useGame: () => ({
    balance: { balance: 1000, debit: state.debit, credit: state.credit },
    fairness: { hash: 'hash', consumeNonce: state.consumeNonce },
    history: { record: state.record },
    session: { recordSpin: state.recordSpin },
    sound: { play: vi.fn() },
  }),
}));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  return {
    useReducedMotion: () => state.reduced,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    MotionConfig: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!cache.has(tag)) cache.set(tag, React.forwardRef((props: Record<string, unknown>, ref) => {
        const { initial, animate, exit, transition, whileTap, whileHover, ...rest } = props;
        return React.createElement(tag, { ...rest, ref });
      }));
      return cache.get(tag);
    } }),
  };
});
vi.mock('../src/pages/slots/big-juan/SpinReel', () => ({
  SpinReel: forwardRef(function TestReel(props: { symbols: string[]; reelIndex: number; igniteRows: Set<number> }, ref) {
    useImperativeHandle(ref, () => ({ spin: state.spinReel, stop: state.stopReel }));
    return <div className="spin-reel" data-reel={props.reelIndex} data-column={props.symbols.join(',')} data-igniting={[...props.igniteRows].join(',')} />;
  }),
}));
vi.mock('../src/lib/confetti', () => ({ fireConfetti: state.confetti }));
vi.mock('../src/pages/slots/big-juan/winCounter', () => ({
  animateCountUp: () => {
    state.countStarted = true;
    const promise = new Promise<void>((resolve) => {
      state.countResolve = resolve;
      if (!state.holdCount) resolve();
    });
    return Object.assign(promise, { cancel: () => state.countResolve?.() });
  },
}));
vi.mock('../src/pages/slots/big-juan/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/pages/slots/big-juan/engine')>();
  return { ...actual, play: () => {
    const initialGrid = Array.from({ length: 5 }, (_, reel) => state.wildTransform && reel >= 1 && reel <= 3 ? ['A', 'A', 'Q', 'J'] : ['A', 'K', 'Q', 'J']);
    const transformed = actual.applyWildSwitch(initialGrid);
    return ({
    initialGrid,
    grid: transformed.grid,
    baseMultiplier: state.payoutMultiplier,
    wins: [],
    wildSwitch: transformed.info,
    anticipationReel: null,
    triggersBonus: false,
    scatterCount: 0,
    respinsAwarded: 0,
  }); } };
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('desire-spin:v1:bj:intro-hidden', 'true');
  state.reduced = false;
  state.holdCount = false;
  state.countStarted = false;
  state.countResolve = null;
  state.payoutMultiplier = 1;
  state.wildTransform = false;
  state.debit.mockReturnValue(true);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function elapse(ms = 700) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

const prepared = {
  wagerCost: 0.4, payout: 2, multiplier: 5, game: 'Big Juan',
  serverSeedHash: 'hash', clientSeed: 'client', nonce: 4, feature: false,
};

describe('Big Juan round ownership and controls', () => {
  it('settles a count-up interrupted by navigation exactly once', async () => {
    state.holdCount = true;
    const view = render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    await elapse();
    expect(state.countStarted).toBe(true);
    expect(state.credit).not.toHaveBeenCalled();
    view.unmount();
    await act(async () => { state.countResolve?.(); });
    expect(state.credit).toHaveBeenCalledTimes(1);
    expect(state.credit).toHaveBeenCalledWith(0.4);
    expect(state.record).toHaveBeenCalledTimes(1);
    expect(state.recordSpin).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('desire-spin:v1:bj:pending-settlement')).toBeNull();
  });

  it('recovers a prepared refresh result once even in Strict Mode', () => {
    localStorage.setItem('desire-spin:v1:bj:pending-settlement', JSON.stringify(prepared));
    render(<StrictMode><BigJuan /></StrictMode>);
    expect(state.credit).toHaveBeenCalledTimes(1);
    expect(state.credit).toHaveBeenCalledWith(2);
    expect(state.record).toHaveBeenCalledTimes(1);
  });

  it('discards a malformed persisted settlement without crediting it', () => {
    localStorage.setItem('desire-spin:v1:bj:pending-settlement', JSON.stringify({ ...prepared, payout: '2500' }));
    render(<BigJuan />);
    expect(state.credit).not.toHaveBeenCalled();
    expect(state.record).not.toHaveBeenCalled();
  });

  it('does not consume a nonce or animate when the live debit is declined', async () => {
    state.debit.mockReturnValue(false);
    render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    await elapse();
    expect(state.consumeNonce).not.toHaveBeenCalled();
    expect(state.spinReel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Spin reels' })).toBeEnabled();
  });

  it('refunds a failed nonce request and leaves the next spin usable', async () => {
    state.consumeNonce.mockImplementationOnce(() => { throw new Error('Rotate the local seed to continue.'); });
    render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    expect(state.credit).toHaveBeenCalledWith(0.4);
    expect(state.record).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Rotate the local seed');
    expect(screen.getByRole('button', { name: 'Spin reels' })).toBeEnabled();
  });

  it('treats a second spin click as Stop and keeps one locked wager', async () => {
    render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    expect(screen.getByRole('button', { name: 'Bet amount' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop reels' }));
    await elapse();
    expect(state.debit).toHaveBeenCalledTimes(1);
    expect(state.debit).toHaveBeenCalledWith(0.4);
    expect(state.stopReel).toHaveBeenCalledTimes(5);
    expect(state.spinReel).toHaveBeenCalledTimes(5);
    expect(state.record).toHaveBeenCalledTimes(1);
  });

  it('lands the pre-switch symbols, then transforms only the announced Wild Switch cells', async () => {
    state.wildTransform = true;
    const { container } = render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    await elapse(600);
    const reelCalls = state.spinReel.mock.calls as unknown as [string[], unknown][];
    expect(reelCalls.map(([symbols]) => symbols)).toEqual([
      ['A', 'K', 'Q', 'J'], ['A', 'A', 'Q', 'J'], ['A', 'A', 'Q', 'J'],
      ['A', 'A', 'Q', 'J'], ['A', 'K', 'Q', 'J'],
    ]);
    const columns = () => Array.from(container.querySelectorAll('[data-column]')).map((node) => node.getAttribute('data-column'));
    expect(columns()).toEqual(['A,K,Q,J', 'A,A,Q,J', 'A,A,Q,J', 'A,A,Q,J', 'A,K,Q,J']);
    expect(screen.getByText('WILD SWITCH! 🌶️')).toBeInTheDocument();
    expect(Array.from(container.querySelectorAll('[data-igniting]')).map((node) => node.getAttribute('data-igniting')))
      .toEqual(['', '0,1', '0,1', '0,1', '']);
    await elapse(800);
    expect(columns()).toEqual(['A,K,Q,J', 'chili,chili,Q,J', 'chili,chili,Q,J', 'chili,chili,Q,J', 'A,K,Q,J']);
  });

  it('pauses autoplay behind the paytable and leaves Stop available', async () => {
    render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Auto-play' }));
    fireEvent.click(screen.getByRole('button', { name: '10' }));
    expect(screen.getByRole('button', { name: 'Bet amount' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pay table' }));
    await elapse(1500);
    expect(state.debit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await elapse(750);
    expect(state.debit).toHaveBeenCalledTimes(1);
    const stop = screen.getByRole('button', { name: 'Stop autoplay' });
    expect(stop).toBeEnabled();
    fireEvent.click(stop);
    await elapse(3000);
    expect(state.debit).toHaveBeenCalledTimes(1);
  });

  it('never places a new wager while a big-win presentation is open', async () => {
    state.payoutMultiplier = 100;
    state.reduced = true;
    render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    await elapse();
    expect(screen.getByRole('dialog', { name: 'Round win' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    expect(state.debit).toHaveBeenCalledTimes(1);
    expect(state.confetti).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Round win' })).not.toBeInTheDocument();
  });

  it('does not let an earlier banner timer dismiss a newer win', async () => {
    state.payoutMultiplier = 100;
    state.reduced = true;
    render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    await elapse(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss banner' }));
    fireEvent.click(screen.getByRole('button', { name: 'Spin reels' }));
    await elapse(6100);
    expect(state.debit).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog', { name: 'Round win' })).toBeInTheDocument();
    await elapse(1000);
    expect(screen.queryByRole('dialog', { name: 'Round win' })).not.toBeInTheDocument();
  });

  it('locks a Bonus Buy to its displayed cost and settles its prepared result', async () => {
    state.reduced = true;
    render(<BigJuan />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy bonus' }));
    fireEvent.click(screen.getByRole('button', { name: /^Buy ·/ }));
    await elapse(50);
    expect(state.debit).toHaveBeenCalledTimes(1);
    expect(state.debit).toHaveBeenCalledWith(40);
    expect(state.consumeNonce).toHaveBeenCalledTimes(1);
    const pending = JSON.parse(localStorage.getItem('desire-spin:v1:bj:pending-settlement')!);
    expect(pending.wagerCost).toBe(40);
    expect(pending.payout).toBeGreaterThanOrEqual(0);
    const skip = screen.getByRole('button', { name: 'Skip animation' });
    fireEvent.click(skip);
    expect(state.credit).toHaveBeenCalledTimes(1);
    expect(state.credit).toHaveBeenCalledWith(pending.payout);
    expect(state.record).toHaveBeenCalledWith(expect.objectContaining({ bet: 40, payout: pending.payout }));
    expect(localStorage.getItem('desire-spin:v1:bj:pending-settlement')).toBeNull();
  });

  it('traps keyboard focus in bet settings and restores the opener', () => {
    render(<BigJuan />);
    const opener = screen.getByRole('button', { name: 'Bet amount' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Bet settings' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    const done = screen.getByRole('button', { name: 'Done' });
    done.focus();
    fireEvent.keyDown(done, { key: 'Tab' });
    expect(document.activeElement).toBe(dialog.querySelector('button'));
    fireEvent.click(done);
    expect(document.activeElement).toBe(opener);
  });
});

const outcome: RespinRoundOutcome = {
  initialRespins: 12, guaranteedWinOrdinal: 1, events: [], totalMultiplier: 17.5,
  finalBagValue: 1, finalMeters: { mini: 0, minor: 0, major: 0, grand: 0 }, cappedAtMax: false,
};
describe('Big Juan feature presentation', () => {
  it('skips to the authoritative prepared payout only once on repeated clicks', () => {
    const close = vi.fn();
    render(<BigJuanBonusRound bet={0.4} scatterCount={4} outcome={outcome} onClose={close} />);
    const skip = screen.getByRole('button', { name: 'Skip animation' });
    fireEvent.click(skip);
    fireEvent.click(skip);
    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith(17.5);
  });

  it('keeps each prepared feature outcome node unchanged through its reel stop', async () => {
    const sample = {
      outer: [
        { kind: 'coin' as const, value: 2 }, { kind: 'mini' as const }, { kind: 'minor' as const },
        { kind: 'coin' as const, value: 5 }, { kind: 'major' as const }, { kind: 'blank' as const },
        { kind: 'coin' as const, value: 1 }, { kind: 'grand' as const },
      ], fourth: 'win' as const,
    };
    const resolution = resolveRespin(sample, { bagValue: 1, meters: outcome.finalMeters, cumulativeMult: 0 });
    const preparedOutcome = { ...outcome, initialRespins: 1, totalMultiplier: resolution.paid, events: [{
      ordinal: 1, guaranteedWin: true, respinsBefore: 1, respinsAfter: 0,
      sample, resolution, cumulativeAfter: resolution.paid,
    }] };
    const { container } = render(<BigJuanBonusRound bet={0.4} scatterCount={3} outcome={preparedOutcome} onClose={vi.fn()} />);
    await elapse(801); // intro
    await elapse(601); // idle; targets are already in the moving strips
    const targets = () => Array.from(container.querySelectorAll('[data-bj-outer-cell] [data-feature-landing]'));
    const initialNodes = targets();
    const artwork = initialNodes.map((node) => node.innerHTML);
    expect(initialNodes).toHaveLength(8);
    expect(initialNodes[0]).toHaveTextContent('2×');
    expect(initialNodes[7]).toHaveTextContent('grand');
    const fourth = container.querySelector('.bj-feature-fourth [data-feature-landing]');
    expect(fourth?.querySelector('[data-fourth-outcome]')).toHaveAttribute('data-fourth-outcome', 'win');
    await elapse(650); // all outer cells have stopped
    expect(targets()).toEqual(initialNodes);
    expect(targets().map((node) => node.innerHTML)).toEqual(artwork);
    await elapse(1300); // fourth reel stops on that same already-rendered WIN
    expect(container.querySelector('.bj-feature-fourth [data-feature-landing]')).toBe(fourth);
    expect(targets()).toEqual(initialNodes);
    expect(targets().map((node) => node.innerHTML)).toEqual(artwork);
  });

  it('removes pending feature timers on navigation without invoking close', async () => {
    const close = vi.fn();
    const view = render(<BigJuanBonusRound bet={0.4} scatterCount={4} outcome={outcome} onClose={close} />);
    view.unmount();
    await elapse(30_000);
    expect(close).not.toHaveBeenCalled();
  });
});
