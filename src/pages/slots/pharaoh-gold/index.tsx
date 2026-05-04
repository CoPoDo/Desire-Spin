import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { pharaohGoldConfig } from './config';
import { PHARAOH_SYMBOL_MAP, MultiplierSymbol } from './symbols';
import { PharaohScene } from './Scene';

export function PharaohGold() {
  return (
    <ImmersiveSlotView
      cfg={pharaohGoldConfig}
      backdropElement={<PharaohScene />}
      backdropAspect={{ w: 941, h: 1672 }}
      archInsets={{ left: 8, top: 27, width: 84 }}
      // Warm gold + lapis FS tint
      freeSpinsTint="linear-gradient(180deg, rgba(140, 80, 10, 0.24) 0%, rgba(180, 120, 30, 0.32) 50%, rgba(40, 18, 4, 0.46) 100%)"
      // Real Egyptian-themed slots (Eye of Horus, John Hunter & the Tomb
      // of the Scarab Queen, Book of Ra-likes) frame their bonus rounds
      // around a "Tomb opens" / "Pharaoh's blessing" moment with scarab
      // bursts, not lightning bolts. Override with a scarab beetle and a
      // pharaonic banner.
      fsTriggerGlyph="🪲"
      fsTriggerTitle="PHARAOH'S BOUNTY"
      maxWinLabel="5,000×"
      renderCell={({ symbolId, multiplier }) => {
        if (multiplier !== undefined) {
          return (
            <MultiplierSymbol
              value={multiplier}
              accent={pharaohGoldConfig.theme.accent}
            />
          );
        }
        const C = PHARAOH_SYMBOL_MAP[symbolId];
        return C ? <C /> : <span className="text-xs text-ink-mute">{symbolId}</span>;
      }}
    />
  );
}
