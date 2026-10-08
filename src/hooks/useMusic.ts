import { useCallback, useEffect, useRef } from 'react';
import { gameAudio } from '../lib/audio/engine';
import { useAudioPreferences } from './useAudioPreferences';

/** Original rendered ambient beds share the master mixer and its voice ducking.
 * No second AudioContext, oscillator scheduler, or delayed melody callbacks. */
export function useMusic({ soundEnabled }: { soundEnabled: boolean }) {
  const { settings, update } = useAudioPreferences();
  const state = useRef({ soundEnabled, musicEnabled: settings.musicEnabled });
  state.current = { soundEnabled, musicEnabled: settings.musicEnabled };
  const route = useRef(gameAudio.getRoute());
  const alive = useRef(true);
  const start = useCallback((intensity: 'base' | 'free' | null) => {
    if (alive.current && state.current.soundEnabled && state.current.musicEnabled && intensity) gameAudio.startMusic(intensity, route.current);
  }, []);
  const stop = useCallback(() => gameAudio.stopBus('music'), []);
  const duck = useCallback((ms = 1800, factor = .25) => gameAudio.duckMusic(ms, factor), []);
  const setMusicEnabled = useCallback((musicEnabled: boolean) => update({ musicEnabled }), [update]);
  useEffect(() => {
    if (!soundEnabled || !settings.musicEnabled) stop();
  }, [soundEnabled, settings.musicEnabled, stop]);
  useEffect(() => {
    alive.current = true;
    // Parent's route layout effect has run before this passive effect.
    route.current = gameAudio.getRoute();
    return () => { alive.current = false; stop(); };
  }, [stop]);
  return { musicEnabled: settings.musicEnabled, setMusicEnabled, start, stop, duck };
}
