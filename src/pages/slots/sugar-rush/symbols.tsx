import { RasterSymbol, type AtlasSpec } from '../_shared/RasterSymbol';

const atlas: AtlasSpec = {
  "src": "/art-v2/sugar/symbols-atlas.webp",
  "width": 1448,
  "height": 1086,
  "rects": {
    "donut": [
      81,
      124,
      326,
      352
    ],
    "cupcake": [
      449,
      103,
      665,
      356
    ],
    "popsicle": [
      816,
      109,
      993,
      361
    ],
    "gingerb": [
      1158,
      113,
      1370,
      357
    ],
    "jellybean": [
      84,
      473,
      317,
      655
    ],
    "gum": [
      454,
      455,
      666,
      663
    ],
    "mint": [
      798,
      453,
      1020,
      665
    ],
    "candy-pink": [
      1130,
      463,
      1399,
      649
    ],
    "candy-blue": [
      64,
      803,
      339,
      971
    ],
    "lollipop": [
      469,
      737,
      666,
      997
    ],
    "multiplier": [
      793,
      769,
      1022,
      990
    ],
    "jar": [
      1155,
      737,
      1378,
      1012
    ]
  }
};

export function DonutSymbol() { return <RasterSymbol atlas={atlas} id="donut" occupancy={94} />; }
export function CupcakeSymbol() { return <RasterSymbol atlas={atlas} id="cupcake" occupancy={94} />; }
export function PopsicleSymbol() { return <RasterSymbol atlas={atlas} id="popsicle" occupancy={94} />; }
export function GingerbSymbol() { return <RasterSymbol atlas={atlas} id="gingerb" occupancy={94} />; }
export function JellybeanSymbol() { return <RasterSymbol atlas={atlas} id="jellybean" occupancy={94} />; }
export function GumSymbol() { return <RasterSymbol atlas={atlas} id="gum" occupancy={94} />; }
export function MintSymbol() { return <RasterSymbol atlas={atlas} id="mint" occupancy={94} />; }
export function PinkCandySymbol() { return <RasterSymbol atlas={atlas} id="candy-pink" occupancy={94} />; }
export function BlueCandySymbol() { return <RasterSymbol atlas={atlas} id="candy-blue" occupancy={94} />; }
export function LollipopSymbol() { return <RasterSymbol atlas={atlas} id="lollipop" occupancy={94} />; }

export function MultiplierSymbol({ value }: { value: number; accent?: string }) {
  return <RasterSymbol atlas={atlas} id="multiplier" occupancy={94}><span className="painted-symbol-text theme-multiplier-value">{value}×</span></RasterSymbol>;
}

export const SUGAR_SYMBOL_MAP: Record<string, React.FC> = {
  "donut": DonutSymbol,
  "cupcake": CupcakeSymbol,
  "popsicle": PopsicleSymbol,
  "gingerb": GingerbSymbol,
  "jellybean": JellybeanSymbol,
  "gum": GumSymbol,
  "mint": MintSymbol,
  "candy-pink": PinkCandySymbol,
  "candy-blue": BlueCandySymbol,
  "lollipop": LollipopSymbol,
};
