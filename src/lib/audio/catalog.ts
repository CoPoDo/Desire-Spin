export type AudioTheme = 'olympus' | 'bonanza' | 'sugar' | 'wanted' | 'wolf' | 'pharaoh' | 'juan' | 'bass' | 'lounge';
export type SoundEvent = 'spin' | 'drop' | 'win' | 'big-win' | 'mega-win' | 'multiplier' | 'click' |
  'lightning-strike' | 'thunder' | 'scatter-land' | 'free-spins-trigger' | 'free-spins-end' | 'coin' | 'tick' |
  'cascade-clear' | 'cascade-fall' | 'cascade-land' |
  'juan-reel-stop' | 'juan-anticipation' | 'juan-switch' | 'juan-fanfare' | 'juan-coin';
export const AUDIO_ROOT = '/audio/v3';
export function themeForRoute(path: string): AudioTheme {
  if (path.includes('gates-of-olympus')) return 'olympus';
  if (path.includes('sweet-bonanza')) return 'bonanza';
  if (path.includes('sugar-rush')) return 'sugar';
  if (path.includes('wanted-wild')) return 'wanted';
  if (path.includes('wolf-gold')) return 'wolf';
  if (path.includes('pharaoh-gold')) return 'pharaoh';
  if (path.includes('big-juan')) return 'juan';
  if (path.includes('big-bass')) return 'bass';
  return 'lounge';
}
export function effectFile(event: SoundEvent, theme: AudioTheme) {
  const aliases: Partial<Record<SoundEvent, string>> = { 'juan-reel-stop': 'drop', 'juan-anticipation': 'anticipation', 'juan-switch': 'switch', 'juan-fanfare': 'big-win', 'juan-coin': 'coin' };
  return `${AUDIO_ROOT}/${event.startsWith('juan-') ? 'juan' : theme}/${aliases[event] ?? event}.mp3`;
}
export const THEME_PRELOAD: SoundEvent[] = ['spin', 'drop', 'cascade-clear', 'cascade-fall', 'cascade-land', 'win', 'click', 'tick', 'coin', 'multiplier', 'scatter-land', 'thunder', 'lightning-strike', 'big-win', 'mega-win', 'free-spins-trigger', 'free-spins-end'];
export const OLYMPUS_VOICES = {
  power: 'Behold my power!', glory: 'Rise, and claim your glory!',
} as const;
