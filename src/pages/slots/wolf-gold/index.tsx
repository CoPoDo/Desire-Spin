import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { wolfGoldConfig } from './config';
import { WOLF_SYMBOL_MAP, MultiplierSymbol } from './symbols';
import { WolfScene } from './Scene';

export function WolfGold() {
  return (
    <ImmersiveSlotView
      cfg={wolfGoldConfig}
      backdropElement={<WolfScene />}
      backdropAspect={{ w: 941, h: 1672 }}
      archInsets={{ left: 8, top: 27, width: 84 }}
      // Violet+gold FS tint
      freeSpinsTint="linear-gradient(180deg, rgba(102, 56, 200, 0.24) 0%, rgba(167, 139, 250, 0.32) 50%, rgba(20, 8, 40, 0.46) 100%)"
      // Real Pragmatic Wolf Gold's bonus is the iconic "Money Respin"
      // moment — full moon centred, wolf-howl callout. Lightning bolts
      // are wrong. Use a full-moon glyph and the actual bonus name.
      fsTriggerGlyph="🌕"
      fsTriggerTitle="MONEY RESPIN"
      maxWinLabel="9,500×"
      renderCell={({ symbolId, multiplier }) => {
        if (multiplier !== undefined) {
          return (
            <MultiplierSymbol
              value={multiplier}
              accent={wolfGoldConfig.theme.accent}
            />
          );
        }
        const C = WOLF_SYMBOL_MAP[symbolId];
        return C ? <C /> : <span className="text-xs text-ink-mute">{symbolId}</span>;
      }}
    />
  );
}
