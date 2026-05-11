import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadJson, saveJson } from '../lib/storage';

const KEY = 'favorites';

export function useFavorites() {
  const [list, setList] = useState<string[]>(() => loadJson<string[]>(KEY, []));

  useEffect(() => {
    saveJson(KEY, list);
  }, [list]);

  const set = useMemo(() => new Set(list), [list]);

  const isFavorite = useCallback((to: string) => set.has(to), [set]);

  const toggle = useCallback((to: string) => {
    setList((prev) => (prev.includes(to) ? prev.filter((x) => x !== to) : [...prev, to]));
  }, []);

  return { list, isFavorite, toggle };
}
