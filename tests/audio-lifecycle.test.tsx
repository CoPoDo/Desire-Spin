import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusic } from '../src/hooks/useMusic';
import { useSound } from '../src/hooks/useSound';
import { gameAudio, GameAudioEngine } from '../src/lib/audio/engine';
import { GameAudioSettings } from '../src/components/GameAudioSettings';
import { AudioSettings } from '../src/components/AudioSettings';
import { DEFAULT_AUDIO, DEFAULT_GAME_MIX, readAudioPreferences, readGameMixes } from '../src/lib/audio/preferences';
import { effectFile, themeForRoute } from '../src/lib/audio/catalog';
import { cancelZeus, primeZeus, speakZeus, zeusLineFor } from '../src/lib/zeusVoice';

class Param {
  value = 0;
  setValueAtTime = vi.fn((value: number) => { this.value = value; });
  setTargetAtTime = vi.fn((value: number) => { this.value = value; });
  cancelScheduledValues = vi.fn();
}
class Node {
  gain = new Param(); threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  onended: (() => void) | null = null;
  buffer: { duration: number; length?: number } | null = null;
  loop = false;
  connect = vi.fn((target: unknown) => target);
  disconnect = vi.fn(); start = vi.fn(); stop = vi.fn();
}
class Audio {
  static instances: Audio[] = [];
  state = 'running'; currentTime = 0; sampleRate = 32000;
  destination = new Node();
  createBufferSource = vi.fn(() => new Node());
  createGain = vi.fn(() => new Node());
  createDynamicsCompressor = vi.fn(() => new Node());
  createBuffer = vi.fn((_channels: number, length: number) => ({ duration: length / 32000, length }));
  decodeAudioData = vi.fn(async () => ({ duration: .8, length: 25600 }));
  close = vi.fn(async () => { this.state = 'closed'; });
  resume = vi.fn(async () => { this.state = 'running'; });
  constructor() { Audio.instances.push(this); }
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const sources = () => Audio.instances.flatMap((ctx) => ctx.createBufferSource.mock.results.map((call) => call.value)).filter((source) => source.buffer?.length !== 1);
const live = () => sources().filter((source) => source.start.mock.calls.length && !source.stop.mock.calls.length);
let now = 0;
beforeEach(() => {
  gameAudio.dispose(); localStorage.clear(); vi.useFakeTimers(); now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  Audio.instances = []; vi.stubGlobal('AudioContext', Audio);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  gameAudio.activate(); gameAudio.setGameMixes({}); gameAudio.configure({ ...DEFAULT_AUDIO }); gameAudio.setRoute('/');
});
afterEach(() => { cleanup(); gameAudio.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('sample-based shared audio lifecycle', () => {
  it('unlocks on a mobile pointer gesture and releases every node/context on departure', async () => {
    const hook = renderHook(() => useSound('/slots/gates-of-olympus'));
    act(() => document.dispatchEvent(new Event('pointerdown')));
    const context = Audio.instances[0]!;
    await act(async () => { hook.result.current.play('big-win'); await flush(); });
    expect(live()).toHaveLength(1);
    hook.unmount();
    expect(live()).toHaveLength(0); expect(context.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    for (const source of sources()) expect(source.disconnect).toHaveBeenCalled();
  });
  it('master mute cancels queued effects, speech and music; stale play cannot unmute', async () => {
    const hook = renderHook(() => useSound('/slots/gates-of-olympus'));
    const stalePlay = hook.result.current.play;
    await act(async () => {
      stalePlay('win'); await flush();
      await gameAudio.speak('/audio/v3/voices/olympus/glory.mp3', gameAudio.getRoute(), 3);
      gameAudio.startMusic('free'); await flush();
    });
    expect(live()).toHaveLength(3);
    act(() => hook.result.current.setEnabled(false));
    expect(live()).toHaveLength(0);
    const count = sources().length;
    await act(async () => { stalePlay('click'); await flush(); });
    expect(sources()).toHaveLength(count);
    hook.unmount(); expect(Audio.instances[0]!.close).toHaveBeenCalledTimes(1);
  });
  it('route changes cancel pending decodes and reject old route callbacks', async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((done) => { resolve = done; })));
    const hook = renderHook(({ route }) => useSound(route), { initialProps: { route: '/slots/gates-of-olympus' } });
    const stale = hook.result.current.play;
    act(() => stale('spin'));
    hook.rerender({ route: '/originals/dice' });
    await act(async () => { stale('win'); resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }); await flush(); });
    expect(live()).toHaveLength(0);
    expect(gameAudio.getRoute()).toBe('/originals/dice');
  });
  it('bounds overlapping SFX and debounces rapid duplicate ticks', async () => {
    const engine = new GameAudioEngine();
    engine.unlock(); await flush();
    for (const event of ['spin', 'drop', 'cascade-clear', 'cascade-fall', 'cascade-land', 'win', 'coin'] as const) { engine.play(event); await flush(); }
    expect(live()).toHaveLength(6);
    engine.play('tick'); await flush(); const total = sources().length;
    engine.play('tick'); await flush(); expect(sources()).toHaveLength(total);
    now = 70; engine.play('tick'); await flush();
    expect(live()).toHaveLength(6); expect(sources()).toHaveLength(total + 1);
    engine.dispose();
  });
  it('plays only one prerecorded voice and cancel prevents queued speech from leaking', async () => {
    const engine = new GameAudioEngine(); const callbacks = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() };
    expect(await engine.speak('/audio/v3/voices/olympus/glory.mp3', '/', 1, .6, callbacks)).toBe(true);
    expect(callbacks.onStart).toHaveBeenCalledTimes(1);
    expect(await engine.speak('/audio/v3/voices/olympus/power.mp3', '/', 1)).toBe(false);
    expect(live()).toHaveLength(1);
    engine.stopBus('voice'); expect(callbacks.onEnd).toHaveBeenCalledWith('cancelled'); expect(live()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0); engine.dispose();
  });
  it('voice cooldown prevents rapid lines and major events can take priority', async () => {
    const engine = new GameAudioEngine();
    await engine.speak('/audio/v3/voices/olympus/power.mp3', '/', 1);
    live()[0]!.onended?.();
    expect(await engine.speak('/audio/v3/voices/olympus/glory.mp3', '/', 1)).toBe(false);
    expect(await engine.speak('/audio/v3/voices/olympus/power.mp3', '/', 3)).toBe(true);
    engine.dispose();
  });
  it('keeps voices independent of SFX, uses master/channel gains and mutes immediately', async () => {
    const engine = new GameAudioEngine(); engine.configure({ ...DEFAULT_AUDIO, master: .4, effects: 0, voice: .3 });
    engine.play('win'); expect(Audio.instances).toHaveLength(0);
    expect(await engine.speak('/audio/v3/voices/olympus/power.mp3', '/', 3)).toBe(true);
    const gains = Audio.instances[0]!.createGain.mock.results.map((call) => call.value.gain.value);
    expect(gains[0]).toBe(.4); expect(gains[1]).toBe(0); expect(gains[2]).toBeCloseTo(.28 * .22); expect(gains[3]).toBe(.3);
    engine.configure({ ...DEFAULT_AUDIO, voiceEnabled: false }); expect(live()).toHaveLength(0);
    engine.dispose();
  });
  it('music is one cancellable loop, with no stale fade or melody timers', async () => {
    const hook = renderHook(() => useMusic({ soundEnabled: true }));
    await act(async () => { hook.result.current.start('free'); await flush(); });
    expect(live()).toHaveLength(1); expect(live()[0]!.loop).toBe(true);
    await act(async () => { hook.result.current.stop(); hook.result.current.start('free'); await flush(); });
    expect(live()).toHaveLength(1);
    hook.unmount(); expect(live()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('hiding the tab stops all channels and stale callbacks stay silent', async () => {
    const hook = renderHook(useSound);
    await act(async () => { hook.result.current.play('win'); await flush(); });
    expect(live()).toHaveLength(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => { hook.result.current.play('big-win'); await flush(); });
    expect(live()).toHaveLength(0);
  });
  it('optional audio fails safely for unavailable context, decode errors and network failures', async () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('unavailable'); } });
    const engine = new GameAudioEngine(); expect(() => engine.play('click')).not.toThrow();
    expect(await engine.speak('/audio/v3/voices/olympus/glory.mp3')).toBe(false);
    vi.stubGlobal('AudioContext', Audio); vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await engine.speak('/audio/v3/voices/olympus/glory.mp3')).toBe(false);
    expect(live()).toHaveLength(0); engine.dispose();
  });
  it('Olympus uses shipped neural clips, never speechSynthesis, and stops via cancelZeus', async () => {
    const speak = vi.fn(); vi.stubGlobal('speechSynthesis', { speak });
    gameAudio.setRoute('/slots/gates-of-olympus');
    primeZeus(); await flush(); speakZeus(zeusLineFor('freeSpinsTrigger')); await flush();
    expect(live()).toHaveLength(1); expect(speak).not.toHaveBeenCalled();
    cancelZeus(); expect(live()).toHaveLength(0);
  });
});

describe('audio preferences and theme coverage', () => {
  it('migrates valid old mute/music choices without unmuting and repairs malformed values', () => {
    localStorage.setItem('desire-spin:v1:sound-on', 'false'); localStorage.setItem('desire-spin:v1:music-on', 'false');
    expect(readAudioPreferences()).toMatchObject({ enabled: false, musicEnabled: false });
    localStorage.setItem('desire-spin:v1:audio-mixer-v3', '{"version":3,"master":500}');
    expect(readAudioPreferences().master).toBe(.8); expect(readAudioPreferences().enabled).toBe(false);
  });
  it('mixer controls save independently and include accessible tests', () => {
    render(<AudioSettings />);
    fireEvent.change(screen.getByLabelText('Master volume'), { target: { value: '43' } });
    fireEvent.change(screen.getByLabelText('Sound effects'), { target: { value: '12' } });
    fireEvent.click(screen.getByLabelText('Voices enabled'));
    expect(readAudioPreferences()).toMatchObject({ master: .43, effects: .12, voiceEnabled: false });
    expect(screen.getByRole('button', { name: 'Test voice' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Test effects' })).not.toBeDisabled();
  });
  it('per-game mix is saved separately and never overrides global mute', async () => {
    const engine = new GameAudioEngine();
    engine.setRoute('/slots/gates-of-olympus');
    engine.setGameMixes({ '/slots/gates-of-olympus': { ...DEFAULT_GAME_MIX, effects: .4, voiceEnabled: false } });
    expect(engine.getSettings()).toMatchObject({ effects: DEFAULT_AUDIO.effects * .4, voiceEnabled: false });
    expect(await engine.speak('/audio/v3/voices/olympus/power.mp3', engine.getRoute(), 3)).toBe(false);
    engine.setRoute('/originals/dice'); expect(engine.getSettings().effects).toBe(DEFAULT_AUDIO.effects);
    engine.configure({ ...DEFAULT_AUDIO, enabled: false });
    engine.setRoute('/slots/gates-of-olympus'); engine.play('spin'); expect(Audio.instances).toHaveLength(0);
    engine.dispose();
  });
  it('game mixer independently saves and resets a route without changing global preferences', () => {
    const view = render(<GameAudioSettings route="/slots/gates-of-olympus" />);
    fireEvent.click(screen.getByLabelText('Separate mix for this game'));
    fireEvent.change(screen.getByLabelText('Effects game volume'), { target: { value: '31' } });
    fireEvent.click(screen.getByLabelText('Voices in this game'));
    expect(readGameMixes()['/slots/gates-of-olympus']).toMatchObject({ effects: .31, voiceEnabled: false });
    expect(readAudioPreferences().effects).toBe(DEFAULT_AUDIO.effects);
    view.rerender(<GameAudioSettings route="/slots/sugar-rush" />);
    expect(screen.getByLabelText('Separate mix for this game')).not.toBeChecked();
    view.rerender(<GameAudioSettings route="/slots/gates-of-olympus" />);
    expect(screen.getByLabelText('Voices in this game')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Use global mix' }));
    expect(readGameMixes()['/slots/gates-of-olympus']).toBeUndefined();
  });
  it('rejects corrupted game-mix volumes and unexpected route keys', () => {
    localStorage.setItem('desire-spin:v1:audio-game-mixes-v1', JSON.stringify({ '/slots/gates-of-olympus': { ...DEFAULT_GAME_MIX, effects: 9 } }));
    expect(readGameMixes()).toEqual({});
  });
  it.each([
    ['gates-of-olympus', 'olympus'], ['sweet-bonanza', 'bonanza'], ['sugar-rush', 'sugar'], ['wanted-wild', 'wanted'],
    ['wolf-gold', 'wolf'], ['pharaoh-gold', 'pharaoh'], ['big-juan', 'juan'], ['big-bass-bonanza', 'bass'], ['dice', 'lounge'],
  ] as const)('%s has its own coherent sample bank (%s)', (route, expected) => {
    const theme = themeForRoute(`/slots/${route}`); expect(theme).toBe(expected);
    expect(effectFile('cascade-land', theme)).toBe(`/audio/v3/${expected}/cascade-land.mp3`);
    expect(effectFile('win', theme)).toBe(`/audio/v3/${expected}/win.mp3`);
  });
});
