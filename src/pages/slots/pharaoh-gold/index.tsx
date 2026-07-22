import { LineSlotView } from '../_shared/LineSlotView';
import type { LineSlotProfile } from '../_shared/lineEngine';
import { PHARAOH_SYMBOL_MAP } from './symbols';
import { PharaohScene } from './Scene';

export const PHARAOH_PROFILE: LineSlotProfile = {
  id: 'pharaoh-gold', cols: 3, rows: 3, paylines: [[0, 0, 0], [1, 1, 1], [2, 2, 2]], maxWin: 2500,
  scatterId: 'scarab', feature: 'classic', freeSpins: 0,
  symbols: [
    { id: 'pharaoh', weight: 3, pay: { 3: 100 } },
    { id: 'eye', weight: 7, pay: { 3: 40 } },
    { id: 'ankh', weight: 9, pay: { 3: 25 } },
    { id: 'jackal', weight: 11, pay: { 3: 15 } },
    { id: 'falcon', weight: 13, pay: { 3: 10 } },
    { id: 'lotus', weight: 15, pay: { 3: 7 } },
    { id: 'gem-blue', weight: 18, pay: { 3: 5 } },
    { id: 'gem-red', weight: 20, pay: { 3: 4 } },
    { id: 'gem-green', weight: 22, pay: { 3: 3 } },
    { id: 'scarab', weight: 2, scatter: true },
  ],
};

export function PharaohGold() {
  return <LineSlotView profile={PHARAOH_PROFILE} title="Pharaoh's Gold" subtitle="Realtime Gaming classic · 3 reels · 3 paylines" scene={<PharaohScene />} symbolMap={PHARAOH_SYMBOL_MAP} accent="#ffd166" />;
}
