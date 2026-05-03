import { SlotShell } from '../_shared/SlotShell';
import { gatesOfOlympusConfig } from './config';
import { OLYMPUS_SYMBOL_MAP, OlympusMultiplierSymbol } from './symbols';

export function GatesOfOlympus() {
  return (
    <SlotShell
      cfg={gatesOfOlympusConfig}
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
