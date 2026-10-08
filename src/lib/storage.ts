/** Typed localStorage with versioning and safe fallbacks for SSR/private mode. */
const PREFIX = 'desire-spin:v1:';

function safeWindow(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The optional validator checks untrusted persisted data before it reaches UI. */
export function loadJson<T>(key: string, fallback: T, validate?: (value: unknown) => boolean): T {
  try {
    const raw = safeWindow()?.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const value: unknown = JSON.parse(raw);
    return !validate || validate(value) ? value as T : fallback;
  } catch {
    // Some browsers expose localStorage but throw from getItem itself.
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  try {
    safeWindow()?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage is best-effort; a private-mode/quota failure must not break play.
  }
}

export function removeKey(key: string): void {
  try {
    safeWindow()?.removeItem(PREFIX + key);
  } catch {
    // Storage may be blocked even when the Storage object is available.
  }
}

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
