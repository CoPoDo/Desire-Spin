import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusic } from '../src/hooks/useMusic';
import { useSound } from '../src/hooks/useSound';

class Param {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}
class Node {
  gain = new Param();
  frequency = new Param();
  detune = new Param();
  onended: (() => void) | null = null;
  type = 'sine';
  connect = vi.fn((target: unknown) => target);
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
class Audio {
  static instances: Audio[] = [];
  state = 'running';
  currentTime = 0;
  destination = new Node();
  createOscillator = vi.fn(() => new Node());
  createGain = vi.fn(() => new Node());
  createBiquadFilter = vi.fn(() => new Node());
  close = vi.fn(async () => { this.state = 'closed'; });
  resume = vi.fn(async () => { this.state = 'running'; });
  constructor() { Audio.instances.push(this); }
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  Audio.instances = [];
  vi.stubGlobal('AudioContext', Audio);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('optional audio lifecycle', () => {
  it('cancels delayed lead notes and releases the context when leaving a game', () => {
    const hook = renderHook(() => useMusic({ soundEnabled: true }));
    act(() => hook.result.current.start('free'));
    expect(vi.getTimerCount()).toBe(3); // two lead notes and the chord loop
    const audio = Audio.instances[0]!;
    const oscillators = audio.createOscillator.mock.results.map((call) => call.value);
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(audio.close).toHaveBeenCalledTimes(1);
    for (const oscillator of oscillators) expect(oscillator.disconnect).toHaveBeenCalled();
  });

  it('does not allow an old stop fade to kill music that was restarted', () => {
    const { result } = renderHook(() => useMusic({ soundEnabled: true }));
    act(() => {
      result.current.start('free');
      result.current.stop();
      expect(vi.getTimerCount()).toBe(1);
      result.current.start('free');
      vi.advanceTimersByTime(800);
    });
    expect(vi.getTimerCount()).toBe(2); // second lead plus active chord loop
    const audio = Audio.instances[0]!;
    const priorNotes = audio.createOscillator.mock.calls.length;
    act(() => vi.advanceTimersByTime(7000));
    expect(audio.createOscillator.mock.calls.length).toBeGreaterThan(priorNotes);
  });

  it('stops scheduling when either music or sound is muted', () => {
    const { result, rerender } = renderHook(({ sound }) => useMusic({ soundEnabled: sound }), { initialProps: { sound: true } });
    act(() => result.current.start('free'));
    const staleStart = result.current.start;
    rerender({ sound: false });
    act(() => {
      vi.advanceTimersByTime(700);
      staleStart('free');
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('mute closes queued effects and stale callbacks cannot turn sound back on', () => {
    const hook = renderHook(useSound);
    const stalePlay = hook.result.current.play;
    act(() => stalePlay('click'));
    const audio = Audio.instances[0]!;
    expect(audio.createOscillator).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.setEnabled(false));
    expect(audio.close).toHaveBeenCalledTimes(1);
    act(() => stalePlay('click'));
    expect(Audio.instances).toHaveLength(1);
    expect(audio.createOscillator).toHaveBeenCalledTimes(1);
    hook.unmount();
    expect(audio.close).toHaveBeenCalledTimes(1);
  });

  it('treats unavailable audio hardware as an optional enhancement', () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('unavailable'); } });
    const sound = renderHook(useSound);
    const music = renderHook(() => useMusic({ soundEnabled: true }));
    expect(() => sound.result.current.play('click')).not.toThrow();
    expect(() => music.result.current.start('free')).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
