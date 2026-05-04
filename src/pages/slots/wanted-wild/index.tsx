import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { wantedWildConfig } from './config';
import { WANTED_SYMBOL_MAP, MultiplierSymbol } from './symbols';
import { WantedScene } from './Scene';

export function WantedWild() {
  return (
    <ImmersiveSlotView
      cfg={wantedWildConfig}
      backdropElement={<WantedScene />}
      backdropAspect={{ w: 941, h: 1672 }}
      archInsets={{ left: 8, top: 27, width: 84 }}
      // Smoke + blood-red FS tint
      freeSpinsTint="linear-gradient(180deg, rgba(120, 30, 10, 0.24) 0%, rgba(180, 30, 30, 0.32) 50%, rgba(40, 10, 10, 0.46) 100%)"
      maxWinLabel="5,000×"
      renderCell={({ symbolId, multiplier }) => {
        if (multiplier !== undefined) {
          return (
            <MultiplierSymbol
              value={multiplier}
              accent={wantedWildConfig.theme.accent}
            />
          );
        }
        const C = WANTED_SYMBOL_MAP[symbolId];
        return C ? <C /> : <span className="text-xs text-ink-mute">{symbolId}</span>;
      }}
    />
  );
}
