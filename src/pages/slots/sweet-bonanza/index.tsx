import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { ArtworkGate } from '../_shared/ArtworkGate';
import { sweetBonanzaConfig } from './config';
import { BONANZA_SYMBOL_MAP, MultiplierSymbol } from './symbols';

const assets = ['/art-v2/bonanza/orchard-world.webp', '/art-v2/bonanza/symbols-atlas.webp'];
export function SweetBonanza() {
  return <ArtworkGate assets={assets} title="Sweet Bonanza" color="#edc6a5">
    <ImmersiveSlotView cfg={sweetBonanzaConfig} backdropSrc={assets[0]} backdropAspect={{ w: 6, h: 5 }} archInsets={{ left: 0, top: 0, width: 100 }}
      freeSpinsTint="linear-gradient(180deg,#79295422,#461e5266)" fsTriggerGlyph="✦" fsTriggerTitle="SWEET BONANZA" maxWinLabel="21,100×"
      renderCell={({ symbolId, multiplier }) => { if (multiplier !== undefined) return <MultiplierSymbol value={multiplier} />; const Symbol = BONANZA_SYMBOL_MAP[symbolId]; return Symbol ? <Symbol /> : null; }} />
  </ArtworkGate>;
}
