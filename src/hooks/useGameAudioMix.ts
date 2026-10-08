import { useCallback, useEffect, useState } from 'react';
import { gameAudio } from '../lib/audio/engine';
import { DEFAULT_GAME_MIX, GAME_AUDIO_KEY, isGameMix, isGameRoute, readGameMixes, type GameAudioMix } from '../lib/audio/preferences';
import { saveJson, subscribeStorage } from '../lib/storage';

export function useGameAudioMix(route: string) {
  const [mixes, setMixes] = useState(readGameMixes);
  useEffect(() => subscribeStorage(GAME_AUDIO_KEY, () => {
    const next = readGameMixes(); gameAudio.setGameMixes(next); setMixes(next);
  }), []);
  const save = useCallback((mix: GameAudioMix | null) => {
    if (!isGameRoute(route) || (mix !== null && !isGameMix(mix))) return;
    const next = { ...readGameMixes() };
    if (mix) next[route] = mix; else delete next[route];
    gameAudio.setGameMixes(next); saveJson(GAME_AUDIO_KEY, next); setMixes(next);
  }, [route]);
  return { enabled: Boolean(mixes[route]), mix: mixes[route] ?? DEFAULT_GAME_MIX, save };
}
