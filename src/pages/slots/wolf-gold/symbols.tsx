import { RasterSymbol, type AtlasSpec } from '../_shared/RasterSymbol';
export const WOLF_ATLAS = '/art-v2/wolf/symbols-atlas.webp';
export const WOLF_WORLD = '/art-v2/wolf/moonlit-world.webp';
const ART: AtlasSpec = { src: WOLF_ATLAS, width: 1448, height: 1086, rects: {"wolf": [101, 96, 311, 314], "eagle": [451, 117, 651, 313], "cougar": [798, 109, 991, 316], "mustang": [1114, 92, 1335, 317], "feather": [96, 440, 303, 652], "arrow": [445, 435, 662, 645], "turquoise": [819, 445, 979, 638], "amber": [1154, 440, 1335, 640], "jasper": [103, 778, 305, 969], "coyote": [441, 754, 634, 989], "wild": [784, 760, 1010, 986], "coin": [1138, 759, 1361, 983]} };
export function WolfSymbol() { return <RasterSymbol atlas={ART} id="wolf" />; }
export function EagleSymbol() { return <RasterSymbol atlas={ART} id="eagle" />; }
export function CougarSymbol() { return <RasterSymbol atlas={ART} id="cougar" />; }
export function MustangSymbol() { return <RasterSymbol atlas={ART} id="mustang" />; }
export function FeatherSymbol() { return <RasterSymbol atlas={ART} id="feather" />; }
export function ArrowSymbol() { return <RasterSymbol atlas={ART} id="arrow" />; }
export function TurquoiseSymbol() { return <RasterSymbol atlas={ART} id="turquoise" />; }
export function AmberSymbol() { return <RasterSymbol atlas={ART} id="amber" />; }
export function JasperSymbol() { return <RasterSymbol atlas={ART} id="jasper" />; }
export function CoyoteSymbol() { return <RasterSymbol atlas={ART} id="coyote" />; }
export function MultiplierSymbol({ value }: { value: number; accent?: string }) { return <RasterSymbol atlas={ART} id="coin"><strong className="painted-value">{value}×</strong></RasterSymbol>; }
export const WOLF_SYMBOL_MAP = {
  "wolf": WolfSymbol,
  "eagle": EagleSymbol,
  "cougar": CougarSymbol,
  "mustang": MustangSymbol,
  "feather": FeatherSymbol,
  "arrow": ArrowSymbol,
  "turquoise": TurquoiseSymbol,
  "amber": AmberSymbol,
  "jasper": JasperSymbol,
  "coyote": CoyoteSymbol,
  wild: () => <RasterSymbol atlas={ART} id="wild" />,
  money: () => <RasterSymbol atlas={ART} id="coin" />,
};
