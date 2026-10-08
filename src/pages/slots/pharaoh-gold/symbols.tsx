import { RasterSymbol, type AtlasSpec } from '../_shared/RasterSymbol';
export const PHARAOH_COBRA = '/art-v2/pharaoh/cobra.webp';
const COBRA_ART: AtlasSpec = { src: PHARAOH_COBRA, width: 1254, height: 1254, rects: { cobra: [181, 49, 1077, 1199] } };
export function CobraSymbol() { return <RasterSymbol atlas={COBRA_ART} id="cobra" />; }
export const PHARAOH_ATLAS = '/art-v2/pharaoh/symbols-atlas.webp';
export const PHARAOH_WORLD = '/art-v2/pharaoh/temple-world.webp';
const ART: AtlasSpec = { src: PHARAOH_ATLAS, width: 1448, height: 1086, rects: {"pharaoh": [116, 125, 337, 378], "eye": [466, 182, 674, 354], "ankh": [823, 131, 985, 375], "jackal": [1124, 118, 1326, 384], "falcon": [107, 454, 316, 675], "lotus": [446, 475, 685, 661], "gem-blue": [804, 469, 1005, 657], "gem-red": [1133, 464, 1340, 668], "gem-green": [119, 766, 327, 966], "scarab": [442, 755, 688, 975], "wild": [795, 743, 1014, 974], "coin": [1127, 753, 1349, 972]} };
export function PharaohSymbol() { return <RasterSymbol atlas={ART} id="pharaoh" />; }
export function EyeSymbol() { return <RasterSymbol atlas={ART} id="eye"><span className="pharaoh-wild-label">WILD</span></RasterSymbol>; }
export function AnkhSymbol() { return <RasterSymbol atlas={ART} id="ankh" />; }
export function JackalSymbol() { return <RasterSymbol atlas={ART} id="jackal" />; }
export function FalconSymbol() { return <RasterSymbol atlas={ART} id="falcon" />; }
export function LotusSymbol() { return <RasterSymbol atlas={ART} id="lotus" />; }
export function BlueGemSymbol() { return <RasterSymbol atlas={ART} id="gem-blue" />; }
export function RedGemSymbol() { return <RasterSymbol atlas={ART} id="gem-red" />; }
export function GreenGemSymbol() { return <RasterSymbol atlas={ART} id="gem-green" />; }
export function ScarabSymbol() { return <RasterSymbol atlas={ART} id="scarab" />; }
export function MultiplierSymbol({ value }: { value: number; accent?: string }) { return <RasterSymbol atlas={ART} id="coin"><strong className="painted-value">{value}×</strong></RasterSymbol>; }
export const PHARAOH_SYMBOL_MAP = {
  cobra: CobraSymbol,
  blank: () => <span className="line-blank-symbol" />,
  "pharaoh": PharaohSymbol,
  "eye": EyeSymbol,
  "ankh": AnkhSymbol,
  "jackal": JackalSymbol,
  "falcon": FalconSymbol,
  "lotus": LotusSymbol,
  "gem-blue": BlueGemSymbol,
  "gem-red": RedGemSymbol,
  "gem-green": GreenGemSymbol,
  "scarab": ScarabSymbol,
  wild: () => <RasterSymbol atlas={ART} id="wild" />,
  money: () => <RasterSymbol atlas={ART} id="coin" />,
};
