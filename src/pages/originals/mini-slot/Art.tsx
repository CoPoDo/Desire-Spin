import { RasterSymbol, type AtlasSpec } from '../../slots/_shared/RasterSymbol';
import type { SymbolId } from './engine';
import './classic-cabinet.css';

export const CLASSIC_ATLAS = '/art-v2/classic/symbols-atlas.webp';
export const CLASSIC_SYMBOL_ART: AtlasSpec = {
  src: CLASSIC_ATLAS, width: 1536, height: 1024,
  // Source-pixel bounds retain the painted edge without admitting neighbours.
  rects: {
    cherry: [49, 24, 512, 482],
    lemon: [568, 50, 995, 461],
    grape: [1046, 24, 1491, 500],
    seven: [65, 521, 499, 981],
    diamond: [523, 542, 1018, 964],
  },
};
export const CLASSIC_SYMBOL_NAMES: Record<SymbolId, string> = {
  cherry: 'Cherries', lemon: 'Lemons', grape: 'Grapes', seven: 'Sevens', diamond: 'Diamonds',
};

export function ClassicSymbol({ id }: { id: SymbolId }) {
  return <span className="classic-symbol" data-symbol-id={id}><RasterSymbol atlas={CLASSIC_SYMBOL_ART} id={id} occupancy={86} /></span>;
}

/** The lobby and actual cabinet share the same authored symbol artwork. */
export function ClassicSlotArt() {
  return <div className="classic-card-art" aria-hidden="true">
    <div className="classic-card-brand"><span>THE ORIGINAL</span><strong>CLASSIC</strong><small>3 REEL</small></div>
    <div className="classic-card-reels">{(['cherry', 'seven', 'diamond'] as const).map(id => <div key={id}><ClassicSymbol id={id} /></div>)}</div>
    <div className="classic-card-rail"><span /><i /><span /></div>
  </div>;
}
