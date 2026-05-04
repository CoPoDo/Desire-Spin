import { ImmersiveSlotView } from '../_shared/ImmersiveSlotView';
import { sugarRushConfig } from './config';
import { SUGAR_SYMBOL_MAP, MultiplierSymbol } from './symbols';
import { SugarRushScene } from './Scene';

export function SugarRush() {
  return (
    <ImmersiveSlotView
      cfg={sugarRushConfig}
      backdropElement={<SugarRushScene />}
      backdropAspect={{ w: 941, h: 1672 }}
      // Roughly the same arch placement as Sweet Bonanza — grid sits in
      // the upper-mid sky region with hills below.
      archInsets={{ left: 8, top: 27, width: 84 }}
      // Hot magenta+strawberry FS tint (vs Bonanza's cooler rose).
      freeSpinsTint="linear-gradient(180deg, rgba(200, 30, 130, 0.22) 0%, rgba(160, 60, 180, 0.36) 50%, rgba(60, 10, 80, 0.46) 100%)"
      // Real Sugar Rush's bonus trigger blasts candy hearts + sprinkles
      // across the screen with the game name. Default lightning ⚡ glyph
      // is wrong; use a heart (matching the Pass 8 heart-shaped multipliers)
      // and the iconic banner.
      fsTriggerGlyph="❤"
      fsTriggerTitle="SUGAR RUSH!"
      maxWinLabel="5,000×"
      renderCell={({ symbolId, multiplier }) => {
        if (multiplier !== undefined) {
          return (
            <MultiplierSymbol
              value={multiplier}
              accent={sugarRushConfig.theme.accent}
            />
          );
        }
        const C = SUGAR_SYMBOL_MAP[symbolId];
        return C ? <C /> : <span className="text-xs text-ink-mute">{symbolId}</span>;
      }}
    />
  );
}
