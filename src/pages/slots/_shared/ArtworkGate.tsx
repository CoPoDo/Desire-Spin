import { useEffect, useState, type ReactNode } from 'react';
import './raster-symbol.css';

/** Begin only after all visible game art is decoded, so the first paid spin
 * cannot outrun its artwork. No wallet or fairness state is touched here. */
export function ArtworkGate({ assets, title, children, color = '#d8bf85' }: {
  assets: readonly string[]; title: string; children: ReactNode; color?: string;
}) {
  const [readyKey, setReadyKey] = useState('');
  const [failure, setFailure] = useState<'slow' | 'error' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = assets.join('|');
  useEffect(() => {
    let cancelled = false;
    setFailure(null);
    const timeout = window.setTimeout(() => { if (!cancelled) setFailure('slow'); }, 20000);
    Promise.all(key.split('|').filter(Boolean).map((src) => new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => { if (typeof image.decode === 'function') image.decode().then(resolve, reject); else resolve(); };
      image.onerror = reject;
      image.src = src;
    }))).then(() => { if (!cancelled) { window.clearTimeout(timeout); setFailure(null); setReadyKey(key); } }).catch(() => { if (!cancelled) { window.clearTimeout(timeout); setFailure('error'); } });
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [key, attempt]);
  if (readyKey === key) return <>{children}</>;
  return <div className="artwork-loading" style={{ color }}><h1>{title}</h1><p role="status">{failure === 'slow' ? 'The artwork is taking longer to load. You can wait or try again.' : failure === 'error' ? 'The game artwork could not load.' : 'Preparing the game…'}</p>{failure && <button onClick={() => setAttempt((value) => value + 1)}>Try again</button>}</div>;
}
