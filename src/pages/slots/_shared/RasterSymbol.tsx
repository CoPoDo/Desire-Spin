import type { CSSProperties, ReactNode } from 'react';
import './raster-symbol.css';

export type AtlasSpec = {
  src: string;
  width: number;
  height: number;
  /** Exact source bounds, with soft-edge padding included. */
  rects: Record<string, readonly [number, number, number, number]>;
};

/** Original painted game artwork, accurately cropped without resampling files.
 * Both the moving reel and resting grid use this same renderer. */
export function RasterSymbol({ atlas, id, children, className = '', occupancy = 91 }: {
  atlas: AtlasSpec; id: string; children?: ReactNode; className?: string; occupancy?: number;
}) {
  const rect = atlas.rects[id];
  if (!rect) return null;
  const [x, y, right, bottom] = rect;
  const width = right - x, height = bottom - y;
  const ratio = width / height;
  const crop: CSSProperties = {
    width: `${ratio >= 1 ? occupancy : occupancy * ratio}%`,
    height: `${ratio >= 1 ? occupancy / ratio : occupancy}%`,
  };
  return <span className={`painted-slot-symbol ${className}`} aria-hidden="true"><span className="painted-slot-crop" style={crop}><img src={atlas.src} width={atlas.width} height={atlas.height} draggable={false} alt="" style={{ width: `${atlas.width / width * 100}%`, height: `${atlas.height / height * 100}%`, maxWidth: 'none', left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }} /></span>{children}</span>;
}
