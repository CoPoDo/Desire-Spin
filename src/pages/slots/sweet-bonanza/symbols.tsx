import { RasterSymbol, type AtlasSpec } from '../_shared/RasterSymbol';

const atlas: AtlasSpec = {
  "src": "/art-v2/bonanza/symbols-atlas.webp",
  "width": 1448,
  "height": 1086,
  "rects": {
    "heart": [
      90,
      132,
      298,
      314
    ],
    "grape": [
      457,
      91,
      664,
      341
    ],
    "watermelon": [
      784,
      116,
      1016,
      326
    ],
    "plum": [
      1174,
      113,
      1360,
      323
    ],
    "apple": [
      88,
      439,
      305,
      658
    ],
    "blueberry": [
      458,
      459,
      667,
      654
    ],
    "banana": [
      780,
      439,
      1011,
      652
    ],
    "candy-pink": [
      1126,
      489,
      1387,
      624
    ],
    "candy-blue": [
      66,
      819,
      353,
      962
    ],
    "lollipop": [
      479,
      740,
      668,
      1011
    ],
    "multiplier": [
      785,
      717,
      1033,
      1001
    ],
    "cherries": [
      1147,
      760,
      1374,
      996
    ]
  }
};
export function HeartSymbol() { return <RasterSymbol atlas={atlas} id="heart" occupancy={90} />; }
export function GrapeSymbol() { return <RasterSymbol atlas={atlas} id="grape" occupancy={90} />; }
export function WatermelonSymbol() { return <RasterSymbol atlas={atlas} id="watermelon" occupancy={90} />; }
export function PlumSymbol() { return <RasterSymbol atlas={atlas} id="plum" occupancy={90} />; }
export function AppleSymbol() { return <RasterSymbol atlas={atlas} id="apple" occupancy={90} />; }
export function BlueberrySymbol() { return <RasterSymbol atlas={atlas} id="blueberry" occupancy={90} />; }
export function BananaSymbol() { return <RasterSymbol atlas={atlas} id="banana" occupancy={90} />; }
export function PinkCandySymbol() { return <RasterSymbol atlas={atlas} id="candy-pink" occupancy={90} />; }
export function BlueCandySymbol() { return <RasterSymbol atlas={atlas} id="candy-blue" occupancy={90} />; }
export function LollipopSymbol() { return <RasterSymbol atlas={atlas} id="lollipop" occupancy={90} />; }
export function MultiplierSymbol({ value }: { value: number; accent?: string }) { return <RasterSymbol atlas={atlas} id="multiplier" occupancy={94}><span className="painted-symbol-text theme-multiplier-value">{value}×</span></RasterSymbol>; }
export const BONANZA_SYMBOL_MAP: Record<string, React.FC> = {
  "heart": HeartSymbol,
  "grape": GrapeSymbol,
  "watermelon": WatermelonSymbol,
  "plum": PlumSymbol,
  "apple": AppleSymbol,
  "blueberry": BlueberrySymbol,
  "banana": BananaSymbol,
  "candy-pink": PinkCandySymbol,
  "candy-blue": BlueCandySymbol,
  "lollipop": LollipopSymbol,
};
