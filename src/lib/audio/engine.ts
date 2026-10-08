import { AUDIO_ROOT, effectFile, THEME_PRELOAD, themeForRoute, type SoundEvent } from './catalog';
import { DEFAULT_AUDIO, effectiveAudioPreferences, type GameAudioMixes, type AudioBus, type AudioPreferences } from './preferences';

export type VoiceCallbacks = { onStart?: () => void; onEnd?: (reason: 'ended' | 'cancelled') => void; onError?: () => void };
type Playing = { source: AudioBufferSourceNode; gain: GainNode; bus: AudioBus; key: string; priority: number; callbacks?: VoiceCallbacks };
type ContextConstructor = typeof AudioContext;
const MAX_EFFECTS = 6;
const MAX_CACHE = 48;

/** One sample-based mixer for every route. No device-specific speech or harsh
 * real-time oscillator fallback. Missing/blocked audio never blocks a round. */
export class GameAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<AudioBus, GainNode>> = {};
  private settings = { ...DEFAULT_AUDIO };
  private preferences = { ...DEFAULT_AUDIO };
  private gameMixes: GameAudioMixes = {};
  private route = '/';
  private generation = 0;
  private busGeneration = { effects: 0, music: 0, voice: 0 };
  private playing = new Set<Playing>();
  private cache = new Map<string, AudioBuffer>();
  private pending = new Map<string, { promise: Promise<AudioBuffer | null>; abort: AbortController }>();
  private lastEvents = new Map<string, number>();
  private active = true;
  private lastVoice = -Infinity;
  private pendingVoice = false;
  private musicKey: string | null = null;
  private duckFactor = 1;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private preloadedRoute: string | null = null;

  activate() { this.active = true; }
  getRoute() { return this.route; }
  getSettings() { return { ...this.settings }; }
  private audible(bus: AudioBus) {
    return this.active && this.settings.enabled && this.settings.master > 0 && this.settings[bus] > 0 &&
      (bus !== 'voice' || this.settings.voiceEnabled) && (bus !== 'music' || this.settings.musicEnabled) &&
      (typeof document === 'undefined' || document.visibilityState !== 'hidden');
  }
  configure(next: AudioPreferences) {
    this.preferences = { ...next };
    this.applySettings();
  }
  setGameMixes(mixes: GameAudioMixes) {
    this.gameMixes = mixes; this.applySettings();
  }
  private applySettings() {
    this.settings = effectiveAudioPreferences(this.preferences, this.gameMixes[this.route]);
    for (const bus of ['effects', 'music', 'voice'] as const) {
      if (!this.audible(bus)) this.stopBus(bus);
    }
    this.updateGains();
    if (!this.settings.enabled || this.settings.master === 0) this.abortLoads();
  }
  setRoute(route: string) {
    if (route === this.route) return;
    this.stopAll(); this.route = route; this.preloadedRoute = null; this.applySettings();
    if (this.context?.state === 'running') this.preloadTheme();
  }
  private updateGains() {
    if (!this.context) return;
    const now = this.context.currentTime;
    const set = (node: GainNode | null | undefined, value: number) => {
      if (!node) return;
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(value, now, .025);
    };
    set(this.master, this.settings.enabled ? this.settings.master : 0);
    for (const bus of ['effects', 'music', 'voice'] as const) set(this.buses[bus], this.audible(bus) ? this.settings[bus] * (bus === 'music' ? this.duckFactor : 1) : 0);
  }
  /** Must be called from pointerdown/keydown or a real play button gesture. */
  unlock = () => {
    if (!this.active || !this.settings.enabled || typeof window === 'undefined') return;
    try {
      if (!this.context || this.context.state === 'closed') {
        const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: ContextConstructor }).webkitAudioContext;
        if (!Ctx) return;
        this.context = new Ctx();
        this.master = this.context.createGain();
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -12; compressor.knee.value = 12;
        compressor.ratio.value = 5; compressor.attack.value = .004; compressor.release.value = .15;
        this.master.connect(compressor).connect(this.context.destination);
        for (const bus of ['effects', 'music', 'voice'] as const) {
          const gain = this.context.createGain(); gain.connect(this.master); this.buses[bus] = gain;
        }
        this.updateGains();
      }
      if (this.context.state === 'suspended' || (this.context.state as string) === 'interrupted') void this.context.resume().catch(() => {});
      // Unlock iOS's output in the gesture, without a fake spoken utterance.
      const primer = this.context.createBufferSource();
      primer.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
      primer.connect(this.context.destination); primer.onended = () => primer.disconnect(); primer.start();
      this.preloadTheme();
    } catch { /* Audio is an optional enhancement. */ }
  };
  preloadTheme() {
    if (!this.context || !this.audible('effects') || this.preloadedRoute === this.route) return;
    this.preloadedRoute = this.route;
    for (const event of THEME_PRELOAD) void this.load(effectFile(event, themeForRoute(this.route)));
    if (themeForRoute(this.route) === 'olympus' && this.audible('voice')) {
      for (const id of ['power', 'glory']) void this.load(`${AUDIO_ROOT}/voices/olympus/${id}.mp3`);
    }
  }
  preload(files: string[]) { if (this.context) for (const file of files) void this.load(file); }
  private abortLoads() {
    for (const request of this.pending.values()) request.abort.abort();
    this.pending.clear(); this.preloadedRoute = null;
  }
  private load(file: string): Promise<AudioBuffer | null> {
    if (!file.startsWith(`${AUDIO_ROOT}/`) || file.includes('..') || !this.context) return Promise.resolve(null);
    const existing = this.cache.get(file);
    if (existing) { this.cache.delete(file); this.cache.set(file, existing); return Promise.resolve(existing); }
    const request = this.pending.get(file); if (request) return request.promise;
    const context = this.context; const abort = new AbortController();
    const promise = (async () => {
      try {
        const response = await fetch(file, { signal: abort.signal, cache: 'force-cache' });
        if (!response.ok) return null;
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (abort.signal.aborted || this.context !== context) return null;
        this.cache.set(file, buffer);
        while (this.cache.size > MAX_CACHE) this.cache.delete(this.cache.keys().next().value!);
        return buffer;
      } catch { return null; }
      finally { if (this.pending.get(file)?.abort === abort) this.pending.delete(file); }
    })();
    this.pending.set(file, { promise, abort }); return promise;
  }
  private remove(item: Playing, ended = false) {
    if (!this.playing.delete(item)) return;
    item.source.onended = null;
    try { item.source.stop(); } catch { /* already ended */ }
    item.source.disconnect(); item.gain.disconnect();
    if (item.bus === 'voice') this.restoreMusic();
    try { item.callbacks?.onEnd?.(ended ? 'ended' : 'cancelled'); } catch { /* observer cannot break cleanup */ }
  }
  stopBus(bus: AudioBus) {
    this.busGeneration[bus]++;
    for (const item of [...this.playing]) if (item.bus === bus) this.remove(item);
    if (bus === 'voice') { this.pendingVoice = false; this.lastVoice = -Infinity; }
    if (bus === 'music') this.musicKey = null;
  }
  stopAll = () => {
    this.generation++;
    for (const bus of ['effects', 'music', 'voice'] as const) this.stopBus(bus);
    this.abortLoads(); this.lastEvents.clear();
    this.restoreMusic();
  };
  dispose() {
    this.stopAll(); this.active = false;
    const context = this.context; this.context = null; this.master = null; this.buses = {};
    this.cache.clear();
    if (context && context.state !== 'closed') { try { void context.close().catch(() => {}); } catch { /* optional */ } }
  }
  private async playFile(file: string, bus: AudioBus, key: string, priority = 0, loop = false, maxDelay = 450, gain = 1, callbacks?: VoiceCallbacks): Promise<boolean> {
    if (!this.audible(bus)) return false;
    if (!this.context) this.unlock();
    const context = this.context;
    if (!context) return false;
    const generation = this.generation; const busGeneration = this.busGeneration[bus]; const requested = performance.now();
    const buffer = await this.load(file);
    if (!buffer || this.context !== context || generation !== this.generation || busGeneration !== this.busGeneration[bus] ||
      !this.audible(bus) || context.state !== 'running' || performance.now() - requested > maxDelay) return false;
    if (bus === 'effects') {
      // Replace identical hits, and bound simultaneous voices during turbo/cascades.
      for (const item of [...this.playing]) if (item.bus === bus && item.key === key) this.remove(item);
      const effects = [...this.playing].filter((item) => item.bus === bus);
      if (effects.length >= MAX_EFFECTS) this.remove(effects[0]!);
    } else if (bus === 'voice' && [...this.playing].some((item) => item.bus === 'voice')) return false;
    try {
      const source = context.createBufferSource(); source.buffer = buffer; source.loop = loop;
      const channel = context.createGain(); channel.gain.value = Math.max(0, Math.min(1, gain));
      source.connect(channel).connect(this.buses[bus]!);
      const item: Playing = { source, gain: channel, bus, key, priority, callbacks };
      this.playing.add(item); source.onended = () => this.remove(item, true); source.start();
      try { callbacks?.onStart?.(); } catch { /* observer only */ }
      if (bus === 'voice') this.duckMusic(buffer.duration * 1000 + 100, .22);
      return true;
    } catch { return false; }
  }
  play(event: SoundEvent, expectedRoute = this.route) {
    if (expectedRoute !== this.route || !this.audible('effects')) return;
    const now = performance.now();
    const gap = event === 'tick' || event === 'coin' || event === 'juan-coin' ? 65 : 40;
    if (now - (this.lastEvents.get(event) ?? -Infinity) < gap) return;
    this.lastEvents.set(event, now);
    void this.playFile(effectFile(event, themeForRoute(this.route)), 'effects', event);
  }
  /** Same-origin prerecorded voice only; one line at a time, never a speech queue. */
  async speak(file: string, expectedRoute = this.route, priority = 1, gain = 1, callbacks?: VoiceCallbacks): Promise<boolean> {
    if (expectedRoute !== this.route || !this.audible('voice') || this.pendingVoice) return false;
    const live = [...this.playing].find((item) => item.bus === 'voice');
    if (live && live.priority >= priority) return false;
    const now = performance.now();
    if (!live && now - this.lastVoice < 3800 && priority < 3) return false;
    if (live) this.remove(live);
    this.pendingVoice = true; const generation = this.generation; const version = this.busGeneration.voice;
    const played = await this.playFile(file, 'voice', file, priority, false, 1200, gain, callbacks);
    if (generation === this.generation && version === this.busGeneration.voice) {
      this.pendingVoice = false; if (played) this.lastVoice = performance.now();
    }
    if (!played && generation === this.generation && version === this.busGeneration.voice) { try { callbacks?.onError?.(); } catch { /* observer only */ } }
    return played;
  }
  startMusic(intensity: 'base' | 'free', expectedRoute = this.route) {
    if (expectedRoute !== this.route || !this.audible('music')) return;
    const key = `${themeForRoute(this.route)}/music-${intensity}`;
    if (key === this.musicKey) return;
    this.stopBus('music'); this.musicKey = key;
    const version = this.busGeneration.music; const generation = this.generation;
    void this.playFile(`${AUDIO_ROOT}/${key}.mp3`, 'music', key, 0, true, 5000).then((played) => {
      if (!played && this.musicKey === key && version === this.busGeneration.music && generation === this.generation) this.musicKey = null;
    });
  }
  private restoreMusic() {
    this.duckFactor = 1;
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
    this.duckTimer = null;
    if (this.context && this.buses.music) {
      this.buses.music.gain.cancelScheduledValues(this.context.currentTime);
      this.buses.music.gain.setTargetAtTime(this.audible('music') ? this.settings.music : 0, this.context.currentTime, .2);
    }
  }
  duckMusic(ms = 1800, factor = .25) {
    if (!this.context || !this.buses.music) return;
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
    this.duckFactor = Math.max(0, Math.min(1, factor));
    this.buses.music.gain.cancelScheduledValues(this.context.currentTime);
    this.buses.music.gain.setTargetAtTime(this.settings.music * this.duckFactor, this.context.currentTime, .03);
    this.duckTimer = setTimeout(() => this.restoreMusic(), Math.max(0, Math.min(ms, 15000)));
  }
}
export const gameAudio = new GameAudioEngine();
