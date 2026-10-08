import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { ArtworkGate } from '../_shared/ArtworkGate';
import { gatesOfOlympusConfig } from './config';
import { OLYMPUS_SYMBOL_MAP, OlympusMultiplierSymbol } from './symbols';

const assets = ['/art-v2/olympus/temple-world.webp', '/art-v2/olympus/symbols-atlas.webp'];
export function GatesOfOlympus() {
  return <ArtworkGate assets={assets} title="Gates of Olympus">
    <ImmersiveSlotView cfg={gatesOfOlympusConfig} backdropSrc={assets[0]} backdropAspect={{ w: 6, h: 5 }} archInsets={{ left: 0, top: 0, width: 100 }}
      freeSpinsTint="linear-gradient(180deg,#29235844,#13244988)" fsTriggerGlyph="⚡" fsTriggerTitle="GATES OF OLYMPUS"
      renderCell={({ symbolId, multiplier }) => { if (multiplier !== undefined) return <OlympusMultiplierSymbol value={multiplier} />; const Symbol = OLYMPUS_SYMBOL_MAP[symbolId]; return Symbol ? <Symbol /> : null; }} />
  </ArtworkGate>;
}
