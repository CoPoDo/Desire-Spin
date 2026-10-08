import { ArtworkGate } from '../_shared/ArtworkGate';
import { LineSlotView } from '../_shared/LineSlotView';
import { type LineSlotProfile } from '../_shared/lineEngine';
import { WOLF_SYMBOL_MAP, WOLF_ATLAS, WOLF_WORLD } from './symbols';
import { WolfScene } from './Scene';
import { WOLF_PAYLINES } from './paylines';

export const WOLF_PROFILE: LineSlotProfile = {
  id: 'wolf-gold', cols: 5, rows: 3, paylines: WOLF_PAYLINES, maxWin: 2500,
  scatterId: 'coyote', wildId: 'wild', feature: 'wolf', freeSpins: 5,
  // Fixed local base/free frequencies, not provider reel/PAR probabilities.
  // Published payouts and jackpot values are applied without payout scaling.
  symbols: [
    { id: 'wolf', weight: 3, pay: { 3: 25, 4: 250, 5: 500 } },
    { id: 'eagle', weight: 6, pay: { 3: 20, 4: 150, 5: 400 } },
    { id: 'cougar', weight: 8, pay: { 3: 10, 4: 50, 5: 200 } },
    { id: 'mustang', weight: 10, pay: { 3: 15, 4: 100, 5: 300 } },
    { id: 'feather', weight: 12, pay: { 3: 10, 4: 20, 5: 50 } },
    { id: 'arrow', weight: 14, pay: { 3: 5, 4: 20, 5: 50 } },
    { id: 'turquoise', weight: 16, pay: { 3: 5, 4: 20, 5: 50 } },
    { id: 'amber', weight: 18, pay: { 3: 5, 4: 20, 5: 50 } },

    { id: 'coyote', weight: 7.4, freeWeight: 1.4, scatter: true },
    { id: 'money', weight: 10, freeWeight: 6, money: true },
    { id: 'wild', weight: 4, freeWeight: 1.2, wild: true, pay: { 3: 25, 4: 250, 5: 500 } },
  ],
};

export function WolfGold() {
  return <ArtworkGate title="Wolf Gold" assets={[WOLF_ATLAS, WOLF_WORLD]}><LineSlotView profile={WOLF_PROFILE} title="Wolf Gold" subtitle="5×3 · 25 paylines · Money Respin" scene={<WolfScene />} symbolMap={WOLF_SYMBOL_MAP} accent="#b9cdde" /></ArtworkGate>;
}
