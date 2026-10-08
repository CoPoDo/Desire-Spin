import { useCallback, useEffect, useLayoutEffect } from 'react';
import { gameAudio } from '../lib/audio/engine';
import type { SoundEvent } from '../lib/audio/catalog';
import { GAME_AUDIO_KEY, readGameMixes, type AudioLevel } from '../lib/audio/preferences';
import { subscribeStorage } from '../lib/storage';
import { useAudioPreferences } from './useAudioPreferences';

/** Shared sample mixer. Each returned play callback is bound to its route so a
 * delayed callback from a departed game cannot make noise in the next one. */
export function useSound(route = '/') {
  const { settings, update } = useAudioPreferences();
  useLayoutEffect(() => { gameAudio.activate(); gameAudio.setGameMixes(readGameMixes()); gameAudio.setRoute(route); }, [route]);
  useEffect(() => {
    const unsubscribeMixes = subscribeStorage(GAME_AUDIO_KEY, () => gameAudio.setGameMixes(readGameMixes()));
    const unlock = () => gameAudio.unlock();
    const visibility = () => { if (document.visibilityState === 'hidden') gameAudio.stopAll(); };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', gameAudio.stopAll);
    return () => {
      unsubscribeMixes();
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', gameAudio.stopAll);
      gameAudio.dispose();
    };
  }, []);
  const play = useCallback((event: SoundEvent) => gameAudio.play(event, route), [route]);
  const setEnabled = useCallback((enabled: boolean) => update({ enabled }), [update]);
  const setLevel = useCallback((level: AudioLevel, value: number) => {
    if (Number.isFinite(value)) update({ [level]: Math.max(0, Math.min(1, value)) });
  }, [update]);
  return { enabled: settings.enabled, setEnabled, play, settings, setLevel, stop: gameAudio.stopAll, unlock: gameAudio.unlock };
}
