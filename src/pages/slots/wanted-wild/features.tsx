import { RasterSymbol, type AtlasSpec } from '../_shared/RasterSymbol';
export const WANTED_FEATURE_ATLAS = '/art-v2/wanted/feature-atlas.webp';
const FEATURE_ART: AtlasSpec = {
  src: WANTED_FEATURE_ATLAS, width: 2172, height: 724,
  rects: { skull: [23,107,543,611], train: [557,91,1070,625], duel: [1105,108,1607,627], dead: [1654,92,2145,631] },
};
export function SkullSymbol() { return <RasterSymbol atlas={FEATURE_ART} id="skull" />; }
function BonusSymbol({ id, label }: { id: string; label: string }) { return <RasterSymbol atlas={FEATURE_ART} id={id} className={`wanted-bonus-symbol ${id}`}><span className="painted-symbol-text wanted-bonus-label">{label}</span></RasterSymbol>; }
export function TrainSymbol() { return <BonusSymbol id="train" label="TRAIN" />; }
export function DuelSymbol() { return <BonusSymbol id="duel" label="DUEL" />; }
export function DeadSymbol() { return <BonusSymbol id="dead" label="DEAD MAN" />; }
