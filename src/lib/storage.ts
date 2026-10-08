/** Typed localStorage with versioning and safe fallbacks for SSR/private mode. */
const PREFIX = 'desire-spin:v1:';
const LOCAL_CHANGE = 'desire-spin:storage-change';

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

/** Null means absent; undefined means storage cannot currently be read. */
export function readStorageSnapshot(key: string): string | null | undefined {
  try { return safeWindow()?.getItem(PREFIX + key); } catch { return undefined; }
}

export function subscribeStorage(key: string, listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PREFIX + key) listener();
  };
  const onLocal = (event: Event) => {
    if ((event as CustomEvent<string>).detail === key) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(LOCAL_CHANGE, onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(LOCAL_CHANGE, onLocal);
  };
}

export function saveJson<T>(key: string, value: T): void {
  try {
    const storage = safeWindow();
    if (!storage) return;
    storage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE, { detail: key }));
  } catch {
    // Storage is best-effort; a private-mode/quota failure must not break play.
  }
}

export function removeKey(key: string): void {
  try {
    const storage = safeWindow();
    if (!storage) return;
    storage.removeItem(PREFIX + key);
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE, { detail: key }));
  } catch {
    // Storage may be blocked even when the Storage object is available.
  }
}

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
