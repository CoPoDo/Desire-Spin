import { RasterSymbol, type AtlasSpec } from '../_shared/RasterSymbol';
export const JUAN_ATLAS = '/art-v2/juan/symbols-atlas.webp';
export const JUAN_WORLD = '/art-v2/juan/fiesta-world.webp';
const ART: AtlasSpec = { src: JUAN_ATLAS, width: 1448, height: 1086, rects: {"juan": [80, 102, 348, 377], "senorita": [449, 125, 670, 377], "chihuahua": [778, 114, 1022, 385], "vihuela": [1128, 100, 1360, 376], "hot_sauce": [123, 429, 304, 654], "A": [444, 441, 669, 648], "K": [799, 440, 1011, 649], "Q": [1145, 439, 1360, 653], "J": [116, 747, 284, 960], "10": [443, 748, 680, 954], "chili": [776, 738, 1027, 963], "pinata": [1120, 717, 1373, 980]} };

type Size = { size?: string | number };
function Painted({ id, size = '100%' }: Size & { id: string }) {
  return <span style={{ display: 'inline-block', width: size, height: size, maxWidth: '100%', maxHeight: '100%' }}><RasterSymbol atlas={ART} id={id} occupancy={96} /></span>;
}
export function BigJuanSvg({ size }: Size & { armed?: boolean }) { return <Painted id="juan" size={size} />; }
export function DiabloSvg({ size }: Size) { return <Painted id="senorita" size={size} />; }
export { DiabloSvg as SenoritaSvg };
export function GuitarSvg({ size }: Size) { return <Painted id="vihuela" size={size} />; }
export function ChilliSvg({ size }: Size) { return <Painted id="chili" size={size} />; }
export function HotSauceSvg({ size }: Size) { return <Painted id="hot_sauce" size={size} />; }
export function ChihuahuaSvg({ size }: Size) { return <Painted id="chihuahua" size={size} />; }
export function PinataSvg({ size }: Size) { return <Painted id="pinata" size={size} />; }
export function RoyalSvg({ letter, size }: Size & { letter: string; color: string }) { return <Painted id={letter} size={size} />; }
