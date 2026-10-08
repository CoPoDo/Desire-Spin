import { RasterSymbol, type AtlasSpec } from '../_shared/RasterSymbol';

const atlas: AtlasSpec = {
  "src": "/art-v2/olympus/symbols-atlas.webp",
  "width": 1448,
  "height": 1086,
  "rects": {
    "crown": [
      20,
      27,
      441,
      351
    ],
    "ring": [
      454,
      36,
      734,
      360
    ],
    "hourglass": [
      781,
      21,
      1046,
      361
    ],
    "chalice": [
      1113,
      31,
      1421,
      361
    ],
    "gem-red": [
      43,
      391,
      362,
      674
    ],
    "gem-purple": [
      386,
      391,
      720,
      673
    ],
    "gem-yellow": [
      755,
      372,
      1071,
      674
    ],
    "gem-green": [
      1128,
      392,
      1409,
      671
    ],
    "gem-blue": [
      44,
      698,
      340,
      1027
    ],
    "zeus-bolt": [
      380,
      690,
      726,
      1030
    ],
    "multiplier": [
      748,
      680,
      1080,
      1037
    ],
    "laurel": [
      1099,
      693,
      1436,
      1067
    ]
  }
};

export function CrownSymbol() { return <RasterSymbol atlas={atlas} id="crown" occupancy={86} />; }
export function RingSymbol() { return <RasterSymbol atlas={atlas} id="ring" occupancy={86} />; }
export function HourglassSymbol() { return <RasterSymbol atlas={atlas} id="hourglass" occupancy={86} />; }
export function ChaliceSymbol() { return <RasterSymbol atlas={atlas} id="chalice" occupancy={86} />; }
export function RedGemSymbol() { return <RasterSymbol atlas={atlas} id="gem-red" occupancy={86} />; }
export function PurpleGemSymbol() { return <RasterSymbol atlas={atlas} id="gem-purple" occupancy={86} />; }
export function YellowGemSymbol() { return <RasterSymbol atlas={atlas} id="gem-yellow" occupancy={86} />; }
export function GreenGemSymbol() { return <RasterSymbol atlas={atlas} id="gem-green" occupancy={86} />; }
export function BlueGemSymbol() { return <RasterSymbol atlas={atlas} id="gem-blue" occupancy={86} />; }
export function ZeusBoltSymbol() { return <RasterSymbol atlas={atlas} id="zeus-bolt" occupancy={86} />; }

export function OlympusMultiplierSymbol({ value }: { value: number; accent?: string }) {
  return <RasterSymbol atlas={atlas} id="multiplier" occupancy={94}><span className="painted-symbol-text theme-multiplier-value">{value}×</span></RasterSymbol>;
}

export const OLYMPUS_SYMBOL_MAP: Record<string, React.FC> = {
  "crown": CrownSymbol,
  "ring": RingSymbol,
  "hourglass": HourglassSymbol,
  "chalice": ChaliceSymbol,
  "gem-red": RedGemSymbol,
  "gem-purple": PurpleGemSymbol,
  "gem-yellow": YellowGemSymbol,
  "gem-green": GreenGemSymbol,
  "gem-blue": BlueGemSymbol,
  "zeus-bolt": ZeusBoltSymbol,
};

export const olympusSymbolColor = (id: string) => ({ 'gem-red': '#ff5757', 'gem-purple': '#b498ed', 'gem-yellow': '#f8da71', 'gem-green': '#76cda0', 'gem-blue': '#64b9e2' }[id] ?? '#ebd1a0');
