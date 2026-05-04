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
      //   top  ≈ 28.7%, bottom ≈ 88.5% (interior height ~59.8%)
      // 6×5 grid is 1.2:1 in width-units. With grid width 56% of image
      // width, grid height = (0.56 / 1.2) × imgW = 0.467 × imgW.
      // Image is 1.776× as tall as it is wide → grid height as % of image
      // height = 0.467 / 1.776 = 26.3%. Vertical center of arch = 58.6%,
      // so grid top = 58.6% − 26.3%/2 = 45.45%.
      // Append ?tune=1 to the URL to dial these in interactively.
      archInsets={{ left: 22, top: 45, width: 56 }}
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
