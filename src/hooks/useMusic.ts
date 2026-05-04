import { useCallback, useEffect, useRef, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

const KEY = 'music-on';

/** Simple ambient music loop synthesized via Web Audio. Uses Phrygian-mode
 *  chord pads + slow lead notes for a "Greek/mystic" vibe — no copyrighted
 *  audio assets. Two intensity tracks: 'base' (low/calm) and 'free' (more
 *  intense for free-spins sessions). */
type Intensity = 'base' | 'free' | null;

// E Phrygian-ish chord roots (Hz): Em, F, G, Em (i, ♭II, ♭III, i)
const BASE_PROG = [
  { roots: [82.41, 164.81, 196.00] }, // Em (E A B)
  { roots: [87.31, 174.61, 220.00] }, // Fmaj-ish (F A C)
  { roots: [98.00, 196.00, 246.94] }, // G (G B D)
  { roots: [82.41, 164.81, 196.00] }, // Em
];

const LEAD_NOTES = [329.63, 392.0, 440.0, 523.25, 392.0, 440.0]; // E G A C G A

export function useMusic({ soundEnabled }: { soundEnabled: boolean }) {
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => loadJson<boolean>(KEY, true));
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const intensityRef = useRef<Intensity>(null);
  const stopFnsRef = useRef<(() => void)[]>([]);
  const chordIdxRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const leadIdxRef = useRef(0);

  useEffect(() => saveJson(KEY, musicEnabled), [musicEnabled]);

  const ensureCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const W = window as Window & { webkitAudioContext?: typeof AudioContext };
      const Ctx = window.AudioContext ?? W.webkitAudioContext;
      if (!Ctx) return null;
      ctxRef.current = new Ctx();
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.gain.value = 0;
      masterGainRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const stopAll = useCallback(() => {
    if (tickRef.current != null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    stopFnsRef.current.forEach((fn) => fn());
    stopFnsRef.current = [];
  }, []);

  const playPad = useCallback(
    (frequencies: number[], duration: number, gain: number) => {
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return;
      const now = ctx.currentTime;
      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(0.0001, now);
      padGain.gain.exponentialRampToValueAtTime(gain, now + 0.6);
      padGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      padGain.connect(filter).connect(master);
      const oscs: OscillatorNode[] = [];
      for (const freq of frequencies) {
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.value = freq;
        osc1.detune.value = -3;
        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = freq;
        osc2.detune.value = 5;
        const mixer = ctx.createGain();
        mixer.gain.value = 0.5;
        osc1.connect(mixer).connect(padGain);
        osc2.connect(mixer);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.2);
        osc2.stop(now + duration + 0.2);
        oscs.push(osc1, osc2);
      }
    },
    [],
  );

  const playLead = useCallback((freq: number, duration: number, gain: number) => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.1);
  }, []);

  const start = useCallback(
    (intensity: Intensity) => {
      if (!musicEnabled || !soundEnabled || !intensity) return;
      // Idempotent: if already playing this intensity, do nothing — avoids
      // the music chopping every time runRound is called.
      if (intensityRef.current === intensity && tickRef.current != null) return;
      ensureCtx();
      stopAll();
      intensityRef.current = intensity;
      const master = masterGainRef.current;
      if (!master) return;
      const ctx = ctxRef.current!;
      // Smoothly ramp master volume to target depending on intensity.
      const targetVol = intensity === 'free' ? 0.12 : 0.07;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(Math.max(targetVol, 0.0001), ctx.currentTime + 1.2);

      // Tempo: base = ~14s/chord (slow), free = ~7s (more energy)
      const chordDur = intensity === 'free' ? 7 : 14;

      const playStep = () => {
        if (intensityRef.current !== intensity) return;
        const chord = BASE_PROG[chordIdxRef.current % BASE_PROG.length]!;
        playPad(chord.roots, chordDur, intensity === 'free' ? 0.3 : 0.18);
        chordIdxRef.current++;
        if (intensity === 'free') {
          // Plays a sparse melody of high notes during free spins
          for (let i = 0; i < 2; i++) {
            const note = LEAD_NOTES[leadIdxRef.current % LEAD_NOTES.length]!;
            setTimeout(() => playLead(note, 0.6, 0.05), i * (chordDur * 1000) / 2 + 200);
            leadIdxRef.current++;
          }
        }
      };
      playStep();
      tickRef.current = window.setInterval(playStep, chordDur * 1000);
    },
    [musicEnabled, soundEnabled, ensureCtx, stopAll, playPad, playLead],
  );

  const stop = useCallback(() => {
    intensityRef.current = null;
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    }
    setTimeout(stopAll, 700);
  }, [stopAll]);

  /** Briefly duck the music volume — used during big wins so the celebration
   *  SFX are prominent. */
  const duck = useCallback((durMs = 1800, factor = 0.25) => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const current = master.gain.value;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(current, now);
    master.gain.exponentialRampToValueAtTime(Math.max(current * factor, 0.0001), now + 0.1);
    master.gain.exponentialRampToValueAtTime(Math.max(current, 0.0001), now + durMs / 1000);
  }, []);

  // Stop music if the user mutes SFX or disables music.
  useEffect(() => {
    if (!soundEnabled || !musicEnabled) stop();
  }, [soundEnabled, musicEnabled, stop]);

  return { musicEnabled, setMusicEnabled, start, stop, duck };
}
