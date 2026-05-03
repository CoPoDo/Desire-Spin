/**
 * Typed localStorage with versioning and safe fallbacks for SSR / private mode.
 */
const PREFIX = 'desire-spin:v1:';

function safeWindow(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function loadJson<T>(key: string, fallback: T): T {
  const ls = safeWindow();
  if (!ls) return fallback;
  const raw = ls.getItem(PREFIX + key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  const ls = safeWindow();
  if (!ls) return;
  try {
    ls.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function removeKey(key: string): void {
  const ls = safeWindow();
  if (!ls) return;
  try {
    ls.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
