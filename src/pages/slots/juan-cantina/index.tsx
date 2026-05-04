import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { juanCantinaConfig } from './config';
import { JUAN_SYMBOL_MAP, MultiplierSymbol } from './symbols';
import { JuanScene } from './Scene';

export function JuanCantina() {
  return (
    <ImmersiveSlotView
      cfg={juanCantinaConfig}
      backdropElement={<JuanScene />}
      backdropAspect={{ w: 941, h: 1672 }}
      // Grid sits in the upper-mid of the desert sky, above the mesas
      // and below the papel picado bunting.
      archInsets={{ left: 8, top: 27, width: 84 }}
      // Warm dusk-fire FS tint (deep red-orange)
      freeSpinsTint="linear-gradient(180deg, rgba(180, 60, 20, 0.22) 0%, rgba(200, 40, 60, 0.34) 50%, rgba(60, 10, 20, 0.46) 100%)"
      maxWinLabel="5,000×"
      renderCell={({ symbolId, multiplier }) => {
        if (multiplier !== undefined) {
          return (
            <MultiplierSymbol
              value={multiplier}
              accent={juanCantinaConfig.theme.accent}
            />
          );
        }
        const C = JUAN_SYMBOL_MAP[symbolId];
        return C ? <C /> : <span className="text-xs text-ink-mute">{symbolId}</span>;
      }}
    />
  );
}
