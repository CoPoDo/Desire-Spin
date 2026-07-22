import { LineSlotView } from '../_shared/LineSlotView';
import { makePaylines, type LineSlotProfile } from '../_shared/lineEngine';
import { WOLF_SYMBOL_MAP } from './symbols';
import { WolfScene } from './Scene';

export const WOLF_PROFILE: LineSlotProfile = {
  id: 'wolf-gold', cols: 5, rows: 3, paylines: makePaylines(5, 3, 25), maxWin: 2500,
  scatterId: 'coyote', wildId: 'wild', feature: 'wolf', freeSpins: 5,
  symbols: [
    { id: 'wolf', weight: 3, pay: { 3: 25, 4: 100, 5: 500 } },
    { id: 'eagle', weight: 6, pay: { 3: 12, 4: 40, 5: 150 } },
    { id: 'cougar', weight: 8, pay: { 3: 8, 4: 25, 5: 100 } },
    { id: 'mustang', weight: 10, pay: { 3: 5, 4: 15, 5: 50 } },
    { id: 'feather', weight: 12, pay: { 3: 3, 4: 8, 5: 25 } },
    { id: 'arrow', weight: 14, pay: { 3: 2, 4: 5, 5: 15 } },
    { id: 'turquoise', weight: 16, pay: { 3: 1.5, 4: 3, 5: 10 } },
    { id: 'amber', weight: 18, pay: { 3: 1.2, 4: 2.5, 5: 7 } },
    { id: 'jasper', weight: 20, pay: { 3: 1, 4: 2, 5: 5 } },
    { id: 'coyote', weight: 1.2, freeWeight: 1.4, scatter: true },
    { id: 'money', weight: 5, freeWeight: 6, money: true },
    { id: 'wild', weight: 0.8, freeWeight: 1.2, wild: true },
  ],
};

export function WolfGold() {
  return <LineSlotView profile={WOLF_PROFILE} title="Wolf Gold" subtitle="5×3 · 25 paylines · Money Respin" scene={<WolfScene />} symbolMap={WOLF_SYMBOL_MAP} accent="#a78bfa" />;
}
