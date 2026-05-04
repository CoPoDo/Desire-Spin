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
    // Pick a male / deep voice if available; default voice often
    // sounds high-pitched even at pitch 0.4 on certain browsers.
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      /male|deep|david|google uk english male|microsoft mark/i.test(v.name),
    );
    if (preferred) u.voice = preferred;
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
