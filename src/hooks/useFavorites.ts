import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

const KEY = 'favorites';
const validPath = (value: unknown): value is string =>
  typeof value === 'string' && /^\/(?:slots|originals)\/[a-z0-9-]+$/.test(value);

export function useFavorites() {
  const [list, setList] = useState<string[]>(() => {
    const saved = loadJson<unknown>(KEY, []);
    return Array.isArray(saved) ? [...new Set(saved.filter(validPath))] : [];
  });
  const ref = useRef(list);
  useEffect(() => { saveJson(KEY, ref.current); }, []);
  const set = useMemo(() => new Set(list), [list]);
  const isFavorite = useCallback((to: string) => set.has(to), [set]);
  const toggle = useCallback((to: string) => {
    if (!validPath(to)) return;
    const prev = ref.current;
    const next = prev.includes(to) ? prev.filter((x) => x !== to) : [...prev, to];
    ref.current = next;
    saveJson(KEY, next);
    setList(next);
  }, []);
  return { list, isFavorite, toggle };
}
