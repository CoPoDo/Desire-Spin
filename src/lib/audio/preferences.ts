import { isBoolean, loadJson, saveJson } from '../storage';

export const AUDIO_SETTINGS_KEY = 'audio-mixer-v3';
export type AudioBus = 'effects' | 'music' | 'voice';
export type AudioLevel = 'master' | AudioBus;
export interface AudioPreferences {
  version: 3;
  enabled: boolean;
  voiceEnabled: boolean;
  musicEnabled: boolean;
  master: number;
  effects: number;
  music: number;
  voice: number;
}
export const DEFAULT_AUDIO: AudioPreferences = { version: 3, enabled: true, voiceEnabled: true, musicEnabled: true, master: .8, effects: .72, music: .28, voice: .85 };
export function isAudioPreferences(value: unknown): value is AudioPreferences {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.version === 3 && ['enabled', 'voiceEnabled', 'musicEnabled'].every((key) => typeof v[key] === 'boolean') &&
    ['master', 'effects', 'music', 'voice'].every((key) => typeof v[key] === 'number' && Number.isFinite(v[key]) && Number(v[key]) >= 0 && Number(v[key]) <= 1);
}
export function readAudioPreferences(): AudioPreferences {
  return loadJson<AudioPreferences>(AUDIO_SETTINGS_KEY, {
    ...DEFAULT_AUDIO,
    enabled: loadJson('sound-on', true, isBoolean),
    musicEnabled: loadJson('music-on', true, isBoolean),
  }, isAudioPreferences);
}
export function writeAudioPreferences(settings: AudioPreferences) {
  if (!isAudioPreferences(settings)) return;
  saveJson(AUDIO_SETTINGS_KEY, settings);
  // Preserve the old quick-mute keys for existing tabs and upgrades.
  saveJson('sound-on', settings.enabled);
  saveJson('music-on', settings.musicEnabled);
}

export const GAME_AUDIO_KEY = 'audio-game-mixes-v1';
export interface GameAudioMix {
  effects: number; music: number; voice: number;
  effectsEnabled: boolean; musicEnabled: boolean; voiceEnabled: boolean;
}
export const DEFAULT_GAME_MIX: GameAudioMix = { effects: 1, music: 1, voice: 1, effectsEnabled: true, musicEnabled: true, voiceEnabled: true };
export type GameAudioMixes = Record<string, GameAudioMix>;
export function isGameMix(value: unknown): value is GameAudioMix {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['effects', 'music', 'voice'].every((key) => typeof v[key] === 'number' && Number.isFinite(v[key]) && Number(v[key]) >= 0 && Number(v[key]) <= 1) &&
    ['effectsEnabled', 'musicEnabled', 'voiceEnabled'].every((key) => typeof v[key] === 'boolean');
}
export function isGameRoute(route: string) { return /^\/(slots|originals|live)\/[a-z0-9-]+$/.test(route); }
export function isGameMixes(value: unknown): value is GameAudioMixes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 64 && entries.every(([route, mix]) => isGameRoute(route) && isGameMix(mix));
}
export function readGameMixes() { return loadJson<GameAudioMixes>(GAME_AUDIO_KEY, {}, isGameMixes); }
export function effectiveAudioPreferences(base: AudioPreferences, mix?: GameAudioMix): AudioPreferences {
  if (!mix) return base;
  return { ...base, effects: base.effects * (mix.effectsEnabled ? mix.effects : 0), music: base.music * mix.music, voice: base.voice * mix.voice,
    musicEnabled: base.musicEnabled && mix.musicEnabled, voiceEnabled: base.voiceEnabled && mix.voiceEnabled };
}
