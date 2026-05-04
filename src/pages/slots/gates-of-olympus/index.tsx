import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { gatesOfOlympusConfig } from './config';
import { OLYMPUS_SYMBOL_MAP, OlympusMultiplierSymbol } from './symbols';

export function GatesOfOlympus() {
  return (
    <ImmersiveSlotView
      cfg={gatesOfOlympusConfig}
      backdropSrc="/olympus-bg.png"
      backdropAspect={{ w: 941, h: 1672 }}
      // Arch interior of the painted backdrop, in % of image:
      //   left ≈ 22%, right ≈ 78%  (interior width ~56%)
      //   top  ≈ 28%, bottom ≈ 86% (interior height ~58%)
      // 6×5 grid is 1.2:1; sizing width to 56% gives height ≈ 46.7% of image
      // which centers vertically at top ≈ 34%.
      archInsets={{ left: 22, top: 34, width: 56 }}
      renderCell={({ symbolId, multiplier }) => {
        if (multiplier !== undefined) {
          return (
            <OlympusMultiplierSymbol value={multiplier} accent={gatesOfOlympusConfig.theme.accent} />
          );
        }
        const C = OLYMPUS_SYMBOL_MAP[symbolId];
        return C ? <C /> : <span className="text-xs text-ink-mute">{symbolId}</span>;
      }}
    />
  );
}
