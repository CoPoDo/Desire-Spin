import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { sweetBonanzaConfig } from './config';
import { BONANZA_SYMBOL_MAP, MultiplierSymbol } from './symbols';
import { BonanzaScene } from './Scene';

export function SweetBonanza() {
  return (
    <ImmersiveSlotView
      cfg={sweetBonanzaConfig}
      // CSS-only scene (no painted backdrop image) — virtual canvas dimensions
      // chosen to match the immersive view's portrait stage (close to Olympus).
      backdropElement={<BonanzaScene />}
      backdropAspect={{ w: 941, h: 1672 }}
      // Grid sits centered on the candy-cloud scene with a touch of headroom
      // for the cloud puffs at the top and the candy mountains at the bottom.
      archInsets={{ left: 8, top: 30, width: 84 }}
      // Bonanza-specific FS tint — warm magenta+rose overlay (vs Olympus's
      // amber+purple). Real Pragmatic warms the scene during free spins.
      freeSpinsTint="linear-gradient(180deg, rgba(160, 30, 90, 0.18) 0%, rgba(120, 40, 140, 0.34) 50%, rgba(40, 10, 60, 0.42) 100%)"
      maxWinLabel="21,100×"
      renderCell={({ symbolId, multiplier }) => {
        if (multiplier !== undefined) {
          return (
            <MultiplierSymbol
              value={multiplier}
              accent={sweetBonanzaConfig.theme.accent}
            />
          );
        }
        const C = BONANZA_SYMBOL_MAP[symbolId];
        return C ? <C /> : <span className="text-xs text-ink-mute">{symbolId}</span>;
      }}
    />
  );
}
