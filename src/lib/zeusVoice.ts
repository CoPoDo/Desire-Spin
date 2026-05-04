/**
 * Zeus voice — deep / slow SpeechSynthesisUtterance for big Olympus
 * moments (multipliers landing, free spins triggered, big-win
 * celebrations). Mirrors what the audit found in the old House Edge
 * `speakZeus()` helper: a low pitch + slow rate so the voice reads as
 * a divine pronouncement rather than a chirpy text-to-speech default.
 *
 * Real Pragmatic Olympus has a sampled Zeus VO who delivers lines
 * like "PROSPER!", "TREMBLE BEFORE ME!", "FREE SPINS!" at key
 * moments. We can't ship those samples, but the browser's TTS gets
 * close enough at low pitch + slow rate that it reads as a god's voice.
 *
 * Silently no-ops if speechSynthesis isn't available (older browsers,
 * SSR, or if the user has the API disabled).
 */

let lastSpokeAt = 0;
const COOLDOWN_MS = 800; // avoid voice-stomping when frames fire fast
let cachedVoice: SpeechSynthesisVoice | null = null;

// Voices load asynchronously on most browsers — the first
// getVoices() call returns []. Subscribe to the voiceschanged event
// so we have a deep voice ready when speakZeus is first called.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    cachedVoice =
      voices.find((v) =>
        /male|deep|david|google uk english male|microsoft mark|microsoft david/i.test(v.name),
      ) ?? null;
  };
  pickVoice();
  // Some browsers fire voiceschanged once voices load
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function speakZeus(line: string, opts: { pitch?: number; rate?: number; volume?: number } = {}) {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  const now = Date.now();
  if (now - lastSpokeAt < COOLDOWN_MS) return;
  lastSpokeAt = now;
  try {
    const u = new SpeechSynthesisUtterance(line);
    u.pitch = opts.pitch ?? 0.4;
    u.rate = opts.rate ?? 0.85;
    u.volume = opts.volume ?? 0.7;
    // Use the cached deep voice picked on voiceschanged. Fallback to
    // re-scanning if the cache is empty (e.g. first call before
    // voiceschanged fires).
    if (cachedVoice) {
      u.voice = cachedVoice;
    } else {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        /male|deep|david|google uk english male|microsoft mark|microsoft david/i.test(v.name),
      );
      if (preferred) {
        u.voice = preferred;
        cachedVoice = preferred;
      }
    }
    window.speechSynthesis.speak(u);
  } catch {
    // Speech synthesis can throw on very locked-down platforms; just
    // silently swallow — the visual effects are the load-bearing piece.
  }
}

/** Pick a random Zeus line for a given event type. */
const LINES = {
  lightningStrike: ['POWER!', 'BEHOLD!', 'TREMBLE!', 'WITNESS MY MIGHT!'],
  multiplierLanded: ['MORE!', 'TASTE OLYMPUS!', 'PROSPER!'],
  freeSpinsTrigger: ['FREE SPINS!', 'FAVOR THE MORTALS!', 'OPEN THE GATES!'],
  bigWin: ['THE GODS REWARD YOU!', 'MIGHTY!', 'GLORY!'],
} as const;

export function zeusLineFor(event: keyof typeof LINES): string {
  const lines = LINES[event];
  return lines[Math.floor(Math.random() * lines.length)]!;
}
