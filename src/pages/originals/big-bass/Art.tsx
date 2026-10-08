import { RasterSymbol, type AtlasSpec } from '../../slots/_shared/RasterSymbol';

export const BASS_WORLD = '/art-v2/bass/lake-world.webp';
/** Exact padded alpha bounds from docs/art-v2/bass/atlas-metadata.json. */
export const BASS_ATLAS: AtlasSpec = {
  src: '/art-v2/bass/symbols-atlas.webp', width: 1448, height: 1086,
  rects: {
    bigbass: [82, 99, 342, 367], smallfish: [437, 128, 683, 363],
    tackle: [761, 106, 993, 355], truck: [1094, 141, 1395, 341],
    anchor: [110, 419, 321, 668], ace: [443, 440, 663, 645],
    king: [796, 442, 1005, 642], queen: [1139, 433, 1357, 659],
    jack: [104, 749, 293, 979], scatter: [394, 778, 713, 969],
    fisherman: [767, 724, 1038, 995], coin: [1119, 722, 1379, 985],
  },
};
export const BASS_EXTENSION: AtlasSpec = { src: '/art-v2/bass/extension-atlas.webp', width: 2172, height: 724, rects: {"ten": [39, 171, 511, 571], "dragonfly": [545, 138, 1106, 602], "tacklebox": [1125, 123, 1670, 617], "floater": [1736, 129, 2102, 590]} };
export const BASS_ASSETS = [BASS_WORLD, BASS_ATLAS.src, BASS_EXTENSION.src];
export const BASS_LABELS: Record<string, string> = {
  bigbass: 'Big bass', smallfish: 'Perch', tackle: 'Fishing tackle', truck: 'Pickup truck',
  anchor: 'Anchor', ace: 'Ace', king: 'King', queen: 'Queen', jack: 'Jack',
  rod: 'Fishing rod', floater: 'Fishing float', dragonfly: 'Dragonfly', tacklebox: 'Tackle box', ten: 'Ten',
  scatter: 'Boat scatter', fisherman: 'Fisherman wild',
};
export function BassSymbol({ id, money = 0 }: { id: string; money?: number }) {
  const atlas = BASS_EXTENSION.rects[id] ? BASS_EXTENSION : BASS_ATLAS;
  const sourceId = id === "rod" ? "tackle" : id;
  return <RasterSymbol atlas={atlas} id={sourceId} occupancy={id === 'truck' || id === 'scatter' ? 96 : 90}>
    {money > 0 && <span className="bass-money-value">{money}×</span>}
  </RasterSymbol>;
}

export function BigBassArt() { return <div className="absolute inset-0 overflow-hidden"><img src={BASS_WORLD} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" style={{ objectPosition:'80% center' }} /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" /><strong className="absolute bottom-4 left-3 right-3 text-center font-serif text-2xl font-black tracking-wide text-[#ecd9a0] drop-shadow-lg">BIG BASS</strong></div>; }
