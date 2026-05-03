import { useCallback, useEffect, useRef, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

const KEY = 'sound-on';

type Voice = 'spin' | 'drop' | 'win' | 'big-win' | 'multiplier' | 'click';

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

  const blip = useCallback(
    (freq: number, durMs: number, type: OscillatorType = 'triangle', gain = 0.06) => {
      const ctx = ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durMs / 1000 + 0.02);
    },
    [ensureCtx],
  );

  const play = useCallback(
    (voice: Voice) => {
      switch (voice) {
        case 'spin':
          blip(440, 90, 'square', 0.04);
          setTimeout(() => blip(660, 90, 'square', 0.04), 60);
          break;
        case 'drop':
          blip(180, 60, 'sine', 0.05);
          break;
        case 'multiplier':
          blip(900, 120, 'triangle', 0.06);
          setTimeout(() => blip(1320, 200, 'triangle', 0.05), 90);
          break;
        case 'win':
          blip(660, 100, 'triangle', 0.06);
          setTimeout(() => blip(880, 140, 'triangle', 0.05), 90);
          break;
        case 'big-win':
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
            setTimeout(() => blip(f, 200, 'triangle', 0.07), i * 110),
          );
          break;
        case 'click':
          blip(880, 30, 'square', 0.025);
          break;
      }
    },
    [blip],
  );

  return { enabled, setEnabled, play };
}
