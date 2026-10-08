import { useCallback, useEffect, useState } from 'react';
import { gameAudio } from '../lib/audio/engine';
import { AUDIO_SETTINGS_KEY, isAudioPreferences, readAudioPreferences, writeAudioPreferences, type AudioPreferences } from '../lib/audio/preferences';
import { subscribeStorage } from '../lib/storage';

export function useAudioPreferences() {
  const [settings, setSettings] = useState(readAudioPreferences);
  useEffect(() => {
    gameAudio.configure(settings);
  }, [settings]);
  useEffect(() => subscribeStorage(AUDIO_SETTINGS_KEY, () => {
    const next = readAudioPreferences(); gameAudio.configure(next); setSettings(next);
  }), []);
  const update = useCallback((patch: Partial<Omit<AudioPreferences, 'version'>>) => {
    const next = { ...readAudioPreferences(), ...patch, version: 3 as const };
    if (!isAudioPreferences(next)) return;
    gameAudio.configure(next); writeAudioPreferences(next); setSettings(next);
  }, []);
  return { settings, update };
}
