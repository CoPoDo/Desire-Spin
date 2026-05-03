import { SlotShell } from '../_shared/SlotShell';
import { sweetBonanzaConfig } from './config';
import { BONANZA_SYMBOL_MAP, MultiplierSymbol } from './symbols';

export function SweetBonanza() {
  return (
    <SlotShell
      cfg={sweetBonanzaConfig}
      renderCell={({ symbolId, multiplier }) => {
        if (multiplier !== undefined) {
          return <MultiplierSymbol value={multiplier} accent={sweetBonanzaConfig.theme.accent} />;
        }
        const C = BONANZA_SYMBOL_MAP[symbolId];
        return C ? <C /> : <span className="text-xs text-ink-mute">{symbolId}</span>;
      }}
    />
  );
}
