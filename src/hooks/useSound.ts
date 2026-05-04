import { useCallback, useEffect, useRef, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

const KEY = 'sound-on';

type Voice =
  | 'spin'
  | 'drop'
  | 'win'
  | 'big-win'
  | 'mega-win'
  | 'multiplier'
  | 'click'
  | 'lightning-strike'
  | 'thunder'
  | 'scatter-land'
  | 'free-spins-trigger'
  | 'free-spins-end'
  | 'coin'
  | 'tick';

/**
 * Web Audio synthesizer for slot SFX. No copyrighted assets — every effect is
 * generated from oscillators + envelopes + filtered noise. Tuned to feel close
 * to the real Pragmatic mobile palette (drops, chimes, dramatic hits, fanfares).
 */
export function useSound() {
  const [enabled, setEnabled] = useState<boolean>(() => loadJson<boolean>(KEY, true));
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => saveJson(KEY, enabled), [enabled]);

  const ensureCtx = useCallback(() => {
    if (!enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const W = window as Window & { webkitAudioContext?: typeof AudioContext };
      const Ctx = window.AudioContext ?? W.webkitAudioContext;
      if (!Ctx) return null;
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, [enabled]);

  /** Tone with attack/release envelope. */
  const tone = useCallback(
    (
      freq: number,
      durMs: number,
      type: OscillatorType = 'triangle',
      gain = 0.06,
      slideTo?: number,
      delay = 0,
    ) => {
      const ctx = ensureCtx();
      if (!ctx) return;
      const startAt = ctx.currentTime + delay / 1000;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startAt);
      if (slideTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 0.01), startAt + durMs / 1000);
      }
      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.exponentialRampToValueAtTime(gain, startAt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, startAt + durMs / 1000);
      osc.connect(g).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + durMs / 1000 + 0.05);
    },
    [ensureCtx],
  );

  /** Filtered white noise — used for thunder, drops, percussive accents. */
  const noiseBurst = useCallback(
    (durMs: number, lowpassHz: number, gain = 0.08, delay = 0) => {
      const ctx = ensureCtx();
      if (!ctx) return;
      const startAt = ctx.currentTime + delay / 1000;
      const sampleCount = Math.floor((ctx.sampleRate * durMs) / 1000);
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpassHz;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.exponentialRampToValueAtTime(gain, startAt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, startAt + durMs / 1000);
      source.connect(filter).connect(g).connect(ctx.destination);
      source.start(startAt);
      source.stop(startAt + durMs / 1000 + 0.05);
    },
    [ensureCtx],
  );

  const play = useCallback(
    (voice: Voice) => {
      switch (voice) {
        case 'spin':
          tone(520, 80, 'square', 0.05);
          tone(720, 80, 'square', 0.05, undefined, 50);
          break;
        case 'drop':
          // Solid percussive thunk: low tone + filtered noise click.
          tone(160, 70, 'sine', 0.05, 80);
          noiseBurst(40, 800, 0.04);
          break;
        case 'multiplier':
          // Bright zap: rising chime + sparkle noise.
          tone(900, 100, 'triangle', 0.06, 1500);
          tone(1320, 200, 'triangle', 0.05, undefined, 80);
          noiseBurst(60, 5000, 0.025, 30);
          break;
        case 'win':
          // Cheerful chime
          tone(660, 100, 'triangle', 0.06);
          tone(880, 140, 'triangle', 0.055, undefined, 90);
          break;
        case 'big-win':
          // Triumphant rising chord
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
            tone(f, 220, 'triangle', 0.07, undefined, i * 110),
          );
          break;
        case 'mega-win':
          // Bigger, more dramatic — sawtooth horn + chord stack
          [261.63, 329.63, 392.0].forEach((f, i) => tone(f, 600, 'sawtooth', 0.04, undefined, i * 60));
          [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
            tone(f, 250, 'triangle', 0.08, undefined, 200 + i * 100),
          );
          noiseBurst(160, 1200, 0.05, 0);
          break;
        case 'lightning-strike':
          // Dramatic Zeus moment: low rumble → sharp crack → hiss tail
          tone(80, 350, 'sawtooth', 0.06, 40);
          noiseBurst(180, 600, 0.13, 60); // initial thunder rumble
          noiseBurst(80, 4000, 0.18, 200); // sharp crack
          noiseBurst(500, 1200, 0.05, 240); // hiss tail
          tone(220, 80, 'square', 0.04, 2000, 220); // electric zing
          break;
        case 'thunder':
          tone(60, 600, 'sawtooth', 0.04, 30);
          noiseBurst(450, 800, 0.12, 30);
          break;
        case 'scatter-land':
          // Crackle of electricity + bell tone
          noiseBurst(60, 3500, 0.1);
          tone(880, 220, 'triangle', 0.06, 1320, 30);
          break;
        case 'free-spins-trigger':
          // Big triumphant fanfare
          tone(60, 800, 'sawtooth', 0.04);
          [523.25, 659.25, 783.99].forEach((f, i) =>
            tone(f, 400, 'triangle', 0.08, undefined, 100 + i * 60),
          );
          [659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
            tone(f, 500, 'triangle', 0.07, undefined, 350 + i * 80),
          );
          noiseBurst(200, 4000, 0.06, 0);
          break;
        case 'free-spins-end':
          // Resolving cadence
          [1046.5, 783.99, 659.25, 523.25].forEach((f, i) =>
            tone(f, 220, 'triangle', 0.07, undefined, i * 100),
          );
          break;
        case 'coin':
          tone(1320, 60, 'triangle', 0.04, 1760);
          break;
        case 'tick':
          tone(2200, 18, 'square', 0.025);
          break;
        case 'click':
          tone(880, 30, 'square', 0.025);
          break;
      }
    },
    [tone, noiseBurst],
  );

  return { enabled, setEnabled, play };
}
