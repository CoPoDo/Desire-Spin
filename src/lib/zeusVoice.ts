import { AUDIO_ROOT, OLYMPUS_VOICES } from './audio/catalog';
import { gameAudio } from './audio/engine';

/** Exact, natural-pitch excerpts of the selected Chatterbox performance.
 * Two honest captions, used sparingly for bonus entry and major wins only. */
export function primeZeus() { gameAudio.unlock(); }
export function cancelZeus() { gameAudio.stopBus('voice'); }
export function speakZeus(line: string, opts: { volume?: number } = {}) {
  if (!gameAudio.getRoute().includes('gates-of-olympus')) return;
  const id = (Object.keys(OLYMPUS_VOICES) as (keyof typeof OLYMPUS_VOICES)[]).find((key) => OLYMPUS_VOICES[key] === line);
  if (!id) return;
  void gameAudio.speak(`${AUDIO_ROOT}/voices/olympus/${id}.mp3`, gameAudio.getRoute(), 3, opts.volume ?? 1);
}
export function zeusLineFor(event: 'lightningStrike' | 'multiplierLanded' | 'freeSpinsTrigger' | 'bigWin'): string {
  if (event === 'freeSpinsTrigger') return OLYMPUS_VOICES.power;
  if (event === 'bigWin') return OLYMPUS_VOICES.glory;
  return '';
}
